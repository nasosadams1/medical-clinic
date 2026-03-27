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

const interpolate = (start, end, progress) => start + (end - start) * progress;
const roundToHalfMinute = (value) => Math.round(value * 2) / 2;

const getDifficultyByIndex = (index) => {
  if (index < 15) return 'Beginner';
  if (index < 32) return 'Intermediate';
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

const lessons = [
  lesson({
    id: 'cpp-intro-1',
    title: 'Your First C++ Program',
    description: 'Write, compile, and run the smallest valid C++ program and learn what the first compiler messages mean.',
    category: 'Foundations',
    examples: [
      example(
        'A minimal C++ program needs an include, main(), and one output statement.',
        `#include <iostream>

int main() {
    std::cout << "Hello, C++!" << std::endl;
    return 0;
}`
      ),
      example(
        'main() is the entry point where program execution starts.',
        `int main() {
    return 0;
}`
      ),
      example(
        'The compile-run cycle turns source code into an executable and then runs it.',
        `g++ main.cpp -std=c++20 -o app
./app`
      ),
      example(
        'A compiler error tells you where the parser first got confused.',
        `main.cpp:4:5: error: expected ';' after expression`
      ),
    ],
    practice: {
      task: 'Write a complete C++ program that prints Hello, C++!',
      code: `#include <iostream>

int main() {
    std::cout << "Hello, C++!" << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <iostream>', 'int main()', 'std::cout', '"Hello, C++!"'],
      expectedOutput: ['Hello, C++!'],
      requirements: ['Include the iostream header.', 'Print the text exactly once.', 'Return 0 from main().'],
      coachNote: 'Keep the whole program complete. This lesson is about the full compile-run skeleton, not only the cout line.',
    },
    predict: {
      code: `#include <iostream>

int main() {
    std::cout << "Hi" << std::endl;
    return 0;
}`,
      options: ['main()', 'Hi', '"Hi"', 'Nothing'],
      correctAnswer: 1,
      explanation: 'std::cout prints the string contents, so the program writes Hi without quotes.',
    },
    mistake: {
      code: `#include <iostream>

int main() {
    std::cout << "Hi" << std::endl
    return 0;
}`,
      options: ['Hi', 'Nothing', 'Compiler error', 'Runtime error'],
      correctAnswer: 2,
      explanation: 'The std::cout line is missing a semicolon, so the compiler stops before the program can run.',
    },
  }),
  lesson({
    id: 'cpp-variables',
    title: 'Variables and Basic Types',
    description: 'Use int, double, char, and bool variables with clear names and correct initialization.',
    category: 'Foundations',
    examples: [
      example(
        'int stores whole numbers.',
        `int lives = 3;
std::cout << lives << std::endl;`
      ),
      example(
        'double stores decimal values.',
        `double price = 19.95;
std::cout << price << std::endl;`
      ),
      example(
        'char holds one character and bool holds true or false.',
        `char grade = 'A';
bool isReady = true;
std::cout << grade << " " << isReady << std::endl;`
      ),
      example(
        'Clear variable names make intent obvious.',
        `int totalScore = 42;
double averageTime = 3.5;`
      ),
    ],
    practice: {
      task: 'Declare four variables named age, price, grade, and isReady, then print them in order.',
      code: `#include <iostream>

int main() {
    int age = 20;
    double price = 9.5;
    char grade = 'A';
    bool isReady = true;

    std::cout << age << " " << price << " " << grade << " " << isReady << std::endl;
    return 0;
}`,
      requiredSnippets: ['int age', 'double price', 'char grade', 'bool isReady', 'std::cout'],
      expectedOutput: ['20 9.5 A 1'],
      requirements: ['Use the exact variable names from the prompt.', 'Initialize each variable when you declare it.'],
      coachNote: 'bool prints as 1 or 0 with normal std::cout unless you enable boolalpha.',
    },
    predict: {
      code: `#include <iostream>

int main() {
    bool done = false;
    std::cout << done << std::endl;
    return 0;
}`,
      options: ['false', '0', 'done', 'Error'],
      correctAnswer: 1,
      explanation: 'Without std::boolalpha, bool values print as 1 for true and 0 for false.',
    },
    mistake: {
      code: `char grade = "A";`,
      options: ['Valid char assignment', 'Compiler error', 'Prints A', 'Stores ASCII 65'],
      correctAnswer: 1,
      explanation: 'A char needs single quotes. "A" is a string literal, so the assignment does not match char.',
    },
  }),
  lesson({
    id: 'cpp-user-input',
    title: 'Input, Operators, and Expressions',
    description: 'Read values with std::cin, combine them with operators, and respect precedence rules.',
    category: 'Foundations',
    examples: [
      example(
        'std::cin reads a value into a variable.',
        `int age;
std::cin >> age;`
      ),
      example(
        'Arithmetic operators build expressions from values.',
        `int total = 4 + 3 * 2;
std::cout << total << std::endl;`
      ),
      example(
        'Parentheses can make precedence explicit.',
        `int total = (4 + 3) * 2;
std::cout << total << std::endl;`
      ),
      example(
        'Assignment stores the result of an expression.',
        `int score = 10;
score = score + 5;
std::cout << score << std::endl;`
      ),
    ],
    practice: {
      task: 'Read two integers and print their sum on one line.',
      code: `#include <iostream>

int main() {
    int a;
    int b;
    std::cin >> a >> b;
    std::cout << a + b << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::cin', 'a + b', 'std::cout'],
      expectedOutput: ['7'],
      requirements: ['Read both numbers from standard input.', 'Print the expression result once.'],
      coachNote: 'Start by storing the inputs in named variables, then combine them in the output statement.',
    },
    predict: {
      prompt: 'Assume the user enters 8 and 2.',
      code: `int x;
int y;
std::cin >> x >> y;
std::cout << x / y << std::endl;`,
      options: ['4', '4.0', '82', 'Error'],
      correctAnswer: 0,
      explanation: 'Both variables are ints, so 8 / 2 evaluates to the integer 4.',
    },
    mistake: {
      code: `std::cout << 5 / 2 << std::endl;`,
      options: ['2', '2.5', '5', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'Integer division truncates the decimal part, so 5 / 2 becomes 2.',
    },
  }),
  lesson({
    id: 'cpp-if-else',
    title: 'Booleans and Conditionals',
    description: 'Use comparisons, logical operators, and if / else branches to control program flow.',
    category: 'Foundations',
    examples: [
      example(
        'Comparisons produce bool results.',
        `int score = 90;
std::cout << (score >= 60) << std::endl;`
      ),
      example(
        'if runs a block only when the condition is true.',
        `if (score >= 60) {
    std::cout << "Pass" << std::endl;
}`
      ),
      example(
        'else gives the false branch a clear path.',
        `if (score >= 60) {
    std::cout << "Pass" << std::endl;
} else {
    std::cout << "Retry" << std::endl;
}`
      ),
      example(
        'Logical operators combine multiple conditions.',
        `if (score >= 60 && score <= 100) {
    std::cout << "Valid passing score" << std::endl;
}`
      ),
    ],
    practice: {
      task: 'Read an integer score and print Pass if it is at least 60, otherwise print Fail.',
      code: `#include <iostream>

int main() {
    int score;
    std::cin >> score;

    if (score >= 60) {
        std::cout << "Pass" << std::endl;
    } else {
        std::cout << "Fail" << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['std::cin', 'if (score >= 60)', 'else', 'std::cout'],
      expectedOutput: ['Pass'],
      requirements: ['Use one if / else decision.', 'Print exactly one result.'],
      coachNote: 'Translate the rule directly into the condition. Do not print both branches.',
    },
    predict: {
      code: `int x = 5;

if (x > 2) {
    std::cout << "A" << std::endl;
} else {
    std::cout << "B" << std::endl;
}`,
      options: ['A', 'B', '5', 'Nothing'],
      correctAnswer: 0,
      explanation: '5 is greater than 2, so the if branch runs and prints A.',
    },
    mistake: {
      code: `int x = 0;

if (x = 5) {
    std::cout << "A" << std::endl;
}`,
      options: ['Prints A', 'Prints 5', 'Compiler error', 'Skips the block'],
      correctAnswer: 0,
      explanation: 'x = 5 assigns 5 to x, and the expression evaluates as true, so the block runs. This is a classic assignment-vs-comparison bug.',
    },
  }),
  lesson({
    id: 'cpp-for-loop',
    title: 'Loops',
    description: 'Repeat work with while and for loops, counters, sentinels, and common loop patterns.',
    category: 'Foundations',
    examples: [
      example(
        'while repeats while its condition stays true.',
        `int count = 1;
while (count <= 3) {
    std::cout << count << std::endl;
    count++;
}`
      ),
      example(
        'for is compact when you know the loop counter pattern.',
        `for (int i = 0; i < 3; i++) {
    std::cout << i << std::endl;
}`
      ),
      example(
        'A running sum is one of the most common loop patterns.',
        `int total = 0;
for (int i = 1; i <= 4; i++) {
    total += i;
}`
      ),
      example(
        'A sentinel loop stops when a special value appears.',
        `int value;
while (std::cin >> value && value != -1) {
    std::cout << value << std::endl;
}`
      ),
    ],
    practice: {
      task: 'Read an integer n and print the numbers from 1 to n, one per line.',
      code: `#include <iostream>

int main() {
    int n;
    std::cin >> n;

    for (int i = 1; i <= n; i++) {
        std::cout << i << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['std::cin', 'for (int i = 1;', 'i <= n', 'std::cout'],
      expectedOutput: ['1', '2', '3'],
      requirements: ['Use a counting loop.', 'Print one number per iteration.'],
      coachNote: 'Set the counter to 1, not 0, because the prompt starts at 1.',
    },
    predict: {
      code: `int total = 0;

for (int i = 1; i <= 3; i++) {
    total += i;
}

std::cout << total << std::endl;`,
      options: ['3', '6', '9', 'Error'],
      correctAnswer: 1,
      explanation: 'The loop adds 1 + 2 + 3, so total becomes 6.',
    },
    mistake: {
      code: `int i = 0;
while (i < 3) {
    std::cout << i << std::endl;
}`,
      options: ['0 1 2', 'Infinite loop', 'Compiler error', 'Prints nothing'],
      correctAnswer: 1,
      explanation: 'i never changes, so the condition stays true forever and the loop never finishes.',
    },
  }),
  lesson({
    id: 'cpp-functions',
    title: 'Functions',
    description: 'Break programs into reusable functions with parameters, return values, and clear responsibilities.',
    category: 'Foundations',
    examples: [
      example(
        'A function groups reusable work under a name.',
        `void greet() {
    std::cout << "Hello" << std::endl;
}`
      ),
      example(
        'Parameters let a function work with changing input.',
        `void greet(std::string name) {
    std::cout << "Hello, " << name << std::endl;
}`
      ),
      example(
        'Return values send data back to the caller.',
        `int square(int n) {
    return n * n;
}`
      ),
      example(
        'Function decomposition removes repetition from main().',
        `double applyTax(double price) {
    return price * 1.2;
}`
      ),
    ],
    practice: {
      task: 'Write a function int square(int n) that returns n * n, then print square(5).',
      code: `#include <iostream>

int square(int n) {
    return n * n;
}

int main() {
    std::cout << square(5) << std::endl;
    return 0;
}`,
      requiredSnippets: ['int square(int n)', 'return n * n', 'square(5)', 'std::cout'],
      expectedOutput: ['25'],
      requirements: ['Put the reusable logic inside the function.', 'Call the function from main().'],
      coachNote: 'If the function computes a value, return it. main() should only print the returned result.',
    },
    predict: {
      code: `int add(int a, int b) {
    return a + b;
}

std::cout << add(2, 3) << std::endl;`,
      options: ['5', '23', 'add', 'Error'],
      correctAnswer: 0,
      explanation: 'add(2, 3) returns 5, and std::cout prints that value.',
    },
    mistake: {
      code: `void greet() {
    std::cout << "Hi" << std::endl;
}

int main() {
    greet;
}`,
      options: ['Prints Hi', 'Compiler error', 'Nothing useful happens', 'Prints greet'],
      correctAnswer: 2,
      explanation: 'greet refers to the function, but without greet() the function is never called.',
    },
  }),
  lesson({
    id: 'cpp-debugging',
    title: 'Debugging Basics',
    description: 'Separate compiler errors, runtime errors, and logic errors, then use prints and assertions to isolate bugs.',
    category: 'Foundations',
    examples: [
      example(
        'Compiler errors stop the program before it runs.',
        `error: expected ';' before 'return'`
      ),
      example(
        'Runtime errors happen after the program starts executing.',
        `std::vector<int> values = {1, 2};
std::cout << values.at(5) << std::endl;`
      ),
      example(
        'Logic errors produce the wrong answer even though the program runs.',
        `int total = 2 + 2;
std::cout << total * 10 << std::endl;`
      ),
      example(
        'Temporary debug prints show the state before and after a calculation.',
        `std::cout << "before: " << score << std::endl;
score += bonus;
std::cout << "after: " << score << std::endl;`
      ),
    ],
    practice: {
      task: 'Read two integers, print a debug line showing both values, then print their product.',
      code: `#include <cassert>
#include <iostream>

int main() {
    int a;
    int b;
    std::cin >> a >> b;

    std::cout << "debug: " << a << " " << b << std::endl;
    assert(b != 0 || a == 0 || a != 0);
    std::cout << a * b << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::cin', '"debug:"', 'std::cout << a * b', 'assert('],
      expectedOutput: ['debug: 3 4', '12'],
      requirements: ['Print a debug line before the final answer.', 'Keep the final answer on its own line.', 'Include one assertion.'],
      coachNote: 'The point is the workflow: inspect the inputs, then compute the result. The assertion can be simple.',
    },
    predict: {
      code: `int x = 4;
std::cout << "x = " << x << std::endl;
x += 3;
std::cout << x << std::endl;`,
      options: ['x = 4 then 7', '4 then 3', '7 then 4', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'The first print shows the original value, then x becomes 7 before the second line is printed.',
    },
    mistake: {
      code: `int total = 10;
int count = 0;
std::cout << total / count << std::endl;`,
      options: ['0', '10', 'Runtime failure / undefined behavior', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Dividing by zero is not safe. In C++, integer division by zero leads to undefined behavior or a crash.',
    },
  }),
  lesson({
    id: 'cpp-strings',
    title: 'Strings',
    description: 'Work with std::string values, concatenate text, inspect length, index characters, and read full lines.',
    category: 'Foundations',
    examples: [
      example(
        'std::string stores text values.',
        `std::string name = "Mila";
std::cout << name << std::endl;`
      ),
      example(
        'The + operator concatenates strings.',
        `std::string full = "Hello, " + std::string("C++");
std::cout << full << std::endl;`
      ),
      example(
        'size() tells you how many characters are in the string.',
        `std::string word = "code";
std::cout << word.size() << std::endl;`
      ),
      example(
        'std::getline reads a full line including spaces.',
        `std::string line;
std::getline(std::cin, line);`
      ),
    ],
    practice: {
      task: 'Read a full line of text into a std::string and print Hello, <name>.',
      code: `#include <iostream>
#include <string>

int main() {
    std::string name;
    std::getline(std::cin, name);
    std::cout << "Hello, " << name << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <string>', 'std::getline', 'std::string name', '"Hello, "'],
      expectedOutput: ['Hello, Ada Lovelace'],
      requirements: ['Use getline so spaces are preserved.', 'Print the greeting in one output statement.'],
      coachNote: 'If the input can contain spaces, std::getline is safer than std::cin >> name.',
    },
    predict: {
      code: `std::string word = "cat";
std::cout << word[1] << std::endl;`,
      options: ['c', 'a', 't', '2'],
      correctAnswer: 1,
      explanation: 'String indexes start at 0, so word[1] is the second character: a.',
    },
    mistake: {
      prompt: 'Assume the user enters Ada Lovelace.',
      code: `std::string name;
std::cin >> name;
std::cout << name << std::endl;`,
      options: ['Ada Lovelace', 'Ada', 'Lovelace', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'std::cin >> name stops at whitespace, so only Ada is stored.',
    },
  }),
  lesson({
    id: 'cpp-arrays',
    title: 'First Containers',
    description: 'Use std::array and std::vector for indexed collections, then iterate over them safely.',
    category: 'Foundations',
    examples: [
      example(
        'std::array has a fixed size known at compile time.',
        `#include <array>

std::array<int, 3> values = {2, 4, 6};`
      ),
      example(
        'std::vector grows dynamically.',
        `#include <vector>

std::vector<int> scores = {10, 20};
scores.push_back(30);`
      ),
      example(
        'Indexing reads individual elements.',
        `std::cout << values[0] << std::endl;
std::cout << scores[2] << std::endl;`
      ),
      example(
        'A loop visits each element in sequence.',
        `for (int value : scores) {
    std::cout << value << std::endl;
}`
      ),
    ],
    practice: {
      task: 'Create a vector with the values 2, 4, and 6, then print each value in a range-for loop.',
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {2, 4, 6};

    for (int value : values) {
        std::cout << value << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['#include <vector>', 'std::vector<int>', '{2, 4, 6}', 'for (int value : values)'],
      expectedOutput: ['2', '4', '6'],
      requirements: ['Use std::vector, not a raw array.', 'Iterate with a range-for loop.'],
      coachNote: 'This lesson is about the container + iteration pairing, not about advanced algorithms yet.',
    },
    predict: {
      code: `std::vector<int> values = {5, 7, 9};
std::cout << values.size() << std::endl;`,
      options: ['2', '3', '9', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The vector holds three elements, so size() returns 3.',
    },
    mistake: {
      code: `std::vector<int> values = {1, 2, 3};
std::cout << values[3] << std::endl;`,
      options: ['3', '0', 'Undefined behavior / invalid access', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Valid indexes are 0, 1, and 2. values[3] goes out of bounds.',
    },
  }),
  lesson({
    id: 'cpp-getstarted',
    title: 'Project 1: Console Toolkit',
    description: 'Plan a menu-driven console tool that combines arithmetic, min / max checks, and number statistics.',
    category: 'Foundations',
    projectBrief: {
      goal: 'Build a menu-driven toolkit with a calculator, a min/max finder, and a small stats report.',
      inputs: ['Menu choice', 'Numbers for the selected tool'],
      outputs: ['Chosen calculation result', 'Min / max summary', 'Count / sum / average report'],
      skills: ['switch', 'loops', 'functions', 'vectors', 'input validation'],
    },
    examples: [
      example(
        'A simple menu starts by printing the available choices.',
        `std::cout << "1) Calculator\\n";
std::cout << "2) Min/Max\\n";
std::cout << "3) Stats\\n";`
      ),
      example(
        'switch routes the user to the selected tool.',
        `switch (choice) {
    case 1:
        runCalculator();
        break;
    case 2:
        runMinMax();
        break;
}`
      ),
      example(
        'Small helper functions keep each tool focused.',
        `double average(int sum, int count) {
    return static_cast<double>(sum) / count;
}`
      ),
      example(
        'A loop lets the toolkit handle multiple actions until the user exits.',
        `while (running) {
    showMenu();
    std::cin >> choice;
}`
      ),
    ],
    practice: {
      task: 'Write the toolkit shell: print a menu, read choice, and use switch to handle choices 1, 2, and 3.',
      code: `#include <iostream>

void showMenu() {
    std::cout << "1) Calculator\\n";
    std::cout << "2) Min/Max\\n";
    std::cout << "3) Stats\\n";
}

int main() {
    int choice;
    showMenu();
    std::cin >> choice;

    switch (choice) {
        case 1:
            std::cout << "Calculator" << std::endl;
            break;
        case 2:
            std::cout << "Min/Max" << std::endl;
            break;
        case 3:
            std::cout << "Stats" << std::endl;
            break;
        default:
            std::cout << "Invalid choice" << std::endl;
            break;
    }

    return 0;
}`,
      requiredSnippets: ['showMenu()', 'std::cin >> choice', 'switch (choice)', 'case 1:', 'default:'],
      expectedOutput: ['Calculator'],
      requirements: ['Print the menu before reading input.', 'Handle at least choices 1, 2, and 3.', 'Include a default branch.'],
      coachNote: 'The goal is the project shell. You are building the routing structure first, then the tools behind it.',
    },
    predict: {
      code: `int choice = 2;

switch (choice) {
    case 1:
        std::cout << "Calculator";
        break;
    case 2:
        std::cout << "Min/Max";
        break;
    default:
        std::cout << "Other";
}`,
      options: ['Calculator', 'Min/Max', 'Other', 'Nothing'],
      correctAnswer: 1,
      explanation: 'choice is 2, so execution enters case 2 and prints Min/Max.',
    },
    mistake: {
      code: `int choice = 1;

switch (choice) {
    case 1:
        std::cout << "Calculator";
    case 2:
        std::cout << "Min/Max";
}`,
      options: ['Calculator', 'Min/Max', 'CalculatorMin/Max', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Without break, execution falls through from case 1 into case 2.',
    },
  }),
  lesson({
    id: 'cpp-references',
    title: 'References and const',
    description: 'Use references to avoid unnecessary copies and const references to protect read-only data.',
    category: 'Program Structure',
    examples: [
      example(
        'A reference gives another name to an existing object.',
        `int value = 10;
int& alias = value;
alias++;
std::cout << value << std::endl;`
      ),
      example(
        'Pass-by-reference lets a function modify the caller value.',
        `void increment(int& n) {
    n++;
}`
      ),
      example(
        'const references avoid copying while blocking changes.',
        `void printName(const std::string& name) {
    std::cout << name << std::endl;
}`
      ),
      example(
        'Large strings or vectors are good candidates for const references.',
        `void showScores(const std::vector<int>& scores) {
    std::cout << scores.size() << std::endl;
}`
      ),
    ],
    practice: {
      task: 'Write void increment(int& value) that adds 1 to the caller value, then call it from main().',
      code: `#include <iostream>

void increment(int& value) {
    value++;
}

int main() {
    int score = 4;
    increment(score);
    std::cout << score << std::endl;
    return 0;
}`,
      requiredSnippets: ['void increment(int& value)', 'value++', 'increment(score)', 'std::cout << score'],
      expectedOutput: ['5'],
      requirements: ['Pass the parameter by reference.', 'Print the updated caller variable.'],
      coachNote: 'If the function should change the original variable, the parameter must be a reference.',
    },
    predict: {
      code: `void doubleValue(int& n) {
    n *= 2;
}

int main() {
    int x = 3;
    doubleValue(x);
    std::cout << x << std::endl;
}`,
      options: ['3', '6', '33', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'n is a reference to x, so doubling n changes x itself.',
    },
    mistake: {
      code: `void rename(const std::string& name) {
    name = "new";
}`,
      options: ['Valid code', 'Changes the caller string', 'Compiler error', 'Runtime error'],
      correctAnswer: 2,
      explanation: 'A const reference is read-only. Assigning to name is not allowed.',
    },
  }),
  lesson({
    id: 'cpp-scope',
    title: 'Scope and Lifetime',
    description: 'Track where names are visible, how objects are destroyed, and why shadowing and dangling values cause bugs.',
    category: 'Program Structure',
    examples: [
      example(
        'Local variables only exist inside their block.',
        `if (true) {
    int score = 10;
    std::cout << score << std::endl;
}`
      ),
      example(
        'Inner blocks can shadow outer names.',
        `int value = 5;
{
    int value = 2;
    std::cout << value << std::endl;
}
std::cout << value << std::endl;`
      ),
      example(
        'Global variables live for the whole program, but they increase coupling.',
        `int globalCount = 0;`
      ),
      example(
        'Objects are destroyed when their lifetime ends.',
        `{
    std::string label = "temp";
}
// label no longer exists here`
      ),
    ],
    practice: {
      task: 'Show shadowing by printing an inner value and then the outer value after the block ends.',
      code: `#include <iostream>

int main() {
    int total = 10;

    {
        int total = 3;
        std::cout << total << std::endl;
    }

    std::cout << total << std::endl;
    return 0;
}`,
      requiredSnippets: ['int total = 10', '{', 'int total = 3', 'std::cout << total'],
      expectedOutput: ['3', '10'],
      requirements: ['Use one nested block.', 'Print the inner value before the outer value.'],
      coachNote: 'This exercise is about visibility. The two variables have the same name, but not the same scope.',
    },
    predict: {
      code: `int x = 1;

{
    int x = 9;
    std::cout << x << std::endl;
}

std::cout << x << std::endl;`,
      options: ['1 then 9', '9 then 1', '9 then 9', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The inner block prints its own x first, then the outer x is still 1 afterwards.',
    },
    mistake: {
      code: `if (true) {
    int score = 7;
}

std::cout << score << std::endl;`,
      options: ['7', '0', 'Compiler error', 'Runtime error'],
      correctAnswer: 2,
      explanation: 'score only exists inside the if block, so it cannot be used afterwards.',
    },
  }),
  lesson({
    id: 'cpp-syntax',
    title: 'Headers, Namespaces, and Multi-file Programs',
    description: 'Split declarations and definitions across .h and .cpp files, use namespaces, and protect headers with include guards.',
    category: 'Program Structure',
    examples: [
      example(
        'Headers usually hold declarations, not function bodies.',
        `// math_utils.h
int add(int a, int b);`
      ),
      example(
        'Source files hold the function definitions.',
        `// math_utils.cpp
#include "math_utils.h"

int add(int a, int b) {
    return a + b;
}`
      ),
      example(
        'Namespaces prevent naming collisions.',
        `namespace toolkit {
    int add(int a, int b) {
        return a + b;
    }
}`
      ),
      example(
        'Include guards stop one header from being processed twice.',
        `#ifndef MATH_UTILS_H
#define MATH_UTILS_H

int add(int a, int b);

#endif`
      ),
    ],
    practice: {
      task: 'Write a header skeleton with an include guard, a namespace, and one function declaration.',
      code: `#ifndef TOOLKIT_H
#define TOOLKIT_H

namespace toolkit {
    int add(int a, int b);
}

#endif`,
      requiredSnippets: ['#ifndef', '#define', '#endif', 'namespace toolkit', 'int add(int a, int b);'],
      expectedOutput: [],
      requirements: ['Use an include guard.', 'Put the declaration inside a namespace.'],
      coachNote: 'A clean header exposes what other files can call without repeating the implementation.',
    },
    predict: {
      code: `namespace math {
    int add(int a, int b) {
        return a + b;
    }
}

std::cout << math::add(2, 5) << std::endl;`,
      options: ['7', '25', 'math::add', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'The namespace-qualified call works and returns 7.',
    },
    mistake: {
      code: `// math_utils.h
int add(int a, int b);

// another include of the same header with no guards`,
      options: ['Always safe', 'Can cause repeated declaration / definition problems', 'Runs faster', 'Makes namespaces unnecessary'],
      correctAnswer: 1,
      explanation: 'Include guards exist because repeated header inclusion can trigger duplicate processing issues.',
    },
  }),
  lesson({
    id: 'cpp-structures',
    title: 'Enums and Structs',
    description: 'Model simple real-world data with structs and symbolic states with enums.',
    category: 'Program Structure',
    examples: [
      example(
        'A struct groups related fields under one name.',
        `struct Book {
    std::string title;
    int pages;
};`
      ),
      example(
        'You can create struct values and access fields with dot syntax.',
        `Book cpp = {"Modern C++", 320};
std::cout << cpp.title << std::endl;`
      ),
      example(
        'enum class gives named states with strong typing.',
        `enum class Status {
    Draft,
    Published
};`
      ),
      example(
        'Structs and enums often work together in one model.',
        `struct Task {
    std::string label;
    Status status;
};`
      ),
    ],
    practice: {
      task: 'Define a struct Book with title and pages, create one object, and print both fields.',
      code: `#include <iostream>
#include <string>

struct Book {
    std::string title;
    int pages;
};

int main() {
    Book book = {"C++ Primer", 976};
    std::cout << book.title << " " << book.pages << std::endl;
    return 0;
}`,
      requiredSnippets: ['struct Book', 'std::string title', 'int pages', 'Book book', 'book.title'],
      expectedOutput: ['C++ Primer 976'],
      requirements: ['Use a struct, not separate loose variables.', 'Create one struct instance in main().'],
      coachNote: 'This is the first step toward modeling data with names that match the domain.',
    },
    predict: {
      code: `enum class Light {
    Red,
    Green
};

Light current = Light::Green;

if (current == Light::Green) {
    std::cout << "go" << std::endl;
}`,
      options: ['stop', 'go', 'Green', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The enum value matches Light::Green, so the program prints go.',
    },
    mistake: {
      code: `enum class Day {
    Monday,
    Tuesday
};

Day today = Monday;`,
      options: ['Valid code', 'Compiler error', 'today becomes 0', 'Runtime error'],
      correctAnswer: 1,
      explanation: 'enum class values must be qualified, so the correct form is Day::Monday.',
    },
  }),
  lesson({
    id: 'cpp-function-overloading',
    title: 'Functions Deeper',
    description: 'Use overloading, default arguments, and recursion more deliberately in larger programs.',
    category: 'Program Structure',
    examples: [
      example(
        'Overloading lets the same function name work with different parameter types.',
        `int maxValue(int a, int b) {
    return a > b ? a : b;
}

double maxValue(double a, double b) {
    return a > b ? a : b;
}`
      ),
      example(
        'Default arguments reduce repetitive calls.',
        `int power(int base, int exp = 2) {
    int result = 1;
    for (int i = 0; i < exp; i++) {
        result *= base;
    }
    return result;
}`
      ),
      example(
        'Recursion solves a smaller version of the same problem.',
        `int countdown(int n) {
    if (n == 0) return 0;
    std::cout << n << std::endl;
    return countdown(n - 1);
}`
      ),
      example(
        'A recursion base case stops the chain.',
        `int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
}`
      ),
    ],
    practice: {
      task: 'Write two overloaded maxValue functions: one for int and one for double.',
      code: `#include <iostream>

int maxValue(int a, int b) {
    return a > b ? a : b;
}

double maxValue(double a, double b) {
    return a > b ? a : b;
}

int main() {
    std::cout << maxValue(3, 7) << std::endl;
    std::cout << maxValue(2.5, 1.5) << std::endl;
    return 0;
}`,
      requiredSnippets: ['int maxValue(int a, int b)', 'double maxValue(double a, double b)', 'return a > b ? a : b', 'maxValue(3, 7)'],
      expectedOutput: ['7', '2.5'],
      requirements: ['Use the same function name twice with different parameter types.', 'Return the larger value in both overloads.'],
      coachNote: 'Overloading is about the function signature. The body can stay almost identical when the behavior is the same.',
    },
    predict: {
      code: `int power(int base, int exp = 2) {
    int result = 1;
    for (int i = 0; i < exp; i++) {
        result *= base;
    }
    return result;
}

std::cout << power(3) << std::endl;`,
      options: ['3', '6', '9', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'exp defaults to 2, so power(3) computes 3 squared, which is 9.',
    },
    mistake: {
      code: `int fact(int n) {
    return n * fact(n - 1);
}`,
      options: ['Works for all n', 'Stops at 1 automatically', 'Missing base case causes infinite recursion', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Without a base case, the recursive calls never stop.',
    },
  }),
  lesson({
    id: 'cpp-vectors',
    title: 'Collection Problem-Solving Patterns',
    description: 'Search, count, accumulate, filter, and use nested loops with vectors to solve small data problems.',
    category: 'Program Structure',
    examples: [
      example(
        'Searching walks the collection until a target is found.',
        `for (int value : values) {
    if (value == target) {
        found = true;
    }
}`
      ),
      example(
        'Counting is just accumulation with a condition.',
        `int evenCount = 0;
for (int value : values) {
    if (value % 2 == 0) {
        evenCount++;
    }
}`
      ),
      example(
        'Filtering builds a second collection with only matching values.',
        `std::vector<int> positives;
for (int value : values) {
    if (value > 0) positives.push_back(value);
}`
      ),
      example(
        'Nested loops compare pairs or build combinations.',
        `for (size_t i = 0; i < values.size(); i++) {
    for (size_t j = i + 1; j < values.size(); j++) {
        std::cout << values[i] << "," << values[j] << std::endl;
    }
}`
      ),
    ],
    practice: {
      task: 'Store five integers in a vector and count how many are even.',
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {1, 2, 3, 4, 6};
    int evenCount = 0;

    for (int value : values) {
        if (value % 2 == 0) {
            evenCount++;
        }
    }

    std::cout << evenCount << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::vector<int>', 'int evenCount = 0', 'value % 2 == 0', 'evenCount++'],
      expectedOutput: ['3'],
      requirements: ['Use one loop.', 'Update a running counter when the condition matches.'],
      coachNote: 'Most collection problems become easier when you name the pattern: search, count, accumulate, or filter.',
    },
    predict: {
      code: `std::vector<int> values = {3, -1, 4};
int count = 0;

for (int value : values) {
    if (value > 0) {
        count++;
    }
}

std::cout << count << std::endl;`,
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'Only 3 and 4 are greater than 0, so count becomes 2.',
    },
    mistake: {
      code: `for (int i = 0; i < values.size(); i++) {
    if (values = target) {
        count++;
    }
}`,
      options: ['Counts matches correctly', 'Compiler error', 'Always counts all values', 'Skips the loop'],
      correctAnswer: 1,
      explanation: 'values is the whole vector, not one element, so the condition is invalid. The code should compare values[i] to target.',
    },
  }),
  lesson({
    id: 'cpp-classes-objects',
    title: 'Classes and Objects',
    description: 'Define simple classes with fields and methods, then create object instances that carry state.',
    category: 'Program Structure',
    examples: [
      example(
        'A class groups data and behavior.',
        `class Counter {
public:
    int value = 0;

    void increment() {
        value++;
    }
};`
      ),
      example(
        'Objects are instances of the class.',
        `Counter clicks;
clicks.increment();`
      ),
      example(
        'Methods can read and write object state.',
        `std::cout << clicks.value << std::endl;`
      ),
      example(
        'Each object gets its own copy of the fields.',
        `Counter a;
Counter b;
a.increment();`
      ),
    ],
    practice: {
      task: 'Create a Counter class with a value field, an increment() method, and one object in main().',
      code: `#include <iostream>

class Counter {
public:
    int value = 0;

    void increment() {
        value++;
    }
};

int main() {
    Counter counter;
    counter.increment();
    counter.increment();
    std::cout << counter.value << std::endl;
    return 0;
}`,
      requiredSnippets: ['class Counter', 'public:', 'int value', 'void increment()', 'counter.increment()'],
      expectedOutput: ['2'],
      requirements: ['Define both state and behavior in the class.', 'Create one object and call the method twice.'],
      coachNote: 'Classes become useful when the state and the operations on that state live together.',
    },
    predict: {
      code: `class Counter {
public:
    int value = 0;
    void increment() { value++; }
};

Counter c;
c.increment();
std::cout << c.value << std::endl;`,
      options: ['0', '1', '2', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The increment() call increases value from 0 to 1.',
    },
    mistake: {
      code: `class Counter {
    int value = 0;
    void increment() { value++; }
};

int main() {
    Counter c;
    c.increment();
}`,
      options: ['Valid code', 'Compiler error because members are private by default', 'Runtime error', 'Prints 1'],
      correctAnswer: 1,
      explanation: 'class members are private by default, so increment() cannot be called from main() without a public section.',
    },
  }),
  lesson({
    id: 'cpp-constructors',
    title: 'Constructors and Encapsulation',
    description: 'Use constructors and access control to create valid objects and protect their invariants.',
    category: 'Program Structure',
    examples: [
      example(
        'A constructor sets object state when the object is created.',
        `class User {
public:
    User(std::string name) : name(name) {}

private:
    std::string name;
};`
      ),
      example(
        'Member initialization lists are the standard way to initialize fields.',
        `User(std::string name, int level) : name(name), level(level) {}`
      ),
      example(
        'private hides implementation details from outside callers.',
        `private:
    double balance;`
      ),
      example(
        'Public methods expose a safer interface than raw field access.',
        `double getBalance() const {
    return balance;
}`
      ),
    ],
    practice: {
      task: 'Create a BankAccount class with a constructor that sets the initial balance and a getter that returns it.',
      code: `#include <iostream>

class BankAccount {
public:
    explicit BankAccount(double balance) : balance(balance) {}

    double getBalance() const {
        return balance;
    }

private:
    double balance;
};

int main() {
    BankAccount account(125.5);
    std::cout << account.getBalance() << std::endl;
    return 0;
}`,
      requiredSnippets: ['class BankAccount', 'BankAccount(double balance)', 'private:', 'double getBalance() const', 'balance(balance)'],
      expectedOutput: ['125.5'],
      requirements: ['Keep the field private.', 'Initialize the field in the constructor.'],
      coachNote: 'Encapsulation means callers use methods, not direct field access.',
    },
    predict: {
      code: `class Level {
public:
    Level(int score) : score(score) {}

    int getScore() const { return score; }

private:
    int score;
};

Level level(7);
std::cout << level.getScore() << std::endl;`,
      options: ['0', '7', 'score', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The constructor stores 7 in the field, so getScore() returns 7.',
    },
    mistake: {
      code: `class BankAccount {
private:
    double balance;
};

int main() {
    BankAccount account;
    std::cout << account.balance << std::endl;
}`,
      options: ['Prints 0', 'Prints balance', 'Compiler error', 'Runtime error'],
      correctAnswer: 2,
      explanation: 'balance is private, so code outside the class cannot access it directly.',
    },
  }),
  lesson({
    id: 'cpp-access-specifiers',
    title: 'Const-correct Classes',
    description: 'Mark read-only methods with const so objects can be used safely through const references and const instances.',
    category: 'Program Structure',
    examples: [
      example(
        'A const member function promises not to change object state.',
        `int getPages() const {
    return pages;
}`
      ),
      example(
        'const objects can only call const methods.',
        `const Book book("C++", 300);
std::cout << book.getPages() << std::endl;`
      ),
      example(
        'Getters are usually const because they only read state.',
        `std::string getName() const {
    return name;
}`
      ),
      example(
        'Non-const methods are for state changes.',
        `void rename(const std::string& next) {
    name = next;
}`
      ),
    ],
    practice: {
      task: 'Create a Book class with a private pages field and a const getter named getPages().',
      code: `#include <iostream>

class Book {
public:
    explicit Book(int pages) : pages(pages) {}

    int getPages() const {
        return pages;
    }

private:
    int pages;
};

int main() {
    const Book book(280);
    std::cout << book.getPages() << std::endl;
    return 0;
}`,
      requiredSnippets: ['class Book', 'int getPages() const', 'private:', 'const Book book', 'return pages'],
      expectedOutput: ['280'],
      requirements: ['The getter must be const.', 'Create a const object in main().'],
      coachNote: 'If callers only need to read state, const-correct code makes that intent explicit and enforceable.',
    },
    predict: {
      code: `class Book {
public:
    explicit Book(int pages) : pages(pages) {}
    int getPages() const { return pages; }
private:
    int pages;
};

const Book book(200);
std::cout << book.getPages() << std::endl;`,
      options: ['0', '200', 'pages', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The getter is const, so calling it on a const Book is valid and returns 200.',
    },
    mistake: {
      code: `class Book {
public:
    int getPages() { return pages; }
private:
    int pages = 120;
};

const Book book;
std::cout << book.getPages() << std::endl;`,
      options: ['120', '0', 'Compiler error', 'Runtime error'],
      correctAnswer: 2,
      explanation: 'book is const, but getPages() is not marked const, so the call is not allowed.',
    },
  }),
  lesson({
    id: 'cpp-output',
    title: 'Project 2: Gradebook or Inventory Manager',
    description: 'Design a multi-file, class-based console app that can add, edit, remove, and search records safely.',
    category: 'Program Structure',
    projectBrief: {
      goal: 'Build a gradebook or inventory manager that stores records in a class and supports add, edit, remove, and search.',
      inputs: ['Menu choice', 'Record details to add or edit', 'Search query'],
      outputs: ['Record list', 'Search result', 'Confirmation messages'],
      skills: ['multi-file structure', 'classes', 'vectors', 'search', 'encapsulation'],
    },
    examples: [
      example(
        'A manager class owns the collection of records.',
        `class Gradebook {
private:
    std::vector<int> scores;
};`
      ),
      example(
        'Methods expose one task at a time.',
        `void addScore(int score) {
    scores.push_back(score);
}`
      ),
      example(
        'Search often returns an index or a matching object.',
        `int findIndex(int target) const {
    for (size_t i = 0; i < scores.size(); i++) {
        if (scores[i] == target) return static_cast<int>(i);
    }
    return -1;
}`
      ),
      example(
        'Multi-file projects separate the class interface from the implementation.',
        `// Gradebook.h
class Gradebook;

// Gradebook.cpp
// method definitions live here`
      ),
    ],
    practice: {
      task: 'Write a Gradebook skeleton with a private vector, an addScore() method, and a findIndex() search method.',
      code: `#include <iostream>
#include <vector>

class Gradebook {
public:
    void addScore(int score) {
        scores.push_back(score);
    }

    int findIndex(int target) const {
        for (size_t i = 0; i < scores.size(); i++) {
            if (scores[i] == target) return static_cast<int>(i);
        }
        return -1;
    }

private:
    std::vector<int> scores;
};`,
      requiredSnippets: ['class Gradebook', 'private:', 'std::vector<int> scores', 'void addScore(int score)', 'int findIndex(int target) const'],
      expectedOutput: [],
      requirements: ['Keep the collection private.', 'Provide one add method and one search method.'],
      coachNote: 'This is the project skeleton. First model the data and operations cleanly, then build the menu around it.',
    },
    predict: {
      code: `std::vector<int> scores = {70, 85, 90};
std::cout << scores.size() << std::endl;`,
      options: ['2', '3', '85', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The collection has three stored scores, so size() returns 3.',
    },
    mistake: {
      code: `void addScore(std::vector<int> scores, int score) {
    scores.push_back(score);
}`,
      options: ['Updates the original vector', 'Only updates a copy', 'Compiler error', 'Requires recursion'],
      correctAnswer: 1,
      explanation: 'scores is passed by value, so push_back changes only the local copy. This is a classic project bug.',
    },
  }),
  lesson({
    id: 'cpp-pointers',
    title: 'Pointers and Addresses',
    description: 'Understand addresses, dereferencing, null pointers, and when references are a better fit than raw pointers.',
    category: 'Object Design',
    examples: [
      example(
        'The address-of operator gives the memory address of a variable.',
        `int value = 10;
int* ptr = &value;`
      ),
      example(
        'Dereferencing reads or writes the pointed-to value.',
        `*ptr = 12;
std::cout << value << std::endl;`
      ),
      example(
        'nullptr represents a pointer that points to nothing.',
        `int* ptr = nullptr;`
      ),
      example(
        'References are usually simpler when null is not a valid state.',
        `void increment(int& value) {
    value++;
}`
      ),
    ],
    practice: {
      task: 'Create an int, store its address in a pointer, change the value through the pointer, and print the result.',
      code: `#include <iostream>

int main() {
    int value = 5;
    int* ptr = &value;
    *ptr = 9;
    std::cout << value << std::endl;
    return 0;
}`,
      requiredSnippets: ['int* ptr = &value', '*ptr = 9', 'std::cout << value'],
      expectedOutput: ['9'],
      requirements: ['Store the address with &.', 'Change the value through *ptr.'],
      coachNote: 'A pointer stores an address. Dereferencing is what reaches the object at that address.',
    },
    predict: {
      code: `int number = 4;
int* ptr = &number;
*ptr = *ptr + 3;
std::cout << number << std::endl;`,
      options: ['4', '7', '43', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'ptr points to number, so updating *ptr also updates number.',
    },
    mistake: {
      code: `int* ptr = nullptr;
std::cout << *ptr << std::endl;`,
      options: ['0', 'nullptr', 'Undefined behavior / crash', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Dereferencing nullptr is invalid and can crash the program.',
    },
  }),
  lesson({
    id: 'cpp-memory-management',
    title: 'Dynamic Memory and Stack vs Heap',
    description: 'Compare automatic stack storage to heap allocation and see why manual new/delete is risky.',
    category: 'Object Design',
    examples: [
      example(
        'Local variables usually live on the stack and clean up automatically.',
        `int total = 5;`
      ),
      example(
        'new creates an object on the heap and returns a pointer.',
        `int* ptr = new int(42);`
      ),
      example(
        'delete releases heap memory that was allocated with new.',
        `delete ptr;
ptr = nullptr;`
      ),
      example(
        'Manual memory management is error-prone because every allocation needs a matching cleanup.',
        `int* values = new int[5];
delete[] values;`
      ),
    ],
    practice: {
      task: 'Allocate one int on the heap, assign 42 through the pointer, print it, then delete it.',
      code: `#include <iostream>

int main() {
    int* ptr = new int;
    *ptr = 42;
    std::cout << *ptr << std::endl;
    delete ptr;
    ptr = nullptr;
    return 0;
}`,
      requiredSnippets: ['new int', '*ptr = 42', 'std::cout << *ptr', 'delete ptr'],
      expectedOutput: ['42'],
      requirements: ['Allocate with new.', 'Release the memory with delete.'],
      coachNote: 'The lesson is not that new/delete are fun. It is that manual ownership creates cleanup obligations.',
    },
    predict: {
      code: `int* ptr = new int(7);
std::cout << *ptr << std::endl;
delete ptr;`,
      options: ['7', '0', 'Address', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'The pointer points to a heap int initialized to 7, so dereferencing prints 7.',
    },
    mistake: {
      code: `int* ptr = new int(5);`,
      options: ['Safe forever', 'Creates a memory leak if never deleted', 'Deletes automatically at end of line', 'Requires reference syntax'],
      correctAnswer: 1,
      explanation: 'Heap allocations stay alive until you delete them or transfer ownership to a safer wrapper.',
    },
  }),
  lesson({
    id: 'cpp-class-methods',
    title: 'Destructors and RAII',
    description: 'Tie resource cleanup to object lifetime so cleanup happens automatically when objects leave scope.',
    category: 'Object Design',
    examples: [
      example(
        'A destructor runs automatically when an object is destroyed.',
        `class Logger {
public:
    ~Logger() {
        std::cout << "closing" << std::endl;
    }
};`
      ),
      example(
        'RAII means resource ownership lives inside an object.',
        `std::ifstream file("data.txt");`
      ),
      example(
        'Scope exit triggers cleanup without extra delete calls.',
        `{
    Logger log;
}
// destructor already ran here`
      ),
      example(
        'Cleanup by design is safer than cleanup by remembering.',
        `std::vector<int> values = {1, 2, 3};`
      ),
    ],
    practice: {
      task: 'Write a ScopeNote class with a destructor that prints Leaving scope.',
      code: `#include <iostream>

class ScopeNote {
public:
    ~ScopeNote() {
        std::cout << "Leaving scope" << std::endl;
    }
};

int main() {
    ScopeNote note;
    return 0;
}`,
      requiredSnippets: ['class ScopeNote', '~ScopeNote()', '"Leaving scope"', 'ScopeNote note'],
      expectedOutput: ['Leaving scope'],
      requirements: ['Use a destructor.', 'Create one object in main().'],
      coachNote: 'RAII is about automatic cleanup when the owning object goes away.',
    },
    predict: {
      code: `class ScopeNote {
public:
    ~ScopeNote() {
        std::cout << "done" << std::endl;
    }
};

int main() {
    ScopeNote note;
}`,
      options: ['Nothing', 'done', 'ScopeNote', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The destructor runs when note leaves scope at the end of main().',
    },
    mistake: {
      code: `int main() {
    int value = 5;
    delete &value;
}`,
      options: ['Safe cleanup', 'Compiler warning only', 'Invalid because value is not heap-allocated', 'Required in every function'],
      correctAnswer: 2,
      explanation: 'delete is only for memory allocated with new. Stack variables clean themselves up automatically.',
    },
  }),
  lesson({
    id: 'cpp-comments',
    title: 'Smart Pointers and Ownership',
    description: 'Use unique_ptr, shared_ptr, and weak_ptr to express ownership instead of managing raw delete calls.',
    category: 'Object Design',
    examples: [
      example(
        'std::unique_ptr models single ownership.',
        `#include <memory>

auto value = std::make_unique<int>(7);`
      ),
      example(
        'Ownership can move from one unique_ptr to another.',
        `auto next = std::move(value);`
      ),
      example(
        'std::shared_ptr keeps a resource alive while multiple owners exist.',
        `auto shared = std::make_shared<std::string>("doc");`
      ),
      example(
        'std::weak_ptr observes shared ownership without extending lifetime.',
        `std::weak_ptr<std::string> observer = shared;`
      ),
    ],
    practice: {
      task: 'Create a std::unique_ptr<int> with std::make_unique, then print the stored value.',
      code: `#include <iostream>
#include <memory>

int main() {
    std::unique_ptr<int> value = std::make_unique<int>(11);
    std::cout << *value << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <memory>', 'std::unique_ptr<int>', 'std::make_unique<int>(11)', 'std::cout << *value'],
      expectedOutput: ['11'],
      requirements: ['Use make_unique instead of raw new.', 'Dereference the smart pointer to print the value.'],
      coachNote: 'The smart pointer owns the resource and destroys it automatically when it leaves scope.',
    },
    predict: {
      code: `auto first = std::make_unique<int>(3);
auto second = std::move(first);
std::cout << *second << std::endl;`,
      options: ['0', '3', 'Address', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'Ownership moved into second, and second still points to the integer value 3.',
    },
    mistake: {
      code: `std::unique_ptr<int> a = std::make_unique<int>(5);
std::unique_ptr<int> b = a;`,
      options: ['Valid copy', 'Compiler error', 'Both own the value safely', 'Only b is valid'],
      correctAnswer: 1,
      explanation: 'unique_ptr cannot be copied because that would create two owners. You must move it instead.',
    },
  }),
  lesson({
    id: 'cpp-function-parameters',
    title: 'Copy Semantics',
    description: 'Understand copy construction, copy assignment, and why copying owning resources demands care.',
    category: 'Object Design',
    examples: [
      example(
        'Copy construction creates a new object from an existing one.',
        `std::string a = "notes";
std::string b = a;`
      ),
      example(
        'Copy assignment replaces an existing object state.',
        `std::string a = "one";
std::string b = "two";
b = a;`
      ),
      example(
        'Resource-owning classes may need custom copy behavior.',
        `class Buffer {
public:
    Buffer(const Buffer& other);
};`
      ),
      example(
        'Rule of 3/5/0 exists because ownership changes the copy story.',
        `// custom copy, custom assignment, custom destructor`
      ),
    ],
    practice: {
      task: 'Write a Score class with a copy constructor that copies the value field.',
      code: `#include <iostream>

class Score {
public:
    explicit Score(int value) : value(value) {}
    Score(const Score& other) : value(other.value) {}

    int get() const { return value; }

private:
    int value;
};

int main() {
    Score first(9);
    Score second(first);
    std::cout << second.get() << std::endl;
    return 0;
}`,
      requiredSnippets: ['class Score', 'Score(const Score& other)', 'value(other.value)', 'second(first)'],
      expectedOutput: ['9'],
      requirements: ['Implement a copy constructor.', 'Copy the stored field from the source object.'],
      coachNote: 'Copy semantics answer one question: what should a new object contain when it is created from another one?',
    },
    predict: {
      code: `std::string first = "alpha";
std::string second = first;
first = "beta";
std::cout << second << std::endl;`,
      options: ['alpha', 'beta', 'alphabetabeta', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'second gets its own copied string value, so changing first later does not affect second.',
    },
    mistake: {
      code: `class Owner {
public:
    int* ptr = new int(5);
};`,
      options: ['Safe shallow copy forever', 'Copying this class can cause double-delete problems later', 'Cannot compile', 'Uses move semantics automatically'],
      correctAnswer: 1,
      explanation: 'If a raw owning pointer is copied without a custom policy, multiple objects may think they own the same allocation.',
    },
  }),
  lesson({
    id: 'cpp-operators',
    title: 'Move Semantics',
    description: 'Use rvalue references and std::move to transfer resources instead of copying them.',
    category: 'Object Design',
    examples: [
      example(
        'std::move marks an object as movable.',
        `std::string name = "C++";
std::string next = std::move(name);`
      ),
      example(
        'A move constructor can steal expensive resources.',
        `Box(Box&& other) noexcept : label(std::move(other.label)) {}`
      ),
      example(
        'Moves matter most for large objects or unique ownership.',
        `std::vector<std::string> items;
items.push_back(std::move(name));`
      ),
      example(
        'Moved-from objects stay valid, but their previous value should not be relied on.',
        `std::string after = std::move(next);`
      ),
    ],
    practice: {
      task: 'Write a Box move constructor that moves a std::string label into the new object.',
      code: `#include <iostream>
#include <string>
#include <utility>

class Box {
public:
    explicit Box(std::string label) : label(std::move(label)) {}
    Box(Box&& other) noexcept : label(std::move(other.label)) {}

    const std::string& getLabel() const { return label; }

private:
    std::string label;
};`,
      requiredSnippets: ['Box(Box&& other)', 'noexcept', 'std::move(other.label)', 'std::string label'],
      expectedOutput: [],
      requirements: ['Implement a move constructor.', 'Move the label instead of copying it.'],
      coachNote: 'Move semantics transfer ownership or heavy state. They are not about making extra copies faster.',
    },
    predict: {
      code: `std::string first = "tool";
std::string second = std::move(first);
std::cout << second << std::endl;`,
      options: ['tool', 'first', 'Nothing', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'second receives the moved string value and prints tool.',
    },
    mistake: {
      code: `std::unique_ptr<int> a = std::make_unique<int>(5);
std::unique_ptr<int> b = a;`,
      options: ['Valid move', 'Compiler error because copy was attempted', 'Both pointers own the same value', 'a becomes nullptr automatically'],
      correctAnswer: 1,
      explanation: 'Move semantics require std::move(a). Without it, the code tries to copy a unique_ptr.',
    },
  }),
  lesson({
    id: 'cpp-friend-functions',
    title: 'Operator Overloading',
    description: 'Overload selected operators carefully so objects can behave naturally without becoming surprising.',
    category: 'Object Design',
    examples: [
      example(
        'operator+ can combine two objects into a new result.',
        `Point operator+(const Point& other) const {
    return Point{x + other.x, y + other.y};
}`
      ),
      example(
        'operator== compares object state for equality.',
        `bool operator==(const Point& other) const {
    return x == other.x && y == other.y;
}`
      ),
      example(
        'Stream insertion makes custom objects printable.',
        `friend std::ostream& operator<<(std::ostream& out, const Point& p) {
    return out << "(" << p.x << ", " << p.y << ")";
}`
      ),
      example(
        'Overload only when the meaning is obvious to the caller.',
        `// + for point addition is obvious
// + for random business meaning is not`
      ),
    ],
    practice: {
      task: 'Implement operator== for a Point class so two points compare equal when both coordinates match.',
      code: `#include <iostream>

class Point {
public:
    Point(int x, int y) : x(x), y(y) {}

    bool operator==(const Point& other) const {
        return x == other.x && y == other.y;
    }

private:
    int x;
    int y;
};`,
      requiredSnippets: ['class Point', 'bool operator==(const Point& other) const', 'x == other.x', 'y == other.y'],
      expectedOutput: [],
      requirements: ['Use operator== as a member function.', 'Compare both fields.'],
      coachNote: 'Operator overloading should make common comparisons feel natural, not magical.',
    },
    predict: {
      code: `Point a(1, 2);
Point b(1, 2);
std::cout << (a == b) << std::endl;`,
      options: ['0', '1', '(1,2)', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The overloaded operator compares both coordinates, so equal points produce true, printed as 1.',
    },
    mistake: {
      code: `bool operator+(const Point& other) const {
    return x + other.x;
}`,
      options: ['Good overload design', 'Suspicious because + should usually return a new point-like value', 'Required by the language', 'A friend function automatically fixes it'],
      correctAnswer: 1,
      explanation: 'Overloaded operators should preserve intuitive meaning. Returning bool from operator+ is surprising API design.',
    },
  }),
  lesson({
    id: 'cpp-lambda',
    title: 'Object Relationships',
    description: 'Model composition, aggregation, association, and dependency so classes express real ownership and coupling clearly.',
    category: 'Object Design',
    examples: [
      example(
        'Composition means one object owns another as a direct part.',
        `class Engine {};

class Car {
private:
    Engine engine;
};`
      ),
      example(
        'Aggregation refers to another object without owning its lifetime.',
        `class Team {
private:
    std::vector<Player*> players;
};`
      ),
      example(
        'Association links objects that know about each other.',
        `class Doctor {
public:
    void assign(Patient& patient);
};`
      ),
      example(
        'A dependency is often just a parameter used for one operation.',
        `void save(const Report& report, Logger& logger);`
      ),
    ],
    practice: {
      task: 'Model composition by creating a Car class that owns one Engine field directly.',
      code: `#include <iostream>

class Engine {
public:
    int horsepower = 150;
};

class Car {
public:
    void showPower() const {
        std::cout << engine.horsepower << std::endl;
    }

private:
    Engine engine;
};`,
      requiredSnippets: ['class Engine', 'class Car', 'Engine engine;', 'showPower() const'],
      expectedOutput: [],
      requirements: ['Store Engine directly inside Car.', 'Expose one method that uses the composed object.'],
      coachNote: 'Composition is the default choice when one object should truly own another part of its state.',
    },
    predict: {
      code: `class Engine {
public:
    int horsepower = 200;
};

class Car {
public:
    Engine engine;
};

Car car;
std::cout << car.engine.horsepower << std::endl;`,
      options: ['0', '200', 'Engine', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The Car object contains an Engine object with horsepower initialized to 200.',
    },
    mistake: {
      code: `class Car {
public:
    Engine* engine;
};`,
      options: ['Always composition', 'This does not express ownership clearly by itself', 'Better than every direct member', 'A weak pointer automatically appears'],
      correctAnswer: 1,
      explanation: 'A raw pointer field does not tell you who owns the Engine or who deletes it. The relationship is ambiguous.',
    },
  }),
  lesson({
    id: 'cpp-inheritance',
    title: 'Inheritance and Polymorphism',
    description: 'Build base and derived types with virtual functions and abstract interfaces.',
    category: 'Object Design',
    examples: [
      example(
        'A derived class extends a base class interface.',
        `class Animal {
public:
    virtual void speak() const = 0;
};`
      ),
      example(
        'override makes virtual behavior explicit.',
        `class Dog : public Animal {
public:
    void speak() const override {
        std::cout << "woof" << std::endl;
    }
};`
      ),
      example(
        'A base pointer can call the derived override through dynamic dispatch.',
        `Animal* pet = new Dog();
pet->speak();`
      ),
      example(
        'Abstract classes define contracts, not complete objects.',
        `virtual double area() const = 0;`
      ),
    ],
    practice: {
      task: 'Create an abstract Shape base class with virtual area() and a Rectangle derived class that overrides it.',
      code: `#include <iostream>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Rectangle : public Shape {
public:
    Rectangle(double width, double height) : width(width), height(height) {}

    double area() const override {
        return width * height;
    }

private:
    double width;
    double height;
};`,
      requiredSnippets: ['class Shape', 'virtual double area() const = 0', 'class Rectangle : public Shape', 'double area() const override'],
      expectedOutput: [],
      requirements: ['Make the base abstract.', 'Override the virtual function in the derived class.'],
      coachNote: 'Polymorphism matters when callers want one interface and many concrete implementations.',
    },
    predict: {
      code: `class Animal {
public:
    virtual void speak() const {
        std::cout << "base" << std::endl;
    }
};

class Dog : public Animal {
public:
    void speak() const override {
        std::cout << "woof" << std::endl;
    }
};

Animal* pet = new Dog();
pet->speak();`,
      options: ['base', 'woof', 'Dog', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'speak() is virtual, so the Dog override runs through the base pointer.',
    },
    mistake: {
      code: `class Base {
public:
    void show() const {
        std::cout << "base" << std::endl;
    }
};

class Derived : public Base {
public:
    void show() const {
        std::cout << "derived" << std::endl;
    }
};

Base* ptr = new Derived();
ptr->show();`,
      options: ['derived', 'base', 'Compiler error', 'Both lines'],
      correctAnswer: 1,
      explanation: 'Without virtual, the call is resolved through the static base type, so Base::show runs.',
    },
  }),
  lesson({
    id: 'cpp-polymorphism',
    title: 'Project 3: Text RPG or Shape System',
    description: 'Design a larger class hierarchy that uses polymorphism, RAII, and smart pointers cleanly.',
    category: 'Object Design',
    projectBrief: {
      goal: 'Build a text RPG or shape system where polymorphic objects live in one collection and clean up automatically.',
      inputs: ['Entity or shape configuration', 'Commands or dimensions'],
      outputs: ['Turn log or drawing summary', 'Computed stats such as area or health'],
      skills: ['inheritance', 'virtual functions', 'unique_ptr', 'RAII', 'collection design'],
    },
    examples: [
      example(
        'A polymorphic collection often stores unique_ptr<Base>.',
        `std::vector<std::unique_ptr<Shape>> shapes;`
      ),
      example(
        'Derived objects are created and moved into the collection.',
        `shapes.push_back(std::make_unique<Rectangle>(3.0, 4.0));`
      ),
      example(
        'The base interface defines the shared behavior.',
        `for (const auto& shape : shapes) {
    std::cout << shape->area() << std::endl;
}`
      ),
      example(
        'RAII keeps object cleanup automatic when the collection is destroyed.',
        `std::vector<std::unique_ptr<Enemy>> enemies;`
      ),
    ],
    practice: {
      task: 'Write the skeleton of a polymorphic Shape system with a vector of std::unique_ptr<Shape>.',
      code: `#include <memory>
#include <vector>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Rectangle : public Shape {
public:
    Rectangle(double width, double height) : width(width), height(height) {}
    double area() const override { return width * height; }

private:
    double width;
    double height;
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Rectangle>(3.0, 4.0));
    return 0;
}`,
      requiredSnippets: ['std::vector<std::unique_ptr<Shape>>', 'virtual double area() const = 0', 'std::make_unique<Rectangle>', 'override'],
      expectedOutput: [],
      requirements: ['Store derived objects behind base-class pointers.', 'Use unique_ptr for ownership.'],
      coachNote: 'This project pattern is what turns inheritance from syntax into architecture.',
    },
    predict: {
      code: `std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Rectangle>(2.0, 5.0));
std::cout << shapes[0]->area() << std::endl;`,
      options: ['7', '10', '25', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The Rectangle area is width * height, so 2.0 * 5.0 prints 10.',
    },
    mistake: {
      code: `std::vector<Shape> shapes;
shapes.push_back(Rectangle(2.0, 5.0));`,
      options: ['Perfect polymorphism', 'Object slicing / invalid abstract storage design', 'Automatically stores Rectangle fully', 'Required by STL'],
      correctAnswer: 1,
      explanation: 'Polymorphic base types should not be stored by value here. Storing by value loses derived behavior and fails for abstract bases.',
    },
  }),
  lesson({
    id: 'cpp-exceptions',
    title: 'Exceptions and Error Handling',
    description: 'Use try, catch, and throw where exceptions improve error flow without hiding program logic.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'throw raises an exception object.',
        `throw std::runtime_error("bad input");`
      ),
      example(
        'try marks the protected block that may fail.',
        `try {
    riskyCall();
}`
      ),
      example(
        'catch handles a matching exception type.',
        `catch (const std::runtime_error& error) {
    std::cout << error.what() << std::endl;
}`
      ),
      example(
        'noexcept communicates that a function is not expected to throw.',
        `void cleanup() noexcept {
}`
      ),
    ],
    practice: {
      task: 'Throw a runtime_error when divisor is 0, then catch it and print the message.',
      code: `#include <iostream>
#include <stdexcept>

int main() {
    int divisor = 0;

    try {
        if (divisor == 0) {
            throw std::runtime_error("division by zero");
        }
        std::cout << 10 / divisor << std::endl;
    } catch (const std::runtime_error& error) {
        std::cout << error.what() << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['try', 'throw std::runtime_error', 'catch (const std::runtime_error& error)', 'error.what()'],
      expectedOutput: ['division by zero'],
      requirements: ['Throw only when the invalid state appears.', 'Catch by const reference.'],
      coachNote: 'Exceptions are for exceptional failure paths. Keep the normal path readable.',
    },
    predict: {
      code: `try {
    throw std::runtime_error("fail");
} catch (const std::runtime_error& error) {
    std::cout << error.what() << std::endl;
}`,
      options: ['fail', 'runtime_error', 'Nothing', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'The thrown runtime_error is caught, and what() returns the stored message fail.',
    },
    mistake: {
      code: `try {
    throw std::runtime_error("bad");
} catch (const std::logic_error& error) {
    std::cout << error.what() << std::endl;
}`,
      options: ['Caught successfully', 'Unhandled exception because the catch type does not match', 'Prints bad', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The thrown runtime_error is not caught by a logic_error handler.',
    },
  }),
  lesson({
    id: 'cpp-input-validation',
    title: 'Streams and Parsing',
    description: 'Parse text with stringstream and validate stream state instead of assuming every extraction succeeds.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'stringstream lets you parse text using stream extraction.',
        `#include <sstream>

std::stringstream input("10 20 30");`
      ),
      example(
        'Extraction works the same way as std::cin.',
        `int a;
input >> a;`
      ),
      example(
        'A stream enters a failed state when parsing no longer works.',
        `if (!(input >> value)) {
    std::cout << "bad token" << std::endl;
}`
      ),
      example(
        'Parsing code is easier to test when it reads from strings first.',
        `std::string line = "4,8,15";`
      ),
    ],
    practice: {
      task: 'Use std::stringstream to parse "10 20 30" and print the sum.',
      code: `#include <iostream>
#include <sstream>

int main() {
    std::stringstream input("10 20 30");
    int value;
    int total = 0;

    while (input >> value) {
        total += value;
    }

    std::cout << total << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <sstream>', 'std::stringstream input("10 20 30")', 'while (input >> value)', 'total += value'],
      expectedOutput: ['60'],
      requirements: ['Parse from a stringstream.', 'Use the stream condition in the loop.'],
      coachNote: 'Parsing is a loop over extraction plus validation. The stream state is part of the control flow.',
    },
    predict: {
      code: `std::stringstream input("7 9");
int a;
int b;
input >> a >> b;
std::cout << a + b << std::endl;`,
      options: ['16', '79', '7 9', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'Both ints are extracted successfully, then added to produce 16.',
    },
    mistake: {
      code: `std::stringstream input("ten");
int value;
input >> value;
std::cout << value << std::endl;`,
      options: ['10', '0', 'Parsing fails because the token is not an int', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'The extraction fails because "ten" cannot be parsed as an int.',
    },
  }),
  lesson({
    id: 'cpp-files',
    title: 'File I/O',
    description: 'Read from and write to files so programs can persist state between runs.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'std::ofstream writes text to a file.',
        `#include <fstream>

std::ofstream out("report.txt");
out << "done" << std::endl;`
      ),
      example(
        'std::ifstream reads text from a file.',
        `std::ifstream in("report.txt");
std::string line;
std::getline(in, line);`
      ),
      example(
        'Always check whether the file opened successfully.',
        `if (!in) {
    std::cout << "open failed" << std::endl;
}`
      ),
      example(
        'Files are how apps save state between runs.',
        `std::ofstream save("scores.txt");`
      ),
    ],
    practice: {
      task: 'Write code that opens report.txt for writing and stores one line: Ready.',
      code: `#include <fstream>

int main() {
    std::ofstream out("report.txt");
    if (!out) return 1;

    out << "Ready" << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <fstream>', 'std::ofstream out("report.txt")', 'if (!out)', 'out << "Ready"'],
      expectedOutput: [],
      requirements: ['Open the file for writing.', 'Check that the stream opened.', 'Write one line of text.'],
      coachNote: 'Persistence starts with one reliable file write. Make the open step explicit and check it.',
    },
    predict: {
      code: `std::ofstream out("log.txt");
out << "A" << std::endl;
out << "B" << std::endl;`,
      options: ['The file receives two lines', 'The file stays empty', 'Compiler error', 'Only B is written'],
      correctAnswer: 0,
      explanation: 'Each output statement writes to the file stream, so both lines are stored.',
    },
    mistake: {
      code: `std::ifstream in("missing.txt");
std::string line;
std::getline(in, line);`,
      options: ['Always reads a valid line', 'May fail because the file could not be opened', 'Creates the file automatically', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'Reading from a file stream only works when the file was opened successfully.',
    },
  }),
  lesson({
    id: 'cpp-templates',
    title: 'Function Templates',
    description: 'Write one function that works across types by letting the compiler deduce template arguments.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'A function template describes behavior generically.',
        `template <typename T>
T maxValue(T a, T b) {
    return a > b ? a : b;
}`
      ),
      example(
        'The compiler usually deduces the template argument from the call.',
        `std::cout << maxValue(2, 5) << std::endl;`
      ),
      example(
        'Templates work with custom types if the required operations exist.',
        `maxValue(std::string("a"), std::string("b"));`
      ),
      example(
        'Generic code is useful when the logic stays the same across types.',
        `template <typename T>
void printPair(T a, T b);`
      ),
    ],
    practice: {
      task: 'Write a function template clampLow(T value, T low) that returns low when value is smaller, otherwise value.',
      code: `#include <iostream>

template <typename T>
T clampLow(T value, T low) {
    return value < low ? low : value;
}

int main() {
    std::cout << clampLow(3, 5) << std::endl;
    return 0;
}`,
      requiredSnippets: ['template <typename T>', 'T clampLow(T value, T low)', 'value < low ? low : value', 'clampLow(3, 5)'],
      expectedOutput: ['5'],
      requirements: ['Use one template parameter.', 'Return the same type that comes in.'],
      coachNote: 'If the logic does not depend on a specific type, a template can remove duplication cleanly.',
    },
    predict: {
      code: `template <typename T>
T maxValue(T a, T b) {
    return a > b ? a : b;
}

std::cout << maxValue(4, 9) << std::endl;`,
      options: ['4', '9', '49', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The template is instantiated for int and returns the larger value, 9.',
    },
    mistake: {
      code: `template <typename T>
T addOne(T value) {
    return value + 1;
}

addOne(std::string("hi"));`,
      options: ['Always valid', 'Fails because string + int is not defined here', 'Returns hi1 automatically', 'Compiles only in C'],
      correctAnswer: 1,
      explanation: 'Templates still need the requested operations to make sense for the chosen type.',
    },
  }),
  lesson({
    id: 'cpp-math',
    title: 'Class Templates',
    description: 'Generalize class design with template parameters so one class can store many types safely.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'A class template accepts a type parameter just like a function template.',
        `template <typename T>
class Holder {
public:
    explicit Holder(T value) : value(value) {}
private:
    T value;
};`
      ),
      example(
        'The stored field uses the template type directly.',
        `Holder<int> score(10);`
      ),
      example(
        'Methods can return the template type too.',
        `T get() const {
    return value;
}`
      ),
      example(
        'Class templates support reuse without copy-pasting whole class definitions.',
        `Holder<std::string> label("ready");`
      ),
    ],
    practice: {
      task: 'Write a Holder<T> class template with a constructor and a get() method.',
      code: `#include <iostream>
#include <string>

template <typename T>
class Holder {
public:
    explicit Holder(T value) : value(value) {}

    T get() const {
        return value;
    }

private:
    T value;
};`,
      requiredSnippets: ['template <typename T>', 'class Holder', 'explicit Holder(T value)', 'T get() const', 'T value;'],
      expectedOutput: [],
      requirements: ['Store one value of type T.', 'Return the value from get().'],
      coachNote: 'The class body should talk in terms of T, not int or std::string, so the design stays generic.',
    },
    predict: {
      code: `Holder<int> score(12);
std::cout << score.get() << std::endl;`,
      options: ['0', '12', 'score', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The Holder<int> object stores 12, and get() returns that stored value.',
    },
    mistake: {
      code: `Holder item(5);`,
      options: ['Always valid in every context', 'Can fail in older code or APIs that still require explicit template arguments', 'Creates a vector', 'Turns Holder into int automatically'],
      correctAnswer: 1,
      explanation: 'Class template argument deduction exists in modern C++, but you should still understand and be ready to spell Holder<int> explicitly.',
    },
  }),
  lesson({
    id: 'cpp-while-loop',
    title: 'Iterators',
    description: 'Think in terms of begin/end iterator ranges so the STL can work across many container types.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'begin() returns an iterator to the first element.',
        `auto it = values.begin();`
      ),
      example(
        'end() marks one past the last element.',
        `auto finish = values.end();`
      ),
      example(
        'Iterator loops move with ++ and read with *.',
        `for (auto it = values.begin(); it != values.end(); ++it) {
    std::cout << *it << std::endl;
}`
      ),
      example(
        'Algorithms use iterators so they work with many container types.',
        `std::sort(values.begin(), values.end());`
      ),
    ],
    practice: {
      task: 'Use iterators to print every value in a vector.',
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {3, 6, 9};

    for (auto it = values.begin(); it != values.end(); ++it) {
        std::cout << *it << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['values.begin()', 'values.end()', '++it', '*it'],
      expectedOutput: ['3', '6', '9'],
      requirements: ['Use iterators directly.', 'Advance with ++it.'],
      coachNote: 'The iterator mindset matters because the standard algorithms speak this language everywhere.',
    },
    predict: {
      code: `std::vector<int> values = {8, 4};
auto it = values.begin();
++it;
std::cout << *it << std::endl;`,
      options: ['8', '4', '2', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'After ++it, the iterator points to the second element, which is 4.',
    },
    mistake: {
      code: `auto it = values.end();
std::cout << *it << std::endl;`,
      options: ['Prints last value', 'Prints 0', 'Invalid because end() is not dereferenceable', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'end() points one past the last element, so dereferencing it is invalid.',
    },
  }),
  lesson({
    id: 'cpp-break-continue',
    title: 'Algorithms Library',
    description: 'Reach for STL algorithms such as sort, find, count_if, transform, and accumulate before writing loops by hand.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'sort orders a range in place.',
        `std::sort(values.begin(), values.end());`
      ),
      example(
        'find returns an iterator to a matching element if it exists.',
        `auto it = std::find(values.begin(), values.end(), 7);`
      ),
      example(
        'count_if counts values that satisfy a predicate.',
        `int evens = std::count_if(values.begin(), values.end(), [](int n) {
    return n % 2 == 0;
});`
      ),
      example(
        'accumulate reduces a range into one summary value.',
        `int total = std::accumulate(values.begin(), values.end(), 0);`
      ),
    ],
    practice: {
      task: 'Sort a vector and print the first and last element after sorting.',
      code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {7, 2, 9, 1};
    std::sort(values.begin(), values.end());
    std::cout << values.front() << " " << values.back() << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <algorithm>', 'std::sort(values.begin(), values.end())', 'values.front()', 'values.back()'],
      expectedOutput: ['1 9'],
      requirements: ['Use std::sort.', 'Print the new first and last element after sorting.'],
      coachNote: 'Production C++ code gets cleaner when you stop rebuilding standard algorithms by hand.',
    },
    predict: {
      code: `std::vector<int> values = {3, 1, 2};
std::sort(values.begin(), values.end());
std::cout << values[0] << values[1] << values[2] << std::endl;`,
      options: ['312', '123', '321', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'sort reorders the vector in ascending order, so the printed digits are 123.',
    },
    mistake: {
      code: `std::vector<int> values = {3, 1, 2};
sort(values.begin(), values.end());`,
      options: ['Always fine', 'Compiler error if <algorithm> is not included or std:: is missing', 'Turns into bubble sort automatically', 'Only works for arrays'],
      correctAnswer: 1,
      explanation: 'STL algorithms live in the std namespace and require the right header.',
    },
  }),
  lesson({
    id: 'cpp-maps',
    title: 'Associative Containers',
    description: 'Choose between map, set, unordered_map, and unordered_set based on lookups, uniqueness, and ordering needs.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'map stores key-value pairs in sorted key order.',
        `std::map<std::string, int> scores;`
      ),
      example(
        'set stores unique keys only.',
        `std::set<int> ids = {4, 4, 7};`
      ),
      example(
        'unordered_map trades ordering for average-case hash lookups.',
        `std::unordered_map<std::string, int> counts;`
      ),
      example(
        'Associative containers are a good fit for lookups by key.',
        `counts["error"]++;`
      ),
    ],
    practice: {
      task: 'Count words with std::unordered_map<std::string, int> and increment the count for "error".',
      code: `#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::unordered_map<std::string, int> counts;
    counts["error"]++;
    counts["error"]++;
    std::cout << counts["error"] << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <unordered_map>', 'std::unordered_map<std::string, int>', 'counts["error"]++', 'std::cout << counts["error"]'],
      expectedOutput: ['2'],
      requirements: ['Use an unordered_map.', 'Update the same key more than once.'],
      coachNote: 'Associative containers are about the data access pattern. Reach for them when the key is the main handle.',
    },
    predict: {
      code: `std::set<int> ids = {2, 2, 5};
std::cout << ids.size() << std::endl;`,
      options: ['2', '3', '5', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'set keeps unique keys only, so the duplicate 2 is stored once and the size is 2.',
    },
    mistake: {
      code: `std::map<std::string, int> scores;
if (scores["ana"] > 0) {
    std::cout << "exists";
}`,
      options: ['Only checks existence', 'Also inserts ana with a default value', 'Compiler error', 'Converts map to set'],
      correctAnswer: 1,
      explanation: 'operator[] inserts a default value when the key is missing. Use find() when you only want to check existence.',
    },
  }),
  lesson({
    id: 'cpp-switch',
    title: 'Lambdas and Callable Objects',
    description: 'Use lambdas for local predicates, captures, and custom behavior passed into algorithms.',
    category: 'STL and Generic Power',
    examples: [
      example(
        'A lambda is an unnamed function object you can define inline.',
        `auto isEven = [](int n) {
    return n % 2 == 0;
};`
      ),
      example(
        'Algorithms often accept lambdas as predicates.',
        `int count = std::count_if(values.begin(), values.end(), [](int n) {
    return n > 0;
});`
      ),
      example(
        'Captures let a lambda use outside variables.',
        `int limit = 10;
auto overLimit = [limit](int n) {
    return n > limit;
};`
      ),
      example(
        'Lambdas are useful for custom sorting logic.',
        `std::sort(values.begin(), values.end(), [](int a, int b) {
    return a > b;
});`
      ),
    ],
    practice: {
      task: 'Sort a vector in descending order with a lambda comparator.',
      code: `#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> values = {2, 9, 4, 1};
    std::sort(values.begin(), values.end(), [](int a, int b) {
        return a > b;
    });
    std::cout << values[0] << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::sort', '[](int a, int b)', 'return a > b', 'values[0]'],
      expectedOutput: ['9'],
      requirements: ['Use a lambda as the comparator.', 'Sort in descending order, not ascending.'],
      coachNote: 'Lambdas let you keep one small piece of behavior next to the algorithm that uses it.',
    },
    predict: {
      code: `int limit = 5;
auto bigger = [limit](int n) {
    return n > limit;
};

std::cout << bigger(8) << std::endl;`,
      options: ['0', '1', '8', 'Compiler error'],
      correctAnswer: 1,
      explanation: '8 is greater than the captured limit 5, so the lambda returns true, printed as 1.',
    },
    mistake: {
      code: `int limit = 5;
auto bigger = [](int n) {
    return n > limit;
};`,
      options: ['Valid lambda', 'Compiler error because limit was not captured', 'Returns false', 'Automatically captures by reference'],
      correctAnswer: 1,
      explanation: 'A lambda can only use outside variables when they are explicitly captured or made available another way.',
    },
  }),
  lesson({
    id: 'cpp-list',
    title: 'Project 4: CSV / Log Analyzer',
    description: 'Read files, parse records, store summaries in containers, and produce reports with algorithms and lambdas.',
    category: 'STL and Generic Power',
    projectBrief: {
      goal: 'Build a CSV or log analyzer that loads a file, parses records, groups by key, and prints a report.',
      inputs: ['CSV rows or log lines', 'Optional filters'],
      outputs: ['Counts by key', 'Sorted report', 'Top entries summary'],
      skills: ['file I/O', 'stringstream', 'unordered_map', 'algorithms', 'lambdas'],
    },
    examples: [
      example(
        'Log analyzers often start by reading one line at a time.',
        `std::ifstream in("app.log");
std::string line;
while (std::getline(in, line)) {
    // parse line
}`
      ),
      example(
        'stringstream can split structured text into pieces.',
        `std::stringstream row("42,ok");
std::string id;
std::string status;
std::getline(row, id, ',');
std::getline(row, status, ',');`
      ),
      example(
        'unordered_map is a natural fit for counting categories.',
        `counts[status]++;`
      ),
      example(
        'Algorithms and lambdas help sort the final report.',
        `std::sort(items.begin(), items.end(), [](const auto& a, const auto& b) {
    return a.second > b.second;
});`
      ),
    ],
    practice: {
      task: 'Write the core counting pattern: read lines, parse a status token, and increment an unordered_map counter.',
      code: `#include <fstream>
#include <sstream>
#include <string>
#include <unordered_map>

int main() {
    std::ifstream in("app.log");
    std::string line;
    std::unordered_map<std::string, int> counts;

    while (std::getline(in, line)) {
        std::stringstream row(line);
        std::string status;
        std::getline(row, status, ',');
        counts[status]++;
    }

    return 0;
}`,
      requiredSnippets: ['std::ifstream', 'while (std::getline(in, line))', 'std::stringstream row(line)', 'counts[status]++'],
      expectedOutput: [],
      requirements: ['Read each line from the file.', 'Parse at least one field from the line.', 'Update an associative counter.'],
      coachNote: 'This project is mostly pattern composition: read, parse, store, summarize.',
    },
    predict: {
      code: `std::unordered_map<std::string, int> counts;
counts["ok"]++;
counts["ok"]++;
std::cout << counts["ok"] << std::endl;`,
      options: ['1', '2', 'ok', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'The same key is incremented twice, so its final count is 2.',
    },
    mistake: {
      code: `std::getline(row, status, ';');`,
      options: ['Works for comma-separated input', 'Parses the wrong delimiter for CSV input', 'Sorts rows automatically', 'Creates an unordered_set'],
      correctAnswer: 1,
      explanation: 'CSV usually uses commas. The wrong delimiter means the parser will not split the row as intended.',
    },
  }),
  lesson({
    id: 'cpp-date',
    title: 'Ranges and Views (C++20)',
    description: 'Use C++20 ranges and lazy views to build readable data pipelines without manual loop noise.',
    category: 'Modern C++',
    examples: [
      example(
        'views::filter creates a lazy filtered view.',
        `#include <ranges>

auto evens = values | std::views::filter([](int n) {
    return n % 2 == 0;
});`
      ),
      example(
        'views::transform maps each element into a new value.',
        `auto squares = values | std::views::transform([](int n) {
    return n * n;
});`
      ),
      example(
        'Pipelines compose multiple steps clearly.',
        `auto result = values
    | std::views::filter([](int n) { return n > 0; })
    | std::views::transform([](int n) { return n * 2; });`
      ),
      example(
        'Views are lazy, so work happens when you iterate them.',
        `for (int n : result) {
    std::cout << n << std::endl;
}`
      ),
    ],
    practice: {
      task: 'Build a view that keeps even numbers and then squares them.',
      code: `#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> values = {1, 2, 3, 4};
    auto result = values
        | std::views::filter([](int n) { return n % 2 == 0; })
        | std::views::transform([](int n) { return n * n; });

    for (int n : result) {
        std::cout << n << std::endl;
    }

    return 0;
}`,
      requiredSnippets: ['#include <ranges>', 'std::views::filter', 'std::views::transform', 'for (int n : result)'],
      expectedOutput: ['4', '16'],
      requirements: ['Use both filter and transform.', 'Iterate the resulting view to produce output.'],
      coachNote: 'Ranges shine when you can read the pipeline from left to right as a data transformation.',
    },
    predict: {
      code: `std::vector<int> values = {1, 2, 3};
auto result = values | std::views::transform([](int n) { return n + 1; });

for (int n : result) {
    std::cout << n << " ";
}`,
      options: ['1 2 3', '2 3 4', '2 4 6', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'Each element is transformed by adding 1, so the output is 2 3 4.',
    },
    mistake: {
      code: `auto result = values | std::views::filter([](int n) { return n > 0; });`,
      options: ['Copies all positive values immediately', 'Creates a lazy view that still depends on the source range', 'Turns values into a map', 'Requires raw pointers'],
      correctAnswer: 1,
      explanation: 'Views are lazy adapters over the original range rather than eager copied containers by default.',
    },
  }),
  lesson({
    id: 'cpp-data-types',
    title: 'Modern Utility Types',
    description: 'Use pair, tuple, optional, variant, and structured bindings to model richer results without custom boilerplate.',
    category: 'Modern C++',
    examples: [
      example(
        'pair stores two related values.',
        `std::pair<std::string, int> user = {"Ana", 3};`
      ),
      example(
        'tuple stores a fixed set of heterogeneous values.',
        `std::tuple<int, std::string, bool> row = {7, "ok", true};`
      ),
      example(
        'optional represents a value that might be missing.',
        `std::optional<int> result = 42;`
      ),
      example(
        'Structured bindings unpack pair or tuple values cleanly.',
        `auto [name, level] = user;`
      ),
    ],
    practice: {
      task: 'Write a function that returns std::optional<int> and returns 5 when input is valid.',
      code: `#include <iostream>
#include <optional>

std::optional<int> parsePositive(int value) {
    if (value > 0) {
        return value;
    }
    return std::nullopt;
}

int main() {
    std::optional<int> result = parsePositive(5);
    if (result) {
        std::cout << *result << std::endl;
    }
    return 0;
}`,
      requiredSnippets: ['#include <optional>', 'std::optional<int>', 'return std::nullopt', 'if (result)'],
      expectedOutput: ['5'],
      requirements: ['Use std::optional<int> as the return type.', 'Check whether the optional contains a value before printing.'],
      coachNote: 'optional is a direct replacement for many sentinel-value patterns.',
    },
    predict: {
      code: `std::pair<std::string, int> user = {"Ada", 2};
auto [name, level] = user;
std::cout << name << " " << level << std::endl;`,
      options: ['Ada 2', 'user 2', 'Ada level', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'Structured bindings unpack the pair into name and level.',
    },
    mistake: {
      code: `std::optional<int> value;
std::cout << value.value() << std::endl;`,
      options: ['Prints 0', 'Prints nullopt', 'Throws because the optional is empty', 'Compiler error'],
      correctAnswer: 2,
      explanation: 'Calling value() on an empty optional throws std::bad_optional_access.',
    },
  }),
  lesson({
    id: 'cpp-booleans',
    title: 'Choosing Containers and Performance Tradeoffs',
    description: 'Use vector-first thinking, recognize when hash maps help, and reason about layout and access patterns.',
    category: 'Modern C++',
    examples: [
      example(
        'vector is usually the default choice for sequences.',
        `std::vector<int> scores;`
      ),
      example(
        'unordered_map helps when fast key lookup matters more than ordering.',
        `std::unordered_map<std::string, int> counts;`
      ),
      example(
        'Contiguous storage helps vector work well with caches.',
        `scores.push_back(10);`
      ),
      example(
        'Choose containers based on operations, not on novelty.',
        `// append + iterate => vector
// unique lookup by key => unordered_map`
      ),
    ],
    practice: {
      task: 'Sketch a small design that stores ordered scores in a vector and fast name lookups in an unordered_map.',
      code: `#include <string>
#include <unordered_map>
#include <vector>

struct ScoreStore {
    std::vector<int> scores;
    std::unordered_map<std::string, int> byName;
};`,
      requiredSnippets: ['std::vector<int> scores', 'std::unordered_map<std::string, int> byName', 'struct ScoreStore'],
      expectedOutput: [],
      requirements: ['Use vector for the sequence data.', 'Use unordered_map for key-based lookup.'],
      coachNote: 'Container choice should match the operations that dominate the design.',
    },
    predict: {
      questionOnly: 'Q2 (Predict Output)\n\nWhich container is usually the better default when you mainly append items and iterate through them later?',
      options: ['std::vector', 'std::list', 'std::map', 'std::stack'],
      correctAnswer: 0,
      explanation: 'vector is the default because it is simple, contiguous, and efficient for many common workloads.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nA program needs fast lookup by username, but the design stores everything in a std::vector and scans linearly for each query. What is the main issue?',
      options: ['Nothing is wrong', 'The container choice ignores the lookup-heavy access pattern', 'vector cannot store strings', 'unordered_map is only for files'],
      correctAnswer: 1,
      explanation: 'Container choice should follow the dominant operations. Repeated key lookups are a sign that an associative container may fit better.',
    },
  }),
  lesson({
    id: 'cpp-errors',
    title: 'Testing and Debugging Workflow',
    description: 'Adopt a test mindset with edge cases, regression checks, and the core ideas behind sanitizers and debuggers.',
    category: 'Modern C++',
    examples: [
      example(
        'A useful test checks one behavior and one expected result.',
        `assert(add(2, 3) == 5);`
      ),
      example(
        'Edge cases often reveal bugs faster than normal cases.',
        `assert(add(0, 0) == 0);`
      ),
      example(
        'Regression checks protect fixes from breaking later.',
        `// keep the failing input as a permanent test`
      ),
      example(
        'Sanitizers and debuggers help expose memory bugs and execution state.',
        `-fsanitize=address
gdb ./app`
      ),
    ],
    practice: {
      task: 'Write a tiny test harness with assert() for an add() function using a normal case and an edge case.',
      code: `#include <cassert>

int add(int a, int b) {
    return a + b;
}

int main() {
    assert(add(2, 3) == 5);
    assert(add(0, 0) == 0);
    return 0;
}`,
      requiredSnippets: ['#include <cassert>', 'int add(int a, int b)', 'assert(add(2, 3) == 5)', 'assert(add(0, 0) == 0)'],
      expectedOutput: [],
      requirements: ['Test one standard case and one edge case.', 'Keep the helper function small and deterministic.'],
      coachNote: 'Testing is a workflow, not a library. The main habit is to keep known-good checks close to the code they protect.',
    },
    predict: {
      code: `#include <cassert>

int main() {
    assert(2 + 2 == 4);
}`,
      options: ['The program continues silently', 'The program always prints 4', 'Compiler error', 'The assert always fails'],
      correctAnswer: 0,
      explanation: 'A passing assert does nothing visible and execution continues normally.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nA developer tests only add(2, 3) and never checks add(0, 0) or negative values. What is missing?',
      options: ['Nothing', 'Edge-case coverage', 'Namespaces', 'Move semantics'],
      correctAnswer: 1,
      explanation: 'Testing only the happy path misses the cases that often expose boundary bugs.',
    },
  }),
  lesson({
    id: 'cpp-recursion',
    title: 'Build Systems and Project Organization',
    description: 'Use CMake targets and a sane folder structure so apps, libraries, and tests evolve without chaos.',
    category: 'Modern C++',
    examples: [
      example(
        'CMake starts with the minimum version and project name.',
        `cmake_minimum_required(VERSION 3.20)
project(sample LANGUAGES CXX)`
      ),
      example(
        'Targets describe what to build.',
        `add_executable(app main.cpp)`
      ),
      example(
        'Libraries let you separate reusable code from the app binary.',
        `add_library(core math_utils.cpp)`
      ),
      example(
        'A clean folder split helps teams find code fast.',
        `src/
include/
tests/`
      ),
    ],
    practice: {
      task: 'Write a minimal CMakeLists.txt that defines a project and one executable target.',
      code: `cmake_minimum_required(VERSION 3.20)
project(toolkit LANGUAGES CXX)

add_executable(toolkit_app main.cpp)`,
      requiredSnippets: ['cmake_minimum_required', 'project(toolkit', 'add_executable(toolkit_app main.cpp)'],
      expectedOutput: [],
      requirements: ['Declare the project.', 'Declare one executable target.'],
      coachNote: 'Build systems are part of the codebase. Clean project structure reduces friction every time the app grows.',
    },
    predict: {
      code: `add_executable(app main.cpp utils.cpp)`,
      options: ['Defines one executable target named app', 'Creates two executables', 'Creates a library', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'add_executable creates one target named app from the listed source files.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nA project grows to ten files, but everything stays in one giant main.cpp. What is the main maintainability problem?',
      options: ['No problem', 'The codebase loses separation of concerns and becomes harder to build and test', 'CMake stops working', 'Vectors no longer compile'],
      correctAnswer: 1,
      explanation: 'Project organization exists so changes stay local, reviewable, and testable as the codebase grows.',
    },
  }),
  lesson({
    id: 'cpp-queues',
    title: 'Time, Randomness, and Small Utilities',
    description: 'Use chrono for time, <random> for controlled randomness, and small utility helpers to support real programs.',
    category: 'Modern C++',
    examples: [
      example(
        'chrono durations measure elapsed time.',
        `auto start = std::chrono::steady_clock::now();`
      ),
      example(
        'Random engines and distributions are separate concepts.',
        `std::mt19937 rng(42);
std::uniform_int_distribution<int> dist(1, 6);`
      ),
      example(
        'A distribution turns engine output into the range you actually want.',
        `int roll = dist(rng);`
      ),
      example(
        'Utility helpers often wrap repeated setup code.',
        `auto now = std::chrono::steady_clock::now();`
      ),
    ],
    practice: {
      task: 'Create a random engine and a uniform_int_distribution<int> that produces values from 1 to 6.',
      code: `#include <iostream>
#include <random>

int main() {
    std::mt19937 rng(42);
    std::uniform_int_distribution<int> dist(1, 6);
    std::cout << dist(rng) << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include <random>', 'std::mt19937 rng', 'std::uniform_int_distribution<int> dist(1, 6)', 'dist(rng)'],
      expectedOutput: ['1..6'],
      requirements: ['Use a random engine and a distribution.', 'Request one generated value from the distribution.'],
      coachNote: 'The standard random library is about explicit control: engine, distribution, and seed all matter.',
    },
    predict: {
      code: `auto start = std::chrono::steady_clock::now();
auto end = std::chrono::steady_clock::now();
auto elapsed = end - start;`,
      options: ['elapsed stores a duration-like value', 'elapsed stores a random number', 'Compiler error', 'elapsed is always 1 second'],
      correctAnswer: 0,
      explanation: 'Subtracting two time points yields a duration that represents elapsed time.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nA program uses rand() % 6 everywhere with no clear seed or distribution choice. What is the main design issue?',
      options: ['It is the modern C++ best practice', 'The randomness setup is implicit and harder to reason about', 'It makes chrono stop working', 'It turns ints into doubles'],
      correctAnswer: 1,
      explanation: 'Modern C++ encourages explicit engines and distributions because they make behavior easier to reason about and test.',
    },
  }),
  lesson({
    id: 'cpp-sets',
    title: 'Concurrency Basics',
    description: 'Understand threads, mutexes, shared state, and the races that appear when multiple threads touch the same data.',
    category: 'Modern C++',
    examples: [
      example(
        'std::thread runs a function concurrently.',
        `std::thread worker(runTask);`
      ),
      example(
        'join waits for a thread to finish before continuing.',
        `worker.join();`
      ),
      example(
        'A mutex protects shared state from simultaneous writes.',
        `std::mutex mutex;`
      ),
      example(
        'lock_guard locks a mutex for the current scope.',
        `std::lock_guard<std::mutex> lock(mutex);`
      ),
    ],
    practice: {
      task: 'Write the skeleton of a shared counter increment guarded by std::mutex and std::lock_guard.',
      code: `#include <mutex>
#include <thread>

int counter = 0;
std::mutex counterMutex;

void increment() {
    std::lock_guard<std::mutex> lock(counterMutex);
    counter++;
}`,
      requiredSnippets: ['#include <thread>', '#include <mutex>', 'std::mutex counterMutex', 'std::lock_guard<std::mutex>', 'counter++'],
      expectedOutput: [],
      requirements: ['Declare a mutex for the shared counter.', 'Guard the increment inside the function.'],
      coachNote: 'The first concurrency lesson is not speed. It is correctness under shared access.',
    },
    predict: {
      code: `std::thread worker(runTask);
worker.join();`,
      options: ['The main thread waits for worker to finish', 'worker detaches automatically', 'The mutex unlocks itself twice', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'join synchronizes with the worker thread and waits for it to complete.',
    },
    mistake: {
      code: `int main() {
    std::thread worker(runTask);
}`,
      options: ['Always fine', 'Program may terminate because the joinable thread was never joined or detached', 'worker becomes a vector', 'join happens automatically'],
      correctAnswer: 1,
      explanation: 'A joinable std::thread must be joined or detached before destruction.',
    },
  }),
  lesson({
    id: 'cpp-enums',
    title: 'Modern API and Class Design',
    description: 'Prefer composition, resource-safe interfaces, and unsurprising behavior when designing modern C++ APIs.',
    category: 'Modern C++',
    examples: [
      example(
        'Composition-first design keeps classes smaller and more focused.',
        `class ReportService {
private:
    FileStore store;
};`
      ),
      example(
        'Explicit constructors avoid surprising implicit conversions.',
        `explicit Money(int cents) : cents(cents) {}`
      ),
      example(
        'Resource-safe interfaces hide raw ownership details.',
        `std::unique_ptr<Task> createTask();`
      ),
      example(
        'Small public APIs are easier to learn and harder to misuse.',
        `void addTask(const std::string& label);
size_t size() const;`
      ),
    ],
    practice: {
      task: 'Design a TaskQueue class with a private vector, an addTask method, and a const size getter.',
      code: `#include <string>
#include <vector>

class TaskQueue {
public:
    void addTask(const std::string& label) {
        tasks.push_back(label);
    }

    size_t size() const {
        return tasks.size();
    }

private:
    std::vector<std::string> tasks;
};`,
      requiredSnippets: ['class TaskQueue', 'private:', 'std::vector<std::string> tasks', 'void addTask(const std::string& label)', 'size_t size() const'],
      expectedOutput: [],
      requirements: ['Keep the collection private.', 'Expose only a small, useful interface.'],
      coachNote: 'Good API design is mostly about reducing surprises for the caller.',
    },
    predict: {
      code: `TaskQueue queue;
queue.addTask("ship");
std::cout << queue.size() << std::endl;`,
      options: ['0', '1', 'ship', 'Compiler error'],
      correctAnswer: 1,
      explanation: 'After one addTask call, the queue contains one item, so size() returns 1.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nA class exposes every internal vector as public so callers can mutate anything. What is the main API design problem?',
      options: ['It is always best practice', 'The class loses encapsulation and becomes harder to reason about safely', 'It improves RAII automatically', 'It enables move-only semantics'],
      correctAnswer: 1,
      explanation: 'Public internals make invariants impossible to protect. A good API exposes intent, not raw implementation details.',
    },
  }),
  lesson({
    id: 'cpp-encapsulation',
    title: 'Refactoring and Maintainability',
    description: 'Spot duplication, extract helpers, simplify interfaces, and document intent so code stays changeable.',
    category: 'Modern C++',
    examples: [
      example(
        'Refactoring starts with noticing duplication.',
        `double total = price + price * tax;
double backup = other + other * tax;`
      ),
      example(
        'Extracting a helper removes repeated logic.',
        `double addTax(double price, double tax) {
    return price + price * tax;
}`
      ),
      example(
        'Better names reduce the need for comments.',
        `double subtotal = addTax(price, taxRate);`
      ),
      example(
        'Short documentation should explain decisions, not restate syntax.',
        `// Tax is stored as a decimal fraction, e.g. 0.2 for 20%`
      ),
    ],
    practice: {
      task: 'Refactor repeated tax math into one helper function and call it twice.',
      code: `#include <iostream>

double addTax(double price, double taxRate) {
    return price + price * taxRate;
}

int main() {
    std::cout << addTax(10.0, 0.2) << std::endl;
    std::cout << addTax(5.0, 0.2) << std::endl;
    return 0;
}`,
      requiredSnippets: ['double addTax(double price, double taxRate)', 'return price + price * taxRate', 'addTax(10.0, 0.2)', 'addTax(5.0, 0.2)'],
      expectedOutput: ['12', '6'],
      requirements: ['Move the repeated formula into one helper.', 'Call that helper from main().'],
      coachNote: 'Refactoring is not cosmetic. It changes the code shape so future changes cost less.',
    },
    predict: {
      code: `double addTax(double price, double taxRate) {
    return price + price * taxRate;
}

std::cout << addTax(10.0, 0.1) << std::endl;`,
      options: ['10', '11', '1', 'Compiler error'],
      correctAnswer: 1,
      explanation: '10.0 plus 10 percent tax becomes 11.0.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nTwo screens need the same pricing formula, but the code copies it into both places and later one version changes. What problem appears?',
      options: ['Nothing', 'Logic drift caused by duplication', 'CMake failure', 'Automatic optimization'],
      correctAnswer: 1,
      explanation: 'Duplicated logic tends to drift apart over time, which is exactly what refactoring tries to prevent.',
    },
  }),
  lesson({
    id: 'cpp-stacks',
    title: 'Capstone Project: Multithreaded File Indexer or Task Engine',
    description: 'Bring persistence, tests, STL containers, algorithms, modern class design, and one concurrency feature into one larger app.',
    category: 'Modern C++',
    projectBrief: {
      goal: 'Build a multithreaded file indexer or task engine with persistence, tests, STL containers, and one safe concurrency feature.',
      inputs: ['Files or queued tasks', 'Commands to add / process / save work'],
      outputs: ['Saved index or task state', 'Search or status reports', 'One concurrent worker result'],
      skills: ['multi-file design', 'RAII', 'containers', 'algorithms', 'file I/O', 'mutex / thread basics'],
    },
    examples: [
      example(
        'A capstone starts with a clear engine class that owns the core state.',
        `class TaskEngine {
private:
    std::vector<std::string> tasks;
};`
      ),
      example(
        'Persistence usually means save() and load() around a file format.',
        `void save(const std::string& path) const;
void load(const std::string& path);`
      ),
      example(
        'Concurrency should be small, explicit, and protected.',
        `std::mutex tasksMutex;
std::thread worker;`
      ),
      example(
        'Tests should cover one realistic workflow end to end.',
        `// add task -> save -> load -> confirm same task exists`
      ),
    ],
    practice: {
      task: 'Write a TaskEngine skeleton with a private task vector, save/load declarations, and one mutex-guarded addTask method.',
      code: `#include <mutex>
#include <string>
#include <vector>

class TaskEngine {
public:
    void addTask(const std::string& task) {
        std::lock_guard<std::mutex> lock(tasksMutex);
        tasks.push_back(task);
    }

    void save(const std::string& path) const;
    void load(const std::string& path);

private:
    std::vector<std::string> tasks;
    mutable std::mutex tasksMutex;
};`,
      requiredSnippets: ['class TaskEngine', 'std::vector<std::string> tasks', 'std::mutex', 'std::lock_guard<std::mutex>', 'void save(const std::string& path) const'],
      expectedOutput: [],
      requirements: ['Own task state inside the class.', 'Use a mutex in addTask.', 'Declare save/load hooks for persistence.'],
      coachNote: 'A capstone is not about adding every feature. It is about fitting the right features together without breaking the design.',
    },
    predict: {
      code: `TaskEngine engine;
engine.addTask("index docs");
std::cout << "queued" << std::endl;`,
      options: ['queued', 'index docs', 'Nothing', 'Compiler error'],
      correctAnswer: 0,
      explanation: 'The program adds the task, then prints queued. The task engine state change is internal.',
    },
    mistake: {
      questionOnly: 'Q3 (Common Mistake)\n\nTwo threads both push into the same task vector with no mutex. What is the main risk?',
      options: ['No risk', 'A data race and corrupted shared state', 'The vector becomes a map', 'The file format changes automatically'],
      correctAnswer: 1,
      explanation: 'Shared mutable state without synchronization is exactly where concurrency bugs and data races appear.',
    },
  }),
];

const CPP_STATIC_ONLY_LESSON_IDS = new Set([
  'cpp-syntax',
  'cpp-output',
  'cpp-polymorphism',
  'cpp-math',
  'cpp-list',
  'cpp-booleans',
  'cpp-recursion',
  'cpp-sets',
  'cpp-enums',
  'cpp-stacks',
]);

const QUESTION_KIND_LABELS = {
  'predict-output': 'Predict Output',
  'common-mistake': 'Common Mistake',
  'knowledge-check': 'Knowledge Check',
  'compiler-trace': 'Compiler Trace',
  'ownership-check': 'Ownership Check',
  'api-design': 'API Design',
  'refactor-choice': 'Refactor Choice',
};

const CPP_QUESTION_KIND_OVERRIDES = {
  'cpp-memory-management': { mistake: 'ownership-check' },
  'cpp-class-methods': { mistake: 'ownership-check' },
  'cpp-comments': { mistake: 'ownership-check' },
  'cpp-function-parameters': { mistake: 'ownership-check' },
  'cpp-operators': { mistake: 'compiler-trace' },
  'cpp-friend-functions': { mistake: 'api-design' },
  'cpp-lambda': { mistake: 'api-design' },
  'cpp-recursion': { mistake: 'refactor-choice' },
  'cpp-enums': { mistake: 'api-design' },
};

const CPP_PRACTICE_ASSESSMENT_OVERRIDES = {
  'cpp-files': {
    qualitySignals: ['std::ofstream out("report.txt")', 'if (!out)', 'out << "Ready" << std::endl', 'return 1'],
    forbiddenPatterns: ['std::cout << "Ready"', 'printf("Ready")'],
    weights: {
      correctness: 0.4,
      edgeCaseHandling: 0.15,
      codeQuality: 0.3,
      efficiency: 0.15,
    },
  },
  'cpp-memory-management': {
    qualitySignals: ['delete ptr', 'ptr = nullptr'],
    edgeCaseSnippets: ['new int', '*ptr = 42'],
  },
  'cpp-class-methods': {
    qualitySignals: ['~ScopeNote()', 'ScopeNote note;'],
    forbiddenPatterns: ['new ScopeNote', 'delete '],
    weights: {
      correctness: 0.35,
      edgeCaseHandling: 0.15,
      codeQuality: 0.35,
      efficiency: 0.15,
    },
  },
  'cpp-comments': {
    qualitySignals: ['std::unique_ptr<int> value', 'std::make_unique<int>(11)'],
    forbiddenPatterns: ['new int', 'delete value', 'delete ptr'],
    weights: {
      correctness: 0.4,
      edgeCaseHandling: 0.1,
      codeQuality: 0.35,
      efficiency: 0.15,
    },
  },
  'cpp-function-parameters': {
    qualitySignals: ['Score(const Score& other)', 'value(other.value)'],
    forbiddenPatterns: ['int* ptr = new int', 'delete ptr'],
  },
  'cpp-operators': {
    qualitySignals: ['Box(Box&& other)', 'std::move(other.label)', 'noexcept'],
    forbiddenPatterns: ['label(other.label)', 'Box(const Box& other)'],
    weights: {
      correctness: 0.35,
      edgeCaseHandling: 0.15,
      codeQuality: 0.35,
      efficiency: 0.15,
    },
  },
  'cpp-lambda': {
    qualitySignals: ['Engine engine;', 'showPower() const'],
    forbiddenPatterns: ['Engine* engine;'],
  },
  'cpp-enums': {
    qualitySignals: ['private:', 'size() const', 'std::vector<std::string> tasks'],
    forbiddenPatterns: ['public:\n    std::vector<std::string> tasks'],
  },
  'cpp-getstarted-calculator': {
    qualitySignals: ['void runCalculator()', 'std::cin >> a >> b', 'std::cout << a + b'],
  },
  'cpp-getstarted-stats': {
    qualitySignals: ['int minValue', 'int maxValue', 'std::cout << minValue', 'std::cout << maxValue', 'std::cout << sum'],
  },
  'cpp-output-report': {
    qualitySignals: ['class Gradebook', 'void addScore(int score)', 'int size() const', 'int findIndex(int target) const'],
    forbiddenPatterns: ['public:\n    std::vector<int> scores'],
  },
  'cpp-output-header-integration': {
    qualitySignals: ['#include "Gradebook.h"', '#include "gradebook_report.h"', 'void Gradebook::addScore', 'reportHeading()'],
  },
  'cpp-polymorphism-total': {
    qualitySignals: ['std::vector<std::unique_ptr<Shape>>', 'override', 'std::make_unique<Rectangle>'],
    forbiddenPatterns: ['std::vector<Shape>'],
  },
  'cpp-list-log-report': {
    qualitySignals: ['std::ifstream in("app.log")', 'while (std::getline(in, line))', 'counts[status]++'],
  },
  'cpp-list-summary-file': {
    qualitySignals: ['std::ofstream out("summary.txt")', 'counts["ok"]', 'counts["error"]'],
    forbiddenPatterns: ['std::cout << "ok="', 'std::cout << "error="'],
  },
  'cpp-stacks-save': {
    qualitySignals: ['std::lock_guard<std::mutex>', 'std::ofstream out("tasks.txt")', 'tasks.push_back'],
    forbiddenPatterns: ['tasks.push_back(task); // no lock'],
  },
  'cpp-stacks-load': {
    qualitySignals: ['std::ifstream in("tasks.txt")', 'while (std::getline(in, line))', 'tasks.push_back(line)'],
  },
};

const CPP_EXECUTION_CASE_OVERRIDES = {
  'cpp-getstarted': [
    {
      label: 'Public menu route',
      stdin_text: '1\n',
      expected_output: '1) Calculator\n2) Min/Max\n3) Stats\nCalculator',
      hidden: false,
    },
    {
      label: 'Hidden min max route',
      stdin_text: '2\n',
      expected_output: '1) Calculator\n2) Min/Max\n3) Stats\nMin/Max',
      hidden: true,
    },
    {
      label: 'Hidden invalid route',
      stdin_text: '9\n',
      expected_output: '1) Calculator\n2) Min/Max\n3) Stats\nInvalid choice',
      hidden: true,
    },
  ],
  'cpp-user-input': [
    { label: 'Public sum', stdin_text: '3 4\n', expected_output: '7', hidden: false },
    { label: 'Hidden negative sum', stdin_text: '10 -4\n', expected_output: '6', hidden: true },
    { label: 'Hidden all-negative sum', stdin_text: '-3 -8\n', expected_output: '-11', hidden: true },
  ],
  'cpp-if-else': [
    { label: 'Public passing score', stdin_text: '75\n', expected_output: 'Pass', hidden: false },
    { label: 'Hidden boundary pass', stdin_text: '60\n', expected_output: 'Pass', hidden: true },
    { label: 'Hidden failing score', stdin_text: '59\n', expected_output: 'Fail', hidden: true },
  ],
  'cpp-for-loop': [
    { label: 'Public loop', stdin_text: '3\n', expected_output: '1\n2\n3', hidden: false },
    { label: 'Hidden empty loop', stdin_text: '0\n', expected_output: '', hidden: true },
    { label: 'Hidden longer loop', stdin_text: '5\n', expected_output: '1\n2\n3\n4\n5', hidden: true },
  ],
  'cpp-debugging': [
    { label: 'Public debug trace', stdin_text: '3 4\n', expected_output: 'debug: 3 4\n12', hidden: false },
    { label: 'Hidden negative product', stdin_text: '-2 6\n', expected_output: 'debug: -2 6\n-12', hidden: true },
  ],
  'cpp-strings': [
    { label: 'Public greeting', stdin_text: 'Ada Lovelace\n', expected_output: 'Hello, Ada Lovelace', hidden: false },
    { label: 'Hidden spaced greeting', stdin_text: 'Grace Hopper\n', expected_output: 'Hello, Grace Hopper', hidden: true },
  ],
  'cpp-errors': [
    { label: 'Assertions pass', stdin_text: '', expected_output: '', hidden: false },
  ],
  'cpp-files': [
    {
      label: 'Public file write',
      stdin_text: '',
      expected_output: '',
      expected_files: [{ path: 'report.txt', contents: 'Ready\n' }],
      hidden: false,
    },
  ],
  'cpp-queues': [
    { label: 'Distribution result stays in range', stdin_text: '', expected_json: ['1', '2', '3', '4', '5', '6'], compare_mode: 'one_of', hidden: false },
  ],
  'cpp-getstarted-calculator': [
    { label: 'Public calculator total', stdin_text: '8 5\n', expected_output: '13', hidden: false },
    { label: 'Hidden decimal-style total', stdin_text: '2 9\n', expected_output: '11', hidden: true },
    { label: 'Hidden negative total', stdin_text: '-3 7\n', expected_output: '4', hidden: true },
  ],
  'cpp-getstarted-stats': [
    { label: 'Public stats summary', stdin_text: '4 7 1\n', expected_output: '1\n7\n12', hidden: false },
    { label: 'Hidden equal values', stdin_text: '5 5 5\n', expected_output: '5\n5\n15', hidden: true },
  ],
  'cpp-output-report': [
    { label: 'Gradebook report', stdin_text: '', expected_output: '3\n1', hidden: false },
  ],
  'cpp-output-header-integration': [
    {
      label: 'Header-backed report',
      stdin_text: '',
      expected_output: 'Gradebook\n3\n2',
      files: [
        {
          path: 'Gradebook.h',
          contents: `#pragma once
#include <vector>

class Gradebook {
public:
    void addScore(int score);
    int size() const;
    int findIndex(int target) const;

private:
    std::vector<int> scores;
};
`,
        },
        {
          path: 'gradebook_report.h',
          contents: `#pragma once
#include <string>

std::string reportHeading();
`,
        },
        {
          path: 'gradebook_report.cpp',
          contents: `#include "gradebook_report.h"

std::string reportHeading() {
    return "Gradebook";
}
`,
        },
      ],
      hidden: false,
    },
  ],
  'cpp-polymorphism-total': [
    { label: 'Public total area', stdin_text: '', expected_output: '18', hidden: false },
  ],
  'cpp-list-log-report': [
    {
      label: 'Public log count report',
      stdin_text: '',
      expected_output: 'ok=2\nerror=1',
      files: [{ path: 'app.log', contents: 'ok\nerror\nok\n' }],
      hidden: false,
    },
  ],
  'cpp-list-summary-file': [
    {
      label: 'Public summary file',
      stdin_text: '',
      expected_output: '',
      files: [{ path: 'app.log', contents: 'ok\nerror\nok\n' }],
      expected_files: [{ path: 'summary.txt', contents: 'ok=2\nerror=1\n' }],
      hidden: false,
    },
  ],
  'cpp-stacks-save': [
    {
      label: 'Public task save',
      stdin_text: '',
      expected_output: '',
      expected_files: [{ path: 'tasks.txt', contents: 'index docs\nship report\n' }],
      hidden: false,
    },
  ],
  'cpp-stacks-load': [
    {
      label: 'Public task load',
      stdin_text: '',
      expected_output: '2',
      files: [{ path: 'tasks.txt', contents: 'index docs\nship report\n' }],
      hidden: false,
    },
  ],
};

const PROJECT_EXTRA_STEPS = {
  'cpp-getstarted': [
    {
      title: 'Milestone 2',
      evaluationMode: 'execution',
      evaluationId: 'cpp-getstarted-calculator',
      task: 'Add the calculator tool: write runCalculator() so it reads two integers and prints their sum, then call it from main().',
      code: `#include <iostream>

void runCalculator() {
    int a;
    int b;
    std::cin >> a >> b;
    std::cout << a + b << std::endl;
}

int main() {
    runCalculator();
    return 0;
}`,
      requiredSnippets: ['void runCalculator()', 'std::cin >> a >> b', 'std::cout << a + b', 'runCalculator();'],
      expectedOutput: ['13'],
      inputs: ['Two integers for the calculator branch'],
      requirements: ['Read both numbers inside runCalculator().', 'Print the sum once from the helper function.'],
      coachNote: 'Ship one tool end to end first. A project becomes real when one branch actually works.',
    },
    {
      title: 'Milestone 3',
      evaluationMode: 'execution',
      evaluationId: 'cpp-getstarted-stats',
      task: 'Add the stats tool: read three integers, then print the minimum, maximum, and sum on separate lines.',
      code: `#include <iostream>

int main() {
    int a;
    int b;
    int c;
    std::cin >> a >> b >> c;

    int minValue = a;
    if (b < minValue) minValue = b;
    if (c < minValue) minValue = c;

    int maxValue = a;
    if (b > maxValue) maxValue = b;
    if (c > maxValue) maxValue = c;

    int sum = a + b + c;
    std::cout << minValue << std::endl;
    std::cout << maxValue << std::endl;
    std::cout << sum << std::endl;
    return 0;
}`,
      requiredSnippets: ['int minValue', 'int maxValue', 'int sum = a + b + c', 'std::cout << minValue', 'std::cout << maxValue'],
      expectedOutput: ['1', '7', '12'],
      inputs: ['Three integers for the stats branch'],
      requirements: ['Compute min and max explicitly.', 'Print min, max, and sum on separate lines.'],
      coachNote: 'The toolkit now has a second working branch. Milestones should add behavior, not only more structure.',
    },
  ],
  'cpp-output': [
    {
      title: 'Milestone 2',
      evaluationMode: 'execution',
      evaluationId: 'cpp-output-report',
      task: 'Extend Gradebook with size() and print the total number of stored scores plus the index of 85.',
      code: `#include <iostream>
#include <vector>

class Gradebook {
public:
    void addScore(int score) {
        scores.push_back(score);
    }

    int size() const {
        return static_cast<int>(scores.size());
    }

    int findIndex(int target) const {
        for (size_t i = 0; i < scores.size(); i++) {
            if (scores[i] == target) return static_cast<int>(i);
        }
        return -1;
    }

private:
    std::vector<int> scores;
};

int main() {
    Gradebook book;
    book.addScore(70);
    book.addScore(85);
    book.addScore(90);
    std::cout << book.size() << std::endl;
    std::cout << book.findIndex(85) << std::endl;
    return 0;
}`,
      requiredSnippets: ['class Gradebook', 'int size() const', 'int findIndex(int target) const', 'book.addScore(85)', 'std::cout << book.size()'],
      expectedOutput: ['3', '1'],
      requirements: ['Keep the scores collection private.', 'Expose one size query and one search query.'],
      coachNote: 'Once the model exists, make it answer useful questions. That is what turns a skeleton into an application core.',
    },
    {
      title: 'Milestone 3',
      evaluationMode: 'execution',
      evaluationId: 'cpp-output-header-integration',
      task: 'Use the provided Gradebook.h and report helper to define the methods and print the heading, the number of scores, and the index of 90.',
      code: `#include "Gradebook.h"
#include "gradebook_report.h"
#include <iostream>

void Gradebook::addScore(int score) {
    scores.push_back(score);
}

int Gradebook::size() const {
    return static_cast<int>(scores.size());
}

int Gradebook::findIndex(int target) const {
    for (size_t i = 0; i < scores.size(); i++) {
        if (scores[i] == target) return static_cast<int>(i);
    }
    return -1;
}

int main() {
    Gradebook book;
    book.addScore(70);
    book.addScore(85);
    book.addScore(90);
    std::cout << reportHeading() << std::endl;
    std::cout << book.size() << std::endl;
    std::cout << book.findIndex(90) << std::endl;
    return 0;
}`,
      requiredSnippets: ['#include "Gradebook.h"', '#include "gradebook_report.h"', 'void Gradebook::addScore(int score)', 'reportHeading()'],
      expectedOutput: ['Gradebook', '3', '2'],
      requirements: ['Include the provided headers instead of redefining the class.', 'Define each declared method once.', 'Call the helper compiled from a separate source file.'],
      coachNote: 'This milestone is the first real multi-file integration pass: header, implementation, and a linked helper working together.',
    },
  ],
  'cpp-polymorphism': [
    {
      title: 'Milestone 2',
      evaluationMode: 'execution',
      evaluationId: 'cpp-polymorphism-total',
      task: 'Add a second derived shape and print the total area of the polymorphic collection.',
      code: `#include <iostream>
#include <memory>
#include <vector>

class Shape {
public:
    virtual double area() const = 0;
    virtual ~Shape() = default;
};

class Rectangle : public Shape {
public:
    Rectangle(double width, double height) : width(width), height(height) {}
    double area() const override { return width * height; }

private:
    double width;
    double height;
};

class Square : public Shape {
public:
    explicit Square(double side) : side(side) {}
    double area() const override { return side * side; }

private:
    double side;
};

int main() {
    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Rectangle>(3.0, 4.0));
    shapes.push_back(std::make_unique<Square>(2.0));

    double total = 0.0;
    for (const auto& shape : shapes) {
        total += shape->area();
    }

    std::cout << total << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::vector<std::unique_ptr<Shape>>', 'double area() const override', 'std::make_unique<Rectangle>', 'std::make_unique<Square>'],
      expectedOutput: ['18'],
      requirements: ['Store the derived objects behind Shape pointers.', 'Accumulate the total area through the base interface.'],
      coachNote: 'Polymorphism pays off when one collection can treat different concrete types the same way.',
    },
  ],
  'cpp-list': [
    {
      title: 'Milestone 2',
      evaluationMode: 'execution',
      evaluationId: 'cpp-list-log-report',
      task: 'Read the provided app.log file, count ok and error lines, and print ok=... then error=....',
      code: `#include <fstream>
#include <iostream>
#include <string>
#include <unordered_map>

int main() {
    std::ifstream in("app.log");
    std::string line;
    std::unordered_map<std::string, int> counts;

    while (std::getline(in, line)) {
        counts[line]++;
    }

    std::cout << "ok=" << counts["ok"] << std::endl;
    std::cout << "error=" << counts["error"] << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::ifstream in("app.log")', 'while (std::getline(in, line))', 'counts[line]++', 'std::cout << "ok=" << counts["ok"]'],
      expectedOutput: ['ok=2', 'error=1'],
      inputs: ['The lesson runner provides app.log with sample lines.'],
      requirements: ['Read every line from the file.', 'Track counts with an associative container.', 'Print the two report lines in a fixed order.'],
      coachNote: 'A real analyzer is judged by the report it produces, not by the fact that it owns an unordered_map.',
    },
    {
      title: 'Milestone 3',
      evaluationMode: 'execution',
      evaluationId: 'cpp-list-summary-file',
      task: 'Write the same log summary into summary.txt instead of printing it.',
      code: `#include <fstream>
#include <string>
#include <unordered_map>

int main() {
    std::ifstream in("app.log");
    std::string line;
    std::unordered_map<std::string, int> counts;

    while (std::getline(in, line)) {
        counts[line]++;
    }

    std::ofstream out("summary.txt");
    out << "ok=" << counts["ok"] << std::endl;
    out << "error=" << counts["error"] << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::ifstream in("app.log")', 'std::ofstream out("summary.txt")', 'counts[line]++', 'out << "ok=" << counts["ok"]'],
      expectedOutput: [],
      outputDescription: 'Create summary.txt with ok=2 and error=1 on separate lines.',
      inputs: ['The lesson runner provides app.log with sample lines.'],
      requirements: ['Read the source file first.', 'Write the summary file in a deterministic format.'],
      coachNote: 'The report is more useful when another tool can read it later. Persist the output, don’t only print it.',
    },
  ],
  'cpp-stacks': [
    {
      title: 'Milestone 2',
      evaluationMode: 'execution',
      evaluationId: 'cpp-stacks-save',
      task: 'Implement addTask() and save() so the engine persists each queued task to tasks.txt.',
      code: `#include <fstream>
#include <mutex>
#include <string>
#include <vector>

class TaskEngine {
public:
    void addTask(const std::string& task) {
        std::lock_guard<std::mutex> lock(tasksMutex);
        tasks.push_back(task);
    }

    void save(const std::string& path) const {
        std::lock_guard<std::mutex> lock(tasksMutex);
        std::ofstream out(path);
        for (const auto& task : tasks) {
            out << task << std::endl;
        }
    }

private:
    mutable std::mutex tasksMutex;
    std::vector<std::string> tasks;
};

int main() {
    TaskEngine engine;
    engine.addTask("index docs");
    engine.addTask("ship report");
    engine.save("tasks.txt");
    return 0;
}`,
      requiredSnippets: ['std::lock_guard<std::mutex>', 'tasks.push_back(task)', 'std::ofstream out(path)', 'out << task << std::endl'],
      expectedOutput: [],
      outputDescription: 'Create tasks.txt with one task per line.',
      requirements: ['Guard shared state in addTask.', 'Write every queued task during save().'],
      coachNote: 'Persistence only counts when it safely captures the state the worker has built up.',
    },
    {
      title: 'Milestone 3',
      evaluationMode: 'execution',
      evaluationId: 'cpp-stacks-load',
      task: 'Implement load() so the engine reads tasks.txt and then print the number of queued tasks.',
      code: `#include <fstream>
#include <iostream>
#include <mutex>
#include <string>
#include <vector>

class TaskEngine {
public:
    void load(const std::string& path) {
        std::lock_guard<std::mutex> lock(tasksMutex);
        tasks.clear();

        std::ifstream in(path);
        std::string line;
        while (std::getline(in, line)) {
            tasks.push_back(line);
        }
    }

    int taskCount() const {
        std::lock_guard<std::mutex> lock(tasksMutex);
        return static_cast<int>(tasks.size());
    }

private:
    mutable std::mutex tasksMutex;
    std::vector<std::string> tasks;
};

int main() {
    TaskEngine engine;
    engine.load("tasks.txt");
    std::cout << engine.taskCount() << std::endl;
    return 0;
}`,
      requiredSnippets: ['std::ifstream in(path)', 'while (std::getline(in, line))', 'tasks.push_back(line)', 'std::cout << engine.taskCount()'],
      expectedOutput: ['2'],
      inputs: ['The lesson runner provides tasks.txt with two tasks.'],
      requirements: ['Clear existing tasks before loading.', 'Read every line from the file.', 'Report the loaded task count.'],
      coachNote: 'Loading is the second half of persistence. If you can save but not restore, the engine is still incomplete.',
    },
  ],
};

const practiceReadsInput = (code = '') => /std::cin|std::getline\s*\(/.test(String(code));
const hasRunnableMain = (code = '') => /\bint\s+main\s*\(/.test(String(code));
const joinExpectedOutput = (lines = []) => lines.map((line) => String(line)).join('\n');

const CPP_CATEGORY_COMPLEXITY = {
  Foundations: 1.4,
  'Program Structure': 2.2,
  'Object Design': 3.0,
  'STL and Generic Power': 3.2,
  'Modern C++': 3.6,
};

const CPP_COMPLEXITY_PATTERNS = [
  { pattern: /std::ofstream|std::ifstream|std::stringstream/, weight: 0.35 },
  { pattern: /std::vector|std::array|std::map|std::set|unordered_map|unordered_set/, weight: 0.25 },
  { pattern: /\bnew\b|\bdelete\b|unique_ptr|shared_ptr|weak_ptr/, weight: 0.75 },
  { pattern: /\bvirtual\b|override|abstract|polymorphism/i, weight: 0.55 },
  { pattern: /template\s*<|std::views|std::ranges|std::optional|std::variant|std::tuple/, weight: 0.55 },
  { pattern: /std::thread|std::mutex|std::lock_guard|std::chrono|std::random/, weight: 0.7 },
];

const getCppComplexityScore = (spec) => {
  const codeBundle = [spec?.practice?.code, spec?.predict?.code, spec?.mistake?.code].join('\n');
  const requirements = Array.isArray(spec?.practice?.requirements) ? spec.practice.requirements.length : 0;
  const questionKinds = CPP_QUESTION_KIND_OVERRIDES[spec.id] || {};
  let score = CPP_CATEGORY_COMPLEXITY[spec.category] || 2.4;

  if (spec.projectBrief) score += 1.2;
  if (practiceReadsInput(spec?.practice?.code || '')) score += 0.15;
  if ((spec?.examples || []).length >= 4) score += 0.1;
  if (requirements >= 3) score += 0.15;
  if (questionKinds.predict || questionKinds.mistake) score += 0.3;

  for (const { pattern, weight } of CPP_COMPLEXITY_PATTERNS) {
    if (pattern.test(codeBundle)) score += weight;
  }

  return Number(score.toFixed(2));
};

const getDifficultyByLessonSpec = (spec) => {
  const score = getCppComplexityScore(spec);
  if (score < 2.2) return 'Beginner';
  if (score < 4.1) return 'Intermediate';
  return 'Advanced';
};

const lessonDifficulties = lessons.map((spec) => getDifficultyByLessonSpec(spec));
const countsByDifficulty = lessonDifficulties.reduce(
  (acc, difficulty) => {
    acc[difficulty] += 1;
    return acc;
  },
  { Beginner: 0, Intermediate: 0, Advanced: 0 }
);

const positionsByDifficulty = {
  Beginner: 0,
  Intermediate: 0,
  Advanced: 0,
};

const buildCppRewardMeta = (spec, difficulty, position, count) => {
  const baseMeta = buildRewardMeta(difficulty, position, count);
  const complexityScore = getCppComplexityScore(spec);
  const xpBonus = spec.projectBrief ? 8 : complexityScore >= 4.75 ? 4 : 0;
  const timeBonus = spec.projectBrief ? 1 : complexityScore >= 4.75 ? 0.5 : 0;

  return {
    baseXP: baseMeta.baseXP + xpBonus,
    baselineTime: roundToHalfMinute(baseMeta.baselineTime + timeBonus),
  };
};

const shouldUseExecutionPractice = (spec) => {
  const practiceCode = String(spec?.practice?.code || '');
  const practiceExpectedOutput = Array.isArray(spec?.practice?.expectedOutput) ? spec.practice.expectedOutput : [];

  if (CPP_STATIC_ONLY_LESSON_IDS.has(spec.id)) return false;
  if (!hasRunnableMain(practiceCode)) return false;
  if (practiceReadsInput(practiceCode) && !CPP_EXECUTION_CASE_OVERRIDES[spec.id]) return false;

  return practiceExpectedOutput.length > 0 || Array.isArray(CPP_EXECUTION_CASE_OVERRIDES[spec.id]);
};

const getCppAssessmentOverrides = (lessonId) => CPP_PRACTICE_ASSESSMENT_OVERRIDES[lessonId] || {};

const buildCppPracticeStep = (stepSpec) => {
  const evaluationMode = stepSpec.evaluationMode || 'static';
  const assessmentKey = stepSpec.assessmentKey || stepSpec.evaluationId || '';
  const assessmentOverrides = getCppAssessmentOverrides(assessmentKey);

  return {
    title: stepSpec.title,
    content: stepSpec.task,
    code: stepSpec.code,
    explanation: stepSpec.coachNote,
    type: 'practice',
    evaluationMode,
    evaluationId: evaluationMode === 'execution' ? stepSpec.evaluationId : undefined,
    validationMode: 'includes_all',
    requiredSnippets: stepSpec.requiredSnippets || [],
    edgeCaseSnippets: assessmentOverrides.edgeCaseSnippets || [],
    qualitySignals: assessmentOverrides.qualitySignals || [],
    efficiencySignals: assessmentOverrides.efficiencySignals || [],
    forbiddenPatterns: assessmentOverrides.forbiddenPatterns || [],
    weights: assessmentOverrides.weights,
    starterCode: stepSpec.starterCode || '',
    practiceBrief: {
      task: stepSpec.task,
      inputs: stepSpec.inputs || [],
      requirements: stepSpec.requirements || [],
      expectedOutput: stepSpec.expectedOutput || [],
      outputDescription: stepSpec.outputDescription || '',
      coachNote: stepSpec.coachNote,
    },
  };
};

const buildProjectExtraSteps = (lessonId) => (PROJECT_EXTRA_STEPS[lessonId] || []).map((stepSpec) => buildCppPracticeStep(stepSpec));

const buildCppExecutionBank = (sourceLessons) =>
  sourceLessons.reduce((bank, lessonItem) => {
    const practiceSteps = (lessonItem?.content?.steps || []).filter(
      (step) => step?.type === 'practice' && step?.evaluationMode === 'execution' && step?.evaluationId
    );

    for (const step of practiceSteps) {
      const testCases =
        CPP_EXECUTION_CASE_OVERRIDES[step.evaluationId]?.map((testCase) => ({ ...testCase })) ||
        (Array.isArray(step?.practiceBrief?.expectedOutput) && step.practiceBrief.expectedOutput.length > 0
          ? [
              {
                label: 'Expected output',
                stdin_text: '',
                expected_output: joinExpectedOutput(step.practiceBrief.expectedOutput || []),
                hidden: false,
              },
            ]
          : []);

      if (!testCases.length) continue;

      bank[step.evaluationId] = {
        language: 'cpp',
        requiredSnippets: step.requiredSnippets || [],
        forbiddenPatterns: step.forbiddenPatterns || [],
        testCases,
      };
    }

    return bank;
  }, {});

const buildQuestion = (kind, data) => {
  const questionKind = data.kind || kind;
  if (data.questionOnly) {
    return {
      question: data.questionOnly,
      options: data.options,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
      type: 'question',
      questionKind,
    };
  }

  const label = QUESTION_KIND_LABELS[questionKind] || (kind === 'predict-output' ? 'Predict Output' : 'Common Mistake');
  const prompt = data.prompt ? `${data.prompt}\n\n` : '';

  return {
    question: `Q${kind === 'predict-output' ? '2' : '3'} (${label})\n\n${prompt}${data.code}`.trim(),
    options: data.options,
    correctAnswer: data.correctAnswer,
    explanation: data.explanation,
    type: 'question',
    questionKind,
  };
};

const cppLessons = lessons.map((spec, index) => {
  const difficulty = lessonDifficulties[index];
  const position = positionsByDifficulty[difficulty];
  positionsByDifficulty[difficulty] += 1;
  const rewardMeta = buildCppRewardMeta(spec, difficulty, position, countsByDifficulty[difficulty]);
  const evaluationMode = shouldUseExecutionPractice(spec) ? 'execution' : 'static';
  const questionKindOverrides = CPP_QUESTION_KIND_OVERRIDES[spec.id] || {};
  const primaryPracticeStep = buildCppPracticeStep({
    title: 'Q1',
    assessmentKey: spec.id,
    evaluationMode,
    evaluationId: evaluationMode === 'execution' ? spec.id : undefined,
    task: spec.practice.task,
    code: spec.practice.code,
    requiredSnippets: spec.practice.requiredSnippets,
    expectedOutput: spec.practice.expectedOutput || [],
    inputs: spec.practice.inputs || [],
    requirements: spec.practice.requirements || [],
    outputDescription: spec.practice.outputDescription || '',
    coachNote: spec.practice.coachNote,
    starterCode: spec.practice.starterCode || '',
  });
  const projectExtraSteps = buildProjectExtraSteps(spec.id);

  return {
    id: spec.id,
    title: spec.title,
    description: spec.description,
    difficulty,
    baseXP: rewardMeta.baseXP,
    baselineTime: rewardMeta.baselineTime,
    language: 'cpp',
    category: spec.category,
    isLocked: false,
    ...(spec.projectBrief ? { projectBrief: spec.projectBrief } : {}),
    content: {
      steps: [
        ...spec.examples.map((item, itemIndex) => ({
          title: `Example ${itemIndex + 1}`,
          content: item.content,
          code: item.code,
          explanation: item.explanation,
          type: 'theory',
          practiceMode: 'none',
          stepKind: 'example',
        })),
        primaryPracticeStep,
        ...projectExtraSteps,
        buildQuestion('predict-output', { ...spec.predict, kind: questionKindOverrides.predict || spec.predict.kind }),
        buildQuestion('common-mistake', { ...spec.mistake, kind: questionKindOverrides.mistake || spec.mistake.kind }),
      ],
    },
  };
});

const cppLessonCatalogEntries = cppLessons.map((lessonItem, languageIndex) => ({
  id: lessonItem.id,
  title: lessonItem.title,
  language: 'cpp',
  index: 100 + languageIndex,
  languageIndex,
}));

const cppLessonMeta = cppLessons.map((lessonItem) => ({
  id: lessonItem.id,
  difficulty: lessonItem.difficulty,
  baseXP: lessonItem.baseXP,
  baselineTime: lessonItem.baselineTime,
  language: 'cpp',
}));

const cppEvaluationBank = buildCppExecutionBank(cppLessons);

const generatedLessonFile = `import type { Lesson } from './lessons';

// Generated by scripts/generate-cpp-curriculum.mjs
export const cppLessons: Lesson[] = ${JSON.stringify(cppLessons, null, 2)} as Lesson[];

export const cppLessonCatalogEntries = ${JSON.stringify(cppLessonCatalogEntries, null, 2)} as const;
`;

const generatedMetaFile = `export const CPP_LESSON_META = ${JSON.stringify(cppLessonMeta, null, 2)};
`;

const generatedEvaluationBankFile = `// Generated by scripts/generate-cpp-curriculum.mjs
export const CPP_LESSON_EVALUATION_BANK = ${JSON.stringify(cppEvaluationBank, null, 2)};

export const getCppLessonEvaluationDefinition = (lessonId) =>
  CPP_LESSON_EVALUATION_BANK[String(lessonId || '').trim()] || null;
`;

fs.writeFileSync(
  path.join(projectRoot, 'src', 'data', 'cppLessons.generated.ts'),
  generatedLessonFile
);
fs.writeFileSync(path.join(projectRoot, 'shared', 'cpp-lesson-meta.js'), generatedMetaFile);
fs.writeFileSync(
  path.join(projectRoot, 'services', 'progression', 'cpp-lesson-evaluation-bank.generated.js'),
  generatedEvaluationBankFile
);

console.log(`Generated ${cppLessons.length} C++ lessons.`);
console.log(`Execution-backed C++ lessons: ${Object.keys(cppEvaluationBank).length}`);
