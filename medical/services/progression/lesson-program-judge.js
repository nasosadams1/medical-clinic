import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const ALLOW_INSECURE_LOCAL_CPP_JUDGE =
  process.env.ALLOW_INSECURE_LOCAL_CPP_JUDGE === '1' && process.env.NODE_ENV !== 'production';
const MAX_CAPTURED_OUTPUT_CHARS = 256 * 1024;

let localPythonCommandPromise = null;
let localCppCommandPromise = null;

function safeJsonParse(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function spawnProcess({ command, args = [], cwd, stdin = '', timeLimitMs = 2000, env }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: env ? { ...process.env, ...env } : process.env,
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
      if (stdout.length >= MAX_CAPTURED_OUTPUT_CHARS) return;
      stdout += chunk.toString().slice(0, Math.max(0, MAX_CAPTURED_OUTPUT_CHARS - stdout.length));
    });

    child.stderr.on('data', (chunk) => {
      if (stderr.length >= MAX_CAPTURED_OUTPUT_CHARS) return;
      stderr += chunk.toString().slice(0, Math.max(0, MAX_CAPTURED_OUTPUT_CHARS - stderr.length));
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

async function resolveLocalCppCommand() {
  if (localCppCommandPromise) return localCppCommandPromise;

  const candidates =
    process.platform === 'win32'
      ? [
          { command: 'g++', args: [] },
          { command: 'clang++', args: [] },
          { command: 'c++', args: [] },
        ]
      : [
          { command: 'g++', args: [] },
          { command: 'clang++', args: [] },
          { command: 'c++', args: [] },
        ];

  localCppCommandPromise = (async () => {
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

  return localCppCommandPromise;
}

async function writeSupportFiles(baseDir, files = []) {
  for (const file of files) {
    const relativePath = String(file?.path || '').trim();
    if (!relativePath) continue;
    const targetPath = path.resolve(baseDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, String(file?.contents || ''), 'utf8');
  }
}

async function collectCapturedFiles(baseDir, expectedFiles = []) {
  const results = [];

  for (const file of expectedFiles) {
    const relativePath = String(file?.path || '').trim();
    if (!relativePath) continue;

    const targetPath = path.resolve(baseDir, relativePath);
    try {
      const contents = await readFile(targetPath, 'utf8');
      results.push({
        path: relativePath,
        exists: true,
        contents,
      });
    } catch {
      results.push({
        path: relativePath,
        exists: false,
        contents: '',
      });
    }
  }

  return results;
}

function getCppCompileSources(files = [], entrySource = 'main.cpp') {
  const sources = new Set([entrySource]);

  for (const file of files) {
    const relativePath = String(file?.path || '').trim().replace(/\\/g, '/');
    if (!relativePath) continue;
    if (/\.(cpp|cc|cxx)$/i.test(relativePath)) {
      sources.add(relativePath);
    }
  }

  return [...sources];
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeSupportPath(value = '') {
  return String(value || '').trim().replace(/\\/g, '/');
}

function isCppCompileSupportPath(value = '') {
  return /\.(cpp|cc|cxx|h|hpp|hh|hxx|ipp|tpp|inl)$/i.test(normalizeSupportPath(value));
}

function splitCppSupportFiles(files = []) {
  const compileFiles = [];
  const runtimeFiles = [];

  for (const file of files) {
    const relativePath = normalizeSupportPath(file?.path);
    if (!relativePath) continue;
    const normalizedFile = {
      path: relativePath,
      contents: String(file?.contents || ''),
    };

    if (isCppCompileSupportPath(relativePath)) {
      compileFiles.push(normalizedFile);
    } else {
      runtimeFiles.push(normalizedFile);
    }
  }

  return { compileFiles, runtimeFiles };
}

function mergeSupportFiles(fileGroups = []) {
  const merged = new Map();

  for (const files of fileGroups) {
    for (const file of files || []) {
      const relativePath = normalizeSupportPath(file?.path);
      if (!relativePath) continue;
      const contents = String(file?.contents || '');
      const existing = merged.get(relativePath);
      if (existing && existing.contents !== contents) {
        throw new Error(`Conflicting support file contents for ${relativePath}`);
      }
      if (!existing) {
        merged.set(relativePath, { path: relativePath, contents });
      }
    }
  }

  return [...merged.values()];
}

function collectRelativePaths(fileGroups = []) {
  const values = new Set();

  for (const files of fileGroups) {
    for (const file of files || []) {
      const relativePath = normalizeSupportPath(file?.path);
      if (relativePath) values.add(relativePath);
    }
  }

  return [...values];
}

function collectExpectedFilePaths(expectedFiles = []) {
  return collectRelativePaths([
    (expectedFiles || []).map((file) => ({
      path: file?.path,
    })),
  ]);
}

async function clearRelativePaths(baseDir, relativePaths = []) {
  for (const relativePath of relativePaths) {
    const normalizedPath = normalizeSupportPath(relativePath);
    if (!normalizedPath) continue;
    await rm(path.resolve(baseDir, normalizedPath), { recursive: true, force: true }).catch(() => {});
  }
}

const cppMultiCharTokens = [
  '::',
  '->',
  '<<=',
  '>>=',
  '<=',
  '>=',
  '==',
  '!=',
  '++',
  '--',
  '&&',
  '||',
  '<<',
  '>>',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '->*',
  '.*',
];

function tokenizeCppForMatching(value = '') {
  const source = String(value || '');
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1] || '';

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    if (current === '/' && next === '/') {
      index += 2;
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }

    if (current === '"' || current === "'") {
      const quote = current;
      let token = current;
      index += 1;
      while (index < source.length) {
        const ch = source[index];
        token += ch;
        if (ch === '\\' && index + 1 < source.length) {
          token += source[index + 1];
          index += 2;
          continue;
        }
        index += 1;
        if (ch === quote) break;
      }
      tokens.push(token);
      continue;
    }

    if (/[A-Za-z_]/.test(current)) {
      let token = current;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_]/.test(source[index])) {
        token += source[index];
        index += 1;
      }
      tokens.push(token);
      continue;
    }

    if (/\d/.test(current)) {
      let token = current;
      index += 1;
      while (index < source.length && /[A-Za-z0-9_.]/.test(source[index])) {
        token += source[index];
        index += 1;
      }
      tokens.push(token);
      continue;
    }

    const threeChar = source.slice(index, index + 3);
    const twoChar = source.slice(index, index + 2);
    const multiChar = cppMultiCharTokens.find((token) => token === threeChar || token === twoChar);
    if (multiChar) {
      tokens.push(multiChar);
      index += multiChar.length;
      continue;
    }

    if (/[{}()[\];,<>#=*+\-/%&|^!~?:.]/.test(current)) {
      tokens.push(current);
    }
    index += 1;
  }

  return tokens;
}

function includesTokenSequence(tokens = [], patternTokens = []) {
  if (!patternTokens.length || patternTokens.length > tokens.length) return false;

  for (let start = 0; start <= tokens.length - patternTokens.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < patternTokens.length; offset += 1) {
      if (tokens[start + offset] !== patternTokens[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }

  return false;
}

function buildSnippetMatcher(language, code) {
  if (language !== 'cpp') {
    const collapsedCode = normalizeOutput(code).replace(/\s+/g, '');
    return {
      includesSnippet: (snippet) => collapsedCode.includes(normalizeOutput(snippet).replace(/\s+/g, '')),
    };
  }

  const tokens = tokenizeCppForMatching(code);
  return {
    includesSnippet: (snippet) => includesTokenSequence(tokens, tokenizeCppForMatching(snippet)),
  };
}

const BASE_CPP_COMPILE_FLAGS = ['-std=c++20', '-O2', '-pipe'];
const CPP_COMPILE_PROFILES = {
  default: {
    extraFlags: [],
    compileTimeoutMs: 4000,
    runtimeEnv: {},
  },
  strict: {
    extraFlags: ['-Wall', '-Wextra', '-Werror'],
    compileTimeoutMs: 5000,
    runtimeEnv: {},
  },
  sanitized: {
    extraFlags: ['-Wall', '-Wextra', '-Werror', '-g', '-fsanitize=address,undefined', '-fno-omit-frame-pointer'],
    compileTimeoutMs: 7000,
    runtimeEnv: {
      ASAN_OPTIONS: 'detect_leaks=1:halt_on_error=1',
      UBSAN_OPTIONS: 'print_stacktrace=1:halt_on_error=1',
    },
  },
  'strict-threaded': {
    extraFlags: ['-Wall', '-Wextra', '-Werror', '-pthread'],
    compileTimeoutMs: 6000,
    runtimeEnv: {},
  },
  'sanitized-threaded': {
    extraFlags: [
      '-Wall',
      '-Wextra',
      '-Werror',
      '-g',
      '-fsanitize=address,undefined',
      '-fno-omit-frame-pointer',
      '-pthread',
    ],
    compileTimeoutMs: 8000,
    runtimeEnv: {
      ASAN_OPTIONS: 'detect_leaks=1:halt_on_error=1',
      UBSAN_OPTIONS: 'print_stacktrace=1:halt_on_error=1',
    },
  },
};

function resolveCppCompileConfig(definition = {}, testCases = []) {
  const requestedProfile = String(definition?.compileProfile || 'default').trim().toLowerCase();
  const profile = CPP_COMPILE_PROFILES[requestedProfile] || CPP_COMPILE_PROFILES.default;
  const maxRuntimeMs = testCases.reduce(
    (maxValue, testCase) => Math.max(maxValue, Number(testCase?.time_limit_ms) || 2000),
    2000,
  );

  return {
    compileFlags: [...BASE_CPP_COMPILE_FLAGS, ...profile.extraFlags],
    compileTimeoutMs: Math.max(
      profile.compileTimeoutMs,
      Number(definition?.compileTimeoutMs) || 0,
      maxRuntimeMs + 1000,
    ),
    runtimeEnv: { ...profile.runtimeEnv, ...(definition?.runtimeEnv || {}) },
    memoryMb: Number(definition?.memoryMb) || 256,
    cpuLimit: Number(definition?.cpuLimit) || 0.5,
    pidsLimit: Number(definition?.pidsLimit) || 64,
  };
}

function buildDockerEnvArgs(env = {}) {
  return Object.entries(env).flatMap(([key, value]) => ['-e', `${key}=${String(value)}`]);
}

async function prepareLocalCppExecutionSession({ userCode, testCases = [], compileConfig }) {
  const compiler = await resolveLocalCppCommand();
  if (!compiler) {
    return {
      compileFailure: {
        stdout: '',
        stderr: 'C++ compiler is not available in the local lesson judge environment',
        exitCode: 1,
        timeout: false,
      },
      cleanup: async () => {},
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-cpp-lesson-judge-'));
  const sourceName = 'main.cpp';
  const executableName = process.platform === 'win32' ? 'main.exe' : 'main';
  const runtimeFileGroups = testCases.map((testCase) => splitCppSupportFiles(testCase?.files || []).runtimeFiles);
  const runtimeResetPaths = [...new Set([...collectRelativePaths(runtimeFileGroups), ...testCases.flatMap((testCase) => collectExpectedFilePaths(testCase?.expected_files || []))])];

  try {
    const compileFiles = mergeSupportFiles(testCases.map((testCase) => splitCppSupportFiles(testCase?.files || []).compileFiles));
    await writeFile(path.join(tempDir, sourceName), userCode, 'utf8');
    await writeSupportFiles(tempDir, compileFiles);

    const compileSources = getCppCompileSources(compileFiles, sourceName);
    const compile = await spawnProcess({
      command: compiler.command,
      args: [...compiler.args, ...compileConfig.compileFlags, ...compileSources, '-o', executableName],
      cwd: tempDir,
      timeLimitMs: compileConfig.compileTimeoutMs,
      env: compileConfig.runtimeEnv,
    });

    if (compile.timeout || (compile.exitCode ?? 0) !== 0) {
      return {
        compileFailure: {
          stdout: compile.stdout,
          stderr: compile.stderr || compile.stdout,
          exitCode: compile.exitCode,
          timeout: compile.timeout,
        },
        cleanup: async () => {
          await rm(tempDir, { recursive: true, force: true }).catch(() => {});
        },
      };
    }

    return {
      compileFailure: null,
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      },
      runCase: async (testCase) => {
        const { runtimeFiles } = splitCppSupportFiles(testCase?.files || []);
        await clearRelativePaths(tempDir, runtimeResetPaths);
        await writeSupportFiles(tempDir, runtimeFiles);

        const result = await spawnProcess({
          command: path.join(tempDir, executableName),
          cwd: tempDir,
          stdin: testCase?.stdin_text || '',
          timeLimitMs: testCase?.time_limit_ms || 2000,
          env: compileConfig.runtimeEnv,
        });
        const capturedFiles = Array.isArray(testCase?.expected_files) && testCase.expected_files.length
          ? await collectCapturedFiles(tempDir, testCase.expected_files)
          : [];
        return { ...result, capturedFiles };
      },
    };
  } catch (error) {
    return {
      compileFailure: {
        stdout: '',
        stderr: error?.message || 'Failed to prepare the local C++ lesson workspace',
        exitCode: 1,
        timeout: false,
      },
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      },
    };
  }
}

async function prepareDockerCppExecutionSession({ userCode, testCases = [], compileConfig }) {
  const sessionId = crypto.randomBytes(8).toString('hex');
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-cpp-lesson-docker-'));
  const sourceName = 'main.cpp';
  const executableName = 'main';
  const runtimeFileGroups = testCases.map((testCase) => splitCppSupportFiles(testCase?.files || []).runtimeFiles);
  const runtimeResetPaths = [...new Set([...collectRelativePaths(runtimeFileGroups), ...testCases.flatMap((testCase) => collectExpectedFilePaths(testCase?.expected_files || []))])];
  let runCounter = 0;

  try {
    const compileFiles = mergeSupportFiles(testCases.map((testCase) => splitCppSupportFiles(testCase?.files || []).compileFiles));
    await writeFile(path.join(tempDir, sourceName), userCode, 'utf8');
    await writeSupportFiles(tempDir, compileFiles);

    const compileSources = getCppCompileSources(compileFiles, sourceName);
    const compileContainerName = `lesson-cpp-compile-${sessionId}`;
    const compile = await spawnProcess({
      command: 'docker',
      args: [
        'run',
        '--rm',
        '--name',
        compileContainerName,
        `--memory=${compileConfig.memoryMb}m`,
        `--cpus=${compileConfig.cpuLimit}`,
        `--pids-limit=${compileConfig.pidsLimit}`,
        '--network=none',
        '-v',
        `${tempDir}:/workspace`,
        '-w',
        '/workspace',
        'gcc:12.2',
        'g++',
        ...compileConfig.compileFlags,
        ...compileSources,
        '-o',
        executableName,
      ],
      timeLimitMs: compileConfig.compileTimeoutMs,
    });

    if (compile.timeout) {
      await execAsync(`docker kill ${compileContainerName}`).catch(() => {});
    }

    if (compile.timeout || (compile.exitCode ?? 0) !== 0) {
      return {
        compileFailure: {
          stdout: compile.stdout,
          stderr: compile.stderr || compile.stdout,
          exitCode: compile.exitCode,
          timeout: compile.timeout,
        },
        cleanup: async () => {
          await rm(tempDir, { recursive: true, force: true }).catch(() => {});
        },
      };
    }

    return {
      compileFailure: null,
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      },
      runCase: async (testCase) => {
        const { runtimeFiles } = splitCppSupportFiles(testCase?.files || []);
        await clearRelativePaths(tempDir, runtimeResetPaths);
        await writeSupportFiles(tempDir, runtimeFiles);

        const runContainerName = `lesson-cpp-run-${sessionId}-${runCounter++}`;
        const result = await spawnProcess({
          command: 'docker',
          args: [
            'run',
            '--rm',
            '--name',
            runContainerName,
            `--memory=${compileConfig.memoryMb}m`,
            `--cpus=${compileConfig.cpuLimit}`,
            `--pids-limit=${compileConfig.pidsLimit}`,
            '--network=none',
            '-i',
            '-v',
            `${tempDir}:/workspace`,
            '-w',
            '/workspace',
            ...buildDockerEnvArgs(compileConfig.runtimeEnv),
            'gcc:12.2',
            `./${executableName}`,
          ],
          stdin: testCase?.stdin_text || '',
          timeLimitMs: testCase?.time_limit_ms || 2000,
        });

        if (result.timeout) {
          await execAsync(`docker kill ${runContainerName}`).catch(() => {});
        }

        const capturedFiles = Array.isArray(testCase?.expected_files) && testCase.expected_files.length
          ? await collectCapturedFiles(tempDir, testCase.expected_files)
          : [];
        return { ...result, capturedFiles };
      },
    };
  } catch (error) {
    return {
      compileFailure: {
        stdout: '',
        stderr: error?.message || 'Failed to prepare the Docker C++ lesson workspace',
        exitCode: 1,
        timeout: false,
      },
      cleanup: async () => {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      },
    };
  }
}

async function createCppExecutionSession({ runnerKind, userCode, testCases, definition }) {
  const compileConfig = resolveCppCompileConfig(definition, testCases);
  return runnerKind === 'docker'
    ? prepareDockerCppExecutionSession({ userCode, testCases, compileConfig })
    : prepareLocalCppExecutionSession({ userCode, testCases, compileConfig });
}

async function runInLocalPythonProgram({ userCode, stdinText, timeLimitMs = 2000, files = [], captureFiles = [] }) {
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
    await writeSupportFiles(tempDir, files);

    const result = await spawnProcess({
      command: python.command,
      args: [...python.args, 'user.py'],
      cwd: tempDir,
      stdin: stdinText,
      timeLimitMs,
    });
    const capturedFiles = captureFiles.length ? await collectCapturedFiles(tempDir, captureFiles) : [];
    return { ...result, capturedFiles };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runInDockerPythonProgram({
  userCode,
  stdinText,
  timeLimitMs = 2000,
  memoryMb = 256,
  cpuLimit = 0.5,
  pidsLimit = 64,
  files = [],
  captureFiles = [],
}) {
  const id = crypto.randomBytes(8).toString('hex');
  const containerName = `lesson-judge-${id}`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-lesson-docker-'));
  try {
    await writeFile(path.join(tempDir, 'user.py'), userCode, 'utf8');
    await writeSupportFiles(tempDir, files);

    const result = await spawnProcess({
      command: 'docker',
      args: [
        'run',
        '--rm',
        '--name',
        containerName,
        `--memory=${memoryMb}m`,
        `--cpus=${cpuLimit}`,
        `--pids-limit=${pidsLimit}`,
        '--network=none',
        '-i',
        '-v',
        `${tempDir}:/workspace`,
        '-w',
        '/workspace',
        'python:3.11-slim',
        'python',
        'user.py',
      ],
      stdin: stdinText,
      timeLimitMs,
    });

    if (result.timeout) {
      await execAsync(`docker kill ${containerName}`).catch(() => {});
    }

    const capturedFiles = captureFiles.length ? await collectCapturedFiles(tempDir, captureFiles) : [];
    return { ...result, capturedFiles };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runInLocalCppProgram({ userCode, stdinText, timeLimitMs = 2000, files = [], captureFiles = [] }) {
  const compiler = await resolveLocalCppCommand();
  if (!compiler) {
    return {
      stdout: '',
      stderr: 'C++ compiler is not available in the local lesson judge environment',
      exitCode: 1,
      timeout: false,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-cpp-lesson-judge-'));
  const sourceName = 'main.cpp';
  const executableName = process.platform === 'win32' ? 'main.exe' : 'main';

  try {
    await writeFile(path.join(tempDir, sourceName), userCode, 'utf8');
    await writeSupportFiles(tempDir, files);
    const compileSources = getCppCompileSources(files, sourceName);

    const compile = await spawnProcess({
      command: compiler.command,
      args: [...compiler.args, '-std=c++20', '-O2', '-pipe', ...compileSources, '-o', executableName],
      cwd: tempDir,
      timeLimitMs: Math.max(3000, timeLimitMs + 1000),
    });

    if (compile.timeout || (compile.exitCode ?? 0) !== 0) {
      return {
        stdout: compile.stdout,
        stderr: compile.stderr || compile.stdout,
        exitCode: compile.exitCode,
        timeout: compile.timeout,
      };
    }

    const result = await spawnProcess({
      command: path.join(tempDir, executableName),
      cwd: tempDir,
      stdin: stdinText,
      timeLimitMs,
    });
    const capturedFiles = captureFiles.length ? await collectCapturedFiles(tempDir, captureFiles) : [];
    return { ...result, capturedFiles };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runInDockerCppProgram({
  userCode,
  stdinText,
  timeLimitMs = 2000,
  memoryMb = 256,
  cpuLimit = 0.5,
  pidsLimit = 64,
  files = [],
  captureFiles = [],
}) {
  const id = crypto.randomBytes(8).toString('hex');
  const containerName = `lesson-cpp-judge-${id}`;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'codhak-cpp-lesson-docker-'));
  const executableName = process.platform === 'win32' ? 'main.exe' : 'main';

  try {
    await writeFile(path.join(tempDir, 'main.cpp'), userCode, 'utf8');
    await writeSupportFiles(tempDir, files);
    const compileSources = getCppCompileSources(files, 'main.cpp');
    const compileSourcesArg = compileSources.map((sourcePath) => shellQuote(sourcePath)).join(' ');

    const result = await spawnProcess({
      command: 'docker',
      args: [
        'run',
        '--rm',
        '--name',
        containerName,
        `--memory=${memoryMb}m`,
        `--cpus=${cpuLimit}`,
        `--pids-limit=${pidsLimit}`,
        '--network=none',
        '-i',
        '-v',
        `${tempDir}:/workspace`,
        '-w',
        '/workspace',
        'gcc:12.2',
        'bash',
        '-c',
        `timeout ${Math.max(2, Math.ceil((timeLimitMs + 1000) / 1000))}s g++ -std=c++20 -O2 -pipe ${compileSourcesArg} -o ${shellQuote(
          executableName
        )} && echo '${Buffer.from(
          stdinText || '',
          'utf8',
        ).toString('base64')}' | base64 -d | timeout ${Math.ceil(timeLimitMs / 1000)}s ./${shellQuote(executableName)}`,
      ],
      timeLimitMs,
    });

    if (result.timeout) {
      await execAsync(`docker kill ${containerName}`).catch(() => {});
    }

    const capturedFiles = captureFiles.length ? await collectCapturedFiles(tempDir, captureFiles) : [];
    return { ...result, capturedFiles };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function compareExpectedFiles(actualFiles = [], expectedFiles = []) {
  for (const expected of expectedFiles) {
    const relativePath = String(expected?.path || '').trim();
    if (!relativePath) continue;

    const actual = actualFiles.find((file) => file.path === relativePath);
    if (!actual?.exists) {
      return { ok: false, reason: `Expected file was not created: ${relativePath}` };
    }

    const expectedContents = expected?.contents !== undefined ? expected.contents : expected.expected_output;
    if (expectedContents !== undefined) {
      const normalizedActual = normalizeOutput(actual.contents || '');
      const normalizedExpected = normalizeOutput(expectedContents || '');
      if (normalizedActual !== normalizedExpected) {
        return { ok: false, reason: `File contents did not match for ${relativePath}` };
      }
    }

    if (Array.isArray(expected.contains_tokens) && expected.contains_tokens.length > 0) {
      const normalizedActual = String(actual.contents || '').toLowerCase();
      const missing = expected.contains_tokens.filter(
        (token) => !normalizedActual.includes(String(token).toLowerCase()),
      );
      if (missing.length > 0) {
        return { ok: false, reason: `Missing file content in ${relativePath}: ${missing.join(', ')}` };
      }
    }
  }

  return { ok: true, reason: 'OK' };
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

function checkRequiredSnippets(code, requiredSnippets = [], language = 'python') {
  const matcher = buildSnippetMatcher(language, code);
  return requiredSnippets.filter((snippet) => !matcher.includesSnippet(String(snippet || '')));
}

function checkFlaggedPatterns(code, forbiddenPatterns = [], language = 'python') {
  const matcher = buildSnippetMatcher(language, code);
  return forbiddenPatterns.filter((pattern) => matcher.includesSnippet(String(pattern || '')));
}

function inferRuntimeFeedbackKind(stderr = '', language = 'python') {
  const normalized = String(stderr || '');
  if (/SyntaxError|IndentationError|TabError/i.test(normalized)) {
    return 'syntax_error';
  }
  if (language === 'cpp' && /(^|\n).*(error:|undefined reference|no matching function|expected [^.\n]+|undeclared|not declared)/i.test(normalized)) {
    return 'syntax_error';
  }
  return 'runtime_error';
}

async function getLessonRunnerKind(language) {
  const dockerOk = await isDockerAvailable().catch(() => false);
  if (dockerOk) return 'docker';

  if (language === 'python') {
    const localPython = await resolveLocalPythonCommand();
    if (localPython) return 'local';
  }

  if (language === 'cpp') {
    if (ALLOW_INSECURE_LOCAL_CPP_JUDGE) {
      const localCpp = await resolveLocalCppCommand();
      if (localCpp) return 'local';
    }

    throw new Error(
      'C++ lesson execution is not available in the local lesson judge environment. Docker is required for server-side C++ practice evaluation.',
    );
  }

  if (REQUIRE_ISOLATED_JUDGE) {
    throw new Error('Isolated lesson execution is required. Configure Docker or allow local lesson evaluation explicitly.');
  }

  const lessonLabel = language === 'cpp' ? 'C++' : 'Python';
  throw new Error(`${lessonLabel} lesson execution is not available in the local lesson judge environment.`);
}

async function runLessonProgram({
  runnerKind,
  language,
  userCode,
  stdinText,
  timeLimitMs = 2000,
  files = [],
  captureFiles = [],
}) {
  if (language === 'python') {
    return runnerKind === 'docker'
      ? runInDockerPythonProgram({ userCode, stdinText, timeLimitMs, files, captureFiles })
      : runInLocalPythonProgram({ userCode, stdinText, timeLimitMs, files, captureFiles });
  }

  if (language === 'cpp') {
    return runnerKind === 'docker'
      ? runInDockerCppProgram({ userCode, stdinText, timeLimitMs, files, captureFiles })
      : runInLocalCppProgram({ userCode, stdinText, timeLimitMs, files, captureFiles });
  }

  throw new Error(`Unsupported lesson execution language: ${language}`);
}

export class LessonProgramJudgeService {
  async executeLesson(code, definition) {
    const startedAt = Date.now();
    const language = String(definition?.language || 'python');
    const testCases = Array.isArray(definition?.testCases) ? definition.testCases : [];
    const missingSnippets = checkRequiredSnippets(code, definition?.requiredSnippets || [], language);
    const flaggedPatterns = checkFlaggedPatterns(code, definition?.forbiddenPatterns || [], language);
    const testResults = [];
    let passed = 0;
    let sawRuntimeError = false;
    let sawSyntaxError = false;
    let sawTimeout = false;
    let stderr = '';
    const runnerKind = await getLessonRunnerKind(language);
    let cppSession = null;

    try {
      if (language === 'cpp') {
        cppSession = await createCppExecutionSession({
          runnerKind,
          userCode: code,
          testCases,
          definition,
        });
      }

      for (let index = 0; index < testCases.length; index += 1) {
        const testCase = testCases[index];
        const result = language === 'cpp'
          ? cppSession?.compileFailure
            ? cppSession.compileFailure
            : await cppSession.runCase(testCase)
          : await runLessonProgram({
              runnerKind,
              language,
              userCode: code,
              stdinText: testCase.stdin_text || '',
              timeLimitMs: testCase.time_limit_ms || 2000,
              files: testCase.files || [],
              captureFiles: testCase.expected_files || [],
            });

        let ok = false;
        let reason = 'Wrong Answer';
        if (result.timeout) {
          sawTimeout = true;
          reason = 'Time Limit Exceeded';
        } else if ((result.exitCode ?? 0) !== 0) {
          const runtimeKind = inferRuntimeFeedbackKind(result.stderr, language);
          if (runtimeKind === 'syntax_error') {
            sawSyntaxError = true;
            reason = language === 'cpp' ? 'Compile Error' : 'Syntax Error';
          } else {
            sawRuntimeError = true;
            reason = 'Runtime Error';
          }
        } else {
          const verdict = testCase.compare_mode && validators[testCase.compare_mode]
            ? validators[testCase.compare_mode](result.stdout, { expected: testCase.expected_json })
            : compareProgramOutput({
                actualRaw: result.stdout,
                expectedJson: testCase.expected_json,
                expectedOutput: testCase.expected_output,
                compareMode: testCase.compare_mode,
              });
          if (verdict.ok && Array.isArray(testCase.expected_files) && testCase.expected_files.length > 0) {
            const fileVerdict = compareExpectedFiles(result.capturedFiles || [], testCase.expected_files);
            ok = fileVerdict.ok;
            reason = ok ? 'OK' : fileVerdict.reason;
          } else {
            ok = verdict.ok;
            reason = ok ? 'OK' : verdict.reason;
          }
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
      const cleanupPenalty = flaggedPatterns.length > 0 ? Math.min(0.32, flaggedPatterns.length * 0.16) : 0;
      const finalScore = Math.max(0, outputScore - structurePenalty - cleanupPenalty);
      const passedAllTests = passed === testCases.length;
      const passedStructure = missingSnippets.length === 0;
      const passedCleanup = flaggedPatterns.length === 0;
      const passedOverall = passedAllTests && passedStructure && passedCleanup;
      const feedbackKind = passedOverall
        ? 'passed'
        : !passedAllTests
        ? sawTimeout
          ? 'timeout'
          : sawSyntaxError
          ? 'syntax_error'
          : sawRuntimeError
          ? inferRuntimeFeedbackKind(stderr, language)
          : 'wrong_output'
        : missingSnippets.length > 0
        ? 'structure_missing'
        : 'cleanup';

      const message = passedOverall
        ? 'The program produced the correct result and used the required lesson structure.'
        : !passedAllTests
        ? sawTimeout
          ? 'The program timed out before it finished the lesson checks.'
          : sawSyntaxError
          ? language === 'cpp'
            ? 'The program did not compile for the lesson checks.'
            : 'The program could not run because of a syntax error.'
          : sawRuntimeError
          ? 'The program crashed during the lesson checks.'
          : 'The program did not produce the expected result for every lesson check.'
        : missingSnippets.length > 0
        ? `One required lesson structure item is still missing: ${missingSnippets.join(', ')}`
        : `One lesson cleanup rule still fails: avoid ${flaggedPatterns.join(', ')}`;

      return {
        passed: passedOverall,
        message,
        feedbackKind,
        scorePercent: Math.round(finalScore * 100),
        rubricBreakdown: {
          correctness: Math.round(outputScore * 100),
          edgeCaseHandling: Math.round(outputScore * 100),
          codeQuality: Math.round((passedStructure && passedCleanup ? 1 : Math.max(0, 1 - structurePenalty - cleanupPenalty)) * 100),
          efficiency: sawTimeout ? 20 : passedAllTests ? 85 : 60,
        },
        missingSnippets,
        flaggedPatterns,
        testResults,
        runtimeMs: Date.now() - startedAt,
        stderr,
      };
    } finally {
      if (cppSession?.cleanup) {
        await cppSession.cleanup().catch(() => {});
      }
    }
  }

  async executePythonLesson(code, definition) {
    return this.executeLesson(code, { ...definition, language: 'python' });
  }

  async executeCppLesson(code, definition) {
    return this.executeLesson(code, { ...definition, language: 'cpp' });
  }
}
