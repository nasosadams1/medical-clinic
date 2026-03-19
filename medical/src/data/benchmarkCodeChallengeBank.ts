import type { LanguageSlug } from './siteContent';
import type {
  BenchmarkCodeRubric,
  BenchmarkQuestionAssessmentType,
  BenchmarkQuestionDifficulty,
} from './benchmarkModel';

export interface BenchmarkCodeQuestionTemplate {
  templateId: string;
  lessonId: string;
  lessonTitle: string;
  competency: string;
  difficulty: BenchmarkQuestionDifficulty;
  kind: 'code';
  assessmentType: BenchmarkQuestionAssessmentType;
  prompt: string;
  starterCode: string;
  referenceCode: string;
  validationMode: 'exact' | 'includes_all';
  requiredSnippets?: string[];
  edgeCaseSnippets?: string[];
  qualitySignals?: string[];
  efficiencySignals?: string[];
  forbiddenPatterns?: string[];
  weights?: BenchmarkCodeRubric['weights'];
  explanation: string;
}

const defineCodeQuestions = (
  lessonId: string,
  lessonTitle: string,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  variants: Array<
    Omit<
      BenchmarkCodeQuestionTemplate,
      'templateId' | 'lessonId' | 'lessonTitle' | 'competency' | 'difficulty' | 'kind' | 'assessmentType'
    >
  >,
  assessmentType: BenchmarkQuestionAssessmentType = 'implementation'
): BenchmarkCodeQuestionTemplate[] =>
  variants.map((variant, index) => ({
    templateId: `${lessonId}-code-benchmark-${index + 1}`,
    lessonId,
    lessonTitle,
    competency,
    difficulty,
    kind: 'code',
    assessmentType,
    ...variant,
  }));

const pythonCodeTemplates: BenchmarkCodeQuestionTemplate[] = [
  ...defineCodeQuestions('python-variables-1', 'Python Variables - Introduction', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Write Python code that stores `7` in a variable called `score` and prints it.',
      starterCode: 'score = \nprint(score)\n',
      referenceCode: 'score = 7\nprint(score)\n',
      validationMode: 'includes_all',
      requiredSnippets: ['score = 7', 'print(score)'],
      explanation: 'This checks that you can assign a value to a variable and print it.',
    },
    {
      prompt: 'Write Python code that stores `"Ada"` in a variable called `name` and prints it.',
      starterCode: 'name = \nprint(name)\n',
      referenceCode: 'name = "Ada"\nprint(name)\n',
      validationMode: 'includes_all',
      requiredSnippets: ['name = "Ada"', 'print(name)'],
      explanation: 'This checks variable declaration and output with a string value.',
    },
  ]),
  ...defineCodeQuestions('python-if-statements', 'Python If Statements', 'Control flow', 'beginner', [
    {
      prompt: 'Write Python code that sets `score = 72` and prints `"pass"` if `score >= 70`, otherwise prints `"retry"`.',
      starterCode: 'score = 72\nif \n',
      referenceCode: 'score = 72\nif score >= 70:\n    print("pass")\nelse:\n    print("retry")\n',
      validationMode: 'includes_all',
      requiredSnippets: ['score = 72', 'if score >= 70:', 'print("pass")', 'else:', 'print("retry")'],
      explanation: 'This checks basic conditional control flow in Python.',
    },
    {
      prompt: 'Write Python code that sets `logged_in = False` and prints `"dashboard"` if true, otherwise `"login"`.',
      starterCode: 'logged_in = False\nif \n',
      referenceCode: 'logged_in = False\nif logged_in:\n    print("dashboard")\nelse:\n    print("login")\n',
      validationMode: 'includes_all',
      requiredSnippets: ['logged_in = False', 'if logged_in:', 'print("dashboard")', 'else:', 'print("login")'],
      explanation: 'This checks that you can branch on a boolean value.',
    },
  ]),
  ...defineCodeQuestions('python-lists', 'Python Lists', 'Collections', 'intermediate', [
    {
      prompt: 'Create a list called `items` with `"red"`, `"blue"`, and `"green"`, then print the second item.',
      starterCode: 'items = []\n',
      referenceCode: 'items = ["red", "blue", "green"]\nprint(items[1])\n',
      validationMode: 'includes_all',
      requiredSnippets: ['items = ["red", "blue", "green"]', 'print(items[1])'],
      explanation: 'This checks list creation and zero-based indexing.',
    },
    {
      prompt: 'Create a list `nums = [2, 4]`, append `6`, and print the length of the list.',
      starterCode: 'nums = [2, 4]\n',
      referenceCode: 'nums = [2, 4]\nnums.append(6)\nprint(len(nums))\n',
      validationMode: 'includes_all',
      requiredSnippets: ['nums = [2, 4]', 'nums.append(6)', 'print(len(nums))'],
      explanation: 'This checks appending to a list and reading its length.',
    },
  ]),
  ...defineCodeQuestions('python-functions', 'Python Functions', 'Functions', 'intermediate', [
    {
      prompt: 'Define a Python function `add(a, b)` that returns the sum, then print the result of `add(2, 3)`.',
      starterCode: 'def add(a, b):\n    \n\nprint(add(2, 3))\n',
      referenceCode: 'def add(a, b):\n    return a + b\n\nprint(add(2, 3))\n',
      validationMode: 'includes_all',
      requiredSnippets: ['def add(a, b):', 'return a + b', 'print(add(2, 3))'],
      explanation: 'This checks function definition, return values, and function calls.',
    },
    {
      prompt: 'Define a Python function `greet(name)` that returns `"Hi " + name`, then print `greet("Ada")`.',
      starterCode: 'def greet(name):\n    \n\nprint(greet("Ada"))\n',
      referenceCode: 'def greet(name):\n    return "Hi " + name\n\nprint(greet("Ada"))\n',
      validationMode: 'includes_all',
      requiredSnippets: ['def greet(name):', 'return "Hi " + name', 'print(greet("Ada"))'],
      explanation: 'This checks string-returning functions and calling them correctly.',
    },
  ]),
  ...defineCodeQuestions('python-functions', 'Python Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'Write Python code that loops over `[1, 2, 3]`, stores the running total in `total`, and prints it.',
      starterCode: 'values = [1, 2, 3]\ntotal = 0\n',
      referenceCode: 'values = [1, 2, 3]\ntotal = 0\nfor value in values:\n    total += value\nprint(total)\n',
      validationMode: 'includes_all',
      requiredSnippets: ['values = [1, 2, 3]', 'total = 0', 'for value in values:', 'total += value', 'print(total)'],
      explanation: 'This checks simple iteration and accumulation.',
    },
    {
      prompt: 'Define a Python function `is_even(n)` that returns whether a number is even, then print `is_even(6)`.',
      starterCode: 'def is_even(n):\n    \n\nprint(is_even(6))\n',
      referenceCode: 'def is_even(n):\n    return n % 2 == 0\n\nprint(is_even(6))\n',
      validationMode: 'includes_all',
      requiredSnippets: ['def is_even(n):', 'return n % 2 == 0', 'print(is_even(6))'],
      explanation: 'This checks a simple boolean predicate and modulo logic.',
    },
  ]),
];

const javascriptCodeTemplates: BenchmarkCodeQuestionTemplate[] = [
  ...defineCodeQuestions('javascript-variables-1', 'JavaScript Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Write JavaScript that stores `7` in `score` and logs it.',
      starterCode: 'let score = \nconsole.log(score);\n',
      referenceCode: 'let score = 7;\nconsole.log(score);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['let score = 7', 'console.log(score)'],
      explanation: 'This checks block-scoped variable declaration and logging.',
    },
    {
      prompt: 'Write JavaScript that stores `"Ava"` in `name` and logs it.',
      starterCode: 'let name = \nconsole.log(name);\n',
      referenceCode: 'let name = "Ava";\nconsole.log(name);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['let name = "Ava"', 'console.log(name)'],
      explanation: 'This checks string assignment and output in JavaScript.',
    },
  ]),
  ...defineCodeQuestions('javascript-if-else-1', 'JavaScript If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'Write JavaScript that sets `score = 72` and logs `"pass"` if `score >= 70`, otherwise `"retry"`.',
      starterCode: 'const score = 72;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'const score = 72;\nif (score >= 70) {\n  console.log("pass");\n} else {\n  console.log("retry");\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['const score = 72', 'if (score >= 70)', 'console.log("pass")', 'else', 'console.log("retry")'],
      explanation: 'This checks simple branching and logging.',
    },
    {
      prompt: 'Write JavaScript that sets `isMember = false` and logs `"discount"` if true, otherwise `"standard"`.',
      starterCode: 'const isMember = false;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'const isMember = false;\nif (isMember) {\n  console.log("discount");\n} else {\n  console.log("standard");\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['const isMember = false', 'if (isMember)', 'console.log("discount")', 'else', 'console.log("standard")'],
      explanation: 'This checks boolean control flow in JavaScript.',
    },
  ]),
  ...defineCodeQuestions('javascript-arrays-1', 'JavaScript Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'Create `items = ["api", "ui", "db"]` and log the first element.',
      starterCode: 'const items = [];\n',
      referenceCode: 'const items = ["api", "ui", "db"];\nconsole.log(items[0]);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['const items = ["api", "ui", "db"]', 'console.log(items[0])'],
      explanation: 'This checks array creation and zero-based access.',
    },
    {
      prompt: 'Create `values = [1, 2]`, push `3`, and log the length.',
      starterCode: 'const values = [1, 2];\n',
      referenceCode: 'const values = [1, 2];\nvalues.push(3);\nconsole.log(values.length);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['const values = [1, 2]', 'values.push(3)', 'console.log(values.length)'],
      explanation: 'This checks array mutation and property access.',
    },
  ]),
  ...defineCodeQuestions('javascript-functions-1', 'JavaScript Functions', 'Functions', 'intermediate', [
    {
      prompt: 'Define `multiply(a, b)` so it returns the product, then log `multiply(3, 4)`.',
      starterCode: 'function multiply(a, b) {\n  \n}\n\nconsole.log(multiply(3, 4));\n',
      referenceCode: 'function multiply(a, b) {\n  return a * b;\n}\n\nconsole.log(multiply(3, 4));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['function multiply(a, b)', 'return a * b', 'console.log(multiply(3, 4))'],
      explanation: 'This checks basic function syntax and returns.',
    },
    {
      prompt: 'Define `greet(name)` so it returns `"Hi " + name`, then log `greet("Mia")`.',
      starterCode: 'function greet(name) {\n  \n}\n\nconsole.log(greet("Mia"));\n',
      referenceCode: 'function greet(name) {\n  return "Hi " + name;\n}\n\nconsole.log(greet("Mia"));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['function greet(name)', 'return "Hi " + name', 'console.log(greet("Mia"))'],
      explanation: 'This checks string concatenation in a function.',
    },
  ]),
  ...defineCodeQuestions('javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'Write JavaScript that loops over `[2, 3, 4]`, stores the total in `total`, and logs it.',
      starterCode: 'const nums = [2, 3, 4];\nlet total = 0;\n',
      referenceCode: 'const nums = [2, 3, 4];\nlet total = 0;\nfor (const num of nums) {\n  total += num;\n}\nconsole.log(total);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['const nums = [2, 3, 4]', 'let total = 0', 'for (const num of nums)', 'total += num', 'console.log(total)'],
      explanation: 'This checks iteration and accumulation.',
    },
    {
      prompt: 'Define `isOdd(value)` so it returns whether a value is odd, then log `isOdd(5)`.',
      starterCode: 'function isOdd(value) {\n  \n}\n\nconsole.log(isOdd(5));\n',
      referenceCode: 'function isOdd(value) {\n  return value % 2 !== 0;\n}\n\nconsole.log(isOdd(5));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['function isOdd(value)', 'return value % 2 !== 0', 'console.log(isOdd(5))'],
      explanation: 'This checks modulo-based boolean logic.',
    },
  ]),
];

const cppCodeTemplates: BenchmarkCodeQuestionTemplate[] = [
  ...defineCodeQuestions('cpp-variables', 'C++ Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Write C++ that declares `int score = 7;` and prints it with `cout`.',
      starterCode: 'int score = ;\n',
      referenceCode: 'int score = 7;\ncout << score;\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int score = 7;', 'cout << score;'],
      explanation: 'This checks integer declaration and basic console output.',
    },
    {
      prompt: 'Write C++ that declares `string name = "Ada";` and prints it with `cout`.',
      starterCode: 'string name = ;\n',
      referenceCode: 'string name = "Ada";\ncout << name;\n',
      validationMode: 'includes_all',
      requiredSnippets: ['string name = "Ada";', 'cout << name;'],
      explanation: 'This checks string declaration and console output.',
    },
  ]),
  ...defineCodeQuestions('cpp-if-else', 'C++ If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'Write C++ that sets `int age = 20;` and prints `"adult"` if `age >= 18`, otherwise `"minor"`.',
      starterCode: 'int age = 20;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'int age = 20;\nif (age >= 18) {\n  cout << "adult";\n} else {\n  cout << "minor";\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int age = 20;', 'if (age >= 18)', 'cout << "adult";', 'else', 'cout << "minor";'],
      explanation: 'This checks if/else syntax and output in C++.',
    },
    {
      prompt: 'Write C++ that sets `bool ready = false;` and prints `"go"` if true, otherwise `"wait"`.',
      starterCode: 'bool ready = false;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'bool ready = false;\nif (ready) {\n  cout << "go";\n} else {\n  cout << "wait";\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['bool ready = false;', 'if (ready)', 'cout << "go";', 'else', 'cout << "wait";'],
      explanation: 'This checks boolean control flow in C++.',
    },
  ]),
  ...defineCodeQuestions('cpp-arrays', 'C++ Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'Create `int nums[3] = {1, 2, 3};` and print the third item.',
      starterCode: 'int nums[3] = {1, 2, 3};\n',
      referenceCode: 'int nums[3] = {1, 2, 3};\ncout << nums[2];\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int nums[3] = {1, 2, 3};', 'cout << nums[2];'],
      explanation: 'This checks array declaration and indexing.',
    },
    {
      prompt: 'Create `int scores[2] = {8, 9};` and print the first item.',
      starterCode: 'int scores[2] = {8, 9};\n',
      referenceCode: 'int scores[2] = {8, 9};\ncout << scores[0];\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int scores[2] = {8, 9};', 'cout << scores[0];'],
      explanation: 'This checks zero-based array access.',
    },
  ]),
  ...defineCodeQuestions('cpp-functions', 'C++ Functions', 'Functions', 'intermediate', [
    {
      prompt: 'Define `int multiply(int a, int b)` so it returns the product, then print `multiply(2, 5)`.',
      starterCode: 'int multiply(int a, int b) {\n  \n}\n',
      referenceCode: 'int multiply(int a, int b) {\n  return a * b;\n}\n\ncout << multiply(2, 5);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int multiply(int a, int b)', 'return a * b;', 'cout << multiply(2, 5);'],
      explanation: 'This checks function declaration, return types, and calling the function.',
    },
    {
      prompt: 'Define `int square(int value)` so it returns `value * value`, then print `square(4)`.',
      starterCode: 'int square(int value) {\n  \n}\n',
      referenceCode: 'int square(int value) {\n  return value * value;\n}\n\ncout << square(4);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int square(int value)', 'return value * value;', 'cout << square(4);'],
      explanation: 'This checks numeric return values in a C++ function.',
    },
  ]),
  ...defineCodeQuestions('cpp-functions', 'C++ Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'Write C++ that loops from 1 to 3, stores the running total in `total`, and prints it.',
      starterCode: 'int total = 0;\n',
      referenceCode: 'int total = 0;\nfor (int i = 1; i <= 3; i++) {\n  total += i;\n}\ncout << total;\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int total = 0;', 'for (int i = 1; i <= 3; i++)', 'total += i;', 'cout << total;'],
      explanation: 'This checks a simple accumulation loop.',
    },
    {
      prompt: 'Define `bool is_even(int value)` so it returns whether the value is even, then print `is_even(8)`.',
      starterCode: 'bool is_even(int value) {\n  \n}\n',
      referenceCode: 'bool is_even(int value) {\n  return value % 2 == 0;\n}\n\ncout << is_even(8);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['bool is_even(int value)', 'return value % 2 == 0;', 'cout << is_even(8);'],
      explanation: 'This checks modulo logic and boolean return values.',
    },
  ]),
];

const javaCodeTemplates: BenchmarkCodeQuestionTemplate[] = [
  ...defineCodeQuestions('java-variables', 'Java Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Write Java that declares `int score = 10;` and prints it with `System.out.println`.',
      starterCode: 'int score = ;\n',
      referenceCode: 'int score = 10;\nSystem.out.println(score);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int score = 10;', 'System.out.println(score);'],
      explanation: 'This checks integer declaration and Java console output.',
    },
    {
      prompt: 'Write Java that declares `String name = "Ada";` and prints it.',
      starterCode: 'String name = ;\n',
      referenceCode: 'String name = "Ada";\nSystem.out.println(name);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['String name = "Ada";', 'System.out.println(name);'],
      explanation: 'This checks string declaration and output in Java.',
    },
  ]),
  ...defineCodeQuestions('java-if-else', 'Java If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'Write Java that sets `int age = 21;` and prints `"adult"` if `age >= 18`, otherwise `"minor"`.',
      starterCode: 'int age = 21;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'int age = 21;\nif (age >= 18) {\n  System.out.println("adult");\n} else {\n  System.out.println("minor");\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int age = 21;', 'if (age >= 18)', 'System.out.println("adult");', 'else', 'System.out.println("minor");'],
      explanation: 'This checks Java if/else syntax.',
    },
    {
      prompt: 'Write Java that sets `boolean ready = false;` and prints `"go"` if true, otherwise `"wait"`.',
      starterCode: 'boolean ready = false;\nif () {\n  \n} else {\n  \n}\n',
      referenceCode: 'boolean ready = false;\nif (ready) {\n  System.out.println("go");\n} else {\n  System.out.println("wait");\n}\n',
      validationMode: 'includes_all',
      requiredSnippets: ['boolean ready = false;', 'if (ready)', 'System.out.println("go");', 'else', 'System.out.println("wait");'],
      explanation: 'This checks boolean branching in Java.',
    },
  ]),
  ...defineCodeQuestions('java-arrays', 'Java Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'Create `int[] scores = {7, 8, 9};` and print the third item.',
      starterCode: 'int[] scores = {7, 8, 9};\n',
      referenceCode: 'int[] scores = {7, 8, 9};\nSystem.out.println(scores[2]);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int[] scores = {7, 8, 9};', 'System.out.println(scores[2]);'],
      explanation: 'This checks Java array indexing.',
    },
    {
      prompt: 'Create `int[] values = {4, 5};` and print the first item.',
      starterCode: 'int[] values = {4, 5};\n',
      referenceCode: 'int[] values = {4, 5};\nSystem.out.println(values[0]);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int[] values = {4, 5};', 'System.out.println(values[0]);'],
      explanation: 'This checks zero-based access in Java arrays.',
    },
  ]),
  ...defineCodeQuestions('java-methods', 'Java Methods', 'Functions', 'intermediate', [
    {
      prompt: 'Define `int add(int a, int b)` so it returns the sum, then print `add(2, 3)`.',
      starterCode: 'int add(int a, int b) {\n  \n}\n',
      referenceCode: 'int add(int a, int b) {\n  return a + b;\n}\n\nSystem.out.println(add(2, 3));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int add(int a, int b)', 'return a + b;', 'System.out.println(add(2, 3));'],
      explanation: 'This checks method syntax and return values in Java.',
    },
    {
      prompt: 'Define `int doubleValue(int value)` so it returns `value * 2`, then print `doubleValue(6)`.',
      starterCode: 'int doubleValue(int value) {\n  \n}\n',
      referenceCode: 'int doubleValue(int value) {\n  return value * 2;\n}\n\nSystem.out.println(doubleValue(6));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int doubleValue(int value)', 'return value * 2;', 'System.out.println(doubleValue(6));'],
      explanation: 'This checks method definitions and simple arithmetic logic.',
    },
  ]),
  ...defineCodeQuestions('java-methods', 'Java Methods', 'Problem solving', 'intermediate', [
    {
      prompt: 'Write Java that loops from 1 to 3, stores the running total in `total`, and prints it.',
      starterCode: 'int total = 0;\n',
      referenceCode: 'int total = 0;\nfor (int i = 1; i <= 3; i++) {\n  total += i;\n}\nSystem.out.println(total);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int total = 0;', 'for (int i = 1; i <= 3; i++)', 'total += i;', 'System.out.println(total);'],
      explanation: 'This checks Java loops and accumulation.',
    },
    {
      prompt: 'Define `boolean isEven(int value)` so it returns whether a number is even, then print `isEven(10)`.',
      starterCode: 'boolean isEven(int value) {\n  \n}\n',
      referenceCode: 'boolean isEven(int value) {\n  return value % 2 == 0;\n}\n\nSystem.out.println(isEven(10));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['boolean isEven(int value)', 'return value % 2 == 0;', 'System.out.println(isEven(10));'],
      explanation: 'This checks boolean method returns and modulo logic.',
    },
  ]),
];

const pythonDebugTemplates = defineCodeQuestions(
  'python-debugging',
  'Python Debugging',
  'Problem solving',
  'advanced',
  [
    {
      prompt:
        'Fix the Python function so it counts values greater than 3 and prints the final count. Keep the same variable names.',
      starterCode:
        'values = [2, 4, 5]\ncount = 0\nfor value in values:\n    if value > 3\n        count = value\nprint(count)\n',
      referenceCode:
        'values = [2, 4, 5]\ncount = 0\nfor value in values:\n    if value > 3:\n        count += 1\nprint(count)\n',
      validationMode: 'includes_all',
      requiredSnippets: ['if value > 3:', 'count += 1', 'print(count)'],
      edgeCaseSnippets: ['count = 0', 'for value in values:'],
      qualitySignals: ['count += 1'],
      efficiencySignals: ['for value in values:'],
      forbiddenPatterns: ['count = value'],
      explanation: 'This checks debugging around conditions, counting logic, and preserving the intended loop structure.',
    },
    {
      prompt:
        'Fix the function so it returns the last item from the list without crashing on indexing mistakes.',
      starterCode:
        'def last_item(items):\n    return items[len(items)]\n\nprint(last_item(["a", "b", "c"]))\n',
      referenceCode:
        'def last_item(items):\n    return items[len(items) - 1]\n\nprint(last_item(["a", "b", "c"]))\n',
      validationMode: 'includes_all',
      requiredSnippets: ['def last_item(items):', 'return items[len(items) - 1]', 'print(last_item(["a", "b", "c"]))'],
      edgeCaseSnippets: ['len(items) - 1'],
      qualitySignals: ['def last_item(items):'],
      efficiencySignals: ['return items[len(items) - 1]'],
      forbiddenPatterns: ['items[len(items)]'],
      explanation: 'This checks list-index debugging and safe off-by-one fixes.',
    },
  ],
  'debugging'
);

const javascriptDebugTemplates = defineCodeQuestions(
  'javascript-debugging',
  'JavaScript Debugging',
  'Problem solving',
  'advanced',
  [
    {
      prompt:
        'Fix the JavaScript loop so it counts values greater than 4 and logs the final count. Keep the same variable names.',
      starterCode:
        'const values = [3, 6, 9];\nlet count = 0;\nfor (const value of values) {\n  if (value > 4) {\n    count = value;\n  }\n}\nconsole.log(total);\n',
      referenceCode:
        'const values = [3, 6, 9];\nlet count = 0;\nfor (const value of values) {\n  if (value > 4) {\n    count += 1;\n  }\n}\nconsole.log(count);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['if (value > 4)', 'count += 1', 'console.log(count)'],
      edgeCaseSnippets: ['let count = 0', 'for (const value of values)'],
      qualitySignals: ['count += 1'],
      efficiencySignals: ['for (const value of values)'],
      forbiddenPatterns: ['count = value', 'console.log(total)'],
      explanation: 'This checks debugging of loop state and output variables.',
    },
    {
      prompt:
        'Fix the function so it returns the last item from the array instead of reading past the end.',
      starterCode:
        'function lastItem(items) {\n  return items[items.length];\n}\n\nconsole.log(lastItem(["api", "ui", "db"]));\n',
      referenceCode:
        'function lastItem(items) {\n  return items[items.length - 1];\n}\n\nconsole.log(lastItem(["api", "ui", "db"]));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['function lastItem(items)', 'return items[items.length - 1]', 'console.log(lastItem(["api", "ui", "db"]))'],
      edgeCaseSnippets: ['items.length - 1'],
      qualitySignals: ['function lastItem(items)'],
      efficiencySignals: ['return items[items.length - 1]'],
      forbiddenPatterns: ['items[items.length]'],
      explanation: 'This checks debugging array indexing in JavaScript.',
    },
  ],
  'debugging'
);

const cppDebugTemplates = defineCodeQuestions(
  'cpp-debugging',
  'C++ Debugging',
  'Problem solving',
  'advanced',
  [
    {
      prompt:
        'Fix the C++ loop so it counts values greater than 2 and prints the final count.',
      starterCode:
        'int nums[3] = {2, 3, 4};\nint count = 0;\nfor (int i = 0; i < 3; i++) {\n  if (nums[i] > 2) {\n    count = nums[i];\n  }\n}\ncout << total;\n',
      referenceCode:
        'int nums[3] = {2, 3, 4};\nint count = 0;\nfor (int i = 0; i < 3; i++) {\n  if (nums[i] > 2) {\n    count += 1;\n  }\n}\ncout << count;\n',
      validationMode: 'includes_all',
      requiredSnippets: ['if (nums[i] > 2)', 'count += 1;', 'cout << count;'],
      edgeCaseSnippets: ['int count = 0;', 'for (int i = 0; i < 3; i++)'],
      qualitySignals: ['count += 1;'],
      efficiencySignals: ['for (int i = 0; i < 3; i++)'],
      forbiddenPatterns: ['count = nums[i];', 'cout << total;'],
      explanation: 'This checks debugging variable updates and output in a loop.',
    },
    {
      prompt:
        'Fix the function so it returns the last array item without going out of bounds.',
      starterCode:
        'int lastValue(int nums[3]) {\n  return nums[3];\n}\n\ncout << lastValue((int[3]){1, 2, 3});\n',
      referenceCode:
        'int lastValue(int nums[3]) {\n  return nums[2];\n}\n\ncout << lastValue((int[3]){1, 2, 3});\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int lastValue(int nums[3])', 'return nums[2];', 'cout << lastValue((int[3]){1, 2, 3});'],
      edgeCaseSnippets: ['return nums[2];'],
      qualitySignals: ['int lastValue(int nums[3])'],
      efficiencySignals: ['return nums[2];'],
      forbiddenPatterns: ['return nums[3];'],
      explanation: 'This checks debugging fixed-size array indexing in C++.',
    },
  ],
  'debugging'
);

const javaDebugTemplates = defineCodeQuestions(
  'java-debugging',
  'Java Debugging',
  'Problem solving',
  'advanced',
  [
    {
      prompt:
        'Fix the Java loop so it counts values greater than 2 and prints the final count.',
      starterCode:
        'int[] values = {2, 3, 4};\nint count = 0;\nfor (int i = 0; i < values.length; i++) {\n  if (values[i] > 2) {\n    count = values[i];\n  }\n}\nSystem.out.println(total);\n',
      referenceCode:
        'int[] values = {2, 3, 4};\nint count = 0;\nfor (int i = 0; i < values.length; i++) {\n  if (values[i] > 2) {\n    count += 1;\n  }\n}\nSystem.out.println(count);\n',
      validationMode: 'includes_all',
      requiredSnippets: ['if (values[i] > 2)', 'count += 1;', 'System.out.println(count);'],
      edgeCaseSnippets: ['int count = 0;', 'for (int i = 0; i < values.length; i++)'],
      qualitySignals: ['count += 1;'],
      efficiencySignals: ['for (int i = 0; i < values.length; i++)'],
      forbiddenPatterns: ['count = values[i];', 'System.out.println(total);'],
      explanation: 'This checks debugging in Java loops and counters.',
    },
    {
      prompt:
        'Fix the method so it returns the last array item instead of reading past the end.',
      starterCode:
        'int lastValue(int[] values) {\n  return values[values.length];\n}\n\nSystem.out.println(lastValue(new int[]{1, 2, 3}));\n',
      referenceCode:
        'int lastValue(int[] values) {\n  return values[values.length - 1];\n}\n\nSystem.out.println(lastValue(new int[]{1, 2, 3}));\n',
      validationMode: 'includes_all',
      requiredSnippets: ['int lastValue(int[] values)', 'return values[values.length - 1];', 'System.out.println(lastValue(new int[]{1, 2, 3}));'],
      edgeCaseSnippets: ['values.length - 1'],
      qualitySignals: ['int lastValue(int[] values)'],
      efficiencySignals: ['return values[values.length - 1];'],
      forbiddenPatterns: ['values[values.length]'],
      explanation: 'This checks debugging array indexing in Java.',
    },
  ],
  'debugging'
);

export const benchmarkCodeChallengeBankByLanguage: Record<LanguageSlug, BenchmarkCodeQuestionTemplate[]> = {
  python: [...pythonCodeTemplates, ...pythonDebugTemplates],
  javascript: [...javascriptCodeTemplates, ...javascriptDebugTemplates],
  cpp: [...cppCodeTemplates, ...cppDebugTemplates],
  java: [...javaCodeTemplates, ...javaDebugTemplates],
};
