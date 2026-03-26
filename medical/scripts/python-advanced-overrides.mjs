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

export const ADVANCED_PYTHON_LESSON_OVERRIDES = {
  'python-recursion-intro': createLesson({
    id: 'python-recursion-intro',
    title: 'Recursive Countdown',
    description: 'Build the mental model for recursive calls, shrinking input, and base cases.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Recursion',
    steps: [
      context('Recursion is useful when the same job repeats on a smaller version of the same problem. The two non-negotiable parts are a base case and a recursive step that moves toward it.'),
      example(
        'Pattern',
        'A recursive function solves one piece of the problem, then calls itself on a smaller value.',
        `def countdown(n):
    if n <= 0:
        return
    print(n)
    countdown(n - 1)

countdown(3)`,
        'The function prints the current value, then calls itself with n - 1 until the base case stops it.',
      ),
      example(
        'Trace',
        'You can read recursion as a chain of smaller calls.',
        `def echo_levels(n):
    if n == 0:
        return
    print("call", n)
    echo_levels(n - 1)

echo_levels(2)`,
        'This prints call 2, then call 1, then stops when n becomes 0.',
      ),
      practice(
        'Q1 (Coding)\nWrite a recursive function named countdown(n) that prints the numbers from n down to 1. Read an integer from input, then call countdown(n).',
        `def countdown(n):
    if n <= 0:
        return
    print(n)
    countdown(n - 1)

n = int(input())
countdown(n)`,
        'Use a base case that stops at 0 or below, then print n and recurse with n - 1.',
        ['def countdown', 'countdown(n - 1)'],
      ),
      question(
        `Q2 (Predict Output)

def countdown(n):
    if n <= 0:
        return
    print(n)
    countdown(n - 1)

countdown(2)`,
        ['2 then 1', '1 then 2', '2 only', 'RecursionError'],
        0,
        'countdown(2) prints 2, then calls countdown(1), which prints 1, then stops.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def countdown(n):
    print(n)
    countdown(n - 1)

countdown(2)`,
        ['2 then 1', 'NameError', 'RecursionError', 'SyntaxError'],
        2,
        'The function never reaches a base case, so the calls continue until Python raises RecursionError.',
        'common-mistake',
      ),
    ],
  }),
  'python-factorial': createLesson({
    id: 'python-factorial',
    title: 'Recursive Factorial',
    description: 'Use recursion to compute factorial values with a correct base case for 0 and 1.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Recursion',
    steps: [
      context('Factorial is the first recursion problem where the base case and the recursive step both have to be correct. If either one is wrong, the whole function breaks.'),
      example(
        'Core pattern',
        'Factorial multiplies n by the factorial of the next smaller value.',
        `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(4))`,
        'fact(4) becomes 4 * fact(3), then 3 * fact(2), and so on until the base case returns 1.',
      ),
      example(
        'Zero case',
        '0! must also return 1.',
        `def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(0))`,
        '0! is defined as 1, so the function must stop there too.',
      ),
      practice(
        'Q1 (Coding)\nWrite a recursive function named fact(n) that returns the factorial of n. Read an integer from input and print fact(n).',
        `def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

n = int(input())
print(fact(n))`,
        'Use n <= 1 as the base case, then return n * fact(n - 1).',
        ['def fact', 'fact(n - 1)'],
      ),
      question(
        `Q2 (Predict Output)

def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

print(fact(4))`,
        ['4', '16', '24', 'RecursionError'],
        2,
        '4! = 4 * 3 * 2 * 1 = 24.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

def fact(n):
    return n * fact(n - 1)

print(fact(3))`,
        ['6', '3', 'RecursionError', 'TypeError'],
        2,
        'There is no base case, so the function keeps calling itself until Python raises RecursionError.',
        'common-mistake',
      ),
    ],
  }),
  'python-linear-search': createLesson({
    id: 'python-linear-search',
    title: 'Search a List',
    description: 'Scan a list one item at a time and stop as soon as the target is found.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Algorithms',
    steps: [
      context('Linear search is the first search tool you should trust when the list is small or unsorted. The goal is not speed yet. The goal is reliable control flow.'),
      example(
        'Stop early',
        'Break as soon as you find the target instead of scanning the rest of the list.',
        `names = ["Mia", "Leo", "Rio", "Zoe"]
target = "Rio"

for name in names:
    if name == target:
        print("Found")
        break`,
        'This prints Found once and exits the loop immediately.',
      ),
      example(
        'Final answer',
        'A flag lets you print one final result after the loop finishes.',
        `names = ["Mia", "Leo", "Rio", "Zoe"]
target = "Ada"
found = False

for name in names:
    if name == target:
        found = True
        break

if found:
    print("Found")
else:
    print("Missing")`,
        'This pattern avoids printing Missing too early inside the loop.',
      ),
      practice(
        'Q1 (Coding)\nCreate names = ["Mia", "Leo", "Rio", "Zoe"]. Read a target name from input. Print Found if the target is in the list, otherwise print Missing.',
        `names = ["Mia", "Leo", "Rio", "Zoe"]
target = input().strip()
found = False

for name in names:
    if name == target:
        found = True
        break

if found:
    print("Found")
else:
    print("Missing")`,
        'Loop through the list, stop when you match the target, then print one final result after the loop.',
        [],
      ),
      question(
        `Q2 (Predict Output)

names = ["Mia", "Leo", "Rio"]
target = "Leo"
found = False

for name in names:
    if name == target:
        found = True
        break

if found:
    print("Found")
else:
    print("Missing")`,
        ['Found', 'Missing', 'Leo', 'NameError'],
        0,
        'The target is present, so found becomes True and the program prints Found.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

names = ["Mia", "Leo", "Rio"]
target = "Rio"

for name in names:
    if name == target:
        print("Found")
    else:
        print("Missing")`,
        ['Found', 'Missing', 'Missing, Missing, Found', 'TypeError'],
        2,
        'The else block runs for every non-match, so the loop prints Missing twice before it finally prints Found.',
        'common-mistake',
      ),
    ],
  }),
  'python-sorting': createLesson({
    id: 'python-sorting',
    title: 'Sort Real Data',
    description: 'Sort dynamic input and understand when to use sort() versus sorted().',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Algorithms',
    steps: [
      context('Sorting is one of the fastest ways to make messy input usable. The two key decisions are whether you want to change the original list and whether you understand what the method returns.'),
      example(
        'In place',
        'sort() changes the list you already have.',
        `nums = [4, 1, 3, 2]
nums.sort()
print(nums)`,
        'After sort(), nums itself becomes [1, 2, 3, 4].',
      ),
      example(
        'New copy',
        'sorted() returns a new sorted list and leaves the original alone.',
        `nums = [4, 1, 3, 2]
ordered = sorted(nums)
print(nums)
print(ordered)`,
        'nums stays unchanged, while ordered stores the sorted version.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated integers from input, store them in nums, sort them in ascending order, and print the final list.',
        `nums = list(map(int, input().split()))
nums.sort()
print(nums)`,
        'Split the input, convert each value to int, sort the list, then print it.',
        [],
      ),
      question(
        `Q2 (Predict Output)

nums = [9, 4, 7]
print(sorted(nums))`,
        ['[9, 4, 7]', '[4, 7, 9]', '9 4 7', 'None'],
        1,
        'sorted(nums) returns a new list in ascending order.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = [3, 1, 2]
print(nums.sort())`,
        ['[1, 2, 3]', 'None', 'TypeError', '[3, 1, 2]'],
        1,
        'sort() changes the list in place and returns None, so print(nums.sort()) prints None.',
        'common-mistake',
      ),
    ],
  }),
  'python-complexity-basics': createLesson({
    id: 'python-complexity-basics',
    title: 'How Loops Scale',
    description: 'Recognize the difference between direct access, one-pass loops, and nested-loop growth.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Algorithms',
    steps: [
      context('Performance starts to matter when the input grows. You do not need formal Big-O notation yet, but you do need to notice the difference between one lookup, one pass, and repeated work.'),
      example(
        'Direct access',
        'Reading one index does not scan the whole list.',
        `nums = [4, 8, 15, 16]
print(nums[0])`,
        'This grabs one value directly.',
      ),
      example(
        'One pass',
        'A single loop visits each item once.',
        `nums = [4, 8, 15, 16]
total = 0

for n in nums:
    total += n

print(total)`,
        'The work grows with the number of items because the loop touches each item once.',
      ),
      example(
        'Nested loops',
        'A loop inside a loop multiplies the amount of work.',
        `nums = [1, 2, 3]

for left in nums:
    for right in nums:
        print(left, right)`,
        'Each value on the left gets paired with every value on the right.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated integers from input, loop through them once, and print their total.',
        `nums = list(map(int, input().split()))
total = 0

for n in nums:
    total += n

print(total)`,
        'Use one loop and a running total variable.',
        [],
      ),
      question(
        `Q2 (Predict Output)

nums = [1, 2, 3]
print(nums[0])`,
        ['It scans every item in the list', 'It reads one item directly', 'It sorts the list', 'It raises IndexError'],
        1,
        'nums[0] reads one element directly. It does not scan the whole list.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

for i in nums:
    for j in nums:
        print(i, j)`,
        ['The work grows about n * n', 'The work grows about n', 'Only the inner loop matters', 'NameError'],
        0,
        'Two nested loops multiply the total amount of work, so the number of operations grows roughly like n * n.',
        'common-mistake',
      ),
    ],
  }),
  'python-two-pointers': createLesson({
    id: 'python-two-pointers',
    title: 'Pair Sum with Two Pointers',
    description: 'Use left and right indexes on a sorted list to find a target sum without nested loops.',
    difficulty: 'Advanced',
    baselineTime: 3,
    category: 'Algorithms',
    steps: [
      context('Two pointers are useful when a list is already ordered. Instead of checking every pair, you move one pointer from the left and one from the right until you either find the target or cross over.'),
      example(
        'Start at both ends',
        'Begin with one pointer at the start and one at the end.',
        `nums = [1, 3, 4, 7, 9]
l = 0
r = len(nums) - 1
print(nums[l], nums[r])`,
        'This starts with the smallest and largest values.',
      ),
      example(
        'Move the correct side',
        'If the sum is too small, move the left pointer. If the sum is too large, move the right pointer.',
        `nums = [1, 3, 4, 7, 9]
target = 10
l = 0
r = len(nums) - 1

while l < r:
    current = nums[l] + nums[r]
    if current == target:
        print("Found")
        break
    if current < target:
        l += 1
    else:
        r -= 1`,
        'This avoids the cost of trying every possible pair.',
      ),
      practice(
        'Q1 (Coding)\nUse nums = [1, 3, 4, 7, 9]. Read a target sum from input. Use a two-pointer loop to print Found if any pair adds to the target, otherwise print No pair.',
        `nums = [1, 3, 4, 7, 9]
target = int(input())
l = 0
r = len(nums) - 1
found = False

while l < r:
    current = nums[l] + nums[r]
    if current == target:
        found = True
        break
    if current < target:
        l += 1
    else:
        r -= 1

if found:
    print("Found")
else:
    print("No pair")`,
        'Set one pointer on each end, compare the current sum to the target, and move only the side that can improve the result.',
        ['while l < r', 'l += 1', 'r -= 1'],
      ),
      question(
        `Q2 (Predict Output)

nums = [1, 3, 4, 7, 9]
target = 12
l = 0
r = len(nums) - 1

while l < r:
    current = nums[l] + nums[r]
    if current == target:
        print("Found")
        break
    if current < target:
        l += 1
    else:
        r -= 1`,
        ['Found', 'No pair', '12', 'IndexError'],
        0,
        '3 + 9 becomes 12, so the loop prints Found.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = [1, 3, 4]
r = len(nums)
print(nums[r])`,
        ['4', '0', 'IndexError', 'TypeError'],
        2,
        'The last valid index is len(nums) - 1. Using len(nums) goes past the end and raises IndexError.',
        'common-mistake',
      ),
    ],
  }),
  'python-mixed-problems': createLesson({
    id: 'python-mixed-problems',
    title: 'Quick List Stats',
    description: 'Combine small built-in tools like min, max, and len to answer simple data questions quickly.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Algorithms',
    steps: [
      context('A lot of practical coding is not about a new algorithm. It is about combining a few small built-ins correctly and knowing when edge cases can break them.'),
      example(
        'Smallest and largest',
        'min() and max() answer the most basic data questions immediately.',
        `nums = [7, 2, 9]
print(min(nums))
print(max(nums))`,
        'This prints the smallest value first, then the largest.',
      ),
      example(
        'Range',
        'A list range is max minus min.',
        `nums = [7, 2, 9]
print(max(nums) - min(nums))`,
        'This measures how spread out the data is.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated integers from input and print the smallest value on one line and the largest value on the next line.',
        `nums = list(map(int, input().split()))
print(min(nums))
print(max(nums))`,
        'Convert the input into a list of ints, then print min(nums) and max(nums) on separate lines.',
      ),
      question(
        `Q2 (Predict Output)

nums = [4, 1, 8]
print(max(nums) - min(nums))`,
        ['3', '7', '8', 'ValueError'],
        1,
        'max(nums) is 8 and min(nums) is 1, so the range is 7.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = []
print(max(nums))`,
        ['0', 'None', 'ValueError', 'IndexError'],
        2,
        'max() cannot choose a largest value from an empty list, so Python raises ValueError.',
        'common-mistake',
      ),
    ],
  }),
  'python-data-processor': createLesson({
    id: 'python-data-processor',
    title: 'Project: Data Report Tool',
    description: 'Turn raw numeric input into a report with sorted values, totals, averages, and range.',
    difficulty: 'Intermediate',
    baselineTime: 5,
    category: 'Projects',
    projectBrief: {
      goal: 'Transform a raw numeric dataset into a compact summary report.',
      inputs: ['Space-separated integers from input'],
      outputs: ['Sorted list', 'Total', 'Average', 'Range'],
      skills: ['list parsing', 'sorted()', 'sum()', 'min/max', 'report formatting'],
    },
    steps: [
      context('This capstone should feel like a small reporting utility. You are taking raw numeric input and turning it into several useful signals that someone could actually read and act on.'),
      example(
        'Summarize one dataset',
        'A useful script can answer more than one question from the same numbers.',
        `nums = [2, 4, 6, 8]
print(f"Sorted: {sorted(nums)}")
print(f"Total: {sum(nums)}")
print(f"Average: {sum(nums) / len(nums)}")
print(f"Range: {max(nums) - min(nums)}")`,
        'A single list can produce a sorted view, a total, an average, and a range.',
      ),
      example(
        'Handle unsorted input',
        'The report should stay useful even when the input order is messy.',
        `nums = [3, 1, 2]
print("Sorted:", sorted(nums))
print("Total:", sum(nums))
print("Average:", sum(nums) / len(nums))
print("Range:", max(nums) - min(nums))`,
        'sorted() fixes the order, while max() and min() expose the spread.',
      ),
      example(
        'Negative values still count',
        'A real report should work on datasets that include losses or negative changes.',
        `nums = [-5, 0, 10]
print("Range:", max(nums) - min(nums))`,
        'The range is still the distance from the minimum to the maximum value.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated integers from input. Print four lines in this exact format:\nSorted: <sorted list>\nTotal: <sum>\nAverage: <average>\nRange: <range>',
        `nums = list(map(int, input().split()))
print(f"Sorted: {sorted(nums)}")
print(f"Total: {sum(nums)}")
print(f"Average: {sum(nums) / len(nums)}")
print(f"Range: {max(nums) - min(nums)}")`,
        'Parse the input once, then reuse that list to build the full four-line report.',
        ['sorted(', 'sum(', 'len(', 'max(', 'min('],
      ),
      question(
        `Q2 (Predict Output)

nums = [2, 4]
print(f"Sorted: {sorted(nums)}")
print(f"Total: {sum(nums)}")
print(f"Average: {sum(nums) / len(nums)}")
print(f"Range: {max(nums) - min(nums)}")`,
        [
          'Sorted: [2, 4] / Total: 6 / Average: 3.0 / Range: 2',
          'Sorted: [2, 4] / Total: 6 / Average: 3 / Range: 2',
          'Sorted: [4, 2] / Total: 6 / Average: 3.0 / Range: 2',
          'TypeError',
        ],
        0,
        'The list is already sorted, the total is 6, the average is 3.0, and the range is 4 - 2 = 2.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

nums = []
print(sum(nums) / len(nums))`,
        ['0', '0.0', 'ZeroDivisionError', 'ValueError'],
        2,
        'len(nums) is 0, so dividing by it raises ZeroDivisionError.',
        'common-mistake',
      ),
    ],
  }),
  'python-file-reading': createLesson({
    id: 'python-file-reading',
    title: 'Read from a File',
    description: 'Open a file safely, read its contents, and understand what happens when the file pointer moves.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'Files',
    steps: [
      context('Real programs often load saved data from a file instead of asking the user to type everything again. Safe file reading starts with opening the file correctly and knowing how each read changes the file pointer.'),
      example(
        'Read everything',
        'Use read() when you want the whole file at once.',
        `with open("data.txt", "r") as f:
    print(f.read())`,
        'The with block closes the file automatically after reading it.',
      ),
      example(
        'Read line by line',
        'A loop is useful when the file may contain many lines.',
        `with open("data.txt", "r") as f:
    for line in f:
        print(line.strip())`,
        'strip() removes the newline at the end of each line.',
      ),
      example(
        'The pointer moves',
        'After you read once, the next read starts from the new position.',
        `with open("data.txt", "r") as f:
    print(f.readline())
    print(f.readline())`,
        'Each readline() advances the file pointer to the next line.',
      ),
      practice(
        'Q1 (Coding)\nOpen data.txt in read mode and print the full file contents.',
        `with open("data.txt", "r") as f:
    print(f.read())`,
        'Use with open(..., "r") and print the result of read().',
        ['open(', 'read('],
      ),
      question(
        `Q2 (Predict Output)

Assume data.txt contains:
red
blue

with open("data.txt", "r") as f:
    print(f.readline().strip())
    print(f.readline().strip())`,
        ['red then blue', 'redred', 'blue then red', 'FileNotFoundError'],
        0,
        'The first readline() returns the first line, and the second readline() returns the next one.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

with open("missing.txt", "r") as f:
    print(f.read())`,
        ['None', 'FileNotFoundError', 'ValueError', 'TypeError'],
        1,
        'Opening a file that does not exist in read mode raises FileNotFoundError.',
        'common-mistake',
      ),
    ],
  }),
  'python-file-writing': createLesson({
    id: 'python-file-writing',
    title: 'Write and Verify a File',
    description: 'Write text to a file, reopen it, and verify what was saved.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'Files',
    steps: [
      context('File writing is useful only if you understand what happens to existing content and how to verify the saved result. A reliable script writes, then checks what was actually stored.'),
      example(
        'Overwrite vs append',
        'w starts fresh. a adds new content to the end.',
        `with open("notes.txt", "w") as f:
    f.write("Hello")

with open("notes.txt", "a") as f:
    f.write(" world")`,
        'The first write replaces old content. The append adds more text after it.',
      ),
      example(
        'Verify the write',
        'Open the file again when you want to confirm what was saved.',
        `with open("notes.txt", "w") as f:
    f.write("Done")

with open("notes.txt", "r") as f:
    print(f.read())`,
        'Reopening the file lets the program confirm the saved content.',
      ),
      practice(
        'Q1 (Coding)\nRead one line of text from input. Write it to notes.txt, reopen the file, and print the saved text.',
        `text = input()

with open("notes.txt", "w") as f:
    f.write(text)

with open("notes.txt", "r") as f:
    print(f.read())`,
        'Capture the input, write it to notes.txt, then read the file back and print it.',
        ['open(', 'write('],
      ),
      question(
        `Q2 (Predict Output)

with open("notes.txt", "w") as f:
    f.write("Hi")

with open("notes.txt", "a") as f:
    f.write("!")

with open("notes.txt", "r") as f:
    print(f.read())`,
        ['Hi', '!', 'Hi!', 'TypeError'],
        2,
        'The write saves Hi, the append adds !, and the final read prints Hi!.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

with open("notes.txt", "w") as f:
    f.write(123)`,
        ['123', '"123"', 'TypeError', 'ValueError'],
        2,
        'write() expects a string. Passing the integer 123 directly raises a TypeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-error-handling': createLesson({
    id: 'python-error-handling',
    title: 'Catch Runtime Errors',
    description: 'Use try/except to recover from common runtime failures with a clear fallback.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'Errors',
    steps: [
      context('Error handling is where scripts stop crashing on the first bad input and start behaving like software. The goal is not to hide errors. The goal is to handle expected failures intentionally.'),
      example(
        'Catch one failure',
        'Use a specific except block when you know what can go wrong.',
        `try:
    print(10 / 0)
except ZeroDivisionError:
    print("Cannot divide")`,
        'This catches division by zero and replaces the crash with a clear message.',
      ),
      example(
        'finally always runs',
        'finally is useful for cleanup and closing steps that must happen either way.',
        `try:
    print("Start")
finally:
    print("Done")`,
        'The finally block runs whether or not the try block fails.',
      ),
      practice(
        'Q1 (Coding)\nRead an integer n from input. Print 10 / n. If n is 0, catch the error and print Cannot divide instead.',
        `n = int(input())

try:
    print(10 / n)
except ZeroDivisionError:
    print("Cannot divide")`,
        'Wrap the division in try/except and catch ZeroDivisionError.',
        ['try:', 'except ZeroDivisionError'],
      ),
      question(
        `Q2 (Predict Output)

try:
    print(5)
finally:
    print("Done")`,
        ['5 then Done', 'Done only', '5 only', 'TypeError'],
        0,
        'The try block prints 5, and the finally block prints Done after it.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

print(10 / 0)`,
        ['0', 'Cannot divide', 'ZeroDivisionError', 'ValueError'],
        2,
        'Dividing by zero raises ZeroDivisionError.',
        'common-mistake',
      ),
    ],
  }),
  'python-modules': createLesson({
    id: 'python-modules',
    title: 'Import What You Need',
    description: 'Use imports correctly instead of assuming standard-library tools already exist.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Modules',
    steps: [
      context('Modules keep real programs small. Instead of rebuilding square roots, random numbers, or date tools, you import the piece you need from the standard library.'),
      example(
        'Import the module',
        'A module import keeps the function name grouped under the module.',
        `import math
print(math.sqrt(9))`,
        'math.sqrt(9) prints 3.0.',
      ),
      example(
        'Import one function',
        'You can import one name directly when that is all you need.',
        `from math import sqrt
print(sqrt(16))`,
        'This avoids writing math. before the function name.',
      ),
      practice(
        'Q1 (Coding)\nRead an integer from input. Import math and print the square root of that value.',
        `import math

n = int(input())
print(math.sqrt(n))`,
        'Import math first, then call math.sqrt(n).',
        ['import math', 'math.sqrt'],
      ),
      question(
        `Q2 (Predict Output)

from math import sqrt
print(sqrt(36))`,
        ['36', '6', '6.0', 'NameError'],
        2,
        'sqrt(36) returns 6.0.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

print(math.sqrt(9))`,
        ['3', '3.0', 'NameError', 'TypeError'],
        2,
        'math was never imported, so Python raises NameError.',
        'common-mistake',
      ),
    ],
  }),
  'python-libraries': createLesson({
    id: 'python-libraries',
    title: 'Standard Library Helpers',
    description: 'Reach for common helpers like random.choice and math.ceil instead of rebuilding them yourself.',
    difficulty: 'Intermediate',
    baselineTime: 2,
    category: 'Modules',
    steps: [
      context('The standard library exists so you can ship faster. The skill is not memorizing every function. The skill is recognizing when a library helper already solves the job.'),
      example(
        'Choose one item',
        'random.choice picks one element from a list.',
        `import random
print(random.choice(["A", "B", "C"]))`,
        'The result is one item from the list, not the whole list.',
      ),
      example(
        'Round intentionally',
        'math.ceil and math.floor round in different directions.',
        `import math
print(math.ceil(2.1))
print(math.floor(2.9))`,
        'ceil goes up and floor goes down.',
      ),
      example(
        'shuffle mutates',
        'random.shuffle changes the list in place and returns None.',
        `import random
nums = [1, 2, 3]
random.shuffle(nums)
print(nums)`,
        'The list changes, but shuffle itself does not return the shuffled list.',
      ),
      practice(
        'Q1 (Coding)\nRead space-separated words from input, store them in a list, and print one random word with random.choice().',
        `import random

words = input().split()
print(random.choice(words))`,
        'Split the input into a list, then pass that list to random.choice().',
        ['import random', 'random.choice'],
      ),
      question(
        `Q2 (Predict Output)

import math
print(math.ceil(2.1))`,
        ['2', '2.1', '3', 'TypeError'],
        2,
        'math.ceil(2.1) rounds up to 3.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

import random
nums = [1, 2, 3]
print(random.shuffle(nums))`,
        ['[1, 2, 3] in a random order', 'None', 'TypeError', 'nums'],
        1,
        'shuffle changes nums in place and returns None.',
        'common-mistake',
      ),
    ],
  }),
  'python-classes-intro': createLesson({
    id: 'python-classes-intro',
    title: 'First Object Model',
    description: 'Create a class, make an instance, and attach data to that instance.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'OOP',
    steps: [
      context('Classes let you group related data under one object. This is the first step from isolated variables toward modeling things like users, badges, counters, and profiles.'),
      example(
        'Create an instance',
        'A class is the blueprint. An instance is one real object created from it.',
        `class Badge:
    label = "Starter"

badge = Badge()
print(badge.label)`,
        'badge is one object created from the Badge class.',
      ),
      example(
        'Set instance data',
        'You can add data to one instance without changing the class definition.',
        `class Badge:
    pass

badge = Badge()
badge.label = "Champion"
print(badge.label)`,
        'This stores label on that specific instance.',
      ),
      practice(
        'Q1 (Coding)\nCreate a class named Badge. Read a name from input, create badge = Badge(), set badge.name to the input value, and print badge.name.',
        `class Badge:
    pass

name = input().strip()
badge = Badge()
badge.name = name
print(badge.name)`,
        'Create the class, build one instance, attach the name attribute, then print it.',
        ['class Badge', 'badge = Badge()', 'badge.name'],
      ),
      question(
        `Q2 (Predict Output)

class Badge:
    label = "Starter"

badge = Badge()
print(badge.label)`,
        ['Badge', 'Starter', 'label', 'AttributeError'],
        1,
        'badge.label reads the label attribute from the Badge class and prints Starter.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

class Badge:
    label = "Starter"

badge = Badge()
print(badge.name)`,
        ['Starter', 'None', 'AttributeError', 'NameError'],
        2,
        'badge has no name attribute here, so Python raises AttributeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-constructor': createLesson({
    id: 'python-constructor',
    title: 'Build Objects with __init__',
    description: 'Initialize object state at creation time with a constructor and required parameters.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'OOP',
    steps: [
      context('A constructor makes an object valid the moment it is created. This is the difference between manually patching attributes later and building the object in one clean step.'),
      example(
        'Store setup data',
        'A constructor receives input and stores it on self.',
        `class Student:
    def __init__(self, name):
        self.name = name

student = Student("Sam")
print(student.name)`,
        'The constructor copies name into student.name.',
      ),
      example(
        'Multiple fields',
        'A constructor can store more than one piece of state.',
        `class Course:
    def __init__(self, title, seats):
        self.title = title
        self.seats = seats

course = Course("Python", 30)
print(course.seats)`,
        'Both title and seats are ready as soon as the object exists.',
      ),
      practice(
        'Q1 (Coding)\nCreate a class named Student with __init__(self, name) that stores name in self.name. Read a name from input, create a Student object, and print student.name.',
        `class Student:
    def __init__(self, name):
        self.name = name

name = input().strip()
student = Student(name)
print(student.name)`,
        'Use __init__ to store the incoming name on self, then print the stored value from the created object.',
        ['def __init__', 'self.name = name'],
      ),
      question(
        `Q2 (Predict Output)

class Student:
    def __init__(self, name):
        self.name = name

student = Student("Sam")
print(student.name)`,
        ['Student', 'name', 'Sam', 'TypeError'],
        2,
        'The constructor stores "Sam" in student.name.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

class Student:
    def __init__(self, name):
        self.name = name

student = Student()
print(student.name)`,
        ['None', 'name', 'TypeError', 'AttributeError'],
        2,
        'Student() is missing the required name argument, so Python raises TypeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-methods': createLesson({
    id: 'python-methods',
    title: 'Behavior on the Object',
    description: 'Define methods that give an object actions instead of treating it as passive data only.',
    difficulty: 'Intermediate',
    baselineTime: 3,
    category: 'OOP',
    steps: [
      context('Methods are where objects become useful. A class without behavior is often just a bag of values. A method gives the object a job to do.'),
      example(
        'Simple action',
        'A method can print or calculate something when you call it on the object.',
        `class Greeter:
    def say(self):
        print("Hello")

Greeter().say()`,
        'say() is a behavior attached to the Greeter object.',
      ),
      example(
        'Method with input',
        'Methods can receive extra arguments in addition to self.',
        `class Greeter:
    def say(self, name):
        print("Hello " + name)

Greeter().say("Alex")`,
        'self is the object, and name is the extra value passed to the method.',
      ),
      practice(
        'Q1 (Coding)\nCreate a class named Greeter with a method say(self, name) that prints Hello <name>. Read a name from input and call the method.',
        `class Greeter:
    def say(self, name):
        print("Hello " + name)

name = input().strip()
Greeter().say(name)`,
        'Define the method with self and name, then call it with the input value.',
        ['def say(self, name)', '.say('],
      ),
      question(
        `Q2 (Predict Output)

class Greeter:
    def say(self, name):
        print("Hello " + name)

Greeter().say("Rio")`,
        ['Rio', 'Hello Rio', 'Greeter', 'TypeError'],
        1,
        'The method prints Hello followed by the provided name.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

class Greeter:
    def say(name):
        print("Hello " + name)

Greeter().say("Rio")`,
        ['Hello Rio', 'TypeError', 'NameError', 'AttributeError'],
        1,
        'Instance methods need self as the first parameter. Without it, the call shape is wrong and Python raises TypeError.',
        'common-mistake',
      ),
    ],
  }),
  'python-attributes-methods': createLesson({
    id: 'python-attributes-methods',
    title: 'State and Behavior Together',
    description: 'Combine stored object state with methods that make decisions from that state.',
    difficulty: 'Advanced',
    baselineTime: 3,
    category: 'OOP',
    steps: [
      context('Good object design combines stored state and behavior. The object should know enough about itself to answer useful questions through methods.'),
      example(
        'Decision from state',
        'A method can use stored data to answer a question about the object.',
        `class ScoreCard:
    def __init__(self, score):
        self.score = score

    def passed(self):
        return self.score >= 50

print(ScoreCard(75).passed())`,
        'passed() reads self.score and returns a boolean.',
      ),
      example(
        'Readable summary',
        'A second method can turn the state into a message.',
        `class ScoreCard:
    def __init__(self, score):
        self.score = score

    def summary(self):
        return "Score: " + str(self.score)

print(ScoreCard(75).summary())`,
        'Methods can return useful representations of the object state.',
      ),
      practice(
        'Q1 (Coding)\nCreate a class named ScoreCard with a constructor that stores score. Add a method passed(self) that returns True when score >= 50, otherwise False. Read an integer score from input, create the object, and print card.passed().',
        `class ScoreCard:
    def __init__(self, score):
        self.score = score

    def passed(self):
        return self.score >= 50

score = int(input())
card = ScoreCard(score)
print(card.passed())`,
        'Store the score on self, then let passed() return the comparison result.',
        ['self.score = score', 'def passed'],
      ),
      question(
        `Q2 (Predict Output)

class ScoreCard:
    def __init__(self, score):
        self.score = score

    def passed(self):
        return self.score >= 50

print(ScoreCard(40).passed())`,
        ['True', 'False', '40', 'TypeError'],
        1,
        '40 is below 50, so passed() returns False.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

class ScoreCard:
    def __init__(self, score):
        self.score = score

    def passed(self):
        return score >= 50`,
        ['False', 'NameError', 'AttributeError', 'TypeError'],
        1,
        'Inside the method, score is not a local variable. The method should use self.score, so Python raises NameError.',
        'common-mistake',
      ),
    ],
  }),
  'python-full-class-pattern': createLesson({
    id: 'python-full-class-pattern',
    title: 'Project: Practice Tracker',
    description: 'Build a stateful practice tracker that stores a goal, caps progress, and reports status clearly.',
    difficulty: 'Advanced',
    baselineTime: 6,
    category: 'Projects',
    projectBrief: {
      goal: 'Model a small object that tracks progress toward a goal without allowing invalid state.',
      inputs: ['A goal value', 'How many completion attempts to apply'],
      outputs: ['Final status string'],
      skills: ['classes', '__init__', 'instance state', 'methods', 'guarded updates'],
    },
    steps: [
      context('A full object model should store setup data, update state safely, and expose one clean status message. This capstone should feel like a tiny production object, not a class with random methods.'),
      example(
        'Store goal and progress',
        'The constructor should create valid state from the start.',
        `class PracticeTracker:
    def __init__(self, goal):
        self.goal = goal
        self.completed = 0

tracker = PracticeTracker(5)
print(tracker.goal)
print(tracker.completed)`,
        'The tracker knows both its goal and its current completed count.',
      ),
      example(
        'Cap the progress',
        'A state-changing method can guard against invalid updates.',
        `class PracticeTracker:
    def __init__(self, goal):
        self.goal = goal
        self.completed = 0

    def complete(self):
        if self.completed < self.goal:
            self.completed += 1

tracker = PracticeTracker(2)
tracker.complete()
tracker.complete()
tracker.complete()
print(tracker.completed)`,
        'The third call does nothing because the tracker is already at its goal.',
      ),
      example(
        'Expose a status string',
        'A status method turns internal state into one readable value.',
        `class PracticeTracker:
    def __init__(self, goal):
        self.goal = goal
        self.completed = 0

    def status(self):
        return str(self.completed) + "/" + str(self.goal) + " complete"

print(PracticeTracker(3).status())`,
        'The status string should describe both progress so far and the final target.',
      ),
      practice(
        'Q1 (Coding)\nCreate a class named PracticeTracker. In __init__, accept goal and store it in self.goal, and set self.completed = 0. Add a method complete(self) that increases completed by 1 only if completed is still below goal. Add a method status(self) that returns "<completed>/<goal> complete". Read two integers from input: goal and n. Create the tracker with goal, call complete() n times, and print tracker.status().',
        `class PracticeTracker:
    def __init__(self, goal):
        self.goal = goal
        self.completed = 0

    def complete(self):
        if self.completed < self.goal:
            self.completed += 1

    def status(self):
        return str(self.completed) + "/" + str(self.goal) + " complete"

goal = int(input())
n = int(input())
tracker = PracticeTracker(goal)

for _ in range(n):
    tracker.complete()

print(tracker.status())`,
        'Build the tracker with a goal, cap the progress inside complete(), then print the final progress string.',
        ['self.goal = goal', 'self.completed = 0', 'if self.completed < self.goal', 'def status(self)'],
      ),
      question(
        `Q2 (Predict Output)

class PracticeTracker:
    def __init__(self, goal):
        self.goal = goal
        self.completed = 0

    def complete(self):
        if self.completed < self.goal:
            self.completed += 1

    def status(self):
        return str(self.completed) + "/" + str(self.goal) + " complete"

tracker = PracticeTracker(2)
tracker.complete()
tracker.complete()
tracker.complete()
print(tracker.status())`,
        ['1/2 complete', '2/2 complete', '3/2 complete', 'TypeError'],
        1,
        'The tracker reaches its goal after two completions, so the extra call does not increase it past 2/2 complete.',
        'predict-output',
      ),
      question(
        `Q3 (Common Mistake)

class PracticeTracker:
    def status(self):
        return "ready"

print(PracticeTracker.status())`,
        ['ready', 'Function reference', 'TypeError', 'NameError'],
        2,
        'status() is an instance method, so calling it on the class without an instance leaves self missing and raises a TypeError.',
        'common-mistake',
      ),
    ],
  }),
};

export const ADVANCED_PYTHON_EVALUATION_OVERRIDES = {
  'python-recursion-intro': {
    testCases: [
      { label: 'Public countdown', stdin_text: '4\n' },
      { label: 'Hidden countdown', stdin_text: '2\n', hidden: true },
    ],
  },
  'python-factorial': {
    testCases: [
      { label: 'Public factorial', stdin_text: '4\n' },
      { label: 'Hidden zero', stdin_text: '0\n', hidden: true },
      { label: 'Hidden larger value', stdin_text: '5\n', hidden: true },
    ],
  },
  'python-linear-search': {
    testCases: [
      { label: 'Public found', stdin_text: 'Rio\n' },
      { label: 'Hidden missing', stdin_text: 'Ada\n', hidden: true },
    ],
  },
  'python-sorting': {
    testCases: [
      { label: 'Public sort', stdin_text: '4 1 3 2\n' },
      { label: 'Hidden sort', stdin_text: '9 5 7\n', hidden: true },
    ],
  },
  'python-complexity-basics': {
    testCases: [
      { label: 'Public total', stdin_text: '1 2 3 4\n' },
      { label: 'Hidden total', stdin_text: '5 10\n', hidden: true },
    ],
  },
  'python-two-pointers': {
    testCases: [
      { label: 'Public pair', stdin_text: '12\n' },
      { label: 'Hidden pair', stdin_text: '10\n', hidden: true },
      { label: 'Hidden no pair', stdin_text: '19\n', hidden: true },
    ],
  },
  'python-mixed-problems': {
    testCases: [
      { label: 'Public stats', stdin_text: '7 2 9\n' },
      { label: 'Hidden stats', stdin_text: '8 1 4\n', hidden: true },
    ],
  },
  'python-data-processor': {
    testCases: [
      { label: 'Public report', stdin_text: '2 4 6 8\n' },
      { label: 'Hidden unsorted report', stdin_text: '3 1 2\n', hidden: true },
      { label: 'Hidden negative values', stdin_text: '-5 10 0\n', hidden: true },
      { label: 'Hidden single value', stdin_text: '5\n', hidden: true },
    ],
  },
  'python-file-reading': {
    testCases: [
      {
        label: 'Public file',
        files: [{ path: 'data.txt', contents: 'red\nblue\n' }],
      },
      {
        label: 'Hidden file',
        files: [{ path: 'data.txt', contents: 'ship\nbuild\n' }],
        hidden: true,
      },
    ],
  },
  'python-file-writing': {
    testCases: [
      { label: 'Public write', stdin_text: 'Hello world\n' },
      { label: 'Hidden write', stdin_text: 'Ship it\n', hidden: true },
    ],
  },
  'python-error-handling': {
    testCases: [
      { label: 'Public divide', stdin_text: '2\n' },
      { label: 'Hidden divide by zero', stdin_text: '0\n', hidden: true },
    ],
  },
  'python-modules': {
    testCases: [
      { label: 'Public import', stdin_text: '25\n' },
      { label: 'Hidden import', stdin_text: '81\n', hidden: true },
    ],
  },
  'python-libraries': {
    testCases: [
      {
        label: 'Public choice',
        stdin_text: 'A B C\n',
        compare_mode: 'one_of',
        expected_json: ['A', 'B', 'C'],
      },
      {
        label: 'Hidden choice',
        stdin_text: 'Loop Build Ship\n',
        compare_mode: 'one_of',
        expected_json: ['Loop', 'Build', 'Ship'],
        hidden: true,
      },
    ],
  },
  'python-classes-intro': {
    testCases: [
      { label: 'Public class', stdin_text: 'Starter\n' },
      { label: 'Hidden class', stdin_text: 'Champion\n', hidden: true },
    ],
  },
  'python-constructor': {
    testCases: [
      { label: 'Public constructor', stdin_text: 'Sam\n' },
      { label: 'Hidden constructor', stdin_text: 'Rio\n', hidden: true },
    ],
  },
  'python-methods': {
    testCases: [
      { label: 'Public method', stdin_text: 'Alex\n' },
      { label: 'Hidden method', stdin_text: 'Mia\n', hidden: true },
    ],
  },
  'python-attributes-methods': {
    testCases: [
      { label: 'Public state', stdin_text: '75\n' },
      { label: 'Hidden state', stdin_text: '40\n', hidden: true },
    ],
  },
  'python-full-class-pattern': {
    testCases: [
      { label: 'Public tracker', stdin_text: '5\n3\n' },
      { label: 'Hidden capped tracker', stdin_text: '2\n5\n', hidden: true },
      { label: 'Hidden zero progress', stdin_text: '4\n0\n', hidden: true },
      { label: 'Hidden zero goal', stdin_text: '0\n3\n', hidden: true },
    ],
  },
};
