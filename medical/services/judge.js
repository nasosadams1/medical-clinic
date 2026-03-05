// services/judge.js
// Judge runtime supporting Supabase JSON test_cases:
// - { input_json, expected_json } (structured)
// - optional { validator } e.g. "two_sum" (logical validation)
// - optional { expected_output } (legacy string)
// - optional { hidden }
//
// Key behavior:
// - For JS, harness calls contestant functions with a best-effort arg strategy
//   so "solution(nums, target)" AND "solution({nums,target})" can both work.
// - Stops on first failing test.
// - Robust against extra stdout lines by extracting the last non-empty line.
// - Returns the real overall verdict (Accepted / Runtime Error / TLE / Wrong Answer).

import { runInDockerSandbox, isDockerAvailable } from "./sandbox-runner.js";
import { runInLocalJsSandbox } from "./local-runner.js";
import { pythonHarness, jsHarness } from "./harness.js";
import { deepEqual } from "./validators.js";

/* ----------------------------- utilities ---------------------------- */

function safeJsonParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, value: null };
  }
}

function coerceJsonMaybe(v) {
  if (typeof v === "string") {
    const p = safeJsonParse(v);
    if (p.ok) return p.value;
  }
  return v;
}

function normalizeLooseOutput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return s;

  // (1,2) -> [1,2]
  if (s.startsWith("(") && s.endsWith(")")) return `[${s.slice(1, -1)}]`;

  // "1 2" -> [1,2]
  if (/^-?\d+\s+-?\d+$/.test(s)) {
    const parts = s.split(/\s+/);
    return `[${parts[0]},${parts[1]}]`;
  }

  // "1, 2" -> [1, 2]
  if (/^-?\d+\s*,\s*-?\d+$/.test(s)) return `[${s}]`;

  return s;
}

// Extra-robust: take last non-empty line as answer
function extractLastNonEmptyLine(stdout) {
  const lines = (stdout ?? "")
    .toString()
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

/* -------------------------- validators ------------------------- */

const INTERNAL_VALIDATORS = {
  two_sum: (actualStdout, inputJson) => {
    const normalized = normalizeLooseOutput(actualStdout);
    const parsed = safeJsonParse(normalized);
    if (!parsed.ok) return { ok: false, reason: "Output is not valid JSON (expected [i,j])" };

    const out = parsed.value;
    let i, j;

    if (Array.isArray(out) && out.length === 2) {
      i = out[0];
      j = out[1];
    } else if (out && typeof out === "object" && Number.isInteger(out.i) && Number.isInteger(out.j)) {
      i = out.i;
      j = out.j;
    } else {
      return { ok: false, reason: "Output must be [i,j] or {i,j}" };
    }

    const nums = inputJson?.nums;
    const target = inputJson?.target;

    if (!Array.isArray(nums) || target === undefined) return { ok: false, reason: "Bad input_json" };
    if (!Number.isInteger(i) || !Number.isInteger(j)) return { ok: false, reason: "Indices must be integers" };
    if (i === j) return { ok: false, reason: "Indices must be different" };
    if (i < 0 || j < 0 || i >= nums.length || j >= nums.length) return { ok: false, reason: "Index out of bounds" };
    if (nums[i] + nums[j] !== target) return { ok: false, reason: "Does not sum to target" };

    return { ok: true, reason: "OK" };
  },
};

function compareActualToExpected({ actualRaw, expectedJson, expectedOutputLegacy }) {
  const actualNorm = normalizeLooseOutput(actualRaw);

  if (expectedJson !== undefined) {
    // If expected is primitive, allow direct string match first
    if (typeof expectedJson !== "object" && actualNorm === String(expectedJson)) {
      return { ok: true, reason: "OK" };
    }

    const parsed = safeJsonParse(actualNorm);
    if (!parsed.ok) return { ok: false, reason: "Output is not valid JSON" };
    return { ok: deepEqual(parsed.value, expectedJson), reason: "Wrong Answer" };
  }

  // Legacy expected_output compare
  const expNorm = normalizeLooseOutput(expectedOutputLegacy ?? "");
  const a = safeJsonParse(actualNorm);
  const e = safeJsonParse(expNorm);

  if (a.ok && e.ok) return { ok: deepEqual(a.value, e.value), reason: "Wrong Answer" };
  return { ok: actualNorm.trim() === expNorm.trim(), reason: "Wrong Answer" };
}

/* -------------------------- logic ------------------------- */

function upgradeTestCase(raw) {
  if (raw && typeof raw === "object" && ("input_json" in raw || "expected_json" in raw || "validator" in raw)) {
    return {
      input_json: coerceJsonMaybe(raw.input_json ?? null),
      expected_json: raw.expected_json === undefined ? undefined : coerceJsonMaybe(raw.expected_json),
      expected_output: raw.expected_output !== undefined ? String(raw.expected_output) : undefined,
      validator: raw.validator ?? null,
      hidden: !!raw.hidden,
      time_limit_ms: raw.time_limit_ms ?? (raw.time_limit_seconds ? Number(raw.time_limit_seconds) * 1000 : null),
    };
  }

  return {
    input_json: null,
    expected_output: String(raw?.expected_output ?? ""),
    hidden: !!raw?.hidden,
  };
}

export class JudgeService {
  async executeCode(code, language, testCases) {
    const startedAt = Date.now();
    const cases = Array.isArray(testCases) ? testCases : [];
    const total = cases.length;

    const lang = (language || "").toLowerCase().startsWith("py") ? "python" : "javascript";
    const dockerOk = await isDockerAvailable().catch(() => false);

    let passed = 0;
    let overallResult = "Accepted";
    const testResults = [];

    for (let idx = 0; idx < total; idx++) {
      const t = upgradeTestCase(cases[idx]);
      const stdinJson = JSON.stringify(t.input_json ?? null);

      const harness =
        lang === "python"
          ? pythonHarness({ entry: "solve", userFile: "user.py" })
          : jsHarness({ entries: ["solution", "solve"], userFile: "user.js" });

      let res;
      const timeLimitMs = t.time_limit_ms ?? 2000;

      if (dockerOk) {
        res = await runInDockerSandbox({
          language: lang,
          userCode: code,
          harnessCode: harness,
          stdinJson,
          timeLimitMs,
        });
      } else {
        res =
          lang === "javascript"
            ? await runInLocalJsSandbox({ userCode: code, harnessCode: harness, stdinJson, timeLimitMs })
            : { stderr: "Python requires Docker", exitCode: 1, stdout: "" };
      }

      const actualRaw = extractLastNonEmptyLine(res.stdout);

      let ok = false;
      let reason = "Wrong Answer";

      if (res.timeout) {
        reason = "Time Limit Exceeded";
      } else if ((res.exitCode ?? 0) !== 0) {
        reason = "Runtime Error";
      } else {
        const v = INTERNAL_VALIDATORS[t.validator];
        if (v) {
          const verdict = v(actualRaw, t.input_json);
          ok = !!verdict?.ok;
          reason = ok ? "OK" : verdict?.reason || "Wrong Answer";
        } else {
          const cmp = compareActualToExpected({
            actualRaw,
            expectedJson: t.expected_json,
            expectedOutputLegacy: t.expected_output,
          });
          ok = cmp.ok;
          reason = ok ? "OK" : cmp.reason;
        }
      }

      testResults.push({
        passed: ok,
        reason,
        actual: t.hidden ? "" : actualRaw,
        stderr: ok ? "" : t.hidden ? "" : (res.stderr ?? "").slice(0, 500),
        hidden: !!t.hidden,
      });

      if (ok) {
        passed++;
      } else {
        overallResult = reason;
        break; // Stop on first fail
      }
    }

    return {
      result: overallResult,
      score: total > 0 ? Math.round((passed / total) * 100) : 0,
      passed,
      total,
      testResults,
      runtimeMs: Date.now() - startedAt,
    };
  }
}