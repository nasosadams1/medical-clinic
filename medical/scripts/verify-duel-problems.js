import { duelProblemCatalog, duelProblemCounts } from "../data/duel-problem-catalog.js";
import { JudgeService } from "../services/judge.js";
import { runInLocalJsSandbox } from "../services/local-runner.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIdentifier(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(value));
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function summarizeJudgeResult(result) {
  const firstFailure = Array.isArray(result?.testResults)
    ? result.testResults.find((test) => !test.passed) ?? null
    : null;

  return {
    result: result?.result ?? null,
    passed: result?.passed ?? null,
    total: result?.total ?? null,
    stderr: result?.stderr ?? "",
    firstFailure,
  };
}

function getProblemContract(problem) {
  const validators = new Set(
    (problem.test_cases || [])
      .map((testCase) => testCase?.validator)
      .filter(Boolean),
  );
  const compareModes = new Set(
    (problem.test_cases || [])
      .map((testCase) => testCase?.compare_mode)
      .filter(Boolean),
  );

  return { validators, compareModes };
}

function getNamedArgShape(sampleInput) {
  if (!isPlainObject(sampleInput)) return null;
  const keys = Object.keys(sampleInput);
  if (!keys.length || !keys.every(isIdentifier)) return null;
  return keys;
}

function getTransformKind(problem) {
  const contract = getProblemContract(problem);
  if (contract.validators.has("two_sum")) return "pair_object";
  if (contract.compareModes.has("interval_set")) return "reverse_intervals";
  return "identity";
}

async function evaluateJavascriptReference(problem, testCase) {
  const timeLimitMs = Math.min(
    5000,
    Math.max(2000, Number(testCase?.time_limit_ms ?? (problem?.time_limit_seconds ?? 2) * 1000)),
  );

  const execution = await runInLocalJsSandbox({
    userCode: problem.reference_solution_javascript,
    stdinJson: JSON.stringify(testCase?.input_json ?? null),
    timeLimitMs,
  });

  if (execution.timeout) {
    throw new Error(`${problem.title}: JS reference timed out while building verification cases`);
  }

  if (execution.exitCode !== 0) {
    throw new Error(
      `${problem.title}: JS reference failed while building verification cases (${execution.stderr || "unknown error"})`,
    );
  }

  const stdout = execution.stdout?.trim() || "null";

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      `${problem.title}: JS reference returned non-JSON output while building verification cases (${stdout})`,
    );
  }
}

async function buildVerificationLookup(problem) {
  const lookup = {};

  for (const testCase of problem.test_cases) {
    const key = stableJson(testCase?.input_json ?? null);
    lookup[key] = await evaluateJavascriptReference(problem, testCase);
  }

  return lookup;
}

function buildJsHelpers(lookup) {
  return `const CASES = ${JSON.stringify(lookup)};

function canon(value) {
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canon(item)).join(',') + ']';
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + canon(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function lookupCase(input) {
  return CASES[canon(input)];
}

function shapeResult(value) {
  return value;
}
`;
}

function buildJsTransformBody(transformKind) {
  switch (transformKind) {
    case "pair_object":
      return `function shapeResult(value) {
  return Array.isArray(value) && value.length === 2 ? { i: value[0], j: value[1] } : value;
}
`;
    case "reverse_intervals":
      return `function shapeResult(value) {
  return Array.isArray(value) ? [...value].reverse() : value;
}
`;
    default:
      return "";
  }
}

function buildJsLookupSolution(lookup, { entryStyle, sampleInput, transformKind }) {
  const namedKeys = getNamedArgShape(sampleInput);
  const useNamedArgs = entryStyle === "lexical_async_named" && Array.isArray(namedKeys);
  const signature = useNamedArgs ? namedKeys.join(", ") : "input";
  const callShape = useNamedArgs
    ? `{${namedKeys.map((key) => `${JSON.stringify(key)}:${key}`).join(",")}}`
    : "input";

  const helpers = buildJsHelpers(lookup);
  const transform = buildJsTransformBody(transformKind);
  const resultExpr = `shapeResult(lookupCase(${callShape}))`;

  if (entryStyle === "module_direct") {
    return `${helpers}${transform}module.exports = function (${signature}) {
  return ${resultExpr};
};
`;
  }

  if (entryStyle === "module_object_named") {
    return `${helpers}${transform}const solution = (${signature}) => ${resultExpr};
module.exports = { solution };
`;
  }

  return `${helpers}${transform}const solve = async (${signature}) => ${resultExpr};
`;
}

function buildPythonTransformBody(transformKind) {
  switch (transformKind) {
    case "pair_object":
      return `def _shape_result(value):
    if isinstance(value, list) and len(value) == 2:
        return {"i": value[0], "j": value[1]}
    return value
`;
    case "reverse_intervals":
      return `def _shape_result(value):
    if isinstance(value, list):
        return list(reversed(value))
    return value
`;
    default:
      return `def _shape_result(value):
    return value
`;
  }
}

function buildPythonLookupSolution(lookup, { entryName, sampleInput, transformKind }) {
  const lookupB64 = Buffer.from(JSON.stringify(lookup), "utf8").toString("base64");
  const namedKeys = getNamedArgShape(sampleInput);
  const useNamedArgs = entryName === "solve" && Array.isArray(namedKeys);
  const signature = useNamedArgs ? namedKeys.join(", ") : "input";
  const callShape = useNamedArgs
    ? `{${namedKeys.map((key) => `${JSON.stringify(key)}: ${key}`).join(", ")}}`
    : "input";

  return `import base64, json

_CASES = json.loads(base64.b64decode("${lookupB64}").decode("utf-8"))

def _canon(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))

${buildPythonTransformBody(transformKind)}
def ${entryName}(${signature}):
    return _shape_result(_CASES[_canon(${callShape})])
`;
}

function buildVariants(problem, lookup) {
  const sampleInput = problem.test_cases[0]?.input_json ?? null;
  const hasNamedArgs = Array.isArray(getNamedArgShape(sampleInput));
  const transformKind = getTransformKind(problem);

  return [
    {
      name: "javascript reference_solution",
      language: "javascript",
      code: problem.reference_solution_javascript,
    },
    {
      name: "javascript module.exports direct",
      language: "javascript",
      code: buildJsLookupSolution(lookup, {
        entryStyle: "module_direct",
        sampleInput,
        transformKind: "identity",
      }),
    },
    {
      name: hasNamedArgs
        ? `javascript async lexical solve(${getNamedArgShape(sampleInput).join(", ")})`
        : "javascript async lexical solve(input)",
      language: "javascript",
      code: buildJsLookupSolution(lookup, {
        entryStyle: "lexical_async_named",
        sampleInput,
        transformKind,
      }),
    },
    {
      name: hasNamedArgs
        ? `javascript module.exports named solution(${getNamedArgShape(sampleInput).join(", ")})`
        : "javascript module.exports solution(input)",
      language: "javascript",
      code: buildJsLookupSolution(lookup, {
        entryStyle: "module_object_named",
        sampleInput,
        transformKind,
      }),
    },
    {
      name: "python solution(input)",
      language: "python",
      code: buildPythonLookupSolution(lookup, {
        entryName: "solution",
        sampleInput: null,
        transformKind: "identity",
      }),
    },
    {
      name: hasNamedArgs
        ? `python solve(${getNamedArgShape(sampleInput).join(", ")})`
        : "python solve(input)",
      language: "python",
      code: buildPythonLookupSolution(lookup, {
        entryName: "solve",
        sampleInput,
        transformKind,
      }),
    },
  ];
}

async function verifyVariant(problem, judge, variant) {
  const result = await judge.executeCode(variant.code, variant.language, problem.test_cases);
  if (!(result.result === "Accepted" && result.passed === result.total)) {
    throw new Error(`${problem.title}: ${variant.name} failed ${JSON.stringify(summarizeJudgeResult(result))}`);
  }
}

async function verifyProblem(problem, judge) {
  const title = problem.title;
  const supportedLanguages = Array.isArray(problem.supported_languages)
    ? problem.supported_languages.map((value) => String(value).trim().toLowerCase())
    : [];

  assert(title, "Problem missing title");
  assert(Array.isArray(problem.test_cases) && problem.test_cases.length >= 5, `${title} must have at least 5 test cases`);
  assert(problem.reference_solution_javascript, `${title} missing JS reference solution`);
  assert(
    problem.difficulty === "easy" || problem.difficulty === "medium" || problem.difficulty === "hard",
    `${title} has invalid difficulty`,
  );
  assert(supportedLanguages.includes("javascript"), `${title} must support JavaScript`);
  assert(supportedLanguages.includes("python"), `${title} must support Python`);
  assert(problem.starter_code && typeof problem.starter_code === "object", `${title} missing starter code map`);
  assert(
    typeof problem.starter_code.javascript === "string" && problem.starter_code.javascript.trim(),
    `${title} missing JavaScript starter code`,
  );
  assert(
    typeof problem.starter_code.python === "string" && problem.starter_code.python.trim(),
    `${title} missing Python starter code`,
  );

  const lookup = await buildVerificationLookup(problem);
  const variants = buildVariants(problem, lookup);

  for (const variant of variants) {
    await verifyVariant(problem, judge, variant);
  }

  return variants.length;
}

async function main() {
  console.log("Verifying duel problem catalog with multiple correct solution variants...");
  assert(duelProblemCounts.total === 50, `Expected 50 problems, found ${duelProblemCounts.total}`);
  assert(duelProblemCounts.easy === 20, `Expected 20 easy problems, found ${duelProblemCounts.easy}`);
  assert(duelProblemCounts.medium === 20, `Expected 20 medium problems, found ${duelProblemCounts.medium}`);
  assert(duelProblemCounts.hard === 10, `Expected 10 hard problems, found ${duelProblemCounts.hard}`);

  const titles = new Set();
  const judge = new JudgeService();
  const failures = [];
  let totalVariants = 0;

  for (const [index, problem] of duelProblemCatalog.entries()) {
    try {
      assert(problem.title, `Problem ${index + 1} missing title`);
      assert(!titles.has(problem.title), `Duplicate title: ${problem.title}`);
      titles.add(problem.title);

      totalVariants += await verifyProblem(problem, judge);
    } catch (error) {
      failures.push({
        title: problem.title || `Problem ${index + 1}`,
        error: String(error?.message || error),
      });
    }
  }

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log("All duel problems verified successfully across multiple JavaScript and Python solution variants.");
  console.log(JSON.stringify({ ...duelProblemCounts, variantRuns: totalVariants }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
