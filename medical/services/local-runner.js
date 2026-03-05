// services/local-runner.js
// Lightweight, non-Docker sandbox for JavaScript only.
// Uses Node's vm with a hard timeout. This is NOT a secure sandbox for untrusted code.
// Use ONLY when Docker sandbox is unavailable (e.g., Render free instances without Docker).

import vm from "vm";

export function runInLocalJsSandbox({
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

  // 2) Pick entry function: solve/solution or exports/default
  const pickFnFromModule = (mod) => {
    if (!mod) return null;
    for (const name of entries) {
      if (typeof mod[name] === "function") return mod[name];
    }
    if (typeof mod.default === "function") return mod.default;
    return null;
  };

  let fn =
    pickFnFromModule(context.module.exports) ||
    pickFnFromModule(context.exports) ||
    null;

  if (!fn) {
    for (const name of entries) {
      if (typeof context[name] === "function") {
        fn = context[name];
        break;
      }
    }
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
    context.__values = values;
    if (fn.length <= 1) {
      callExpr = values.length === 1 ? `__result = __fn(__values[0]);` : `__result = __fn(__input);`;
    } else {
      callExpr = `__result = __fn(...__values);`;
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

  try {
    const out = JSON.stringify(context.__result);
    return { stdout: out + "\n", stderr: "", exitCode: 0, timeout: false };
  } catch (e) {
    return {
      stdout: "",
      stderr: `Runtime Error: Output is not JSON-serializable`,
      exitCode: 1,
      timeout: false,
    };
  }
}
