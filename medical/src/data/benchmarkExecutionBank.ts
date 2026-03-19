import type { LanguageSlug } from './siteContent';
import type {
  BenchmarkCalibrationState,
  BenchmarkPublicTestCase,
  BenchmarkQuestionAssessmentType,
  BenchmarkQuestionDifficulty,
} from './benchmarkModel';

export interface BenchmarkExecutionQuestionTemplate {
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
  explanation: string;
  evaluationStrategy: 'execution';
  publicTestCases: BenchmarkPublicTestCase[];
  expectedDurationSeconds?: number;
  discrimination?: number;
  version?: number;
  calibrationState?: BenchmarkCalibrationState;
}

const defineExecutionQuestions = (
  language: LanguageSlug,
  lessonId: string,
  lessonTitle: string,
  competency: string,
  difficulty: BenchmarkQuestionDifficulty,
  assessmentType: BenchmarkQuestionAssessmentType,
  variants: Array<Omit<BenchmarkExecutionQuestionTemplate, 'templateId' | 'lessonId' | 'lessonTitle' | 'competency' | 'difficulty' | 'kind' | 'assessmentType'>>
): BenchmarkExecutionQuestionTemplate[] =>
  variants.map((variant, index) => ({
    templateId: `${lessonId}-${language}-${assessmentType}-${difficulty}-exec-${index + 1}`,
    lessonId,
    lessonTitle,
    competency,
    difficulty,
    kind: 'code',
    assessmentType,
    calibrationState: 'calibrating',
    version: 1,
    ...variant,
  }));

const pythonTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(name)` so it returns `"Hi " + name`. Return the string. Do not print it.',
      starterCode: 'def solution(name):\n    # Return the greeting string\n    pass\n',
      referenceCode: 'def solution(name):\n    return "Hi " + name\n',
      explanation: 'This checks whether you can implement a small, testable function with the expected return value.',
      expectedDurationSeconds: 150,
      discrimination: 0.62,
      publicTestCases: [
        { label: 'Simple string', inputPreview: '"Ada"', expectedPreview: '"Hi Ada"' },
        { label: 'Another name', inputPreview: '"Mina"', expectedPreview: '"Hi Mina"' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-lists', 'Python Lists', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(values)` so it returns the sum of all numbers in the list.',
      starterCode: 'def solution(values):\n    total = 0\n    # add each value into total\n    return total\n',
      referenceCode: 'def solution(values):\n    total = 0\n    for value in values:\n        total += value\n    return total\n',
      explanation: 'This checks list iteration and accumulation using real tests instead of pattern matching.',
      expectedDurationSeconds: 210,
      discrimination: 0.7,
      publicTestCases: [
        { label: 'Basic list', inputPreview: '[1, 2, 3]', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '[4, 1, 5]', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt: 'Implement `solution(words)` so it returns a new list containing only the words with length greater than 3.',
      starterCode: 'def solution(words):\n    result = []\n    # keep only words longer than 3\n    return result\n',
      referenceCode:
        'def solution(words):\n    result = []\n    for word in words:\n        if len(word) > 3:\n            result.append(word)\n    return result\n',
      explanation: 'This checks filtering logic and output structure under multiple test cases.',
      expectedDurationSeconds: 300,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: '["api", "server", "db"]', expectedPreview: '["server"]' },
        { label: 'Keep multiple', inputPreview: '["react", "js", "hooks"]', expectedPreview: '["react", "hooks"]' },
      ],
    },
  ]),
  ...defineExecutionQuestions('python', 'python-functions', 'Python Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix `solution(values)` so it returns the count of even numbers in the list.',
      starterCode:
        'def solution(values):\n    count = 0\n    for value in values:\n        if value % 2 == 1:\n            count += 1\n    return count\n',
      referenceCode:
        'def solution(values):\n    count = 0\n    for value in values:\n        if value % 2 == 0:\n            count += 1\n    return count\n',
      explanation: 'This checks whether the learner can inspect and repair logic instead of writing from scratch.',
      expectedDurationSeconds: 240,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '[1, 2, 4, 7]', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '[1, 3, 5]', expectedPreview: '0' },
      ],
    },
  ]),
];

const javascriptTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(name)` so it returns `"Hi " + name`. Return the string. Do not log it.',
      starterCode: 'function solution(name) {\n  // Return the greeting string\n}\n',
      referenceCode: 'function solution(name) {\n  return "Hi " + name;\n}\n',
      explanation: 'This checks small function implementation with real test execution.',
      expectedDurationSeconds: 150,
      discrimination: 0.62,
      publicTestCases: [
        { label: 'Simple string', inputPreview: '"Ada"', expectedPreview: '"Hi Ada"' },
        { label: 'Another name', inputPreview: '"Mina"', expectedPreview: '"Hi Mina"' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-arrays-1', 'JavaScript Arrays', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Implement `solution(values)` so it returns the sum of all numbers in the array.',
      starterCode: 'function solution(values) {\n  let total = 0;\n  return total;\n}\n',
      referenceCode:
        'function solution(values) {\n  let total = 0;\n  for (const value of values) {\n    total += value;\n  }\n  return total;\n}\n',
      explanation: 'This checks iteration and accumulation under multiple test cases.',
      expectedDurationSeconds: 210,
      discrimination: 0.7,
      publicTestCases: [
        { label: 'Basic array', inputPreview: '[1, 2, 3]', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '[4, 1, 5]', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt:
        'Implement `solution(words)` so it returns a new array containing only the strings with length greater than 3.',
      starterCode: 'function solution(words) {\n  const result = [];\n  return result;\n}\n',
      referenceCode:
        'function solution(words) {\n  const result = [];\n  for (const word of words) {\n    if (word.length > 3) {\n      result.push(word);\n    }\n  }\n  return result;\n}\n',
      explanation: 'This checks filtering logic, array handling, and result order under hidden tests.',
      expectedDurationSeconds: 300,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: '["api", "server", "db"]', expectedPreview: '["server"]' },
        { label: 'Keep multiple', inputPreview: '["react", "js", "hooks"]', expectedPreview: '["react", "hooks"]' },
      ],
    },
  ]),
  ...defineExecutionQuestions('javascript', 'javascript-functions-1', 'JavaScript Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix `solution(values)` so it returns the count of even numbers in the array.',
      starterCode:
        'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value % 2 === 1) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
      referenceCode:
        'function solution(values) {\n  let count = 0;\n  for (const value of values) {\n    if (value % 2 === 0) {\n      count += 1;\n    }\n  }\n  return count;\n}\n',
      explanation: 'This checks debugging of a realistic logic defect with public and hidden tests.',
      expectedDurationSeconds: 240,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '[1, 2, 4, 7]', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '[1, 3, 5]', expectedPreview: '0' },
      ],
    },
  ]),
];

const javaTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('java', 'java-functions-1', 'Java Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Complete the Java program so it reads one name from stdin and prints `Hi <name>`.',
      starterCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    String name = scanner.nextLine().trim();\n    // print the greeting\n  }\n}\n',
      referenceCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    String name = scanner.nextLine().trim();\n    System.out.println("Hi " + name);\n  }\n}\n',
      explanation: 'This checks whether the learner can finish a small Java program under real execution.',
      expectedDurationSeconds: 180,
      discrimination: 0.64,
      publicTestCases: [
        { label: 'Simple string', inputPreview: 'Ada', expectedPreview: 'Hi Ada' },
        { label: 'Another name', inputPreview: 'Mina', expectedPreview: 'Hi Mina' },
      ],
    },
  ]),
  ...defineExecutionQuestions('java', 'java-arrays-1', 'Java Arrays', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Complete the Java program so it reads `n` and then `n` integers, and prints their sum.',
      starterCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n      int value = scanner.nextInt();\n      // add each value into total\n    }\n    System.out.println(total);\n  }\n}\n',
      referenceCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n      int value = scanner.nextInt();\n      total += value;\n    }\n    System.out.println(total);\n  }\n}\n',
      explanation: 'This checks iteration, integer parsing, and accumulation using executed tests.',
      expectedDurationSeconds: 240,
      discrimination: 0.72,
      publicTestCases: [
        { label: 'Basic list', inputPreview: '3\\n1 2 3', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '3\\n4 1 5', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('java', 'java-functions-1', 'Java Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt:
        'Complete the Java program so it reads a line of space-separated words and prints only the words longer than 3 characters, separated by spaces.',
      starterCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    String[] words = scanner.nextLine().trim().split(\"\\\\s+\");\n    List<String> result = new ArrayList<>();\n    // keep only words longer than 3 characters\n    System.out.println(String.join(\" \", result));\n  }\n}\n',
      referenceCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    String line = scanner.nextLine().trim();\n    if (line.isEmpty()) {\n      System.out.println(\"\");\n      return;\n    }\n    String[] words = line.split(\"\\\\s+\");\n    List<String> result = new ArrayList<>();\n    for (String word : words) {\n      if (word.length() > 3) {\n        result.add(word);\n      }\n    }\n    System.out.println(String.join(\" \", result));\n  }\n}\n',
      explanation: 'This checks filtering, iteration, and output formatting under hidden tests.',
      expectedDurationSeconds: 330,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: 'api server db', expectedPreview: 'server' },
        { label: 'Keep multiple', inputPreview: 'react js hooks', expectedPreview: 'react hooks' },
      ],
    },
  ]),
  ...defineExecutionQuestions('java', 'java-functions-1', 'Java Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix the Java program so it prints the count of even numbers after reading `n` and then `n` integers.',
      starterCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n      int value = scanner.nextInt();\n      if (value % 2 == 1) {\n        count += 1;\n      }\n    }\n    System.out.println(count);\n  }\n}\n',
      referenceCode:
        'import java.util.*;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n      int value = scanner.nextInt();\n      if (value % 2 == 0) {\n        count += 1;\n      }\n    }\n    System.out.println(count);\n  }\n}\n',
      explanation: 'This checks debugging of a logic flaw in a compiled Java task.',
      expectedDurationSeconds: 270,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '4\\n1 2 4 7', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '3\\n1 3 5', expectedPreview: '0' },
      ],
    },
  ]),
];

const cppTemplates: BenchmarkExecutionQuestionTemplate[] = [
  ...defineExecutionQuestions('cpp', 'cpp-functions-1', 'C++ Functions', 'Functions', 'intermediate', 'implementation', [
    {
      prompt: 'Complete the C++ program so it reads one name from stdin and prints `Hi <name>`.',
      starterCode:
        '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string name;\n  getline(cin, name);\n  // print the greeting\n  return 0;\n}\n',
      referenceCode:
        '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n  string name;\n  getline(cin, name);\n  cout << "Hi " << name << "\\n";\n  return 0;\n}\n',
      explanation: 'This checks a small compiled C++ task with real stdin/stdout behavior.',
      expectedDurationSeconds: 180,
      discrimination: 0.64,
      publicTestCases: [
        { label: 'Simple string', inputPreview: 'Ada', expectedPreview: 'Hi Ada' },
        { label: 'Another name', inputPreview: 'Mina', expectedPreview: 'Hi Mina' },
      ],
    },
  ]),
  ...defineExecutionQuestions('cpp', 'cpp-vectors-1', 'C++ Vectors', 'Collections', 'intermediate', 'implementation', [
    {
      prompt: 'Complete the C++ program so it reads `n` and then `n` integers, and prints their sum.',
      starterCode:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n;\n  cin >> n;\n  int total = 0;\n  for (int i = 0; i < n; i++) {\n    int value;\n    cin >> value;\n    // add each value into total\n  }\n  cout << total << "\\n";\n  return 0;\n}\n',
      referenceCode:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n;\n  cin >> n;\n  int total = 0;\n  for (int i = 0; i < n; i++) {\n    int value;\n    cin >> value;\n    total += value;\n  }\n  cout << total << "\\n";\n  return 0;\n}\n',
      explanation: 'This checks loop correctness and accumulation in executed C++ code.',
      expectedDurationSeconds: 240,
      discrimination: 0.72,
      publicTestCases: [
        { label: 'Basic list', inputPreview: '3\\n1 2 3', expectedPreview: '6' },
        { label: 'Mixed positives', inputPreview: '3\\n4 1 5', expectedPreview: '10' },
      ],
    },
  ]),
  ...defineExecutionQuestions('cpp', 'cpp-functions-1', 'C++ Functions', 'Problem solving', 'advanced', 'implementation', [
    {
      prompt:
        'Complete the C++ program so it reads a line of space-separated words and prints only the words longer than 3 characters, separated by spaces.',
      starterCode:
        '#include <iostream>\n#include <sstream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n  string line;\n  getline(cin, line);\n  stringstream ss(line);\n  string word;\n  vector<string> result;\n  while (ss >> word) {\n    // keep only words longer than 3 characters\n  }\n  for (size_t i = 0; i < result.size(); i++) {\n    if (i) cout << " ";\n    cout << result[i];\n  }\n  cout << "\\n";\n  return 0;\n}\n',
      referenceCode:
        '#include <iostream>\n#include <sstream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n  string line;\n  getline(cin, line);\n  stringstream ss(line);\n  string word;\n  vector<string> result;\n  while (ss >> word) {\n    if (word.size() > 3) {\n      result.push_back(word);\n    }\n  }\n  for (size_t i = 0; i < result.size(); i++) {\n    if (i) cout << " ";\n    cout << result[i];\n  }\n  cout << "\\n";\n  return 0;\n}\n',
      explanation: 'This checks filtering and output formatting under executed benchmark tests.',
      expectedDurationSeconds: 330,
      discrimination: 0.82,
      publicTestCases: [
        { label: 'Filter short words', inputPreview: 'api server db', expectedPreview: 'server' },
        { label: 'Keep multiple', inputPreview: 'react js hooks', expectedPreview: 'react hooks' },
      ],
    },
  ]),
  ...defineExecutionQuestions('cpp', 'cpp-functions-1', 'C++ Functions', 'Problem solving', 'advanced', 'debugging', [
    {
      prompt: 'Fix the C++ program so it prints the count of even numbers after reading `n` and then `n` integers.',
      starterCode:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n;\n  cin >> n;\n  int count = 0;\n  for (int i = 0; i < n; i++) {\n    int value;\n    cin >> value;\n    if (value % 2 == 1) {\n      count += 1;\n    }\n  }\n  cout << count << "\\n";\n  return 0;\n}\n',
      referenceCode:
        '#include <iostream>\nusing namespace std;\n\nint main() {\n  int n;\n  cin >> n;\n  int count = 0;\n  for (int i = 0; i < n; i++) {\n    int value;\n    cin >> value;\n    if (value % 2 == 0) {\n      count += 1;\n    }\n  }\n  cout << count << "\\n";\n  return 0;\n}\n',
      explanation: 'This checks debugging of a logic defect in a timed C++ task.',
      expectedDurationSeconds: 270,
      discrimination: 0.78,
      publicTestCases: [
        { label: 'Mixed values', inputPreview: '4\\n1 2 4 7', expectedPreview: '2' },
        { label: 'All odd', inputPreview: '3\\n1 3 5', expectedPreview: '0' },
      ],
    },
  ]),
];

export const benchmarkExecutionBankByLanguage: Record<LanguageSlug, BenchmarkExecutionQuestionTemplate[]> = {
  python: pythonTemplates,
  javascript: javascriptTemplates,
  java: javaTemplates,
  cpp: cppTemplates,
  multi: [],
};
