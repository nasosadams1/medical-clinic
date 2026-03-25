import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const runtimeCache = new Map();

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

const PRACTICE_PROMPT_OVERRIDES = {
  'python-debugging-basics': 'Fix the code so it prints Hello correctly.',
  'python-parameters': 'Write a function square(x) that prints the square of x, then call it with 4.',
  'python-return': 'Write a function double(x) that returns x * 2, then print the result for 5.',
  'python-string-operations': 'Create the string "a-b-c" and split it with split("-"), then print the result.',
  'python-dict-methods': 'Create the dictionary {"x": 10, "y": 20} and print its keys.',
  'python-sets': 'Create the set {1, 1, 2, 3} and print the final set contents.',
  'python-scope': 'Create a global variable x = 7 and a function that prints it, then call the function.',
  'python-recursion-intro': 'Write a recursive function that prints the numbers from n down to 1, then call it with 4.',
  'python-constructor':
    'Create a Student class with a constructor that accepts name, store it in self.name, create Student("Sam"), and print the stored name.',
  'python-attributes-methods':
    'Create a Person class with name and age attributes, create Person("Alex", 21), and print both values.',
  'python-full-class-pattern':
    'Create a Counter class with value = 0 in __init__, add an inc() method that increases value by 1, call inc() once, and print the value.',
};

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
  'python-dict-methods': 'contains_all_tokens',
  'python-sets': 'number_set',
  'python-libraries': 'one_of',
};

const EXPECTED_JSON_OVERRIDES = {
  'python-booleans': true,
  'python-dict-methods': ['x', 'y'],
  'python-sets': [1, 2, 3],
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

function runPythonProgram(code, stdinText = '') {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'codhak-python-lesson-'));
  try {
    const filePath = path.join(tempDir, 'lesson.py');
    writeFileSync(filePath, code, 'utf8');
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
          content: normalizeText(step.content),
          explanation: normalizeText(step.explanation),
          stepKind: step.stepKind || 'example',
        };
      }

      if (step.type === 'practice') {
        const evaluationMode = STATIC_FALLBACK_IDS.has(lesson.id) ? 'static' : 'execution';
        return {
          ...step,
          title: 'Q1',
          content: normalizeText(PRACTICE_PROMPT_OVERRIDES[lesson.id] || step.content),
          explanation: normalizeText(step.explanation),
          evaluationMode,
          evaluationId: evaluationMode === 'execution' ? lesson.id : undefined,
          requiredSnippets: Array.isArray(step.requiredSnippets) ? step.requiredSnippets.map((snippet) => normalizeText(snippet)) : [],
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

    if (CONTEXT_STEPS[lesson.id]) {
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

    const compareMode = COMPARE_MODE_OVERRIDES[lesson.id] || null;
    const expectedJson = EXPECTED_JSON_OVERRIDES[lesson.id];
    const baseCases = EXECUTION_STDIN_CASES[lesson.id] || [{ label: 'Expected output', stdinText: '' }];

    const testCases = baseCases.map((testCase) => {
      if (compareMode) {
        return {
          label: testCase.label,
          stdin_text: testCase.stdinText,
          expected_json: expectedJson,
          compare_mode: compareMode,
          hidden: Boolean(testCase.hidden),
        };
      }

      const expected_output = runPythonProgram(practiceStep.code, testCase.stdinText || '');
      return {
        label: testCase.label,
        stdin_text: testCase.stdinText,
        expected_output,
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
const enhancedLessons = enhanceLessons(JSON.parse(JSON.stringify(sourceLessons)));
const evaluationBank = buildExecutionBank(enhancedLessons);

writeGeneratedLessonsFile(enhancedLessons);
writeGeneratedEvaluationBank(evaluationBank);

const greekCount = JSON.stringify(enhancedLessons).match(/[\u0370-\u03FF]/g)?.length || 0;
console.log(`Generated ${enhancedLessons.length} Python lessons.`);
console.log(`Execution-backed lessons: ${Object.keys(evaluationBank).length}`);
console.log(`Greek characters remaining in generated export: ${greekCount}`);
