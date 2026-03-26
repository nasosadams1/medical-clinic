import type { Lesson } from './lessons';
import { pythonLessonTranslations } from './pythonLessonTranslations.generated';

type LessonDifficulty = Lesson['difficulty'];
type PracticeValidationMode = 'exact' | 'includes_all';

interface ExampleSpec {
  title: string;
  code: string;
  note: string;
  explanation?: string;
}

interface QuestionSpec {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface LessonBlueprint {
  id: string;
  title: string;
  description: string;
  difficulty: LessonDifficulty;
  category: string;
  examples: [ExampleSpec, ExampleSpec, ExampleSpec, ExampleSpec];
  codingPrompt: string;
  codingSolution: string;
  codingExplanation: string;
  predict: QuestionSpec;
  trap: QuestionSpec;
}

interface PracticeSpec {
  title?: string;
  validationMode?: PracticeValidationMode;
  requiredSnippets?: string[];
  starterCode?: string;
}

const PYTHON_TIER_SCHEDULE = {
  beginnerCount: 15,
  intermediateCount: 19,
};

const PRACTICE_LESSON_OVERRIDES: Record<string, PracticeSpec> = {
  'python-calculator-basics': {
    requiredSnippets: ['input(', 'int(', 'print(', '+'],
  },
  'python-for-loops': {
    requiredSnippets: ['for ', 'in ', 'print('],
  },
  'python-while-loops': {
    requiredSnippets: ['while ', 'print(', '+= 1'],
  },
  'python-loop-patterns': {
    requiredSnippets: ['total', 'for ', '+=', 'print('],
  },
  'python-functions': {
    requiredSnippets: ['def say_hi', 'print(', 'say_hi()'],
  },
  'python-return': {
    requiredSnippets: ['def double', 'return', 'print(', 'double(5)'],
  },
  'python-dictionaries': {
    requiredSnippets: ['"name"', 'print(', '{'],
  },
  'python-recursion-intro': {
    requiredSnippets: ['def ', 'if ', 'print(', 'n - 1'],
  },
  'python-factorial': {
    requiredSnippets: ['def fact', 'return', 'fact(n - 1)'],
  },
  'python-file-reading': {
    requiredSnippets: ['with open(', '"r"', 'read(', 'print('],
  },
  'python-error-handling': {
    requiredSnippets: ['try:', 'except', '10 / 0', 'Cannot divide'],
  },
  'python-full-class-pattern': {
    requiredSnippets: ['class Counter', 'def __init__', 'def inc', 'self.value', 'print('],
  },
};

const uniqueSnippets = (snippets: Array<string | undefined | null>) =>
  snippets.filter((snippet): snippet is string => Boolean(snippet && snippet.trim())).filter((snippet, index, list) => list.indexOf(snippet) === index);

const cleanPracticePrompt = (prompt: string) =>
  prompt.replace(/^Q1\s*\(Coding\)\s*\n?/i, '').trim();

const hasToken = (line: string, pattern: RegExp) => pattern.test(line);

const derivePracticeSnippets = (solution: string) => {
  const lines = solution
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const structuralSnippets = lines.flatMap((line) => {
    const snippets: string[] = [];
    const assignmentMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    const defMatch = line.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)/);
    const classMatch = line.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    const stringLiterals = [...line.matchAll(/"([^"]+)"|'([^']+)'/g)]
      .map((match) => match[1] ?? match[2])
      .filter((value) => value && value.length <= 24)
      .map((value) => `"${value}"`);

    if (assignmentMatch) snippets.push(`${assignmentMatch[1]} =`);
    if (defMatch) snippets.push(`def ${defMatch[1]}`);
    if (classMatch) snippets.push(`class ${classMatch[1]}`);
    if (hasToken(line, /\bprint\(/)) snippets.push('print(');
    if (hasToken(line, /\binput\(/)) snippets.push('input(');
    if (hasToken(line, /\bint\(/)) snippets.push('int(');
    if (hasToken(line, /\bfloat\(/)) snippets.push('float(');
    if (hasToken(line, /\bstr\(/)) snippets.push('str(');
    if (hasToken(line, /\bbool\(/)) snippets.push('bool(');
    if (line.includes('if ')) snippets.push('if ');
    if (line.includes('elif ')) snippets.push('elif ');
    if (line.includes('else:')) snippets.push('else:');
    if (line.includes('for ')) snippets.push('for ');
    if (line.includes('while ')) snippets.push('while ');
    if (line.includes('break')) snippets.push('break');
    if (line.includes('continue')) snippets.push('continue');
    if (line.includes('return')) snippets.push('return');
    if (line.includes('try:')) snippets.push('try:');
    if (line.includes('except')) snippets.push('except');
    if (hasToken(line, /\bwith open\(/)) snippets.push('with open(');
    if (!hasToken(line, /\bwith open\(/) && hasToken(line, /\bopen\(/)) snippets.push('open(');
    if (hasToken(line, /\bread\(/)) snippets.push('read(');
    if (hasToken(line, /\bwrite\(/)) snippets.push('write(');
    if (line.includes('.append(')) snippets.push('append(');
    if (line.includes('.sort(')) snippets.push('sort(');
    if (line.includes('.split(')) snippets.push('split(');
    if (line.includes('.join(')) snippets.push('join(');
    if (line.includes('.upper(')) snippets.push('upper(');
    if (line.includes('.lower(')) snippets.push('lower(');
    if (line.includes('.count(')) snippets.push('count(');
    if (line.includes('+= 1')) snippets.push('+= 1');
    if (line.includes('-= 1')) snippets.push('-= 1');
    if (line.includes('+')) snippets.push('+');
    if (line.includes('-')) snippets.push('-');
    if (line.includes('*')) snippets.push('*');
    if (line.includes('/')) snippets.push('/');

    return [...snippets, ...stringLiterals];
  });

  return uniqueSnippets(structuralSnippets).slice(0, 6);
};

const theoryStep = (example: ExampleSpec): Lesson['content']['steps'][number] => ({
  title: example.title,
  content: example.note,
  code: example.code,
  explanation: example.explanation ?? example.note,
  type: 'theory',
  practiceMode: 'none',
});

const practiceStep = (blueprint: LessonBlueprint): Lesson['content']['steps'][number] => {
  const practice = PRACTICE_LESSON_OVERRIDES[blueprint.id];
  const requiredSnippets = practice?.requiredSnippets ?? derivePracticeSnippets(blueprint.codingSolution);

  return {
    title: practice?.title ?? 'Q1',
    content: cleanPracticePrompt(blueprint.codingPrompt),
    code: blueprint.codingSolution,
    explanation: blueprint.codingExplanation,
    type: 'practice',
    validationMode: practice?.validationMode ?? 'includes_all',
    requiredSnippets,
    starterCode: practice?.starterCode ?? '',
  };
};

const questionStep = (question: QuestionSpec): Lesson['content']['steps'][number] => ({
  question: question.prompt,
  options: question.options,
  correctAnswer: question.answer,
  explanation: question.explanation,
  type: 'question',
});

const makeLesson = (blueprint: LessonBlueprint): Lesson => {
  const practice = practiceStep(blueprint);

  return {
    id: blueprint.id,
    title: blueprint.title,
    description: blueprint.description,
    difficulty: blueprint.difficulty,
    baseXP: 50,
    baselineTime: 1,
    language: 'python',
    category: blueprint.category,
    isLocked: false,
    content: {
      steps: [
        ...blueprint.examples.map(theoryStep),
        practice,
        questionStep(blueprint.predict),
        questionStep(blueprint.trap),
      ],
    },
  };
};

const getScheduledDifficulty = (index: number): LessonDifficulty => {
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount) return 'Beginner';
  if (index < PYTHON_TIER_SCHEDULE.beginnerCount + PYTHON_TIER_SCHEDULE.intermediateCount) return 'Intermediate';
  return 'Advanced';
};

const applyScheduledDifficulty = (lesson: Lesson, index: number): Lesson => ({
  ...lesson,
  difficulty: getScheduledDifficulty(index),
});

const TRAP_ERROR_OPTION_BY_LESSON: Record<string, string> = {
  'python-first-output': 'NameError',
  'python-variables': 'TypeError',
  'python-arithmetic': 'TypeError',
  'python-strings': 'TypeError',
  'python-input': 'TypeError',
  'python-booleans': 'TypeError',
  'python-if': 'SyntaxError',
  'python-if-else': 'SyntaxError',
  'python-debugging-basics': 'NameError',
  'python-calculator-basics': 'TypeError',
  'python-lists': 'TypeError',
  'python-list-access': 'IndexError',
  'python-for-loops': 'TypeError',
  'python-while-loops': 'SyntaxError',
  'python-loop-patterns': 'TypeError',
  'python-break-continue': 'SyntaxError',
  'python-functions': 'TypeError',
  'python-nested-loops': 'IndentationError',
  'python-parameters': 'TypeError',
  'python-return': 'TypeError',
  'python-string-methods': 'TypeError',
  'python-string-operations': 'TypeError',
  'python-list-methods': 'TypeError',
  'python-nested-structures': 'IndexError',
  'python-built-in-functions': 'ValueError',
  'python-dictionaries': 'KeyError',
  'python-dict-methods': 'KeyError',
  'python-sets': 'TypeError',
  'python-nested-data': 'IndexError',
  'python-text-analyzer-basics': 'IndexError',
  'python-functions-advanced': 'TypeError',
  'python-scope': 'NameError',
  'python-linear-search': 'NameError',
  'python-sorting': 'TypeError',
  'python-two-pointers': 'IndexError',
  'python-mixed-problems': 'ValueError',
  'python-data-processor': 'ZeroDivisionError',
  'python-file-reading': 'FileNotFoundError',
  'python-file-writing': 'TypeError',
  'python-modules': 'NameError',
  'python-libraries': 'TypeError',
  'python-classes-intro': 'AttributeError',
  'python-constructor': 'TypeError',
  'python-methods': 'TypeError',
  'python-attributes-methods': 'TypeError',
  'python-full-class-pattern': 'NameError',
};

const TRAP_EXPLANATION_OVERRIDES: Record<string, string> = {
  'python-first-output': 'Hi is treated as a variable name, not a string literal, so Python raises a NameError.',
  'python-variables': 'Python raises a TypeError because a string and an integer cannot be added directly.',
  'python-arithmetic': 'Python raises a TypeError because an integer and a string cannot be added directly.',
  'python-strings': 'Python raises a TypeError because you cannot concatenate a string with an integer without conversion.',
  'python-input': 'Python raises a TypeError because a string and an integer cannot be concatenated directly.',
  'python-if': 'Using = inside the if condition is invalid syntax, so Python raises a SyntaxError.',
  'python-if-else': 'A second else on the same if chain is invalid, so Python raises a SyntaxError.',
  'python-debugging-basics': 'y was never defined, so Python raises a NameError.',
  'python-lists': 'Python raises a TypeError because list concatenation expects another list, not an integer.',
  'python-list-access': 'Index 3 is outside the list range, so Python raises an IndexError.',
  'python-for-loops': 'Python raises a TypeError because an integer is not iterable in a for loop.',
  'python-nested-loops': 'The print line must be indented under the for loop, so Python raises an IndentationError.',
  'python-parameters': 'The function expects one required argument, so calling it with none raises a TypeError.',
  'python-nested-structures': 'Index 1 does not exist in this nested list, so Python raises an IndexError.',
  'python-built-in-functions': 'max() cannot work on an empty list, so Python raises a ValueError.',
  'python-dictionaries': 'The key "b" does not exist, so direct dictionary access raises a KeyError.',
  'python-sets': 'Sets are not subscriptable, so Python raises a TypeError.',
  'python-nested-data': 'users[1] is out of range, so Python raises an IndexError before key access happens.',
  'python-text-analyzer-basics': 'Index 5 is outside the string bounds, so Python raises an IndexError.',
  'python-scope': 'y does not exist in local or global scope here, so Python raises a NameError.',
  'python-two-pointers': 'Index 3 is out of range for this list, so Python raises an IndexError.',
  'python-mixed-problems': 'max() on an empty list raises a ValueError.',
  'python-data-processor': 'len(nums) is 0, so dividing by it raises a ZeroDivisionError.',
  'python-file-writing': 'write() expects a string, so passing an integer raises a TypeError.',
  'python-modules': 'math was never imported, so Python raises a NameError.',
  'python-classes-intro': 'The object has no attribute y, so Python raises an AttributeError.',
  'python-constructor': 'The constructor requires x, so calling A() without it raises a TypeError.',
  'python-attributes-methods': 'The method is missing self, so calling it through an instance raises a TypeError.',
  'python-full-class-pattern': 'value is not a standalone variable here, so Python raises a NameError.',
};

const applyTrapErrorLabels = (lesson: Lesson): Lesson => {
  const replacement = TRAP_ERROR_OPTION_BY_LESSON[lesson.id];
  if (!replacement && lesson.id !== 'python-error-handling') {
    return lesson;
  }

  let questionIndex = 0;
  const steps = lesson.content.steps.map((step) => {
    if (step.type !== 'question') return step;

    questionIndex += 1;
    if (questionIndex !== 2) return step;

    if (lesson.id === 'python-error-handling') {
      return {
        ...step,
        options: step.options.map((option) => (option === 'Error' ? 'prints "Error"' : option)),
      };
    }

    const errorIndex = step.options.indexOf('Error');
    if (errorIndex < 0 || !replacement) return step;

    return {
      ...step,
      options: step.options.map((option) => (option === 'Error' ? replacement : option)),
      explanation:
        step.correctAnswer === errorIndex
          ? TRAP_EXPLANATION_OVERRIDES[lesson.id] ?? step.explanation.replace(/\b[Ee]rror\b/g, replacement)
          : step.explanation,
    };
  });

  return {
    ...lesson,
    content: {
      ...lesson.content,
      steps,
    },
  };
};

const PYTHON_TRANSLATION_FIXES: Record<string, string> = {
  'print() displays string.': 'print() displays a string.',
  'Stores number.': 'Stores a number.',
  'Removal.': 'Subtraction.',
  'Proliferation.': 'Multiplication.',
  'True enables the block.': 'True activates the block.',
  'Two different streams.': 'Two different branches.',
  'Choice by price.': 'Choice based on the value.',
  'Write a program that prompts the user for two numbers and displays their sum.':
    'Write a program that asks the user for two numbers and prints their sum.',
  'We use counters.': 'We use a counter.',
  'Price combination.': 'Combining values.',
  'We can return a fixed price.': 'We can return a constant value.',
  'Checks if a piece exists in the string.': 'Checks if a substring exists in the string.',
  'Price range.': 'Value range.',
  'Create class Counter with attribute value = 0 inside constructor and method inc() which increments value by 1. Then create object, call inc() once and display value.':
    'Create a Counter class with a value attribute set to 0 in the constructor and an inc() method that increases value by 1. Then create an object, call inc() once, and print value.',
};

const translatePythonLessonText = <T,>(value: T): T => {
  if (typeof value === 'string') {
    return ((PYTHON_TRANSLATION_FIXES[pythonLessonTranslations[value] ?? value] ?? pythonLessonTranslations[value] ?? value).replace(/\u00d7/g, '*')) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => translatePythonLessonText(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, translatePythonLessonText(entryValue)])
    ) as T;
  }

  return value;
};

const pythonLessonBlueprints: LessonBlueprint[] = [
  {
    id: 'python-first-output',
    title: 'First Output',
    description: 'Start Python by printing text, variables, and simple string combinations.',
    difficulty: 'Beginner',
    category: 'Fundamentals',
    examples: [
      {
        title: 'Example 1',
        code: `print("Hello from Alex")`,
        note: 'Εμφανίζει κείμενο στην οθόνη.',
        explanation: 'Use print() when you want Python to show text in the console.',
      },
      {
        title: 'Example 2',
        code: `print("Welcome, Sam!")`,
        note: 'Η print() εμφανίζει string.',
      },
      {
        title: 'Example 3',
        code: `message = "Rio is learning Python"
print(message)`,
        note: 'Εκτυπώνει μεταβλητή.',
      },
      {
        title: 'Example 4',
        code: `day = "Friday"
print("Today is " + day)`,
        note: 'Ενώνει strings.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που εμφανίζει:\nHello World',
    codingSolution: `print("Hello World")`,
    codingExplanation: 'The target output is a single line: Hello World.',
    predict: {
      prompt: `Q2 (Predict Output)

text = "Hi"
print(text)`,
      options: ['text', '"Hi"', 'Hi', 'Error'],
      answer: 2,
      explanation: 'print(text) shows the value stored in text, so the output is Hi without quotes.',
    },
    trap: {
      prompt: `Q3 (Trap)

print(Hi)`,
      options: ['Hi', '"Hi"', 'Error', 'Nothing'],
      answer: 2,
      explanation: 'Hi is not defined as a variable, so Python raises an error.',
    },
  },
  {
    id: 'python-variables',
    title: 'Variables',
    description: 'Store numbers and strings in variables and avoid basic type mistakes.',
    difficulty: 'Beginner',
    category: 'Fundamentals',
    examples: [
      {
        title: 'Example 1',
        code: `x = 5
print(x)`,
        note: 'Αποθηκεύει αριθμό.',
      },
      {
        title: 'Example 2',
        code: `y = 2.5
print(y)`,
        note: 'Float.',
      },
      {
        title: 'Example 3',
        code: `name = "Sam"
print(name)`,
        note: 'String.',
      },
      {
        title: 'Example 4',
        code: `n = 2
print(str(n))`,
        note: 'Μετατροπή σε string.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε μεταβλητή age = 20 και εμφάνισέ τη.',
    codingSolution: `age = 20
print(age)`,
    codingExplanation: 'Define the variable first, then print its value.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 3
print(x)`,
      options: ['x', '3', '"3"', 'Error'],
      answer: 1,
      explanation: 'print(x) shows the integer value stored in x, which is 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

print("5" + 5)`,
      options: ['10', '55', 'Error', '"10"'],
      answer: 2,
      explanation: 'Python does not let you add a string and an integer directly.',
    },
  },
  {
    id: 'python-arithmetic',
    title: 'Arithmetic',
    description: 'Practice the core arithmetic operators and spot string-number mistakes.',
    difficulty: 'Beginner',
    category: 'Fundamentals',
    examples: [
      {
        title: 'Example 1',
        code: `print(2 + 3)`,
        note: 'Πρόσθεση.',
      },
      {
        title: 'Example 2',
        code: `print(5 - 2)`,
        note: 'Αφαίρεση.',
      },
      {
        title: 'Example 3',
        code: `print(3 * 2)`,
        note: 'Πολλαπλασιασμός.',
      },
      {
        title: 'Example 4',
        code: `print(5 / 2)`,
        note: 'Float αποτέλεσμα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΥπολόγισε και εμφάνισε το αποτέλεσμα του 7 + 5.',
    codingSolution: `print(7 + 5)`,
    codingExplanation: 'This checkpoint expects the expression 7 + 5 to be printed directly.',
    predict: {
      prompt: `Q2 (Predict Output)

print(6 / 2)`,
      options: ['3', '3.0', '2', 'Error'],
      answer: 1,
      explanation: 'The / operator returns a float in Python, so the output is 3.0.',
    },
    trap: {
      prompt: `Q3 (Trap)

print(5 + "3")`,
      options: ['8', '53', 'Error', '"8"'],
      answer: 2,
      explanation: 'An integer and a string cannot be added without converting one of them first.',
    },
  },
  {
    id: 'python-strings',
    title: 'Strings',
    description: 'Combine strings correctly and recognize when numbers must be converted first.',
    difficulty: 'Beginner',
    category: 'Strings',
    examples: [
      {
        title: 'Example 1',
        code: `print("Hi" + "Alex")`,
        note: 'Ένωση strings.',
      },
      {
        title: 'Example 2',
        code: `name = "Sam"
print("Hi " + name)`,
        note: 'Συνδυασμός.',
      },
      {
        title: 'Example 3',
        code: `print("A B")`,
        note: 'Space.',
      },
      {
        title: 'Example 4',
        code: `print("Level" + "1")`,
        note: 'Παραμένει string.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΈνωσε "Hello " και "World".',
    codingSolution: `print("Hello " + "World")`,
    codingExplanation: 'String concatenation uses the + operator.',
    predict: {
      prompt: `Q2 (Predict Output)

print("A" + "B")`,
      options: ['A B', 'AB', '"AB"', 'Error'],
      answer: 1,
      explanation: 'Two strings concatenate directly into AB.',
    },
    trap: {
      prompt: `Q3 (Trap)

print("Age" + 5)`,
      options: ['Age5', 'Error', '5Age', '"Age5"'],
      answer: 1,
      explanation: 'You must convert 5 to a string before concatenating it with "Age".',
    },
  },
  {
    id: 'python-input',
    title: 'Input',
    description: 'Read user input, combine it with strings, and convert it when numeric work is required.',
    difficulty: 'Beginner',
    category: 'Fundamentals',
    examples: [
      {
        title: 'Example 1',
        code: `x = input()
print(x)`,
        note: 'Input είναι string.',
      },
      {
        title: 'Example 2',
        code: `name = input()
print("Hi " + name)`,
        note: 'Συνδυασμός.',
      },
      {
        title: 'Example 3',
        code: `x = input()
y = input()
print(x + y)`,
        note: 'String concat.',
      },
      {
        title: 'Example 4',
        code: `x = int(input())
print(x)`,
        note: 'Μετατροπή σε int.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΖήτα όνομα και εμφάνισε: Hello <name>',
    codingSolution: `name = input()
print("Hello " + name)`,
    codingExplanation: 'input() returns a string, so direct string concatenation works here.',
    predict: {
      prompt: `Q2 (Predict Output) (αν input = 2)

x = input()
print(x)`,
      options: ['2', '"2"', '2 (string)', 'Error'],
      answer: 2,
      explanation: 'input() always returns text, so the visible output is 2 as a string value.',
    },
    trap: {
      prompt: `Q3 (Trap)

print("2" + 2)`,
      options: ['4', '22', 'Error', '"4"'],
      answer: 2,
      explanation: 'A string and an integer cannot be added directly.',
    },
  },
  {
    id: 'python-booleans',
    title: 'Booleans',
    description: 'Work with True and False values and compare different kinds of expressions safely.',
    difficulty: 'Beginner',
    category: 'Conditionals',
    examples: [
      {
        title: 'Example 1',
        code: `print(5 > 3)`,
        note: 'Επιστρέφει True.',
      },
      {
        title: 'Example 2',
        code: `print(2 == 4)`,
        note: 'Ελέγχει αν δύο τιμές είναι ίσες.',
      },
      {
        title: 'Example 3',
        code: `print(7 != 1)`,
        note: 'Ελέγχει αν δύο τιμές είναι διαφορετικές.',
      },
      {
        title: 'Example 4',
        code: `flag = False
print(flag)`,
        note: 'Boolean μεταβλητή.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που ελέγχει αν το 10 > 5 και εμφανίζει το αποτέλεσμα.',
    codingSolution: `print(10 > 5)`,
    codingExplanation: 'The comparison itself evaluates to True, and print() shows that result.',
    predict: {
      prompt: `Q2 (Predict Output)

print(3 < 1)`,
      options: ['True', 'False', '3 < 1', 'Error'],
      answer: 1,
      explanation: '3 is not less than 1, so the result is False.',
    },
    trap: {
      prompt: `Q3 (Trap)

print("5" == 5)`,
      options: ['True', 'False', '"False"', 'Error'],
      answer: 1,
      explanation: 'A string "5" is not equal to the integer 5, so the result is False.',
    },
  },
  {
    id: 'python-if',
    title: 'If',
    description: 'Use if blocks to run code only when a condition is True.',
    difficulty: 'Beginner',
    category: 'Conditionals',
    examples: [
      {
        title: 'Example 1',
        code: `if 5 > 3:
    print("Yes")`,
        note: 'Εκτελείται μόνο αν η συνθήκη είναι True.',
      },
      {
        title: 'Example 2',
        code: `x = 2
if x == 2:
    print("Match")`,
        note: 'Ελέγχει ισότητα.',
      },
      {
        title: 'Example 3',
        code: `name = "Alex"
if name == "Alex":
    print("Hello")`,
        note: 'Μπορούμε να συγκρίνουμε strings.',
      },
      {
        title: 'Example 4',
        code: `ready = True
if ready:
    print("Go")`,
        note: 'Το True ενεργοποιεί το block.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που αποθηκεύει τον αριθμό 12 στη μεταβλητή x και εμφανίζει "Big" αν x > 10.',
    codingSolution: `x = 12
if x > 10:
    print("Big")`,
    codingExplanation: 'Store the number first, then use an if statement with the proper indentation.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 4
if x > 2:
    print("A")`,
      options: ['A', 'x', 'Nothing', 'Error'],
      answer: 0,
      explanation: 'Since 4 is greater than 2, Python prints A.',
    },
    trap: {
      prompt: `Q3 (Trap)

x = 5
if x = 5:
    print("Hi")`,
      options: ['Hi', 'True', 'Error', 'Nothing'],
      answer: 2,
      explanation: 'Inside a condition you must use == for comparison, not = for assignment.',
    },
  },
  {
    id: 'python-if-else',
    title: 'If-Else',
    description: 'Branch between two different outcomes and recognize invalid else chains.',
    difficulty: 'Beginner',
    category: 'Conditionals',
    examples: [
      {
        title: 'Example 1',
        code: `if 2 > 3:
    print("A")
else:
    print("B")`,
        note: 'Το else εκτελείται όταν η συνθήκη είναι False.',
      },
      {
        title: 'Example 2',
        code: `age = 20
if age >= 18:
    print("Adult")
else:
    print("Minor")`,
        note: 'Δύο διαφορετικές ροές.',
      },
      {
        title: 'Example 3',
        code: `x = 1
if x == 2:
    print("Yes")
else:
    print("No")`,
        note: 'Επιλογή ανάλογα με την τιμή.',
      },
      {
        title: 'Example 4',
        code: `flag = False
if flag:
    print("On")
else:
    print("Off")`,
        note: 'Το boolean καθορίζει το αποτέλεσμα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που αποθηκεύει την τιμή 15 στη μεταβλητή age και εμφανίζει "Adult" αν age >= 18, αλλιώς "Minor".',
    codingSolution: `age = 15
if age >= 18:
    print("Adult")
else:
    print("Minor")`,
    codingExplanation: 'Since 15 is below 18, this solution should print Minor.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 3
if x == 3:
    print("Yes")
else:
    print("No")`,
      options: ['Yes', 'No', '3', 'Error'],
      answer: 0,
      explanation: 'x equals 3, so Python follows the first branch and prints Yes.',
    },
    trap: {
      prompt: `Q3 (Trap)

x = 2
if x > 1:
    print("A")
else:
    print("B")
else:
    print("C")`,
      options: ['A', 'B', 'C', 'Error'],
      answer: 3,
      explanation: 'Python does not allow two else blocks in the same if statement.',
    },
  },
  {
    id: 'python-debugging-basics',
    title: 'Debugging Basics',
    description: 'Spot syntax errors, undefined names, and indentation issues quickly.',
    difficulty: 'Beginner',
    category: 'Debugging',
    examples: [
      {
        title: 'Example 1',
        code: `print("Hello")`,
        note: 'Σωστός κώδικας.',
      },
      {
        title: 'Example 2',
        code: `x = 5
print(x)`,
        note: 'Η μεταβλητή πρέπει να έχει οριστεί πριν χρησιμοποιηθεί.',
      },
      {
        title: 'Example 3',
        code: `print("A" + "B")`,
        note: 'Σωστό concatenation strings.',
      },
      {
        title: 'Example 4',
        code: `if 3 > 1:
    print("OK")`,
        note: 'Η εσοχή είναι υποχρεωτική.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔιόρθωσε τον παρακάτω κώδικα ώστε να εμφανίζει σωστά το Hello:\n\nprint("Hello"',
    codingSolution: `print("Hello")`,
    codingExplanation: 'Close the missing parenthesis so Python can parse the line.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 3
print(x)`,
      options: ['x', '3', '"3"', 'Error'],
      answer: 1,
      explanation: 'x is defined as 3, so print(x) outputs 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

print(y)`,
      options: ['y', '0', 'Error', 'None'],
      answer: 2,
      explanation: 'y was never defined, so Python raises a NameError.',
    },
  },
  {
    id: 'python-calculator-basics',
    title: 'Calculator Basics',
    description: 'Combine arithmetic, variables, and numeric input to build simple calculators.',
    difficulty: 'Beginner',
    category: 'Fundamentals',
    examples: [
      {
        title: 'Example 1',
        code: `print(2 + 3)`,
        note: 'Πρόσθεση.',
      },
      {
        title: 'Example 2',
        code: `print(8 - 2)`,
        note: 'Αφαίρεση.',
      },
      {
        title: 'Example 3',
        code: `a = 4
b = 5
print(a + b)`,
        note: 'Χρήση μεταβλητών σε πράξεις.',
      },
      {
        title: 'Example 4',
        code: `x = int(input())
y = int(input())
print(x + y)`,
        note: 'Input και υπολογισμός.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που ζητά από τον χρήστη δύο αριθμούς και εμφανίζει το άθροισμά τους.',
    codingSolution: `x = int(input())
y = int(input())
print(x + y)`,
    codingExplanation: 'Convert both inputs to integers before adding them.',
    predict: {
      prompt: `Q2 (Predict Output)

print(4 * 3)`,
      options: ['7', '12', '43', 'Error'],
      answer: 1,
      explanation: '4 multiplied by 3 equals 12.',
    },
    trap: {
      prompt: `Q3 (Trap)

a = input()
b = input()
print(a + b)`,
      options: ['5', '23', 'Error', '6'],
      answer: 1,
      explanation: 'Without int(), both inputs stay strings and concatenate into 23.',
    },
  },
  {
    id: 'python-lists',
    title: 'Lists',
    description: 'Create Python lists and understand how list values are displayed and combined.',
    difficulty: 'Beginner',
    category: 'Lists',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
print(nums)`,
        note: 'Λίστα με αριθμούς.',
      },
      {
        title: 'Example 2',
        code: `names = ["Alex", "Sam"]
print(names)`,
        note: 'Λίστα με strings.',
      },
      {
        title: 'Example 3',
        code: `data = [1, "A", 2.5]
print(data)`,
        note: 'Μια λίστα μπορεί να έχει διαφορετικούς τύπους.',
      },
      {
        title: 'Example 4',
        code: `items = ["Book"]
print(items)`,
        note: 'Λίστα με ένα στοιχείο.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε μια λίστα με τα στοιχεία 10, 20, 30 και εμφάνισέ τη.',
    codingSolution: `nums = [10, 20, 30]
print(nums)`,
    codingExplanation: 'Create the list first, then print the entire list object.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [5, 6]
print(nums)`,
      options: ['5, 6', '[5, 6]', 'nums', 'Error'],
      answer: 1,
      explanation: 'Python prints list brackets when you print a list object directly.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [1, 2, 3]
print(nums + 1)`,
      options: ['[2, 3, 4]', '[1, 2, 3, 1]', 'Error', '4'],
      answer: 2,
      explanation: 'You cannot add a number directly to a list.',
    },
  },
  {
    id: 'python-list-access',
    title: 'List Access',
    description: 'Read items and slices from lists and avoid going out of range.',
    difficulty: 'Beginner',
    category: 'Lists',
    examples: [
      {
        title: 'Example 1',
        code: `names = ["Alex", "Sam"]
print(names[0])`,
        note: 'Πρόσβαση στο πρώτο στοιχείο.',
      },
      {
        title: 'Example 2',
        code: `nums = [5, 10, 15]
print(nums[2])`,
        note: 'Κάθε στοιχείο έχει index.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 3, 4]
print(nums[1:3])`,
        note: 'Slice από index 1 μέχρι πριν το 3.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2, 3]
print(nums[:2])`,
        note: 'Slice από την αρχή.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα ["red", "blue", "green"] και εμφάνισε το δεύτερο στοιχείο της.',
    codingSolution: `colors = ["red", "blue", "green"]
print(colors[1])`,
    codingExplanation: 'List indexes start at 0, so index 1 is the second item.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1, 2, 3]
print(nums[1])`,
      options: ['1', '2', '3', 'Error'],
      answer: 1,
      explanation: 'Index 1 points to the second item in the list, which is 2.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [1, 2, 3]
print(nums[3])`,
      options: ['3', '0', 'None', 'Error'],
      answer: 3,
      explanation: 'The valid indexes are 0, 1, and 2, so index 3 is out of range.',
    },
  },
  {
    id: 'python-for-loops',
    title: 'For Loops',
    description: 'Loop through lists and ranges to process one item at a time.',
    difficulty: 'Beginner',
    category: 'Loops',
    examples: [
      {
        title: 'Example 1',
        code: `for x in [1, 2, 3]:
    print(x)`,
        note: 'Επανάληψη πάνω σε λίστα.',
      },
      {
        title: 'Example 2',
        code: `names = ["A", "B"]
for n in names:
    print(n)`,
        note: 'Το loop παίρνει κάθε στοιχείο.',
      },
      {
        title: 'Example 3',
        code: `for i in range(3):
    print(i)`,
        note: 'Το range(3) δίνει 0, 1, 2.',
      },
      {
        title: 'Example 4',
        code: `for n in [2, 4]:
    print(n * 2)`,
        note: 'Μπορούμε να κάνουμε πράξεις μέσα στο loop.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΧρησιμοποίησε for loop για να εμφανίσεις τα στοιχεία της λίστας [10, 20, 30] ένα-ένα.',
    codingSolution: `for n in [10, 20, 30]:
    print(n)`,
    codingExplanation: 'A for loop pulls one value at a time from the list and prints it.',
    predict: {
      prompt: `Q2 (Predict Output)

for i in range(2):
    print(i)`,
      options: ['0 και 1', '1 και 2', '2 και 3', 'Error'],
      answer: 0,
      explanation: 'range(2) produces 0 and 1.',
    },
    trap: {
      prompt: `Q3 (Trap)

for i in 5:
    print(i)`,
      options: ['Θα εμφανίσει 0 έως 4', 'Θα εμφανίσει 5', 'Δεν θα εμφανίσει τίποτα', 'Error'],
      answer: 3,
      explanation: 'An integer is not iterable, so Python raises an error.',
    },
  },
  {
    id: 'python-while-loops',
    title: 'While Loops',
    description: 'Control repetition with a condition and a counter that changes each round.',
    difficulty: 'Beginner',
    category: 'Loops',
    examples: [
      {
        title: 'Example 1',
        code: `x = 0
while x < 3:
    print(x)
    x += 1`,
        note: 'Επανάληψη όσο η συνθήκη είναι True.',
      },
      {
        title: 'Example 2',
        code: `i = 1
while i <= 2:
    print(i)
    i += 1`,
        note: 'Χρησιμοποιούμε counter.',
      },
      {
        title: 'Example 3',
        code: `n = 3
while n > 0:
    print(n)
    n -= 1`,
        note: 'Countdown loop.',
      },
      {
        title: 'Example 4',
        code: `run = True
while run:
    print("Hi")
    run = False`,
        note: 'Boolean control για σταμάτημα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε while loop που εμφανίζει τους αριθμούς από το 1 μέχρι το 5.',
    codingSolution: `x = 1
while x <= 5:
    print(x)
    x += 1`,
    codingExplanation: 'Update the counter inside the loop so the condition eventually becomes False.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 0
while x < 2:
    print(x)
    x += 1`,
      options: ['0 και 1', '1 και 2', '2 και 3', 'Error'],
      answer: 0,
      explanation: 'The loop runs for x = 0 and x = 1, then stops.',
    },
    trap: {
      prompt: `Q3 (Trap)

x = 0
while x < 3:
    print(x)`,
      options: ['Θα εμφανίσει 0, 1, 2', 'Infinite loop', 'Error', 'Nothing'],
      answer: 1,
      explanation: 'x never changes, so the condition stays True forever.',
    },
  },
  {
    id: 'python-loop-patterns',
    title: 'Loop Patterns',
    description: 'Use loops for totals, counting, filtering, and basic data processing.',
    difficulty: 'Beginner',
    category: 'Loops',
    examples: [
      {
        title: 'Example 1',
        code: `total = 0
for x in [1, 2, 3]:
    total += x
print(total)`,
        note: 'Άθροισμα στοιχείων.',
      },
      {
        title: 'Example 2',
        code: `count = 0
for x in [4, 5]:
    count += 1
print(count)`,
        note: 'Μέτρηση στοιχείων.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 5, 3]
print(max(nums))`,
        note: 'Εύρεση μέγιστου.',
      },
      {
        title: 'Example 4',
        code: `for n in [1, 2, 3, 4]:
    if n % 2 == 0:
        print(n)`,
        note: 'Φιλτράρισμα με συνθήκη.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που υπολογίζει και εμφανίζει το άθροισμα της λίστας [2, 4, 6].',
    codingSolution: `total = 0
for x in [2, 4, 6]:
    total += x
print(total)`,
    codingExplanation: 'Initialize a running total, add each item, then print the result.',
    predict: {
      prompt: `Q2 (Predict Output)

total = 0
for x in [2, 3]:
    total += x
print(total)`,
      options: ['2', '3', '5', 'Error'],
      answer: 2,
      explanation: '2 + 3 gives a final total of 5.',
    },
    trap: {
      prompt: `Q3 (Trap)

count = 0
for x in []:
    count += 1
print(count)`,
      options: ['1', '0', 'Error', 'None'],
      answer: 1,
      explanation: 'The loop never runs on an empty list, so count stays 0.',
    },
  },
  {
    id: 'python-break-continue',
    title: 'Break & Continue',
    description: 'Control loop flow with break to stop and continue to skip one iteration.',
    difficulty: 'Beginner',
    category: 'Loops',
    examples: [
      {
        title: 'Example 1',
        code: `for x in [1, 2, 3]:
    if x == 2:
        break
    print(x)`,
        note: 'Το break σταματά όλο το loop.',
      },
      {
        title: 'Example 2',
        code: `for x in [1, 2, 3]:
    if x == 2:
        continue
    print(x)`,
        note: 'Το continue παραλείπει μόνο το τρέχον βήμα.',
      },
      {
        title: 'Example 3',
        code: `for i in range(5):
    if i == 3:
        break
    print(i)`,
        note: 'Πρόωρο σταμάτημα.',
      },
      {
        title: 'Example 4',
        code: `for i in range(3):
    if i == 1:
        continue
    print(i)`,
        note: 'Παράλειψη συγκεκριμένης τιμής.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε loop που εμφανίζει τους αριθμούς 1 έως 5, αλλά σταματά όταν φτάσει στο 4.',
    codingSolution: `for n in range(1, 6):
    if n == 4:
        break
    print(n)`,
    codingExplanation: 'The loop prints 1, 2, and 3, then stops before printing 4.',
    predict: {
      prompt: `Q2 (Predict Output)

for x in [1, 2, 3]:
    if x == 2:
        continue
    print(x)`,
      options: ['1, 2, 3', '1, 3', '2 μόνο', 'Error'],
      answer: 1,
      explanation: 'continue skips printing 2, so only 1 and 3 are printed.',
    },
    trap: {
      prompt: `Q3 (Trap)

for i in [1, 2]:
    break
    print(i)`,
      options: ['Θα εμφανίσει 1', 'Θα εμφανίσει 2', 'Δεν θα εμφανίσει τίποτα', 'Error'],
      answer: 2,
      explanation: 'break exits the loop before print(i) ever runs.',
    },
  },
  {
    id: 'python-nested-loops',
    title: 'Nested Loops',
    description: 'Combine loops inside loops and track how the inner loop runs for each outer value.',
    difficulty: 'Beginner',
    category: 'Loops',
    examples: [
      {
        title: 'Example 1',
        code: `for i in range(2):
    for j in range(2):
        print(i, j)`,
        note: 'Loop μέσα σε loop.',
      },
      {
        title: 'Example 2',
        code: `for x in [1, 2]:
    for y in [3]:
        print(x + y)`,
        note: 'Συνδυασμός τιμών.',
      },
      {
        title: 'Example 3',
        code: `for i in range(2):
    print(i)
    for j in range(2):
        print(j)`,
        note: 'Το inner loop τρέχει πλήρως κάθε φορά.',
      },
      {
        title: 'Example 4',
        code: `for a in [1]:
    for b in [2]:
        print(a * b)`,
        note: 'Απλό nested pattern.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε nested loop που εμφανίζει όλα τα ζεύγη (i, j) για i και j από 0 έως 1.',
    codingSolution: `for i in range(2):
    for j in range(2):
        print(i, j)`,
    codingExplanation: 'Use one loop for i and a second inner loop for j.',
    predict: {
      prompt: `Q2 (Predict Output)

for i in range(2):
    for j in range(1):
        print(i, j)`,
      options: ['0 0 και 1 0', '0 1 και 1 1', '0 0 μόνο', 'Error'],
      answer: 0,
      explanation: 'range(1) gives only j = 0, so the output is 0 0 and 1 0.',
    },
    trap: {
      prompt: `Q3 (Trap)

for i in range(2):
print(i)`,
      options: ['Θα εμφανίσει 0 και 1', 'Θα εμφανίσει μόνο 0', 'Error', 'Nothing'],
      answer: 2,
      explanation: 'The print line must be indented under the loop.',
    },
  },
  {
    id: 'python-functions',
    title: 'Functions',
    description: 'Define reusable blocks of code and call them when needed.',
    difficulty: 'Intermediate',
    category: 'Functions',
    examples: [
      {
        title: 'Example 1',
        code: `def greet():
    print("Hi")

greet()`,
        note: 'Δημιουργία και κλήση function.',
      },
      {
        title: 'Example 2',
        code: `def show():
    print(5)

show()`,
        note: 'Η function μπορεί να εμφανίζει τιμές.',
      },
      {
        title: 'Example 3',
        code: `def hello():
    print("Hello")

hello()`,
        note: 'Reusable code.',
      },
      {
        title: 'Example 4',
        code: `def test():
    print("Run")

test()`,
        note: 'Η function εκτελείται μόνο όταν καλείται.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε function με όνομα say_hi που εμφανίζει το Hi, και μετά κάλεσέ τη.',
    codingSolution: `def say_hi():
    print("Hi")

say_hi()`,
    codingExplanation: 'Define the function first, then call it on a new line.',
    predict: {
      prompt: `Q2 (Predict Output)

def f():
    print("A")

f()`,
      options: ['A', 'f', 'Nothing', 'Error'],
      answer: 0,
      explanation: 'Calling f() runs the print statement inside the function.',
    },
    trap: {
      prompt: `Q3 (Trap)

def hello():
    print("Hi")`,
      options: ['Θα εμφανίσει Hi', 'Nothing', 'hello', 'Error'],
      answer: 1,
      explanation: 'Defining a function alone does not run it.',
    },
  },
  {
    id: 'python-parameters',
    title: 'Parameters',
    description: 'Pass input into functions and understand why required arguments matter.',
    difficulty: 'Intermediate',
    category: 'Functions',
    examples: [
      {
        title: 'Example 1',
        code: `def greet(name):
    print(name)

greet("Alex")`,
        note: 'Η function δέχεται τιμή μέσω parameter.',
      },
      {
        title: 'Example 2',
        code: `def double(x):
    print(x * 2)

double(3)`,
        note: 'Χρήση parameter σε υπολογισμό.',
      },
      {
        title: 'Example 3',
        code: `def add(a, b):
    print(a + b)

add(2, 3)`,
        note: 'Πολλαπλά parameters.',
      },
      {
        title: 'Example 4',
        code: `def show(x):
    print(x)

show(5)`,
        note: 'Το argument περνά στη function.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε function square(x) που εμφανίζει το τετράγωνο του x, και κάλεσέ τη με τιμή 4.',
    codingSolution: `def square(x):
    print(x * x)

square(4)`,
    codingExplanation: 'Use the parameter inside the function body, then call the function with 4.',
    predict: {
      prompt: `Q2 (Predict Output)

def show(n):
    print(n)

show(3)`,
      options: ['n', '3', '"3"', 'Error'],
      answer: 1,
      explanation: 'show(3) passes 3 into the parameter n, so 3 is printed.',
    },
    trap: {
      prompt: `Q3 (Trap)

def greet(name):
    print(name)

greet()`,
      options: ['Nothing', 'greet', 'Error', 'name'],
      answer: 2,
      explanation: 'The function expects one argument, but none was provided.',
    },
  },
  {
    id: 'python-return',
    title: 'Return',
    description: 'Return values from functions and distinguish returning from printing.',
    difficulty: 'Intermediate',
    category: 'Functions',
    examples: [
      {
        title: 'Example 1',
        code: `def add(a, b):
    return a + b

print(add(2, 3))`,
        note: 'Το return επιστρέφει αποτέλεσμα.',
      },
      {
        title: 'Example 2',
        code: `def square(x):
    return x * x

print(square(4))`,
        note: 'Επιστροφή υπολογισμού.',
      },
      {
        title: 'Example 3',
        code: `def f():
    return 5

print(f())`,
        note: 'Μπορούμε να επιστρέψουμε σταθερή τιμή.',
      },
      {
        title: 'Example 4',
        code: `def val():
    return 10

x = val()
print(x)`,
        note: 'Αποθήκευση returned value.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε function double(x) που επιστρέφει το διπλάσιο του x, και εμφάνισε το αποτέλεσμα για 5.',
    codingSolution: `def double(x):
    return x * 2

print(double(5))`,
    codingExplanation: 'return sends the result back; print() shows it.',
    predict: {
      prompt: `Q2 (Predict Output)

def f():
    return 7

print(f())`,
      options: ['f', '7', 'return 7', 'Error'],
      answer: 1,
      explanation: 'f() returns 7, and print() displays that value.',
    },
    trap: {
      prompt: `Q3 (Trap)

def f():
    print(3)

print(f())`,
      options: ['3', 'None', '3 και μετά None', 'Error'],
      answer: 2,
      explanation: 'The function prints 3, then returns None by default, so print(f()) shows None next.',
    },
  },
  {
    id: 'python-string-methods',
    title: 'String Methods',
    description: 'Use built-in string methods and understand when you are calling a method versus referencing it.',
    difficulty: 'Intermediate',
    category: 'Strings',
    examples: [
      {
        title: 'Example 1',
        code: `text = "hello"
print(text.upper())`,
        note: 'Μετατρέπει όλα τα γράμματα σε κεφαλαία.',
      },
      {
        title: 'Example 2',
        code: `word = "PYTHON"
print(word.lower())`,
        note: 'Μετατρέπει όλα τα γράμματα σε μικρά.',
      },
      {
        title: 'Example 3',
        code: `name = "alex"
print(name.capitalize())`,
        note: 'Κάνει κεφαλαίο μόνο το πρώτο γράμμα.',
      },
      {
        title: 'Example 4',
        code: `msg = "hello world"
print(msg.title())`,
        note: 'Κάνει κεφαλαίο το πρώτο γράμμα κάθε λέξης.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε string "python" και εμφάνισέ το σε κεφαλαία.',
    codingSolution: `text = "python"
print(text.upper())`,
    codingExplanation: 'upper() returns a new uppercase string.',
    predict: {
      prompt: `Q2 (Predict Output)

print("hi".upper())`,
      options: ['hi', 'HI', 'Hi', 'Error'],
      answer: 1,
      explanation: 'upper() converts every letter to uppercase, producing HI.',
    },
    trap: {
      prompt: `Q3 (Trap)

text = "hello"
print(text.upper)`,
      options: ['HELLO', 'hello', 'Function reference', 'Error'],
      answer: 2,
      explanation: 'Without (), Python shows the method itself instead of calling it.',
    },
  },
  {
    id: 'python-string-operations',
    title: 'String Operations',
    description: 'Measure, split, replace, and join strings as part of real text processing.',
    difficulty: 'Intermediate',
    category: 'Strings',
    examples: [
      {
        title: 'Example 1',
        code: `print(len("abc"))`,
        note: 'Βρίσκει το μήκος string.',
      },
      {
        title: 'Example 2',
        code: `msg = "hello world"
print(msg.replace("world", "Python"))`,
        note: 'Αντικαθιστά κομμάτι του string.',
      },
      {
        title: 'Example 3',
        code: `data = "a,b,c"
print(data.split(","))`,
        note: 'Χωρίζει string σε λίστα.',
      },
      {
        title: 'Example 4',
        code: `words = ["Hi", "there"]
print(" ".join(words))`,
        note: 'Ενώνει λίστα strings σε ένα string.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε string "a-b-c" και χώρισέ το με split("-").',
    codingSolution: `text = "a-b-c"
print(text.split("-"))`,
    codingExplanation: 'split("-") breaks the string at each hyphen and returns a list.',
    predict: {
      prompt: `Q2 (Predict Output)

print(len("abc"))`,
      options: ['2', '3', 'abc', 'Error'],
      answer: 1,
      explanation: 'The string abc has three characters, so len("abc") is 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

print("a,b".split)`,
      options: ["['a', 'b']", 'a,b', 'Function reference', 'Error'],
      answer: 2,
      explanation: 'Without (), you are referencing the split method instead of calling it.',
    },
  },
  {
    id: 'python-list-methods',
    title: 'List Methods',
    description: 'Use append, pop, sort, and extend while understanding in-place list behavior.',
    difficulty: 'Intermediate',
    category: 'Lists',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2]
nums.append(3)
print(nums)`,
        note: 'Προσθέτει στοιχείο στο τέλος.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3]
nums.pop()
print(nums)`,
        note: 'Αφαιρεί το τελευταίο στοιχείο.',
      },
      {
        title: 'Example 3',
        code: `nums = [3, 1, 2]
nums.sort()
print(nums)`,
        note: 'Ταξινομεί τη λίστα.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2]
nums.extend([3, 4])
print(nums)`,
        note: 'Προσθέτει πολλά στοιχεία.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [1, 2], πρόσθεσε το 3 με append(), και εμφάνισε τη λίστα.',
    codingSolution: `nums = [1, 2]
nums.append(3)
print(nums)`,
    codingExplanation: 'append() mutates the list, then print() shows the updated result.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1]
nums.append(2)
print(nums)`,
      options: ['[1]', '[2]', '[1, 2]', 'Error'],
      answer: 2,
      explanation: 'append(2) adds 2 to the end of the list, so it becomes [1, 2].',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [1, 2]
print(nums.append(3))`,
      options: ['[1, 2, 3]', '3', 'None', 'Error'],
      answer: 2,
      explanation: 'append() changes the list in place and returns None.',
    },
  },
  {
    id: 'python-nested-structures',
    title: 'Nested Structures',
    description: 'Access values inside nested lists and dictionaries without losing track of levels.',
    difficulty: 'Intermediate',
    category: 'Data Structures',
    examples: [
      {
        title: 'Example 1',
        code: `matrix = [[1, 2], [3, 4]]
print(matrix)`,
        note: 'Nested list.',
      },
      {
        title: 'Example 2',
        code: `matrix = [[1, 2], [3, 4]]
print(matrix[0])`,
        note: 'Πρόσβαση σε εσωτερική λίστα.',
      },
      {
        title: 'Example 3',
        code: `matrix = [[1, 2], [3, 4]]
print(matrix[1][0])`,
        note: 'Πρόσβαση σε συγκεκριμένο εσωτερικό στοιχείο.',
      },
      {
        title: 'Example 4',
        code: `d = {"a": {"b": 2}}
print(d["a"]["b"])`,
        note: 'Nested dictionary.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε nested list [[10, 20], [30, 40]] και εμφάνισε το 30.',
    codingSolution: `matrix = [[10, 20], [30, 40]]
print(matrix[1][0])`,
    codingExplanation: 'Access the outer list first, then the inner list item.',
    predict: {
      prompt: `Q2 (Predict Output)

m = [[1, 2], [3, 4]]
print(m[0][1])`,
      options: ['1', '2', '3', '4'],
      answer: 1,
      explanation: 'm[0] is [1, 2], and index 1 inside that list is 2.',
    },
    trap: {
      prompt: `Q3 (Trap)

m = [[1, 2]]
print(m[1])`,
      options: ['[1, 2]', '2', 'None', 'Error'],
      answer: 3,
      explanation: 'There is only one inner list at index 0, so index 1 is out of range.',
    },
  },
  {
    id: 'python-built-in-functions',
    title: 'Built-in Functions',
    description: 'Use sum, max, count, and membership checks to answer common list questions quickly.',
    difficulty: 'Intermediate',
    category: 'Data Structures',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
print(sum(nums))`,
        note: 'Υπολογίζει το άθροισμα.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3]
print(max(nums))`,
        note: 'Βρίσκει το μέγιστο.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 2]
print(nums.count(2))`,
        note: 'Μετρά πόσες φορές εμφανίζεται μια τιμή.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2, 3]
print(2 in nums)`,
        note: 'Ελέγχει αν υπάρχει στοιχείο στη λίστα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [4, 8, 2] και εμφάνισε το μέγιστο στοιχείο της.',
    codingSolution: `nums = [4, 8, 2]
print(max(nums))`,
    codingExplanation: 'max() returns the largest value in the list.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1, 2, 3]
print(2 in nums)`,
      options: ['True', 'False', '2', 'Error'],
      answer: 0,
      explanation: '2 is present in the list, so the membership test returns True.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = []
print(max(nums))`,
      options: ['0', 'None', 'Error', '[]'],
      answer: 2,
      explanation: 'max() cannot operate on an empty list and raises an error.',
    },
  },
  {
    id: 'python-dictionaries',
    title: 'Dictionaries',
    description: 'Create dictionaries, read by key, and understand when missing keys fail.',
    difficulty: 'Intermediate',
    category: 'Dictionaries',
    examples: [
      {
        title: 'Example 1',
        code: `d = {"a": 1}
print(d)`,
        note: 'Dictionary με key-value pairs.',
      },
      {
        title: 'Example 2',
        code: `d = {"a": 1}
print(d["a"])`,
        note: 'Πρόσβαση με key.',
      },
      {
        title: 'Example 3',
        code: `d = {"a": 1}
print(d.get("a"))`,
        note: 'Ασφαλές access.',
      },
      {
        title: 'Example 4',
        code: `d = {"a": 1}
d["b"] = 2
print(d)`,
        note: 'Προσθήκη νέου key.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε dictionary με key "name" και value "Alex", και εμφάνισε την τιμή του key.',
    codingSolution: `d = {"name": "Alex"}
print(d["name"])`,
    codingExplanation: 'The key "name" stores the string Alex, which you can access with square brackets.',
    predict: {
      prompt: `Q2 (Predict Output)

d = {"x": 1}
print(d["x"])`,
      options: ['x', '1', '"1"', 'Error'],
      answer: 1,
      explanation: 'The value stored under key "x" is the integer 1.',
    },
    trap: {
      prompt: `Q3 (Trap)

print({"a": 1}["b"])`,
      options: ['1', 'b', 'None', 'Error'],
      answer: 3,
      explanation: 'Key "b" does not exist, so Python raises a KeyError.',
    },
  },
  {
    id: 'python-dict-methods',
    title: 'Dict Methods',
    description: 'Inspect dictionary keys, values, and safe lookups with get().',
    difficulty: 'Intermediate',
    category: 'Dictionaries',
    examples: [
      {
        title: 'Example 1',
        code: `d = {"a": 1, "b": 2}
print(d.keys())`,
        note: 'Επιστρέφει όλα τα keys.',
      },
      {
        title: 'Example 2',
        code: `d = {"a": 1, "b": 2}
print(d.values())`,
        note: 'Επιστρέφει όλες τις values.',
      },
      {
        title: 'Example 3',
        code: `d = {"a": 1, "b": 2}
print(d.items())`,
        note: 'Επιστρέφει ζεύγη key-value.',
      },
      {
        title: 'Example 4',
        code: `d = {"a": 1}
d["a"] = 5
print(d)`,
        note: 'Ενημέρωση υπάρχοντος key.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε dictionary {"x": 10, "y": 20} και εμφάνισε τα keys του.',
    codingSolution: `d = {"x": 10, "y": 20}
print(d.keys())`,
    codingExplanation: 'keys() returns a view of all dictionary keys.',
    predict: {
      prompt: `Q2 (Predict Output)

d = {"a": 1}
print(d.get("a"))`,
      options: ['a', '1', 'None', 'Error'],
      answer: 1,
      explanation: 'get("a") returns the value stored under key "a", which is 1.',
    },
    trap: {
      prompt: `Q3 (Trap)

d = {"a": 1}
print(d.get("x"))`,
      options: ['x', '0', 'None', 'Error'],
      answer: 2,
      explanation: 'get() returns None by default when the key is missing.',
    },
  },
  {
    id: 'python-sets',
    title: 'Sets',
    description: 'Use sets for unique values and avoid treating them like indexed lists.',
    difficulty: 'Intermediate',
    category: 'Data Structures',
    examples: [
      {
        title: 'Example 1',
        code: `s = {1, 2, 3}
print(s)`,
        note: 'Set με μοναδικά στοιχεία.',
      },
      {
        title: 'Example 2',
        code: `s = {1, 1, 2}
print(s)`,
        note: 'Τα duplicates αφαιρούνται.',
      },
      {
        title: 'Example 3',
        code: `s = {1, 2}
s.add(3)
print(s)`,
        note: 'Προσθήκη στοιχείου.',
      },
      {
        title: 'Example 4',
        code: `s = {1, 2, 3}
s.remove(2)
print(s)`,
        note: 'Αφαίρεση στοιχείου.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε set με τα στοιχεία 1, 1, 2, 3 και εμφάνισέ το.',
    codingSolution: `s = {1, 1, 2, 3}
print(s)`,
    codingExplanation: 'Sets keep only unique values, so the duplicate 1 appears once.',
    predict: {
      prompt: `Q2 (Predict Output)

s = {1, 1}
print(s)`,
      options: ['{1, 1}', '{1}', '[1, 1]', 'Error'],
      answer: 1,
      explanation: 'Sets remove duplicates automatically, leaving only {1}.',
    },
    trap: {
      prompt: `Q3 (Trap)

s = {1, 2, 3}
print(s[0])`,
      options: ['1', '0', 'None', 'Error'],
      answer: 3,
      explanation: 'Sets are unordered and do not support indexing.',
    },
  },
  {
    id: 'python-nested-data',
    title: 'Nested Data',
    description: 'Traverse mixed nested lists and dictionaries without losing the correct access path.',
    difficulty: 'Intermediate',
    category: 'Data Structures',
    examples: [
      {
        title: 'Example 1',
        code: `d = {"a": [1, 2]}
print(d["a"][0])`,
        note: 'Dictionary με list.',
      },
      {
        title: 'Example 2',
        code: `users = [{"name": "A"}]
print(users[0]["name"])`,
        note: 'List από dictionaries.',
      },
      {
        title: 'Example 3',
        code: `d = {"a": {"b": 2}}
print(d["a"]["b"])`,
        note: 'Nested dictionary access.',
      },
      {
        title: 'Example 4',
        code: `lst = [[1, 2], [3, 4]]
print(lst[1][1])`,
        note: 'Nested list access.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε dictionary {"nums": [10, 20, 30]} και εμφάνισε το 20.',
    codingSolution: `data = {"nums": [10, 20, 30]}
print(data["nums"][1])`,
    codingExplanation: 'Access the list under key "nums", then read the second item.',
    predict: {
      prompt: `Q2 (Predict Output)

data = {"x": [5, 6]}
print(data["x"][1])`,
      options: ['5', '6', '[5, 6]', 'Error'],
      answer: 1,
      explanation: 'The second item in the list [5, 6] is 6.',
    },
    trap: {
      prompt: `Q3 (Trap)

users = [{"name": "A"}]
print(users[1]["name"])`,
      options: ['A', 'name', 'None', 'Error'],
      answer: 3,
      explanation: 'There is no second dictionary at index 1, so this access fails.',
    },
  },
  {
    id: 'python-text-analyzer-basics',
    title: 'Text Analyzer Basics',
    description: 'Count characters, search text, and split words in simple analyzer-style tasks.',
    difficulty: 'Intermediate',
    category: 'Strings',
    examples: [
      {
        title: 'Example 1',
        code: `text = "hello"
print(len(text))`,
        note: 'Μήκος κειμένου.',
      },
      {
        title: 'Example 2',
        code: `text = "hello"
print(text.count("l"))`,
        note: 'Μετρά εμφανίσεις χαρακτήρα.',
      },
      {
        title: 'Example 3',
        code: `text = "hello world"
print(text.split())`,
        note: 'Χωρίζει σε λέξεις.',
      },
      {
        title: 'Example 4',
        code: `text = "hello"
print("he" in text)`,
        note: 'Ελέγχει αν ένα κομμάτι υπάρχει μέσα στο string.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε string "banana" και εμφάνισε πόσες φορές εμφανίζεται το γράμμα "a".',
    codingSolution: `text = "banana"
print(text.count("a"))`,
    codingExplanation: 'count("a") returns how many times the letter a appears.',
    predict: {
      prompt: `Q2 (Predict Output)

text = "hello"
print(text.count("l"))`,
      options: ['1', '2', '3', 'Error'],
      answer: 1,
      explanation: 'The letter l appears twice in hello.',
    },
    trap: {
      prompt: `Q3 (Trap)

text = "hi"
print(text[5])`,
      options: ['i', 'h', 'None', 'Error'],
      answer: 3,
      explanation: 'Index 5 is outside the string, so Python raises an error.',
    },
  },
  {
    id: 'python-functions-advanced',
    title: 'Functions Advanced',
    description: 'Compose functions, return values cleanly, and reason about nested calls.',
    difficulty: 'Intermediate',
    category: 'Functions',
    examples: [
      {
        title: 'Example 1',
        code: `def add(a, b):
    return a + b

print(add(2, 3))`,
        note: 'Function που επιστρέφει αποτέλεσμα.',
      },
      {
        title: 'Example 2',
        code: `def square(x):
    return x * x

print(square(4))`,
        note: 'Function με υπολογισμό.',
      },
      {
        title: 'Example 3',
        code: `def combine(a, b):
    return str(a) + str(b)

print(combine(1, 2))`,
        note: 'Συνδυασμός τιμών.',
      },
      {
        title: 'Example 4',
        code: `def double(x):
    return x * 2

print(double(double(2)))`,
        note: 'Nested function calls.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε function triple(x) που επιστρέφει το τριπλάσιο του x, και εμφάνισε το αποτέλεσμα για 4.',
    codingSolution: `def triple(x):
    return x * 3

print(triple(4))`,
    codingExplanation: 'Return the computed result, then print the function call.',
    predict: {
      prompt: `Q2 (Predict Output)

def f(x):
    return x + 1

print(f(2))`,
      options: ['2', '3', 'x + 1', 'Error'],
      answer: 1,
      explanation: 'f(2) returns 3 because 1 is added to 2.',
    },
    trap: {
      prompt: `Q3 (Trap)

def f(x):
    print(x)

print(f(3))`,
      options: ['3', 'None', '3 και μετά None', 'Error'],
      answer: 2,
      explanation: 'The function prints 3 but returns None, so print(f(3)) shows None next.',
    },
  },
  {
    id: 'python-scope',
    title: 'Scope',
    description: 'Understand the difference between global and local variables in functions.',
    difficulty: 'Intermediate',
    category: 'Functions',
    examples: [
      {
        title: 'Example 1',
        code: `x = 5

def f():
    print(x)

f()`,
        note: 'Η function μπορεί να διαβάσει global μεταβλητή.',
      },
      {
        title: 'Example 2',
        code: `def f():
    y = 10
    print(y)

f()`,
        note: 'Local μεταβλητή υπάρχει μόνο μέσα στη function.',
      },
      {
        title: 'Example 3',
        code: `x = 5

def f():
    x = 10
    print(x)

f()
print(x)`,
        note: 'Η local δεν αλλάζει την global.',
      },
      {
        title: 'Example 4',
        code: `x = 5

def f():
    global x
    x = 10

f()
print(x)`,
        note: 'Με global αλλάζουμε global μεταβλητή.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε global μεταβλητή x = 7 και function που την εμφανίζει.',
    codingSolution: `x = 7

def show_x():
    print(x)

show_x()`,
    codingExplanation: 'The function can read the global x directly.',
    predict: {
      prompt: `Q2 (Predict Output)

x = 5

def f():
    x = 10
    print(x)

f()
print(x)`,
      options: ['10 και 10', '5 και 10', '10 και 5', 'Error'],
      answer: 2,
      explanation: 'The local x is 10 inside the function, but the global x stays 5 outside it.',
    },
    trap: {
      prompt: `Q3 (Trap)

def f():
    print(y)

f()`,
      options: ['y', '0', 'None', 'Error'],
      answer: 3,
      explanation: 'y does not exist in local or global scope, so Python raises an error.',
    },
  },
  {
    id: 'python-recursion-intro',
    title: 'Recursion Intro',
    description: 'Introduce recursive thinking with self-calls and clear base cases.',
    difficulty: 'Intermediate',
    category: 'Recursion',
    examples: [
      {
        title: 'Example 1',
        code: `def count(n):
    if n == 0:
        return
    print(n)
    count(n - 1)

count(3)`,
        note: 'Η function καλεί τον εαυτό της.',
      },
      {
        title: 'Example 2',
        code: `def down(n):
    if n <= 0:
        return
    print(n)
    down(n - 1)

down(2)`,
        note: 'Χρειάζεται stop condition.',
      },
      {
        title: 'Example 3',
        code: `def show(n):
    if n == 1:
        print(n)
        return
    print(n)
    show(n - 1)

show(3)`,
        note: 'Recursion με base case.',
      },
      {
        title: 'Example 4',
        code: `def f(n):
    if n == 0:
        return
    print("Run")
    f(n - 1)

f(2)`,
        note: 'Η recursive call επαναλαμβάνει το pattern.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε recursive function που εμφανίζει τους αριθμούς από το n μέχρι το 1.',
    codingSolution: `def count_down(n):
    if n == 0:
        return
    print(n)
    count_down(n - 1)

count_down(3)`,
    codingExplanation: 'Use a base case to stop at 0, and call the function again with n - 1.',
    predict: {
      prompt: `Q2 (Predict Output)

def f(n):
    if n == 0:
        return
    print(n)
    f(n - 1)

f(2)`,
      options: ['2 και 1', '1 και 2', '2 μόνο', 'Error'],
      answer: 0,
      explanation: 'The function prints 2, then 1, then stops at 0.',
    },
    trap: {
      prompt: 'Q3 (Trap)\n\nΤι θα συμβεί αν λείπει το base case σε recursion;',
      options: ['Θα σταματήσει μόνο του', 'Θα τρέχει για πάντα μέχρι recursion error', 'Θα επιστρέψει 0', 'Θα εμφανίσει None'],
      answer: 1,
      explanation: 'Without a base case, the function keeps calling itself until Python hits the recursion limit.',
    },
  },
  {
    id: 'python-factorial',
    title: 'Factorial',
    description: 'Use recursion to calculate factorial values correctly and safely.',
    difficulty: 'Advanced',
    category: 'Recursion',
    examples: [
      {
        title: 'Example 1',
        code: `def fact(n):
    if n == 1:
        return 1
    return n * fact(n - 1)

print(fact(3))`,
        note: 'Υπολογισμός factorial με recursion.',
      },
      {
        title: 'Example 2',
        code: `def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(4))`,
        note: 'Το 0! είναι 1.',
      },
      {
        title: 'Example 3',
        code: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(2))`,
        note: 'Πιο ασφαλές base case.',
      },
      {
        title: 'Example 4',
        code: `x = fact(5)
print(x)`,
        note: 'Μπορούμε να αποθηκεύσουμε το αποτέλεσμα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε function fact(n) που επιστρέφει το factorial του n, και εμφάνισε το αποτέλεσμα για 4.',
    codingSolution: `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(4))`,
    codingExplanation: 'Use a base case for 1 or below, then multiply by fact(n - 1).',
    predict: {
      prompt: `Q2 (Predict Output)

def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(3))`,
      options: ['3', '6', '9', 'Error'],
      answer: 1,
      explanation: '3! equals 3 × 2 × 1, which is 6.',
    },
    trap: {
      prompt: `Q3 (Trap)

def fact(n):
    return n * fact(n - 1)

print(fact(3))`,
      options: ['6', '3', 'Infinite recursion / recursion error', '0'],
      answer: 2,
      explanation: 'Without a base case, the function never stops calling itself.',
    },
  },
  {
    id: 'python-linear-search',
    title: 'Linear Search',
    description: 'Scan a list item by item and stop early when a target is found.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
for n in nums:
    if n == 2:
        print("Found")`,
        note: 'Αναζήτηση μέσα σε λίστα.',
      },
      {
        title: 'Example 2',
        code: `nums = [5, 6, 7]
target = 6
for n in nums:
    if n == target:
        print("Found")`,
        note: 'Σύγκριση με target.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 3]
found = False
for n in nums:
    if n == 4:
        found = True
print(found)`,
        note: 'Χρήση flag.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2, 3]
for n in nums:
    if n == 2:
        print("Found")
        break`,
        note: 'Σταματά μόλις βρεθεί.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που ελέγχει αν ο αριθμός 5 υπάρχει στη λίστα [1, 5, 8] και εμφανίζει "Found" αν υπάρχει.',
    codingSolution: `nums = [1, 5, 8]
for n in nums:
    if n == 5:
        print("Found")`,
    codingExplanation: 'Loop through the list and print Found when you match the target value.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1, 2, 3]
found = False
for n in nums:
    if n == 2:
        found = True
print(found)`,
      options: ['True', 'False', '2', 'Error'],
      answer: 0,
      explanation: 'The loop sees 2, sets found to True, and prints True at the end.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [1, 2, 3]
for n in nums:
    if n == 4:
        print("Found")`,
      options: ['Found', '4', 'Nothing', 'Error'],
      answer: 2,
      explanation: 'Since 4 is not in the list, the print statement never runs.',
    },
  },
  {
    id: 'python-sorting',
    title: 'Sorting',
    description: 'Sort lists in place or with a new copy and understand which method returns None.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [3, 1, 2]
nums.sort()
print(nums)`,
        note: 'Ταξινόμηση μέσα στην ίδια λίστα.',
      },
      {
        title: 'Example 2',
        code: `nums = [3, 1, 2]
print(sorted(nums))`,
        note: 'Το sorted() επιστρέφει νέα λίστα.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 3]
nums.sort(reverse=True)
print(nums)`,
        note: 'Φθίνουσα σειρά.',
      },
      {
        title: 'Example 4',
        code: `words = ["b", "a"]
words.sort()
print(words)`,
        note: 'Ταξινομεί και strings.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [4, 1, 3, 2], ταξινόμησέ τη σε αύξουσα σειρά και εμφάνισέ τη.',
    codingSolution: `nums = [4, 1, 3, 2]
nums.sort()
print(nums)`,
    codingExplanation: 'sort() mutates the existing list into ascending order.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [2, 1]
nums.sort()
print(nums)`,
      options: ['[2, 1]', '[1, 2]', '12', 'Error'],
      answer: 1,
      explanation: 'After sorting, the list becomes [1, 2].',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [3, 1, 2]
print(nums.sort())`,
      options: ['[1, 2, 3]', 'None', '3', 'Error'],
      answer: 1,
      explanation: 'sort() returns None because it modifies the list in place.',
    },
  },
  {
    id: 'python-complexity-basics',
    title: 'Complexity Basics',
    description: 'Recognize the cost of direct access, loops, searches, and nested loops.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `for n in [1, 2, 3]:
    print(n)`,
        note: 'Αυτό το pattern τρέχει μία φορά για κάθε στοιχείο.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3]
print(nums[0])`,
        note: 'Πρόσβαση σε ένα index είναι άμεση.',
      },
      {
        title: 'Example 3',
        code: `for i in range(3):
    for j in range(3):
        print(i, j)`,
        note: 'Δύο nested loops κάνουν πολύ περισσότερες επαναλήψεις.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2, 3]
print(3 in nums)`,
        note: 'Η αναζήτηση σε λίστα ελέγχει στοιχεία ένα-ένα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που εμφανίζει όλα τα στοιχεία της λίστας [1, 2, 3, 4] ένα-ένα με loop.',
    codingSolution: `for n in [1, 2, 3, 4]:
    print(n)`,
    codingExplanation: 'A single loop touches each element once and prints it.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1, 2, 3]
print(nums[0])`,
      options: ['Πρόσβαση σε ένα μόνο στοιχείο', 'Loop σε όλα τα στοιχεία', 'Nested loop', 'Search σε όλη τη λίστα'],
      answer: 0,
      explanation: 'nums[0] reads one item directly by index.',
    },
    trap: {
      prompt: 'Q3 (Trap)\n\nΠοιο pattern κάνει περισσότερες συνολικές επαναλήψεις καθώς μεγαλώνει το input;',
      options: [
        'print(nums[0])',
        'for x in nums:\n    print(x)',
        'for i in nums:\n    for j in nums:\n        print(i, j)',
        'print(len(nums))',
      ],
      answer: 2,
      explanation: 'Nested loops grow much faster because each outer item triggers a full inner loop.',
    },
  },
  {
    id: 'python-two-pointers',
    title: 'Two Pointers',
    description: 'Introduce pointer-style index movement from both ends of a list.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
l = 0
r = 2
print(nums[l], nums[r])`,
        note: 'Δύο δείκτες σε δύο άκρα.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3, 4]
l = 0
r = len(nums) - 1
while l < r:
    print(nums[l], nums[r])
    l += 1
    r -= 1`,
        note: 'Οι pointers κινούνται προς το κέντρο.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 3]
l = 0
r = 2
print(nums[l] + nums[r])`,
        note: 'Μπορούμε να χρησιμοποιήσουμε και τις δύο τιμές μαζί.',
      },
      {
        title: 'Example 4',
        code: `nums = [10, 20, 30]
l = 0
while l < len(nums):
    print(nums[l])
    l += 1`,
        note: 'Pointer που διασχίζει τη λίστα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [1, 2, 3, 4], βάλε l = 0 και r = 3, και εμφάνισε το πρώτο και το τελευταίο στοιχείο.',
    codingSolution: `nums = [1, 2, 3, 4]
l = 0
r = 3
print(nums[l], nums[r])`,
    codingExplanation: 'l points at the first element and r at the last one.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [1, 2, 3]
l = 0
r = 2
print(nums[l], nums[r])`,
      options: ['1 2', '2 3', '1 3', 'Error'],
      answer: 2,
      explanation: 'Index 0 is 1 and index 2 is 3, so Python prints 1 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = [1, 2, 3]
print(nums[3])`,
      options: ['3', '0', 'None', 'Error'],
      answer: 3,
      explanation: 'The valid indexes are 0, 1, and 2, so index 3 is out of range.',
    },
  },
  {
    id: 'python-mixed-problems',
    title: 'Mixed Problems',
    description: 'Combine built-in list operations like min, max, len, and sum in one place.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
print(sum(nums))`,
        note: 'Άθροισμα λίστας.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3]
print(min(nums))`,
        note: 'Ελάχιστο στοιχείο.',
      },
      {
        title: 'Example 3',
        code: `nums = [1, 2, 3]
print(max(nums) - min(nums))`,
        note: 'Εύρος τιμών.',
      },
      {
        title: 'Example 4',
        code: `nums = [1, 2, 3]
print(len(nums))`,
        note: 'Μέγεθος λίστας.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [7, 2, 9] και εμφάνισε το μικρότερο στοιχείο της.',
    codingSolution: `nums = [7, 2, 9]
print(min(nums))`,
    codingExplanation: 'min() returns the smallest value in the list.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [4, 1, 8]
print(min(nums))`,
      options: ['8', '4', '1', 'Error'],
      answer: 2,
      explanation: 'The smallest value in [4, 1, 8] is 1.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = []
print(max(nums))`,
      options: ['0', '[]', 'None', 'Error'],
      answer: 3,
      explanation: 'max() on an empty list raises an error.',
    },
  },
  {
    id: 'python-data-processor',
    title: 'Data Processor',
    description: 'Use sorting, totals, counts, and averages to process a small dataset.',
    difficulty: 'Advanced',
    category: 'Algorithms',
    examples: [
      {
        title: 'Example 1',
        code: `nums = [1, 2, 3]
print(sum(nums))`,
        note: 'Υπολογισμός συνόλου.',
      },
      {
        title: 'Example 2',
        code: `nums = [1, 2, 3]
print(len(nums))`,
        note: 'Πλήθος στοιχείων.',
      },
      {
        title: 'Example 3',
        code: `nums = [3, 1, 2]
print(sorted(nums))`,
        note: 'Ταξινόμηση δεδομένων.',
      },
      {
        title: 'Example 4',
        code: `nums = [2, 4, 6]
print(sum(nums) / len(nums))`,
        note: 'Υπολογισμός μέσου όρου.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε λίστα [2, 4, 6, 8] και εμφάνισε τον μέσο όρο της.',
    codingSolution: `nums = [2, 4, 6, 8]
print(sum(nums) / len(nums))`,
    codingExplanation: 'The average is the total divided by the number of items.',
    predict: {
      prompt: `Q2 (Predict Output)

nums = [2, 4]
print(sum(nums) / len(nums))`,
      options: ['2', '3', '3.0', '6'],
      answer: 2,
      explanation: 'The sum is 6, the length is 2, and 6 / 2 gives 3.0.',
    },
    trap: {
      prompt: `Q3 (Trap)

nums = []
print(sum(nums) / len(nums))`,
      options: ['0', '0.0', 'None', 'Error'],
      answer: 3,
      explanation: 'len(nums) is 0, so dividing by it raises an error.',
    },
  },
  {
    id: 'python-file-reading',
    title: 'File Reading',
    description: 'Read full files, single lines, and line-by-line loops using safe patterns.',
    difficulty: 'Advanced',
    category: 'Files',
    examples: [
      {
        title: 'Example 1',
        code: `f = open("data.txt", "r")
print(f.read())
f.close()`,
        note: 'Διαβάζει όλο το αρχείο.',
      },
      {
        title: 'Example 2',
        code: `f = open("data.txt", "r")
print(f.readline())
f.close()`,
        note: 'Διαβάζει μία γραμμή.',
      },
      {
        title: 'Example 3',
        code: `with open("data.txt", "r") as f:
    print(f.read())`,
        note: 'Το with κλείνει αυτόματα το αρχείο.',
      },
      {
        title: 'Example 4',
        code: `with open("data.txt", "r") as f:
    for line in f:
        print(line)`,
        note: 'Διαβάζει γραμμή-γραμμή.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε κώδικα που ανοίγει το αρχείο data.txt σε mode ανάγνωσης και εμφανίζει όλο το περιεχόμενό του.',
    codingSolution: `with open("data.txt", "r") as f:
    print(f.read())`,
    codingExplanation: 'Use with open(..., "r") for safe file reading and print the result of read().',
    predict: {
      prompt: `Q2 (Predict Output)

Τι τύπο αντικειμένου είναι το f;

with open("data.txt", "r") as f:
    print(type(f))`,
      options: ['int', 'string', 'file object', 'list'],
      answer: 2,
      explanation: 'open() returns a file object that you can read from or write to.',
    },
    trap: {
      prompt: `Q3 (Trap)

f = open("data.txt", "r")
print(f.read())
print(f.read())
f.close()`,
      options: ['Το ίδιο περιεχόμενο θα εμφανιστεί δύο φορές', 'Το δεύτερο read() θα είναι κενό', 'Error', 'None'],
      answer: 1,
      explanation: 'After the first read(), the file cursor is at the end, so the second read() is empty.',
    },
  },
  {
    id: 'python-file-writing',
    title: 'File Writing',
    description: 'Write and append to files without confusing strings and non-string data.',
    difficulty: 'Advanced',
    category: 'Files',
    examples: [
      {
        title: 'Example 1',
        code: `f = open("data.txt", "w")
f.write("Hello")
f.close()`,
        note: 'Γράφει και κάνει overwrite το αρχείο.',
      },
      {
        title: 'Example 2',
        code: `with open("data.txt", "w") as f:
    f.write("New")`,
        note: 'Ασφαλής εγγραφή με with.',
      },
      {
        title: 'Example 3',
        code: `with open("data.txt", "a") as f:
    f.write(" More")`,
        note: 'Το a προσθέτει στο τέλος.',
      },
      {
        title: 'Example 4',
        code: `with open("data.txt", "w") as f:
    f.write(str(123))`,
        note: 'Το write() δέχεται string.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε κώδικα που δημιουργεί ή ανοίγει το notes.txt σε mode "w" και γράφει μέσα το Hello.',
    codingSolution: `with open("notes.txt", "w") as f:
    f.write("Hello")`,
    codingExplanation: 'Open the file in write mode and pass a string to write().',
    predict: {
      prompt: `Q2 (Predict Output)

Τι κάνει το mode "w" όταν το αρχείο έχει ήδη περιεχόμενο;`,
      options: [
        'Προσθέτει στο τέλος',
        'Σβήνει το παλιό περιεχόμενο και γράφει από την αρχή',
        'Διαβάζει μόνο',
        'Προκαλεί πάντα error',
      ],
      answer: 1,
      explanation: 'Mode "w" overwrites the file from the beginning.',
    },
    trap: {
      prompt: `Q3 (Trap)

with open("data.txt", "w") as f:
    f.write(123)`,
      options: ['Θα γράψει 123', 'Θα γράψει "123"', 'Error', 'None'],
      answer: 2,
      explanation: 'write() expects a string, so passing an integer directly raises an error.',
    },
  },
  {
    id: 'python-error-handling',
    title: 'Error Handling',
    description: 'Catch runtime failures with try/except and understand how finally behaves.',
    difficulty: 'Advanced',
    category: 'Errors',
    examples: [
      {
        title: 'Example 1',
        code: `try:
    print(10 / 0)
except:
    print("Error")`,
        note: 'Πιάνει runtime error.',
      },
      {
        title: 'Example 2',
        code: `try:
    x = int("a")
except:
    print("Invalid")`,
        note: 'Πιάνει conversion error.',
      },
      {
        title: 'Example 3',
        code: `try:
    print("Hi")
except:
    print("Error")`,
        note: 'Το except δεν εκτελείται αν δεν υπάρχει error.',
      },
      {
        title: 'Example 4',
        code: `try:
    print(5)
finally:
    print("Done")`,
        note: 'Το finally τρέχει πάντα.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΓράψε πρόγραμμα που προσπαθεί να κάνει 10 / 0 και αν υπάρξει error εμφανίζει το Cannot divide.',
    codingSolution: `try:
    print(10 / 0)
except:
    print("Cannot divide")`,
    codingExplanation: 'The except block catches the division error and prints the fallback message.',
    predict: {
      prompt: `Q2 (Predict Output)

try:
    print(1 / 0)
except:
    print("fail")`,
      options: ['0', '1', 'fail', 'Error χωρίς catch'],
      answer: 2,
      explanation: 'The division fails, so the except block prints fail.',
    },
    trap: {
      prompt: `Q3 (Trap)

try:
    print("OK")
except:
    print("Error")`,
      options: ['OK', 'Error', 'OK και Error', 'Nothing'],
      answer: 0,
      explanation: 'Since no error happens, only OK is printed.',
    },
  },
  {
    id: 'python-modules',
    title: 'Modules',
    description: 'Import functions and constants from modules instead of assuming they already exist.',
    difficulty: 'Advanced',
    category: 'Modules',
    examples: [
      {
        title: 'Example 1',
        code: `import math
print(math.sqrt(9))`,
        note: 'Χρήση function από module.',
      },
      {
        title: 'Example 2',
        code: `from math import sqrt
print(sqrt(16))`,
        note: 'Άμεσο import συγκεκριμένης function.',
      },
      {
        title: 'Example 3',
        code: `import math
print(math.pi)`,
        note: 'Πρόσβαση σε σταθερά του module.',
      },
      {
        title: 'Example 4',
        code: `import random
print(random.randint(1, 3))`,
        note: 'Χρήση άλλου module.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΚάνε import το math και εμφάνισε την τετραγωνική ρίζα του 25.',
    codingSolution: `import math
print(math.sqrt(25))`,
    codingExplanation: 'Import the module first, then call sqrt through math.',
    predict: {
      prompt: `Q2 (Predict Output)

from math import sqrt
print(sqrt(4))`,
      options: ['4', '2.0', '2', 'Error'],
      answer: 1,
      explanation: 'sqrt(4) returns 2.0 as a float.',
    },
    trap: {
      prompt: `Q3 (Trap)

print(math.sqrt(9))`,
      options: ['3.0', '3', 'Error', '9'],
      answer: 2,
      explanation: 'math was never imported, so Python raises an error.',
    },
  },
  {
    id: 'python-libraries',
    title: 'Libraries',
    description: 'Use common library helpers such as random choice and math rounding utilities.',
    difficulty: 'Advanced',
    category: 'Modules',
    examples: [
      {
        title: 'Example 1',
        code: `import random
print(random.choice([1, 2, 3]))`,
        note: 'Επιλέγει τυχαίο στοιχείο.',
      },
      {
        title: 'Example 2',
        code: `import random
nums = [1, 2, 3]
random.shuffle(nums)
print(nums)`,
        note: 'Ανακατεύει τη λίστα.',
      },
      {
        title: 'Example 3',
        code: `import math
print(math.ceil(2.3))`,
        note: 'Στρογγυλοποιεί προς τα πάνω.',
      },
      {
        title: 'Example 4',
        code: `import math
print(math.floor(2.9))`,
        note: 'Στρογγυλοποιεί προς τα κάτω.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΚάνε import το random και εμφάνισε ένα τυχαίο στοιχείο από τη λίστα ["A", "B", "C"].',
    codingSolution: `import random
print(random.choice(["A", "B", "C"]))`,
    codingExplanation: 'choice() returns one random element from the list.',
    predict: {
      prompt: `Q2 (Predict Output)

import math
print(math.ceil(2.1))`,
      options: ['2', '2.1', '3', 'Error'],
      answer: 2,
      explanation: 'ceil() rounds 2.1 up to the next whole number, which is 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

import random
nums = [1, 2, 3]
print(random.shuffle(nums))`,
      options: ['[1, 2, 3]', 'None', 'Random αριθμό', 'Error'],
      answer: 1,
      explanation: 'shuffle() changes the list in place and returns None.',
    },
  },
  {
    id: 'python-classes-intro',
    title: 'Classes Intro',
    description: 'Create simple classes and read attributes from instances.',
    difficulty: 'Advanced',
    category: 'OOP',
    examples: [
      {
        title: 'Example 1',
        code: `class User:
    name = "Alex"

u = User()
print(u.name)`,
        note: 'Δημιουργία class και instance.',
      },
      {
        title: 'Example 2',
        code: `class Car:
    brand = "BMW"

print(Car().brand)`,
        note: 'Πρόσβαση σε attribute instance.',
      },
      {
        title: 'Example 3',
        code: `class A:
    x = 5

print(A.x)`,
        note: 'Πρόσβαση σε class attribute.',
      },
      {
        title: 'Example 4',
        code: `class Book:
    title = "Python"

b = Book()
print(b.title)`,
        note: 'Instance διαβάζει attribute της class.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε class Dog με attribute name = "Rex" και εμφάνισε την τιμή του.',
    codingSolution: `class Dog:
    name = "Rex"

dog = Dog()
print(dog.name)`,
    codingExplanation: 'Create the class, instantiate it, then read the name attribute.',
    predict: {
      prompt: `Q2 (Predict Output)

class Test:
    value = 1

t = Test()
print(t.value)`,
      options: ['value', '1', 'Test', 'Error'],
      answer: 1,
      explanation: 'The instance reads the class attribute value, which is 1.',
    },
    trap: {
      prompt: `Q3 (Trap)

class A:
    x = 5

a = A()
print(a.y)`,
      options: ['5', 'y', 'None', 'Error'],
      answer: 3,
      explanation: 'Attribute y does not exist on the instance, so Python raises an error.',
    },
  },
  {
    id: 'python-constructor',
    title: 'Constructor',
    description: 'Initialize objects with __init__ and required constructor parameters.',
    difficulty: 'Advanced',
    category: 'OOP',
    examples: [
      {
        title: 'Example 1',
        code: `class User:
    def __init__(self, name):
        self.name = name

u = User("Alex")
print(u.name)`,
        note: 'Constructor με parameter.',
      },
      {
        title: 'Example 2',
        code: `class A:
    def __init__(self, x):
        self.x = x

print(A(3).x)`,
        note: 'Αποθήκευση τιμής στο object.',
      },
      {
        title: 'Example 3',
        code: `class T:
    def __init__(self):
        self.v = 5

print(T().v)`,
        note: 'Constructor χωρίς parameter.',
      },
      {
        title: 'Example 4',
        code: `class P:
    def __init__(self, a, b):
        self.a = a
        self.b = b

print(P(1, 2).a)`,
        note: 'Πολλαπλά attributes.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε class Student με constructor που παίρνει name και το αποθηκεύει στο self.name, και μετά δημιούργησε object με όνομα "Sam".',
    codingSolution: `class Student:
    def __init__(self, name):
        self.name = name

student = Student("Sam")
print(student.name)`,
    codingExplanation: 'Pass the name into the constructor and store it on self.name.',
    predict: {
      prompt: `Q2 (Predict Output)

class A:
    def __init__(self, x):
        self.x = x

a = A(3)
print(a.x)`,
      options: ['x', '3', 'A', 'Error'],
      answer: 1,
      explanation: 'The constructor stores 3 in self.x, so printing a.x shows 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

class A:
    def __init__(self, x):
        self.x = x

a = A()
print(a.x)`,
      options: ['0', 'None', 'Error', 'x'],
      answer: 2,
      explanation: 'The constructor requires x, so calling A() with no argument raises an error.',
    },
  },
  {
    id: 'python-methods',
    title: 'Methods',
    description: 'Define instance methods and understand how methods that print differ from methods that return.',
    difficulty: 'Advanced',
    category: 'OOP',
    examples: [
      {
        title: 'Example 1',
        code: `class A:
    def f(self):
        print("Hi")

A().f()`,
        note: 'Method μέσα σε class.',
      },
      {
        title: 'Example 2',
        code: `class B:
    def double(self, x):
        return x * 2

print(B().double(3))`,
        note: 'Method με parameter.',
      },
      {
        title: 'Example 3',
        code: `class C:
    def val(self):
        return 5

print(C().val())`,
        note: 'Method που επιστρέφει τιμή.',
      },
      {
        title: 'Example 4',
        code: `class U:
    def __init__(self, name):
        self.name = name

    def show(self):
        print(self.name)

U("Alex").show()`,
        note: 'Method που χρησιμοποιεί attribute του object.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε class Greeter με method say() που εμφανίζει Hello, και μετά κάλεσέ τη.',
    codingSolution: `class Greeter:
    def say(self):
        print("Hello")

Greeter().say()`,
    codingExplanation: 'Define the method with self, then call it on an instance.',
    predict: {
      prompt: `Q2 (Predict Output)

class A:
    def get(self):
        return 2

print(A().get())`,
      options: ['get', '2', 'A', 'Error'],
      answer: 1,
      explanation: 'The get() method returns 2, so print() shows 2.',
    },
    trap: {
      prompt: `Q3 (Trap)

class A:
    def show(self):
        print("Hi")

print(A().show())`,
      options: ['Hi', 'None', 'Hi και μετά None', 'Error'],
      answer: 2,
      explanation: 'show() prints Hi but returns None, so print(A().show()) displays None after Hi.',
    },
  },
  {
    id: 'python-attributes-methods',
    title: 'Attributes & Methods',
    description: 'Combine stored object state with methods that read or transform that state.',
    difficulty: 'Advanced',
    category: 'OOP',
    examples: [
      {
        title: 'Example 1',
        code: `class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age

print(User("A", 20).age)`,
        note: 'Object με πολλά attributes.',
      },
      {
        title: 'Example 2',
        code: `class Calc:
    def add(self, a, b):
        return a + b

print(Calc().add(2, 3))`,
        note: 'Method για υπολογισμό.',
      },
      {
        title: 'Example 3',
        code: `class Point:
    def __init__(self, x):
        self.x = x

    def get(self):
        return self.x

print(Point(5).get())`,
        note: 'Getter method.',
      },
      {
        title: 'Example 4',
        code: `class Box:
    def __init__(self, x):
        self.x = x

    def double(self):
        return self.x * 2

print(Box(4).double())`,
        note: 'Method που χρησιμοποιεί attribute.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε class Person με attributes name και age, και δημιούργησε object με τιμές "Alex" και 21.',
    codingSolution: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

person = Person("Alex", 21)
print(person.name, person.age)`,
    codingExplanation: 'Store both values in the constructor, then create one Person object.',
    predict: {
      prompt: `Q2 (Predict Output)

class Box:
    def __init__(self, x):
        self.x = x

b = Box(3)
print(b.x)`,
      options: ['Box', 'x', '3', 'Error'],
      answer: 2,
      explanation: 'The constructor stores 3 in the x attribute, so b.x prints 3.',
    },
    trap: {
      prompt: `Q3 (Trap)

class A:
    def show():
        print("Hi")

A().show()`,
      options: ['Hi', 'Nothing', 'Error', 'None'],
      answer: 2,
      explanation: 'Instance methods must include self as the first parameter.',
    },
  },
  {
    id: 'python-full-class-pattern',
    title: 'Full Class Pattern',
    description: 'Bring constructors, state, and methods together in one complete class pattern.',
    difficulty: 'Advanced',
    category: 'OOP',
    examples: [
      {
        title: 'Example 1',
        code: `class Counter:
    def __init__(self):
        self.value = 0

    def inc(self):
        self.value += 1

c = Counter()
c.inc()
print(c.value)`,
        note: 'Το object αλλάζει εσωτερική κατάσταση.',
      },
      {
        title: 'Example 2',
        code: `class Counter:
    def __init__(self):
        self.value = 0

    def add(self, x):
        self.value += x

c = Counter()
c.add(5)
print(c.value)`,
        note: 'Method που ενημερώνει attribute.',
      },
      {
        title: 'Example 3',
        code: `class Counter:
    def __init__(self):
        self.value = 0

    def get(self):
        return self.value

print(Counter().get())`,
        note: 'Getter method.',
      },
      {
        title: 'Example 4',
        code: `class Counter:
    def __init__(self):
        self.value = 0

    def reset(self):
        self.value = 0

c = Counter()
c.reset()
print(c.value)`,
        note: 'Επαναφορά κατάστασης.',
      },
    ],
    codingPrompt: 'Q1 (Coding)\nΔημιούργησε class Counter με attribute value = 0 μέσα σε constructor και method inc() που αυξάνει το value κατά 1. Μετά δημιούργησε object, κάλεσε το inc() μία φορά και εμφάνισε το value.',
    codingSolution: `class Counter:
    def __init__(self):
        self.value = 0

    def inc(self):
        self.value += 1

c = Counter()
c.inc()
print(c.value)`,
    codingExplanation: 'This combines constructor setup, mutation through a method, and reading final state.',
    predict: {
      prompt: `Q2 (Predict Output)

class Counter:
    def __init__(self):
        self.value = 0

    def inc(self):
        self.value += 1

c = Counter()
c.inc()
c.inc()
print(c.value)`,
      options: ['0', '1', '2', 'Error'],
      answer: 2,
      explanation: 'inc() runs twice, so value moves from 0 to 2.',
    },
    trap: {
      prompt: `Q3 (Trap)

class Counter:
    def __init__(self):
        self.value = 0

c = Counter()
print(value)`,
      options: ['0', 'value', 'None', 'Error'],
      answer: 3,
      explanation: 'value belongs to the object c, so print(value) fails because no standalone variable exists.',
    },
  },
];

export const pythonLessons: Lesson[] = pythonLessonBlueprints
  .map(makeLesson)
  .map(applyTrapErrorLabels)
  .map(applyScheduledDifficulty)
  .map((lesson) => translatePythonLessonText(lesson));

export const pythonLessonCatalogEntries = pythonLessons.map((lesson, languageIndex) => ({
  id: lesson.id,
  title: lesson.title,
  language: 'python' as const,
  index: languageIndex,
  languageIndex,
}));
