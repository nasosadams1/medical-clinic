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
      interpolate(rewardBand.baselineTime[0], rewardBand.baselineTime[1], normalizedProgress),
    ),
  };
};

const lesson = (spec) => spec;
const example = (content, code, explanation = content) => ({ content, code, explanation });

const indentBlock = (value, spaces = 2) =>
  String(value || '')
    .split('\n')
    .map((line) => (line.length > 0 ? `${' '.repeat(spaces)}${line}` : line))
    .join('\n');

const javaFile = ({ imports = [], topLevel = '', classBody = '', mainBody = '', throwsClause = '' }) => {
  const sections = [];
  const normalizedImports = imports.filter(Boolean);

  if (normalizedImports.length > 0) {
    sections.push(...normalizedImports.map((item) => `import ${item};`), '');
  }

  if (String(topLevel || '').trim()) {
    sections.push(String(topLevel).trimEnd(), '');
  }

  sections.push('public class Main {');

  if (String(classBody || '').trim()) {
    sections.push(indentBlock(String(classBody).trimEnd(), 2), '');
  }

  sections.push(
    `  public static void main(String[] args)${throwsClause ? ` throws ${throwsClause}` : ''} {`,
    String(mainBody || '').trim() ? indentBlock(String(mainBody).trimEnd(), 4) : '    ',
    '  }',
    '}',
  );

  return sections.join('\n');
};

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
    language: 'java',
    requiredSnippets: lessonSpec.practice.requiredSnippets || [],
    forbiddenPatterns: lessonSpec.practice.forbiddenPatterns || [],
    testCases: lessonSpec.practice.testCases,
  };
};

const lessons = [
  lesson({
    id: 'java-get-started',
    title: 'What Java Is, the JDK, and Your First Program',
    description: 'Connect Java the language to the JDK, javac, the JVM, and the shape of a minimal program.',
    category: 'Foundations',
    examples: [
      example(
        'Java source is compiled to bytecode, then the JVM runs that bytecode.',
        `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Java!");
  }
}`,
      ),
      example(
        'The JDK gives you the compiler and tooling, not just the runtime.',
        `javac Main.java
java Main`,
        'Production workflow starts with a repeatable compile-run loop.',
      ),
      example(
        'Compiler errors are usually about structure, names, or missing symbols.',
        `public class Main {
  public static void main(String[] args) {
    System.out.println(message);
  }
}`,
        'This fails because message was never declared.',
      ),
    ],
    practice: {
      task: 'Print Hello, Java! exactly once from main.',
      code: javaFile({
        mainBody: `System.out.println("Hello, Java!");`,
      }),
      requiredSnippets: ['public class Main', 'public static void main(String[] args)', 'System.out.println'],
      expectedOutput: ['Hello, Java!'],
      requirements: ['Use a Main class.', 'Print the text exactly once.'],
      coachNote: 'The first production-ready habit is exact output and a valid entry point.',
      testCases: [
        {
          label: 'Hello world',
          stdin_text: '',
          expected_output: 'Hello, Java!',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `System.out.println("A");
System.out.println("B");`,
      options: ['AB', 'A then B on separate lines', '"A" "B"', 'Nothing'],
      correctAnswer: 1,
      explanation: 'Each println call prints its own line.',
    },
    mistake: {
      label: 'Compiler Trace',
      prompt: 'What happens here?',
      code: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello")
  }
}`,
      options: ['Prints Hello', 'Compile Error', 'Runtime Error', 'Nothing'],
      correctAnswer: 1,
      explanation: 'The missing semicolon causes a compile-time syntax error.',
      questionKind: 'compiler-trace',
    },
  }),
  lesson({
    id: 'java-variables',
    title: 'Variables and Primitive Data Types',
    description: 'Use primitive types intentionally and give values stable, readable names.',
    category: 'Foundations',
    examples: [
      example(
        'Java primitive variables have explicit types.',
        `int age = 24;
double price = 19.99;
boolean ready = true;
char grade = 'A';`,
      ),
      example(
        'Choose types by meaning: counts use int, measurements often use double.',
        `int lessons = 50;
double average = 87.5;`,
      ),
      example(
        'Readable names beat short, cryptic names in real projects.',
        `int completedLessons = 12;
boolean premiumMember = false;`,
      ),
    ],
    practice: {
      task: 'Create an int named lessons with 50 and a boolean named ready with true, then print 50:true.',
      code: javaFile({
        mainBody: `int lessons = 50;
boolean ready = true;
System.out.println(lessons + ":" + ready);`,
      }),
      requiredSnippets: ['int lessons', 'boolean ready', 'System.out.println'],
      expectedOutput: ['50:true'],
      requirements: ['Use the exact variable names lessons and ready.', 'Print one final line.'],
      coachNote: 'Types are part of the program contract, not just syntax to satisfy the compiler.',
      testCases: [
        {
          label: 'Variable print',
          stdin_text: '',
          expected_output: '50:true',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `int count = 3;
count = count + 2;
System.out.println(count);`,
      options: ['3', '5', '32', 'Error'],
      correctAnswer: 1,
      explanation: 'The variable is reassigned to the result of 3 + 2.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int total = 4.5;`,
      options: ['Works fine', 'Compile Error', 'Prints 4', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'A decimal literal does not fit into int without an explicit cast.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-user-input',
    title: 'Input and Output with Scanner and println',
    description: 'Read values from standard input and turn them into clear console output.',
    category: 'Foundations',
    examples: [
      example(
        'Scanner reads user input from standard input.',
        `import java.util.Scanner;

Scanner scanner = new Scanner(System.in);
int age = scanner.nextInt();`,
      ),
      example(
        'println is your fastest feedback loop while learning and debugging.',
        `System.out.println("Ready");`,
      ),
      example(
        'The input method you choose controls how tokens are consumed.',
        `String name = scanner.next();
String line = scanner.nextLine();`,
      ),
    ],
    practice: {
      task: 'Read one name and print Hello, <name>.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
String name = scanner.nextLine();
System.out.println("Hello, " + name);`,
      }),
      requiredSnippets: ['Scanner scanner = new Scanner(System.in);', 'scanner.nextLine()', 'System.out.println'],
      expectedOutput: ['Hello, Alex'],
      requirements: ['Read one full line for the name.', 'Print exactly one greeting line.'],
      coachNote: 'Prefer full-line input when spaces matter.',
      testCases: [
        {
          label: 'Single name',
          stdin_text: 'Alex\n',
          expected_output: 'Hello, Alex',
          hidden: false,
        },
        {
          label: 'Full name',
          stdin_text: 'Mia Chen\n',
          expected_output: 'Hello, Mia Chen',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `Scanner scanner = new Scanner(System.in);
String word = scanner.next();
System.out.println(word);`,
      prompt: 'Assume the user enters hello world.',
      options: ['hello', 'hello world', 'world', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'next() stops at whitespace, so only hello is consumed.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Scanner scanner = new Scanner(System.in);
System.out.println(name);`,
      options: ['Prints the user name', 'Compile Error', 'Runtime Error', 'Prints null'],
      correctAnswer: 1,
      explanation: 'name was never declared before being printed.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-data-types',
    title: 'Operators and Expressions',
    description: 'Combine arithmetic, assignment, and comparison operators into readable expressions.',
    category: 'Foundations',
    examples: [
      example(
        'Arithmetic operators build numeric expressions.',
        `int total = 8 + 4 * 2;`,
      ),
      example(
        'Parentheses make intent obvious and avoid precedence mistakes.',
        `int total = (8 + 4) * 2;`,
      ),
      example(
        'Comparison operators produce boolean results.',
        `boolean passed = score >= 60;`,
      ),
    ],
    practice: {
      task: 'Read two integers and print their sum on one line.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int a = scanner.nextInt();
int b = scanner.nextInt();
System.out.println(a + b);`,
      }),
      requiredSnippets: ['int a = scanner.nextInt();', 'int b = scanner.nextInt();', 'System.out.println(a + b);'],
      expectedOutput: ['9'],
      requirements: ['Read exactly two integers.', 'Print only the sum.'],
      coachNote: 'Start with the smallest possible expression that proves the operator works.',
      testCases: [
        {
          label: 'Positive integers',
          stdin_text: '4 5\n',
          expected_output: '9',
          hidden: false,
        },
        {
          label: 'Mixed values',
          stdin_text: '-2 7\n',
          expected_output: '5',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `int result = 10 - 2 * 3;
System.out.println(result);`,
      options: ['24', '4', '18', 'Error'],
      correctAnswer: 1,
      explanation: 'Multiplication happens before subtraction, so the result is 10 - 6.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int result = (10 - 2 * 3;`,
      options: ['4', 'Compile Error', '18', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'The opening parenthesis is never closed.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-if-else',
    title: 'Conditional Logic with if, else, and switch',
    description: 'Branch on conditions cleanly and choose the simplest control flow for the job.',
    category: 'Foundations',
    examples: [
      example(
        'if and else choose one branch based on a boolean expression.',
        `if (score >= 60) {
  System.out.println("pass");
} else {
  System.out.println("retry");
}`,
      ),
      example(
        'else if chains handle multiple ranges in order.',
        `if (score >= 90) {
  System.out.println("A");
} else if (score >= 80) {
  System.out.println("B");
} else {
  System.out.println("C or below");
}`,
      ),
      example(
        'switch works well when one value selects one of several labeled cases.',
        `switch (day) {
  case 1 -> System.out.println("Mon");
  case 2 -> System.out.println("Tue");
  default -> System.out.println("Other");
}`,
      ),
    ],
    practice: {
      task: 'Read one integer score. Print pass if it is at least 60, otherwise print retry.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int score = scanner.nextInt();
if (score >= 60) {
  System.out.println("pass");
} else {
  System.out.println("retry");
}`,
      }),
      requiredSnippets: ['if (score >= 60)', 'else', 'System.out.println("pass")', 'System.out.println("retry")'],
      expectedOutput: ['pass'],
      requirements: ['Use if and else.', 'Print only one branch.'],
      coachNote: 'Conditionals get easier to debug when each branch has one clear responsibility.',
      testCases: [
        {
          label: 'Passing score',
          stdin_text: '75\n',
          expected_output: 'pass',
          hidden: false,
        },
        {
          label: 'Failing score',
          stdin_text: '41\n',
          expected_output: 'retry',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `int x = 5;
if (x > 7) {
  System.out.println("high");
} else {
  System.out.println("low");
}`,
      options: ['high', 'low', 'Nothing', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The condition is false, so the else branch runs.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `if (score = 60) {
  System.out.println("pass");
}`,
      options: ['Checks equality', 'Compile Error', 'Always true', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'In Java, = assigns. The condition expects a boolean expression, so this does not compile.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-while-loop',
    title: 'Loops: for, while, and do-while',
    description: 'Repeat work with clear loop boundaries and avoid off-by-one bugs.',
    category: 'Foundations',
    examples: [
      example(
        'for loops are a strong default when the number of iterations is known.',
        `for (int i = 1; i <= 3; i++) {
  System.out.println(i);
}`,
      ),
      example(
        'while loops are good for sentinel-controlled repetition.',
        `while (value != -1) {
  // process value
}`,
      ),
      example(
        'do-while runs the body once before checking the condition.',
        `do {
  System.out.println("run once");
} while (false);`,
      ),
    ],
    practice: {
      task: 'Read one integer n and print the numbers from 1 to n, one per line.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int n = scanner.nextInt();
for (int i = 1; i <= n; i++) {
  System.out.println(i);
}`,
      }),
      requiredSnippets: ['for (int i = 1; i <= n; i++)', 'System.out.println(i);'],
      expectedOutput: ['1\n2\n3'],
      requirements: ['Use a counting loop.', 'Print each value on its own line.'],
      coachNote: 'Loop tasks become predictable when you define the start, stop condition, and update clearly.',
      testCases: [
        {
          label: 'Three values',
          stdin_text: '3\n',
          expected_output: '1\n2\n3',
          hidden: false,
        },
        {
          label: 'Single value',
          stdin_text: '1\n',
          expected_output: '1',
          hidden: true,
        },
        {
          label: 'Zero values',
          stdin_text: '0\n',
          expected_output: '',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `for (int i = 0; i < 3; i++) {
  System.out.println(i);
}`,
      options: ['0 1 2 on separate lines', '1 2 3 on separate lines', '0 1 2 3', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'The loop starts at 0 and stops before 3.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `for (int i = 1; i <= n; i--) {
  System.out.println(i);
}`,
      options: ['Counts up correctly', 'Infinite loop risk', 'Compile Error', 'Prints nothing'],
      correctAnswer: 1,
      explanation: 'The loop moves away from the stop condition instead of toward it.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-methods',
    title: 'Methods: Parameters, Return Values, and Reuse',
    description: 'Move repeated logic into methods with clear inputs and outputs.',
    category: 'Foundations',
    examples: [
      example(
        'Methods let one name represent a reusable block of logic.',
        `static int square(int value) {
  return value * value;
}`,
      ),
      example(
        'A good parameter name explains the role of the input.',
        `static int addTax(int subtotal) {
  return subtotal + 5;
}`,
      ),
      example(
        'Return values are how methods hand results back to the caller.',
        `int total = square(4);`,
      ),
    ],
    practice: {
      task: 'Create a method named doubleValue that returns its argument multiplied by 2, then read one integer and print the method result.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        classBody: `static int doubleValue(int value) {
  return value * 2;
}`,
        mainBody: `Scanner scanner = new Scanner(System.in);
int input = scanner.nextInt();
System.out.println(doubleValue(input));`,
      }),
      requiredSnippets: ['static int doubleValue(int value)', 'return value * 2;', 'System.out.println(doubleValue(input));'],
      expectedOutput: ['14'],
      requirements: ['Create the method before calling it.', 'Read one integer and print the result.'],
      coachNote: 'A method is worth it when it names a job your code will do more than once.',
      testCases: [
        {
          label: 'Positive value',
          stdin_text: '7\n',
          expected_output: '14',
          hidden: false,
        },
        {
          label: 'Negative value',
          stdin_text: '-3\n',
          expected_output: '-6',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `static int addOne(int value) {
  return value + 1;
}

System.out.println(addOne(4));`,
      options: ['4', '5', '41', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The method returns 4 + 1.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `static int doubleValue(int value) {
  System.out.println(value * 2);
}`,
      options: ['Valid method with a return value', 'Compile Error', 'Returns 0', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'A method declared to return int must return an int value.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-debugging',
    title: 'Compilation Errors, Runtime Errors, and Debugging',
    description: 'Separate compiler feedback from runtime failures and logic bugs so fixes get faster.',
    category: 'Foundations',
    examples: [
      example(
        'Compile errors stop the program before it runs.',
        `int total = "7";`,
      ),
      example(
        'Runtime errors happen after the program starts.',
        `int result = 5 / 0;`,
      ),
      example(
        'Logic bugs produce the wrong answer even when the program runs.',
        `int doubled = value + value + 1;`,
      ),
    ],
    practice: {
      task: 'Fix the method so it returns the correct sum of two integers, then print the result of add(3, 4).',
      code: javaFile({
        classBody: `static int add(int left, int right) {
  return left + right;
}`,
        mainBody: `System.out.println(add(3, 4));`,
      }),
      requiredSnippets: ['static int add(int left, int right)', 'return left + right;', 'System.out.println(add(3, 4));'],
      expectedOutput: ['7'],
      requirements: ['Return the correct value from the method.', 'Print the method result once.'],
      coachNote: 'When debugging, first ask: did it fail to compile, crash at runtime, or simply compute the wrong thing?',
    },
    predict: {
      label: 'Compiler Trace',
      code: `int total = 5
System.out.println(total);`,
      options: ['Prints 5', 'Compile Error', 'Runtime Error', 'Prints nothing'],
      correctAnswer: 1,
      explanation: 'The missing semicolon is a compile-time syntax problem.',
      questionKind: 'compiler-trace',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `int result = 10 / 0;`,
      options: ['Logic bug', 'Runtime Error', 'Compile Error only', 'Always prints 0'],
      correctAnswer: 1,
      explanation: 'Division by zero in integer arithmetic throws an ArithmeticException at runtime.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-arrays',
    title: 'Arrays and Basic Problem Solving',
    description: 'Store related values together and apply counting, searching, and accumulation patterns.',
    category: 'Foundations',
    examples: [
      example(
        'Arrays store a fixed number of values of one type.',
        `int[] scores = { 4, 7, 9, 3 };`,
      ),
      example(
        'Indexing starts at 0 in Java.',
        `System.out.println(scores[0]);`,
      ),
      example(
        'Loops and arrays usually work together.',
        `int sum = 0;
for (int value : scores) {
  sum += value;
}`,
      ),
    ],
    practice: {
      task: 'Read an integer n, then read n integers and print their sum.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int n = scanner.nextInt();
int[] values = new int[n];
int sum = 0;
for (int i = 0; i < n; i++) {
  values[i] = scanner.nextInt();
  sum += values[i];
}
System.out.println(sum);`,
      }),
      requiredSnippets: ['int[] values = new int[n];', 'for (int i = 0; i < n; i++)', 'sum += values[i];'],
      expectedOutput: ['15'],
      requirements: ['Create an array of size n.', 'Read each value and include it in the sum.'],
      coachNote: 'Problem solving with arrays starts with a reliable input loop and one clear accumulator.',
      testCases: [
        {
          label: 'Five values',
          stdin_text: '5\n1 2 3 4 5\n',
          expected_output: '15',
          hidden: false,
        },
        {
          label: 'Three values',
          stdin_text: '3\n10 -2 6\n',
          expected_output: '14',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `int[] values = { 2, 4, 6 };
System.out.println(values[1]);`,
      options: ['2', '4', '6', 'Error'],
      correctAnswer: 1,
      explanation: 'Index 1 is the second element.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int[] values = { 2, 4, 6 };
System.out.println(values[3]);`,
      options: ['6', '0', 'ArrayIndexOutOfBoundsException', 'Compile Error'],
      correctAnswer: 2,
      explanation: 'The last valid index is 2, not 3.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-operators',
    title: 'Project 1: Build a Console Calculator and Number Toolkit',
    description: 'Combine input, branching, loops, methods, and arrays into one small menu-driven console app.',
    category: 'Foundations',
    projectBrief: {
      goal: 'Design a console toolkit with a calculator, min/max finder, and simple number statistics.',
      inputs: ['Menu choices and numeric input from the user.'],
      outputs: ['Computed results and clear menu feedback.'],
      skills: ['Scanner input', 'branching', 'loops', 'methods', 'arrays'],
    },
    examples: [
      example(
        'A console project becomes manageable when the menu loop and each feature are separated.',
        `switch (choice) {
  case 1 -> runCalculator(scanner);
  case 2 -> runStats(scanner);
  default -> System.out.println("Exit");
}`,
      ),
      example(
        'Feature methods keep main from becoming one large script.',
        `static void runCalculator(Scanner scanner) {
  // feature logic
}`,
      ),
    ],
    practice: {
      task: 'Write the shell of a console toolkit with one menu loop and methods named runCalculator and runStats.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        classBody: `static void runCalculator(Scanner scanner) {}

static void runStats(Scanner scanner) {}`,
        mainBody: `Scanner scanner = new Scanner(System.in);
boolean running = true;
while (running) {
  int choice = scanner.nextInt();
  switch (choice) {
    case 1 -> runCalculator(scanner);
    case 2 -> runStats(scanner);
    default -> running = false;
  }
}`,
      }),
      requiredSnippets: ['while (running)', 'switch (choice)', 'runCalculator(scanner)', 'runStats(scanner)'],
      expectedOutput: ['One clear menu loop and feature split.'],
      requirements: ['Create a loop that keeps the toolkit running.', 'Separate calculator and stats logic into methods.'],
      coachNote: 'The point of the first project is structure: one menu loop, small feature methods, and no repeated input logic.',
    },
    predict: {
      label: 'API Design',
      prompt: 'Which structure is easier to maintain?',
      code: `A) main handles menu flow and delegates to runCalculator and runStats
B) main contains one 200-line block with every feature mixed together`,
      options: ['A', 'B', 'Both are equal', 'Neither matters'],
      correctAnswer: 0,
      explanation: 'Delegating features into methods is the first step toward a maintainable console app.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the right move when the project starts growing?',
      code: `A) Add more nested if blocks in main
B) Extract repeated logic into focused methods`,
      options: ['A', 'B', 'Both are equally good', 'Nothing should change'],
      correctAnswer: 1,
      explanation: 'Project quality improves when responsibilities are split before the file becomes unmanageable.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-strings',
    title: 'Strings and Common String Methods',
    description: 'Manipulate text safely with the methods that show up in real beginner Java programs.',
    category: 'Core Java',
    examples: [
      example(
        'Strings are objects, so you use methods to inspect and transform them.',
        `String course = "Java";
System.out.println(course.length());`,
      ),
      example(
        'trim, toUpperCase, and substring are common cleanup tools.',
        `String cleaned = input.trim().toUpperCase();`,
      ),
      example(
        'equals compares string contents correctly.',
        `if (command.equals("exit")) {
  System.out.println("bye");
}`,
      ),
    ],
    practice: {
      task: 'Read one full line and print it in uppercase after trimming leading and trailing spaces.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
String text = scanner.nextLine();
System.out.println(text.trim().toUpperCase());`,
      }),
      requiredSnippets: ['String text = scanner.nextLine();', 'text.trim()', '.toUpperCase()'],
      expectedOutput: ['JAVA'],
      requirements: ['Read one full line.', 'Trim first, then convert to uppercase.'],
      coachNote: 'String cleanup is mostly about being explicit with each transformation step.',
      testCases: [
        {
          label: 'Trim and uppercase',
          stdin_text: '  java  \n',
          expected_output: 'JAVA',
          hidden: false,
        },
        {
          label: 'Mixed text',
          stdin_text: '  clean code \n',
          expected_output: 'CLEAN CODE',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `String text = "Java";
System.out.println(text.substring(1, 3));`,
      options: ['av', 'ava', 'Ja', 'Error'],
      correctAnswer: 0,
      explanation: 'substring(1, 3) includes index 1 and stops before index 3.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `String left = "Ja";
String right = "va";
if (left + right == "Java") {
  System.out.println("same");
}`,
      options: ['Always correct string comparison', 'May fail because == compares references', 'Compile Error', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'Use equals for content comparison, not ==.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-syntax',
    title: 'Two-Dimensional Arrays',
    description: 'Store grid-shaped data and iterate over rows and columns with nested loops.',
    category: 'Core Java',
    examples: [
      example(
        'Two-dimensional arrays model rows and columns.',
        `int[][] grid = {
  { 1, 2 },
  { 3, 4 }
};`,
      ),
      example(
        'Nested loops walk every cell in row-major order.',
        `for (int row = 0; row < grid.length; row++) {
  for (int col = 0; col < grid[row].length; col++) {
    System.out.println(grid[row][col]);
  }
}`,
      ),
      example(
        'Row sums and column sums are common first patterns.',
        `int rowTotal = grid[0][0] + grid[0][1];`,
      ),
    ],
    practice: {
      task: 'Read four integers into a 2x2 matrix and print the sum of all values.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int[][] grid = new int[2][2];
int sum = 0;
for (int row = 0; row < 2; row++) {
  for (int col = 0; col < 2; col++) {
    grid[row][col] = scanner.nextInt();
    sum += grid[row][col];
  }
}
System.out.println(sum);`,
      }),
      requiredSnippets: ['int[][] grid = new int[2][2];', 'for (int row = 0; row < 2; row++)', 'for (int col = 0; col < 2; col++)'],
      expectedOutput: ['10'],
      requirements: ['Use nested loops.', 'Read exactly four integers.'],
      coachNote: 'Most matrix bugs come from mixing up row and column indexes.',
      testCases: [
        {
          label: 'Simple matrix',
          stdin_text: '1 2 3 4\n',
          expected_output: '10',
          hidden: false,
        },
        {
          label: 'Zero matrix',
          stdin_text: '0 0 0 0\n',
          expected_output: '0',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `int[][] grid = {
  { 1, 2 },
  { 3, 4 }
};
System.out.println(grid[1][0]);`,
      options: ['1', '2', '3', '4'],
      correctAnswer: 2,
      explanation: 'Row 1, column 0 is the value 3.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int[][] grid = new int[2][2];
System.out.println(grid[2][0]);`,
      options: ['0', 'Compile Error', 'ArrayIndexOutOfBoundsException', '2'],
      correctAnswer: 2,
      explanation: 'A 2x2 array has valid row indexes 0 and 1.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-oop',
    title: 'Introduction to Objects and Classes',
    description: 'Move from plain values to objects that bundle state and behavior together.',
    category: 'Core Java',
    examples: [
      example(
        'A class is a blueprint. An object is one concrete instance of that blueprint.',
        `class Book {
  String title;
}`,
      ),
      example(
        'Objects let related data travel together.',
        `Book book = new Book();
book.title = "Clean Code";`,
      ),
      example(
        'Real code uses classes when plain arrays or unrelated variables stop being readable.',
        `Book first = new Book();
Book second = new Book();`,
      ),
    ],
    practice: {
      task: 'Create a Book class with a title field, create one Book object, assign Java Basics to title, and print it.',
      code: javaFile({
        topLevel: `class Book {
  String title;
}`,
        mainBody: `Book book = new Book();
book.title = "Java Basics";
System.out.println(book.title);`,
      }),
      requiredSnippets: ['class Book', 'String title;', 'Book book = new Book();', 'book.title = "Java Basics";'],
      expectedOutput: ['Java Basics'],
      requirements: ['Define a Book class.', 'Create and use one object.'],
      coachNote: 'The first OOP win is grouping one idea into one object instead of scattering related variables.',
      testCases: [
        {
          label: 'Single object',
          stdin_text: '',
          expected_output: 'Java Basics',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `class Book {
  String title;
}

Book book = new Book();
book.title = "Java";
System.out.println(book.title);`,
      options: ['Java', 'null', 'Book', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'The title field is assigned before it is printed.',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `class Book {
  String title;
}`,
      prompt: 'What is the main reason to introduce a class here?',
      options: ['To group related data and behavior into one model', 'To make code slower', 'To avoid variables entirely', 'To replace every loop'],
      correctAnswer: 0,
      explanation: 'Classes help model one concept in a cleaner, more maintainable way.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-constructors',
    title: 'Fields, Methods, and Constructors',
    description: 'Design a simple class with stored state, behavior, and a constructor that initializes it correctly.',
    category: 'Core Java',
    examples: [
      example(
        'Fields store object state.',
        `class Counter {
  int value;
}`,
      ),
      example(
        'Constructors initialize new objects in a predictable state.',
        `Counter(int value) {
  this.value = value;
}`,
      ),
      example(
        'Methods expose useful behavior on top of the stored fields.',
        `void increment() {
  value++;
}`,
      ),
    ],
    practice: {
      task: 'Create a Counter class with a value field, a constructor that sets value, and a method increment that adds 1. Then create Counter(4), call increment, and print 5.',
      code: javaFile({
        topLevel: `class Counter {
  int value;

  Counter(int value) {
    this.value = value;
  }

  void increment() {
    value++;
  }
}`,
        mainBody: `Counter counter = new Counter(4);
counter.increment();
System.out.println(counter.value);`,
      }),
      requiredSnippets: ['Counter(int value)', 'this.value = value;', 'void increment()', 'value++;'],
      expectedOutput: ['5'],
      requirements: ['Use a constructor to set the field.', 'Call the method before printing.'],
      coachNote: 'A constructor should make invalid starting states harder to create.',
      testCases: [
        {
          label: 'Counter behavior',
          stdin_text: '',
          expected_output: '5',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `class Counter {
  int value;

  Counter(int value) {
    this.value = value;
  }
}

Counter counter = new Counter(7);
System.out.println(counter.value);`,
      options: ['0', '7', '1', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The constructor stores the passed value in the field.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `class Counter {
  int value;

  void Counter(int value) {
    this.value = value;
  }
}`,
      options: ['Valid constructor', 'Compile Error in constructor intent', 'Sets value correctly as a constructor', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'Adding void makes it a method, not a constructor.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-encapsulation',
    title: 'Access Modifiers and Encapsulation',
    description: 'Protect invariants by hiding fields and exposing controlled methods instead of direct mutation.',
    category: 'Core Java',
    examples: [
      example(
        'private fields hide implementation details from callers.',
        `class Account {
  private int balance;
}`,
      ),
      example(
        'Public methods become the approved way to interact with the object.',
        `void deposit(int amount) {
  if (amount > 0) balance += amount;
}`,
      ),
      example(
        'Encapsulation is mostly about preventing invalid state, not about ceremony.',
        `int getBalance() {
  return balance;
}`,
      ),
    ],
    practice: {
      task: 'Create an Account class with a private balance field, a deposit method that ignores non-positive values, and a getBalance method.',
      code: javaFile({
        topLevel: `class Account {
  private int balance;

  void deposit(int amount) {
    if (amount > 0) {
      balance += amount;
    }
  }

  int getBalance() {
    return balance;
  }
}`,
        mainBody: `Account account = new Account();
account.deposit(20);
account.deposit(-4);
System.out.println(account.getBalance());`,
      }),
      requiredSnippets: ['private int balance;', 'void deposit(int amount)', 'if (amount > 0)', 'int getBalance()'],
      expectedOutput: ['20'],
      requirements: ['Keep balance private.', 'Reject non-positive deposits.'],
      coachNote: 'Encapsulation matters when the object must defend its own rules.',
    },
    predict: {
      label: 'API Design',
      code: `class Account {
  private int balance;
  void deposit(int amount) { if (amount > 0) balance += amount; }
  int getBalance() { return balance; }
}`,
      prompt: 'Why is this stronger than a public balance field?',
      options: ['It can enforce balance rules in one place', 'It makes objects impossible to use', 'It removes the need for testing', 'It speeds up the JVM'],
      correctAnswer: 0,
      explanation: 'Encapsulation centralizes the invariants the object must protect.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Common Mistake',
      code: `class Account {
  public int balance;
}`,
      options: ['Encapsulation is still strong', 'Any caller can now put the object into a bad state', 'Compile Error', 'Getter required by syntax'],
      correctAnswer: 1,
      explanation: 'A public field lets outside code bypass all validation rules.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-class-methods',
    title: 'Static Members and Utility Classes',
    description: 'Use static methods and fields when behavior belongs to the class itself rather than to one object instance.',
    category: 'Core Java',
    examples: [
      example(
        'Static methods belong to the class, not to a specific object.',
        `class NumberTools {
  static int square(int value) {
    return value * value;
  }
}`,
      ),
      example(
        'Static fields store shared state across all instances.',
        `class SessionCounter {
  static int created = 0;
}`,
      ),
      example(
        'Utility classes group stateless helper methods in one predictable place.',
        `Math.max(4, 9);`,
      ),
    ],
    practice: {
      task: 'Create a utility class NumberTools with a static method clampToTen that returns 10 when the input is greater than 10, otherwise the input. Print the result for 14.',
      code: javaFile({
        classBody: `static class NumberTools {
  static int clampToTen(int value) {
    return value > 10 ? 10 : value;
  }
}`,
        mainBody: `System.out.println(NumberTools.clampToTen(14));`,
      }),
      requiredSnippets: ['static class NumberTools', 'static int clampToTen(int value)', 'NumberTools.clampToTen(14)'],
      expectedOutput: ['10'],
      requirements: ['Use a static method.', 'Call it through the class name.'],
      coachNote: 'Choose static when no object state is required.',
      testCases: [
        {
          label: 'Clamp check',
          stdin_text: '',
          expected_output: '10',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `class Tools {
  static int plusOne(int value) {
    return value + 1;
  }
}

System.out.println(Tools.plusOne(9));`,
      options: ['9', '10', 'Tools', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The static method is called through the class name and returns value + 1.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `class Tools {
  int plusOne(int value) {
    return value + 1;
  }
}

System.out.println(Tools.plusOne(9));`,
      options: ['Works fine', 'Compile Error', 'Prints 10', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'An instance method cannot be called on the class name without an object.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-classes-objects',
    title: 'Object References and Memory Basics',
    description: 'Understand that object variables store references and that multiple references can point to the same object.',
    category: 'Core Java',
    examples: [
      example(
        'Primitive variables store values directly, but object variables store references.',
        `String name = "Java";
String copy = name;`,
      ),
      example(
        'Two references can point to the same object.',
        `Book first = new Book();
Book second = first;`,
      ),
      example(
        'Mutating through one reference affects the same underlying object.',
        `second.title = "Updated";`,
      ),
    ],
    practice: {
      task: 'Show one Book object referenced by two variables, set the title through the second reference, and print it from the first.',
      code: javaFile({
        topLevel: `class Book {
  String title;
}`,
        mainBody: `Book first = new Book();
Book second = first;
second.title = "Shared";
System.out.println(first.title);`,
      }),
      requiredSnippets: ['Book second = first;', 'second.title = "Shared";', 'System.out.println(first.title);'],
      expectedOutput: ['Shared'],
      requirements: ['Create only one underlying object.', 'Use two references to it.'],
      coachNote: 'Reference behavior explains a large share of early OOP bugs.',
    },
    predict: {
      code: `class Box {
  int value;
}

Box left = new Box();
left.value = 3;
Box right = left;
right.value = 9;
System.out.println(left.value);`,
      options: ['3', '9', '0', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'Both variables refer to the same Box object.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'Why does this matter in production code?',
      code: `Order current = cached;
current.total = 99;`,
      options: ['Because shared references can create surprising side effects', 'Because Java copies every object automatically', 'Because references only exist in C++', 'Because it only affects strings'],
      correctAnswer: 0,
      explanation: 'Shared references change how updates flow through the program.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-this-keyword',
    title: 'this, Overloading, and Method Design',
    description: 'Use this to disambiguate fields, overload carefully, and choose method signatures that stay readable.',
    category: 'Core Java',
    examples: [
      example(
        'this clarifies that you mean the current object field.',
        `User(String name) {
  this.name = name;
}`,
      ),
      example(
        'Overloading gives one concept multiple parameter shapes.',
        `int sum(int a, int b) { return a + b; }
int sum(int a, int b, int c) { return a + b + c; }`,
      ),
      example(
        'Method design is about predictable names and parameter order, not just passing compilation.',
        `sendEmail(String to, String subject)`,
      ),
    ],
    practice: {
      task: 'Create a User class with a name field, a constructor using this.name = name, and two overloaded label methods: one with no arguments and one that adds a prefix.',
      code: javaFile({
        topLevel: `class User {
  String name;

  User(String name) {
    this.name = name;
  }

  String label() {
    return name;
  }

  String label(String prefix) {
    return prefix + name;
  }
}`,
        mainBody: `User user = new User("Ava");
System.out.println(user.label("Hi "));`,
      }),
      requiredSnippets: ['this.name = name;', 'String label()', 'String label(String prefix)', 'return prefix + name;'],
      expectedOutput: ['Hi Ava'],
      requirements: ['Use this in the constructor.', 'Provide both overloaded methods.'],
      coachNote: 'Overloads are valuable only when the method meaning stays obvious in both forms.',
    },
    predict: {
      code: `class User {
  String name;

  User(String name) {
    this.name = name;
  }
}

User user = new User("Kai");
System.out.println(user.name);`,
      options: ['Kai', 'name', 'null', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'The constructor stores Kai in the field.',
    },
    mistake: {
      label: 'API Design',
      prompt: 'What is the better overload choice?',
      code: `A) save(String path)
B) save(int mode, String path, boolean reallySave, String extra)`,
      options: ['A', 'B', 'Both equally clear', 'Neither can compile'],
      correctAnswer: 0,
      explanation: 'Small, intention-revealing method signatures age much better than overloaded parameter soup.',
      questionKind: 'api-design',
    },
  }),
  lesson({
    id: 'java-scope',
    title: 'Packages and Organizing Java Code',
    description: 'Split classes by responsibility, use packages intentionally, and keep files aligned with project structure.',
    category: 'Core Java',
    examples: [
      example(
        'Packages group related classes under one stable namespace.',
        `package school.records;`,
      ),
      example(
        'One class per file is the default when code starts to grow.',
        `Student.java
StudentRepository.java
StudentPrinter.java`,
      ),
      example(
        'Names should explain responsibility, not hide it behind generic helpers.',
        `CsvParser.java
ReportWriter.java`,
      ),
    ],
    practice: {
      task: 'Sketch a tiny project split with package school.records and separate Student, StudentRepository, and Main files.',
      code: `// src/school/records/Student.java
package school.records;

public class Student {}

// src/school/records/StudentRepository.java
package school.records;

public class StudentRepository {}

// src/Main.java
import school.records.StudentRepository;

public class Main {}`,
      requiredSnippets: ['package school.records;', 'public class Student', 'public class StudentRepository', 'import school.records.StudentRepository;'],
      expectedOutput: ['One small but intentional package split.'],
      requirements: ['Use one package for related record classes.', 'Keep Main separate from the package classes.'],
      coachNote: 'Organization becomes a real quality issue as soon as classes start changing at different speeds.',
    },
    predict: {
      label: 'Refactor Choice',
      prompt: 'Which structure is easier to maintain?',
      code: `A) Separate files for Student, StudentRepository, and Main
B) One 900-line Main.java with every class nested inside for convenience`,
      options: ['A', 'B', 'Both equal', 'Neither matters once it compiles'],
      correctAnswer: 0,
      explanation: 'Clear package and file boundaries make changes safer and easier to reason about.',
      questionKind: 'refactor-choice',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `package school.records;
import school.records.Student;`,
      options: ['Always required', 'Redundant when importing from the same package into the same file', 'Compile Error because packages cannot import', 'Required only for interfaces'],
      correctAnswer: 1,
      explanation: 'Imports are for bringing in classes from other packages or static members, not for the current package itself.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-class-attributes',
    title: 'Project 2: Build a Student Record Manager',
    description: 'Combine classes, constructors, encapsulation, lists, and file organization into a small record manager.',
    category: 'Core Java',
    projectBrief: {
      goal: 'Design a class-based student record manager with add, update, remove, search, and list features.',
      inputs: ['User commands and student fields such as id, name, and grade.'],
      outputs: ['Updated in-memory student records and readable search/list output.'],
      skills: ['classes', 'constructors', 'encapsulation', 'lists', 'packages'],
    },
    examples: [
      example(
        'Projects improve when the data model, storage logic, and menu flow do not all live in one class.',
        `Student.java
StudentRepository.java
Main.java`,
      ),
      example(
        'A repository-like class gives one home to add, remove, and search behavior.',
        `repository.add(student);
repository.findById("S-100");`,
      ),
    ],
    practice: {
      task: 'Sketch the project with Student, StudentRepository, and a menu-driven Main class that calls addStudent and findStudentById.',
      code: `class Student {
  private final String id;
  private final String name;

  Student(String id, String name) {
    this.id = id;
    this.name = name;
  }
}

class StudentRepository {
  void addStudent(Student student) {}
  Student findStudentById(String id) { return null; }
}

public class Main {
  public static void main(String[] args) {}
}`,
      requiredSnippets: ['class Student', 'class StudentRepository', 'void addStudent(Student student)', 'Student findStudentById(String id)'],
      expectedOutput: ['A clear split between model, storage, and menu flow.'],
      requirements: ['Define separate classes for the model and repository.', 'Show at least add and find operations.'],
      coachNote: 'The project milestone is about structure first. Features get easier only after responsibilities are clear.',
    },
    predict: {
      label: 'API Design',
      prompt: 'What makes the record manager easier to extend?',
      code: `A) repository owns add/remove/find logic
B) Main edits the ArrayList directly from every branch`,
      options: ['A', 'B', 'Both are equally maintainable', 'Neither can scale'],
      correctAnswer: 0,
      explanation: 'A repository boundary keeps business rules from leaking into every menu path.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak design move here?',
      code: `Store every student field in parallel arrays and update them by index in Main`,
      options: ['Strong OOP design', 'Fragile because related data is not modeled as one Student object', 'Required by Java', 'Better than classes for records'],
      correctAnswer: 1,
      explanation: 'Parallel arrays make changes and invariants much harder to reason about.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-inheritance',
    title: 'Inheritance and Code Reuse',
    description: 'Extract shared fields and behavior into a base class when several types really share the same abstraction.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Inheritance models an is-a relationship.',
        `class Animal {
  String name;
}

class Dog extends Animal {}`,
      ),
      example(
        'Shared behavior belongs in the base class when every subtype needs it.',
        `void printName() {
  System.out.println(name);
}`,
      ),
      example(
        'Inheritance is useful when the shared concept is real, not when it only saves a few lines.',
        `class Vehicle {}
class Car extends Vehicle {}`,
      ),
    ],
    practice: {
      task: 'Create an Animal base class with a name field and a printName method, then a Dog subclass that sets the name to Pixel and prints it.',
      code: javaFile({
        topLevel: `class Animal {
  String name;

  void printName() {
    System.out.println(name);
  }
}

class Dog extends Animal {
  Dog() {
    name = "Pixel";
  }
}`,
        mainBody: `Dog dog = new Dog();
dog.printName();`,
      }),
      requiredSnippets: ['class Dog extends Animal', 'void printName()', 'name = "Pixel";'],
      expectedOutput: ['Pixel'],
      requirements: ['Use extends.', 'Reuse the base class method.'],
      coachNote: 'Inheritance is strongest when the parent type describes a real shared concept.',
      testCases: [
        {
          label: 'Basic inheritance',
          stdin_text: '',
          expected_output: 'Pixel',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `class Animal {
  void speak() {
    System.out.println("sound");
  }
}

class Dog extends Animal {}

new Dog().speak();`,
      options: ['sound', 'Dog', 'Nothing', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'Dog inherits speak from Animal.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'When is inheritance the wrong default?',
      code: `class Logger extends File because both are used together`,
      options: ['When the relationship is not really an is-a relationship', 'Only when Java forbids it', 'Never', 'Only for abstract classes'],
      correctAnswer: 0,
      explanation: 'Use inheritance for shared identity, not just convenience.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-polymorphism',
    title: 'Polymorphism and Method Overriding',
    description: 'Let one parent reference point to many concrete implementations and trust dynamic dispatch to choose the right method.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Overriding lets a subclass replace inherited behavior.',
        `class Animal {
  void speak() {
    System.out.println("sound");
  }
}

class Dog extends Animal {
  @Override
  void speak() {
    System.out.println("bark");
  }
}`,
      ),
      example(
        'A parent reference can point to a child object.',
        `Animal pet = new Dog();`,
      ),
      example(
        'Polymorphism matters because callers can depend on a shared contract instead of concrete types.',
        `pet.speak();`,
      ),
    ],
    practice: {
      task: 'Override speak in Dog so an Animal reference to a Dog prints bark.',
      code: javaFile({
        topLevel: `class Animal {
  void speak() {
    System.out.println("sound");
  }
}

class Dog extends Animal {
  @Override
  void speak() {
    System.out.println("bark");
  }
}`,
        mainBody: `Animal pet = new Dog();
pet.speak();`,
      }),
      requiredSnippets: ['class Dog extends Animal', '@Override', 'void speak()', 'Animal pet = new Dog();'],
      expectedOutput: ['bark'],
      requirements: ['Override the method in Dog.', 'Call it through an Animal reference.'],
      coachNote: 'Dynamic dispatch is the reason callers can work through shared abstractions.',
      testCases: [
        {
          label: 'Overridden method',
          stdin_text: '',
          expected_output: 'bark',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `Animal pet = new Dog();
pet.speak();`,
      options: ['Animal', 'sound', 'bark', 'Compile Error'],
      correctAnswer: 2,
      explanation: 'Java calls the override on the actual object type at runtime.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `class Dog extends Animal {
  void Speak() {
    System.out.println("bark");
  }
}`,
      options: ['Overrides speak correctly', 'Does not override because the method name changed', 'Compile Error only because of extends', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'Speak is a different method name, so it does not override speak.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-abstract-classes',
    title: 'Abstract Classes and Interfaces',
    description: 'Model shared contracts and partial implementations without forcing callers to depend on concrete classes.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Abstract classes can hold shared fields or methods plus abstract requirements.',
        `abstract class Shape {
  abstract double area();
}`,
      ),
      example(
        'Interfaces define a contract that many unrelated classes can implement.',
        `interface Printable {
  void print();
}`,
      ),
      example(
        'Choose abstract classes for shared base behavior and interfaces for capabilities.',
        `class Invoice implements Printable {}`,
      ),
    ],
    practice: {
      task: 'Sketch an abstract Shape class with area(), and a Printable interface with print(). Then make Rectangle extend Shape and implement Printable.',
      code: `abstract class Shape {
  abstract double area();
}

interface Printable {
  void print();
}

class Rectangle extends Shape implements Printable {
  @Override
  double area() { return 0; }

  @Override
  public void print() {}
}`,
      requiredSnippets: ['abstract class Shape', 'interface Printable', 'class Rectangle extends Shape implements Printable', 'double area()'],
      expectedOutput: ['One shared abstraction plus one capability contract.'],
      requirements: ['Use both an abstract class and an interface.', 'Have Rectangle connect to both.'],
      coachNote: 'Abstract classes and interfaces are design tools first. Their value is in the contract they create.',
    },
    predict: {
      label: 'API Design',
      prompt: 'When should you reach for an interface?',
      code: `When several different classes should all support one capability such as print(), save(), or close()`,
      options: ['Use an interface', 'Always use inheritance only', 'Use an enum', 'Avoid all contracts'],
      correctAnswer: 0,
      explanation: 'Interfaces are excellent for capability-style contracts shared across different concrete types.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Knowledge Check',
      code: `Shape shape = new Shape();`,
      options: ['Fine if Shape has one method', 'Illegal because abstract classes cannot be instantiated directly', 'Only illegal in C++', 'Runs but prints nothing'],
      correctAnswer: 1,
      explanation: 'Abstract classes define a template but cannot be directly instantiated.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-enums',
    title: 'Enums and Records',
    description: 'Use enums for fixed states and records for compact immutable data carriers.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Enums make fixed states explicit and type-safe.',
        `enum Status {
  NEW,
  PAID,
  SHIPPED
}`,
      ),
      example(
        'Records are concise for immutable data models.',
        `record User(String name, int score) {}`,
      ),
      example(
        'Enums and records reduce boilerplate when the model is mostly data and labels.',
        `User user = new User("Ava", 90);`,
      ),
    ],
    practice: {
      task: 'Create an enum Status with NEW and PAID, then a record Invoice(String id, Status status). Create one paid invoice and print INV-1:PAID.',
      code: javaFile({
        topLevel: `enum Status {
  NEW,
  PAID
}

record Invoice(String id, Status status) {}`,
        mainBody: `Invoice invoice = new Invoice("INV-1", Status.PAID);
System.out.println(invoice.id() + ":" + invoice.status());`,
      }),
      requiredSnippets: ['enum Status', 'record Invoice(String id, Status status)', 'Status.PAID'],
      expectedOutput: ['INV-1:PAID'],
      requirements: ['Use both an enum and a record.', 'Print the record data in one line.'],
      coachNote: 'These features shine when the domain model is small, fixed, and mostly data.',
      testCases: [
        {
          label: 'Enum and record',
          stdin_text: '',
          expected_output: 'INV-1:PAID',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `enum Status { NEW, PAID }
System.out.println(Status.NEW);`,
      options: ['NEW', 'Status.NEW', '0', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'Printing the enum constant shows its name by default.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `record User(String name) {}
User.name = "Ava";`,
      options: ['Valid mutation', 'Compile Error because record components are immutable accessors', 'Prints Ava', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'Records expose accessor methods, not mutable public fields.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-errors-exceptions',
    title: 'Exception Handling with try, catch, and finally',
    description: 'Handle recoverable failures explicitly and keep cleanup logic separate from the happy path.',
    category: 'OOP and Collections',
    examples: [
      example(
        'try wraps code that might fail.',
        `try {
  int result = 10 / 0;
} catch (ArithmeticException error) {
  System.out.println("invalid");
}`,
      ),
      example(
        'Catch the most relevant exception type you can explain.',
        `catch (NumberFormatException error) {}`,
      ),
      example(
        'finally is for cleanup that should happen whether the operation succeeds or fails.',
        `finally {
  System.out.println("done");
}`,
      ),
    ],
    practice: {
      task: 'Read one integer divisor. Print invalid if it is 0, otherwise print 10 divided by it.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int divisor = scanner.nextInt();
try {
  System.out.println(10 / divisor);
} catch (ArithmeticException error) {
  System.out.println("invalid");
}`,
      }),
      requiredSnippets: ['try {', '10 / divisor', 'catch (ArithmeticException error)', 'System.out.println("invalid");'],
      expectedOutput: ['5'],
      requirements: ['Handle division by zero.', 'Print the quotient when the divisor is valid.'],
      coachNote: 'Exception handling is for exceptional flow, not for replacing ordinary condition checks everywhere.',
      testCases: [
        {
          label: 'Valid division',
          stdin_text: '2\n',
          expected_output: '5',
          hidden: false,
        },
        {
          label: 'Zero divisor',
          stdin_text: '0\n',
          expected_output: 'invalid',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `try {
  System.out.println(10 / 0);
} catch (ArithmeticException error) {
  System.out.println("invalid");
}`,
      options: ['10', 'invalid', 'Runtime crash', 'Nothing'],
      correctAnswer: 1,
      explanation: 'The exception is caught and the catch block prints invalid.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `try {
  int value = Integer.parseInt("abc");
} catch (ArithmeticException error) {
  System.out.println("bad");
}`,
      options: ['Correct catch type', 'Wrong exception type for this failure', 'Compile Error only', 'Always prints bad'],
      correctAnswer: 1,
      explanation: 'parseInt of abc throws NumberFormatException, not ArithmeticException.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-super-keyword',
    title: 'throw, throws, and Custom Exceptions',
    description: 'Signal domain-specific failures clearly and decide whether a method handles them or lets callers deal with them.',
    category: 'OOP and Collections',
    examples: [
      example(
        'throw creates and raises an exception immediately.',
        `throw new IllegalArgumentException("amount must be positive");`,
      ),
      example(
        'throws advertises checked exceptions in a method signature.',
        `void load() throws IOException {}`,
      ),
      example(
        'Custom exceptions make failures more specific than generic RuntimeException.',
        `class InvalidAmountException extends Exception {}`,
      ),
    ],
    practice: {
      task: 'Sketch a custom InvalidAmountException and a withdraw method that throws it when the amount is negative.',
      code: `class InvalidAmountException extends Exception {
  InvalidAmountException(String message) {
    super(message);
  }
}

class Account {
  void withdraw(int amount) throws InvalidAmountException {
    if (amount < 0) {
      throw new InvalidAmountException("amount must be positive");
    }
  }
}`,
      requiredSnippets: ['class InvalidAmountException extends Exception', 'throws InvalidAmountException', 'throw new InvalidAmountException'],
      expectedOutput: ['A domain-specific exception path.'],
      requirements: ['Define a custom exception type.', 'Throw it from the method when the amount is invalid.'],
      coachNote: 'Custom exceptions are worth it when the failure has real domain meaning, not just when you want more code.',
    },
    predict: {
      label: 'Compiler Trace',
      code: `void load() throws IOException {}

public static void main(String[] args) {
  load();
}`,
      options: ['Always fine', 'Compile Error because the checked exception is not handled or declared', 'Runtime Error only', 'Prints nothing'],
      correctAnswer: 1,
      explanation: 'Checked exceptions must be handled or declared in the caller.',
      questionKind: 'compiler-trace',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'When does a custom exception help?',
      code: `When callers need to distinguish one domain failure from another`,
      options: ['Then it helps', 'Never', 'Only for syntax errors', 'Only inside interfaces'],
      correctAnswer: 0,
      explanation: 'Custom exceptions improve clarity when the error is part of the domain contract.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-arraylist',
    title: 'Lists and ArrayList',
    description: 'Use ArrayList when the number of items can grow or shrink and indexed access still matters.',
    category: 'OOP and Collections',
    examples: [
      example(
        'ArrayList is the default resizable list for most beginner Java tasks.',
        `ArrayList<String> names = new ArrayList<>();`,
      ),
      example(
        'You add, read, update, and remove by method calls.',
        `names.add("Ava");
names.set(0, "Kai");`,
      ),
      example(
        'Enhanced for loops work well when you only need to read each item.',
        `for (String name : names) {
  System.out.println(name);
}`,
      ),
    ],
    practice: {
      task: 'Read an integer n, then n integers, store them in an ArrayList<Integer>, and print the count of even values.',
      code: javaFile({
        imports: ['java.util.ArrayList', 'java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int n = scanner.nextInt();
ArrayList<Integer> values = new ArrayList<>();
int evenCount = 0;
for (int i = 0; i < n; i++) {
  int value = scanner.nextInt();
  values.add(value);
  if (value % 2 == 0) {
    evenCount++;
  }
}
System.out.println(evenCount);`,
      }),
      requiredSnippets: ['ArrayList<Integer> values = new ArrayList<>();', 'values.add(value);', 'value % 2 == 0'],
      expectedOutput: ['3'],
      requirements: ['Use ArrayList<Integer>.', 'Track how many numbers are even.'],
      coachNote: 'Vector-like collections are the default because they are easy to reason about and performant for many workloads.',
      testCases: [
        {
          label: 'Mixed numbers',
          stdin_text: '5\n1 2 4 7 8\n',
          expected_output: '3',
          hidden: false,
        },
        {
          label: 'No evens',
          stdin_text: '3\n1 3 5\n',
          expected_output: '0',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `ArrayList<String> names = new ArrayList<>();
names.add("Ava");
names.add("Kai");
System.out.println(names.get(1));`,
      options: ['Ava', 'Kai', '1', 'Error'],
      correctAnswer: 1,
      explanation: 'Index 1 points to the second inserted item.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `ArrayList<int> values = new ArrayList<>();`,
      options: ['Valid for primitive ints', 'Compile Error because generics use wrapper types like Integer', 'Runtime Error', 'Creates an empty list of zeros'],
      correctAnswer: 1,
      explanation: 'Generics work with reference types, so Integer is used instead of int.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-map',
    title: 'Sets, Maps, Queues, and Choosing the Right Collection',
    description: 'Pick collections by behavior: unique values, key-value lookup, ordered processing, or dynamic list access.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Set is for uniqueness.',
        `Set<String> tags = new HashSet<>();`,
      ),
      example(
        'Map is for key-value lookup.',
        `Map<String, Integer> scores = new HashMap<>();`,
      ),
      example(
        'Queue is for first-in, first-out processing.',
        `Queue<String> tasks = new ArrayDeque<>();`,
      ),
    ],
    practice: {
      task: 'Read n words and print how many unique words appeared by using a Set.',
      code: javaFile({
        imports: ['java.util.HashSet', 'java.util.Scanner', 'java.util.Set'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int n = scanner.nextInt();
Set<String> unique = new HashSet<>();
for (int i = 0; i < n; i++) {
  unique.add(scanner.next());
}
System.out.println(unique.size());`,
      }),
      requiredSnippets: ['Set<String> unique = new HashSet<>();', 'unique.add(scanner.next());', 'unique.size()'],
      expectedOutput: ['2'],
      requirements: ['Use a Set so duplicates collapse automatically.', 'Print only the unique count.'],
      coachNote: 'Collection choice is mostly about what behavior you want the container to guarantee for you.',
      testCases: [
        {
          label: 'Duplicates present',
          stdin_text: '4\nred blue red blue\n',
          expected_output: '2',
          hidden: false,
        },
        {
          label: 'All unique',
          stdin_text: '3\na b c\n',
          expected_output: '3',
          hidden: true,
        },
      ],
    },
    predict: {
      code: `Set<Integer> values = new HashSet<>();
values.add(4);
values.add(4);
System.out.println(values.size());`,
      options: ['0', '1', '2', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'A Set keeps only one copy of each unique value.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'Which collection is the better default when you need fast lookup by id?',
      code: `Store students by their studentId`,
      options: ['Map', 'Queue', 'Set', 'Array only'],
      correctAnswer: 0,
      explanation: 'A Map is built for key-value retrieval by id.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-method-parameters',
    title: 'Generics for Reusable Type-Safe Code',
    description: 'Write methods and classes that work across types without giving up compile-time safety.',
    category: 'OOP and Collections',
    examples: [
      example(
        'Generics let one method work across multiple reference types.',
        `static <T> void printItem(T item) {
  System.out.println(item);
}`,
      ),
      example(
        'Generic classes capture the type in the object itself.',
        `class Box<T> {
  T value;
}`,
      ),
      example(
        'The real win is removing unsafe casts from calling code.',
        `Box<String> nameBox = new Box<>();`,
      ),
    ],
    practice: {
      task: 'Create a generic Box<T> class with a value field, a constructor, and a getValue method. Then create a Box<String> with "Java" and print it.',
      code: javaFile({
        topLevel: `class Box<T> {
  private final T value;

  Box(T value) {
    this.value = value;
  }

  T getValue() {
    return value;
  }
}`,
        mainBody: `Box<String> box = new Box<>("Java");
System.out.println(box.getValue());`,
      }),
      requiredSnippets: ['class Box<T>', 'Box(T value)', 'T getValue()', 'Box<String> box = new Box<>("Java");'],
      expectedOutput: ['Java'],
      requirements: ['Use a generic type parameter T.', 'Instantiate the box with String.'],
      coachNote: 'Generics are mainly about making invalid type combinations impossible to express cleanly.',
      testCases: [
        {
          label: 'Generic class',
          stdin_text: '',
          expected_output: 'Java',
          hidden: false,
        },
      ],
    },
    predict: {
      code: `Box<Integer> box = new Box<>(7);
System.out.println(box.getValue());`,
      options: ['7', 'Integer', '0', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'The generic box stores and returns the Integer value.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Box<int> box = new Box<>(7);`,
      options: ['Valid primitive generic', 'Compile Error because generics require reference types', 'Runtime Error', 'Prints 7'],
      correctAnswer: 1,
      explanation: 'Use wrapper types like Integer for generics.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-hashmap',
    title: 'Project 3: Build a Banking System Simulator',
    description: 'Bring together classes, validation, inheritance, exceptions, and collections in a larger domain model.',
    category: 'OOP and Collections',
    projectBrief: {
      goal: 'Design a banking simulator with accounts, deposits, withdrawals, transfers, and transaction history.',
      inputs: ['Commands and account data.'],
      outputs: ['Account balances, transaction history, and validation errors.'],
      skills: ['classes', 'encapsulation', 'exceptions', 'collections', 'domain modeling'],
    },
    examples: [
      example(
        'Banking code feels professional when money rules live inside account methods, not in menu branches.',
        `account.deposit(50);
account.withdraw(20);`,
      ),
      example(
        'A map keyed by account id is a practical way to store accounts for lookup.',
        `accounts.put(account.id(), account);`,
      ),
    ],
    practice: {
      task: 'Sketch a banking simulator with Account, SavingsAccount, and Bank classes plus deposit, withdraw, and findAccount methods.',
      code: `class Account {
  void deposit(int amount) {}
  void withdraw(int amount) {}
}

class SavingsAccount extends Account {}

class Bank {
  Account findAccount(String id) { return null; }
}`,
      requiredSnippets: ['class Account', 'class SavingsAccount extends Account', 'void deposit(int amount)', 'void withdraw(int amount)', 'Account findAccount(String id)'],
      expectedOutput: ['A domain split for balances, account lookup, and account types.'],
      requirements: ['Model accounts as objects.', 'Show both account behavior and bank lookup.'],
      coachNote: 'Project quality comes from where the money rules live and how clearly the responsibilities are separated.',
    },
    predict: {
      label: 'API Design',
      prompt: 'Where should insufficient-balance validation live?',
      code: `A) inside Account.withdraw
B) scattered across every caller before they invoke withdraw`,
      options: ['A', 'B', 'Both equally safe', 'Neither matters'],
      correctAnswer: 0,
      explanation: 'The Account object should defend its own invariant.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak design move in this simulator?',
      code: `Store balances in one list and account ids in another list, matched only by index`,
      options: ['Strong modeling', 'Fragile because the relationship is implicit and easy to break', 'Required by collections', 'Better than Account objects'],
      correctAnswer: 1,
      explanation: 'Domain entities should stay together as objects instead of depending on parallel collections.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-comments',
    title: 'Reading Text Files in Java',
    description: 'Load file contents safely and keep the I/O boundary explicit instead of mixing it into business logic.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('Modern Java can read an entire text file with Files.readString.', `String content = Files.readString(Path.of("notes.txt"));`),
      example('File I/O belongs at the edge of the program, not everywhere.', `String input = Files.readString(path);\nprocess(input);`),
      example('Paths make the file location explicit in code.', `Path path = Path.of("notes.txt");`),
    ],
    practice: {
      task: 'Read notes.txt and print its first line.',
      code: javaFile({
        imports: ['java.nio.file.Files', 'java.nio.file.Path'],
        mainBody: `String content = Files.readString(Path.of("notes.txt"));
String firstLine = content.split("\\\\R")[0];
System.out.println(firstLine);`,
        throwsClause: 'Exception',
      }),
      requiredSnippets: ['Files.readString(Path.of("notes.txt"))', 'split("\\\\R")[0]', 'System.out.println(firstLine);'],
      expectedOutput: ['alpha'],
      requirements: ['Read the file from disk.', 'Print only the first line.'],
      coachNote: 'Keep file reading explicit and close to program startup or the data-loading layer.',
      testCases: [
        { label: 'Read first line', stdin_text: '', files: [{ path: 'notes.txt', contents: 'alpha\nbeta\n' }], expected_output: 'alpha', hidden: false },
        { label: 'Different file content', stdin_text: '', files: [{ path: 'notes.txt', contents: 'hello\nworld\n' }], expected_output: 'hello', hidden: true },
      ],
    },
    predict: {
      code: `String content = Files.readString(Path.of("notes.txt"));
System.out.println(content.length() > 0);`,
      prompt: 'Assume the file contains Java.',
      options: ['true', 'false', 'Compile Error', 'Runtime Error only'],
      correctAnswer: 0,
      explanation: 'A non-empty file produces a string whose length is greater than 0.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `String content = Files.readString(Path.of("missing.txt"));`,
      options: ['Always returns empty string', 'May throw an exception if the file does not exist', 'Compile Error', 'Converts to null'],
      correctAnswer: 1,
      explanation: 'File access can fail at runtime, so callers should understand that boundary.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-output',
    title: 'Writing Files and try-with-resources',
    description: 'Write data to disk and let try-with-resources close streams automatically.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('Files.writeString is the quickest way to write text to disk.', `Files.writeString(Path.of("summary.txt"), "ready");`),
      example('try-with-resources closes Closeable resources even when something fails.', `try (BufferedWriter writer = Files.newBufferedWriter(path)) {\n  writer.write("ready");\n}`),
      example('Output files should be deliberate side effects, not hidden surprises.', `saveReport(reportPath, reportText);`),
    ],
    practice: {
      task: 'Write ready to summary.txt using Files.writeString.',
      code: javaFile({
        imports: ['java.nio.file.Files', 'java.nio.file.Path'],
        mainBody: `Files.writeString(Path.of("summary.txt"), "ready");
System.out.println("saved");`,
        throwsClause: 'Exception',
      }),
      requiredSnippets: ['Files.writeString(Path.of("summary.txt"), "ready")'],
      expectedOutput: ['saved'],
      requirements: ['Create summary.txt.', 'Write exactly ready into the file.'],
      coachNote: 'The user-visible output confirms the write happened, but the real contract is the created file.',
      testCases: [
        {
          label: 'Write file',
          stdin_text: '',
          expected_output: 'saved',
          expected_files: [{ path: 'summary.txt', contents: 'ready' }],
          hidden: false,
        },
      ],
    },
    predict: {
      label: 'Knowledge Check',
      code: `try (BufferedWriter writer = Files.newBufferedWriter(path)) {
  writer.write("ok");
}`,
      options: ['The writer is closed automatically after the block', 'The writer stays open forever', 'Compile Error', 'The file is deleted'],
      correctAnswer: 0,
      explanation: 'try-with-resources exists to guarantee cleanup of closeable resources.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Files.writeString(Path.of("summary.txt"), 42);`,
      options: ['Writes 42', 'Compile Error because writeString expects CharSequence', 'Runtime Error only', 'Creates an empty file'],
      correctAnswer: 1,
      explanation: 'Files.writeString writes text, not a raw integer argument.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-date',
    title: 'Parsing and Formatting Data',
    description: 'Turn raw text into structured values and format values back into user-facing strings intentionally.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('Parsing is about moving from raw text to typed values.', `int score = Integer.parseInt("42");`),
      example('Formatting is about turning values back into readable output.', `String label = String.format("%s -> %d", "Ava", 42);`),
      example('Split, trim, and validate before assuming input is trustworthy.', `String[] parts = line.split(",");`),
    ],
    practice: {
      task: 'Read one line in the form name,score and print name -> score.',
      code: javaFile({
        imports: ['java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
String line = scanner.nextLine();
String[] parts = line.split(",");
String name = parts[0].trim();
int score = Integer.parseInt(parts[1].trim());
System.out.println(name + " -> " + score);`,
      }),
      requiredSnippets: ['line.split(",")', 'Integer.parseInt(parts[1].trim())', 'name + " -> " + score'],
      expectedOutput: ['Ava -> 42'],
      requirements: ['Split the line by comma.', 'Trim both pieces before using them.'],
      coachNote: 'Parsing code is more reliable when each transformation step is explicit and easy to inspect.',
      testCases: [
        { label: 'Simple pair', stdin_text: 'Ava,42\n', expected_output: 'Ava -> 42', hidden: false },
        { label: 'Spaced pair', stdin_text: 'Kai,  19\n', expected_output: 'Kai -> 19', hidden: true },
      ],
    },
    predict: {
      code: `int score = Integer.parseInt("12");
System.out.println(score + 3);`,
      options: ['123', '15', 'Compile Error', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'parseInt returns an int, so numeric addition is used.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int score = Integer.parseInt("4.5");`,
      options: ['4', 'Compile Error', 'NumberFormatException at runtime', '45'],
      correctAnswer: 2,
      explanation: '4.5 is not a valid integer string for parseInt.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-type-casting',
    title: 'Unit Testing with JUnit',
    description: 'Think in terms of assertions, repeatable checks, and protecting behavior against regressions.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('A unit test names one behavior and checks it with an assertion.', `@Test\nvoid addsTwoNumbers() {\n  assertEquals(7, MathTools.add(3, 4));\n}`),
      example('Tests are strongest when they are small, deterministic, and focused.', `assertEquals("AVA", TextTools.normalize(" ava "));`),
      example('The real value of tests is preventing regressions after future edits.', `run tests after refactor`),
    ],
    practice: {
      task: 'Write a tiny JUnit sketch for a normalize method and assert that " ava " becomes "AVA".',
      code: `@Test
void normalizesText() {
  assertEquals("AVA", TextTools.normalize(" ava "));
}`,
      requiredSnippets: ['@Test', 'assertEquals("AVA"', 'TextTools.normalize(" ava ")'],
      expectedOutput: ['One focused unit-test assertion.'],
      requirements: ['Name one behavior under test.', 'Assert the exact expected output.'],
      coachNote: 'The goal is mindset first: one behavior, one assertion, one reason the test exists.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'What makes a unit test valuable?',
      code: `It should be small, repeatable, and specific about the behavior it protects.`,
      options: ['That mindset makes tests valuable', 'Only long tests are useful', 'Tests replace design', 'Tests remove the need for debugging'],
      correctAnswer: 0,
      explanation: 'Good tests protect one behavior clearly enough that future failures are easy to diagnose.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'Which test is weaker?',
      code: `A) one assertion about one method
B) one huge test that covers ten unrelated behaviors`,
      options: ['A', 'B', 'Both equally strong', 'Neither should exist'],
      correctAnswer: 1,
      explanation: 'Large mixed tests are harder to trust and harder to debug when they fail.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-interfaces',
    title: 'Lambda Expressions and Functional Interfaces',
    description: 'Use lambdas to pass small pieces of behavior cleanly when one-method contracts are a good fit.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('A functional interface has exactly one abstract method.', `interface Formatter {\n  String apply(String value);\n}`),
      example('A lambda is a compact implementation of that single method.', `Formatter loud = value -> value.toUpperCase();`),
      example('Lambdas are best when the behavior is short and local to one use site.', `values.forEach(value -> System.out.println(value));`),
    ],
    practice: {
      task: 'Create a Formatter functional interface, assign a lambda that uppercases text, and print the result for java.',
      code: javaFile({
        topLevel: `interface Formatter {
  String apply(String value);
}`,
        mainBody: `Formatter loud = value -> value.toUpperCase();
System.out.println(loud.apply("java"));`,
      }),
      requiredSnippets: ['interface Formatter', 'String apply(String value);', 'value -> value.toUpperCase()', 'loud.apply("java")'],
      expectedOutput: ['JAVA'],
      requirements: ['Use a lambda expression.', 'Apply it through the interface type.'],
      coachNote: 'Lambdas make code smaller only when the behavior stays obvious at the call site.',
      testCases: [
        { label: 'Uppercase lambda', stdin_text: '', expected_output: 'JAVA', hidden: false },
      ],
    },
    predict: {
      code: `Formatter trim = value -> value.trim();
System.out.println(trim.apply(" ok "));`,
      options: [' ok ', 'ok', 'trim', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The lambda trims the spaces before returning the string.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `interface Formatter {
  String apply(String value);
  String fallback(String value);
}`,
      options: ['Still a functional interface', 'Not a functional interface anymore', 'Compile Error because interfaces cannot have methods', 'Runtime Error'],
      correctAnswer: 1,
      explanation: 'Two abstract methods means the interface no longer matches the lambda contract.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-hashset',
    title: 'Stream API: filter, map, and reduce',
    description: 'Move from manual loops to declarative data pipelines when the transformation reads more clearly as a sequence of operations.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('filter keeps only matching elements.', `values.stream().filter(value -> value % 2 == 0)`),
      example('map transforms each element into a new shape.', `.map(value -> value * 2)`),
      example('reduce combines many values into one result.', `.reduce(0, Integer::sum)`),
    ],
    practice: {
      task: 'Read n integers and use a stream to print the sum of the even values.',
      code: javaFile({
        imports: ['java.util.ArrayList', 'java.util.Scanner'],
        mainBody: `Scanner scanner = new Scanner(System.in);
int n = scanner.nextInt();
ArrayList<Integer> values = new ArrayList<>();
for (int i = 0; i < n; i++) {
  values.add(scanner.nextInt());
}
int total = values.stream()
  .filter(value -> value % 2 == 0)
  .reduce(0, Integer::sum);
System.out.println(total);`,
      }),
      requiredSnippets: ['values.stream()', '.filter(value -> value % 2 == 0)', '.reduce(0, Integer::sum)'],
      expectedOutput: ['14'],
      requirements: ['Use a stream pipeline.', 'Keep only even numbers before summing.'],
      coachNote: 'Streams help when the data flow becomes clearer as filter, map, and reduce stages.',
      testCases: [
        { label: 'Mixed numbers', stdin_text: '5\n2 3 4 5 8\n', expected_output: '14', hidden: false },
        { label: 'No even numbers', stdin_text: '3\n1 3 5\n', expected_output: '0', hidden: true },
      ],
    },
    predict: {
      code: `List<Integer> values = List.of(1, 2, 3);
int total = values.stream().map(value -> value * 2).reduce(0, Integer::sum);
System.out.println(total);`,
      options: ['6', '12', '3', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The values become 2, 4, and 6, which sum to 12.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'When is a plain loop still fine?',
      code: `When the loop is simpler and easier to read than the stream pipeline`,
      options: ['Then a loop is still fine', 'Never use loops again', 'Streams are always shorter and clearer', 'Loops cannot sum values'],
      correctAnswer: 0,
      explanation: 'Streams are a readability tool, not a rule that replaces every loop.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-booleans',
    title: 'Optional and Safer Null Handling',
    description: 'Model missing values explicitly and reduce surprise around null checks.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('Optional communicates that a value may be absent.', `Optional<String> name = Optional.of("Ava");`),
      example('orElse provides a fallback when the value is missing.', `String result = name.orElse("unknown");`),
      example('Optional is most useful at boundaries where absence is a real part of the contract.', `Optional<User> findUser(String id)`),
    ],
    practice: {
      task: 'Create an Optional<String> from "Java" and print it with orElse("unknown").',
      code: javaFile({
        imports: ['java.util.Optional'],
        mainBody: `Optional<String> value = Optional.of("Java");
System.out.println(value.orElse("unknown"));`,
      }),
      requiredSnippets: ['Optional<String> value = Optional.of("Java");', 'value.orElse("unknown")'],
      expectedOutput: ['Java'],
      requirements: ['Use Optional<String>.', 'Read the value through orElse.'],
      coachNote: 'Optional helps when callers need to see that missing data is intentional, not accidental.',
      testCases: [
        { label: 'Present optional', stdin_text: '', expected_output: 'Java', hidden: false },
      ],
    },
    predict: {
      code: `Optional<String> value = Optional.empty();
System.out.println(value.orElse("unknown"));`,
      options: ['unknown', 'null', 'Optional.empty', 'Compile Error'],
      correctAnswer: 0,
      explanation: 'orElse returns the fallback for an empty Optional.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Optional<String> value = null;`,
      options: ['Good Optional usage', 'Defeats the point because now the Optional reference itself can be null', 'Compile Error', 'Creates Optional.empty automatically'],
      correctAnswer: 1,
      explanation: 'Optional should represent absence, not become another nullable wrapper.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-treeset',
    title: 'Comparable, Comparator, and Sorting Objects',
    description: 'Define natural ordering carefully and reach for Comparator when the sort rule should stay outside the model.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('Comparable defines one natural ordering on the class itself.', `class Task implements Comparable<Task> {\n  @Override\n  public int compareTo(Task other) {\n    return this.priority - other.priority;\n  }\n}`),
      example('Comparator lets callers choose a sort rule externally.', `tasks.sort(Comparator.comparing(Task::name));`),
      example('Keep compareTo and Comparator rules consistent and easy to explain.', `Comparator.comparingInt(Task::priority)`),
    ],
    practice: {
      task: 'Sort a list of three names by length using Comparator.comparingInt and print the first name after sorting.',
      code: javaFile({
        imports: ['java.util.ArrayList', 'java.util.Comparator'],
        mainBody: `ArrayList<String> names = new ArrayList<>();
names.add("Mia");
names.add("Jo");
names.add("Alex");
names.sort(Comparator.comparingInt(String::length));
System.out.println(names.get(0));`,
      }),
      requiredSnippets: ['names.sort(Comparator.comparingInt(String::length))', 'names.get(0)'],
      expectedOutput: ['Jo'],
      requirements: ['Use Comparator.comparingInt.', 'Print the first sorted element.'],
      coachNote: 'Comparator is a great default when the ordering is specific to one use site rather than the class itself.',
      testCases: [
        { label: 'Sort by length', stdin_text: '', expected_output: 'Jo', hidden: false },
      ],
    },
    predict: {
      code: `List<Integer> values = new ArrayList<>(List.of(4, 1, 3));
Collections.sort(values);
System.out.println(values.get(0));`,
      options: ['4', '1', '3', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The natural ascending order places 1 first.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'When should you prefer Comparator over Comparable?',
      code: `When you want multiple possible sort rules without hard-coding one into the class`,
      options: ['Prefer Comparator then', 'Prefer Comparable only', 'Never sort objects', 'Only use TreeSet'],
      correctAnswer: 0,
      explanation: 'Comparator keeps alternative ordering logic out of the model class itself.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-modifiers',
    title: 'Immutable Data and Clean Class Design',
    description: 'Prefer stable, intention-revealing models with small interfaces and fewer mutation paths.',
    category: 'Files, Testing, and Functional Java',
    examples: [
      example('final fields make it harder for objects to drift into invalid states later.', `class User {\n  private final String id;\n}`),
      example('Immutable classes become easier to reason about because updates create new values instead of hidden mutation.', `record User(String id, String name) {}`),
      example('Clean design is mostly about smaller surfaces, clearer names, and fewer surprises.', `User rename(String nextName)`),
    ],
    practice: {
      task: 'Sketch an immutable User class or record with final id and name data plus no setter methods.',
      code: `record User(String id, String name) {}`,
      requiredSnippets: ['record User(String id, String name)'],
      expectedOutput: ['One small immutable model.'],
      requirements: ['Keep the model immutable.', 'Do not add setter methods.'],
      coachNote: 'Immutable models lower the number of places where state can silently change.',
    },
    predict: {
      label: 'API Design',
      prompt: 'What makes a class feel cleaner to maintain?',
      code: `A) Small surface, clear names, predictable state
B) Many setters, many flags, many hidden side effects`,
      options: ['A', 'B', 'Both equally maintainable', 'Neither matters'],
      correctAnswer: 0,
      explanation: 'Most maintainability gains come from fewer surprises and fewer mutation paths.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the smell here?',
      code: `User has 12 public mutable fields and no clear invariants`,
      options: ['Strong design', 'A sign that the model is too open and too hard to protect', 'Required for performance', 'Only a style preference'],
      correctAnswer: 1,
      explanation: 'Wide-open mutable models are hard to trust and easy to misuse.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-treemap',
    title: 'Project 4: Build a File-Based Library or Inventory App',
    description: 'Combine files, collections, parsing, and clean class boundaries into a persistent Java console app.',
    category: 'Files, Testing, and Functional Java',
    projectBrief: {
      goal: 'Design a library or inventory app that loads records from a file, updates them in memory, and saves them back.',
      inputs: ['File data and user menu commands.'],
      outputs: ['Updated records and saved file state.'],
      skills: ['files', 'collections', 'parsing', 'class design', 'sorting'],
    },
    examples: [
      example('Persistence changes the design because the app now owns both in-memory state and saved state.', `loadItems();\napplyCommand();\nsaveItems();`),
      example('A repository/service layer helps keep file code away from menu code.', `inventoryRepository.save(items);`),
    ],
    practice: {
      task: 'Sketch a file-based app split with Item, InventoryRepository, and Main classes plus loadItems and saveItems methods.',
      code: `class Item {}

class InventoryRepository {
  java.util.List<Item> loadItems() { return java.util.List.of(); }
  void saveItems(java.util.List<Item> items) {}
}

public class Main {
  public static void main(String[] args) {}
}`,
      requiredSnippets: ['class Item', 'class InventoryRepository', 'loadItems()', 'saveItems(java.util.List<Item> items)'],
      expectedOutput: ['A clear persistence boundary for a console app.'],
      requirements: ['Separate the repository from the entry point.', 'Show both load and save operations.'],
      coachNote: 'The production move is to isolate persistence so the menu flow does not become file-I/O glue code.',
    },
    predict: {
      label: 'API Design',
      prompt: 'What belongs in the repository layer?',
      code: `Loading and saving records from disk`,
      options: ['Repository layer', 'UI-only code', 'Comparator only', 'A global variable'],
      correctAnswer: 0,
      explanation: 'The repository boundary exists to own persistence concerns explicitly.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak design move?',
      code: `Mix file parsing, menu handling, and record mutation in one giant main method`,
      options: ['Strong separation', 'A maintainability problem because three responsibilities are fused together', 'Required for Java I/O', 'Only an issue with streams'],
      correctAnswer: 1,
      explanation: 'Persistence projects stay healthy when UI flow, parsing, and data storage are split apart.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-for-loop',
    title: 'Threads and the Basics of Concurrency',
    description: 'Understand that multiple threads can run independently and that concurrency changes how you reason about program order.',
    category: 'Advanced Java',
    examples: [
      example('A Thread runs work independently from the main thread.', `Thread worker = new Thread(() -> System.out.println("worker"));\nworker.start();`),
      example('join lets one thread wait for another to finish.', `worker.join();`),
      example('Once concurrency enters the picture, execution order is no longer as obvious as top-to-bottom source code.', `main and worker may interleave`),
    ],
    practice: {
      task: 'Sketch a small program that starts one worker thread and joins it before printing done in main.',
      code: `Thread worker = new Thread(() -> System.out.println("worker"));
worker.start();
worker.join();
System.out.println("done");`,
      requiredSnippets: ['new Thread(() ->', 'worker.start()', 'worker.join()'],
      expectedOutput: ['One thread start and one join point.'],
      requirements: ['Start a worker thread.', 'Wait for it with join before final output.'],
      coachNote: 'The concurrency milestone is mostly about mental models: more than one thread means more than one possible timeline.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'Why does join matter?',
      code: `main should wait for worker completion before moving on`,
      options: ['join provides that waiting point', 'join starts a thread', 'join removes race conditions automatically', 'join is only for streams'],
      correctAnswer: 0,
      explanation: 'join coordinates thread lifetimes by making one thread wait for another.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Thread worker = new Thread(task);
worker.run();`,
      options: ['Starts a new thread', 'Runs the task on the current thread instead of starting a new one', 'Compile Error', 'Joins automatically'],
      correctAnswer: 1,
      explanation: 'run executes synchronously; start launches a new thread.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-break-continue',
    title: 'Shared Data, Synchronization, and Thread Safety',
    description: 'Protect shared mutable state so correctness does not depend on lucky thread timing.',
    category: 'Advanced Java',
    examples: [
      example('Shared mutable state is where concurrency bugs usually begin.', `private int count = 0;`),
      example('synchronized protects a critical section so one thread enters it at a time.', `synchronized void increment() {\n  count++;\n}`),
      example('Thread safety is about invariants holding under interleaving, not about passing one lucky test run.', `multiple threads touching the same state`),
    ],
    practice: {
      task: 'Sketch a Counter class with a synchronized increment method for shared access.',
      code: `class Counter {
  private int value;

  synchronized void increment() {
    value++;
  }
}`,
      requiredSnippets: ['synchronized void increment()', 'value++;'],
      expectedOutput: ['One synchronized critical section.'],
      requirements: ['Protect the shared update with synchronized.', 'Keep the counter state private.'],
      coachNote: 'Concurrency design starts by being explicit about what data is shared and how access is protected.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'Why can shared mutable state be dangerous?',
      code: `Two threads can interleave reads and writes in ways that break assumptions`,
      options: ['That is the core danger', 'Because Java has no threads', 'Because synchronized is forbidden', 'Because primitives cannot be shared'],
      correctAnswer: 0,
      explanation: 'Interleaving is what creates races and broken invariants.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Common Mistake',
      code: `int count = 0;
// many threads update count without any coordination`,
      options: ['Always safe', 'Race-condition risk', 'Compile Error', 'Automatically synchronized by the JVM'],
      correctAnswer: 1,
      explanation: 'Uncoordinated shared writes are exactly where race conditions appear.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-set',
    title: 'Modern Java Concurrency Tools',
    description: 'Reach for higher-level concurrency utilities when they express the coordination model more clearly than raw Thread plus synchronization.',
    category: 'Advanced Java',
    examples: [
      example('ExecutorService manages pools of worker threads.', `ExecutorService pool = Executors.newFixedThreadPool(4);`),
      example('Future and CompletableFuture represent async results.', `Future<Integer> total = pool.submit(task);`),
      example('CountDownLatch and other utilities help coordinate steps between threads.', `CountDownLatch latch = new CountDownLatch(1);`),
    ],
    practice: {
      task: 'Sketch a small concurrency tool choice using ExecutorService and submit one task.',
      code: `ExecutorService pool = Executors.newFixedThreadPool(2);
Future<Integer> total = pool.submit(() -> 42);
pool.shutdown();`,
      requiredSnippets: ['ExecutorService', 'Executors.newFixedThreadPool(2)', 'pool.submit(() -> 42)', 'pool.shutdown()'],
      expectedOutput: ['One higher-level concurrency abstraction.'],
      requirements: ['Use an ExecutorService.', 'Submit one task and shut the pool down.'],
      coachNote: 'Higher-level concurrency tools are usually easier to reason about than manual thread management.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'Why use ExecutorService?',
      code: `Because task execution and thread management can be separated`,
      options: ['That is the reason', 'It removes all concurrency bugs', 'It is only for UI code', 'It replaces collections'],
      correctAnswer: 0,
      explanation: 'ExecutorService lets you describe work separately from how worker threads are managed.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is usually cleaner for many small async tasks?',
      code: `A) one raw Thread per task forever
B) a bounded executor service`,
      options: ['A', 'B', 'Both equally scalable', 'Neither can be used'],
      correctAnswer: 1,
      explanation: 'A bounded executor usually gives better control over concurrency and resource usage.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-math',
    title: 'The JVM, Garbage Collection, and Performance Basics',
    description: 'Understand the runtime model well enough to avoid magical thinking about memory, allocation, and speed.',
    category: 'Advanced Java',
    examples: [
      example('Java runs on the JVM, which manages bytecode execution and memory.', `javac Main.java\njava Main`),
      example('Garbage collection reclaims unreachable objects automatically, but allocation patterns still matter.', `new ArrayList<>();\nnew StringBuilder();`),
      example('Performance work starts with measurement and data structure choices, not with folklore.', `measure before optimizing`),
    ],
    practice: {
      task: 'Write a short note that distinguishes the JVM from the garbage collector and names one basic performance habit.',
      code: `// JVM: runs Java bytecode and manages execution.
// Garbage collector: reclaims unreachable objects.
// Habit: measure before optimizing.`,
      requiredSnippets: ['JVM', 'Garbage collector', 'measure before optimizing'],
      expectedOutput: ['One runtime explanation and one performance habit.'],
      requirements: ['Mention both the JVM and garbage collection.', 'Name one concrete performance habit.'],
      coachNote: 'The performance milestone is mostly about avoiding myths and choosing measurement over guesswork.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'What is the stronger optimization habit?',
      code: `Measure first, then optimize the code path that actually matters`,
      options: ['That habit is stronger', 'Guess based on intuition only', 'Rewrite everything in one pass', 'Ignore data structures'],
      correctAnswer: 0,
      explanation: 'Performance work should be evidence-driven.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Common Mistake',
      code: `Every allocation is automatically a bug because Java has a garbage collector`,
      options: ['True', 'Too absolute and misleading', 'Only false for records', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'Allocation cost matters, but the right answer depends on evidence and context.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-inner-classes',
    title: 'JARs, Packages, and Project Structure',
    description: 'Organize Java projects so code, packages, outputs, and distributable artifacts stay understandable.',
    category: 'Advanced Java',
    examples: [
      example('Packages define namespaces, while JARs package compiled code and resources for distribution.', `com/example/app/Main.java\nbuild/app.jar`),
      example('A clean project separates app code, tests, and build output.', `src/main/java\nsrc/test/java`),
      example('Project structure is part of maintainability because it decides how quickly someone can orient themselves.', `app/\n  domain/\n  io/\n  cli/`),
    ],
    practice: {
      task: 'Sketch a small Java project with src/main/java, src/test/java, one package, and one output JAR path.',
      code: `src/
  main/java/com/example/app/Main.java
  test/java/com/example/app/MainTest.java
build/libs/app.jar`,
      requiredSnippets: ['src/', 'main/java', 'test/java', 'app.jar'],
      expectedOutput: ['One small production-shaped Java project skeleton.'],
      requirements: ['Show app code, tests, and one output JAR location.', 'Use at least one package-style path.'],
      coachNote: 'Project structure is mostly about making the next change obvious instead of mysterious.',
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'What is a JAR?',
      code: `A packaged artifact for compiled Java classes and resources`,
      options: ['That definition is correct', 'A database engine', 'A replacement for packages', 'A test assertion'],
      correctAnswer: 0,
      explanation: 'A JAR is a packaging format, not a language feature that replaces packages.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak structure?',
      code: `Everything lives in one flat folder with no package or test separation`,
      options: ['Strong production layout', 'A maintainability smell', 'Required for JVM performance', 'Always simpler at scale'],
      correctAnswer: 1,
      explanation: 'Flat layouts become harder to navigate as responsibilities and test coverage grow.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-switch',
    title: 'Pattern Matching and Modern Java Features',
    description: 'Use modern Java features when they make intent clearer, not just because they are newer.',
    category: 'Advanced Java',
    examples: [
      example('Pattern matching for instanceof removes repetitive casts.', `Object value = "Java";\nif (value instanceof String text) {\n  System.out.println(text.toUpperCase());\n}`),
      example('Modern switch expressions reduce boilerplate for value-based branching.', `int length = switch (grade) {\n  case "A", "B" -> 1;\n  default -> 0;\n};`),
      example('New language features are valuable when they reduce accidental complexity.', `prefer clarity over novelty`),
    ],
    practice: {
      task: 'Use pattern matching with instanceof so an Object that stores "java" prints JAVA.',
      code: javaFile({
        mainBody: `Object value = "java";
if (value instanceof String text) {
  System.out.println(text.toUpperCase());
}`,
      }),
      requiredSnippets: ['value instanceof String text', 'text.toUpperCase()'],
      expectedOutput: ['JAVA'],
      requirements: ['Use instanceof pattern matching.', 'Print the uppercase text.'],
      coachNote: 'Modern features should remove friction without hiding the control flow.',
      testCases: [
        { label: 'Pattern matching', stdin_text: '', expected_output: 'JAVA', hidden: false },
      ],
    },
    predict: {
      code: `Object value = "Java";
if (value instanceof String text) {
  System.out.println(text.length());
}`,
      options: ['4', 'Java', 'Compile Error', 'Nothing'],
      correctAnswer: 0,
      explanation: 'The pattern variable text is available only inside the true branch.',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'What is the real goal of adopting modern features?',
      code: `Reduce ceremony when clarity improves`,
      options: ['That is the real goal', 'Use every new feature everywhere', 'Replace design with syntax', 'Avoid compatibility forever'],
      correctAnswer: 0,
      explanation: 'Modern syntax is valuable when it makes code easier to read and reason about.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-recursion',
    title: 'Recursion and Problem-Solving Patterns',
    description: 'Use recursion when the problem naturally reduces to a smaller version of itself and the base case is clear.',
    category: 'Advanced Java',
    examples: [
      example('Recursion needs a base case that stops the process.', `static int factorial(int n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}`),
      example('Each recursive call should move closer to the base case.', `factorial(n - 1)`),
      example('Recursion is a problem-solving tool, not the default for every loop-shaped task.', `choose the clearest approach`),
    ],
    practice: {
      task: 'Write a recursive factorial method and print factorial(5).',
      code: javaFile({
        classBody: `static int factorial(int n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}`,
        mainBody: `System.out.println(factorial(5));`,
      }),
      requiredSnippets: ['static int factorial(int n)', 'if (n <= 1)', 'return n * factorial(n - 1);'],
      expectedOutput: ['120'],
      requirements: ['Define a base case.', 'Call the method recursively on a smaller input.'],
      coachNote: 'Recursion is readable only when the base case and the shrinking step are both obvious.',
      testCases: [
        { label: 'Factorial of 5', stdin_text: '', expected_output: '120', hidden: false },
      ],
    },
    predict: {
      code: `static int countdown(int n) {
  if (n == 0) return 0;
  return countdown(n - 1);
}

System.out.println(countdown(3));`,
      options: ['3', '0', 'Stack overflow always', 'Compile Error'],
      correctAnswer: 1,
      explanation: 'The calls reduce n until the base case returns 0.',
    },
    mistake: {
      label: 'Common Mistake',
      code: `static int factorial(int n) {
  return n * factorial(n - 1);
}`,
      options: ['Valid recursion', 'Missing base case', 'Compile Error', 'Returns 1 by default'],
      correctAnswer: 1,
      explanation: 'Without a base case, the recursion never stops properly.',
      questionKind: 'common-mistake',
    },
  }),
  lesson({
    id: 'java-linkedlist',
    title: 'Data Structures and Algorithmic Thinking in Java',
    description: 'Choose structures by access pattern and build habits around complexity, invariants, and edge cases.',
    category: 'Advanced Java',
    examples: [
      example('Data-structure choice follows the operations you need most often.', `ArrayList for indexed access\nArrayDeque for stack/queue behavior\nHashMap for lookup`),
      example('Algorithmic thinking starts with invariants and edge cases, not just syntax.', `empty input\none value\nalready sorted`),
      example('The vector-first habit is practical until another structure clearly fits better.', `prefer ArrayList unless a different access pattern dominates`),
    ],
    practice: {
      task: 'Use an ArrayDeque as a stack: push 1, 2, and 3, then print the top element after one pop.',
      code: javaFile({
        imports: ['java.util.ArrayDeque'],
        mainBody: `ArrayDeque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
stack.push(3);
stack.pop();
System.out.println(stack.peek());`,
      }),
      requiredSnippets: ['ArrayDeque<Integer> stack = new ArrayDeque<>();', 'stack.push(1);', 'stack.pop();', 'stack.peek()'],
      expectedOutput: ['2'],
      requirements: ['Use stack-style operations.', 'Print the top after one pop.'],
      coachNote: 'The right structure is the one whose operations match the behavior you need most often.',
      testCases: [
        { label: 'Stack behavior', stdin_text: '', expected_output: '2', hidden: false },
      ],
    },
    predict: {
      label: 'Knowledge Check',
      prompt: 'Why would you choose a HashMap?',
      code: `You need key-based lookup by id`,
      options: ['That is the reason', 'To preserve insertion order always', 'To replace every list', 'Only for recursion'],
      correctAnswer: 0,
      explanation: 'HashMap is a lookup structure, not a universal replacement for every other collection.',
      questionKind: 'knowledge-check',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak habit in problem solving?',
      code: `Picking a structure by habit without checking the actual access pattern`,
      options: ['Strong engineering habit', 'A common source of mismatched designs', 'Required for interviews', 'Always the fastest choice'],
      correctAnswer: 1,
      explanation: 'Good data-structure choices follow workload and invariants, not reflex.',
      questionKind: 'refactor-choice',
    },
  }),
  lesson({
    id: 'java-method-overloading',
    title: 'Refactoring, Code Smells, and Maintainability',
    description: 'Recognize duplication, confusing APIs, and oversized classes early enough to improve the design before it hardens.',
    category: 'Advanced Java',
    examples: [
      example('Duplicate logic is usually a signal to extract a helper or a better abstraction.', `normalizeName();\nnormalizeAddress();`),
      example('Long methods, flag arguments, and giant classes are often smell indicators rather than goals.', `process(boolean fast, boolean strict, boolean verbose, boolean retry)`),
      example('Refactoring is safer when behavior is already protected by tests.', `refactor after a small test safety net exists`),
    ],
    practice: {
      task: 'Refactor this intent into cleaner structure: separate parseUser, validateUser, and saveUser methods instead of one giant process method.',
      code: `class UserService {
  User parseUser(String raw) { return null; }
  void validateUser(User user) {}
  void saveUser(User user) {}
}`,
      requiredSnippets: ['parseUser(String raw)', 'validateUser(User user)', 'saveUser(User user)'],
      expectedOutput: ['One clearer split of responsibilities.'],
      requirements: ['Break the flow into smaller named steps.', 'Make each method own one job.'],
      coachNote: 'Refactoring is mostly the practice of making responsibilities easier to see and easier to change.',
    },
    predict: {
      label: 'Refactor Choice',
      prompt: 'Which option is the code smell?',
      code: `A) one 250-line method with parsing, validation, saving, and logging mixed together
B) several smaller methods with explicit names`,
      options: ['A', 'B', 'Both equally maintainable', 'Neither matters'],
      correctAnswer: 0,
      explanation: 'Oversized mixed-responsibility methods are a classic maintainability smell.',
      questionKind: 'refactor-choice',
    },
    mistake: {
      label: 'Knowledge Check',
      prompt: 'What makes refactoring safer?',
      code: `Tests or other clear behavior checks before and after the change`,
      options: ['That makes it safer', 'Refactoring should never happen', 'Only comments make it safe', 'More flags in one method'],
      correctAnswer: 0,
      explanation: 'Safe refactoring depends on preserving known behavior through checks.',
      questionKind: 'knowledge-check',
    },
  }),
  lesson({
    id: 'java-intro',
    title: 'Project 5: Build a Complete Java Console App with Files, Collections, Streams, and Tests',
    description: 'Bring the full Java track together in one final multi-file console application with persistence, collections, stream-based reports, and tests.',
    category: 'Advanced Java',
    projectBrief: {
      goal: 'Design a complete Java console application that loads data from files, updates state with collections, uses streams for reporting, and protects behavior with tests.',
      inputs: ['User commands and persisted file state.'],
      outputs: ['Updated records, generated reports, saved files, and repeatable tests.'],
      skills: ['project organization', 'files', 'collections', 'streams', 'tests', 'refactoring'],
    },
    examples: [
      example('The capstone is where architecture quality becomes visible: data loading, domain logic, reporting, and tests all need clear boundaries.', `loadState();\nhandleCommand();\nsaveState();\nrunReports();`),
      example('A production-ready console app has one deliberate boot flow instead of many hidden side effects.', `boot -> load -> command loop -> save -> exit`),
    ],
    practice: {
      task: 'Sketch the capstone split with App, Repository, ReportService, and AppTest classes plus a boot flow that loads, runs, and saves.',
      code: `class Repository {}
class ReportService {}
class App {}
class AppTest {}

// boot flow:
// 1. load state
// 2. run command loop
// 3. save state
// 4. print reports`,
      requiredSnippets: ['class Repository', 'class ReportService', 'class App', 'class AppTest', 'load state'],
      expectedOutput: ['A full app skeleton with data, reporting, and testing boundaries.'],
      requirements: ['Define clear architectural roles.', 'Show the load-run-save flow explicitly.'],
      coachNote: 'The capstone is not about showing every feature in one file. It is about showing that the system has clean boundaries.',
    },
    predict: {
      label: 'API Design',
      prompt: 'What makes the capstone feel production-ready?',
      code: `A) clear module boundaries, persistence flow, reporting logic, and tests
B) one giant file that technically works`,
      options: ['A', 'B', 'Both equal', 'Neither can ship'],
      correctAnswer: 0,
      explanation: 'Production readiness comes from structure, not just from a long list of features.',
      questionKind: 'api-design',
    },
    mistake: {
      label: 'Refactor Choice',
      prompt: 'What is the weak final-project move?',
      code: `Add more fixes inside Main instead of clarifying architecture and responsibilities`,
      options: ['Strong capstone move', 'A sign the architecture needs cleanup instead', 'Required for console apps', 'Better than tests'],
      correctAnswer: 1,
      explanation: 'The last jump to production quality is almost always architectural clarity, not one more patch in main.',
      questionKind: 'refactor-choice',
    },
  }),
];

const javaLessons = lessons.map((lessonItem, index) => {
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
    language: 'java',
    category: lessonItem.category,
    isLocked: false,
    ...(lessonItem.projectBrief ? { projectBrief: lessonItem.projectBrief } : {}),
    content: {
      steps,
    },
  };
});

const javaLessonCatalogEntries = javaLessons.map((lessonItem, languageIndex) => ({
  id: lessonItem.id,
  title: lessonItem.title,
  language: 'java',
  index: 150 + languageIndex,
  languageIndex,
}));

const javaLessonMeta = javaLessons.map((lessonItem) => ({
  id: lessonItem.id,
  difficulty: lessonItem.difficulty,
  baseXP: lessonItem.baseXP,
  baselineTime: lessonItem.baselineTime,
  language: 'java',
}));

const javaEvaluationBank = Object.fromEntries(
  lessons
    .map((lessonItem) => [lessonItem.id, buildEvaluationBankEntry(lessonItem)])
    .filter((entry) => entry[1]),
);

const generatedLessonFile = `import type { Lesson } from './lessons';

// Generated by scripts/generate-java-curriculum.mjs
export const javaLessons: Lesson[] = ${JSON.stringify(javaLessons, null, 2)} as Lesson[];

export const javaLessonCatalogEntries = ${JSON.stringify(javaLessonCatalogEntries, null, 2)} as const;
`;

const generatedMetaFile = `export const JAVA_LESSON_META = ${JSON.stringify(javaLessonMeta, null, 2)};
`;

const generatedEvaluationBankFile = `// Generated by scripts/generate-java-curriculum.mjs
export const JAVA_LESSON_EVALUATION_BANK = ${JSON.stringify(javaEvaluationBank, null, 2)};

export const getJavaLessonEvaluationDefinition = (lessonId) =>
  JAVA_LESSON_EVALUATION_BANK[String(lessonId || '').trim()] || null;
`;

fs.writeFileSync(
  path.join(projectRoot, 'src', 'data', 'javaLessons.generated.ts'),
  generatedLessonFile,
);
fs.writeFileSync(
  path.join(projectRoot, 'shared', 'java-lesson-meta.js'),
  generatedMetaFile,
);
fs.writeFileSync(
  path.join(projectRoot, 'services', 'progression', 'java-lesson-evaluation-bank.generated.js'),
  generatedEvaluationBankFile,
);

console.log(`Generated ${javaLessons.length} Java lessons.`);
console.log(`Execution-backed Java lessons: ${Object.keys(javaEvaluationBank).length}`);
