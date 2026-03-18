import type { LanguageSlug } from './siteContent';

export type BenchmarkQuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface BenchmarkQuestionTemplate {
  templateId: string;
  lessonId: string;
  lessonTitle: string;
  competency: string;
  difficulty: BenchmarkQuestionDifficulty;
  prompt: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const defineQuestions = (
  lessonId: string,
  lessonTitle: string,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  variants: Array<{
    prompt: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>
): BenchmarkQuestionTemplate[] =>
  variants.map((variant, index) => ({
    templateId: `${lessonId}-benchmark-${index + 1}`,
    lessonId,
    lessonTitle,
    competency,
    difficulty,
    ...variant,
  }));

const pythonTemplates: BenchmarkQuestionTemplate[] = [
  ...defineQuestions('python-variables-1', 'Python Variables - Introduction', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Which of the following is a valid variable name in Python?',
      options: ['2name', 'first_name', 'class', 'first-name'],
      correctAnswer: 1,
      explanation: 'Python variable names cannot start with a number, cannot include hyphens, and cannot use reserved keywords.',
    },
    {
      prompt: 'What does this code print?\n\nscore = 4\nscore = score + 3\nprint(score)',
      options: ['4', '7', '43', 'Error'],
      correctAnswer: 1,
      explanation: 'The variable is reassigned to 4 + 3, so the printed value is 7.',
    },
    {
      prompt: 'Which assignment is valid in Python?',
      options: ['user-name = "Ada"', '1user = "Ada"', 'user_name = "Ada"', 'user name = "Ada"'],
      correctAnswer: 2,
      explanation: 'Underscores are allowed in Python variable names, but spaces, hyphens, and leading numbers are not.',
    },
  ]),
  ...defineQuestions('python-variables-2', 'Python Variables - Types and Operations', 'Data types and operators', 'beginner', [
    {
      prompt: 'What is the output of this code?\n\nx = "5"\ny = 2\nprint(x * y)',
      options: ['7', '10', '55', '55 (string repeated)'],
      correctAnswer: 3,
      explanation: 'Multiplying a string by an integer repeats the string that many times.',
    },
    {
      prompt: 'Which Python type would `3.5` have?',
      options: ['int', 'float', 'bool', 'str'],
      correctAnswer: 1,
      explanation: 'Numbers with a decimal point are floats in Python.',
    },
    {
      prompt: 'What is the value of `result` here?\n\nresult = 9 // 2',
      options: ['4', '4.5', '5', 'Error'],
      correctAnswer: 0,
      explanation: '`//` performs floor division in Python, so 9 // 2 evaluates to 4.',
    },
  ]),
  ...defineQuestions('python-if-statements', 'Python If Statements', 'Control flow', 'beginner', [
    {
      prompt: 'What will this code print?\n\nx = 8\nif x > 5:\n    print("High")\nelse:\n    print("Low")',
      options: ['High', 'Low', 'Nothing', 'Error'],
      correctAnswer: 0,
      explanation: 'Because 8 is greater than 5, the first branch runs.',
    },
    {
      prompt: 'Which branch runs here?\n\nlogged_in = False\nif logged_in:\n    print("dashboard")\nelse:\n    print("login")',
      options: ['dashboard', 'login', 'both', 'Neither'],
      correctAnswer: 1,
      explanation: 'The condition is False, so the else branch runs.',
    },
    {
      prompt: 'What prints here?\n\nscore = 55\nif score >= 60:\n    print("pass")\nelse:\n    print("retry")',
      options: ['pass', 'retry', '55', 'Nothing'],
      correctAnswer: 1,
      explanation: 'Because 55 is less than 60, the else branch prints "retry".',
    },
  ]),
  ...defineQuestions('python-lists', 'Python Lists', 'Collections', 'intermediate', [
    {
      prompt: 'What is the value of `items[1]` here?\n\nitems = ["red", "blue", "green"]',
      options: ['red', 'blue', 'green', 'Error'],
      correctAnswer: 1,
      explanation: 'Python lists are zero-indexed, so index 1 refers to the second item.',
    },
    {
      prompt: 'What does this code print?\n\nnums = [2, 4]\nnums.append(6)\nprint(len(nums))',
      options: ['2', '3', '6', 'Error'],
      correctAnswer: 1,
      explanation: '`append()` adds one item to the list, making the length 3.',
    },
    {
      prompt: 'What does this code print?\n\nletters = ["a", "b", "c"]\nprint(letters[-1])',
      options: ['a', 'b', 'c', 'Error'],
      correctAnswer: 2,
      explanation: 'In Python, index `-1` refers to the last item in the list.',
    },
  ]),
  ...defineQuestions('python-functions', 'Python Functions', 'Functions', 'intermediate', [
    {
      prompt: 'What does this function return?\n\ndef add(a, b):\n    return a + b\n\nprint(add(2, 3))',
      options: ['23', '5', 'Error', 'None'],
      correctAnswer: 1,
      explanation: 'The function adds the two arguments and returns 5.',
    },
    {
      prompt: 'What will this code print?\n\ndef greet(name):\n    return "Hi " + name\n\nprint(greet("Ada"))',
      options: ['Ada', 'Hi Ada', 'greet', 'None'],
      correctAnswer: 1,
      explanation: 'The function returns the concatenated greeting string.',
    },
    {
      prompt: 'What does this function return?\n\ndef square(value):\n    return value * value\n\nprint(square(4))',
      options: ['8', '16', '44', 'None'],
      correctAnswer: 1,
      explanation: 'The function multiplies the value by itself, so `square(4)` returns 16.',
    },
  ]),
  ...defineQuestions('python-functions', 'Python Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'What is printed here?\n\nvalues = [1, 2, 3]\ntotal = 0\nfor value in values:\n    total += value\nprint(total)',
      options: ['3', '5', '6', '123'],
      correctAnswer: 2,
      explanation: 'The loop adds all three values together, producing 6.',
    },
    {
      prompt: 'Which result does this function produce for `is_even(6)`?\n\ndef is_even(n):\n    return n % 2 == 0',
      options: ['True', 'False', '6', 'Error'],
      correctAnswer: 0,
      explanation: '6 modulo 2 is 0, so the comparison returns True.',
    },
    {
      prompt: 'What does this code print?\n\ncount = 0\nfor number in [3, 4, 5]:\n    if number > 3:\n        count += 1\nprint(count)',
      options: ['1', '2', '3', '12'],
      correctAnswer: 1,
      explanation: 'Only 4 and 5 are greater than 3, so the counter ends at 2.',
    },
  ]),
  ...defineQuestions('python-oop', 'Python OOP', 'Objects and classes', 'advanced', [
    {
      prompt: 'What is `__init__` commonly used for in a Python class?',
      options: ['Deleting an object', 'Importing another module', 'Initializing a new object', 'Looping through attributes'],
      correctAnswer: 2,
      explanation: '`__init__` runs when a new instance is created and is typically used to set up instance state.',
    },
    {
      prompt: 'What does `self` refer to inside a Python instance method?',
      options: ['The class name', 'The current object instance', 'The parent class only', 'A built-in Python keyword'],
      correctAnswer: 1,
      explanation: '`self` refers to the instance the method was called on.',
    },
    {
      prompt: 'If `class User:` is already defined, which line creates a new instance?',
      options: ['User.create()', 'new User()', 'user = User()', 'user = class User'],
      correctAnswer: 2,
      explanation: 'Calling `User()` constructs a new instance of the class in Python.',
    },
  ]),
];

const javascriptTemplates: BenchmarkQuestionTemplate[] = [
  ...defineQuestions('javascript-variables-1', 'JavaScript Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Which keyword creates a block-scoped variable that can be reassigned?',
      options: ['var', 'const', 'let', 'static'],
      correctAnswer: 2,
      explanation: '`let` is block-scoped and allows reassignment. `const` is block-scoped but cannot be reassigned.',
    },
    {
      prompt: 'What is logged here?\n\nlet score = 5;\nscore = score + 2;\nconsole.log(score);',
      options: ['5', '7', '"52"', 'undefined'],
      correctAnswer: 1,
      explanation: 'The variable is updated to 7 before being logged.',
    },
    {
      prompt: 'Which line is a valid JavaScript variable assignment?',
      options: ['let user-name = "Ava";', 'let 1user = "Ava";', 'let userName = "Ava";', 'let user name = "Ava";'],
      correctAnswer: 2,
      explanation: 'CamelCase or underscore-style identifiers are valid, but spaces, hyphens, and leading numbers are not.',
    },
  ]),
  ...defineQuestions('javascript-datatypes-1', 'JavaScript Data Types', 'Data types and operators', 'beginner', [
    {
      prompt: 'What does `typeof null` return in JavaScript?',
      options: ['null', 'object', 'undefined', 'boolean'],
      correctAnswer: 1,
      explanation: 'This is one of JavaScript\'s long-standing quirks: `typeof null` returns `object`.',
    },
    {
      prompt: 'What is the result of `10 % 4` in JavaScript?',
      options: ['2', '2.5', '0', '14'],
      correctAnswer: 0,
      explanation: 'The modulo operator returns the remainder after division, which is 2.',
    },
    {
      prompt: 'What is the result of `typeof true` in JavaScript?',
      options: ['"true"', '"boolean"', '"object"', '"undefined"'],
      correctAnswer: 1,
      explanation: '`typeof true` evaluates to the string `"boolean"`.',
    },
  ]),
  ...defineQuestions('javascript-if-else-1', 'JavaScript If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'What will this code log?\n\nconst score = 72;\nif (score >= 70) {\n  console.log("pass");\n} else {\n  console.log("retry");\n}',
      options: ['pass', 'retry', '72', 'Nothing'],
      correctAnswer: 0,
      explanation: 'Because 72 is greater than or equal to 70, the if branch runs.',
    },
    {
      prompt: 'Which branch runs here?\n\nconst isMember = false;\nif (isMember) {\n  console.log("discount");\n} else {\n  console.log("standard");\n}',
      options: ['discount', 'standard', 'both', 'Neither'],
      correctAnswer: 1,
      explanation: 'The condition is false, so the else branch logs "standard".',
    },
    {
      prompt: 'What gets logged here?\n\nconst count = 2;\nif (count > 3) {\n  console.log("high");\n} else {\n  console.log("low");\n}',
      options: ['high', 'low', '2', 'Nothing'],
      correctAnswer: 1,
      explanation: 'Because 2 is not greater than 3, the else branch runs.',
    },
  ]),
  ...defineQuestions('javascript-arrays-1', 'JavaScript Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'What is the length of this array after the last line runs?\n\nconst values = [1, 2];\nvalues.push(3);',
      options: ['2', '3', '4', 'undefined'],
      correctAnswer: 1,
      explanation: '`push()` adds a new element to the end of the array, so the length becomes 3.',
    },
    {
      prompt: 'What does `items[0]` return here?\n\nconst items = ["api", "ui", "db"];',
      options: ['api', 'ui', 'db', 'undefined'],
      correctAnswer: 0,
      explanation: 'JavaScript arrays are zero-indexed, so index 0 is the first item.',
    },
    {
      prompt: 'What is logged here?\n\nconst tools = ["git", "vite", "node"];\nconsole.log(tools[tools.length - 1]);',
      options: ['git', 'vite', 'node', 'undefined'],
      correctAnswer: 2,
      explanation: '`tools.length - 1` points to the last item in the array, which is `"node"`. ',
    },
  ]),
  ...defineQuestions('javascript-functions-1', 'JavaScript Functions', 'Functions', 'intermediate', [
    {
      prompt: 'What does this code return?\n\nfunction multiply(a, b) {\n  return a * b;\n}\nconsole.log(multiply(3, 4));',
      options: ['7', '12', '34', 'undefined'],
      correctAnswer: 1,
      explanation: 'The function multiplies the two numbers and returns 12.',
    },
    {
      prompt: 'What is logged here?\n\nfunction greet(name) {\n  return "Hi " + name;\n}\nconsole.log(greet("Mia"));',
      options: ['Mia', 'Hi Mia', 'greet', 'undefined'],
      correctAnswer: 1,
      explanation: 'The function returns the greeting string "Hi Mia".',
    },
    {
      prompt: 'What is logged here?\n\nfunction double(value) {\n  return value * 2;\n}\nconsole.log(double(6));',
      options: ['8', '12', '66', 'undefined'],
      correctAnswer: 1,
      explanation: 'The function multiplies the input by 2, so `double(6)` returns 12.',
    },
  ]),
  ...defineQuestions('javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'What is logged by this loop?\n\nconst nums = [2, 3, 4];\nlet total = 0;\nfor (const num of nums) {\n  total += num;\n}\nconsole.log(total);',
      options: ['5', '7', '9', '234'],
      correctAnswer: 2,
      explanation: 'The loop adds all values in the array, producing 9.',
    },
    {
      prompt: 'What does this function return for `isOdd(5)`?\n\nfunction isOdd(value) {\n  return value % 2 !== 0;\n}',
      options: ['true', 'false', '5', 'undefined'],
      correctAnswer: 0,
      explanation: '5 modulo 2 is not 0, so the function returns true.',
    },
    {
      prompt: 'What gets logged here?\n\nconst values = [3, 6, 9];\nlet count = 0;\nfor (const value of values) {\n  if (value > 4) {\n    count += 1;\n  }\n}\nconsole.log(count);',
      options: ['1', '2', '3', '0'],
      correctAnswer: 1,
      explanation: 'Only 6 and 9 are greater than 4, so the counter ends at 2.',
    },
  ]),
  ...defineQuestions('js-classes-1', 'JS Classes', 'Objects and classes', 'advanced', [
    {
      prompt: 'When does a JavaScript class `constructor` run?',
      options: ['When the class is imported', 'When a new instance is created', 'When the page loads', 'Only when a method is called'],
      correctAnswer: 1,
      explanation: 'The constructor runs when `new ClassName()` creates an instance.',
    },
    {
      prompt: 'What does `this` usually refer to inside a class method called on an instance?',
      options: ['The browser window', 'The current object instance', 'The method name', 'The parent module'],
      correctAnswer: 1,
      explanation: 'Inside an instance method, `this` refers to the object the method was called on.',
    },
    {
      prompt: 'If `class User {}` exists, which line creates an instance?',
      options: ['User()', 'new User()', 'create User()', 'User.new()'],
      correctAnswer: 1,
      explanation: 'JavaScript classes are instantiated with the `new` keyword.',
    },
  ]),
];

const cppTemplates: BenchmarkQuestionTemplate[] = [
  ...defineQuestions('cpp-variables', 'C++ Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Which line correctly declares an integer variable in C++?',
      options: ['integer age = 20;', 'int age = 20;', 'age := 20;', 'num age = 20;'],
      correctAnswer: 1,
      explanation: '`int age = 20;` is the standard C++ declaration syntax for an integer variable.',
    },
    {
      prompt: 'What does this code print?\n\nint score = 4;\nscore = score + 5;\ncout << score;',
      options: ['4', '5', '9', 'Error'],
      correctAnswer: 2,
      explanation: 'The variable is updated to 9 before it is printed.',
    },
    {
      prompt: 'Which line is a valid C++ variable declaration?',
      options: ['int user-name = 2;', 'int 1user = 2;', 'int userCount = 2;', 'userCount int = 2;'],
      correctAnswer: 2,
      explanation: 'Identifiers can contain letters and numbers, but not hyphens, spaces, or leading numbers.',
    },
  ]),
  ...defineQuestions('cpp-data-types', 'C++ Data Types', 'Data types and operators', 'beginner', [
    {
      prompt: 'Which C++ type is commonly used for decimal values like `3.14`?',
      options: ['string', 'bool', 'double', 'char'],
      correctAnswer: 2,
      explanation: '`double` stores floating-point numbers and is commonly used for decimal values.',
    },
    {
      prompt: 'What is the result of `10 % 4` in C++?',
      options: ['2', '2.5', '0', '14'],
      correctAnswer: 0,
      explanation: 'The modulo operator returns the remainder after division, which is 2.',
    },
    {
      prompt: 'Which C++ type is commonly used for true/false values?',
      options: ['bit', 'bool', 'binary', 'logic'],
      correctAnswer: 1,
      explanation: '`bool` is the standard C++ type for true/false values.',
    },
  ]),
  ...defineQuestions('cpp-if-else', 'C++ If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'Which operator checks whether two values are equal in C++?',
      options: ['=', '==', '!=', '=>'],
      correctAnswer: 1,
      explanation: '`==` is the comparison operator for equality. `=` assigns a value.',
    },
    {
      prompt: 'What is printed here?\n\nint age = 20;\nif (age >= 18) {\n  cout << "adult";\n} else {\n  cout << "minor";\n}',
      options: ['adult', 'minor', '20', 'Nothing'],
      correctAnswer: 0,
      explanation: 'Because 20 is greater than or equal to 18, the first branch runs.',
    },
    {
      prompt: 'Which branch runs here?\n\nbool ready = false;\nif (ready) {\n  cout << "go";\n} else {\n  cout << "wait";\n}',
      options: ['go', 'wait', 'both', 'Neither'],
      correctAnswer: 1,
      explanation: 'Since `ready` is false, the else branch runs.',
    },
  ]),
  ...defineQuestions('cpp-arrays', 'C++ Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'What is the index of the first element in a C++ array?',
      options: ['0', '1', '-1', 'It depends on the array type'],
      correctAnswer: 0,
      explanation: 'C++ arrays are zero-indexed, so the first element is at index 0.',
    },
    {
      prompt: 'What does this print?\n\nint nums[3] = {1, 2, 3};\ncout << nums[2];',
      options: ['1', '2', '3', 'Error'],
      correctAnswer: 2,
      explanation: 'Index 2 refers to the third element in the array, which is 3.',
    },
    {
      prompt: 'What is printed here?\n\nint scores[2] = {8, 9};\ncout << scores[0];',
      options: ['8', '9', '0', 'Error'],
      correctAnswer: 0,
      explanation: 'Index 0 points to the first item in the array.',
    },
  ]),
  ...defineQuestions('cpp-functions', 'C++ Functions', 'Functions', 'intermediate', [
    {
      prompt: 'What does the `int` mean in `int add(int a, int b)`?',
      options: ['The function takes two integers', 'The function returns an integer', 'The function only works in loops', 'The function is private'],
      correctAnswer: 1,
      explanation: 'The type before the function name is the return type.',
    },
    {
      prompt: 'What will `cout << multiply(2, 5);` print here?\n\nint multiply(int a, int b) {\n  return a * b;\n}',
      options: ['7', '10', '25', 'Error'],
      correctAnswer: 1,
      explanation: 'The function returns the product of the two values, which is 10.',
    },
    {
      prompt: 'What does this function return?\n\nint square(int value) {\n  return value * value;\n}\ncout << square(4);',
      options: ['8', '16', '44', 'Error'],
      correctAnswer: 1,
      explanation: 'The function multiplies the value by itself, so `square(4)` returns 16.',
    },
  ]),
  ...defineQuestions('cpp-functions', 'C++ Functions', 'Problem solving', 'intermediate', [
    {
      prompt: 'What is printed here?\n\nint total = 0;\nfor (int i = 1; i <= 3; i++) {\n  total += i;\n}\ncout << total;',
      options: ['3', '5', '6', '123'],
      correctAnswer: 2,
      explanation: 'The loop adds 1 + 2 + 3, so the result is 6.',
    },
    {
      prompt: 'What does this function return for `is_even(8)`?\n\nbool is_even(int value) {\n  return value % 2 == 0;\n}',
      options: ['true', 'false', '8', 'Error'],
      correctAnswer: 0,
      explanation: '8 modulo 2 is 0, so the function returns true.',
    },
    {
      prompt: 'What is printed here?\n\nint count = 0;\nfor (int value = 2; value <= 4; value++) {\n  if (value > 2) {\n    count++;\n  }\n}\ncout << count;',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'Values 3 and 4 are greater than 2, so the counter ends at 2.',
    },
  ]),
  ...defineQuestions('cpp-classes-objects', 'C++ Classes & Objects', 'Objects and classes', 'advanced', [
    {
      prompt: 'What do you call a value created from a class in C++?',
      options: ['A constructor', 'A method', 'An object', 'A namespace'],
      correctAnswer: 2,
      explanation: 'A class is the blueprint, and an object is an instance created from it.',
    },
    {
      prompt: 'What is a constructor in a C++ class used for?',
      options: ['Deleting objects', 'Initializing new objects', 'Printing output', 'Creating loops'],
      correctAnswer: 1,
      explanation: 'Constructors run when an object is created and are typically used to initialize it.',
    },
    {
      prompt: 'If `class User { };` exists, which line creates an object?',
      options: ['User.new();', 'new User;', 'User user;', 'create User user;'],
      correctAnswer: 2,
      explanation: 'Declaring `User user;` creates an object instance in C++.',
    },
  ]),
];

const javaTemplates: BenchmarkQuestionTemplate[] = [
  ...defineQuestions('java-variables', 'Java Variables', 'Syntax and variables', 'beginner', [
    {
      prompt: 'Which line correctly declares a Java integer variable?',
      options: ['int score = 10;', 'score := 10;', 'number score = 10;', 'var score := 10;'],
      correctAnswer: 0,
      explanation: '`int score = 10;` is a valid Java declaration for an integer variable.',
    },
    {
      prompt: 'What is printed here?\n\nint count = 3;\ncount = count + 4;\nSystem.out.println(count);',
      options: ['3', '4', '7', 'Error'],
      correctAnswer: 2,
      explanation: 'The variable is updated to 7 before it is printed.',
    },
    {
      prompt: 'Which variable name is valid in Java?',
      options: ['2count', 'user-name', 'userCount', 'user count'],
      correctAnswer: 2,
      explanation: 'Java identifiers cannot start with a number or contain spaces or hyphens.',
    },
  ]),
  ...defineQuestions('java-data-types', 'Java Data Types', 'Data types and operators', 'beginner', [
    {
      prompt: 'Which Java type is used for true/false values?',
      options: ['bool', 'boolean', 'binary', 'bit'],
      correctAnswer: 1,
      explanation: 'Java uses the `boolean` type for true/false values.',
    },
    {
      prompt: 'What is the result of `10 % 4` in Java?',
      options: ['2', '2.5', '0', '14'],
      correctAnswer: 0,
      explanation: 'The modulo operator returns the remainder, which is 2.',
    },
    {
      prompt: 'Which Java type is used for decimal values like `3.14`?',
      options: ['int', 'double', 'boolean', 'char'],
      correctAnswer: 1,
      explanation: '`double` is commonly used for decimal numbers in Java.',
    },
  ]),
  ...defineQuestions('java-if-else', 'Java If...Else', 'Control flow', 'beginner', [
    {
      prompt: 'Which operator compares two values for equality in Java?',
      options: ['=', '==', '===', '=>'],
      correctAnswer: 1,
      explanation: '`==` checks equality. `=` assigns a value.',
    },
    {
      prompt: 'What will this code print?\n\nint age = 21;\nif (age >= 18) {\n  System.out.println("adult");\n} else {\n  System.out.println("minor");\n}',
      options: ['adult', 'minor', '21', 'Nothing'],
      correctAnswer: 0,
      explanation: 'Because age is at least 18, the first branch runs.',
    },
    {
      prompt: 'Which branch runs here?\n\nboolean ready = false;\nif (ready) {\n  System.out.println("go");\n} else {\n  System.out.println("wait");\n}',
      options: ['go', 'wait', 'both', 'Neither'],
      correctAnswer: 1,
      explanation: 'The condition is false, so the else branch runs.',
    },
  ]),
  ...defineQuestions('java-arrays', 'Java Arrays', 'Collections', 'intermediate', [
    {
      prompt: 'What is the index of the first element in a Java array?',
      options: ['0', '1', '-1', 'The same as the array length'],
      correctAnswer: 0,
      explanation: 'Java arrays are zero-indexed.',
    },
    {
      prompt: 'What does this print?\n\nint[] scores = {7, 8, 9};\nSystem.out.println(scores[2]);',
      options: ['7', '8', '9', 'Error'],
      correctAnswer: 2,
      explanation: 'Index 2 refers to the third item in the array, which is 9.',
    },
    {
      prompt: 'What is printed here?\n\nint[] values = {4, 5};\nSystem.out.println(values[0]);',
      options: ['4', '5', '0', 'Error'],
      correctAnswer: 0,
      explanation: 'Java arrays are zero-indexed, so index 0 refers to the first item.',
    },
  ]),
  ...defineQuestions('java-methods', 'Java Methods', 'Functions', 'intermediate', [
    {
      prompt: 'Which return type should a Java method use if it does not return a value?',
      options: ['null', 'empty', 'void', 'return'],
      correctAnswer: 2,
      explanation: '`void` means the method performs work but does not return a value.',
    },
    {
      prompt: 'What does this method return?\n\nint add(int a, int b) {\n  return a + b;\n}\nSystem.out.println(add(2, 3));',
      options: ['5', '23', '0', 'Error'],
      correctAnswer: 0,
      explanation: 'The method adds the two arguments and returns 5.',
    },
    {
      prompt: 'What is printed here?\n\nint doubleValue(int value) {\n  return value * 2;\n}\nSystem.out.println(doubleValue(6));',
      options: ['8', '12', '66', 'Error'],
      correctAnswer: 1,
      explanation: 'The method multiplies the input by 2, so it prints 12.',
    },
  ]),
  ...defineQuestions('java-methods', 'Java Methods', 'Problem solving', 'intermediate', [
    {
      prompt: 'What is printed here?\n\nint total = 0;\nfor (int i = 1; i <= 3; i++) {\n  total += i;\n}\nSystem.out.println(total);',
      options: ['3', '5', '6', '123'],
      correctAnswer: 2,
      explanation: 'The loop adds 1 + 2 + 3, giving a total of 6.',
    },
    {
      prompt: 'What does this method return for `isEven(10)`?\n\nboolean isEven(int value) {\n  return value % 2 == 0;\n}',
      options: ['true', 'false', '10', 'Error'],
      correctAnswer: 0,
      explanation: '10 modulo 2 is 0, so the comparison returns true.',
    },
    {
      prompt: 'What is printed here?\n\nint count = 0;\nfor (int value = 2; value <= 4; value++) {\n  if (value > 2) {\n    count++;\n  }\n}\nSystem.out.println(count);',
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'Only 3 and 4 are greater than 2, so the counter ends at 2.',
    },
  ]),
  ...defineQuestions('java-oop', 'Java OOP', 'Objects and classes', 'advanced', [
    {
      prompt: 'In Java OOP, what is encapsulation?',
      options: [
        'Running many threads at once',
        'Bundling data and methods inside a class',
        'Writing code without classes',
        'Automatically creating objects',
      ],
      correctAnswer: 1,
      explanation: 'Encapsulation groups related data and behavior inside a class and helps control access to them.',
    },
    {
      prompt: 'What does a constructor do in Java?',
      options: ['Deletes objects', 'Initializes a new object', 'Only returns strings', 'Creates arrays automatically'],
      correctAnswer: 1,
      explanation: 'A constructor runs when an object is created and is commonly used to initialize its state.',
    },
    {
      prompt: 'If `class User {}` exists, which line creates a new object?',
      options: ['User();', 'new User();', 'User user = new User();', 'create User();'],
      correctAnswer: 2,
      explanation: '`User user = new User();` declares a variable and creates a new instance in Java.',
    },
  ]),
];

export const benchmarkQuestionBankByLanguage: Record<LanguageSlug, BenchmarkQuestionTemplate[]> = {
  python: pythonTemplates,
  javascript: javascriptTemplates,
  cpp: cppTemplates,
  java: javaTemplates,
};

export const getBenchmarkQuestionCandidates = (language: LanguageSlug) => benchmarkQuestionBankByLanguage[language] || [];
