// services/validators.js
// Merged + hardened version of your two validator files.
// - Keeps the stricter deepEqual (recursive) from v1 (handles key order differences)
// - Keeps loose output normalization (tuple, "0 1", "0,1")
// - Supports: two_sum, unordered_array, float
// - Lets each test case optionally pass epsilon for float validator via inputJson.epsilon

function safeJsonParse(s) {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false, value: null };
  }
}

/**
 * Normalize common "loose" contestant outputs to JSON-friendly formats.
 * Examples:
 *  "(0, 1)"   -> "[0, 1]"
 *  "0 1"      -> "[0,1]"
 *  "0,1"      -> "[0,1]"
 * Leaves everything else as-is.
 */
function normalizeOutput(raw) {
  const s = (raw ?? "").toString().trim();
  if (!s) return s;

  // python tuple "(0, 1)" -> "[0, 1]"
  if (s.startsWith("(") && s.endsWith(")")) {
    return `[${s.slice(1, -1)}]`;
  }

  // "0 1" -> "[0,1]"
  if (/^-?\d+\s+-?\d+$/.test(s)) {
    const [a, b] = s.split(/\s+/);
    return `[${a},${b}]`;
  }

  // "0,1" or "0, 1" -> "[0,1]"
  if (/^-?\d+\s*,\s*-?\d+$/.test(s)) {
    return `[${s}]`;
  }

  return s;
}

/**
 * Deep equality:
 * - Handles arrays + objects recursively
 * - Ignores key order (unlike JSON.stringify)
 */
export function deepEqual(a, b) {
  // Handles primitives + NaN + -0 properly
  if (Object.is(a, b)) return true;

  // null/undefined
  if (a == null || b == null) return false;

  // Different types -> not equal
  if (typeof a !== typeof b) return false;

  // If either is not an object (and Object.is already failed), not equal
  if (typeof a !== "object") return false;

  // Arrays vs non-arrays mismatch
  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr !== bIsArr) return false;

  // Arrays
  if (aIsArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Plain objects (including Object.create(null))
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  // Key set compare
  const setB = new Set(keysB);
  for (const k of keysA) {
    if (!setB.has(k)) return false;
  }

  // Value compare
  for (const k of keysA) {
    if (!deepEqual(a[k], b[k])) return false;
  }

  return true;
}

/**
 * two_sum validator:
 * Accepts output formats:
 *  - [i, j]
 *  - {"i": i, "j": j}
 * and also loose text like "(0, 1)" or "0 1" or "0,1".
 */
function twoSumValidator(actualStdout, inputJson) {
  const normalized = normalizeOutput(actualStdout);
  const parsed = safeJsonParse(normalized);

  if (!parsed.ok) {
    return { ok: false, reason: "Output is not valid JSON (expected [i,j])" };
  }

  const out = parsed.value;
  let i, j;

  if (Array.isArray(out) && out.length === 2) {
    i = out[0];
    j = out[1];
  } else if (
    out &&
    typeof out === "object" &&
    Number.isInteger(out.i) &&
    Number.isInteger(out.j)
  ) {
    i = out.i;
    j = out.j;
  } else {
    return { ok: false, reason: "Output must be [i,j] or {i,j}" };
  }

  const nums = inputJson?.nums;
  const target = inputJson?.target;

  if (!Array.isArray(nums) || !Number.isFinite(target)) {
    return { ok: false, reason: "Bad input_json" };
  }

  if (!Number.isInteger(i) || !Number.isInteger(j)) {
    return { ok: false, reason: "Indices must be integers" };
  }

  if (i === j) {
    return { ok: false, reason: "Indices must be different" };
  }

  if (i < 0 || j < 0 || i >= nums.length || j >= nums.length) {
    return { ok: false, reason: "Index out of bounds" };
  }

  if (nums[i] + nums[j] !== target) {
    return {
      ok: false,
      reason: `nums[${i}] + nums[${j}] = ${nums[i] + nums[j]}, expected ${target}`,
    };
  }

  return { ok: true, reason: "OK" };
}

/**
 * unordered_array validator:
 * Expects output as a JSON array. Compares to inputJson.expected ignoring order.
 * NOTE: sorting uses default JS sort (string-based). If you want numeric sort, see comment below.
 */
function unorderedArrayValidator(actualStdout, inputJson) {
  const normalized = normalizeOutput(actualStdout);
  const parsed = safeJsonParse(normalized);

  if (!parsed.ok || !Array.isArray(parsed.value)) {
    return { ok: false, reason: "Output is not a valid array" };
  }

  const actual = parsed.value;
  const expected = inputJson?.expected;

  if (!Array.isArray(expected)) {
    return { ok: false, reason: "Expected output not provided" };
  }

  if (actual.length !== expected.length) {
    return {
      ok: false,
      reason: `Length mismatch: got ${actual.length}, expected ${expected.length}`,
    };
  }

  // If you expect numbers only, prefer:
  // const sortedActual = [...actual].sort((x,y)=>x-y);
  // const sortedExpected = [...expected].sort((x,y)=>x-y);
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();

  if (!deepEqual(sortedActual, sortedExpected)) {
    return { ok: false, reason: "Arrays don't match (order-independent comparison)" };
  }

  return { ok: true, reason: "OK" };
}

/**
 * float validator:
 * Parses stdout as a number; compares against inputJson.expected within epsilon.
 * Epsilon can be overridden per test with inputJson.epsilon.
 */
function floatValidator(actualStdout, inputJson, defaultEpsilon = 1e-6) {
  const normalized = normalizeOutput(actualStdout);
  const actualValue = parseFloat(normalized);

  if (!Number.isFinite(actualValue)) {
    return { ok: false, reason: "Output is not a valid number" };
  }

  const expected = inputJson?.expected;
  if (!Number.isFinite(expected)) {
    return { ok: false, reason: "Expected value not provided" };
  }

  const epsilon = Number.isFinite(inputJson?.epsilon) ? inputJson.epsilon : defaultEpsilon;

  if (Math.abs(actualValue - expected) > epsilon) {
    return {
      ok: false,
      reason: `Value ${actualValue} differs from expected ${expected} (epsilon ${epsilon})`,
    };
  }

  return { ok: true, reason: "OK" };
}

// Validator registry
export const validators = {
  two_sum: twoSumValidator,
  unordered_array: unorderedArrayValidator,
  float: (actualStdout, inputJson) => floatValidator(actualStdout, inputJson),
};