import { deepEqual } from "./validators.js";

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

  if (s.startsWith("(") && s.endsWith(")")) return `[${s.slice(1, -1)}]`;

  if (/^-?\d+\s+-?\d+$/.test(s)) {
    const parts = s.split(/\s+/);
    return `[${parts[0]},${parts[1]}]`;
  }

  if (/^-?\d+\s*,\s*-?\d+$/.test(s)) return `[${s}]`;

  return s;
}

function extractLastNonEmptyLine(stdout) {
  const lines = (stdout ?? "")
    .toString()
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1] : "";
}

const INTERNAL_VALIDATORS = {
  two_sum: (actualStdout, inputJson) => {
    const normalized = normalizeLooseOutput(actualStdout);
    const parsed = safeJsonParse(normalized);
    if (!parsed.ok) return { ok: false, reason: "Output is not valid JSON (expected [i,j])" };

    const out = parsed.value;
    let i;
    let j;

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
    if (typeof expectedJson !== "object" && actualNorm === String(expectedJson)) {
      return { ok: true, reason: "OK" };
    }

    const parsed = safeJsonParse(actualNorm);
    if (!parsed.ok) return { ok: false, reason: "Output is not valid JSON" };
    return { ok: deepEqual(parsed.value, expectedJson), reason: "Wrong Answer" };
  }

  const expNorm = normalizeLooseOutput(expectedOutputLegacy ?? "");
  const a = safeJsonParse(actualNorm);
  const e = safeJsonParse(expNorm);

  if (a.ok && e.ok) return { ok: deepEqual(a.value, e.value), reason: "Wrong Answer" };
  return { ok: actualNorm.trim() === expNorm.trim(), reason: "Wrong Answer" };
}

function upgradeTestCase(raw) {
  if (
    raw &&
    typeof raw === "object" &&
    ("input_json" in raw || "input" in raw || "expected_json" in raw || "expected_output" in raw || "validator" in raw)
  ) {
    const inputRaw = raw.input_json !== undefined ? raw.input_json : raw.input;

    return {
      input_json: coerceJsonMaybe(inputRaw ?? null),
      expected_json: raw.expected_json === undefined ? undefined : coerceJsonMaybe(raw.expected_json),
      expected_output: raw.expected_output !== undefined ? String(raw.expected_output) : undefined,
      validator: raw.validator ?? null,
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

function buildJsSource(userCode) {
  return `const fs = require("fs");
console.log = (...a) => process.stderr.write(a.join(" ") + "\\n");
console.info = (...a) => process.stderr.write(a.join(" ") + "\\n");
console.warn = (...a) => process.stderr.write(a.join(" ") + "\\n");
console.error = (...a) => process.stderr.write(a.join(" ") + "\\n");
const inputData = JSON.parse(fs.readFileSync(0, "utf-8"));
${userCode}
function pickFn() {
  if (typeof solution === "function") return solution;
  if (typeof solve === "function") return solve;
  if (typeof globalThis.solution === "function") return globalThis.solution;
  if (typeof globalThis.solve === "function") return globalThis.solve;
  if (typeof module !== "undefined" && module && module.exports) {
    if (typeof module.exports.solution === "function") return module.exports.solution;
    if (typeof module.exports.solve === "function") return module.exports.solve;
    if (typeof module.exports.default === "function") return module.exports.default;
    if (typeof module.exports === "function") return module.exports;
  }
  return null;
}
function getParamNames(f) {
  try {
    const src = String(f)
      .replace(/\\/\\*[\\s\\S]*?\\*\\//g, "")
      .replace(/\\/\\/.*$/gm, "");
    const m =
      src.match(/^[\\s\\(]*function[^\\(]*\\(([^)]*)\\)/) ||
      src.match(/^\\s*\\(([^)]*)\\)\\s*=>/) ||
      src.match(/^\\s*([^=()\\s,]+)\\s*=>/);
    if (!m) return [];
    const raw = (m[1] ?? "").trim();
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim().replace(/^\\.\\.\\./, "").split("=")[0].trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
function callWithBestEffort(fn, input) {
  if (Array.isArray(input)) {
    return fn.length === 1 ? fn(input) : fn(...input);
  }
  if (input !== null && typeof input === "object") {
    const paramNames = getParamNames(fn);
    if (paramNames.length >= 1 && paramNames.every((k) => Object.prototype.hasOwnProperty.call(input, k))) {
      return fn(...paramNames.map((k) => input[k]));
    }
    const values = Object.values(input);
    if (fn.length > 1) return fn(...values);
    return fn(input);
  }
  return fn(input);
}
try {
  const fn = pickFn();
  if (!fn) throw new Error("No entry function found (solution/solve)");
  const result = callWithBestEffort(fn, inputData);
  const out = JSON.stringify(result);
  process.stdout.write(out === undefined ? "null" : out);
} catch (e) {
  process.stderr.write((e && e.stack ? e.stack : String(e)) + "\\n");
  process.exit(1);
}
`;
}

function buildPySource(userCode) {
  return `${userCode}
import sys, json, inspect, traceback

def _pick_fn():
    for name in ("solve", "solution"):
        f = globals().get(name)
        if callable(f):
            return f
    return None

def _call(fn, data):
    try:
        sig = inspect.signature(fn)
        params = [
            p for p in sig.parameters.values()
            if p.kind in (
                inspect.Parameter.POSITIONAL_ONLY,
                inspect.Parameter.POSITIONAL_OR_KEYWORD
            )
        ]
        arity = len(params)
    except Exception:
        return fn(data)

    if isinstance(data, dict):
        names = [p.name for p in params]
        if arity >= 1 and all(name in data for name in names):
            return fn(*[data[name] for name in names])

        vals = list(data.values())
        if arity > 1:
            return fn(*vals)
        return fn(data)

    if isinstance(data, list) and arity > 1:
        return fn(*data)

    return fn(data)

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        fn = _pick_fn()
        if fn is None:
            raise RuntimeError("No entry function found (solve/solution)")
        print(json.dumps(_call(fn, data)))
    except Exception:
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
`;
}

function classifyJudge0Error(message) {
  const msg = String(message || '').toLowerCase();
  if (msg.includes('not subscribed to this api')) {
    return 'Judge backend misconfigured: RapidAPI Judge0 subscription is missing.';
  }
  if (msg.includes('invalid api key') || msg.includes('unauthorized') || msg.includes('forbidden')) {
    return 'Judge backend misconfigured: Judge0 API credentials are invalid.';
  }
  if (msg.includes('quota') || msg.includes('rate limit')) {
    return 'Judge backend temporarily unavailable: Judge0 quota or rate limit was reached.';
  }
  return '';
}

function normalizeLang(language) {
  const l = (language ?? "").toString().trim().toLowerCase();
  if (l === "js" || l === "node" || l === "nodejs") return "javascript";
  if (l === "javascript" || l === "ecmascript") return "javascript";
  if (l === "py" || l === "python3") return "python";
  if (l === "python") return "python";
  return l;
}

export class Judge0Service {
  constructor({
    baseUrl,
    apiKey,
    apiHost,
    timeoutMs = 25_000,
  }) {
    this.baseUrl = (baseUrl || "").replace(/\/+$/, "");
    this.apiKey = apiKey || "";
    this.apiHost = apiHost || "";
    this.timeoutMs = timeoutMs;

    if (!this.baseUrl) {
      throw new Error("JUDGE0_URL is required for Judge0Service");
    }
  }

  _languageId(lang) {
    if (lang === "javascript") return 63;
    if (lang === "python") return 71;
    throw new Error(`Unsupported language for Judge0: ${lang}`);
  }

  async _submitAndWait({ sourceCode, languageId, stdin, timeLimitMs }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      "content-type": "application/json",
    };

    if (this.apiKey && this.apiHost) {
      headers["x-rapidapi-key"] = this.apiKey;
      headers["x-rapidapi-host"] = this.apiHost;
    }

    const body = {
      source_code: sourceCode,
      language_id: languageId,
      stdin,
      cpu_time_limit: Math.max(1, Math.ceil(timeLimitMs / 1000)),
      wall_time_limit: Math.max(2, Math.ceil((timeLimitMs + 1000) / 1000)),
    };

    try {
      const res = await fetch(
        `${this.baseUrl}/submissions?base64_encoded=false&wait=true&fields=stdout,stderr,compile_output,message,status,time,memory`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(classifyJudge0Error(payload?.error || payload?.message) || payload?.error || payload?.message || `Judge0 request failed (${res.status})`);
      }

      const statusId = Number(payload?.status?.id ?? 0);
      const statusText = String(payload?.status?.description || "");
      const timeout = statusId === 5;
      const accepted = statusId === 3;
      const stderr =
        payload?.stderr ||
        payload?.compile_output ||
        payload?.message ||
        (accepted ? "" : statusText) ||
        "";
      const stdout = payload?.stdout || "";

      return {
        stdout,
        stderr,
        timeout,
        exitCode: accepted ? 0 : 1,
      };
    } catch (err) {
      if (err?.name === "AbortError") {
        return { stdout: "", stderr: `Judge0 timeout after ${this.timeoutMs}ms`, timeout: true, exitCode: 124 };
      }
      const classified = classifyJudge0Error(err?.message);
      if (classified) {
        const judgeError = new Error(classified);
        judgeError.code = "JUDGE_PROVIDER_ERROR";
        throw judgeError;
      }
      return { stdout: "", stderr: err?.message || "Judge0 request failed", timeout: false, exitCode: 1 };
    } finally {
      clearTimeout(timer);
    }
  }

  async executeCode(code, language, testCases) {
    const startedAt = Date.now();
    const cases = Array.isArray(testCases) ? testCases : [];
    const total = cases.length;

    const lang = normalizeLang(language);
    const languageId = this._languageId(lang);

    let passed = 0;
    let overallResult = "Accepted";
    const testResults = [];

    for (let idx = 0; idx < total; idx++) {
      const t = upgradeTestCase(cases[idx]);
      const stdinJson = JSON.stringify(t.input_json ?? null);
      const timeLimitMs = t.time_limit_ms ?? 2000;

      const sourceCode = lang === "python" ? buildPySource(code) : buildJsSource(code);
      const res = await this._submitAndWait({
        sourceCode,
        languageId,
        stdin: stdinJson,
        timeLimitMs,
      });

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
        break;
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


