import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

let _dockerAvailPromise = null;

/** Best-effort check for Docker availability in the current runtime. Cached. */
export async function isDockerAvailable() {
  if (_dockerAvailPromise) return _dockerAvailPromise;
  _dockerAvailPromise = (async () => {
    try {
      await execAsync("docker --version", { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  })();
  return _dockerAvailPromise;
}

export async function runInDockerSandbox({
  language,
  userCode,
  harnessCode,
  stdinJson,
  timeLimitMs = 2000,
  memoryMb = 256,
  cpuLimit = 0.5,
  pidsLimit = 64,
}) {
  const id = crypto.randomBytes(8).toString('hex');
  const containerName = `judge-${id}`;

  const userEscaped = userCode.replace(/'/g, "'\\''");
  const harnessEscaped = harnessCode.replace(/'/g, "'\\''");
  const stdinEscaped = stdinJson.replace(/'/g, "'\\''");

  let dockerCmd;
  let userFileName;
  let harnessFileName;

  if (language === 'python') {
    userFileName = 'user.py';
    harnessFileName = 'harness.py';

    dockerCmd = `docker run --rm --name ${containerName} \
      --memory=${memoryMb}m \
      --cpus=${cpuLimit} \
      --pids-limit=${pidsLimit} \
      --network=none \
      --read-only \
      --tmpfs /tmp:rw,noexec,nosuid,size=10m \
      python:3.11-slim \
      bash -c "echo '${userEscaped}' > /tmp/${userFileName} && \
               echo '${harnessEscaped}' > /tmp/${harnessFileName} && \
               cd /tmp && \
               echo '${stdinEscaped}' | timeout ${Math.ceil(timeLimitMs / 1000)}s python ${harnessFileName}"`;
  } else {
    userFileName = 'user.js';
    harnessFileName = 'harness.js';

    dockerCmd = `docker run --rm --name ${containerName} \
      --memory=${memoryMb}m \
      --cpus=${cpuLimit} \
      --pids-limit=${pidsLimit} \
      --network=none \
      --read-only \
      --tmpfs /tmp:rw,noexec,nosuid,size=10m \
      node:18-slim \
      bash -c "echo '${userEscaped}' > /tmp/${userFileName} && \
               echo '${harnessEscaped}' > /tmp/${harnessFileName} && \
               cd /tmp && \
               echo '${stdinEscaped}' | timeout ${Math.ceil(timeLimitMs / 1000)}s node ${harnessFileName}"`;
  }

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