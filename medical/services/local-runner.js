// services/local-runner.js
// Lightweight, non-Docker sandboxes for JavaScript, Python, Java, and C++.
// These are NOT secure sandboxes for untrusted code.
// Use ONLY when Docker sandbox is unavailable (e.g., local dev verification).

import { spawn } from "child_process";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import vm from "vm";

let localPythonCommandPromise = null;
let localJavaRuntimeCommandPromise = null;
let localJavaCompilerCommandPromise = null;
let localCppCompilerCommandPromise = null;

function spawnProcess({ command, args = [], cwd, stdin = "", timeLimitMs = 2000 }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
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
        // Ignore kill failures and rely on the close/error handlers.
      }
    }, Math.max(1, timeLimitMs) + 50);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish({
        stdout,
        stderr: error?.message || String(error),
        exitCode: 1,
        timeout: false,
      });
    });

    child.on("close", (code) => {
      finish({
        stdout,
        stderr: timeout && !stderr ? "Time Limit Exceeded" : stderr,
        exitCode: timeout ? 124 : (code ?? 1),
        timeout,
      });
    });

    child.stdin.on("error", () => {
      // Ignore broken pipe errors when the child exits early.
    });
    child.stdin.end(stdin);
  });
}

async function resolveLocalPythonCommand() {
  if (localPythonCommandPromise) return localPythonCommandPromise;

  const candidates =
    process.platform === "win32"
      ? [
          { command: "py", args: ["-3"] },
          { command: "python", args: [] },
          { command: "python3", args: [] },
        ]
      : [
          { command: "python3", args: [] },
          { command: "python", args: [] },
        ];

  localPythonCommandPromise = (async () => {
    for (const candidate of candidates) {
      const probe = await spawnProcess({
        command: candidate.command,
        args: [...candidate.args, "--version"],
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

async function resolveLocalJavaRuntimeCommand() {
  if (localJavaRuntimeCommandPromise) return localJavaRuntimeCommandPromise;

  const candidates = [{ command: "java", args: [] }];
  localJavaRuntimeCommandPromise = (async () => {
    for (const candidate of candidates) {
      const probe = await spawnProcess({
        command: candidate.command,
        args: [...candidate.args, "-version"],
        timeLimitMs: 2000,
      }).catch(() => null);

      if (probe && !probe.timeout && (probe.exitCode === 0 || probe.stderr.toLowerCase().includes("version"))) {
        return candidate;
      }
    }

    return null;
  })();

  return localJavaRuntimeCommandPromise;
}

async function resolveLocalJavaCompilerCommand() {
  if (localJavaCompilerCommandPromise) return localJavaCompilerCommandPromise;

  const candidates = [{ command: "javac", args: [] }];
  localJavaCompilerCommandPromise = (async () => {
    for (const candidate of candidates) {
      const probe = await spawnProcess({
        command: candidate.command,
        args: [...candidate.args, "-version"],
        timeLimitMs: 2000,
      }).catch(() => null);

      if (probe && !probe.timeout && (probe.exitCode === 0 || probe.stderr.toLowerCase().includes("javac"))) {
        return candidate;
      }
    }

    return null;
  })();

  return localJavaCompilerCommandPromise;
}

async function resolveLocalCppCompilerCommand() {
  if (localCppCompilerCommandPromise) return localCppCompilerCommandPromise;

  const candidates = process.platform === "win32"
    ? [
        { command: "g++", args: [] },
        { command: "clang++", args: [] },
      ]
    : [
        { command: "g++", args: [] },
        { command: "c++", args: [] },
        { command: "clang++", args: [] },
      ];

  localCppCompilerCommandPromise = (async () => {
    for (const candidate of candidates) {
      const probe = await spawnProcess({
        command: candidate.command,
        args: [...candidate.args, "--version"],
        timeLimitMs: 2000,
      }).catch(() => null);

      if (probe && !probe.timeout && probe.exitCode === 0) {
        return candidate;
      }
    }

    return null;
  })();

  return localCppCompilerCommandPromise;
}

function getParamNames(fn) {
  try {
    const src = String(fn)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    const m =
      src.match(/^[\s(]*async\s+function[^()]*\(([^)]*)\)/) ||
      src.match(/^[\s(]*function[^()]*\(([^)]*)\)/) ||
      src.match(/^\s*async\s*\(([^)]*)\)\s*=>/) ||
      src.match(/^\s*\(([^)]*)\)\s*=>/) ||
      src.match(/^\s*async\s+([^=()\s,]+)\s*=>/) ||
      src.match(/^\s*([^=()\s,]+)\s*=>/);

    if (!m) return [];
    const raw = (m[1] ?? "").trim();
    if (!raw) return [];

    return raw
      .split(",")
      .map((s) =>
        s
          .trim()
          .replace(/^\.\.\./, "")
          .split("=")[0]
          .trim()
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickFnFromModule(mod, entries) {
  if (!mod) return null;
  if (typeof mod === "function") return mod;

  for (const name of entries) {
    if (typeof mod[name] === "function") return mod[name];
  }
  if (typeof mod.default === "function") return mod.default;
  return null;
}

function pickFnFromVmContext(context, entries, timeLimitMs) {
  for (const name of entries) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) continue;

    try {
      const candidate = vm.runInContext(
        `typeof ${name} === "function" ? ${name} : undefined`,
        context,
        { timeout: Math.max(1, Math.min(timeLimitMs, 5000)) },
      );
      if (typeof candidate === "function") return candidate;
    } catch {
      // Ignore and continue probing.
    }
  }

  return null;
}

function awaitVmResult(result, timeLimitMs) {
  if (!result || typeof result.then !== "function") {
    return Promise.resolve({ value: result, timedOut: false });
  }

  let timer = null;

  return new Promise((resolve, reject) => {
    timer = setTimeout(() => resolve({ value: undefined, timedOut: true }), Math.max(1, timeLimitMs));

    Promise.resolve(result)
      .then((value) => resolve({ value, timedOut: false }))
      .catch(reject)
      .finally(() => {
        clearTimeout(timer);
      });
  });
}

export async function runInLocalJsSandbox({
  userCode,
  stdinJson,
  timeLimitMs = 2000,
  entries = ["solution", "solve"],
}) {
  const inputData = JSON.parse(stdinJson);

  const isPlainObject = (x) => x !== null && typeof x === "object" && !Array.isArray(x);

  const context = {
    console,
    module: { exports: {} },
    exports: {},
    __result: undefined,
    __error: undefined,
    __input: inputData,
  };
  vm.createContext(context);

  // 1) Load user code into the context
  try {
    vm.runInContext(userCode, context, { timeout: Math.max(1, Math.min(timeLimitMs, 5000)) });
  } catch (e) {
    return {
      stdout: "",
      stderr: `Runtime Error: ${e?.message || String(e)}`,
      exitCode: 1,
      timeout: /Script execution timed out/i.test(e?.message || ""),
    };
  }

  let fn =
    pickFnFromModule(context.module.exports, entries) ||
    pickFnFromModule(context.exports, entries) ||
    null;

  if (!fn) {
    for (const name of entries) {
      if (typeof context[name] === "function") {
        fn = context[name];
        break;
      }
    }
  }

  if (!fn) {
    fn = pickFnFromVmContext(context, entries, timeLimitMs);
  }

  if (typeof fn !== "function") {
    return {
      stdout: "",
      stderr: `Runtime Error: No entry function found. Define one of: ${entries.join(", ")}`,
      exitCode: 1,
      timeout: false,
    };
  }

  // 3) Execute within vm timeout by invoking through script in-context
  context.__fn = fn;

  // Mirror harness.js calling convention so local runs behave like Docker runs.
  // Supports both:
  // - Legacy: fn(inputObj)
  // - LeetCode-style: fn(arg1, arg2, ...) where input is dict/array
  let callExpr = `__result = __fn(__input);`;

  if (Array.isArray(inputData)) {
    callExpr = fn.length <= 1 ? `__result = __fn(__input);` : `__result = __fn(...__input);`;
  } else if (isPlainObject(inputData)) {
    const values = Object.values(inputData);
    const paramNames = getParamNames(fn);

    if (paramNames.length >= 1 && paramNames.every((k) => Object.prototype.hasOwnProperty.call(inputData, k))) {
      context.__namedArgs = paramNames.map((k) => inputData[k]);
      callExpr = `__result = __fn(...__namedArgs);`;
    } else {
      context.__values = values;
      if (fn.length <= 1) {
        callExpr = `__result = __fn(__input);`;
      } else {
        callExpr = `__result = __fn(...__values);`;
      }
    }
  }

  try {
    vm.runInContext(callExpr, context, { timeout: timeLimitMs });
  } catch (e) {
    return {
      stdout: "",
      stderr: `Runtime Error: ${e?.message || String(e)}`,
      exitCode: 1,
      timeout: /Script execution timed out/i.test(e?.message || ""),
    };
  }

  let awaited;
  try {
    awaited = await awaitVmResult(context.__result, timeLimitMs);
  } catch (e) {
    return {
      stdout: "",
      stderr: `Runtime Error: ${e?.message || String(e)}`,
      exitCode: 1,
      timeout: false,
    };
  }

  if (awaited.timedOut) {
    return {
      stdout: "",
      stderr: "Time Limit Exceeded",
      exitCode: 124,
      timeout: true,
    };
  }

  try {
    const out = JSON.stringify(awaited.value);
    return { stdout: (out === undefined ? "null" : out) + "\n", stderr: "", exitCode: 0, timeout: false };
  } catch {
    return {
      stdout: "",
      stderr: `Runtime Error: Output is not JSON-serializable`,
      exitCode: 1,
      timeout: false,
    };
  }
}

export async function runInLocalPythonSandbox({
  userCode,
  harnessCode,
  stdinJson,
  timeLimitMs = 2000,
}) {
  const python = await resolveLocalPythonCommand();
  if (!python) {
    return {
      stdout: "",
      stderr: "Python is not available in the local judge environment",
      exitCode: 1,
      timeout: false,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "duel-python-"));

  try {
    await writeFile(path.join(tempDir, "user.py"), userCode, "utf8");
    await writeFile(path.join(tempDir, "harness.py"), harnessCode, "utf8");

    return await spawnProcess({
      command: python.command,
      args: [...python.args, "harness.py"],
      cwd: tempDir,
      stdin: stdinJson,
      timeLimitMs,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runInLocalJavaSandbox({
  userCode,
  stdinText,
  timeLimitMs = 2500,
}) {
  const [javaRuntime, javaCompiler] = await Promise.all([
    resolveLocalJavaRuntimeCommand(),
    resolveLocalJavaCompilerCommand(),
  ]);

  if (!javaRuntime || !javaCompiler) {
    return {
      stdout: "",
      stderr: "Java is not available in the local judge environment",
      exitCode: 1,
      timeout: false,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "duel-java-"));

  try {
    await writeFile(path.join(tempDir, "Main.java"), userCode, "utf8");

    const compileResult = await spawnProcess({
      command: javaCompiler.command,
      args: [...javaCompiler.args, "Main.java"],
      cwd: tempDir,
      timeLimitMs: Math.max(2000, timeLimitMs),
    });

    if (compileResult.exitCode !== 0) {
      return compileResult;
    }

    return await spawnProcess({
      command: javaRuntime.command,
      args: [...javaRuntime.args, "Main"],
      cwd: tempDir,
      stdin: stdinText,
      timeLimitMs,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function runInLocalCppSandbox({
  userCode,
  stdinText,
  timeLimitMs = 2500,
}) {
  const cppCompiler = await resolveLocalCppCompilerCommand();
  if (!cppCompiler) {
    return {
      stdout: "",
      stderr: "C++ is not available in the local judge environment",
      exitCode: 1,
      timeout: false,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "duel-cpp-"));
  const executableName = process.platform === "win32" ? "main.exe" : "main.out";

  try {
    await writeFile(path.join(tempDir, "main.cpp"), userCode, "utf8");

    const compileResult = await spawnProcess({
      command: cppCompiler.command,
      args: [...cppCompiler.args, "-std=c++17", "-O2", "-pipe", "main.cpp", "-o", executableName],
      cwd: tempDir,
      timeLimitMs: Math.max(2500, timeLimitMs),
    });

    if (compileResult.exitCode !== 0) {
      return compileResult;
    }

    return await spawnProcess({
      command: path.join(tempDir, executableName),
      cwd: tempDir,
      stdin: stdinText,
      timeLimitMs,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
