import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const LESSON_REWARD_BANDS = {
  Beginner: {
    baseXp: [26, 42],
    baselineTime: [2, 3],
  },
  Intermediate: {
    baseXp: [42, 62],
    baselineTime: [3, 4],
  },
  Advanced: {
    baseXp: [62, 86],
    baselineTime: [4, 5],
  },
};

const PYTHON_TIER_SCHEDULE = {
  beginnerCount: 17,
  intermediateCount: 16,
};

const interpolate = (start, end, progress) => start + (end - start) * progress;
const roundToHalfMinute = (value) => Math.round(value * 2) / 2;

const getDifficultyByIndex = (index) => {
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount) return 'Beginner';
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount + PYTHON_TIER_SCHEDULE.intermediateCount) return 'Intermediate';
  return 'Advanced';
};

const buildRewardMeta = (difficulty, position, count) => {
  const rewardBand = LESSON_REWARD_BANDS[difficulty];
  const normalizedProgress = count <= 1 ? 0 : position / (count - 1);

  return {
    baseXP: Math.round(interpolate(rewardBand.baseXp[0], rewardBand.baseXp[1], normalizedProgress)),
    baselineTime: roundToHalfMinute(
      interpolate(rewardBand.baselineTime[0], rewardBand.baselineTime[1], normalizedProgress)
    ),
  };
};

const lesson = (spec) => spec;
const example = (content, code, explanation = content) => ({ content, code, explanation });

const makePredictQuestion = (questionSpec, index) => ({
  question: questionSpec.prompt
    ? `Q${index} (${questionSpec.label || 'Predict Output'})\n\n${questionSpec.prompt}\n\n${questionSpec.code}`
    : `Q${index} (${questionSpec.label || 'Predict Output'})\n\n${questionSpec.code}`,
  options: questionSpec.options,
  correctAnswer: questionSpec.correctAnswer,
  explanation: questionSpec.explanation,
  type: 'question',
  questionKind: questionSpec.questionKind || 'predict-output',
});

const makePracticeStep = (practice, lessonId) => ({
  title: 'Q1',
  content: practice.task,
  code: practice.code,
  explanation: practice.coachNote || practice.task,
  type: 'practice',
  evaluationMode: practice.testCases ? 'execution' : 'static',
  evaluationId: practice.testCases ? lessonId : undefined,
  validationMode: 'includes_all',
  requiredSnippets: practice.requiredSnippets || [],
  edgeCaseSnippets: practice.edgeCaseSnippets || [],
  qualitySignals: practice.qualitySignals || [],
  efficiencySignals: practice.efficiencySignals || [],
  forbiddenPatterns: practice.forbiddenPatterns || [],
  starterCode: practice.starterCode || '',
  practiceBrief: {
    task: practice.task,
    inputs: practice.inputs || [],
    requirements: practice.requirements || [],
    expectedOutput: practice.expectedOutput || [],
    outputDescription: practice.outputDescription || '',
    coachNote: practice.coachNote || '',
  },
});

const makeTheoryStep = (item, index) => ({
  title: `Example ${index + 1}`,
  content: item.content,
  code: item.code,
  explanation: item.explanation || item.content,
  type: 'theory',
  practiceMode: 'none',
  stepKind: 'example',
});

const buildEvaluationBankEntry = (lessonSpec) => {
  if (!lessonSpec.practice?.testCases) return null;

  return {
    language: 'javascript',
    requiredSnippets: lessonSpec.practice.requiredSnippets || [],
    forbiddenPatterns: lessonSpec.practice.forbiddenPatterns || [],
    testCases: lessonSpec.practice.testCases,
  };
};

const lessons = [
  lesson({
    id: 'javascript-where-to-1',
    title: 'What JavaScript Is and Where It Runs',
    description: 'Connect JavaScript to the browser, Node.js, and the idea of code running inside a host environment.',
    category: 'Foundations',
    examples: [
      example(
        'JavaScript runs inside hosts such as browsers and Node.js.',
        `console.log("browser or Node");`
      ),
      example(
        'The language stays the same, but the available APIs change with the environment.',
        `// Browser example
document.querySelector("#app");

// Node example
require("fs").readFileSync(0, "utf8");`
      ),
      example(
        'Production JavaScript is mostly about data, events, and effects.',
        `const user = { name: "Ava" };
console.log(user.name);`
      ),
    ],
    practice: {
      task: 'Create an array named runtimes with "browser" and "node", then print them joined with " & ".',
      code: `const runtimes = ["browser", "node"];
console.log(runtimes.join(" & "));`,
      requiredSnippets: ['const runtimes', '["browser", "node"]', 'console.log'],
      expectedOutput: ['browser & node'],
      requirements: ['Use one array to hold both runtime names.', 'Print one final line.'],
      coachNote: 'This lesson is about the idea of runtime environments, not DOM or file APIs yet.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'browser & node',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const place = "browser";
console.log(place);`,
      options: ['browser', '"browser"', 'place', 'Nothing'],
      correctAnswer: 0,
      explanation: 'console.log prints the string value, not the variable name or quotes.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const browser = "Browser";
console.log(node);`,
      options: ['Browser', 'node', 'ReferenceError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'node was never declared, so JavaScript throws a ReferenceError at runtime.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-introduction-1',
    title: 'Your First JavaScript Program',
    description: 'Write a tiny program, run it, and connect source code to visible output.',
    category: 'Foundations',
    examples: [
      example(
        'A first program often starts with one clear output line.',
        `console.log("Hello, JavaScript!");`
      ),
      example(
        'Programs run top to bottom unless control flow changes that order.',
        `console.log("start");
console.log("finish");`
      ),
      example(
        'Runtime output is the fastest way to confirm what your code actually did.',
        `console.log("debug:", 42);`
      ),
    ],
    practice: {
      task: 'Print Hello, JavaScript! exactly once.',
      code: `console.log("Hello, JavaScript!");`,
      requiredSnippets: ['console.log', '"Hello, JavaScript!"'],
      expectedOutput: ['Hello, JavaScript!'],
      requirements: ['Use console.log.', 'Print the text exactly once.'],
      coachNote: 'The first production-ready habit is precision: exact text, no extra output.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'Hello, JavaScript!',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `console.log("A");
console.log("B");`,
      options: ['AB', 'A then B on separate lines', '"A" "B"', 'Nothing'],
      correctAnswer: 1,
      explanation: 'Each console.log call prints its own line.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `console.log("Hello, JavaScript!")`,
      options: ['Works in JavaScript', 'SyntaxError', 'ReferenceError', 'Prints nothing'],
      correctAnswer: 0,
      explanation: 'Unlike some languages, JavaScript does not require a semicolon for this line to run.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-variables-1',
    title: 'Variables and Values',
    description: 'Store values in named bindings and update them intentionally.',
    category: 'Foundations',
    examples: [
      example(
        'Variables give a value a readable name.',
        `const language = "JavaScript";
let lessons = 50;`
      ),
      example(
        'Use const for values that should not be reassigned.',
        `const theme = "dark";`
      ),
      example(
        'Use let when the binding will change later.',
        `let score = 10;
score = score + 5;`
      ),
    ],
    practice: {
      task: 'Create a const named course with "JavaScript" and a let named lessons with 50, then print "JavaScript: 50".',
      code: `const course = "JavaScript";
let lessons = 50;
console.log(\`\${course}: \${lessons}\`);`,
      requiredSnippets: ['const course', 'let lessons', 'console.log'],
      expectedOutput: ['JavaScript: 50'],
      requirements: ['Use the exact variable names course and lessons.', 'Print one final line.'],
      coachNote: 'Choose bindings based on intent: stable values get const, changing values get let.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'JavaScript: 50',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `let points = 3;
points = points + 2;
console.log(points);`,
      options: ['3', '5', '32', 'Error'],
      correctAnswer: 1,
      explanation: 'points is updated before it is logged, so the final value is 5.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const score = 10;
score = 11;`,
      options: ['Valid update', 'ReferenceError', 'TypeError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'Reassigning a const binding throws a TypeError at runtime.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-datatypes-1',
    title: 'Primitive Data Types',
    description: 'Recognize strings, numbers, booleans, undefined, and null as the core primitive building blocks.',
    category: 'Foundations',
    examples: [
      example(
        'Strings, numbers, and booleans are the primitives you use constantly.',
        `const name = "Ava";
const age = 19;
const isReady = true;`
      ),
      example(
        'undefined means no value has been assigned yet.',
        `let total;
console.log(total);`
      ),
      example(
        'null is an intentional empty value.',
        `const selectedUser = null;`
      ),
    ],
    practice: {
      task: 'Create variables named title, count, and isOpen with a string, number, and boolean value, then print their typeof results in order.',
      code: `const title = "Dashboard";
const count = 3;
const isOpen = false;

console.log(typeof title);
console.log(typeof count);
console.log(typeof isOpen);`,
      requiredSnippets: ['const title', 'const count', 'const isOpen', 'typeof'],
      expectedOutput: ['string', 'number', 'boolean'],
      requirements: ['Use one string, one number, and one boolean.', 'Print three typeof results.'],
      coachNote: 'This lesson is about reading data correctly before you manipulate it.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'string\nnumber\nboolean',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `console.log(typeof null);`,
      options: ['null', 'undefined', 'object', 'boolean'],
      correctAnswer: 2,
      explanation: 'typeof null is "object" for historical reasons, even though null is a primitive value.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `let state;
console.log(state === undefined);`,
      options: ['false', 'true', 'null', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'A declared but unassigned variable starts as undefined.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-operators-1',
    title: 'Operators and Expressions',
    description: 'Combine values with arithmetic, assignment, and comparison operators to build useful expressions.',
    category: 'Foundations',
    examples: [
      example(
        'Operators combine values into expressions.',
        `const total = 4 + 3 * 2;`
      ),
      example(
        'Assignment stores the result of an expression.',
        `let score = 10;
score += 5;`
      ),
      example(
        'Parentheses make precedence explicit and readable.',
        `const result = (4 + 3) * 2;`
      ),
    ],
    practice: {
      task: 'Compute (6 + 4) * 2 and print the result.',
      code: `const result = (6 + 4) * 2;
console.log(result);`,
      requiredSnippets: ['(6 + 4) * 2', 'console.log'],
      expectedOutput: ['20'],
      requirements: ['Use parentheses to show precedence intentionally.', 'Print one line.'],
      coachNote: 'Production code favors clarity over “the engine will figure it out” expressions.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '20',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `console.log(10 - 3 * 2);`,
      options: ['14', '4', '7', '20'],
      correctAnswer: 1,
      explanation: 'Multiplication runs before subtraction, so the expression becomes 10 - 6.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `let total = 5;
total =+ 2;
console.log(total);`,
      options: ['7', '2', '52', 'SyntaxError'],
      correctAnswer: 1,
      explanation: '=+ sets total to positive 2. It is different from +=.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-strings-1',
    title: 'Strings and Template Literals',
    description: 'Build readable text with concatenation, interpolation, and string methods.',
    category: 'Foundations',
    examples: [
      example(
        'Strings hold text.',
        `const message = "Hello";`
      ),
      example(
        'Template literals interpolate values directly into text.',
        'const name = "Mia";\nconsole.log(`Hello, ${name}`);'
      ),
      example(
        'String methods help you inspect or transform text.',
        `const label = "hello";
console.log(label.toUpperCase());`
      ),
    ],
    practice: {
      task: 'Create name = "Ava" and score = 7, then print "Ava scored 7" using a template literal.',
      code: `const name = "Ava";
const score = 7;
console.log(\`\${name} scored \${score}\`);`,
      requiredSnippets: ['const name', 'const score', '`${name} scored ${score}`', 'console.log'],
      expectedOutput: ['Ava scored 7'],
      requirements: ['Use a template literal, not string concatenation.', 'Print the full sentence once.'],
      coachNote: 'Template literals scale better when real UIs need readable dynamic text.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'Ava scored 7',
          hidden: false,
        },
      ],
    },
    predict: {
      code: 'const lang = "JS";\nconsole.log(`${lang} rocks`);',
      options: ['lang rocks', 'JS rocks', '`JS rocks`', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'The template literal inserts the value of lang into the string.',
    },
    mistake: {
      label: 'Common Mistake',
      code: 'const name = "Ava";\nconsole.log("${name}");',
      options: ['Ava', '${name}', 'name', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'Interpolation only happens inside backticks, not normal quotes.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-numbers-1',
    title: 'Numbers, Math, and Type Conversion',
    description: 'Work with numeric values, Math helpers, and explicit conversion to avoid hidden coercion.',
    category: 'Foundations',
    examples: [
      example(
        'JavaScript numbers cover integers and decimals.',
        `const price = 19.95;
const tax = 2.5;`
      ),
      example(
        'Math gives you helpers for rounding and other calculations.',
        `console.log(Math.round(4.6));`
      ),
      example(
        'Explicit conversion is safer than relying on coercion.',
        `const raw = "42";
const total = Number(raw);`
      ),
    ],
    practice: {
      task: 'Convert the string "42.5" to a number, round it, and print the rounded result.',
      code: `const raw = "42.5";
const value = Number(raw);
console.log(Math.round(value));`,
      requiredSnippets: ['Number(raw)', 'Math.round', 'console.log'],
      expectedOutput: ['43'],
      requirements: ['Convert with Number.', 'Round after converting.'],
      coachNote: 'Strong JavaScript code makes type conversion obvious instead of accidental.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '43',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `console.log(Number("8") + 2);`,
      options: ['82', '10', '"10"', 'NaN'],
      correctAnswer: 1,
      explanation: 'Number("8") becomes the numeric value 8, so the result is 10.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `console.log("8" + 2);`,
      options: ['10', '82', 'NaN', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'The + operator concatenates when one side is a string, so the result becomes "82".',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-comparisons-1',
    title: 'Booleans and Comparisons',
    description: 'Use comparison operators and boolean logic to express decisions clearly.',
    category: 'Foundations',
    examples: [
      example(
        'Comparisons produce boolean values.',
        `console.log(7 > 3);`
      ),
      example(
        'Logical operators combine comparisons.',
        `console.log(7 > 3 && 2 === 2);`
      ),
      example(
        'Strict equality avoids accidental type coercion.',
        `console.log(3 === "3");`
      ),
    ],
    practice: {
      task: 'Print the result of 7 > 3 && 2 === 2.',
      code: `console.log(7 > 3 && 2 === 2);`,
      requiredSnippets: ['7 > 3', '2 === 2', '&&', 'console.log'],
      expectedOutput: ['true'],
      requirements: ['Use strict equality.', 'Print one boolean result.'],
      coachNote: 'In production code, prefer boolean expressions you can explain in plain English.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'true',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `console.log(5 === "5");`,
      options: ['true', 'false', '5', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'Strict equality checks both value and type.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `console.log(!false);`,
      options: ['false', 'true', '0', 'Error'],
      correctAnswer: 1,
      explanation: '!false becomes true.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-if-else-1',
    title: 'Conditional Logic with if, else, and switch',
    description: 'Choose the correct branch with comparisons, if/else flow, and simple switch-based dispatch.',
    category: 'Foundations',
    examples: [
      example(
        'if runs a block only when the condition is true.',
        `if (score >= 60) {
  console.log("Pass");
}`
      ),
      example(
        'else handles the fallback path cleanly.',
        `if (isReady) {
  console.log("Go");
} else {
  console.log("Wait");
}`
      ),
      example(
        'switch helps when one value chooses among a few named cases.',
        `switch (role) {
  case "admin":
    console.log("Full access");
    break;
  default:
    console.log("Standard access");
}`
      ),
    ],
    practice: {
      task: 'Read one number from standard input. Print Pass if it is at least 60, otherwise print Retry.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const score = Number(input);

if (score >= 60) {
  console.log("Pass");
} else {
  console.log("Retry");
}`,
      requiredSnippets: ['readFileSync', 'if (score >= 60)', 'else', 'console.log'],
      expectedOutput: ['Pass'],
      inputs: ['One number from standard input.'],
      requirements: ['Convert the input to a number.', 'Use if/else for the final branch.'],
      coachNote: 'Branching logic should read like a clear rule, not a puzzle.',
      testCases: [
        {
          label: 'Public passing score',
          stdin_text: '75\n',
          expected_output: 'Pass',
          hidden: false,
        },
        {
          label: 'Hidden boundary score',
          stdin_text: '60\n',
          expected_output: 'Pass',
          hidden: true,
        },
        {
          label: 'Hidden retry score',
          stdin_text: '52\n',
          expected_output: 'Retry',
          hidden: true,
        },
      ],
    },
    predict: {
      prompt: 'Assume role is "admin".',
      code: `switch (role) {
  case "admin":
    console.log("Full");
    break;
  default:
    console.log("Basic");
}`,
      options: ['Basic', 'Full', 'admin', 'Nothing'],
      correctAnswer: 1,
      explanation: 'The admin case matches first and prints Full.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `if (5 = 5) {
  console.log("same");
}`,
      options: ['Prints same', 'SyntaxError', 'ReferenceError', 'TypeError'],
      correctAnswer: 1,
      explanation: 'Assignments are not allowed in that comparison position here, so the parser throws a syntax error.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-arithmetic-1',
    title: 'Project 1: Build a Simple JavaScript Calculator',
    description: 'Combine input parsing, branching, and arithmetic into a small reusable command-line calculator.',
    category: 'Foundations',
    projectBrief: {
      goal: 'Build a tiny calculator that reads two numbers and an operator, then prints the result.',
      inputs: ['A line like "6 + 4" from standard input.'],
      outputs: ['One computed result or a helpful error line.'],
      skills: ['input parsing', 'Number conversion', 'conditional logic', 'clear output'],
    },
    examples: [
      example(
        'Small projects are where single concepts start working together.',
        `const parts = "6 + 4".split(" ");`
      ),
      example(
        'You often parse first, then branch on an operator.',
        `if (op === "+") {
  console.log(a + b);
}`
      ),
      example(
        'A tiny project still benefits from clear error handling.',
        `console.log("Unsupported operator");`
      ),
    ],
    practice: {
      task: 'Read a line in the form "number operator number". Support +, -, *, and /. Print the computed result.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const [left, op, right] = input.split(/\\s+/);
const a = Number(left);
const b = Number(right);

if (op === "+") {
  console.log(a + b);
} else if (op === "-") {
  console.log(a - b);
} else if (op === "*") {
  console.log(a * b);
} else if (op === "/") {
  console.log(a / b);
} else {
  console.log("Unsupported operator");
}`,
      requiredSnippets: ['readFileSync', 'input.split', 'Number(left)', 'if (op === "+")'],
      expectedOutput: ['10'],
      inputs: ['A line such as "6 + 4".'],
      requirements: ['Parse three pieces from the input line.', 'Support the four listed operators.'],
      coachNote: 'This is the first lesson where tiny product habits matter: parse clearly, branch clearly, print one final answer.',
      testCases: [
        {
          label: 'Public addition',
          stdin_text: '6 + 4\n',
          expected_output: '10',
          hidden: false,
        },
        {
          label: 'Hidden multiplication',
          stdin_text: '7 * 3\n',
          expected_output: '21',
          hidden: true,
        },
        {
          label: 'Hidden division',
          stdin_text: '8 / 2\n',
          expected_output: '4',
          hidden: true,
        },
      ],
    },
    predict: {
      prompt: 'Assume the input line is "9 - 2".',
      code: `const [left, op, right] = input.split(/\\s+/);
console.log(Number(left) - Number(right));`,
      options: ['7', '92', '11', 'NaN'],
      correctAnswer: 0,
      explanation: 'Both sides are converted to numbers before subtraction.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const [left, op, right] = "6 + 4".split(/\\s+/);
console.log(left + right);`,
      options: ['10', '64', 'NaN', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'Without Number conversion, strings concatenate instead of adding.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-loop-for-1',
    title: 'Loops: for, while, and do...while',
    description: 'Repeat work with the right loop shape and stop conditions.',
    category: 'Core Logic',
    examples: [
      example(
        'for is strong when you know the counter pattern.',
        `for (let i = 1; i <= 3; i += 1) {
  console.log(i);
}`
      ),
      example(
        'while fits “keep going until this condition changes”.',
        `let count = 3;
while (count > 0) {
  console.log(count);
  count -= 1;
}`
      ),
      example(
        'do...while guarantees one run before checking the condition.',
        `let tries = 0;
do {
  tries += 1;
} while (tries < 1);`
      ),
    ],
    practice: {
      task: 'Read n from standard input and print the numbers 1 through n, one per line.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const n = Number(input);

for (let i = 1; i <= n; i += 1) {
  console.log(i);
}`,
      requiredSnippets: ['readFileSync', 'for (let i = 1;', 'i <= n', 'console.log(i)'],
      expectedOutput: ['1', '2', '3'],
      inputs: ['One whole number n from standard input.'],
      requirements: ['Start at 1.', 'Print each value on its own line.', 'Stop at n.'],
      coachNote: 'A good loop states three things clearly: start, stop, and step.',
      testCases: [
        {
          label: 'Public loop',
          stdin_text: '3\n',
          expected_output: '1\n2\n3',
          hidden: false,
        },
        {
          label: 'Hidden zero loop',
          stdin_text: '0\n',
          expected_output: '',
          hidden: true,
        },
        {
          label: 'Hidden longer loop',
          stdin_text: '5\n',
          expected_output: '1\n2\n3\n4\n5',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `for (let i = 0; i < 3; i += 1) {
  console.log(i);
}`,
      options: ['0 1 2', '1 2 3', '0 1 2 3', '3 2 1'],
      correctAnswer: 0,
      explanation: 'The loop starts at 0 and stops before 3.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `let i = 0;
while (i < 3) {
  console.log(i);
}`,
      options: ['0 1 2', 'Nothing', 'Infinite loop', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'i never changes, so the condition stays true forever.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-functions-1',
    title: 'Functions: Inputs, Outputs, and Reuse',
    description: 'Wrap repeatable logic in functions with parameters and return values.',
    category: 'Core Logic',
    examples: [
      example(
        'Functions let you name reusable logic.',
        `function square(n) {
  return n * n;
}`
      ),
      example(
        'Parameters are the function inputs.',
        `function greet(name) {
  return \`Hello, \${name}\`;
}`
      ),
      example(
        'Return values let the caller keep using the result.',
        `const value = square(5);`
      ),
    ],
    practice: {
      task: 'Write a function named square that returns n * n, then print square(5).',
      code: `function square(n) {
  return n * n;
}

console.log(square(5));`,
      requiredSnippets: ['function square(n)', 'return n * n', 'square(5)', 'console.log'],
      expectedOutput: ['25'],
      requirements: ['Use a named function.', 'Return the value instead of logging inside the function.'],
      coachNote: 'A clean function separates computation from the code that displays the answer.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '25',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `function add(a, b) {
  return a + b;
}

console.log(add(2, 3));`,
      options: ['5', '23', 'undefined', 'Error'],
      correctAnswer: 0,
      explanation: 'The function returns the computed sum, which console.log prints.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `function double(n) {
  n * 2;
}

console.log(double(4));`,
      options: ['8', '4', 'undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'Without return, the function result is undefined.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-function-arrows-1',
    title: 'Function Expressions and Arrow Functions',
    description: 'Choose between named functions, function expressions, and arrow functions based on context and readability.',
    category: 'Core Logic',
    examples: [
      example(
        'Functions can be stored in variables.',
        `const triple = function (n) {
  return n * 3;
};`
      ),
      example(
        'Arrow functions are concise for many small cases.',
        `const double = (n) => n * 2;`
      ),
      example(
        'Shorter syntax is useful only when the meaning stays clear.',
        `const format = (name) => \`User: \${name}\`;`
      ),
    ],
    practice: {
      task: 'Create an arrow function named double that returns n * 2, then print double(6).',
      code: `const double = (n) => n * 2;

console.log(double(6));`,
      requiredSnippets: ['const double', '(n) => n * 2', 'double(6)'],
      expectedOutput: ['12'],
      requirements: ['Use an arrow function.', 'Return the value directly.'],
      coachNote: 'Choose arrow functions when the shorter form makes the intent faster to scan.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '12',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const greet = (name) => \`Hi, \${name}\`;
console.log(greet("Mia"));`,
      options: ['Hi, Mia', 'Mia', 'undefined', 'Error'],
      correctAnswer: 0,
      explanation: 'The arrow function returns the formatted string, which is then logged.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const add = (a, b) => {
  a + b;
};

console.log(add(2, 3));`,
      options: ['5', '23', 'undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'With braces, an arrow function still needs an explicit return.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-let-1',
    title: 'Scope: Global, Function, and Block',
    description: 'Understand where a binding is visible and why block scope prevents accidental leaks.',
    category: 'Core Logic',
    examples: [
      example(
        'Global bindings are visible far too widely when overused.',
        `let appState = "idle";`
      ),
      example(
        'Function scope keeps internal details local.',
        `function show() {
  const message = "local";
  console.log(message);
}`
      ),
      example(
        'Block scope with let and const prevents values from leaking out of an if or loop.',
        `if (true) {
  const label = "inside";
}`
      ),
    ],
    practice: {
      task: 'Create a function named labelScore that uses a block-scoped const named label inside an if/else, then prints the returned label for 82.',
      code: `function labelScore(score) {
  let result = "";

  if (score >= 80) {
    const label = "strong";
    result = label;
  } else {
    const label = "growing";
    result = label;
  }

  return result;
}

console.log(labelScore(82));`,
      requiredSnippets: ['function labelScore', 'if (score >= 80)', 'const label', 'return result'],
      expectedOutput: ['strong'],
      requirements: ['Use a block-scoped const inside the branch.', 'Return the final result from the function.'],
      coachNote: 'Scope is about containment. Good code limits where each name can be touched.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'strong',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `if (true) {
  let count = 3;
}

console.log(typeof count);`,
      options: ['number', 'undefined', 'ReferenceError', '3'],
      correctAnswer: 1,
      explanation: 'typeof on an undeclared identifier returns "undefined" instead of throwing.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `if (true) {
  const mode = "dark";
}

console.log(mode);`,
      options: ['dark', 'undefined', 'ReferenceError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'mode only exists inside the block, so using it outside throws a ReferenceError.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-arrays-1',
    title: 'Arrays: Creating, Reading, and Updating',
    description: 'Store ordered collections, access by index, and update items deliberately.',
    category: 'Core Logic',
    examples: [
      example(
        'Arrays keep ordered values together.',
        `const colors = ["red", "blue", "green"];`
      ),
      example(
        'Indexes start at 0.',
        `console.log(colors[0]);`
      ),
      example(
        'Array items can be updated by index.',
        `colors[1] = "purple";`
      ),
    ],
    practice: {
      task: 'Create an array named values with 10, 20, and 30. Change the second item to 25 and print the whole array joined by commas.',
      code: `const values = [10, 20, 30];
values[1] = 25;
console.log(values.join(","));`,
      requiredSnippets: ['const values', '[10, 20, 30]', 'values[1] = 25', 'join(",")'],
      expectedOutput: ['10,25,30'],
      requirements: ['Use index-based update.', 'Print the final array with join(",").'],
      coachNote: 'Arrays are simplest when you know what position means and keep updates obvious.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '10,25,30',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const names = ["Ava", "Mia"];
console.log(names[1]);`,
      options: ['Ava', 'Mia', 'undefined', '2'],
      correctAnswer: 1,
      explanation: 'Index 1 is the second array item.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const names = ["Ava", "Mia"];
console.log(names[2]);`,
      options: ['Mia', 'null', 'undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'Reading past the end of an array gives undefined.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-array-methods-1',
    title: 'Array Methods Every Beginner Needs',
    description: 'Use push, pop, shift, unshift, includes, and join to handle common collection tasks.',
    category: 'Core Logic',
    examples: [
      example(
        'push adds to the end of an array.',
        `const queue = ["A"];
queue.push("B");`
      ),
      example(
        'pop removes from the end and returns the removed item.',
        `const last = queue.pop();`
      ),
      example(
        'join turns array items into a readable string.',
        `console.log(queue.join(", "));`
      ),
    ],
    practice: {
      task: 'Start with ["JS"], push "DOM" and "API", then print the array joined by " / ".',
      code: `const topics = ["JS"];
topics.push("DOM");
topics.push("API");
console.log(topics.join(" / "));`,
      requiredSnippets: ['topics.push("DOM")', 'topics.push("API")', 'join(" / ")'],
      expectedOutput: ['JS / DOM / API'],
      requirements: ['Use push twice.', 'Print the final joined string once.'],
      coachNote: 'Beginner array methods should feel like precise tools, not magic.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'JS / DOM / API',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const items = ["a", "b"];
items.pop();
console.log(items.join(","));`,
      options: ['a,b', 'a', 'b', 'undefined'],
      correctAnswer: 1,
      explanation: 'pop removes the last item, so only "a" remains.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `const items = ["a", "b"];
console.log(items.includes("c"));`,
      options: ['true', 'false', 'c', 'Error'],
      correctAnswer: 1,
      explanation: 'includes returns false when the value is not present.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-objects-1',
    title: 'Objects: Keys, Values, and Dot Notation',
    description: 'Model named data with object literals and access values predictably.',
    category: 'Core Logic',
    examples: [
      example(
        'Objects group related values under named keys.',
        `const user = {
  name: "Ava",
  level: 3
};`
      ),
      example(
        'Dot notation reads a known property.',
        `console.log(user.name);`
      ),
      example(
        'Object values can be updated just like variables.',
        `user.level = 4;`
      ),
    ],
    practice: {
      task: 'Create an object named user with name "Ava" and role "admin", then print user.role.',
      code: `const user = {
  name: "Ava",
  role: "admin",
};

console.log(user.role);`,
      requiredSnippets: ['const user', 'name: "Ava"', 'role: "admin"', 'user.role'],
      expectedOutput: ['admin'],
      requirements: ['Use an object literal.', 'Print one property with dot notation.'],
      coachNote: 'Objects are for meaning. Choose keys that make the shape readable without extra comments.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'admin',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const box = { count: 2 };
console.log(box.count);`,
      options: ['box', 'count', '2', 'undefined'],
      correctAnswer: 2,
      explanation: 'Dot notation accesses the stored property value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const user = { name: "Ava" };
console.log(user.role.toUpperCase());`,
      options: ['AVA', 'undefined', 'TypeError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'user.role is undefined, so calling toUpperCase on it throws a TypeError.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-object-properties-1',
    title: 'Nested Data: Arrays of Objects and Objects of Arrays',
    description: 'Read and shape more realistic data models with nested objects and arrays.',
    category: 'Core Logic',
    examples: [
      example(
        'Arrays of objects are common when you have lists of records.',
        `const students = [
  { name: "Ava", score: 92 },
  { name: "Mia", score: 88 }
];`
      ),
      example(
        'Objects of arrays are common when grouping related values.',
        `const report = {
  passed: ["Ava", "Mia"],
  retry: ["Noah"]
};`
      ),
      example(
        'Nested data is easiest to reason about one step at a time.',
        `console.log(students[0].score);`
      ),
    ],
    practice: {
      task: 'Create an array named students with two objects, then print the score of the first student.',
      code: `const students = [
  { name: "Ava", score: 92 },
  { name: "Mia", score: 88 },
];

console.log(students[0].score);`,
      requiredSnippets: ['const students', '{ name: "Ava", score: 92 }', 'students[0].score'],
      expectedOutput: ['92'],
      requirements: ['Use two student objects inside one array.', 'Print the first score only.'],
      coachNote: 'When data gets nested, read it in layers: collection, item, property.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '92',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const data = {
  tags: ["js", "dom"],
};

console.log(data.tags[1]);`,
      options: ['js', 'dom', 'tags', 'undefined'],
      correctAnswer: 1,
      explanation: 'tags is an array, and index 1 is the second value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const students = [
  { name: "Ava", score: 92 },
];

console.log(students.score);`,
      options: ['92', 'undefined', 'SyntaxError', 'TypeError'],
      correctAnswer: 1,
      explanation: 'students is an array, so score is not a direct property on it.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-assignment-1',
    title: 'Destructuring Arrays and Objects',
    description: 'Pull values out of arrays and objects cleanly with destructuring assignment.',
    category: 'Core Logic',
    examples: [
      example(
        'Array destructuring pulls values by position.',
        `const [first, second] = ["A", "B"];`
      ),
      example(
        'Object destructuring pulls values by key.',
        `const { theme, mode } = { theme: "dark", mode: "compact" };`
      ),
      example(
        'Destructuring reduces repetitive property access.',
        `const user = { name: "Ava" };
const { name } = user;`
      ),
    ],
    practice: {
      task: 'Destructure the first color from ["red", "blue"] into a variable named primary and the theme from { theme: "dark" }, then print "red dark".',
      code: `const [primary] = ["red", "blue"];
const { theme } = { theme: "dark" };

console.log(primary, theme);`,
      requiredSnippets: ['const [primary]', 'const { theme }', 'console.log(primary, theme)'],
      expectedOutput: ['red dark'],
      requirements: ['Use both array and object destructuring.', 'Print both extracted values.'],
      coachNote: 'Destructuring is strongest when it removes repetition without hiding meaning.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'red dark',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `const [a] = [10, 20];
console.log(a);`,
      options: ['10', '20', '[10, 20]', 'undefined'],
      correctAnswer: 0,
      explanation: 'The first array item is assigned to a.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const { theme } = ["dark", "light"];
console.log(theme);`,
      options: ['dark', 'light', 'undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'Array values are positional, so object destructuring with theme does not find a matching key.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-object-methods-1',
    title: 'Project 2: Build a Student Grade Tracker',
    description: 'Turn arrays, objects, functions, and conditionals into a small grade-reporting tool.',
    category: 'Core Logic',
    projectBrief: {
      goal: 'Read a line of scores, compute the average, and print both the average and the letter grade.',
      inputs: ['A line of whole-number scores like "80 90 100".'],
      outputs: ['Average: <value>', 'Grade: <letter>'],
      skills: ['array parsing', 'loops', 'functions', 'conditional logic'],
    },
    examples: [
      example(
        'Project work is where data shape and control flow meet.',
        `const scores = [80, 90, 100];`
      ),
      example(
        'Accumulation is a reusable pattern for totals and averages.',
        `let sum = 0;
for (const score of scores) {
  sum += score;
}`
      ),
      example(
        'A clean project prints a result a user can actually act on.',
        `console.log("Average: 90");`
      ),
    ],
    practice: {
      task: 'Read a line of scores, compute the average, and print the average and a letter grade (A for 90+, B for 80+, C for 70+, otherwise D).',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const scores = input.split(/\\s+/).filter(Boolean).map(Number);

let sum = 0;
for (const score of scores) {
  sum += score;
}

const average = scores.length === 0 ? 0 : Math.round(sum / scores.length);
let grade = "D";

if (average >= 90) {
  grade = "A";
} else if (average >= 80) {
  grade = "B";
} else if (average >= 70) {
  grade = "C";
}

console.log(\`Average: \${average}\`);
console.log(\`Grade: \${grade}\`);`,
      requiredSnippets: ['split', 'map(Number)', 'for (const score of scores)', 'Average:', 'Grade:'],
      expectedOutput: ['Average: 90', 'Grade: A'],
      inputs: ['A line of one or more scores from standard input.'],
      requirements: ['Compute an average from all provided scores.', 'Print both the average and the final letter grade.'],
      coachNote: 'Projects become maintainable when every step has one job: parse, compute, classify, then print.',
      testCases: [
        {
          label: 'Public A average',
          stdin_text: '80 90 100\n',
          expected_output: 'Average: 90\nGrade: A',
          hidden: false,
        },
        {
          label: 'Hidden B average',
          stdin_text: '80 85 83\n',
          expected_output: 'Average: 83\nGrade: B',
          hidden: true,
        },
        {
          label: 'Hidden C average',
          stdin_text: '70 74 76\n',
          expected_output: 'Average: 73\nGrade: C',
          hidden: true,
        },
      ],
    },
    predict: {
      prompt: 'Assume scores is [80, 90, 100].',
      code: `const average = Math.round((80 + 90 + 100) / 3);
console.log(average);`,
      options: ['85', '90', '100', '270'],
      correctAnswer: 1,
      explanation: 'The rounded average of 80, 90, and 100 is 90.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const scores = ["80", "90"];
console.log(scores[0] + scores[1]);`,
      options: ['170', '8090', '90', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'Without Number conversion, strings concatenate instead of adding.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-function-parameters-1',
    title: 'Rest, Spread, and Default Parameters',
    description: 'Handle flexible inputs cleanly with default values, spread syntax, and rest parameters.',
    category: 'Browser and DOM',
    examples: [
      example(
        'Default parameters keep simple function calls readable.',
        `function greet(name = "Guest") {
  return \`Hello, \${name}\`;
}`
      ),
      example(
        'Rest parameters gather many arguments into one array.',
        `function total(...numbers) {
  return numbers.length;
}`
      ),
      example(
        'Spread expands an existing array into individual values.',
        `const pair = [3, 4];
console.log(Math.max(...pair));`
      ),
    ],
    practice: {
      task: 'Write a function named buildLabel with a default prefix of "Task" and a rest parameter for tags, then return a string like "Task: ui, urgent".',
      code: `function buildLabel(prefix = "Task", ...tags) {
  return \`\${prefix}: \${tags.join(", ")}\`;
}

console.log(buildLabel("Task", "ui", "urgent"));`,
      requiredSnippets: ['prefix = "Task"', '...tags', 'tags.join(", ")'],
      expectedOutput: ['Task: ui, urgent'],
      requirements: ['Use one default parameter.', 'Use one rest parameter.', 'Join tags into one readable string.'],
      coachNote: 'These tools matter when APIs should stay flexible without becoming vague.',
    },
    predict: {
      code: `function greet(name = "Guest") {
  return name;
}

console.log(greet());`,
      options: ['Guest', 'undefined', 'name', 'Error'],
      correctAnswer: 0,
      explanation: 'The default parameter is used because no argument was provided.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `const values = [1, 2, 3];
console.log(Math.max(values));`,
      options: ['3', '[1, 2, 3]', 'NaN', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'Math.max expects separate numbers. Without spread, it receives one array object.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'js-best-practices-1',
    title: 'Writing Clean, Readable JavaScript',
    description: 'Prefer naming, structure, and low-surprise logic over clever one-liners.',
    category: 'Browser and DOM',
    examples: [
      example(
        'Readable naming removes the need for many comments.',
        `const pendingTaskCount = 3;`
      ),
      example(
        'Early returns flatten messy nesting.',
        `function formatName(name) {
  if (!name) return "Unknown";
  return name.trim();
}`
      ),
      example(
        'Small helper functions reduce duplication and explain intent.',
        `function isEmpty(value) {
  return value.trim() === "";
}`
      ),
    ],
    practice: {
      task: 'Refactor the code so it uses a descriptive variable name and an early return when the input is empty.',
      code: `function formatSearch(rawQuery) {
  if (!rawQuery) {
    return "Empty";
  }

  const trimmedQuery = rawQuery.trim();
  if (trimmedQuery === "") {
    return "Empty";
  }

  return trimmedQuery.toLowerCase();
}`,
      requiredSnippets: ['formatSearch', 'trimmedQuery', 'return "Empty"'],
      forbiddenPatterns: ['let x', 'if (!rawQuery) { return "Empty"; } else'],
      expectedOutput: ['A named helper with an early return path.'],
      requirements: ['Use one descriptive variable name.', 'Use an early return instead of an else wrapper.'],
      coachNote: 'Readable code is faster to trust, review, and change.',
    },
    predict: {
      label: 'Refactor Choice',
      prompt: 'Which version is easier to maintain?',
      code: `A) if (!user) return "guest"; return user.name;
B) if (user) { return user.name; } else { return "guest"; }`,
      options: ['A only', 'B only', 'They are equally readable', 'Neither can work'],
      correctAnswer: 0,
      explanation: 'The early-return version communicates the edge case faster and avoids extra nesting.',
      questionKind: 'refactor-choice',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `const a = 3;
const totalCount = a;`,
      options: ['Clear naming', 'Still too vague', 'SyntaxError', 'Runtime error'],
      correctAnswer: 1,
      explanation: 'totalCount is better than a because it describes what the value represents.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'js-debugging-1',
    title: 'Debugging with the Browser Console',
    description: 'Use console output, breakpoints, and careful reading to narrow bugs before you guess.',
    category: 'Browser and DOM',
    examples: [
      example(
        'console.log is a way to inspect state, not a permanent UI.',
        `console.log("searchTerm", searchTerm);`
      ),
      example(
        'You debug fastest when you compare expected state with actual state.',
        `console.table(users);`
      ),
      example(
        'The first real error is usually the most important one to read carefully.',
        `Uncaught TypeError: Cannot read properties of null`
      ),
    ],
    practice: {
      task: 'Add targeted console logging that would help debug why a submitted name becomes empty after trim().',
      code: `function submitName(rawName) {
  console.log("rawName", rawName);
  const trimmedName = rawName.trim();
  console.log("trimmedName", trimmedName);
  return trimmedName;
}`,
      requiredSnippets: ['console.log("rawName"', 'trimmedName', 'console.log("trimmedName"'],
      expectedOutput: ['Two focused console logs around the trim step.'],
      requirements: ['Log the value before trimming.', 'Log the value after trimming.'],
      coachNote: 'Good debugging narrows uncertainty. It should answer a question, not dump everything.',
    },
    predict: {
      label: 'Compiler Trace',
      code: `const button = document.querySelector("#save");
button.textContent = "Saved";`,
      options: ['The selector returns a button', 'The code can fail if button is null', 'querySelector always throws', 'textContent is invalid'],
      correctAnswer: 1,
      explanation: 'If the element is missing, button is null and the next line throws a TypeError.',
      questionKind: 'compiler-trace',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `console.log(user);
const user = { name: "Ava" };`,
      options: ['Prints the object', 'Prints undefined', 'ReferenceError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'const is in the temporal dead zone before initialization.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'dom-intro-1',
    title: 'The DOM: How JavaScript Sees a Web Page',
    description: 'Treat the page as a tree of elements that JavaScript can inspect and change.',
    category: 'Browser and DOM',
    examples: [
      example(
        'The browser turns HTML into a tree called the DOM.',
        `<main>
  <h1>Dashboard</h1>
  <p id="status">Ready</p>
</main>`
      ),
      example(
        'JavaScript can read that tree through document.',
        `document.body;
document.querySelector("#status");`
      ),
      example(
        'DOM work becomes safer when you think “select, inspect, change”.',
        `const status = document.querySelector("#status");
console.log(status.textContent);`
      ),
    ],
    practice: {
      task: 'Select the element with id="status" and change its text to "Ready to learn".',
      code: `const status = document.querySelector("#status");
status.textContent = "Ready to learn";`,
      requiredSnippets: ['document.querySelector("#status")', 'textContent = "Ready to learn"'],
      expectedOutput: ['The page text updates to "Ready to learn".'],
      requirements: ['Select the element first.', 'Change the visible text with textContent.'],
      coachNote: 'The DOM is easiest to reason about as “find a node, then mutate one property on purpose.”',
    },
    predict: {
      code: `const title = document.querySelector("h1");
console.log(title.tagName);`,
      options: ['h1', 'H1', 'title', 'undefined'],
      correctAnswer: 1,
      explanation: 'tagName is reported in uppercase in the browser DOM API.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const status = document.querySelector("#missing");
status.textContent = "Done";`,
      options: ['Done', 'No effect', 'TypeError', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'querySelector returns null when nothing matches, so the property write fails.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'dom-methods-1',
    title: 'Selecting Elements with querySelector',
    description: 'Use CSS-style selectors to target exactly the DOM node you want.',
    category: 'Browser and DOM',
    examples: [
      example(
        'querySelector returns the first matching element.',
        `document.querySelector(".card");`
      ),
      example(
        'IDs use # and classes use . in selectors.',
        `document.querySelector("#status");
document.querySelector(".panel");`
      ),
      example(
        'querySelectorAll returns a collection when you need many elements.',
        `document.querySelectorAll("li");`
      ),
    ],
    practice: {
      task: 'Select the first element with class "card" and store it in a const named card.',
      code: `const card = document.querySelector(".card");`,
      requiredSnippets: ['const card', 'document.querySelector(".card")'],
      expectedOutput: ['The first .card element is stored in card.'],
      requirements: ['Use querySelector.', 'Use the exact variable name card.'],
      coachNote: 'The selector should communicate intent. If the selector is vague, the code will be too.',
    },
    predict: {
      code: `const item = document.querySelector("#menu .active");`,
      options: ['The first active item inside #menu', 'All active items', 'The menu element itself', 'Nothing valid'],
      correctAnswer: 0,
      explanation: 'The selector asks for the first .active descendant inside #menu.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `document.querySelectorAll(".task");`,
      options: ['One element', 'A collection of matching elements', 'Always null', 'A string'],
      correctAnswer: 1,
      explanation: 'querySelectorAll returns a NodeList-like collection.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'dom-elements-1',
    title: 'Changing Text, HTML, and Attributes',
    description: 'Update text, markup, and attributes carefully so the page reflects state accurately.',
    category: 'Browser and DOM',
    examples: [
      example(
        'textContent is the safe default for plain text updates.',
        `status.textContent = "Saved";`
      ),
      example(
        'innerHTML inserts HTML markup, so it deserves more care.',
        `panel.innerHTML = "<strong>Done</strong>";`
      ),
      example(
        'Attributes configure behavior and metadata.',
        `link.setAttribute("href", "/dashboard");`
      ),
    ],
    practice: {
      task: 'Select the image with id="avatar", set its alt attribute to "Student avatar", and change the heading text to "Welcome back".',
      code: `const avatar = document.querySelector("#avatar");
avatar.setAttribute("alt", "Student avatar");

const heading = document.querySelector("h1");
heading.textContent = "Welcome back";`,
      requiredSnippets: ['document.querySelector("#avatar")', 'setAttribute("alt", "Student avatar")', 'textContent = "Welcome back"'],
      expectedOutput: ['The image alt text and heading text are updated.'],
      requirements: ['Update one attribute and one text node.', 'Use textContent for the visible heading.'],
      coachNote: 'Change only what the UI actually needs. Overusing innerHTML creates more surface area than necessary.',
    },
    predict: {
      code: `const note = document.querySelector("#note");
note.textContent = "<strong>Hi</strong>";`,
      options: ['Bold Hi', 'Literal <strong>Hi</strong> text', 'A syntax error', 'No change'],
      correctAnswer: 1,
      explanation: 'textContent treats the value as plain text, not HTML.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const link = document.querySelector("a");
link.href = "/dashboard";`,
      options: ['Invalid pattern', 'Valid attribute/property update', 'Always throws', 'Deletes the link'],
      correctAnswer: 1,
      explanation: 'Direct property assignment is also valid for common attributes like href.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-syntax-1',
    title: 'Styling Elements with JavaScript',
    description: 'Apply or remove styles in ways that support maintainability instead of fighting it.',
    category: 'Browser and DOM',
    examples: [
      example(
        'Inline style changes are useful for a few direct adjustments.',
        `banner.style.backgroundColor = "#0ea5e9";`
      ),
      example(
        'classList is stronger when design already lives in CSS.',
        `banner.classList.add("is-active");`
      ),
      example(
        'toggle helps stateful UI stay readable.',
        `banner.classList.toggle("is-hidden");`
      ),
    ],
    practice: {
      task: 'Select the card with id="profile", add the class "is-active", and set its borderColor style to "#38bdf8".',
      code: `const profileCard = document.querySelector("#profile");
profileCard.classList.add("is-active");
profileCard.style.borderColor = "#38bdf8";`,
      requiredSnippets: ['document.querySelector("#profile")', 'classList.add("is-active")', 'style.borderColor = "#38bdf8"'],
      expectedOutput: ['The card receives one class and one style update.'],
      requirements: ['Add a CSS class.', 'Set one style property directly.'],
      coachNote: 'Use classes for state, and use direct styles only when the change truly belongs in logic.',
    },
    predict: {
      code: `panel.classList.toggle("hidden");`,
      options: ['Always removes hidden', 'Always adds hidden', 'Adds it if missing and removes it if present', 'Throws on every call'],
      correctAnswer: 2,
      explanation: 'toggle switches the class on or off.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `button.style.background-color = "red";`,
      options: ['Valid CSS in JS', 'Use camelCase in style properties', 'Always use setAttribute', 'This only works with classes'],
      correctAnswer: 1,
      explanation: 'DOM style properties use camelCase like backgroundColor.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'dom-events-1',
    title: 'Responding to Clicks and User Events',
    description: 'Wire code to real user actions with predictable event handlers.',
    category: 'Browser and DOM',
    examples: [
      example(
        'Events let JavaScript react after the page loads.',
        `button.addEventListener("click", () => {
  console.log("clicked");
});`
      ),
      example(
        'The event object carries useful details about the interaction.',
        `button.addEventListener("click", (event) => {
  console.log(event.type);
});`
      ),
      example(
        'Named handlers help when the same logic is reused.',
        `function handleSaveClick() {
  console.log("saved");
}`
      ),
    ],
    practice: {
      task: 'Select the button with id="save" and register a click handler that changes #status text to "Saved".',
      code: `const saveButton = document.querySelector("#save");
const status = document.querySelector("#status");

saveButton.addEventListener("click", () => {
  status.textContent = "Saved";
});`,
      requiredSnippets: ['document.querySelector("#save")', 'addEventListener("click"', 'status.textContent = "Saved"'],
      expectedOutput: ['Clicking the button updates the status text.'],
      requirements: ['Register a click handler.', 'Update the status inside the handler.'],
      coachNote: 'Event code should describe one clear reaction to one clear trigger.',
    },
    predict: {
      code: `button.addEventListener("click", () => {
  console.log("A");
});
button.addEventListener("click", () => {
  console.log("B");
});`,
      options: ['Only A', 'Only B', 'Both handlers can run', 'The second removes the first'],
      correctAnswer: 2,
      explanation: 'Multiple listeners can be registered for the same event.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `button.addEventListener("click", handleClick());`,
      options: ['Correct event registration', 'Calls the function immediately instead of passing it as a handler', 'Adds two handlers', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'handleClick() runs now. addEventListener expects a function reference.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'dom-event-listener-1',
    title: 'Forms and User Input Handling',
    description: 'Read user-entered values, prevent default form refreshes, and validate small interactions.',
    category: 'Browser and DOM',
    examples: [
      example(
        'Forms often need submit handling instead of plain click handling.',
        `form.addEventListener("submit", (event) => {
  event.preventDefault();
});`
      ),
      example(
        'Input values come from element.value.',
        `const name = nameInput.value;`
      ),
      example(
        'Validation logic should produce one clear next state.',
        `if (name.trim() === "") {
  error.textContent = "Name is required";
}`
      ),
    ],
    practice: {
      task: 'Handle a form submit by preventing default, reading #name value, and placing it into #preview text.',
      code: `const form = document.querySelector("form");
const nameInput = document.querySelector("#name");
const preview = document.querySelector("#preview");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  preview.textContent = nameInput.value;
});`,
      requiredSnippets: ['addEventListener("submit"', 'event.preventDefault()', 'nameInput.value', 'preview.textContent'],
      expectedOutput: ['Submitting the form copies the current input text into the preview area.'],
      requirements: ['Use the submit event.', 'Prevent the default page reload.', 'Read one input value.'],
      coachNote: 'A form handler should be easy to follow: stop default, read state, validate, then update UI.',
    },
    predict: {
      code: `const emailInput = document.querySelector("#email");
console.log(emailInput.value);`,
      options: ['The current user-entered text', 'The DOM node itself', 'Always an empty string', 'An array'],
      correctAnswer: 0,
      explanation: 'value reads the input field’s current string value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `form.addEventListener("submit", () => {
  preview.textContent = "Saved";
});`,
      options: ['Good enough for every form', 'The form may still reload because preventDefault is missing', 'submit does not exist', 'preview cannot be updated on submit'],
      correctAnswer: 1,
      explanation: 'Without preventDefault, the browser may navigate or reload immediately after submit.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-comments-1',
    title: 'Project 3: Build an Interactive To-Do List',
    description: 'Combine DOM selection, creation, events, and user input into a realistic interactive browser mini-app.',
    category: 'Browser and DOM',
    projectBrief: {
      goal: 'Build a to-do list that adds tasks, marks them complete, and removes them from the page.',
      inputs: ['A text field for the task name and button clicks from the user.'],
      outputs: ['New task rows in the list and updated task state.'],
      skills: ['DOM selection', 'createElement', 'event handling', 'form input'],
    },
    examples: [
      example(
        'A to-do app is mostly about list state and user-triggered DOM changes.',
        `const task = {
  text: "Review notes",
  done: false,
};`
      ),
      example(
        'A task row usually needs text plus two actions: complete and remove.',
        `const item = document.createElement("li");
item.textContent = task.text;`
      ),
      example(
        'Project code stays readable when creation, rendering, and event wiring are separated.',
        `function renderTask(text) {
  return text;
}`
      ),
    ],
    practice: {
      task: 'Write the core add-task logic: read #taskInput, create a <li>, set its text, and append it to #taskList.',
      code: `const taskInput = document.querySelector("#taskInput");
const taskList = document.querySelector("#taskList");

const item = document.createElement("li");
item.textContent = taskInput.value;
taskList.append(item);`,
      requiredSnippets: ['document.querySelector("#taskInput")', 'document.createElement("li")', 'item.textContent = taskInput.value', 'taskList.append(item)'],
      expectedOutput: ['A new list item is created and appended to the task list.'],
      requirements: ['Create a new li element.', 'Copy the current input value into the li.', 'Append the li to the list.'],
      coachNote: 'Real interactive work is about clear responsibilities: read input, create DOM, attach it in one obvious place.',
    },
    predict: {
      label: 'Knowledge Check',
      code: `taskList.append(item);
taskList.append(item);`,
      options: ['Two copies of the same node appear', 'The same node is moved, so it still exists only once', 'The browser throws', 'The list is cleared'],
      correctAnswer: 1,
      explanation: 'A DOM node can only exist in one place at a time.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'Which change makes the to-do code easier to scale?',
      code: `A) One function that creates and returns a task row
B) Duplicating createElement + textContent + append in every click handler`,
      options: ['A', 'B', 'Both equally strong', 'Neither matters'],
      correctAnswer: 0,
      explanation: 'Reusable task-row creation logic keeps future changes in one place.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'javascript-output-1',
    title: 'Creating, Inserting, and Removing Elements',
    description: 'Build DOM nodes intentionally, insert them in the right place, and remove them without losing control of state.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'createElement gives you a new DOM node you can configure before insertion.',
        `const item = document.createElement("li");`
      ),
      example(
        'append and prepend place nodes into the page tree.',
        `list.append(item);`
      ),
      example(
        'remove cleans up an existing node directly.',
        `item.remove();`
      ),
    ],
    practice: {
      task: 'Create a button element, set its text to "Remove", append it to #actions, and remove it inside a click handler.',
      code: `const actions = document.querySelector("#actions");
const button = document.createElement("button");
button.textContent = "Remove";
actions.append(button);

button.addEventListener("click", () => {
  button.remove();
});`,
      requiredSnippets: ['document.createElement("button")', 'button.textContent = "Remove"', 'actions.append(button)', 'button.remove()'],
      expectedOutput: ['A button is created, inserted, and later removed on click.'],
      requirements: ['Create the element in code.', 'Insert it into #actions.', 'Remove it from the DOM on click.'],
      coachNote: 'Create first, configure second, insert last. That order keeps DOM code readable.',
    },
    predict: {
      code: `const item = document.createElement("li");
list.append(item);
item.remove();`,
      options: ['The item stays in the list', 'The item is removed from the list', 'append stops working', 'remove only hides the item'],
      correctAnswer: 1,
      explanation: 'remove detaches the node from the DOM tree.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const item = document.createElement("li");
item.textcontent = "Task";`,
      options: ['Valid property name', 'JavaScript fixes the casing automatically', 'The wrong casing means the visible text will not update as intended', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'The DOM property is textContent with a capital C.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-function-definitions-1',
    title: 'Reusable UI Logic with Functions',
    description: 'Move repeated UI transformations into small functions with explicit inputs and outputs.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'UI helpers become easier to test when they return text or markup instead of touching the DOM immediately.',
        `function formatBadge(label, count) {
  return \`\${label}: \${count}\`;
}`
      ),
      example(
        'Small view helpers reduce duplication across click and render paths.',
        `function statusText(done) {
  return done ? "Done" : "Pending";
}`
      ),
      example(
        'Readable helpers usually accept the minimum data needed.',
        `function fullName(user) {
  return \`\${user.first} \${user.last}\`;
}`
      ),
    ],
    practice: {
      task: 'Write a function named renderStatus that returns "Status: Done" when given true and "Status: Pending" when given false, then print renderStatus(true).',
      code: `function renderStatus(done) {
  return done ? "Status: Done" : "Status: Pending";
}

console.log(renderStatus(true));`,
      requiredSnippets: ['function renderStatus(done)', 'Status: Done', 'Status: Pending', 'renderStatus(true)'],
      expectedOutput: ['Status: Done'],
      requirements: ['Return a string from the helper.', 'Print the result of calling the helper once.'],
      coachNote: 'Reusable UI logic becomes maintainable when it returns a value instead of hiding side effects everywhere.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'Status: Done',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `function formatCount(count) {
  return \`Count: \${count}\`;
}

console.log(formatCount(3));`,
      options: ['3', 'Count: 3', 'count: 3', 'undefined'],
      correctAnswer: 1,
      explanation: 'The helper returns the full formatted string.',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'Which is the cleaner UI pattern?',
      code: `A) One helper returns label text
B) The same string formatting is duplicated in four click handlers`,
      options: ['A', 'B', 'They are equal', 'Neither is valid'],
      correctAnswer: 0,
      explanation: 'Reusable helpers cut duplication and localize future copy changes.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'javascript-function-invocation-1',
    title: 'Higher-Order Functions and Callbacks',
    description: 'Pass functions into other functions to build flexible behavior without rewriting the same loop.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'A callback is a function given to another function.',
        `function runTask(task) {
  task();
}`
      ),
      example(
        'Higher-order functions accept or return other functions.',
        `function applyTwice(fn, value) {
  return fn(fn(value));
}`
      ),
      example(
        'Callbacks are a common way to describe “what should happen next.”',
        `setTimeout(() => console.log("later"), 0);`
      ),
    ],
    practice: {
      task: 'Write a function applyTwice that takes a callback and a value, then returns the callback result applied twice. Print applyTwice(x => x + 1, 3).',
      code: `function applyTwice(fn, value) {
  return fn(fn(value));
}

console.log(applyTwice((x) => x + 1, 3));`,
      requiredSnippets: ['function applyTwice(fn, value)', 'fn(fn(value))', '(x) => x + 1'],
      expectedOutput: ['5'],
      requirements: ['Accept a function argument.', 'Apply it twice to the same value.'],
      coachNote: 'Higher-order code becomes readable only when the callback meaning is obvious from the function name.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '5',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `function run(task) {
  return task();
}

console.log(run(() => "ok"));`,
      options: ['task', 'ok', 'undefined', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'The callback returns "ok", and run returns that value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `runTask(task());`,
      options: ['Passes the callback correctly', 'Calls task immediately instead of passing the function', 'Creates a promise', 'Always throws'],
      correctAnswer: 1,
      explanation: 'task() executes now. Passing task would hand over the function itself.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-array-iterations-1',
    title: 'map, filter, reduce, and Functional Thinking',
    description: 'Transform, keep, and accumulate data using focused array pipelines.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'map transforms every item into a new shape.',
        `const doubled = [1, 2, 3].map((value) => value * 2);`
      ),
      example(
        'filter keeps only the items that pass a test.',
        `const evens = [1, 2, 3, 4].filter((value) => value % 2 === 0);`
      ),
      example(
        'reduce combines many items into one result.',
        `const total = [1, 2, 3].reduce((sum, value) => sum + value, 0);`
      ),
    ],
    practice: {
      task: 'Read a line of numbers, keep the even ones, double them, and print their sum.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const numbers = input.split(/\\s+/).filter(Boolean).map(Number);

const total = numbers
  .filter((value) => value % 2 === 0)
  .map((value) => value * 2)
  .reduce((sum, value) => sum + value, 0);

console.log(total);`,
      requiredSnippets: ['filter((value) => value % 2 === 0)', 'map((value) => value * 2)', 'reduce((sum, value) => sum + value, 0)'],
      expectedOutput: ['12'],
      inputs: ['A line of whole numbers from standard input.'],
      requirements: ['Use filter, map, and reduce in one clear pipeline.', 'Print the final numeric result.'],
      coachNote: 'Functional array code works best when each stage has one obvious job.',
      testCases: [
        {
          label: 'Public total',
          stdin_text: '1 2 3 4\n',
          expected_output: '12',
          hidden: false,
        },
        {
          label: 'Hidden no even numbers',
          stdin_text: '1 3 5\n',
          expected_output: '0',
          hidden: true,
        },
        {
          label: 'Hidden larger set',
          stdin_text: '2 4 6\n',
          expected_output: '24',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `const result = [1, 2, 3].map((value) => value + 1);
console.log(result.join(","));`,
      options: ['1,2,3', '2,3,4', '6', 'undefined'],
      correctAnswer: 1,
      explanation: 'map creates a new array with each value incremented by 1.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const total = [1, 2, 3].reduce((sum, value) => {
  sum + value;
}, 0);`,
      options: ['6', '0', 'undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'The reducer callback does not return the updated accumulator.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-break-1',
    title: 'Error Handling with try, catch, and throw',
    description: 'Fail deliberately when assumptions break and handle expected errors without hiding them.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'try/catch lets you handle code that may throw.',
        `try {
  JSON.parse(raw);
} catch (error) {
  console.error(error.message);
}`
      ),
      example(
        'throw creates your own failure when inputs are invalid.',
        `if (!name) {
  throw new Error("Name is required");
}`
      ),
      example(
        'Good error handling turns failure into a clear next action.',
        `return "Invalid payload";`
      ),
    ],
    practice: {
      task: 'Read one value. Convert it to a number. If it is not a valid number, throw an error and catch it to print "Invalid number". Otherwise print the doubled value.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();

try {
  const value = Number(input);
  if (Number.isNaN(value)) {
    throw new Error("Invalid number");
  }
  console.log(value * 2);
} catch (error) {
  console.log("Invalid number");
}`,
      requiredSnippets: ['try {', 'catch (error)', 'throw new Error', 'Number.isNaN'],
      expectedOutput: ['10'],
      inputs: ['One raw value from standard input.'],
      requirements: ['Throw when the number is invalid.', 'Catch and print "Invalid number".'],
      coachNote: 'Error handling is strongest when the failure case is explicit and the success path stays simple.',
      testCases: [
        {
          label: 'Public valid number',
          stdin_text: '5\n',
          expected_output: '10',
          hidden: false,
        },
        {
          label: 'Hidden invalid number',
          stdin_text: 'hello\n',
          expected_output: 'Invalid number',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `try {
  throw new Error("Stop");
} catch (error) {
  console.log(error.message);
}`,
      options: ['Error', 'Stop', 'undefined', 'Nothing'],
      correctAnswer: 1,
      explanation: 'The catch block receives the thrown error and logs its message.',
    },
    mistake: {
      label: 'Compiler Trace',
      code: `try {
  console.log("run");
}`,
      options: ['Valid try block', 'A catch or finally block is required', 'The code logs run', 'try only works in functions'],
      correctAnswer: 1,
      explanation: 'A try block must be paired with catch, finally, or both.',
      questionKind: 'compiler-trace',
    },
  }),
  lesson({
    id: 'js-json-course-1',
    title: 'JSON: Converting Data To and From JavaScript',
    description: 'Serialize JavaScript data to JSON and parse JSON back into usable values.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'JSON.stringify turns JavaScript data into a transportable string.',
        `const raw = JSON.stringify({ name: "Ava" });`
      ),
      example(
        'JSON.parse converts a JSON string back into data.',
        `const user = JSON.parse('{"name":"Ava"}');`
      ),
      example(
        'JSON uses strings, numbers, booleans, arrays, objects, and null.',
        `{"ready":true,"count":3}`
      ),
    ],
    practice: {
      task: 'Read a JSON string from standard input, parse it, and print the value of its name property.',
      code: `const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
const data = JSON.parse(input);

console.log(data.name);`,
      requiredSnippets: ['JSON.parse(input)', 'data.name', 'console.log'],
      expectedOutput: ['Ava'],
      inputs: ['A JSON object string from standard input.'],
      requirements: ['Parse the incoming JSON string.', 'Print one named property.'],
      coachNote: 'Good JSON code makes the conversion boundary obvious: raw string in, object out.',
      testCases: [
        {
          label: 'Public name',
          stdin_text: '{"name":"Ava"}\n',
          expected_output: 'Ava',
          hidden: false,
        },
        {
          label: 'Hidden different name',
          stdin_text: '{"name":"Noah"}\n',
          expected_output: 'Noah',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `const raw = JSON.stringify({ score: 3 });
console.log(raw);`,
      options: ['{ score: 3 }', '{"score":3}', 'score:3', '3'],
      correctAnswer: 1,
      explanation: 'JSON.stringify produces a JSON string with quoted keys.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `JSON.parse({ name: "Ava" });`,
      options: ['Valid parse', 'It should receive a JSON string, not a plain object', 'Returns the same object', 'Always null'],
      correctAnswer: 1,
      explanation: 'JSON.parse expects a string input.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-math-1',
    title: 'Timing Code with setTimeout and setInterval',
    description: 'Schedule work later, repeat small jobs safely, and stop intervals when they are no longer needed.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'setTimeout schedules one future callback.',
        `setTimeout(() => {
  console.log("later");
}, 500);`
      ),
      example(
        'setInterval repeats until cleared.',
        `const timerId = setInterval(() => {
  console.log("tick");
}, 1000);`
      ),
      example(
        'clearInterval and clearTimeout stop pending work.',
        `clearInterval(timerId);`
      ),
    ],
    practice: {
      task: 'Create one timeout that logs "Saved" after 300ms and one interval that logs "tick" until clearInterval is called.',
      code: `const saveTimeoutId = setTimeout(() => {
  console.log("Saved");
}, 300);

const tickIntervalId = setInterval(() => {
  console.log("tick");
}, 1000);

clearInterval(tickIntervalId);`,
      requiredSnippets: ['setTimeout', 'setInterval', 'clearInterval'],
      expectedOutput: ['One timeout and one interval pattern.'],
      requirements: ['Create both timer types.', 'Show how the interval would be cleared.'],
      coachNote: 'Timer code is production-safe only when start and stop behavior are both obvious.',
    },
    predict: {
      code: `console.log("A");
setTimeout(() => console.log("B"), 0);
console.log("C");`,
      options: ['A B C', 'A C B', 'B A C', 'C B A'],
      correctAnswer: 1,
      explanation: 'The synchronous logs run first. The timeout callback runs after the current call stack finishes.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `const id = setInterval(() => console.log("tick"), 1000);
clearTimeout(id);`,
      options: ['Definitely wrong', 'Often still clears because timer IDs are shared in browsers, but clearInterval is clearer', 'SyntaxError', 'Makes the interval faster'],
      correctAnswer: 1,
      explanation: 'clearInterval expresses intent better, even if timer IDs are often interchangeable in the platform.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-const-1',
    title: 'Asynchronous JavaScript: The Big Picture',
    description: 'Build a mental model for the event loop, deferred work, and why async code feels out of order.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'Synchronous code runs immediately on the current call stack.',
        `console.log("sync");`
      ),
      example(
        'Async work often schedules a callback for later.',
        `Promise.resolve().then(() => console.log("microtask"));`
      ),
      example(
        'The core debugging question is always “what runs now, and what runs later?”',
        `setTimeout(() => console.log("later"), 0);`
      ),
    ],
    practice: {
      task: 'Write a short explanation in code comments and logs that shows one synchronous line, one Promise callback, and one timeout callback.',
      code: `console.log("sync");
Promise.resolve().then(() => console.log("promise"));
setTimeout(() => console.log("timeout"), 0);`,
      requiredSnippets: ['Promise.resolve()', 'setTimeout', 'console.log("sync")'],
      expectedOutput: ['A minimal async ordering example.'],
      requirements: ['Include one synchronous log.', 'Include one promise callback.', 'Include one timeout callback.'],
      coachNote: 'This lesson is about mental models. The code should make ordering visible, not just “use async things.”',
    },
    predict: {
      code: `console.log("start");
Promise.resolve().then(() => console.log("promise"));
setTimeout(() => console.log("timeout"), 0);
console.log("end");`,
      options: ['start, promise, timeout, end', 'start, end, promise, timeout', 'promise, timeout, start, end', 'start, timeout, promise, end'],
      correctAnswer: 1,
      explanation: 'Synchronous code runs first, then promise microtasks, then timeouts.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `async operations always run on another thread`,
      options: ['Always true', 'Too simplistic and often false in JavaScript', 'Only true in browsers', 'Only true with fetch'],
      correctAnswer: 1,
      explanation: 'The event loop model is about scheduling and callbacks, not “everything async means another thread.”',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'js-promises-1',
    title: 'Promises: Then, Catch, and Finally',
    description: 'Represent future results explicitly and wire success, failure, and cleanup paths in one place.',
    category: 'Dynamic UI and Async',
    examples: [
      example(
        'Promises represent a result that will arrive later.',
        `Promise.resolve("ok");`
      ),
      example(
        'then handles the fulfilled path and catch handles failure.',
        `fetchData()
  .then((value) => console.log(value))
  .catch((error) => console.error(error));`
      ),
      example(
        'finally runs cleanup regardless of success or failure.',
        `save()
  .finally(() => console.log("done"));`
      ),
    ],
    practice: {
      task: 'Create a resolved promise with the value 3, multiply it by 2 in then, and print the result.',
      code: `Promise.resolve(3)
  .then((value) => value * 2)
  .then((value) => {
    console.log(value);
  });`,
      requiredSnippets: ['Promise.resolve(3)', '.then((value) => value * 2)', 'console.log(value)'],
      expectedOutput: ['6'],
      requirements: ['Start from Promise.resolve.', 'Transform the value in then.', 'Print the final value.'],
      coachNote: 'Promise chains are readable when each step has one job: transform, handle, or clean up.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '6',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `Promise.resolve("ok")
  .then((value) => console.log(value))
  .finally(() => console.log("done"));`,
      options: ['ok then done', 'done then ok', 'Only ok', 'Only done'],
      correctAnswer: 0,
      explanation: 'The fulfillment handler runs, and finally runs afterward as cleanup.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Promise.resolve(3)
  .then((value) => {
    value * 2;
  })
  .then((value) => console.log(value));`,
      options: ['6', 'undefined', '3', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'The first then callback does not return the transformed value.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-switch-1',
    title: 'Project 4: Build a Weather App with an API',
    description: 'Plan a browser app that fetches data, handles loading and errors, and renders a clear forecast card.',
    category: 'Dynamic UI and Async',
    projectBrief: {
      goal: 'Build a weather interface that requests weather data for a city and renders the result into the page.',
      inputs: ['A city name typed by the user.', 'The API response payload.'],
      outputs: ['A loading state, a success card, or an error state.'],
      skills: ['fetch flow', 'state rendering', 'error handling', 'DOM updates'],
    },
    examples: [
      example(
        'API projects need three states at minimum: loading, success, and failure.',
        `setStatus("Loading...");
renderWeather(data);
setStatus("Could not load weather");`
      ),
      example(
        'The browser app should separate data fetching from rendering logic.',
        `async function loadWeather(city) {
  const data = await fetchWeather(city);
  renderWeather(data);
}`
      ),
      example(
        'Strong product UI clears old content before rendering the new state.',
        `results.innerHTML = "";`
      ),
    ],
    practice: {
      task: 'Write the core fetch flow: show "Loading...", call fetchWeather(city), renderWeather(data) on success, and show "Could not load weather" on failure.',
      code: `async function loadWeather(city) {
  status.textContent = "Loading...";

  try {
    const data = await fetchWeather(city);
    renderWeather(data);
  } catch (error) {
    status.textContent = "Could not load weather";
  }
}`,
      requiredSnippets: ['status.textContent = "Loading..."', 'await fetchWeather(city)', 'renderWeather(data)', 'catch (error)'],
      expectedOutput: ['A clear loading-success-error fetch flow.'],
      requirements: ['Show a loading state before the request resolves.', 'Handle the error path explicitly.'],
      coachNote: 'API projects feel production-ready when the user always knows what state the app is in.',
    },
    predict: {
      label: 'Knowledge Check',
      code: `status.textContent = "Loading...";
const data = await fetchWeather(city);
renderWeather(data);`,
      options: ['The UI stays blank until the response returns', 'The loading state appears before renderWeather runs', 'renderWeather runs before fetchWeather', 'await blocks the whole browser tab'],
      correctAnswer: 1,
      explanation: 'The loading message is set synchronously before the awaited response resolves.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'Which structure is cleaner for a weather app?',
      code: `A) fetchWeather handles network only and renderWeather handles DOM only
B) fetchWeather also updates the page and clears errors and formats HTML`,
      options: ['A', 'B', 'Both are equally maintainable', 'Neither can work'],
      correctAnswer: 0,
      explanation: 'Separating data access from rendering keeps async bugs and UI bugs easier to isolate.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'js-async-await-1',
    title: 'Async/Await for Cleaner Async Code',
    description: 'Use async functions and await to write async flows that read like direct logic.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'async marks a function that returns a promise.',
        `async function loadUser() {
  return "Ava";
}`
      ),
      example(
        'await pauses inside the async function until the promise settles.',
        `const user = await Promise.resolve("Ava");`
      ),
      example(
        'try/catch keeps async error handling readable.',
        `try {
  const value = await fetchValue();
} catch (error) {
  console.error(error);
}`
      ),
    ],
    practice: {
      task: 'Create an async function main that awaits Promise.resolve("ready") and prints the awaited value.',
      code: `async function main() {
  const value = await Promise.resolve("ready");
  console.log(value);
}

main();`,
      requiredSnippets: ['async function main()', 'await Promise.resolve("ready")', 'console.log(value)'],
      expectedOutput: ['ready'],
      requirements: ['Use one async function.', 'Use await on a promise.'],
      coachNote: 'async/await is about clearer control flow, not just newer syntax.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'ready',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `async function run() {
  return "done";
}

run().then((value) => console.log(value));`,
      options: ['done', 'Promise', 'undefined', 'Error'],
      correctAnswer: 0,
      explanation: 'The async function resolves to "done", which the promise handler logs.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `function load() {
  const value = await Promise.resolve("ok");
  console.log(value);
}`,
      options: ['Valid code', 'await only works inside async functions or modules', 'Prints ok', 'ReferenceError'],
      correctAnswer: 1,
      explanation: 'await requires an async function body here.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-number-methods-1',
    title: 'Fetching Data from APIs',
    description: 'Request remote data thoughtfully and design code around request lifecycle, response checks, and failure paths.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'fetch starts an HTTP request and returns a promise.',
        `const response = await fetch("/api/tasks");`
      ),
      example(
        'response.ok is the first quick health check before parsing JSON.',
        `if (!response.ok) {
  throw new Error("Request failed");
}`
      ),
      example(
        'API code should keep request concerns separate from DOM concerns.',
        `const data = await response.json();`
      ),
    ],
    practice: {
      task: 'Write the core fetch sequence: await fetch(url), throw if !response.ok, then return await response.json().',
      code: `async function requestJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return await response.json();
}`,
      requiredSnippets: ['await fetch(url)', '!response.ok', 'throw new Error("Request failed")', 'await response.json()'],
      expectedOutput: ['A safe request-json helper.'],
      requirements: ['Check response.ok before parsing.', 'Return parsed JSON data from the helper.'],
      coachNote: 'A fetch helper should define one policy clearly: what counts as success, and what fails fast.',
    },
    predict: {
      label: 'Knowledge Check',
      code: `const response = await fetch(url);
const data = await response.json();`,
      options: ['json() is synchronous', 'json() returns a promise for parsed data', 'fetch returns parsed data directly', 'response.ok is no longer useful'],
      correctAnswer: 1,
      explanation: 'response.json() is asynchronous and resolves to parsed data.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Common Mistake',
      code: `const response = await fetch(url);
if (response.ok) {
  throw new Error("Request failed");
}`,
      options: ['Correct error handling', 'The condition is reversed', 'fetch never sets ok', 'json() must happen first'],
      correctAnswer: 1,
      explanation: 'The error should throw when the response is not ok.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-string-methods-1',
    title: 'Rendering API Data on the Page',
    description: 'Turn fetched objects into stable DOM output without mixing rendering with request logic.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'Rendering is a mapping from state to UI.',
        `results.innerHTML = data.items.map((item) => \`<li>\${item.name}</li>\`).join("");`
      ),
      example(
        'Clear empty-state handling matters as much as the happy path.',
        `results.textContent = "No items found";`
      ),
      example(
        'Render helpers should accept data and produce UI, not perform the fetch themselves.',
        `function renderUser(user) {
  return \`<h2>\${user.name}</h2>\`;
}`
      ),
    ],
    practice: {
      task: 'Write a renderWeatherCard helper that returns a string containing the city name and temperature in one card element.',
      code: `function renderWeatherCard(data) {
  return \`<article class="weather-card"><h2>\${data.city}</h2><p>\${data.temp}°C</p></article>\`;
}`,
      requiredSnippets: ['function renderWeatherCard(data)', '${data.city}', '${data.temp}', 'weather-card'],
      expectedOutput: ['A reusable markup string for one weather card.'],
      requirements: ['Return one string of markup.', 'Include both city and temperature.'],
      coachNote: 'Rendering code is maintainable when the data-to-UI mapping is obvious from the function body.',
    },
    predict: {
      label: 'Knowledge Check',
      code: `results.innerHTML = cards.map(renderWeatherCard).join("");`,
      options: ['It creates one HTML string from all cards', 'It renders only the first card', 'join is invalid for arrays', 'map mutates the DOM directly'],
      correctAnswer: 0,
      explanation: 'map creates an array of strings and join merges them into one HTML block.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'Which split is cleaner?',
      code: `A) fetchWeather gets data and renderWeatherCard only formats markup
B) renderWeatherCard also fetches the data itself`,
      options: ['A', 'B', 'Both equally good', 'Neither is practical'],
      correctAnswer: 0,
      explanation: 'Separating fetch from render keeps side effects and presentation easier to test.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'javascript-loop-while-1',
    title: 'Local Storage and Saving User State',
    description: 'Persist small pieces of UI state in the browser so the app remembers useful choices.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'localStorage stores string values in the browser.',
        `localStorage.setItem("theme", "dark");`
      ),
      example(
        'Use JSON for arrays or objects.',
        `localStorage.setItem("tasks", JSON.stringify(tasks));`
      ),
      example(
        'Read state back during startup before the first render.',
        `const savedTheme = localStorage.getItem("theme");`
      ),
    ],
    practice: {
      task: 'Write code that saves a settings object to localStorage under "settings" and reads it back with JSON.parse.',
      code: `const settings = { theme: "dark", density: "compact" };
localStorage.setItem("settings", JSON.stringify(settings));

const savedSettings = JSON.parse(localStorage.getItem("settings"));`,
      requiredSnippets: ['localStorage.setItem("settings"', 'JSON.stringify(settings)', 'localStorage.getItem("settings")', 'JSON.parse'],
      expectedOutput: ['One save path and one load path for local UI state.'],
      requirements: ['Store an object as JSON.', 'Read it back through JSON.parse.'],
      coachNote: 'Persistence should be explicit: know what key you write, what shape you save, and when you restore it.',
    },
    predict: {
      code: `localStorage.setItem("theme", "dark");
console.log(localStorage.getItem("theme"));`,
      options: ['dark', '"dark"', 'theme', 'undefined'],
      correctAnswer: 0,
      explanation: 'getItem returns the stored string value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `localStorage.setItem("tasks", tasks);`,
      options: ['Best way to save arrays', 'Arrays should usually be stringified first', 'This automatically stores binary data', 'setItem only accepts numbers'],
      correctAnswer: 1,
      explanation: 'Objects and arrays should usually be saved as JSON strings.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'js-modules-1',
    title: 'JavaScript Modules: import and export',
    description: 'Split logic into focused files with explicit public APIs.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'export exposes a value from one module.',
        `export function formatPrice(value) {
  return \`$\${value}\`;
}`
      ),
      example(
        'import pulls that public API into another file.',
        `import { formatPrice } from "./money.js";`
      ),
      example(
        'Modules improve production code by controlling dependencies explicitly.',
        `export const API_BASE = "/api";`
      ),
    ],
    practice: {
      task: 'Write one exported function named formatUser and one import line that brings it into app.js.',
      code: `// user-format.js
export function formatUser(name) {
  return \`User: \${name}\`;
}

// app.js
import { formatUser } from "./user-format.js";`,
      requiredSnippets: ['export function formatUser', 'import { formatUser } from "./user-format.js"'],
      expectedOutput: ['One explicit export and one matching import.'],
      requirements: ['Use named export syntax.', 'Use a matching named import.'],
      coachNote: 'Modules are about explicit boundaries. The important thing is clarity of dependency, not file count.',
    },
    predict: {
      label: 'API Design',
      code: `export function parseUser() {}
export function renderUser() {}
import { parseUser, renderUser } from "./user.js";`,
      options: ['One module can export several named functions', 'Only one export is allowed per file', 'Imports must use default only', 'Modules cannot hold functions'],
      correctAnswer: 0,
      explanation: 'Named exports are designed for exactly this kind of explicit API surface.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Common Mistake',
      code: `import formatUser from "./user-format.js";`,
      options: ['Always valid', 'Only valid if the source uses a default export', 'Named exports automatically work with default import syntax', 'Modules ignore import syntax errors'],
      correctAnswer: 1,
      explanation: 'Default and named imports are different contracts.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'js-classes-1',
    title: 'Classes and Object-Oriented JavaScript',
    description: 'Group state and behavior in class instances when the model really benefits from it.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'Classes define the shape of an object and its methods.',
        `class Counter {
  constructor(start = 0) {
    this.value = start;
  }
}`
      ),
      example(
        'Methods describe behavior on each instance.',
        `increment() {
  this.value += 1;
}`
      ),
      example(
        'Instances are created with new.',
        `const counter = new Counter(2);`
      ),
    ],
    practice: {
      task: 'Create a Counter class with a constructor(start = 0), an increment method, and code that creates Counter(2), increments once, and prints the value.',
      code: `class Counter {
  constructor(start = 0) {
    this.value = start;
  }

  increment() {
    this.value += 1;
  }
}

const counter = new Counter(2);
counter.increment();
console.log(counter.value);`,
      requiredSnippets: ['class Counter', 'constructor(start = 0)', 'increment()', 'new Counter(2)'],
      expectedOutput: ['3'],
      requirements: ['Store the current value on the instance.', 'Increment it through a method.'],
      coachNote: 'Classes are useful when state and behavior naturally travel together.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '3',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `class User {
  constructor(name) {
    this.name = name;
  }
}

console.log(new User("Ava").name);`,
      options: ['User', 'Ava', 'name', 'undefined'],
      correctAnswer: 1,
      explanation: 'The constructor stores the passed name on the instance.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `class Counter {
  increment() {
    value += 1;
  }
}`,
      options: ['Valid method', 'Should usually use this.value for instance state', 'Always private', 'SyntaxError'],
      correctAnswer: 1,
      explanation: 'Without this., the method is not updating a property on the instance.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'js-class-inheritance-1',
    title: 'Prototypes and How Inheritance Really Works',
    description: 'Understand JavaScript inheritance through the prototype chain instead of treating classes as magic.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'Functions can share behavior through their prototype objects.',
        `function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function () {
  return \`\${this.name} makes a sound\`;
};`
      ),
      example(
        'Methods are found by walking the prototype chain.',
        `const dog = new Animal("Nori");
dog.speak();`
      ),
      example(
        'class syntax is a friendlier layer over the same prototype model.',
        `class AnimalClass {
  speak() {}
}`
      ),
    ],
    practice: {
      task: 'Create a constructor function Animal with a prototype method speak that returns "<name> makes a sound", then print the result for "Nori".',
      code: `function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function () {
  return \`\${this.name} makes a sound\`;
};

const dog = new Animal("Nori");
console.log(dog.speak());`,
      requiredSnippets: ['function Animal(name)', 'Animal.prototype.speak', 'new Animal("Nori")', 'this.name'],
      expectedOutput: ['Nori makes a sound'],
      requirements: ['Use a constructor function.', 'Attach speak on the prototype.'],
      coachNote: 'Prototype thinking matters because it explains where methods really come from.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: 'Nori makes a sound',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `function User(name) {
  this.name = name;
}

User.prototype.greet = function () {
  return \`Hi, \${this.name}\`;
};

console.log(new User("Ava").greet());`,
      options: ['Hi, Ava', 'Ava', 'greet', 'undefined'],
      correctAnswer: 0,
      explanation: 'The instance finds greet on the prototype and uses this.name from the object itself.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `const user = new User("Ava");
console.log(Object.getPrototypeOf(user) === User.prototype);`,
      options: ['false', 'true', 'undefined', 'Error'],
      correctAnswer: 1,
      explanation: 'New instances delegate to the constructor’s prototype object.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-function-closures-1',
    title: 'Closures and Persistent Function Memory',
    description: 'Keep data alive inside returned functions and understand why closures are powerful and easy to misuse.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'A closure remembers variables from the scope where it was created.',
        `function makeCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}`
      ),
      example(
        'Each new closure gets its own private state.',
        `const counterA = makeCounter();
const counterB = makeCounter();`
      ),
      example(
        'Closures power factories, memoization, and event helpers.',
        `function makeLabel(prefix) {
  return (value) => \`\${prefix}: \${value}\`;
}`
      ),
    ],
    practice: {
      task: 'Write makeCounter so it returns a function that increments a private count. Call it twice and print the two results.',
      code: `function makeCounter() {
  let count = 0;

  return function () {
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter());
console.log(counter());`,
      requiredSnippets: ['function makeCounter()', 'let count = 0', 'return function ()', 'count += 1'],
      expectedOutput: ['1', '2'],
      requirements: ['Keep count inside makeCounter.', 'Return a function that updates that private value.'],
      coachNote: 'Closures are excellent when state should stay private and tightly scoped.',
      testCases: [
        {
          label: 'Expected output',
          stdin_text: '',
          expected_output: '1\n2',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `function makeLabel(prefix) {
  return (value) => \`\${prefix}: \${value}\`;
}

console.log(makeLabel("Task")("done"));`,
      options: ['Task: done', 'done', 'Task', 'undefined'],
      correctAnswer: 0,
      explanation: 'The returned function closes over prefix and uses it later.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `function makeCounter() {
  let count = 0;
}

const counter = makeCounter();
console.log(counter());`,
      options: ['1', '0', 'TypeError because counter is undefined', 'SyntaxError'],
      correctAnswer: 2,
      explanation: 'makeCounter does not return a function, so counter is undefined.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'javascript-loop-for-of-1',
    title: 'Organizing a Real JavaScript Project',
    description: 'Structure files, state, rendering, and utilities so a codebase can survive real feature growth.',
    category: 'Advanced JavaScript',
    examples: [
      example(
        'Real projects benefit from explicit folders and responsibilities.',
        `src/
  api/
  components/
  state/
  utils/`
      ),
      example(
        'State changes, rendering, and side effects should not all live in one file.',
        `loadTasks();
renderTasks(tasks);`
      ),
      example(
        'Naming folders by responsibility beats throwing everything into helpers.js.',
        `formatDate.js
task-store.js
task-list.js`
      ),
    ],
    practice: {
      task: 'Sketch a small project split with modules for api, state, render, and utils, and show one import that wires them together.',
      code: `// api/tasks.js
export async function fetchTasks() {}

// state/task-store.js
export function setTasks(tasks) {}

// render/task-list.js
export function renderTasks(tasks) {}

// app.js
import { fetchTasks } from "./api/tasks.js";
import { setTasks } from "./state/task-store.js";
import { renderTasks } from "./render/task-list.js";`,
      requiredSnippets: ['export async function fetchTasks', 'export function setTasks', 'export function renderTasks', 'import { fetchTasks }'],
      expectedOutput: ['One small but intentional file split.'],
      requirements: ['Separate fetching, state, and rendering into different modules.', 'Show one composition point in app.js.'],
      coachNote: 'Project organization is mostly about reducing surprise: when a future reader asks “where does this live?”, the answer should be obvious.',
    },
    predict: {
      label: 'Refactor Choice',
      prompt: 'Which structure is easier to maintain?',
      code: `A) api, state, render, and utils in focused files
B) one 1200-line main.js with fetch, DOM, storage, and event code mixed together`,
      options: ['A', 'B', 'Both are equal', 'Neither matters once the app works'],
      correctAnswer: 0,
      explanation: 'Structure becomes a quality issue as soon as a project needs changes, debugging, or collaboration.',
      questionKind: 'refactor-choice',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `formatDate(), fetchTasks(), and renderTasks() all live in helpers.js`,
      options: ['Always fine', 'Can work for tiny scripts, but it scales poorly as responsibilities mix together', 'Required by JavaScript', 'Better than modules'],
      correctAnswer: 1,
      explanation: 'Generic dumping-ground files usually signal that responsibilities are not being separated clearly.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'javascript-array-sort-1',
    title: 'Project 5: Build a Complete Vanilla JavaScript App',
    description: 'Bring state, rendering, persistence, async work, and project structure together into a polished final app plan.',
    category: 'Advanced JavaScript',
    projectBrief: {
      goal: 'Design and implement a complete vanilla JavaScript app with modular files, saved state, and one API-backed feature.',
      inputs: ['User actions, saved local state, and one remote response.'],
      outputs: ['A consistent interactive UI with persistence and one async workflow.'],
      skills: ['modules', 'state management', 'DOM rendering', 'storage', 'async flows'],
    },
    examples: [
      example(
        'The final app is the place where all previous lessons finally need to cooperate.',
        `loadSavedState();
await syncRemoteData();
renderApp();`
      ),
      example(
        'A production-ready app has explicit initialization order.',
        `async function boot() {
  hydrateState();
  bindEvents();
  render();
}`
      ),
      example(
        'Capstones feel professional when they define success states and failure states up front.',
        `showLoading();
showError();
showEmptyState();
showReadyState();`
      ),
    ],
    practice: {
      task: 'Write the top-level boot flow for a vanilla app: restore saved state, bind events, fetch fresh data, and render the UI.',
      code: `async function bootApp() {
  restoreState();
  bindEvents();
  await loadRemoteData();
  renderApp();
}`,
      requiredSnippets: ['async function bootApp()', 'restoreState()', 'bindEvents()', 'await loadRemoteData()', 'renderApp()'],
      expectedOutput: ['One intentional app boot sequence.'],
      requirements: ['Show startup order clearly.', 'Include both local state restoration and remote data loading.'],
      coachNote: 'A final app feels mature when the boot flow explains the product lifecycle in one place.',
    },
    predict: {
      label: 'API Design',
      prompt: 'Which app boundary is stronger?',
      code: `A) bootApp coordinates restoreState, bindEvents, loadRemoteData, and renderApp
B) each click handler directly fetches, mutates storage, and edits the DOM however it wants`,
      options: ['A', 'B', 'Both are equally reliable', 'Neither can ship'],
      correctAnswer: 0,
      explanation: 'A clear app coordinator reduces duplication and keeps startup/debugging easier to reason about.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the production-ready move when the final app feels fragile?',
      code: `A) Add more one-off fixes inside event handlers
B) Clarify the state flow, rendering boundary, and module responsibilities`,
      options: ['A', 'B', 'Both equally strong', 'Nothing should be changed once it works'],
      correctAnswer: 1,
      explanation: 'Production readiness comes from better boundaries and state flow, not from stacking patchy fixes.',
      questionKind: 'refactor-choice',
    },
  }),
];

const javascriptLessons = lessons.map((lessonItem, index) => {
  const difficulty = lessonItem.difficulty || getDifficultyByIndex(index);
  const rewardMeta = buildRewardMeta(difficulty, index, lessons.length);
  const practiceStep = makePracticeStep(lessonItem.practice, lessonItem.id);
  const steps = [
    ...lessonItem.examples.map((item, exampleIndex) => makeTheoryStep(item, exampleIndex)),
    practiceStep,
    makePredictQuestion(lessonItem.predict, 2),
    makePredictQuestion(lessonItem.mistake, 3),
  ];

  return {
    id: lessonItem.id,
    title: lessonItem.title,
    description: lessonItem.description,
    difficulty,
    baseXP: rewardMeta.baseXP,
    baselineTime: rewardMeta.baselineTime,
    language: 'javascript',
    category: lessonItem.category,
    isLocked: false,
    ...(lessonItem.projectBrief ? { projectBrief: lessonItem.projectBrief } : {}),
    content: {
      steps,
    },
  };
});

const javascriptLessonCatalogEntries = javascriptLessons.map((lessonItem, languageIndex) => ({
  id: lessonItem.id,
  title: lessonItem.title,
  language: 'javascript',
  index: 50 + languageIndex,
  languageIndex,
}));

const javascriptLessonMeta = javascriptLessons.map((lessonItem) => ({
  id: lessonItem.id,
  difficulty: lessonItem.difficulty,
  baseXP: lessonItem.baseXP,
  baselineTime: lessonItem.baselineTime,
  language: 'javascript',
}));

const javascriptEvaluationBank = Object.fromEntries(
  lessons
    .map((lessonItem) => [lessonItem.id, buildEvaluationBankEntry(lessonItem)])
    .filter((entry) => entry[1])
);

const generatedLessonFile = `import type { Lesson } from './lessons';

// Generated by scripts/generate-javascript-curriculum.mjs
export const javascriptLessons: Lesson[] = ${JSON.stringify(javascriptLessons, null, 2)} as Lesson[];

export const javascriptLessonCatalogEntries = ${JSON.stringify(javascriptLessonCatalogEntries, null, 2)} as const;
`;

const generatedMetaFile = `export const JAVASCRIPT_LESSON_META = ${JSON.stringify(javascriptLessonMeta, null, 2)};
`;

const generatedEvaluationBankFile = `// Generated by scripts/generate-javascript-curriculum.mjs
export const JAVASCRIPT_LESSON_EVALUATION_BANK = ${JSON.stringify(javascriptEvaluationBank, null, 2)};

export const getJavascriptLessonEvaluationDefinition = (lessonId) =>
  JAVASCRIPT_LESSON_EVALUATION_BANK[String(lessonId || '').trim()] || null;
`;

fs.writeFileSync(
  path.join(projectRoot, 'src', 'data', 'javascriptLessons.generated.ts'),
  generatedLessonFile
);
fs.writeFileSync(
  path.join(projectRoot, 'shared', 'javascript-lesson-meta.js'),
  generatedMetaFile
);
fs.writeFileSync(
  path.join(projectRoot, 'services', 'progression', 'javascript-lesson-evaluation-bank.generated.js'),
  generatedEvaluationBankFile
);

console.log(`Generated ${javascriptLessons.length} JavaScript lessons.`);
console.log(`Execution-backed JavaScript lessons: ${Object.keys(javascriptEvaluationBank).length}`);
