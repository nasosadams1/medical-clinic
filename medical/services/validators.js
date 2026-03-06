// services/validators.js

function safeJsonParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, value: null };
  }
}

export function normalizeOutput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return s;

  if (s.startsWith("(") && s.endsWith(")")) {
    return `[${s.slice(1, -1)}]`;
  }

  if (/^-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?$/.test(s)) {
    const [a, b] = s.split(/\s+/);
    return `[${a},${b}]`;
  }

  if (/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(s)) {
    return `[${s}]`;
  }

  return s;
}

export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;

  if (aIsArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  const setB = new Set(keysB);
  for (const key of keysA) {
    if (!setB.has(key)) return false;
  }

  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonicalize(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function deepSortArray(value) {
  return [...value]
    .map((item) => canonicalize(item))
    .sort((left, right) => {
      const a = JSON.stringify(left);
      const b = JSON.stringify(right);
      return a.localeCompare(b);
    });
}

function parseActualJson(actualStdout) {
  const normalized = normalizeOutput(actualStdout);
  return safeJsonParse(normalized);
}

function twoSumValidator(actualStdout, inputJson) {
  const parsed = parseActualJson(actualStdout);
  if (!parsed.ok) {
    return { ok: false, reason: "Output is not valid JSON (expected [i,j])" };
  }

  const out = parsed.value;
  let i;
  let j;

  if (Array.isArray(out) && out.length === 2) {
    [i, j] = out;
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
  if (nums[i] + nums[j] !== target) return { ok: false, reason: "Indices do not sum to target" };

  return { ok: true, reason: "OK" };
}

function unorderedArrayValidator(actualStdout, inputJson) {
  const parsed = parseActualJson(actualStdout);
  if (!parsed.ok || !Array.isArray(parsed.value)) {
    return { ok: false, reason: "Output is not a valid array" };
  }

  const expected = inputJson?.expected;
  if (!Array.isArray(expected)) {
    return { ok: false, reason: "Expected array not provided" };
  }

  const actualSorted = deepSortArray(parsed.value);
  const expectedSorted = deepSortArray(expected);
  return {
    ok: deepEqual(actualSorted, expectedSorted),
    reason: deepEqual(actualSorted, expectedSorted) ? "OK" : "Arrays do not match",
  };
}

function intervalSetValidator(actualStdout, inputJson) {
  const parsed = parseActualJson(actualStdout);
  const expected = inputJson?.expected;
  if (!parsed.ok || !Array.isArray(parsed.value)) {
    return { ok: false, reason: "Output is not a valid interval array" };
  }
  if (!Array.isArray(expected)) {
    return { ok: false, reason: "Expected interval array not provided" };
  }

  const normalizeIntervals = (arr) =>
    arr
      .map((interval) => Array.isArray(interval) ? [interval[0], interval[1]] : interval)
      .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  const actualNormalized = normalizeIntervals(parsed.value);
  const expectedNormalized = normalizeIntervals(expected);
  return {
    ok: deepEqual(actualNormalized, expectedNormalized),
    reason: deepEqual(actualNormalized, expectedNormalized) ? "OK" : "Intervals do not match",
  };
}

function floatValidator(actualStdout, inputJson, defaultEpsilon = 1e-6) {
  const normalized = normalizeOutput(actualStdout);
  const actualValue = Number(normalized);
  const expected = inputJson?.expected;
  const epsilon = Number.isFinite(inputJson?.epsilon) ? inputJson.epsilon : defaultEpsilon;

  if (!Number.isFinite(actualValue)) return { ok: false, reason: "Output is not a valid number" };
  if (!Number.isFinite(expected)) return { ok: false, reason: "Expected number not provided" };

  const ok = Math.abs(actualValue - expected) <= epsilon;
  return { ok, reason: ok ? "OK" : `Expected ${expected} within ${epsilon}` };
}

function booleanValidator(actualStdout, inputJson) {
  const normalized = normalizeOutput(actualStdout).toLowerCase();
  const expected = !!inputJson?.expected;
  if (normalized !== "true" && normalized !== "false") {
    return { ok: false, reason: "Output must be true or false" };
  }
  const actual = normalized === "true";
  return { ok: actual === expected, reason: actual === expected ? "OK" : "Boolean mismatch" };
}

export const validators = {
  two_sum: twoSumValidator,
  unordered_array: unorderedArrayValidator,
  interval_set: intervalSetValidator,
  float: (actualStdout, inputJson) => floatValidator(actualStdout, inputJson),
  boolean: booleanValidator,
};
