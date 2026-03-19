// services/judge.js
// Judge runtime supporting Supabase JSON test_cases:
// - { input_json, expected_json } (structured)
// - optional { validator } for logically equivalent answers
// - optional { compare_mode } for judge-side comparison rules
// - optional { expected_output } (legacy string)
// - optional { hidden }

import { runInDockerSandbox, isDockerAvailable } from "./sandbox-runner.js";
import {
  runInLocalCppSandbox,
  runInLocalJavaSandbox,
  runInLocalJsSandbox,
  runInLocalPythonSandbox,
} from "./local-runner.js";
import { pythonHarness, jsHarness } from "./harness.js";
import { deepEqual, normalizeOutput, validators } from "./validators.js";

const DEBUG_DUEL = process.env.DEBUG_DUEL === "1";
const REQUIRE_ISOLATED_JUDGE =
  process.env.REQUIRE_ISOLATED_JUDGE === "1" ||
  (process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_LOCAL_JUDGE !== "1");

function debugJudge(...args) {
  if (DEBUG_DUEL) console.log("[judge]", ...args);
}

function safeJsonParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, value: null };
  }
}

function coerceJsonMaybe(v) {
  if (typeof v === "string") {
    const parsed = safeJsonParse(v);
    if (parsed.ok) return parsed.value;
  }
  return v;
}

function normalizeJudgeLanguage(language) {
  const value = String(language ?? "").trim().toLowerCase();
  if (value === "javascript" || value === "js") return "javascript";
  if (value === "python" || value === "py") return "python";
  if (value === "java") return "java";
  if (value === "cpp" || value === "c++") return "cpp";
  return null;
}

function extractLastNonEmptyLine(stdout) {
  const lines = (stdout ?? "")
    .toString()
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

function compareActualToExpected({ actualRaw, expectedJson, expectedOutputLegacy, compareMode, inputJson }) {
  const actualNorm = normalizeOutput(actualRaw);

  if (compareMode && validators[compareMode]) {
    const verdict = validators[compareMode](actualNorm, {
      ...inputJson,
      expected: expectedJson,
    });
    return { ok: !!verdict?.ok, reason: verdict?.reason || "Wrong Answer" };
  }

  if (expectedJson !== undefined) {
    if (typeof expectedJson === "number") {
      const numeric = Number(actualNorm);
      if (Number.isFinite(numeric) && numeric === expectedJson) {
        return { ok: true, reason: "OK" };
      }
    }

    if (typeof expectedJson === "boolean") {
      const lowered = actualNorm.toLowerCase();
      if (lowered === "true" || lowered === "false") {
        return { ok: (lowered === "true") === expectedJson, reason: (lowered === "true") === expectedJson ? "OK" : "Wrong Answer" };
      }
    }

    if (typeof expectedJson === "string" && actualNorm === expectedJson.trim()) {
      return { ok: true, reason: "OK" };
    }

    const parsed = safeJsonParse(actualNorm);
    if (!parsed.ok) return { ok: false, reason: "Output is not valid JSON" };
    return { ok: deepEqual(parsed.value, expectedJson), reason: "Wrong Answer" };
  }

  const expectedNormalized = normalizeOutput(expectedOutputLegacy ?? "");
  const actualParsed = safeJsonParse(actualNorm);
  const expectedParsed = safeJsonParse(expectedNormalized);

  if (actualParsed.ok && expectedParsed.ok) {
    return { ok: deepEqual(actualParsed.value, expectedParsed.value), reason: "Wrong Answer" };
  }

  return { ok: actualNorm.trim() === expectedNormalized.trim(), reason: "Wrong Answer" };
}

function upgradeTestCase(raw) {
  if (
    raw &&
    typeof raw === "object" &&
    (
      "input_json" in raw ||
      "input" in raw ||
      "stdin_text" in raw ||
      "input_text" in raw ||
      "expected_json" in raw ||
      "expected_output" in raw ||
      "validator" in raw
    )
  ) {
    const inputRaw = raw.input_json !== undefined ? raw.input_json : raw.input;

    return {
      input_json: coerceJsonMaybe(inputRaw ?? null),
      stdin_text:
        raw.stdin_text !== undefined
          ? String(raw.stdin_text)
          : raw.input_text !== undefined
          ? String(raw.input_text)
          : null,
      expected_json: raw.expected_json === undefined ? undefined : coerceJsonMaybe(raw.expected_json),
      expected_output: raw.expected_output !== undefined ? String(raw.expected_output) : undefined,
      validator: raw.validator ?? null,
      compare_mode: raw.compare_mode ?? null,
      hidden: !!raw.hidden,
      time_limit_ms: raw.time_limit_ms ?? (raw.time_limit_seconds ? Number(raw.time_limit_seconds) * 1000 : null),
    };
  }

  return {
    input_json: coerceJsonMaybe(raw?.input ?? null),
    expected_output: String(raw?.expected_output ?? ""),
    hidden: !!raw?.hidden,
  };
}

export class JudgeService {
  async executeCode(code, language, testCases) {
    const startedAt = Date.now();
    const cases = Array.isArray(testCases) ? testCases : [];
    const total = cases.length;

    const lang = normalizeJudgeLanguage(language);
    if (!lang) {
      throw new Error(`Unsupported judge language: ${language}`);
    }
    const dockerOk = await isDockerAvailable().catch(() => false);
    debugJudge("start", { lang, total, dockerOk, codeChars: (code ?? "").length });

    let passed = 0;
    let overallResult = "Accepted";
    const testResults = [];
    let sawWrongAnswer = false;
    let sawRuntimeError = false;
    let sawTimeout = false;
    let failureStderr = "";

    for (let idx = 0; idx < total; idx++) {
      const t = upgradeTestCase(cases[idx]);
      debugJudge("case_begin", {
        idx: idx + 1,
        hidden: !!t.hidden,
        validator: t.validator ?? null,
        compareMode: t.compare_mode ?? null,
      });

      const stdinPayload =
        typeof t.stdin_text === "string"
          ? t.stdin_text
          : JSON.stringify(t.input_json ?? null);
      const harness =
        lang === "python"
          ? pythonHarness({ entries: ["solution", "solve"], userFile: "user.py" })
          : lang === "javascript"
          ? jsHarness({ entries: ["solution", "solve"], userFile: "user.js" })
          : "";

      let res;
      const timeLimitMs = t.time_limit_ms ?? 2000;

      if (dockerOk) {
        res = await runInDockerSandbox({
          language: lang,
          userCode: code,
          harnessCode: harness,
          stdinJson: stdinPayload,
          timeLimitMs,
        });
      } else {
        if (REQUIRE_ISOLATED_JUDGE) {
          throw new Error(
            "Isolated judge execution is required. Configure Docker, JUDGE_PROVIDER=remote, or JUDGE_PROVIDER=judge0."
          );
        }
        res =
          lang === "javascript"
            ? await runInLocalJsSandbox({ userCode: code, harnessCode: harness, stdinJson: stdinPayload, timeLimitMs })
            : lang === "python"
            ? await runInLocalPythonSandbox({ userCode: code, harnessCode: harness, stdinJson: stdinPayload, timeLimitMs })
            : lang === "java"
            ? await runInLocalJavaSandbox({ userCode: code, stdinText: stdinPayload, timeLimitMs })
            : await runInLocalCppSandbox({ userCode: code, stdinText: stdinPayload, timeLimitMs });
      }

      const actualRaw = extractLastNonEmptyLine(res.stdout);
      let ok = false;
      let reason = "Wrong Answer";

      if (res.timeout) {
        reason = "Time Limit Exceeded";
      } else if ((res.exitCode ?? 0) !== 0) {
        reason = "Runtime Error";
      } else if (t.validator && validators[t.validator]) {
        const verdict = validators[t.validator](actualRaw, {
          ...(t.input_json && typeof t.input_json === "object" ? t.input_json : {}),
          expected: t.expected_json,
        });
        ok = !!verdict?.ok;
        reason = ok ? "OK" : verdict?.reason || "Wrong Answer";
      } else {
        const verdict = compareActualToExpected({
          actualRaw,
          expectedJson: t.expected_json,
          expectedOutputLegacy: t.expected_output,
          compareMode: t.compare_mode,
          inputJson: t.input_json,
        });
        ok = verdict.ok;
        reason = ok ? "OK" : verdict.reason;
      }

      testResults.push({
        label: t.label || `Test ${idx + 1}`,
        passed: ok,
        reason,
        actual: t.hidden ? "" : actualRaw,
        stderr: ok ? "" : (t.hidden ? "" : (res.stderr ?? "").slice(0, 500)),
        hidden: !!t.hidden,
      });

      if (ok) {
        passed++;
      } else if (reason === "Time Limit Exceeded") {
        sawTimeout = true;
      } else if (reason === "Runtime Error") {
        sawRuntimeError = true;
      } else {
        sawWrongAnswer = true;
      }

      if (!ok && res.stderr) {
        failureStderr = String(res.stderr).slice(0, 1000);
      }
    }

    if (passed === total) {
      overallResult = "Accepted";
    } else if (sawTimeout) {
      overallResult = "Time Limit Exceeded";
    } else if (sawRuntimeError) {
      overallResult = "Runtime Error";
    } else if (sawWrongAnswer) {
      overallResult = "Wrong Answer";
    }

    return {
      result: overallResult,
      score: total > 0 ? Math.round((passed / total) * 100) : 0,
      passed,
      total,
      testResults,
      runtimeMs: Date.now() - startedAt,
      stderr: failureStderr,
    };
  }
}
