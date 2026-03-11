export const STARTER_CODE = {
  javascript: "function solution(input) {\n  // Write your solution here\n}\n",
  python: "def solution(input):\n    # Write your solution here\n    return None\n",
};

export function buildStatement(problemStatement, inputFormat, outputFormat, constraintsText) {
  return [
    problemStatement,
    "",
    "Input Format",
    inputFormat,
    "",
    "Output Format",
    outputFormat,
    "",
    "Constraints",
    constraintsText,
  ].join("\n");
}

export function tc(input, expected, options = {}) {
  return {
    input_json: input,
    expected_json: expected,
    hidden: !!options.hidden,
    validator: options.validator ?? null,
    compare_mode: options.compareMode ?? null,
  };
}

function inferJudgeContract(testCases) {
  const validators = [...new Set((testCases || []).map((t) => t?.validator).filter(Boolean))];
  const compareModes = [...new Set((testCases || []).map((t) => t?.compare_mode).filter(Boolean))];

  if (validators.length) {
    return {
      mode: 'validator',
      validators,
      explicit: false,
    };
  }

  if (compareModes.length) {
    return {
      mode: 'compare_mode',
      compare_modes: compareModes,
      explicit: false,
    };
  }

  return {
    mode: 'exact_json',
    explicit: false,
  };
}

export function problem({
  title,
  scientist,
  shortStory,
  problemStatement,
  inputFormat,
  outputFormat,
  constraintsText,
  solutionExplanation,
  referenceSolutionJavascript,
  difficulty,
  tags,
  estimatedTimeMinutes,
  ratingWeight,
  timeLimitSeconds,
  testCases,
  judgeContract,
}) {
  return {
    title,
    short_story: `While reviewing ${scientist}'s lab notes, ${shortStory}`,
    problem_statement: problemStatement,
    input_format: inputFormat,
    output_format: outputFormat,
    constraints_text: constraintsText,
    solution_explanation: solutionExplanation,
    reference_solution_javascript: referenceSolutionJavascript.trim(),
    difficulty,
    tags,
    estimated_time_minutes: estimatedTimeMinutes,
    rating_weight: ratingWeight,
    time_limit_seconds: timeLimitSeconds,
    test_cases: testCases,
    judge_contract: judgeContract ?? inferJudgeContract(testCases),
    starter_code: STARTER_CODE,
    supported_languages: ["javascript", "python"],
    is_active: true,
    statement: buildStatement(problemStatement, inputFormat, outputFormat, constraintsText),
  };
}
