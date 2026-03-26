const context = (content) => ({
  title: 'Why this matters',
  content,
  code: '',
  explanation: content,
  type: 'theory',
  practiceMode: 'none',
  stepKind: 'context',
});

const example = (title, content, code, explanation = content) => ({
  title,
  content,
  code,
  explanation,
  type: 'theory',
  practiceMode: 'none',
  stepKind: 'example',
});

const practice = (content, code, explanation, requiredSnippets = []) => ({
  title: 'Q1',
  content,
  code,
  explanation,
  type: 'practice',
  evaluationMode: 'execution',
  validationMode: 'includes_all',
  requiredSnippets,
});

const question = (questionText, options, correctAnswer, explanation, questionKind) => ({
  question: questionText,
  options,
  correctAnswer,
  explanation,
  type: 'question',
  questionKind,
});

function createLesson({
  id,
  title,
  description,
  difficulty,
  baselineTime,
  category,
  projectBrief,
  steps,
}) {
  return {
    id,
    title,
    description,
    difficulty,
    baseXP: 50,
    baselineTime,
    language: 'python',
    category,
    isLocked: false,
    ...(projectBrief ? { projectBrief } : {}),
    content: {
      steps: steps.map((step) =>
        step.type === 'practice'
          ? {
              ...step,
              evaluationId: id,
            }
          : step,
      ),
    },
  };
}

export const MID_PYTHON_LESSON_OVERRIDES = {
  'python-calculator-basics': createLesson({
    id: 'python-calculator-basics',
    title: 'Project: Starter Calculator',
    description: 'Combine input, arithmetic, and conditionals to build a small calculator report.',
    difficulty: 'Beginner',
    baselineTime: 4,
    category: 'Projects',
    projectBrief: {
      goal: 'Build a two-number calculator that prints a small decision-making report.',
      inputs: ['Two integers from standard input'],
      outputs: ['Sum', 'Difference', 'Product', 'Larger value or equal'],
      skills: ['input conversion', 'arithmetic', 'multi-line output', 'if / elif / else'],
    },
    steps: [
      context('This first capstone should feel like a tiny command-line tool, not a one-line exercise. It should read real input, produce a multi-line report, and make one simple decision from the numbers it receives.'),
      example(
        'Read values',
        'Turn user input into integers before doing arithmetic.',
        `a = int(input())
b = int(input())
print(a + b)`,
        'Without int(...), input values stay as strings.',
      ),
      example(
        'Build a report',
        'A small tool usually prints more than one useful line.',
        `a = 7
b = 5
print("Sum:", a + b)
print("Difference:", a - b)
print("Product:", a * b)`,
        'One pair of inputs can drive a whole mini report.',
      ),
      example(
        'Choose the larger value',
        'Conditionals make the tool describe the input, not just calculate with it.',
        `a = 7
b = 5

if a > b:
    print("Larger:", a)
elif b > a:
    print("Larger:", b)
else:
    print("Larger: equal")`,
        'The equal case matters. Without it, tied inputs produce the wrong message.',
      ),
      practice(
        'Q1 (Coding)\nRead two integers from input. Print four lines in this exact format:\nSum: <sum>\nDifference: <difference>\nProduct: <product>\nLarger: <larger value or equal>',
        `a = int(input())
b = int(input())
print("Sum:", a + b)
print("Difference:", a - b)
print("Product:", a * b)

if a > b:
    print("Larger:", a)
elif b > a:
    print("Larger:", b)
else:
    print("Larger: equal")`,
        'Convert both inputs to integers, print the arithmetic summary, then use a conditional to report the larger value or equal.',
        ['int(input())', 'if ', 'print("Larger:"'],
      ),
      question(
        `Q2 (Predict Output)

a = 4
b = 4
print("Sum:", a + b)
print("Difference:", a - b)
print("Product:", a * b)
if a > b:
    print("Larger:", a)
elif b > a:
    print("Larger:", b)
else:
    print("Larger: equal")`,
        [
          'Sum: 8 / Difference: 0 / Product: 16 / Larger: equal',
          'Sum: 8 / Difference: 0 / Product: 16 / Larger: 4',
          'Sum: 44 / Difference: 0 / Product: 16 / Larger: equal',
          'TypeError',
        ],
        0,
        'The numbers are equal, so the arithmetic report ends with Larger: equal.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

a = input()
b = input()
print(a + b)`,
        ['5', '23', 'TypeError', 'ValueError'],
        1,
        'input() returns strings. If the user enters 2 and 3, a + b becomes "23".',
        'common-mistake',
      ),
    ],
  }),
  'python-nested-loops': createLesson({
    id: 'python-nested-loops',
    title: 'Generate Every Pair',
    description: 'Use nested loops to generate grids, coordinate pairs, and every combination of two small ranges.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Loops',
    steps: [
      context('Nested loops matter when you need every combination, not just every item. They show up in grid problems, pair comparisons, and matrix-style processing.'),
      example(
        'Coordinate grid',
        'The outer loop chooses the row and the inner loop chooses the column.',
        `for i in range(2):
    for j in range(2):
        print(i, j)`,
        'This prints four coordinate pairs: (0,0), (0,1), (1,0), and (1,1).',
      ),
      example(
        'Multiplication pairs',
        'The inner loop runs fully for each outer-loop value.',
        `for left in [1, 2]:
    for right in [3, 4]:
        print(left * right)`,
        'The products are generated for every left/right pair.',
      ),
      practice(
        'Q1 (Coding)\nRead an integer n from input. Use nested loops to print every pair i j for i and j from 0 to n - 1, one pair per line.',
        `n = int(input())

for i in range(n):
    for j in range(n):
        print(i, j)`,
        'The outer loop handles i and the inner loop handles j. Both should run from 0 up to n - 1.',
        ['for i in range', 'for j in range'],
      ),
      question(
        `Q2 (Predict Output)

for i in range(2):
    for j in range(1):
        print(i, j)`,
        ['0 0 then 1 0', '0 1 then 1 1', '0 0 only', 'IndentationError'],
        0,
        'range(2) gives 0 and 1, while range(1) gives only 0, so the pairs are 0 0 and 1 0.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

for i in range(2):
print(i)`,
        ['0 then 1', '0 only', 'IndentationError', 'SyntaxError'],
        2,
        'The loop body must be indented. Without indentation, Python raises IndentationError.',
        'common-mistake',
      ),
    ],
  }),
  'python-functions': createLesson({
    id: 'python-functions',
    title: 'Wrap Repeated Work in a Function',
    description: 'Turn repeated code into named reusable actions.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Functions',
    steps: [
      context('Functions reduce repetition and make code easier to read. Instead of copying logic, you give that logic a name and call it when you need it.'),
      example(
        'Define and call',
        'A function does nothing until you call it.',
        `def show_banner():
    print("Welcome")

show_banner()
show_banner()`,
        'The same function can run multiple times without rewriting the body.',
      ),
      example(
        'One job, clear name',
        'Good function names describe what the function does.',
        `def show_ready():
    print("Ready")

show_ready()`,
        'The name makes the program easier to read than raw repeated print lines.',
      ),
      practice(
        'Q1 (Coding)\nWrite a function named show_greeting() that prints Welcome to practice. Call it once.',
        `def show_greeting():
    print("Welcome to practice")

show_greeting()`,
        'Define the function first, then call it by name.',
        ['def show_greeting', 'show_greeting()'],
      ),
      question(
        `Q2 (Predict Output)

def show_ready():
    print("Ready")

show_ready()`,
        ['Ready', 'show_ready', 'Nothing', 'TypeError'],
        0,
        'The function is defined and then called, so it prints Ready.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def hello():
    print("Hi")`,
        ['Hi', 'Nothing', 'hello', 'NameError'],
        1,
        'Defining a function does not run it. Without hello(), nothing is printed.',
        'common-mistake',
      ),
    ],
  }),
  'python-parameters': createLesson({
    id: 'python-parameters',
    title: 'Pass Values into Functions',
    description: 'Use parameters so one function can handle many different inputs.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Functions',
    steps: [
      context('Parameters make a function reusable. Instead of hardcoding one value, the function accepts input and works with whatever you pass in.'),
      example(
        'Greet one person',
        'The parameter becomes a variable inside the function.',
        `def greet(name):
    print("Hello " + name)

greet("Alex")`,
        'name receives the value "Alex" for that function call.',
      ),
      example(
        'Use parameters in a calculation',
        'Parameters work for numbers too, not just strings.',
        `def area(width, height):
    print(width * height)

area(3, 4)`,
        'The function multiplies the two values it receives.',
      ),
      practice(
        'Q1 (Coding)\nWrite a function announce(name) that prints Hello <name>. Read a name from input and call announce(name).',
        `def announce(name):
    print("Hello " + name)

name = input().strip()
announce(name)`,
        'Define the function with one parameter, then pass the input value into it.',
        ['def announce(name)', 'announce(name)'],
      ),
      question(
        `Q2 (Predict Output)

def double(x):
    print(x * 2)

double(5)`,
        ['5', '10', '55', 'TypeError'],
        1,
        'The parameter x receives 5, so the function prints 10.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def greet(name):
    print(name)

greet()`,
        ['Nothing', 'greet', 'TypeError', 'NameError'],
        2,
        'greet() is missing the required name argument, so Python raises TypeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-return': createLesson({
    id: 'python-return',
    title: 'Project: Function Scoreboard',
    description: 'Use helper functions and return values to build a scored report with a final status.',
    difficulty: 'Intermediate',
    baselineTime: 5,
    category: 'Projects',
    projectBrief: {
      goal: 'Turn three scores into a reusable function-driven report with a final pass status.',
      inputs: ['Three integer scores'],
      outputs: ['Total', 'Average', 'Status'],
      skills: ['helper functions', 'return values', 'function reuse', 'conditionals'],
    },
    steps: [
      context('This capstone is where functions start behaving like parts of a real program. One helper computes a total, another computes an average, and another decides whether the result is strong enough.'),
      example(
        'Return a total',
        'A return statement gives the caller a reusable result.',
        `def total(a, b, c):
    return a + b + c

print(total(4, 5, 6))`,
        'The caller receives the computed value and can print or reuse it.',
      ),
      example(
        'Build an average from total',
        'One helper can reuse another instead of repeating the formula.',
        `def total(a, b, c):
    return a + b + c

def average(a, b, c):
    return total(a, b, c) / 3

print(average(4, 5, 6))`,
        'average() reuses total() and divides the result by 3.',
      ),
      example(
        'Decide the final status',
        'A report often needs a decision, not just a number.',
        `def status(a, b, c):
    if average(a, b, c) >= 60:
        return "Pass"
    return "Needs practice"`,
        'The score report becomes more useful when it turns the average into a clear outcome.',
      ),
      practice(
        'Q1 (Coding)\nCreate three functions:\n- total(a, b, c) that returns the sum of three numbers\n- average(a, b, c) that returns their average\n- status(a, b, c) that returns "Pass" if the average is at least 60, otherwise "Needs practice"\nRead three integers from input and print three lines in this exact format:\nTotal: <total>\nAverage: <average>\nStatus: <status>',
        `def total(a, b, c):
    return a + b + c

def average(a, b, c):
    return total(a, b, c) / 3

def status(a, b, c):
    if average(a, b, c) >= 60:
        return "Pass"
    return "Needs practice"

a = int(input())
b = int(input())
c = int(input())
print("Total:", total(a, b, c))
print("Average:", average(a, b, c))
print("Status:", status(a, b, c))`,
        'Use return in every helper, then print the final report from the main flow.',
        ['def total', 'def average', 'def status', 'return', 'if '],
      ),
      question(
        `Q2 (Predict Output)

def total(a, b, c):
    return a + b + c

def average(a, b, c):
    return total(a, b, c) / 3

def status(a, b, c):
    if average(a, b, c) >= 60:
        return "Pass"
    return "Needs practice"

print("Total:", total(70, 80, 90))
print("Average:", average(70, 80, 90))
print("Status:", status(70, 80, 90))`,
        [
          'Total: 240 / Average: 80.0 / Status: Pass',
          'Total: 240 / Average: 80 / Status: Pass',
          'Total: 708090 / Average: 80.0 / Status: Pass',
          'TypeError',
        ],
        0,
        'The total is 240, the average is 80.0, and the threshold makes the final status Pass.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def average(a, b, c):
    print((a + b + c) / 3)

print("Average:", average(60, 60, 60))`,
        ['Average: 60.0', 'Average: None', '60.0 then Average: None', 'TypeError'],
        2,
        'average() prints 60.0, but it returns None, so the outer print shows Average: None on the next line.',
        'common-mistake',
      ),
    ],
  }),
  'python-string-methods': createLesson({
    id: 'python-string-methods',
    title: 'Clean and Normalize Text',
    description: 'Use string methods to clean user input and convert text into consistent formats.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Strings',
    steps: [
      context('String methods are practical when input is messy. Real user text often has extra spaces, inconsistent casing, or formatting that needs cleanup before you use it.'),
      example(
        'Strip extra spaces',
        'strip() removes spaces from the start and end of a string.',
        `name = "  alex  "
print(name.strip())`,
        'This produces alex without the outer spaces.',
      ),
      example(
        'Normalize casing',
        'lower(), upper(), and title() create predictable formats.',
        `text = "pYtHoN basics"
print(text.lower())
print(text.title())`,
        'lower() makes comparisons easier and title() formats headings.',
      ),
      practice(
        'Q1 (Coding)\nRead a name from input, remove outer spaces, convert it to title case, and print the result.',
        `name = input()
print(name.strip().title())`,
        'Use strip() first, then title() on the cleaned text.',
        ['strip(', 'title('],
      ),
      question(
        `Q2 (Predict Output)

text = "python"
print(text.upper())`,
        ['python', 'PYTHON', 'Python', 'AttributeError'],
        1,
        'upper() returns the uppercase version of the string.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

text = "hello"
print(text.upper)`,
        ['HELLO', 'hello', 'function reference', 'TypeError'],
        2,
        'Without parentheses, upper is a method reference, not a method call.',
        'common-mistake',
      ),
    ],
  }),
  'python-string-operations': createLesson({
    id: 'python-string-operations',
    title: 'Split, Join, and Reshape Text',
    description: 'Break text apart and rebuild it into a more useful format.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Strings',
    steps: [
      context('String operations matter when text carries structure. A comma-separated tag list, a hyphenated code, or a phrase with multiple words often needs to be split, counted, or joined into a new shape.'),
      example(
        'Split structured text',
        'split() turns one string into multiple parts.',
        `tags = "python,loops,debug"
print(tags.split(","))`,
        'The result is a list of the tag pieces.',
      ),
      example(
        'Join pieces again',
        'join() builds one string from a list of strings.',
        `parts = ["ship", "build", "learn"]
print(" | ".join(parts))`,
        'join() controls the separator between the pieces.',
      ),
      practice(
        'Q1 (Coding)\nRead a string like a-b-c from input. Split it with "-" and print the resulting list.',
        `text = input().strip()
print(text.split("-"))`,
        'Read the input, then call split("-") on it.',
        ['split("-")'],
      ),
      question(
        `Q2 (Predict Output)

words = ["Hi", "there"]
print(" ".join(words))`,
        ['Hithere', 'Hi there', "['Hi', 'there']", 'TypeError'],
        1,
        'join() combines the list items with one space between them.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

text = "a,b"
print(text.split)`,
        ['["a", "b"]', 'a,b', 'function reference', 'AttributeError'],
        2,
        'Without parentheses, split is a method reference, not the result of calling split().',
        'common-mistake',
      ),
    ],
  }),
  'python-list-methods': createLesson({
    id: 'python-list-methods',
    title: 'Manage a List in Place',
    description: 'Use append, pop, extend, and sort to treat a list like a live data structure.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Lists',
    steps: [
      context('Lists become useful when they change over time. Instead of only reading fixed lists, you start adding items, removing items, and reshaping the list in place.'),
      example(
        'Append one new task',
        'append() adds one item to the end of the list.',
        `tasks = ["Warmup", "Arrays"]
tasks.append("Loops")
print(tasks)`,
        'Loops becomes the new last item.',
      ),
      example(
        'Extend with multiple items',
        'extend() adds several items from another list.',
        `tasks = ["Warmup"]
tasks.extend(["Arrays", "Loops"])
print(tasks)`,
        'Both new items are added to the existing list.',
      ),
      practice(
        'Q1 (Coding)\nStart with tasks = ["Warmup", "Arrays"]. Read one task name from input, append it to the list, and print the final list.',
        `tasks = ["Warmup", "Arrays"]
task = input().strip()
tasks.append(task)
print(tasks)`,
        'Read the task name, append it, then print the updated list.',
        ['append('],
      ),
      question(
        `Q2 (Predict Output)

nums = [1, 2, 3]
nums.pop()
print(nums)`,
        ['[1, 2]', '[1, 2, 3]', '3', 'TypeError'],
        0,
        'pop() removes the last item, so the list becomes [1, 2].',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = [1, 2]
print(nums.append(3))`,
        ['[1, 2, 3]', '3', 'None', 'TypeError'],
        2,
        'append() mutates the list in place and returns None.',
        'common-mistake',
      ),
    ],
  }),
  'python-nested-structures': createLesson({
    id: 'python-nested-structures',
    title: 'Access Data Inside Data',
    description: 'Navigate lists inside lists and dictionaries inside dictionaries without losing track of the path.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Data Structures',
    steps: [
      context('Nested structures show up any time one piece of data contains another. The key skill is reading the path clearly: outer container first, then the inner part you want.'),
      example(
        'Nested list',
        'A list can contain more lists.',
        `board = [[10, 20], [30, 40]]
print(board[1][0])`,
        'board[1] selects [30, 40], and [0] selects 30.',
      ),
      example(
        'Nested dictionary',
        'A dictionary value can be another dictionary.',
        `profile = {"user": {"name": "Mia"}}
print(profile["user"]["name"])`,
        'Each bracket step goes one level deeper.',
      ),
      practice(
        'Q1 (Coding)\nUse matrix = [[10, 20], [30, 40]]. Read two integers row and col from input, then print matrix[row][col].',
        `matrix = [[10, 20], [30, 40]]
row = int(input())
col = int(input())
print(matrix[row][col])`,
        'Read the row and column separately, then use them as indexes into the nested list.',
      ),
      question(
        `Q2 (Predict Output)

m = [[1, 2], [3, 4]]
print(m[0][1])`,
        ['1', '2', '3', 'IndexError'],
        1,
        'm[0] is [1, 2], and m[0][1] is 2.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

m = [[1, 2]]
print(m[1])`,
        ['[1, 2]', '2', 'None', 'IndexError'],
        3,
        'The list has only one item at index 0, so m[1] raises IndexError.',
        'common-mistake',
      ),
    ],
  }),
  'python-built-in-functions': createLesson({
    id: 'python-built-in-functions',
    title: 'Summarize Data Fast',
    description: 'Use built-in helpers to answer common data questions without writing extra loops.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Data Structures',
    steps: [
      context('Built-in functions matter because they compress common tasks into clear, reliable tools. Instead of writing extra loops for simple summaries, you can use the standard helpers directly.'),
      example(
        'Quick totals',
        'sum() and len() answer two common questions immediately.',
        `nums = [4, 8, 2]
print(sum(nums))
print(len(nums))`,
        'sum(nums) returns the total and len(nums) returns the item count.',
      ),
      example(
        'Find extremes',
        'max() and min() show the edges of the dataset.',
        `nums = [4, 8, 2]
print(max(nums))
print(min(nums))`,
        'These helpers return the largest and smallest values.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated integers from input. Print three lines in this exact format:\nSum: <sum>\nMax: <max>\nCount: <count>',
        `nums = list(map(int, input().split()))
print("Sum:", sum(nums))
print("Max:", max(nums))
print("Count:", len(nums))`,
        'Use built-in helpers directly instead of writing loops for these three summary values.',
      ),
      question(
        `Q2 (Predict Output)

nums = [4, 8, 2]
print(2 in nums)`,
        ['True', 'False', '2', 'TypeError'],
        0,
        '2 is present in the list, so the membership check returns True.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = []
print(max(nums))`,
        ['0', 'None', 'ValueError', 'IndexError'],
        2,
        'max() cannot choose a value from an empty list, so Python raises ValueError.',
        'common-mistake',
      ),
    ],
  }),
  'python-dictionaries': createLesson({
    id: 'python-dictionaries',
    title: 'Store Data by Name',
    description: 'Use dictionaries to store labeled values and retrieve them by key.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Dictionaries',
    steps: [
      context('Dictionaries are useful when values need labels instead of positions. A name like "score" or "level" is often easier to reason about than a numeric index.'),
      example(
        'Create a record',
        'A dictionary stores labeled values as key/value pairs.',
        `profile = {"name": "Alex", "level": "starter"}
print(profile)`,
        'The keys describe what each stored value means.',
      ),
      example(
        'Read one field',
        'Use the key to get the value you want.',
        `profile = {"name": "Alex", "level": "starter"}
print(profile["name"])`,
        'The key "name" returns the stored name value.',
      ),
      practice(
        'Q1 (Coding)\nRead a name from input. Create profile = {"name": <input>, "level": "starter"} and print profile["name"].',
        `name = input().strip()
profile = {"name": name, "level": "starter"}
print(profile["name"])`,
        'Build the dictionary with the input value, then retrieve the name field by key.',
        ['{"name":', 'profile["name"]'],
      ),
      question(
        `Q2 (Predict Output)

d = {"x": 1}
print(d["x"])`,
        ['x', '1', '"1"', 'KeyError'],
        1,
        'The key "x" maps to the value 1.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

print({"a": 1}["b"])`,
        ['1', 'b', 'None', 'KeyError'],
        3,
        'The key "b" is missing, so direct lookup raises KeyError.',
        'common-mistake',
      ),
    ],
  }),
  'python-dict-methods': createLesson({
    id: 'python-dict-methods',
    title: 'Use Safe Dictionary Lookups',
    description: 'Use get, keys, values, and items to inspect and access dictionaries more safely.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Dictionaries',
    steps: [
      context('Dictionary methods are useful when you need to inspect available keys or access values without crashing the program on a missing field.'),
      example(
        'Safe lookup',
        'get() returns None or a fallback instead of raising a KeyError.',
        `settings = {"theme": "dark"}
print(settings.get("theme"))
print(settings.get("mode", "missing"))`,
        'get("mode", "missing") returns the fallback because mode is not in the dictionary.',
      ),
      example(
        'Inspect the shape',
        'keys(), values(), and items() help you explore what the dictionary contains.',
        `settings = {"theme": "dark", "level": 3}
print(settings.keys())
print(settings.values())
print(settings.items())`,
        'These methods reveal the dictionary structure without needing a hardcoded key.',
      ),
      practice(
        'Q1 (Coding)\nUse settings = {"theme": "dark", "level": "starter"}. Read a key from input and print settings.get(key, "missing").',
        `settings = {"theme": "dark", "level": "starter"}
key = input().strip()
print(settings.get(key, "missing"))`,
        'Read the requested key, then use get() with a fallback of "missing".',
        ['get('],
      ),
      question(
        `Q2 (Predict Output)

d = {"a": 1}
print(d.get("a"))`,
        ['a', '1', 'None', 'KeyError'],
        1,
        'get("a") returns the stored value 1.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

settings = {"theme": "dark"}
print(settings["mode"])`,
        ['dark', 'missing', 'None', 'KeyError'],
        3,
        'Direct lookup on a missing key raises KeyError.',
        'common-mistake',
      ),
    ],
  }),
  'python-sets': createLesson({
    id: 'python-sets',
    title: 'Keep Only Unique Values',
    description: 'Use sets to remove duplicates and test membership without relying on positions.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Data Structures',
    steps: [
      context('Sets are useful when uniqueness matters more than order. They are a natural fit for tags, visited items, unique words, and quick membership checks.'),
      example(
        'Duplicates disappear',
        'A set stores each value only once.',
        `tags = {"python", "python", "loops"}
print(tags)`,
        'The repeated "python" value only appears once in the final set.',
      ),
      example(
        'Membership is the common question',
        'You usually ask whether a value is present, not what index it has.',
        `tags = {"python", "loops", "debug"}
print("loops" in tags)`,
        'Membership works, but indexing does not.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated words from input, create a set from them, and print the number of unique words.',
        `words = input().split()
unique_words = set(words)
print(len(unique_words))`,
        'Convert the list of words into a set, then print the set size.',
        ['set(', 'len('],
      ),
      question(
        `Q2 (Predict Output)

s = {1, 1, 2}
print(s)`,
        ['{1, 1, 2}', '{1, 2}', '[1, 2]', 'TypeError'],
        1,
        'The duplicate 1 is removed, so the set contains only 1 and 2.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

s = {1, 2, 3}
print(s[0])`,
        ['1', '0', 'None', 'TypeError'],
        3,
        'Sets are unordered and not subscriptable, so s[0] raises TypeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-nested-data': createLesson({
    id: 'python-nested-data',
    title: 'Traverse Nested Records',
    description: 'Read values from lists of dictionaries and dictionaries of lists without losing track of the path.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Data Structures',
    steps: [
      context('Nested data is what real program data often looks like: users with fields, lists of records, or dictionaries that contain lists. The core skill is following the path cleanly.'),
      example(
        'List of records',
        'One list can hold multiple dictionaries.',
        `users = [{"name": "Mia", "score": 80}, {"name": "Rio", "score": 95}]
print(users[1]["name"])`,
        'The path is users -> second item -> name.',
      ),
      example(
        'Dictionary of lists',
        'A dictionary can group a list under one key.',
        `report = {"scores": [80, 95, 88]}
print(report["scores"][0])`,
        'The path is report -> scores -> first item.',
      ),
      practice(
        'Q1 (Coding)\nUse users = [{"name": "Mia", "score": 80}, {"name": "Rio", "score": 95}]. Read an index from input and print users[index]["name"].',
        `users = [{"name": "Mia", "score": 80}, {"name": "Rio", "score": 95}]
index = int(input())
print(users[index]["name"])`,
        'Read the index, then use it to select the correct record before reading the name key.',
      ),
      question(
        `Q2 (Predict Output)

data = {"x": [5, 6]}
print(data["x"][1])`,
        ['5', '6', '[5, 6]', 'KeyError'],
        1,
        'data["x"] gives the list [5, 6], and index 1 selects 6.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

users = [{"name": "A"}]
print(users[1]["name"])`,
        ['A', 'name', 'None', 'IndexError'],
        3,
        'There is only one record at index 0, so users[1] raises IndexError.',
        'common-mistake',
      ),
    ],
  }),
  'python-text-analyzer-basics': createLesson({
    id: 'python-text-analyzer-basics',
    title: 'Project: Text Analyzer',
    description: 'Normalize text, count words, track unique terms, and find the longest word in a small report.',
    difficulty: 'Intermediate',
    baselineTime: 5,
    category: 'Projects',
    projectBrief: {
      goal: 'Analyze one input line and turn it into a clean text summary.',
      inputs: ['One line of text from input'],
      outputs: ['Word count', 'Unique word count', 'Keyword check', 'Longest word'],
      skills: ['lower()', 'split()', 'set()', 'loops', 'membership checks'],
    },
    steps: [
      context('This capstone should feel like a real text utility. It should normalize messy input, count useful signals, and surface one concrete insight instead of stopping at one string method.'),
      example(
        'Normalize and count',
        'Lowercasing first makes later checks more reliable.',
        `text = "Python makes practice fun"
words = text.lower().split()
print("Words:", len(words))
print("Unique words:", len(set(words)))
print("Has python:", "python" in words)`,
        'One normalized list of words can drive multiple report values.',
      ),
      example(
        'Track the longest word',
        'A loop can keep the best candidate seen so far.',
        `words = "python practice wins".split()
longest = ""

for word in words:
    if len(word) > len(longest):
        longest = word

print(longest)`,
        'longest changes only when a bigger word appears.',
      ),
      example(
        'Keep the first longest word',
        'Using > instead of >= keeps the first matching longest word in a tie.',
        `words = "build ship learn".split()
longest = ""

for word in words:
    if len(word) > len(longest):
        longest = word

print(longest)`,
        'build stays the answer because learn is not longer, only tied.',
      ),
      practice(
        'Q1 (Coding)\nRead one line of text from input. Convert it to lowercase words with split(). Use a loop to find the longest word. Print four lines in this exact format:\nWords: <word count>\nUnique words: <unique count>\nHas python: <True/False>\nLongest word: <word>',
        `text = input()
words = text.lower().split()
longest = ""

for word in words:
    if len(word) > len(longest):
        longest = word

print("Words:", len(words))
print("Unique words:", len(set(words)))
print("Has python:", "python" in words)
print("Longest word:", longest)`,
        'Normalize the input once, then reuse that word list for counting, membership, uniqueness, and longest-word tracking.',
        ['split(', 'set(', 'for ', 'len('],
      ),
      question(
        `Q2 (Predict Output)

text = "Python practice practice wins"
words = text.lower().split()
longest = ""

for word in words:
    if len(word) > len(longest):
        longest = word

print("Words:", len(words))
print("Unique words:", len(set(words)))
print("Has python:", "python" in words)
print("Longest word:", longest)`,
        [
          'Words: 4 / Unique words: 3 / Has python: True / Longest word: practice',
          'Words: 3 / Unique words: 3 / Has python: True / Longest word: wins',
          'Words: 4 / Unique words: 4 / Has python: False / Longest word: practice',
          'IndexError',
        ],
        0,
        'There are 4 words, 3 unique lowered words, python is present, and practice is the first longest word.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

text = "Python practice"
print("python" in text)`,
        ['True', 'False', 'NameError', 'AttributeError'],
        1,
        'The check is case-sensitive. "python" is not found inside "Python practice" until the text is normalized.',
        'common-mistake',
      ),
    ],
  }),
  'python-functions-advanced': createLesson({
    id: 'python-functions-advanced',
    title: 'Compose Small Functions',
    description: 'Chain helper functions together so each one does one small job well.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'Functions',
    steps: [
      context('Advanced function use is not about obscure syntax. It is about composition: one small function cleans the data, another counts or computes from that cleaned result.'),
      example(
        'One helper feeds another',
        'The second function can call the first instead of repeating its logic.',
        `def clean(text):
    return text.strip().lower()

def word_count(text):
    return len(clean(text).split())

print(word_count("  Build Ship Learn  "))`,
        'word_count() reuses clean() before splitting the text.',
      ),
      example(
        'Return, then reuse',
        'Functions become more powerful when they return values that other functions can use.',
        `def double(x):
    return x * 2

def triple_double(x):
    return double(x) * 3

print(triple_double(2))`,
        'The second function builds on the first function’s returned value.',
      ),
      practice(
        'Q1 (Coding)\nWrite two functions:\n- clean(text) that returns text.strip().lower()\n- word_count(text) that returns the number of words in clean(text)\nRead one line of text from input and print word_count(text).',
        `def clean(text):
    return text.strip().lower()

def word_count(text):
    return len(clean(text).split())

text = input()
print(word_count(text))`,
        'Return the cleaned text from clean(), then reuse that return value inside word_count().',
        ['def clean', 'def word_count', 'return'],
      ),
      question(
        `Q2 (Predict Output)

def clean(text):
    return text.strip().lower()

def word_count(text):
    return len(clean(text).split())

print(word_count("  Ship Build  "))`,
        ['1', '2', '3', 'TypeError'],
        1,
        'After strip() and split(), the text contains the two words Ship and Build.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def clean(text):
    print(text.strip().lower())

print(clean("  Hi  "))`,
        ['hi', 'None', 'hi then None', 'TypeError'],
        2,
        'clean() prints hi, but it does not return a value, so print(clean(...)) shows hi and then None.',
        'common-mistake',
      ),
    ],
  }),
  'python-scope': createLesson({
    id: 'python-scope',
    title: 'Trace Variable Scope',
    description: 'Understand which variables are local, which are global, and why some names are not visible where you expect.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'Functions',
    steps: [
      context('Scope bugs are common because a variable name may exist in one place but not another. The key question is always: where was this variable created, and is this code allowed to see it?'),
      example(
        'Read a global value',
        'A function can read a global variable when it does not create a local one with the same name.',
        `tax = 5

def add_tax(price):
    return price + tax

print(add_tax(20))`,
        'The function reads the global tax variable and adds it to the input price.',
      ),
      example(
        'Local shadows global',
        'A local variable with the same name hides the global one inside the function.',
        `x = 5

def show():
    x = 10
    print(x)

show()
print(x)`,
        'The function prints 10, but the global x outside the function stays 5.',
      ),
      practice(
        'Q1 (Coding)\nCreate a global variable tax = 5. Write a function add_tax(price) that returns price + tax. Read an integer from input and print add_tax(price).',
        `tax = 5

def add_tax(price):
    return price + tax

price = int(input())
print(add_tax(price))`,
        'Define tax outside the function, then return price + tax from inside the function.',
        ['tax = 5', 'def add_tax'],
      ),
      question(
        `Q2 (Predict Output)

x = 5

def show():
    x = 10
    print(x)

show()
print(x)`,
        ['10 then 10', '5 then 10', '10 then 5', 'NameError'],
        2,
        'The function prints the local x = 10, while the global x printed later is still 5.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def show():
    y = 10

show()
print(y)`,
        ['10', 'y', 'None', 'NameError'],
        3,
        'y only exists inside show(), so printing it outside the function raises NameError.',
        'common-mistake',
      ),
    ],
  }),
};

export const MID_PYTHON_EVALUATION_OVERRIDES = {
  'python-calculator-basics': {
    testCases: [
      { label: 'Public calculator', stdin_text: '7\n5\n' },
      { label: 'Hidden negative input', stdin_text: '10\n-4\n', hidden: true },
      { label: 'Hidden equal values', stdin_text: '9\n9\n', hidden: true },
      { label: 'Hidden zero values', stdin_text: '0\n0\n', hidden: true },
    ],
  },
  'python-nested-loops': {
    testCases: [
      { label: 'Public grid', stdin_text: '2\n' },
      { label: 'Hidden grid', stdin_text: '1\n', hidden: true },
    ],
  },
  'python-functions': {
    testCases: [
      { label: 'Public function', stdin_text: '' },
    ],
  },
  'python-parameters': {
    testCases: [
      { label: 'Public parameter', stdin_text: 'Alex\n' },
      { label: 'Hidden parameter', stdin_text: 'Mia\n', hidden: true },
    ],
  },
  'python-return': {
    testCases: [
      { label: 'Public scoreboard', stdin_text: '70\n80\n90\n' },
      { label: 'Hidden passing edge', stdin_text: '60\n60\n60\n', hidden: true },
      { label: 'Hidden needs practice', stdin_text: '20\n30\n40\n', hidden: true },
      { label: 'Hidden near-threshold miss', stdin_text: '59\n60\n60\n', hidden: true },
    ],
  },
  'python-string-methods': {
    testCases: [
      { label: 'Public clean text', stdin_text: '  alex rio  \n' },
      { label: 'Hidden clean text', stdin_text: '  python basics  \n', hidden: true },
    ],
  },
  'python-string-operations': {
    testCases: [
      { label: 'Public split', stdin_text: 'a-b-c\n' },
      { label: 'Hidden split', stdin_text: 'red-blue-green\n', hidden: true },
    ],
  },
  'python-list-methods': {
    testCases: [
      { label: 'Public append', stdin_text: 'Loops\n' },
      { label: 'Hidden append', stdin_text: 'Functions\n', hidden: true },
    ],
  },
  'python-nested-structures': {
    testCases: [
      { label: 'Public nested list', stdin_text: '1\n0\n' },
      { label: 'Hidden nested list', stdin_text: '0\n1\n', hidden: true },
    ],
  },
  'python-built-in-functions': {
    testCases: [
      { label: 'Public summary', stdin_text: '4 8 2\n' },
      { label: 'Hidden summary', stdin_text: '10 3 6 1\n', hidden: true },
    ],
  },
  'python-dictionaries': {
    testCases: [
      { label: 'Public dictionary', stdin_text: 'Alex\n' },
      { label: 'Hidden dictionary', stdin_text: 'Rio\n', hidden: true },
    ],
  },
  'python-dict-methods': {
    testCases: [
      { label: 'Public lookup', stdin_text: 'theme\n' },
      { label: 'Hidden lookup', stdin_text: 'mode\n', hidden: true },
    ],
  },
  'python-sets': {
    testCases: [
      { label: 'Public unique words', stdin_text: 'python python loops\n' },
      { label: 'Hidden unique words', stdin_text: 'ship build ship learn\n', hidden: true },
    ],
  },
  'python-nested-data': {
    testCases: [
      { label: 'Public nested record', stdin_text: '1\n' },
      { label: 'Hidden nested record', stdin_text: '0\n', hidden: true },
    ],
  },
  'python-text-analyzer-basics': {
    testCases: [
      { label: 'Public text analyzer', stdin_text: 'Python Python loops\n' },
      { label: 'Hidden mixed case', stdin_text: '  PYTHON   projects build  \n', hidden: true },
      { label: 'Hidden no keyword', stdin_text: 'Build ship learn\n', hidden: true },
      { label: 'Hidden longest-word tie', stdin_text: 'build learn ship\n', hidden: true },
    ],
  },
  'python-functions-advanced': {
    testCases: [
      { label: 'Public composition', stdin_text: '  Ship Build  \n' },
      { label: 'Hidden composition', stdin_text: '  Python practice rocks  \n', hidden: true },
    ],
  },
  'python-scope': {
    testCases: [
      { label: 'Public scope', stdin_text: '20\n' },
      { label: 'Hidden scope', stdin_text: '7\n', hidden: true },
    ],
  },
};
