import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  ADVANCED_PYTHON_EVALUATION_OVERRIDES,
  ADVANCED_PYTHON_LESSON_OVERRIDES,
} from './python-advanced-overrides.mjs';
import {
  MID_PYTHON_EVALUATION_OVERRIDES,
  MID_PYTHON_LESSON_OVERRIDES,
} from './python-middle-overrides.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const runtimeCache = new Map();
const LESSON_OVERRIDES = {
  ...MID_PYTHON_LESSON_OVERRIDES,
  ...ADVANCED_PYTHON_LESSON_OVERRIDES,
};
const EVALUATION_OVERRIDES = {
  ...MID_PYTHON_EVALUATION_OVERRIDES,
  ...ADVANCED_PYTHON_EVALUATION_OVERRIDES,
};
const PYTHON_TIER_SCHEDULE = {
  beginnerCount: 15,
  intermediateCount: 19,
};

const CONTEXT_STEPS = {
  'python-recursion-intro':
    'Recursion matters when the same action repeats on a smaller version of the problem. Countdowns, tree traversal, and many divide-and-conquer problems use this pattern.',
  'python-factorial':
    'Factorial is the first recursion problem where the stop condition and the recursive step both matter. It is useful because it forces you to reason about both.',
  'python-complexity-basics':
    'Performance starts to matter as data grows. This lesson is the bridge from “can I code it?” to “will this still feel fast on a bigger input?”',
  'python-two-pointers':
    'Two pointers are a reusable problem-solving pattern. They let you scan from both ends of a list without paying the cost of nested loops.',
  'python-file-reading':
    'Real programs do not only read input from the keyboard. They often load data from files, logs, or saved reports, so safe file access is a core practical skill.',
  'python-file-writing':
    'Writing to files turns your program into something that can save work, reports, and logs. That is the difference between a demo script and a useful tool.',
  'python-error-handling':
    'Production code has to survive bad input and runtime failures. Error handling lets the program recover or explain what went wrong instead of crashing silently.',
  'python-modules':
    'Imports are how real programs stay small. You reach for the standard library first instead of rebuilding every tool from scratch.',
  'python-libraries':
    'Libraries speed up real work. The goal is not to memorize every function, but to know when a built-in tool like random already solves the problem.',
  'python-classes-intro':
    'Classes help you group related data into a single object. This is the starting point for modeling users, carts, counters, and other real entities.',
  'python-constructor':
    'A constructor sets up valid object state from the start. If you understand __init__, you can create objects that are ready to use immediately.',
  'python-methods':
    'Methods attach behavior to an object. This is where objects stop being passive data containers and start doing useful work.',
  'python-attributes-methods':
    'Production object models combine stored data and behavior. This lesson is the bridge from reading attributes to designing small, usable objects.',
  'python-full-class-pattern':
    'This is the first full object pattern in the track: constructor, state updates, and methods working together. It should feel like a tiny production model, not an isolated syntax trick.',
};

const DESCRIPTION_OVERRIDES = {
  'python-complexity-basics':
    'Recognize constant-time access, linear scans, and nested-loop growth before performance becomes a problem.',
  'python-two-pointers':
    'Use left and right indexes to solve array problems with less work than a nested loop.',
  'python-file-reading':
    'Read real file data safely and understand how the file cursor changes after each read.',
  'python-file-writing':
    'Write and append file content without losing data or confusing strings with non-string values.',
  'python-error-handling':
    'Catch common runtime failures and recover with a clear fallback message.',
  'python-modules':
    'Import standard-library tools correctly instead of assuming names already exist.',
  'python-libraries':
    'Use standard-library helpers such as random and math to move faster and write less code.',
  'python-classes-intro':
    'Create simple classes and access attributes through real object instances.',
  'python-constructor':
    'Initialize object state correctly with __init__ and required arguments.',
  'python-methods':
    'Attach behavior to objects and understand how self connects data to actions.',
  'python-attributes-methods':
    'Combine stored data and behavior in one small object model.',
  'python-full-class-pattern':
    'Bring constructor, state changes, and methods together in a complete object pattern.',
};

const PRACTICE_BRIEF_OVERRIDES = {
  'python-first-output': {
    task: 'Print exactly: Hello World',
    requirements: ['Use print() to produce the exact text shown.'],
  },
  'python-built-in-functions': {
    task: 'Read space-separated integers and print a three-line summary with sum, max, and count.',
  },
  'python-calculator-basics': {
    task: 'Read two integers from input and print a four-line calculator report.',
  },
  'python-if-else': {
    task: 'Store the value 15 in age and print "Adult" if age >= 18, otherwise print "Minor".',
  },
  'python-mixed-problems': {
    task: 'Read space-separated integers and print the smallest value, then the largest value.',
  },
  'python-return': {
    task: 'Read three scores, compute the summary helpers, and print the final score report.',
  },
  'python-text-analyzer-basics': {
    task: 'Read one line of text, analyze it, and print the requested summary report.',
  },
  'python-data-processor': {
    task: 'Read a line of numbers, process it, and print the required four-line data report.',
  },
  'python-libraries': {
    task: 'Read space-separated words, store them in a list, and print one random word with random.choice().',
  },
  'python-full-class-pattern': {
    task: 'Build a PracticeTracker, update its progress, and print the final status.',
  },
};

const BANNED_PROMPT_PATTERNS = [
  { pattern: /\bwrite a program that\b/i, reason: 'Use direct task verbs instead of worksheet phrasing.' },
  { pattern: /\bdisplays?\b/i, reason: 'Use print / printed output wording instead of display.' },
];

const PROMPT_RULE_SNIPPET_MAP = [
  { test: (snippet) => snippet.includes('input('), rule: 'Read the input before building the result.' },
  { test: (snippet) => snippet.startsWith('def '), rule: 'Define the required function before calling it.' },
  { test: (snippet) => snippet.startsWith('class '), rule: 'Use the exact class name from the prompt.' },
  { test: (snippet) => snippet.includes('return'), rule: 'Return the result from the helper instead of printing inside it.' },
  { test: (snippet) => snippet === 'for' || snippet.includes('for '), rule: 'Use a loop instead of repeating the operation manually.' },
  { test: (snippet) => snippet === 'while' || snippet.includes('while '), rule: 'Use a while loop to control repetition.' },
  { test: (snippet) => snippet.includes('try:'), rule: 'Handle the failing case with try / except.' },
  { test: (snippet) => snippet.includes('with open('), rule: 'Use a context manager to work with the file safely.' },
  { test: (snippet) => snippet.includes('sorted('), rule: 'Sort the values before printing the report.' },
  { test: (snippet) => snippet.includes('append('), rule: 'Update the list with append() before printing it.' },
  { test: (snippet) => snippet.includes('split('), rule: 'Split the input into separate values before processing it.' },
  { test: (snippet) => snippet.includes('self.'), rule: 'Store state on the instance, not in loose variables.' },
];

const QUESTION_PROMPT_OVERRIDES = {
  'python-input:predict-output': `Q2 (Predict Output)

Assume the user enters 2.

x = input()
print(x)`,
  'python-file-reading:predict-output': `Q2 (Predict Output)

What kind of object is f?

with open("data.txt", "r") as f:
    print(type(f))`,
};

const EXPLANATION_OVERRIDES = {
  'python-functions:common-mistake': 'Defining a function does not run it. You must call hello() to print Hi.',
  'python-parameters:common-mistake': 'greet() is missing the required name argument, so Python raises a TypeError.',
  'python-return:common-mistake': 'f(3) prints 3, then returns None by default, so print(f(3)) shows 3 and then None.',
  'python-file-writing:common-mistake': 'write() expects a string. Passing the integer 123 directly raises a TypeError.',
  'python-modules:common-mistake': 'math was never imported, so Python raises a NameError when math.sqrt(9) runs.',
  'python-classes-intro:common-mistake': 'The instance has no attribute y, so Python raises an AttributeError.',
  'python-constructor:common-mistake': 'A() is missing the required x argument, so Python raises a TypeError.',
  'python-data-processor:common-mistake': 'sum(nums) / len(nums) divides by zero when nums is empty, so Python raises a ZeroDivisionError.',
};

const EXECUTION_STDIN_CASES = {
  'python-input': [
    { label: 'Public greeting', stdinText: 'Alex\n' },
    { label: 'Hidden greeting', stdinText: 'Sam\n', hidden: true },
  ],
  'python-calculator-basics': [
    { label: 'Public sum', stdinText: '2\n3\n' },
    { label: 'Hidden negative value', stdinText: '10\n-4\n', hidden: true },
  ],
};

const STATIC_FALLBACK_IDS = new Set(['python-file-reading', 'python-file-writing']);

const COMPARE_MODE_OVERRIDES = {
  'python-booleans': 'boolean',
  'python-libraries': 'one_of',
};

const EXPECTED_JSON_OVERRIDES = {
  'python-booleans': true,
  'python-libraries': ['A', 'B', 'C'],
};

const GLOBAL_TEXT_FIXES = {
  'Dictionary με key-value pairs.': 'Dictionary with key-value pairs.',
};

const POST_NORMALIZE_TEXT_FIXES = {
  'It catches a runtime error.': 'The except block runs when a runtime error happens.',
  'It gets a conversion error.': 'The except block catches an invalid type conversion.',
  'except is not executed if there is no error.': 'The except block does not run when no error occurs.',
  'It always causes an error': 'It always raises an error',
  'Write a program that tries to do 10 / 0 and if there is an error it displays Cannot divide.':
    'Write a program that tries to compute 10 / 0 and, if an error happens, prints Cannot divide.',
};

const LESSON_COPY_FIXES = {
  'Displays text on the screen.': 'Use print() to send text to the console.',
  'print() displays a string.': 'print() sends the string to the console exactly as written.',
  'Prints a variable.': 'print(message) shows the value stored in message.',
  'Concatenates strings.': 'The + operator joins strings into one result.',
  'Combination.': 'The printed result combines fixed text with another value.',
  'Stores a number.': 'This stores a number in a variable so you can reuse it later.',
  'Float.': '2.5 is a float, so Python keeps the decimal part.',
  'String.': '"Sam" is a string value.',
  'Convert to string.': 'Use str() to convert the number into a string before printing it.',
  'Addition.': 'The + operator adds the two numbers.',
  'Subtraction.': 'The - operator subtracts the second number from the first.',
  'Multiplication.': 'The * operator multiplies the two numbers.',
  'Float result.': 'The / operator returns a float result in Python.',
  'Concatenation of strings.': 'The + operator joins strings into one result.',
  'Space.': 'The space inside the string is printed exactly as written.',
  'It remains a string.': 'Joining with "1" keeps the final value as a string.',
  'Input is a string.': 'input() returns text, so the value starts as a string.',
  'String concat.': 'Without conversion, + joins the input strings together.',
  'Convert to int.': 'Use int() when you need numeric input for arithmetic.',
  'Returns True.': 'The comparison evaluates to True.',
  'Checks if two values are equal.': '== compares two values for equality.',
  'Checks if two values are different.': '!= compares two values and returns True when they differ.',
  'Boolean variable.': 'Booleans store True or False directly in a variable.',
  'Executed only if the condition is True.': 'The indented block runs only when the condition is True.',
  'Checks for equality.': 'This condition compares the current value to the expected one.',
  'We can compare strings.': 'if statements can compare strings, not just numbers.',
  'True activates the block.': 'A True boolean value runs the if block.',
  'else is executed when the condition is False.': 'The else block runs when the condition is False.',
  'Two different branches.': 'if / else gives the program two possible paths.',
  'Choice based on the value.': 'The program chooses a branch based on the current value.',
  'The boolean specifies the result.': 'The boolean decides which branch runs.',
  'Correct code.': 'This version is syntactically correct and runs as expected.',
  'The variable must be defined before it can be used.': 'Define the variable before you try to print or use it.',
  'Correct concatenation strings.': 'Both values are strings, so concatenation works correctly.',
  'Indentation is required.': 'Python requires indentation after the colon to define the block.',
  'List of numbers.': 'A list can store several numbers in one variable.',
  'List of strings.': 'A list can store text values as separate items.',
  'A list can have different types.': 'Lists can hold mixed types, though consistent types are easier to work with.',
  'A list can have different types': 'Lists can hold mixed types, though consistent types are easier to work with.',
  'List with one item.': 'A list can still work with a single item.',
  'Nested list.': 'A nested list stores lists inside another list.',
  'Dictionary with key-value pairs.': 'A dictionary stores values under named keys.',
  'Safe access.': 'get() reads a key safely and can return None when it is missing.',
  'Unique set elements.': 'A set stores only unique values.',
  'Duplicates are removed.': 'Sets automatically remove duplicate values.',
  'A small tool usually prints more than one useful line.': 'Useful tools usually print more than one line of output.',
};

const BANNED_THEORY_COPY = new Set(Object.keys(LESSON_COPY_FIXES));

function normalizeText(value) {
  const normalized = String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return POST_NORMALIZE_TEXT_FIXES[GLOBAL_TEXT_FIXES[normalized] || normalized] || GLOBAL_TEXT_FIXES[normalized] || normalized;
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function toCommentKey(lessonId, questionKind) {
  return `${lessonId}:${questionKind}`;
}

function inferSpecificErrorOption(step) {
  return step.options.find((option) => /(?:[A-Za-z]+Error|RecursionError)$/.test(option));
}

function improveExplanation(lessonId, step) {
  const override = EXPLANATION_OVERRIDES[toCommentKey(lessonId, step.questionKind)];
  if (override) {
    return override;
  }

  const specificError = inferSpecificErrorOption(step);
  let explanation = normalizeText(step.explanation);
  if (specificError) {
    explanation = explanation
      .replace(/\braises an error\b/gi, `raises ${articleFor(specificError)} ${specificError}`)
      .replace(/\braises error\b/gi, `raises ${articleFor(specificError)} ${specificError}`)
      .replace(/\ban error\b/gi, `${articleFor(specificError)} ${specificError}`);
  }

  return explanation;
}

function improveLessonCopy(value) {
  const normalized = normalizeText(value);
  return LESSON_COPY_FIXES[normalized] || normalized;
}

const cleanPracticePrompt = (prompt) =>
  String(prompt || '')
    .replace(/^Q1\s*\(Coding\)\s*\n?/i, '')
    .trim();

const cleanPromptLine = (line) =>
  normalizeText(line)
    .replace(/^-\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();

const trimTrailingPeriod = (text) => String(text || '').replace(/\.$/, '').trim();

const toSentenceCase = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const deriveLiteralOutputLinesFromCode = (solution) =>
  [...String(solution || '').matchAll(/^\s*print\((?:f)?["']([^"']+)["']\)\s*$/gm)]
    .map((match) => cleanPromptLine(match[1]))
    .filter(Boolean);

const pushUnique = (items, value) => {
  const cleaned = cleanPromptLine(value);
  if (cleaned && !items.includes(cleaned)) {
    items.push(cleaned);
  }
};

function splitInputInstruction(sentence) {
  const normalizedSentence = trimTrailingPeriod(cleanPromptLine(sentence));
  const splitMatch =
    normalizedSentence.match(/^(Read .+? from (?:standard )?input)\s*,\s*(.+)$/i) ||
    normalizedSentence.match(/^(Read .+? from (?:standard )?input)\s+and\s+(.+)$/i);

  if (splitMatch) {
    return {
      input: `${trimTrailingPeriod(splitMatch[1])}.`,
      remainder: toSentenceCase(trimTrailingPeriod(splitMatch[2])),
    };
  }

  if (/^Read .+? from (?:standard )?input$/i.test(normalizedSentence)) {
    return {
      input: `${normalizedSentence}.`,
      remainder: '',
    };
  }

  return {
    input: '',
    remainder: normalizedSentence,
  };
}

function getPracticePublicCase(lessonId) {
  const evaluationOverride = EVALUATION_OVERRIDES[lessonId] || null;
  const testCases =
    evaluationOverride?.testCases ||
    EXECUTION_STDIN_CASES[lessonId] ||
    [{ label: 'Expected output', stdinText: '' }];

  return testCases.find((testCase) => !testCase.hidden) || testCases[0] || null;
}

function derivePracticePreviewOutput(lessonId, solution) {
  const compareMode = EVALUATION_OVERRIDES[lessonId]?.compare_mode || COMPARE_MODE_OVERRIDES[lessonId] || null;
  if (compareMode === 'one_of') {
    return [];
  }

  const publicCase = getPracticePublicCase(lessonId);
  if (!publicCase) {
    return [];
  }

  try {
    return runPythonProgram(
      solution,
      publicCase.stdin_text ?? publicCase.stdinText ?? '',
      publicCase.files || [],
    )
      .split('\n')
      .map(cleanPromptLine)
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

const rewriteTaskText = (lessonId, rawTask, outputLines = []) => {
  const override = PRACTICE_BRIEF_OVERRIDES[lessonId]?.task;
  if (override) return override;

  const singleOutput = outputLines.length === 1 ? outputLines[0] : '';
  let task = String(rawTask || '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^Write a program that displays:\s*$/i.test(task) && singleOutput) {
    return `Print exactly: ${singleOutput}`;
  }

  const printLiteralMatch = task.match(/^Prints?:\.?\s*(.+)$/i);
  if (printLiteralMatch) {
    return `Print exactly: ${trimTrailingPeriod(printLiteralMatch[1])}`;
  }

  task = task
    .replace(/^Create variable\b/i, 'Create the variable')
    .replace(/^Stores\b/i, 'Store')
    .replace(/^Reads\b/i, 'Read')
    .replace(/^Creates\b/i, 'Create')
    .replace(/^Defines\b/i, 'Define')
    .replace(/^Uses\b/i, 'Use')
    .replace(/^Splits\b/i, 'Split')
    .replace(/^Converts\b/i, 'Convert')
    .replace(/^Write a program that\s+/i, '')
    .replace(/^Write a loop that\s+/i, 'Use a loop to ')
    .replace(/^Use a for loop that\s+/i, 'Use a for loop to ')
    .replace(/^Write a recursive function named\s+/i, 'Define recursive function ')
    .replace(/^Write a function named\s+/i, 'Define function ')
    .replace(/^Write a function\s+/i, 'Define function ')
    .replace(/^Write a program\s+/i, '')
    .replace(/^Create a class named\s+/i, 'Create class ')
    .replace(/\bdisplays?\b/gi, 'prints')
    .replace(/\bdisplay it\b/gi, 'print it')
    .replace(/\bdisplay the result\b/gi, 'print the result')
    .replace(/\bchecks if\b/i, 'Evaluate')
    .replace(/^Create a list of (.+?) items and print it$/i, 'Create the list [$1] and print it')
    .replace(/^Create a list of (.+?) items and display it$/i, 'Create the list [$1] and print it')
    .replace(/^Create list \[(.+?)\] and prints its second element$/i, 'Create the list [$1] and print its second element')
    .replace(/^Create list \[(.+?)\] and print its second element$/i, 'Create the list [$1] and print its second element')
    .replace(/^Create a set with the elements (.+?) and print it$/i, 'Create a set from $1 and print it')
    .replace(/^Create a set with the elements (.+?) and display it$/i, 'Create a set from $1 and print it')
    .replace(/^Calculates and prints\b/i, 'Calculate and print')
    .replace(/^Ask for ([A-Za-z_][A-Za-z0-9_]*) and prints: (.+)$/i, 'Read $1 and print: $2')
    .replace(/\band prints\b/gi, 'and print')
    .replace(/\band returns\b/gi, 'and return')
    .replace(/\botherwise\s+("[^"]+"|'[^']+')/gi, 'otherwise print $1')
    .replace(/\bto prints\b/gi, 'to print')
    .replace(/\bto returns\b/gi, 'to return')
    .replace(/\bto sorts\b/gi, 'to sort')
    .replace(/\bbut stops\b/gi, 'but stop');

  if (/^Evaluate\s+\d/.test(task) && !/\bprint\b/i.test(task)) {
    task = `${trimTrailingPeriod(task)} and print the result`;
  }

  if (!task && singleOutput) {
    task = `Print exactly: ${singleOutput}`;
  }

  return toSentenceCase(trimTrailingPeriod(task));
};

function appendNamingRequirements(task, requirements) {
  const variableMatch = task.match(/^Store\b.+?\bin\s+([A-Za-z_][A-Za-z0-9_]*)\b(?:,|\s+and\b|\s+then\b|\s+before\b|$)/i);
  if (variableMatch) {
    pushUnique(requirements, `Use the variable name ${variableMatch[1]}.`);
  }

  const classMatch = task.match(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
  if (classMatch) {
    pushUnique(requirements, `Use the class name ${classMatch[1]}.`);
  }

  const functionMatch = task.match(/\b(?:recursive\s+)?function(?:\s+named)?\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
  if (functionMatch) {
    pushUnique(requirements, `Use the function name ${functionMatch[1]}.`);
  }
}

function deriveOutputDescription(lessonId, task, expectedOutput = [], lesson = null) {
  if (expectedOutput.length) {
    return '';
  }

  const override = PRACTICE_BRIEF_OVERRIDES[lessonId]?.outputDescription;
  if (override) {
    return override;
  }

  if (lesson?.projectBrief?.outputs?.length) {
    return `Your output should cover: ${lesson.projectBrief.outputs.join(', ')}.`;
  }

  const compareMode = EVALUATION_OVERRIDES[lessonId]?.compare_mode || COMPARE_MODE_OVERRIDES[lessonId] || null;
  const expectedJson = EVALUATION_OVERRIDES[lessonId]?.expected_json ?? EXPECTED_JSON_OVERRIDES[lessonId];
  if (compareMode === 'one_of' && Array.isArray(expectedJson) && expectedJson.length) {
    return `Print one valid value from [${expectedJson.map((value) => JSON.stringify(value)).join(', ')}].`;
  }

  const normalizedTask = cleanPromptLine(task);
  if (/one pair per line/i.test(normalizedTask)) return 'Print one pair on each line.';
  if (/one by one/i.test(normalizedTask) || /on its own line/i.test(normalizedTask)) return 'Print one value per line.';
  if (/print both values/i.test(normalizedTask)) return 'Print both stored values on one line.';
  if (/print its second element/i.test(normalizedTask)) return 'Print the requested list item.';
  if (/print its keys/i.test(normalizedTask)) return 'Print the dictionary keys view.';
  if (/print the final set contents/i.test(normalizedTask)) return 'Print the resulting set.';
  if (/print the list\b/i.test(normalizedTask) || /print it\b/i.test(normalizedTask) && /\blist\b/i.test(normalizedTask)) {
    return 'Print the final list object.';
  }
  if (/print the final status/i.test(normalizedTask)) return 'Print the final status line.';
  if (/print the result/i.test(normalizedTask)) return 'Print the computed result.';
  return '';
}

const normalizePracticeCoachNote = (value) =>
  normalizeText(value)
    .replace(/^This checkpoint expects /i, 'Start by ')
    .replace(/^This solution should /i, 'Your solution should ');

function buildPracticeBrief(lessonId, prompt, solution, explanation, requiredSnippets = [], lesson = null) {
  const override = PRACTICE_BRIEF_OVERRIDES[lessonId] || {};
  const cleanedPrompt = cleanPracticePrompt(prompt);
  const brief = {
    task: '',
    inputs: [],
    requirements: [],
    expectedOutput: [],
    outputDescription: '',
    coachNote: '',
  };

  let remainder = cleanedPrompt;
  const exactFormatMatch = cleanedPrompt.match(/^(.*?)(?:\s*)Print\s+.+?\s+in\s+this\s+exact\s+format:\s*\n([\s\S]+)$/i);
  if (exactFormatMatch) {
    remainder = cleanPromptLine(exactFormatMatch[1]);
    brief.expectedOutput = exactFormatMatch[2]
      .split('\n')
      .map(cleanPromptLine)
      .filter(Boolean);
    pushUnique(brief.requirements, 'Keep the labels, order, and spacing exactly as shown.');
  } else if (/^Write a program that displays:\s*$/i.test(cleanPromptLine(cleanedPrompt)) && cleanedPrompt.includes('\n')) {
    const lines = cleanedPrompt
      .split('\n')
      .map(cleanPromptLine)
      .filter(Boolean);
    remainder = lines[0];
    brief.expectedOutput = lines.slice(1);
  }

  const sentences = remainder
    .split(/(?<=[.!?])\s+|\n+/)
    .map(cleanPromptLine)
    .filter(Boolean);

  const taskSentences = [];
  for (const sentence of sentences) {
    const { input, remainder: remainingTask } = splitInputInstruction(sentence);
    if (input) {
      pushUnique(brief.inputs, input);
    }
    if (!remainingTask) {
      continue;
    }
    taskSentences.push(remainingTask);
  }

  if (!brief.inputs.length && /input\(/.test(solution || '')) {
    pushUnique(brief.inputs, 'Read the required value or values from standard input.');
  }

  if (!brief.expectedOutput.length) {
    const literalOutputs = /input\(/.test(solution || '') ? [] : deriveLiteralOutputLinesFromCode(solution);
    if (literalOutputs.length === 1 && literalOutputs[0].length <= 40) {
      brief.expectedOutput = [literalOutputs[0]];
    } else {
      brief.expectedOutput = derivePracticePreviewOutput(lessonId, solution);
    }
  }

  const rawTask =
    taskSentences.join('. ') ||
    (brief.inputs.length && brief.expectedOutput.length
      ? 'Read the input and print the report in the exact format shown.'
      : cleanPromptLine(cleanedPrompt) || cleanPromptLine(explanation));
  brief.task = rewriteTaskText(lessonId, rawTask, brief.expectedOutput);

  for (const snippet of requiredSnippets) {
    const mappedRequirement = PROMPT_RULE_SNIPPET_MAP.find((entry) => entry.test(snippet))?.rule;
    if (mappedRequirement) {
      pushUnique(brief.requirements, mappedRequirement);
    }
  }

  if (/recursive function/i.test(cleanedPrompt)) {
    pushUnique(brief.requirements, 'Use a base case before the recursive call.');
  }
  if (/otherwise/i.test(cleanedPrompt)) {
    pushUnique(brief.requirements, 'Handle both branches of the condition.');
  }
  if (/call complete\(\) n times/i.test(cleanedPrompt)) {
    pushUnique(brief.requirements, 'Apply the update method n times before printing the final status.');
  }
  if (/print exactly/i.test(brief.task)) {
    pushUnique(brief.requirements, 'Match the expected text exactly.');
  }

  appendNamingRequirements(brief.task, brief.requirements);

  if (lesson?.projectBrief) {
    brief.task = override.task || lesson.projectBrief.goal || brief.task;
    brief.inputs = override.inputs || lesson.projectBrief.inputs || brief.inputs;
    brief.requirements = override.requirements || (brief.requirements.length ? brief.requirements : lesson.projectBrief.skills);
  } else {
    brief.inputs = override.inputs || brief.inputs;
    brief.requirements = override.requirements || brief.requirements;
  }

  brief.expectedOutput = override.expectedOutput || brief.expectedOutput;
  brief.outputDescription = deriveOutputDescription(lessonId, brief.task, brief.expectedOutput, lesson);
  brief.coachNote = override.coachNote || normalizePracticeCoachNote(explanation);

  brief.inputs = [...new Set(brief.inputs.map(cleanPromptLine).filter(Boolean))];
  brief.requirements = [...new Set(brief.requirements.map(cleanPromptLine).filter(Boolean))];
  brief.expectedOutput = [...new Set(brief.expectedOutput.map(cleanPromptLine).filter(Boolean))];
  brief.outputDescription = cleanPromptLine(brief.outputDescription);
  brief.coachNote = cleanPromptLine(brief.coachNote);

  return brief;
}

function lintLessonCopy(lessons) {
  const issues = [];
  const taskOpeners = new Map();

  for (const lesson of lessons) {
    const practiceStep = lesson.content.steps.find((step) => step.type === 'practice');
    if (!practiceStep) continue;

    const task = cleanPromptLine(practiceStep.practiceBrief?.task || practiceStep.content || '');
    if (!task) {
      issues.push(`${lesson.id}: missing practice task`);
      continue;
    }

    for (const { pattern, reason } of BANNED_PROMPT_PATTERNS) {
      if (pattern.test(task)) {
        issues.push(`${lesson.id}: "${task}" -> ${reason}`);
      }
    }

    if (/\bto prints\b/i.test(task) || /\bto returns\b/i.test(task) || /\bbut stops\b/i.test(task) || /\band prints\b/i.test(task)) {
      issues.push(`${lesson.id}: "${task}" -> fix imperative grammar in task text`);
    }

    const opener = task.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    taskOpeners.set(opener, (taskOpeners.get(opener) || 0) + 1);

    const brief = practiceStep.practiceBrief || {};
    const code = String(practiceStep.code || '');
    const classMatch = task.match(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (classMatch && !new RegExp(`\\bclass\\s+${classMatch[1]}\\b`).test(code)) {
      issues.push(`${lesson.id}: practice task names class ${classMatch[1]} but the reference solution does not.`);
    }

    const functionMatch = task.match(/\b(?:recursive\s+)?function(?:\s+named)?\s+([A-Za-z_][A-Za-z0-9_]*)\b/i);
    if (functionMatch && !new RegExp(`\\bdef\\s+${functionMatch[1]}\\b`).test(code)) {
      issues.push(`${lesson.id}: practice task names function ${functionMatch[1]} but the reference solution does not.`);
    }

    const variableMatch = task.match(/^Store\b.+?\bin\s+([A-Za-z_][A-Za-z0-9_]*)\b(?:,|\s+and\b|\s+then\b|\s+before\b|$)/i);
    if (variableMatch && !new RegExp(`\\b${variableMatch[1]}\\s*=`).test(code)) {
      issues.push(`${lesson.id}: practice task names variable ${variableMatch[1]} but the reference solution does not.`);
    }

    if (brief.expectedOutput?.length && !brief.expectedOutput.some((line) => /<.+?>/.test(line))) {
      const previewOutput = derivePracticePreviewOutput(lesson.id, code);
      if (previewOutput.length && previewOutput.join('\n') !== brief.expectedOutput.join('\n')) {
        issues.push(`${lesson.id}: expected output preview does not match the reference solution.`);
      }
    }

    for (const step of lesson.content.steps) {
      if (step.type !== 'theory') continue;
      const text = cleanPromptLine(step.content);
      if (BANNED_THEORY_COPY.has(text)) {
        issues.push(`${lesson.id}: "${text}" -> replace filler theory copy with stronger explanatory language`);
      }
    }
  }

  if (issues.length) {
    throw new Error(`Practice prompt lint failed:\n${issues.join('\n')}`);
  }

  const repeatedOpeners = [...taskOpeners.entries()]
    .filter(([, count]) => count > 8)
    .map(([opener, count]) => `${opener} (${count})`);
  if (repeatedOpeners.length) {
    console.warn(`Practice prompt lint warning: repeated task openers -> ${repeatedOpeners.join(', ')}`);
  }
}

function loadTsModule(filePath) {
  const resolved = path.resolve(projectRoot, filePath);
  if (runtimeCache.has(resolved)) {
    return runtimeCache.get(resolved).exports;
  }

  const source = fs.readFileSync(resolved, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: resolved,
  }).outputText;

  const module = { exports: {} };
  runtimeCache.set(resolved, module);

  const dirname = path.dirname(resolved);
  function localRequire(specifier) {
    if (specifier.startsWith('.')) {
      const tsPath = path.resolve(dirname, specifier.endsWith('.ts') ? specifier : `${specifier}.ts`);
      const jsToTsPath = path.resolve(dirname, specifier.endsWith('.js') ? specifier.replace(/\.js$/, '.ts') : `${specifier}.ts`);
      if (fs.existsSync(tsPath)) return loadTsModule(path.relative(projectRoot, tsPath));
      if (fs.existsSync(jsToTsPath)) return loadTsModule(path.relative(projectRoot, jsToTsPath));
    }

    return require(specifier);
  }

  const script = new vm.Script(`(function(exports, require, module, __filename, __dirname){${transpiled}\n})`, {
    filename: resolved,
  });
  script.runInThisContext()(module.exports, localRequire, module, resolved, dirname);
  return module.exports;
}

function writeSupportFiles(baseDir, files = []) {
  for (const file of files) {
    const relativePath = String(file?.path || '').trim();
    if (!relativePath) continue;
    const targetPath = path.resolve(baseDir, relativePath);
    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, String(file?.contents || ''), 'utf8');
  }
}

function runPythonProgram(code, stdinText = '', files = []) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'codhak-python-lesson-'));
  try {
    const filePath = path.join(tempDir, 'lesson.py');
    writeFileSync(filePath, code, 'utf8');
    writeSupportFiles(tempDir, files);
    const result = spawnSync('py', ['-3', 'lesson.py'], {
      cwd: tempDir,
      input: stdinText,
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || `Python exited with ${result.status}`);
    }

    return normalizeText(result.stdout);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function applyLessonOverrides(lessons) {
  return lessons.map((lesson) => LESSON_OVERRIDES[lesson.id] || lesson);
}

function getScheduledDifficulty(index) {
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount) return 'Beginner';
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount + PYTHON_TIER_SCHEDULE.intermediateCount) return 'Intermediate';
  return 'Advanced';
}

function applyDifficultySchedule(lessons) {
  return lessons.map((lesson, index) => ({
    ...lesson,
    difficulty: getScheduledDifficulty(index),
  }));
}

function buildQuestionKind(index) {
  if (index === 0) return 'predict-output';
  if (index === 1) return 'common-mistake';
  return 'knowledge-check';
}

function buildQuestionPrompt(lessonId, questionKind, question) {
  const override = QUESTION_PROMPT_OVERRIDES[toCommentKey(lessonId, questionKind)];
  if (override) return override;
  if (questionKind === 'common-mistake') {
    return normalizeText(question).replace(/^Q3\s*\(Trap\)/i, 'Q3 (Common Mistake)');
  }
  return normalizeText(question);
}

function enhanceLessons(rawLessons) {
  return rawLessons.map((lesson) => {
    let questionIndex = 0;
    let steps = lesson.content.steps.map((step) => {
      if (step.type === 'theory') {
        return {
          ...step,
          title: normalizeText(step.title),
          content: improveLessonCopy(step.content),
          explanation: improveLessonCopy(step.explanation),
          stepKind: step.stepKind || 'example',
        };
      }

      if (step.type === 'practice') {
        const evaluationMode = STATIC_FALLBACK_IDS.has(lesson.id) ? 'static' : 'execution';
        const normalizedRequiredSnippets = Array.isArray(step.requiredSnippets)
          ? step.requiredSnippets.map((snippet) => normalizeText(snippet))
          : [];
        const practiceBrief = buildPracticeBrief(
          lesson.id,
          step.content,
          step.code,
          step.explanation,
          normalizedRequiredSnippets,
          lesson,
        );
        return {
          ...step,
          title: 'Q1',
          content: practiceBrief.task,
          practiceBrief,
          explanation: practiceBrief.coachNote,
          evaluationMode,
          evaluationId: evaluationMode === 'execution' ? lesson.id : undefined,
          requiredSnippets: normalizedRequiredSnippets,
        };
      }

      const questionKind = buildQuestionKind(questionIndex);
      questionIndex += 1;
      const normalizedStep = {
        ...step,
        questionKind,
        question: buildQuestionPrompt(lesson.id, questionKind, step.question),
        options: step.options.map((option) => normalizeText(option)),
      };
      normalizedStep.explanation = improveExplanation(lesson.id, normalizedStep);
      return normalizedStep;
    });

    if (CONTEXT_STEPS[lesson.id] && !steps.some((step) => step.type === 'theory' && step.stepKind === 'context')) {
      const contextText = CONTEXT_STEPS[lesson.id];
      steps = [
        {
          title: 'Why this matters',
          content: contextText,
          code: '',
          explanation: contextText,
          type: 'theory',
          practiceMode: 'none',
          stepKind: 'context',
        },
        ...steps,
      ];
    }

    return {
      ...lesson,
      description: normalizeText(DESCRIPTION_OVERRIDES[lesson.id] || lesson.description),
      content: { steps },
    };
  });
}

function buildExecutionBank(lessons) {
  const bank = {};

  for (const lesson of lessons) {
    const practiceStep = lesson.content.steps.find((step) => step.type === 'practice');
    if (!practiceStep || practiceStep.evaluationMode !== 'execution') {
      continue;
    }

    const evaluationOverride = EVALUATION_OVERRIDES[lesson.id] || null;
    const compareMode = evaluationOverride?.compare_mode || COMPARE_MODE_OVERRIDES[lesson.id] || null;
    const expectedJson = evaluationOverride?.expected_json ?? EXPECTED_JSON_OVERRIDES[lesson.id];
    const baseCases =
      evaluationOverride?.testCases ||
      EXECUTION_STDIN_CASES[lesson.id] ||
      [{ label: 'Expected output', stdinText: '' }];

    const testCases = baseCases.map((testCase) => {
      const testCaseCompareMode = testCase.compare_mode || compareMode;
      const testCaseExpectedJson = testCase.expected_json ?? expectedJson;

      if (testCaseCompareMode) {
        return {
          label: testCase.label,
          stdin_text: testCase.stdin_text ?? testCase.stdinText ?? '',
          expected_json: testCaseExpectedJson,
          compare_mode: testCaseCompareMode,
          files: testCase.files || undefined,
          hidden: Boolean(testCase.hidden),
        };
      }

      const expected_output =
        testCase.expected_output ??
        runPythonProgram(
          practiceStep.code,
          testCase.stdin_text ?? testCase.stdinText ?? '',
          testCase.files || [],
        );
      return {
        label: testCase.label,
        stdin_text: testCase.stdin_text ?? testCase.stdinText ?? '',
        expected_output,
        files: testCase.files || undefined,
        hidden: Boolean(testCase.hidden),
      };
    });

    bank[lesson.id] = {
      language: 'python',
      requiredSnippets: practiceStep.requiredSnippets || [],
      testCases,
    };
  }

  return bank;
}

function writeGeneratedLessonsFile(lessons) {
  const outputPath = path.resolve(projectRoot, 'src/data/pythonLessons.generated.ts');
  const contents = `import type { Lesson } from './lessons';

// Generated by scripts/generate-python-curriculum.mjs
export const pythonLessons: Lesson[] = ${JSON.stringify(lessons, null, 2)} as Lesson[];

export const pythonLessonCatalogEntries = pythonLessons.map((lesson, languageIndex) => ({
  id: lesson.id,
  title: lesson.title,
  language: 'python' as const,
  index: languageIndex,
  languageIndex,
}));
`;

  fs.writeFileSync(outputPath, contents, 'utf8');
}

function writeGeneratedEvaluationBank(bank) {
  const outputPath = path.resolve(projectRoot, 'services/progression/python-lesson-evaluation-bank.generated.js');
  const contents = `// Generated by scripts/generate-python-curriculum.mjs
export const PYTHON_LESSON_EVALUATION_BANK = ${JSON.stringify(bank, null, 2)};

export const getPythonLessonEvaluationDefinition = (lessonId) =>
  PYTHON_LESSON_EVALUATION_BANK[String(lessonId || '').trim()] || null;
`;

  fs.writeFileSync(outputPath, contents, 'utf8');
}

const { pythonLessons: sourceLessons } = loadTsModule('src/data/pythonLessons.ts');
const enhancedLessons = applyDifficultySchedule(
  enhanceLessons(applyLessonOverrides(JSON.parse(JSON.stringify(sourceLessons))))
);
lintLessonCopy(enhancedLessons);
const evaluationBank = buildExecutionBank(enhancedLessons);

writeGeneratedLessonsFile(enhancedLessons);
writeGeneratedEvaluationBank(evaluationBank);

const greekCount = JSON.stringify(enhancedLessons).match(/[\u0370-\u03FF]/g)?.length || 0;
console.log(`Generated ${enhancedLessons.length} Python lessons.`);
console.log(`Execution-backed lessons: ${Object.keys(evaluationBank).length}`);
console.log(`Greek characters remaining in generated export: ${greekCount}`);
