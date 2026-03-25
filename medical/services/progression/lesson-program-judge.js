import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { isDockerAvailable } from '../sandbox-runner.js';
import { deepEqual, normalizeOutput, validators } from '../validators.js';

const execAsync = promisify(exec);
const REQUIRE_ISOLATED_JUDGE =
  process.env.REQUIRE_ISOLATED_JUDGE === '1' ||
  (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_LOCAL_JUDGE !== '1');

let localPythonCommandPromise = null;

function safeJsonParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function spawnProcess({ command, args = [], cwd, stdin = '', timeLimitMs = 2000 }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timeout = false;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      timeout = true;
      try {
        child.kill();
      } catch {
        // ignore
      }
    }, Math.max(1, timeLimitMs) + 50);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      finish({
        stdout,
        stderr: error?.message || String(error),
        exitCode: 1,
        timeout: false,
      });
    });

    child.on('close', (code) => {
      finish({
        stdout,
        stderr: timeout && !stderr ? 'Time Limit Exceeded' : stderr,
        exitCode: timeout ? 124 : (code ?? 1),
        timeout,
      });
    });

    child.stdin.on('error', () => {
      // Ignore broken pipe errors when the child exits early.
    });
    child.stdin.end(stdin);
  });
}

async function resolveLocalPythonCommand() {
  if (localPythonCommandPromise) return localPythonCommandPromise;

  const candidates =
    process.platform === 'win32'
      ? [
          { command: 'py', args: ['-3'] },
          { command: 'python', args: [] },
          { command: 'python3', args: [] },
        ]
      : [
          { command: 'python3', args: [] },
          { command: 'python', args: [] },
        ];

  localPythonCommandPromise = (async () => {
    for (const candidate of candidates) {
      const probe = await spawnProcess({
        command: candidate.command,
        args: [...candidate.args, '--version'],
        timeLimitMs: 2000,
      }).catch(() => null);

      if (probe && !probe.timeout && probe.exitCode === 0) {
        return candidate;
      }
    }

    return null;
  })();

  return localPythonCommandPromise;
}

async function runInLocalPythonProgram({ userCode, stdinText, timeLimitMs = 2000 }) {
  const python = await resolveLocalPythonCommand();
  if (!python) {
    return {
      stdout: '',
      stderr: 'Python is not available in the local lesson judge environment',
      exitCode: 1,
      timeout: false,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-lesson-judge-'));
  try {
    await writeFile(path.join(tempDir, 'user.py'), userCode, 'utf8');

    return await spawnProcess({
      command: python.command,
      args: [...python.args, 'user.py'],
      cwd: tempDir,
      stdin: stdinText,
      timeLimitMs,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runInDockerPythonProgram({ userCode, stdinText, timeLimitMs = 2000, memoryMb = 256, cpuLimit = 0.5, pidsLimit = 64 }) {
  const id = crypto.randomBytes(8).toString('hex');
  const containerName = `lesson-judge-${id}`;
  const userB64 = Buffer.from(userCode, 'utf8').toString('base64');
  const stdinB64 = Buffer.from(stdinText || '', 'utf8').toString('base64');

  const dockerCmd = `docker run --rm --name ${containerName} \
    --memory=${memoryMb}m \
    --cpus=${cpuLimit} \
    --pids-limit=${pidsLimit} \
    --network=none \
    --read-only \
    --tmpfs /tmp:rw,noexec,nosuid,size=10m \
    python:3.11-slim \
    bash -c "echo '${userB64}' | base64 -d > /tmp/user.py && \
             cd /tmp && \
             echo '${stdinB64}' | base64 -d | timeout ${Math.ceil(timeLimitMs / 1000)}s python user.py"`;

  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let timeout = false;

  const timeoutHandle = setTimeout(async () => {
    timeout = true;
    try {
      await execAsync(`docker kill ${containerName}`);
    } catch {
      // ignore
    }
  }, timeLimitMs + 1000);

  try {
    const { stdout: out, stderr: err } = await execAsync(dockerCmd, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: timeLimitMs + 2000,
    });
    stdout = out;
    stderr = err;
  } catch (error) {
    clearTimeout(timeoutHandle);

    if (error.killed || error.signal === 'SIGTERM') {
      timeout = true;
      stderr = 'Time Limit Exceeded';
      exitCode = 124;
    } else {
      stdout = error.stdout || '';
      stderr = error.stderr || error.message || '';
      exitCode = error.code || 1;
    }

    return { stdout, stderr, exitCode, timeout };
  }

  clearTimeout(timeoutHandle);
  return { stdout, stderr, exitCode, timeout };
}

function compareProgramOutput({ actualRaw, expectedJson, expectedOutput, compareMode }) {
  const normalizedActual = normalizeOutput(actualRaw);

  if (compareMode && validators[compareMode]) {
    const verdict = validators[compareMode](normalizedActual, { expected: expectedJson });
    return { ok: !!verdict?.ok, reason: verdict?.reason || 'Wrong Answer' };
  }

  if (expectedJson !== undefined) {
    if (typeof expectedJson === 'number') {
      const numericActual = Number(normalizedActual);
      return {
        ok: Number.isFinite(numericActual) && numericActual === expectedJson,
        reason: Number.isFinite(numericActual) && numericActual === expectedJson ? 'OK' : 'Wrong Answer',
      };
    }

    if (typeof expectedJson === 'boolean') {
      const lowered = normalizedActual.toLowerCase();
      const booleanActual = lowered === 'true' ? true : lowered === 'false' ? false : null;
      return {
        ok: booleanActual === expectedJson,
        reason: booleanActual === expectedJson ? 'OK' : 'Wrong Answer',
      };
    }

    if (typeof expectedJson === 'string') {
      return {
        ok: normalizedActual === expectedJson.trim(),
        reason: normalizedActual === expectedJson.trim() ? 'OK' : 'Wrong Answer',
      };
    }

    const parsed = safeJsonParse(normalizedActual);
    if (!parsed.ok) {
      return { ok: false, reason: 'Output is not valid JSON' };
    }

    return {
      ok: deepEqual(parsed.value, expectedJson),
      reason: deepEqual(parsed.value, expectedJson) ? 'OK' : 'Wrong Answer',
    };
  }

  const normalizedExpected = normalizeOutput(expectedOutput || '');
  return {
    ok: normalizedActual === normalizedExpected,
    reason: normalizedActual === normalizedExpected ? 'OK' : 'Wrong Answer',
  };
}

function checkRequiredSnippets(code, requiredSnippets = []) {
  const collapsedCode = normalizeOutput(code).replace(/\s+/g, '');
  const missing = requiredSnippets.filter((snippet) => !collapsedCode.includes(normalizeOutput(snippet).replace(/\s+/g, '')));
  return missing;
}

export class LessonProgramJudgeService {
  async executePythonLesson(code, definition) {
    const startedAt = Date.now();
    const testCases = Array.isArray(definition?.testCases) ? definition.testCases : [];
    const dockerOk = await isDockerAvailable().catch(() => false);

    if (!dockerOk && REQUIRE_ISOLATED_JUDGE) {
      throw new Error('Isolated lesson execution is required. Configure Docker or allow local lesson evaluation explicitly.');
    }

    const missingSnippets = checkRequiredSnippets(code, definition?.requiredSnippets || []);
    const testResults = [];
    let passed = 0;
    let sawRuntimeError = false;
    let sawTimeout = false;
    let stderr = '';

    for (let index = 0; index < testCases.length; index += 1) {
      const testCase = testCases[index];
      const result = dockerOk
        ? await runInDockerPythonProgram({
            userCode: code,
            stdinText: testCase.stdin_text || '',
            timeLimitMs: testCase.time_limit_ms || 2000,
          })
        : await runInLocalPythonProgram({
            userCode: code,
            stdinText: testCase.stdin_text || '',
            timeLimitMs: testCase.time_limit_ms || 2000,
          });

      let ok = false;
      let reason = 'Wrong Answer';
      if (result.timeout) {
        sawTimeout = true;
        reason = 'Time Limit Exceeded';
      } else if ((result.exitCode ?? 0) !== 0) {
        sawRuntimeError = true;
        reason = 'Runtime Error';
      } else {
        const verdict = testCase.compare_mode && validators[testCase.compare_mode]
          ? validators[testCase.compare_mode](result.stdout, { expected: testCase.expected_json })
          : compareProgramOutput({
              actualRaw: result.stdout,
              expectedJson: testCase.expected_json,
              expectedOutput: testCase.expected_output,
              compareMode: testCase.compare_mode,
            });
        ok = verdict.ok;
        reason = ok ? 'OK' : verdict.reason;
      }

      if (ok) {
        passed += 1;
      }

      if (!ok && result.stderr) {
        stderr = String(result.stderr).slice(0, 1000);
      }

      testResults.push({
        label: testCase.label || `Test ${index + 1}`,
        passed: ok,
        reason,
        hidden: Boolean(testCase.hidden),
        actual: testCase.hidden ? '' : normalizeOutput(result.stdout),
        stderr: ok || testCase.hidden ? '' : String(result.stderr || '').slice(0, 500),
      });
    }

    const outputScore = testCases.length > 0 ? passed / testCases.length : 0;
    const structurePenalty = missingSnippets.length > 0 ? Math.min(0.4, missingSnippets.length * 0.12) : 0;
    const finalScore = Math.max(0, outputScore - structurePenalty);
    const passedAllTests = passed === testCases.length;
    const passedStructure = missingSnippets.length === 0;
    const passedOverall = passedAllTests && passedStructure;

    const message = passedOverall
      ? 'The program produced the correct result and used the required lesson structure.'
      : !passedAllTests
      ? sawTimeout
        ? 'The program timed out before it finished the lesson checks.'
        : sawRuntimeError
        ? 'The program crashed during the lesson checks.'
        : 'The program did not produce the expected result for every lesson check.'
      : `The output is correct, but the required lesson structure is still missing: ${missingSnippets.join(', ')}`;

    return {
      passed: passedOverall,
      message,
      scorePercent: Math.round(finalScore * 100),
      rubricBreakdown: {
        correctness: Math.round(outputScore * 100),
        edgeCaseHandling: Math.round(outputScore * 100),
        codeQuality: Math.round((passedStructure ? 1 : Math.max(0, 1 - structurePenalty)) * 100),
        efficiency: sawTimeout ? 20 : passedAllTests ? 85 : 60,
      },
      missingSnippets,
      testResults,
      runtimeMs: Date.now() - startedAt,
      stderr,
    };
  }
}
