const buildCases = (items = []) =>
  items.map((item) => ({
    input_json: item.input,
    stdin_text: item.stdinText,
    expected_json: item.expected,
    expected_output: item.expectedOutput,
    validator: item.validator ?? null,
    compare_mode: item.compareMode ?? null,
    hidden: Boolean(item.hidden),
    time_limit_ms: item.timeLimitMs ?? 2000,
    label: item.label,
  }));

const readStringInput = (value) => `${String(value ?? '')}\n`;
const readIntInput = (value = 0) => `${Number(value ?? 0)}\n`;
const readIntArrayInput = (values = []) => `${values.length}\n${values.join(' ')}\n`;
const readIntArrayAndTargetInput = (values = [], target = 0) => `${values.length}\n${values.join(' ')}\n${target}\n`;
const joinExpectedList = (values = []) => values.join(' ');

const normalizeSignatureWhitespace = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([<>,&\[\]\(\)])\s*/g, '$1')
    .trim();

const parseSignatureParam = (value = '') => {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.*\S)\s+([A-Za-z_]\w*)$/);
  if (!match) return null;
  return {
    raw: normalized,
    type: normalizeSignatureWhitespace(match[1]),
    name: match[2],
  };
};

const splitSignatureParams = (value = '') => {
  const params = [];
  let current = '';
  let genericDepth = 0;

  for (const char of String(value || '')) {
    if (char === '<') genericDepth += 1;
    if (char === '>') genericDepth = Math.max(0, genericDepth - 1);
    if (char === ',' && genericDepth === 0) {
      if (current.trim()) params.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) params.push(current.trim());
  return params;
};

const parseJavaSignature = (code = '') => {
  const signatureLine = String(code || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^(?:public\s+)?static\s+.+\s+solution\s*\(/.test(line));
  if (!signatureLine) return null;
  const match = signatureLine.match(/^(?:public\s+)?static\s+(.+?)\s+solution\s*\((.*)\)\s*\{$/);
  if (!match) return null;
  const returnType = normalizeSignatureWhitespace(match[1]);
  const params = splitSignatureParams(match[2]).map(parseSignatureParam);
  if (params.some((entry) => !entry)) return null;
  return { returnType, params };
};

const parseCppSignature = (code = '') => {
  const signatureLine = String(code || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /solution\s*\(/.test(line) && line.endsWith('{'));
  if (!signatureLine) return null;
  const match = signatureLine.match(/^(.+?)\s+solution\s*\((.*)\)\s*\{$/);
  if (!match) return null;
  const returnType = normalizeSignatureWhitespace(match[1]);
  const params = splitSignatureParams(match[2]).map(parseSignatureParam);
  if (params.some((entry) => !entry)) return null;
  return { returnType, params };
};

const toCompactJson = (value) => JSON.stringify(value ?? []);

const wrapJavaBenchmarkMethod = (userCode, mode) => {
  const helpers = `
  private static String readLineSafe(BufferedReader reader) throws Exception {
    String line = reader.readLine();
    return line == null ? "" : line;
  }

  private static int readIntSafe(BufferedReader reader) throws Exception {
    String line = readLineSafe(reader).trim();
    return line.isEmpty() ? 0 : Integer.parseInt(line);
  }

  private static int[] readIntArray(BufferedReader reader) throws Exception {
    String firstLine = readLineSafe(reader).trim();
    if (firstLine.isEmpty()) return new int[0];
    int length = Integer.parseInt(firstLine);
    int[] values = new int[length];
    String secondLine = readLineSafe(reader).trim();
    String[] parts = secondLine.isEmpty() ? new String[0] : secondLine.split("\\\\s+");
    for (int index = 0; index < length && index < parts.length; index += 1) {
      values[index] = Integer.parseInt(parts[index]);
    }
    return values;
  }

  private static java.util.List<String> readStringList(BufferedReader reader) throws Exception {
    int length = readIntSafe(reader);
    java.util.List<String> values = new java.util.ArrayList<>();
    for (int index = 0; index < length; index += 1) {
      values.add(readLineSafe(reader));
    }
    return values;
  }

  private static java.util.Map<String, Integer> readScoreMap(BufferedReader reader) throws Exception {
    int length = readIntSafe(reader);
    java.util.Map<String, Integer> values = new java.util.LinkedHashMap<>();
    for (int index = 0; index < length; index += 1) {
      String line = readLineSafe(reader).trim();
      if (line.isEmpty()) {
        values.put("", 0);
        continue;
      }
      int split = line.lastIndexOf(' ');
      if (split < 0) {
        values.put(line, 0);
        continue;
      }
      String key = line.substring(0, split);
      int value = Integer.parseInt(line.substring(split + 1).trim());
      values.put(key, value);
    }
    return values;
  }

  private static String jsonEscape(String value) {
    return value.replace("\\\\", "\\\\\\\\").replace("\"", "\\\\\"");
  }

  private static void printIntListJson(java.util.List<Integer> values) {
    StringBuilder output = new StringBuilder();
    output.append('[');
    for (int index = 0; index < values.size(); index += 1) {
      if (index > 0) output.append(',');
      output.append(values.get(index));
    }
    output.append(']');
    System.out.print(output.toString());
  }

  private static void printStringListJson(java.util.List<String> values) {
    StringBuilder output = new StringBuilder();
    output.append('[');
    for (int index = 0; index < values.size(); index += 1) {
      if (index > 0) output.append(',');
      output.append('"').append(jsonEscape(values.get(index))).append('"');
    }
    output.append(']');
    System.out.print(output.toString());
  }
`;

  const mainBodyByMode = {
    java_string_to_string: `String text = readLineSafe(reader);\n    System.out.print(solution(text));`,
    java_string_to_int: `String text = readLineSafe(reader);\n    System.out.print(solution(text));`,
    java_string_to_bool: `String text = readLineSafe(reader);\n    System.out.print(solution(text) ? "true" : "false");`,
    java_int_to_int: `int value = readIntSafe(reader);\n    System.out.print(solution(value));`,
    java_int_to_bool: `int value = readIntSafe(reader);\n    System.out.print(solution(value) ? "true" : "false");`,
    java_int_pair_to_int: `int left = readIntSafe(reader);\n    int right = readIntSafe(reader);\n    System.out.print(solution(left, right));`,
    java_int_array_to_int: `int[] values = readIntArray(reader);\n    System.out.print(solution(values));`,
    java_int_array_to_bool: `int[] values = readIntArray(reader);\n    System.out.print(solution(values) ? "true" : "false");`,
    java_int_array_to_list: `int[] values = readIntArray(reader);\n    printIntListJson(solution(values));`,
    java_int_array_and_target_to_int: `int[] values = readIntArray(reader);\n    int target = readIntSafe(reader);\n    System.out.print(solution(values, target));`,
    java_int_array_and_target_to_bool: `int[] values = readIntArray(reader);\n    int target = Integer.parseInt(readLineSafe(reader).trim());\n    System.out.print(solution(values, target) ? "true" : "false");`,
    java_string_list_to_int: `java.util.List<String> words = readStringList(reader);\n    System.out.print(solution(words));`,
    java_string_list_to_bool: `java.util.List<String> words = readStringList(reader);\n    System.out.print(solution(words) ? "true" : "false");`,
    java_string_list_to_string: `java.util.List<String> words = readStringList(reader);\n    System.out.print(solution(words));`,
    java_string_list_to_string_list: `java.util.List<String> words = readStringList(reader);\n    printStringListJson(solution(words));`,
    java_score_map_to_int: `java.util.Map<String, Integer> scores = readScoreMap(reader);\n    System.out.print(solution(scores));`,
  };

  return `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n${userCode}\n${helpers}\n  public static void main(String[] args) throws Exception {\n    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n    ${mainBodyByMode[mode]}\n  }\n}\n`;
};

const wrapCppBenchmarkMethod = (userCode, mode) => {
  const helpers = `
static std::string readLineSafe() {
  std::string line;
  std::getline(std::cin >> std::ws, line);
  return line;
}

static int readIntValue() {
  int value = 0;
  if (!(std::cin >> value)) return 0;
  return value;
}

static std::vector<int> readIntVector() {
  int length = 0;
  if (!(std::cin >> length)) return {};
  std::vector<int> values(length);
  for (int index = 0; index < length; index += 1) {
    std::cin >> values[index];
  }
  return values;
}

static std::vector<std::string> readStringVector() {
  int length = 0;
  if (!(std::cin >> length)) return {};
  std::string ignored;
  std::getline(std::cin, ignored);
  std::vector<std::string> values;
  for (int index = 0; index < length; index += 1) {
    std::string line;
    std::getline(std::cin, line);
    values.push_back(line);
  }
  return values;
}

static std::map<std::string, int> readScoreMap() {
  int length = 0;
  if (!(std::cin >> length)) return {};
  std::map<std::string, int> values;
  for (int index = 0; index < length; index += 1) {
    std::string key;
    int value = 0;
    std::cin >> key >> value;
    values[key] = value;
  }
  return values;
}

static std::string jsonEscape(const std::string& value) {
  std::string output;
  for (char ch : value) {
    if (ch == '\\\\' || ch == '"') output.push_back('\\\\');
    output.push_back(ch);
  }
  return output;
}

static void printIntVectorJson(const std::vector<int>& values) {
  std::cout << '[';
  for (std::size_t index = 0; index < values.size(); index += 1) {
    if (index > 0) std::cout << ',';
    std::cout << values[index];
  }
  std::cout << ']';
}

static void printStringVectorJson(const std::vector<std::string>& values) {
  std::cout << '[';
  for (std::size_t index = 0; index < values.size(); index += 1) {
    if (index > 0) std::cout << ',';
    std::cout << '"' << jsonEscape(values[index]) << '"';
  }
  std::cout << ']';
}
`;

  const mainBodyByMode = {
    cpp_string_to_string: `std::string text = readLineSafe();\n  std::cout << solution(text);`,
    cpp_string_to_int: `std::string text = readLineSafe();\n  std::cout << solution(text);`,
    cpp_string_to_bool: `std::string text = readLineSafe();\n  std::cout << (solution(text) ? "true" : "false");`,
    cpp_int_to_int: `int value = readIntValue();\n  std::cout << solution(value);`,
    cpp_int_to_bool: `int value = readIntValue();\n  std::cout << (solution(value) ? "true" : "false");`,
    cpp_int_pair_to_int: `int left = readIntValue();\n  int right = readIntValue();\n  std::cout << solution(left, right);`,
    cpp_int_vector_to_int: `std::vector<int> values = readIntVector();\n  std::cout << solution(values);`,
    cpp_int_vector_to_bool: `std::vector<int> values = readIntVector();\n  std::cout << (solution(values) ? "true" : "false");`,
    cpp_int_vector_to_list: `std::vector<int> values = readIntVector();\n  printIntVectorJson(solution(values));`,
    cpp_int_vector_and_target_to_int: `std::vector<int> values = readIntVector();\n  int target = 0;\n  std::cin >> target;\n  std::cout << solution(values, target);`,
    cpp_int_vector_and_target_to_bool: `std::vector<int> values = readIntVector();\n  int target = 0;\n  std::cin >> target;\n  std::cout << (solution(values, target) ? "true" : "false");`,
    cpp_string_vector_to_int: `std::vector<std::string> words = readStringVector();\n  std::cout << solution(words);`,
    cpp_string_vector_to_bool: `std::vector<std::string> words = readStringVector();\n  std::cout << (solution(words) ? "true" : "false");`,
    cpp_string_vector_to_string: `std::vector<std::string> words = readStringVector();\n  std::cout << solution(words);`,
    cpp_string_vector_to_list: `std::vector<std::string> words = readStringVector();\n  printStringVectorJson(solution(words));`,
    cpp_score_map_to_int: `std::map<std::string, int> scores = readScoreMap();\n  std::cout << solution(scores);`,
  };

  return `#include <bits/stdc++.h>\nusing namespace std;\n\n${userCode}\n${helpers}\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  ${mainBodyByMode[mode]}\n  return 0;\n}\n`;
};

const buildJavaBenchmarkDefinition = (mode, items = []) => ({
  language: 'java',
  prepareCode: (submittedCode) => wrapJavaBenchmarkMethod(submittedCode, mode),
  testCases: buildCases(items),
});

const buildCppBenchmarkDefinition = (mode, items = []) => ({
  language: 'cpp',
  prepareCode: (submittedCode) => wrapCppBenchmarkMethod(submittedCode, mode),
  testCases: buildCases(items),
});

const normalizeExecutionInputArgs = (params = [], input) => {
  if (params.length <= 1) return [input];
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object') {
    return params.map((param) => input[param.name]);
  }
  return [input];
};

const serializeCompiledParamInput = (paramType, value) => {
  const normalized = normalizeSignatureWhitespace(paramType);
  if (normalized === 'String' || normalized === 'const std::string&') {
    return readStringInput(value);
  }
  if (normalized === 'int') {
    return readIntInput(value);
  }
  if (normalized === 'int[]' || normalized === 'const std::vector<int>&') {
    return readIntArrayInput(Array.isArray(value) ? value : []);
  }
  if (normalized === 'java.util.List<String>' || normalized === 'const std::vector<std::string>&') {
    const items = Array.isArray(value) ? value : [];
    return `${items.length}\n${items.map((item) => String(item ?? '')).join('\n')}${items.length ? '\n' : ''}`;
  }
  if (normalized === 'java.util.Map<String,Integer>' || normalized === 'java.util.Map<String, Integer>' || normalized === 'const std::map<std::string,int>&' || normalized === 'const std::map<std::string, int>&') {
    const entries = Object.entries(value && typeof value === 'object' ? value : {});
    return `${entries.length}\n${entries.map(([key, number]) => `${key} ${Number(number ?? 0)}`).join('\n')}${entries.length ? '\n' : ''}`;
  }
  return readStringInput(value);
};

const serializeCompiledExpectedOutput = (returnType, value) => {
  const normalized = normalizeSignatureWhitespace(returnType);
  if (normalized === 'boolean' || normalized === 'bool') {
    return value ? 'true' : 'false';
  }
  if (normalized === 'int') {
    return String(Number(value ?? 0));
  }
  if (normalized === 'String' || normalized === 'std::string') {
    return String(value ?? '');
  }
  if (
    normalized === 'java.util.List<Integer>' ||
    normalized === 'std::vector<int>' ||
    normalized === 'java.util.List<String>' ||
    normalized === 'std::vector<std::string>'
  ) {
    return toCompactJson(Array.isArray(value) ? value : []);
  }
  return value == null ? '' : String(value);
};

const inferJavaBenchmarkMode = (signature) => {
  const returnType = normalizeSignatureWhitespace(signature?.returnType);
  const paramTypes = (signature?.params || []).map((param) => normalizeSignatureWhitespace(param.type));
  if (paramTypes.length === 1 && paramTypes[0] === 'String') {
    if (returnType === 'String') return 'java_string_to_string';
    if (returnType === 'int') return 'java_string_to_int';
    if (returnType === 'boolean') return 'java_string_to_bool';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'int') {
    if (returnType === 'int') return 'java_int_to_int';
    if (returnType === 'boolean') return 'java_int_to_bool';
  }
  if (paramTypes.length === 2 && paramTypes[0] === 'int' && paramTypes[1] === 'int' && returnType === 'int') {
    return 'java_int_pair_to_int';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'int[]') {
    if (returnType === 'int') return 'java_int_array_to_int';
    if (returnType === 'boolean') return 'java_int_array_to_bool';
    if (returnType === 'java.util.List<Integer>') return 'java_int_array_to_list';
  }
  if (paramTypes.length === 2 && paramTypes[0] === 'int[]' && paramTypes[1] === 'int') {
    if (returnType === 'int') return 'java_int_array_and_target_to_int';
    if (returnType === 'boolean') return 'java_int_array_and_target_to_bool';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'java.util.List<String>') {
    if (returnType === 'int') return 'java_string_list_to_int';
    if (returnType === 'boolean') return 'java_string_list_to_bool';
    if (returnType === 'String') return 'java_string_list_to_string';
    if (returnType === 'java.util.List<String>') return 'java_string_list_to_string_list';
  }
  if (paramTypes.length === 1 && (paramTypes[0] === 'java.util.Map<String, Integer>' || paramTypes[0] === 'java.util.Map<String,Integer>') && returnType === 'int') {
    return 'java_score_map_to_int';
  }
  return null;
};

const inferCppBenchmarkMode = (signature) => {
  const returnType = normalizeSignatureWhitespace(signature?.returnType);
  const paramTypes = (signature?.params || []).map((param) => normalizeSignatureWhitespace(param.type));
  if (paramTypes.length === 1 && paramTypes[0] === 'const std::string&') {
    if (returnType === 'std::string') return 'cpp_string_to_string';
    if (returnType === 'int') return 'cpp_string_to_int';
    if (returnType === 'bool') return 'cpp_string_to_bool';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'int') {
    if (returnType === 'int') return 'cpp_int_to_int';
    if (returnType === 'bool') return 'cpp_int_to_bool';
  }
  if (paramTypes.length === 2 && paramTypes[0] === 'int' && paramTypes[1] === 'int' && returnType === 'int') {
    return 'cpp_int_pair_to_int';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'const std::vector<int>&') {
    if (returnType === 'int') return 'cpp_int_vector_to_int';
    if (returnType === 'bool') return 'cpp_int_vector_to_bool';
    if (returnType === 'std::vector<int>') return 'cpp_int_vector_to_list';
  }
  if (paramTypes.length === 2 && paramTypes[0] === 'const std::vector<int>&' && paramTypes[1] === 'int') {
    if (returnType === 'int') return 'cpp_int_vector_and_target_to_int';
    if (returnType === 'bool') return 'cpp_int_vector_and_target_to_bool';
  }
  if (paramTypes.length === 1 && paramTypes[0] === 'const std::vector<std::string>&') {
    if (returnType === 'int') return 'cpp_string_vector_to_int';
    if (returnType === 'bool') return 'cpp_string_vector_to_bool';
    if (returnType === 'std::string') return 'cpp_string_vector_to_string';
    if (returnType === 'std::vector<std::string>') return 'cpp_string_vector_to_list';
  }
  if (
    paramTypes.length === 1 &&
    (paramTypes[0] === 'const std::map<std::string, int>&' ||
      paramTypes[0] === 'const std::map<std::string,int>&') &&
    returnType === 'int'
  ) {
    return 'cpp_score_map_to_int';
  }
  return null;
};

const buildCompiledBenchmarkCases = (signature, items = []) =>
  (items || []).map((item) => {
    const args = normalizeExecutionInputArgs(signature.params, item.input);
    const stdinText = signature.params
      .map((param, index) => serializeCompiledParamInput(param.type, args[index]))
      .join('');
    return {
      label: item.label,
      stdin_text: stdinText,
      expected_output:
        item.expectedOutput !== undefined
          ? String(item.expectedOutput)
          : serializeCompiledExpectedOutput(signature.returnType, item.expected),
      validator: item.validator ?? null,
      compare_mode: item.compareMode ?? null,
      hidden: Boolean(item.hidden),
      time_limit_ms: item.timeLimitMs ?? 2000,
    };
  });

const buildDynamicBenchmarkExecutionDefinition = ({
  language,
  starterCode,
  referenceCode,
  executionCases,
}) => {
  const cases = Array.isArray(executionCases) ? executionCases : [];
  if (!cases.length) return null;

  if (language === 'python' || language === 'javascript') {
    return {
      language,
      testCases: buildCases(cases),
    };
  }

  const signatureSource = String(referenceCode || starterCode || '').trim();
  if (!signatureSource) return null;

  if (language === 'java') {
    const signature = parseJavaSignature(signatureSource);
    const mode = inferJavaBenchmarkMode(signature);
    if (!signature || !mode) return null;
    return {
      language: 'java',
      prepareCode: (submittedCode) => wrapJavaBenchmarkMethod(submittedCode, mode),
      testCases: buildCompiledBenchmarkCases(signature, cases),
    };
  }

  if (language === 'cpp') {
    const signature = parseCppSignature(signatureSource);
    const mode = inferCppBenchmarkMode(signature);
    if (!signature || !mode) return null;
    return {
      language: 'cpp',
      prepareCode: (submittedCode) => wrapCppBenchmarkMethod(submittedCode, mode),
      testCases: buildCompiledBenchmarkCases(signature, cases),
    };
  }

  return null;
};

const pythonExecutionCases = {
  'bench-python-beginner-function-write-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Basic word', input: 'Ada', expected: 3 },
      { label: 'Longer word', input: 'hooks', expected: 5 },
      { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
    ]),
  },
  'bench-python-beginner-debug-code-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
      { label: 'No positives', input: [-3, -1], expected: 0 },
      { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
    ]),
  },
  'bench-python-beginner-mini-problem-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
      { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
      { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
    ]),
  },
  'bench-python-junior-write-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
      { label: 'No vowels', input: 'rhythm', expected: 0 },
      { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
    ]),
  },
  'bench-python-junior-completion-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
      { label: 'No positives', input: [-2, 0], expected: [] },
      { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
    ]),
  },
  'bench-python-junior-problem-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
      { label: 'Target missing', input: [[4, 5], 1], expected: false },
      { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
    ]),
  },
  'bench-python-junior-problem-2': {
    language: 'python',
    testCases: buildCases([
      { label: 'Palindrome', input: 'level', expected: true },
      { label: 'Not a palindrome', input: 'code', expected: false },
      { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
    ]),
  },
  'python-functions-python-implementation-intermediate-exec-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Simple string', input: 'Ada', expected: 'Hi Ada' },
      { label: 'Another name', input: 'Mina', expected: 'Hi Mina' },
      { label: 'Hidden whitespace-safe', input: 'Noah', expected: 'Hi Noah', hidden: true },
    ]),
  },
  'python-lists-python-implementation-intermediate-exec-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Basic list', input: [1, 2, 3], expected: 6 },
      { label: 'Mixed positives', input: [4, 1, 5], expected: 10 },
      { label: 'Hidden empty list', input: [], expected: 0, hidden: true },
      { label: 'Hidden negatives', input: [5, -2, 4], expected: 7, hidden: true },
    ]),
  },
  'python-functions-python-implementation-advanced-exec-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Filter short words', input: ['api', 'server', 'db'], expected: ['server'] },
      { label: 'Keep multiple', input: ['react', 'js', 'hooks'], expected: ['react', 'hooks'] },
      { label: 'Hidden no matches', input: ['a', 'to', 'be'], expected: [], hidden: true },
      { label: 'Hidden preserve order', input: ['code', 'in', 'python', 'now'], expected: ['code', 'python'], hidden: true },
    ]),
  },
  'python-functions-python-debugging-advanced-exec-1': {
    language: 'python',
    testCases: buildCases([
      { label: 'Mixed values', input: [1, 2, 4, 7], expected: 2 },
      { label: 'All odd', input: [1, 3, 5], expected: 0 },
      { label: 'Hidden all even', input: [2, 4, 6], expected: 3, hidden: true },
    ]),
  },
};

const javascriptExecutionCases = {
  'bench-js-beginner-function-write-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Basic word', input: 'Ada', expected: 3 },
      { label: 'Longer word', input: 'hooks', expected: 5 },
      { label: 'Hidden empty string', input: '', expected: 0, hidden: true },
    ]),
  },
  'bench-js-beginner-debug-code-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Mixed values', input: [1, -2, 3, 0], expected: 2 },
      { label: 'No positives', input: [-3, -1], expected: 0 },
      { label: 'Hidden all positives', input: [5, 7, 9], expected: 3, hidden: true },
    ]),
  },
  'bench-js-beginner-mini-problem-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Two values over 10', input: [5, 12, 18], expected: 2 },
      { label: 'No values over 10', input: [1, 9, 10], expected: 0 },
      { label: 'Hidden mixed list', input: [11, 12, 13, 1], expected: 3, hidden: true },
    ]),
  },
  'bench-js-junior-write-helper-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
      { label: 'No vowels', input: 'rhythm', expected: 0 },
      { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
    ]),
  },
  'bench-js-junior-complete-data-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Keep positives', input: [3, -1, 4, 0], expected: [3, 4] },
      { label: 'No positives', input: [-2, 0], expected: [] },
      { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
    ]),
  },
  'bench-js-junior-mini-problem-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
      { label: 'Target missing', input: [[4, 5], 1], expected: false },
      { label: 'Hidden empty list', input: [[], 0], expected: false, hidden: true },
    ]),
  },
  'bench-js-junior-mini-problem-2': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Palindrome', input: 'level', expected: true },
      { label: 'Not a palindrome', input: 'code', expected: false },
      { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
    ]),
  },
  'javascript-functions-1-javascript-implementation-intermediate-exec-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Simple string', input: 'Ada', expected: 'Hi Ada' },
      { label: 'Another name', input: 'Mina', expected: 'Hi Mina' },
      { label: 'Hidden another name', input: 'Noah', expected: 'Hi Noah', hidden: true },
    ]),
  },
  'javascript-arrays-1-javascript-implementation-intermediate-exec-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Basic array', input: [1, 2, 3], expected: 6 },
      { label: 'Mixed positives', input: [4, 1, 5], expected: 10 },
      { label: 'Hidden empty list', input: [], expected: 0, hidden: true },
      { label: 'Hidden negatives', input: [5, -2, 4], expected: 7, hidden: true },
    ]),
  },
  'javascript-functions-1-javascript-implementation-advanced-exec-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Filter short words', input: ['api', 'server', 'db'], expected: ['server'] },
      { label: 'Keep multiple', input: ['react', 'js', 'hooks'], expected: ['react', 'hooks'] },
      { label: 'Hidden no matches', input: ['a', 'to', 'be'], expected: [], hidden: true },
      { label: 'Hidden preserve order', input: ['code', 'in', 'javascript', 'now'], expected: ['code', 'javascript'], hidden: true },
    ]),
  },
  'javascript-functions-1-javascript-debugging-advanced-exec-1': {
    language: 'javascript',
    testCases: buildCases([
      { label: 'Mixed values', input: [1, 2, 4, 7], expected: 2 },
      { label: 'All odd', input: [1, 3, 5], expected: 0 },
      { label: 'Hidden all even', input: [2, 4, 6], expected: 3, hidden: true },
    ]),
  },
};

const javaExecutionCases = {
  'bench-java-beginner-function-completion-1': buildJavaBenchmarkDefinition('java_string_to_string', [
    { label: 'Basic greeting', stdinText: readStringInput('Ada'), expectedOutput: 'Hi Ada' },
    { label: 'Second greeting', stdinText: readStringInput('Mina'), expectedOutput: 'Hi Mina' },
    { label: 'Hidden whitespace-safe', stdinText: readStringInput('Noah'), expectedOutput: 'Hi Noah', hidden: true },
  ]),
  'bench-java-beginner-function-write-1': buildJavaBenchmarkDefinition('java_string_to_int', [
    { label: 'Basic word', stdinText: readStringInput('Ada'), expectedOutput: '3' },
    { label: 'Longer word', stdinText: readStringInput('hooks'), expectedOutput: '5' },
    { label: 'Hidden empty string', stdinText: readStringInput(''), expectedOutput: '0', hidden: true },
  ]),
  'bench-java-beginner-debug-code-1': buildJavaBenchmarkDefinition('java_int_array_to_int', [
    { label: 'Mixed values', stdinText: readIntArrayInput([1, -2, 3, 0]), expectedOutput: '2' },
    { label: 'No positives', stdinText: readIntArrayInput([-3, -1]), expectedOutput: '0' },
    { label: 'Hidden all positives', stdinText: readIntArrayInput([5, 7, 9]), expectedOutput: '3', hidden: true },
  ]),
  'bench-java-beginner-mini-problem-1': buildJavaBenchmarkDefinition('java_int_array_to_int', [
    { label: 'Two values over 10', stdinText: readIntArrayInput([5, 12, 18]), expectedOutput: '2' },
    { label: 'No values over 10', stdinText: readIntArrayInput([1, 9, 10]), expectedOutput: '0' },
    { label: 'Hidden mixed list', stdinText: readIntArrayInput([11, 12, 13, 1]), expectedOutput: '3', hidden: true },
  ]),
  'bench-java-junior-debug-code-1': buildJavaBenchmarkDefinition('java_int_array_to_int', [
    { label: 'Mixed values', stdinText: readIntArrayInput([2, 9, 4, 1]), expectedOutput: '9' },
    { label: 'All negatives', stdinText: readIntArrayInput([-8, -3, -5]), expectedOutput: '-3' },
    { label: 'Hidden descending input', stdinText: readIntArrayInput([12, 11, 3]), expectedOutput: '12', hidden: true },
  ]),
  'bench-java-junior-write-helper-1': buildJavaBenchmarkDefinition('java_string_to_int', [
    { label: 'Mixed case vowels', stdinText: readStringInput('Ada'), expectedOutput: '2' },
    { label: 'No vowels', stdinText: readStringInput('rhythm'), expectedOutput: '0' },
    { label: 'Hidden repeated vowels', stdinText: readStringInput('Queue'), expectedOutput: '4', hidden: true },
  ]),
  'bench-java-junior-complete-data-1': buildJavaBenchmarkDefinition('java_int_array_to_list', [
    { label: 'Keep positives', stdinText: readIntArrayInput([3, -1, 4, 0]), expectedOutput: joinExpectedList([3, 4]) },
    { label: 'No positives', stdinText: readIntArrayInput([-2, 0]), expectedOutput: '' },
    { label: 'Hidden preserve order', stdinText: readIntArrayInput([5, 6, -1, 2]), expectedOutput: joinExpectedList([5, 6, 2]), hidden: true },
  ]),
  'bench-java-junior-mini-problem-1': buildJavaBenchmarkDefinition('java_int_array_and_target_to_bool', [
    { label: 'Target present', stdinText: readIntArrayAndTargetInput([1, 2, 3], 2), expectedOutput: 'true' },
    { label: 'Target missing', stdinText: readIntArrayAndTargetInput([4, 5], 1), expectedOutput: 'false' },
    { label: 'Hidden empty list', stdinText: readIntArrayAndTargetInput([], 0), expectedOutput: 'false', hidden: true },
  ]),
  'bench-java-junior-mini-problem-2': buildJavaBenchmarkDefinition('java_string_to_bool', [
    { label: 'Palindrome', stdinText: readStringInput('level'), expectedOutput: 'true' },
    { label: 'Not a palindrome', stdinText: readStringInput('code'), expectedOutput: 'false' },
    { label: 'Hidden even length palindrome', stdinText: readStringInput('abba'), expectedOutput: 'true', hidden: true },
  ]),
  'java-functions-1-java-implementation-intermediate-exec-1': {
    language: 'java',
    testCases: buildCases([
      { label: 'Simple string', stdinText: 'Ada\n', expectedOutput: 'Hi Ada' },
      { label: 'Another name', stdinText: 'Mina\n', expectedOutput: 'Hi Mina' },
      { label: 'Hidden another name', stdinText: 'Noah\n', expectedOutput: 'Hi Noah', hidden: true },
    ]),
  },
  'java-arrays-1-java-implementation-intermediate-exec-1': {
    language: 'java',
    testCases: buildCases([
      { label: 'Basic list', stdinText: '3\n1 2 3\n', expectedOutput: '6' },
      { label: 'Mixed positives', stdinText: '3\n4 1 5\n', expectedOutput: '10' },
      { label: 'Hidden empty list', stdinText: '0\n\n', expectedOutput: '0', hidden: true },
      { label: 'Hidden negatives', stdinText: '3\n5 -2 4\n', expectedOutput: '7', hidden: true },
    ]),
  },
  'java-functions-1-java-implementation-advanced-exec-1': {
    language: 'java',
    testCases: buildCases([
      { label: 'Filter short words', stdinText: 'api server db\n', expectedOutput: 'server' },
      { label: 'Keep multiple', stdinText: 'react js hooks\n', expectedOutput: 'react hooks' },
      { label: 'Hidden no matches', stdinText: 'a to be\n', expectedOutput: '', hidden: true },
      { label: 'Hidden preserve order', stdinText: 'code in java now\n', expectedOutput: 'code java', hidden: true },
    ]),
  },
  'java-functions-1-java-debugging-advanced-exec-1': {
    language: 'java',
    testCases: buildCases([
      { label: 'Mixed values', stdinText: '4\n1 2 4 7\n', expectedOutput: '2' },
      { label: 'All odd', stdinText: '3\n1 3 5\n', expectedOutput: '0' },
      { label: 'Hidden all even', stdinText: '3\n2 4 6\n', expectedOutput: '3', hidden: true },
    ]),
  },
};

const cppExecutionCases = {
  'bench-cpp-beginner-function-completion-1': buildCppBenchmarkDefinition('cpp_string_to_string', [
    { label: 'Basic greeting', stdinText: readStringInput('Ada'), expectedOutput: 'Hi Ada' },
    { label: 'Second greeting', stdinText: readStringInput('Mina'), expectedOutput: 'Hi Mina' },
    { label: 'Hidden whitespace-safe', stdinText: readStringInput('Noah'), expectedOutput: 'Hi Noah', hidden: true },
  ]),
  'bench-cpp-beginner-function-write-1': buildCppBenchmarkDefinition('cpp_string_to_int', [
    { label: 'Basic word', stdinText: readStringInput('Ada'), expectedOutput: '3' },
    { label: 'Longer word', stdinText: readStringInput('hooks'), expectedOutput: '5' },
    { label: 'Hidden empty string', stdinText: readStringInput(''), expectedOutput: '0', hidden: true },
  ]),
  'bench-cpp-beginner-debug-code-1': buildCppBenchmarkDefinition('cpp_int_vector_to_int', [
    { label: 'Mixed values', stdinText: readIntArrayInput([1, -2, 3, 0]), expectedOutput: '2' },
    { label: 'No positives', stdinText: readIntArrayInput([-3, -1]), expectedOutput: '0' },
    { label: 'Hidden all positives', stdinText: readIntArrayInput([5, 7, 9]), expectedOutput: '3', hidden: true },
  ]),
  'bench-cpp-beginner-mini-problem-1': buildCppBenchmarkDefinition('cpp_int_vector_to_int', [
    { label: 'Two values over 10', stdinText: readIntArrayInput([5, 12, 18]), expectedOutput: '2' },
    { label: 'No values over 10', stdinText: readIntArrayInput([1, 9, 10]), expectedOutput: '0' },
    { label: 'Hidden mixed list', stdinText: readIntArrayInput([11, 12, 13, 1]), expectedOutput: '3', hidden: true },
  ]),
  'bench-cpp-junior-debug-code-1': buildCppBenchmarkDefinition('cpp_int_vector_to_int', [
    { label: 'Mixed values', stdinText: readIntArrayInput([2, 9, 4, 1]), expectedOutput: '9' },
    { label: 'All negatives', stdinText: readIntArrayInput([-8, -3, -5]), expectedOutput: '-3' },
    { label: 'Hidden descending input', stdinText: readIntArrayInput([12, 11, 3]), expectedOutput: '12', hidden: true },
  ]),
  'bench-cpp-junior-write-helper-1': buildCppBenchmarkDefinition('cpp_string_to_int', [
    { label: 'Mixed case vowels', stdinText: readStringInput('Ada'), expectedOutput: '2' },
    { label: 'No vowels', stdinText: readStringInput('rhythm'), expectedOutput: '0' },
    { label: 'Hidden repeated vowels', stdinText: readStringInput('Queue'), expectedOutput: '4', hidden: true },
  ]),
  'bench-cpp-junior-complete-data-1': buildCppBenchmarkDefinition('cpp_int_vector_to_list', [
    { label: 'Keep positives', stdinText: readIntArrayInput([3, -1, 4, 0]), expectedOutput: joinExpectedList([3, 4]) },
    { label: 'No positives', stdinText: readIntArrayInput([-2, 0]), expectedOutput: '' },
    { label: 'Hidden preserve order', stdinText: readIntArrayInput([5, 6, -1, 2]), expectedOutput: joinExpectedList([5, 6, 2]), hidden: true },
  ]),
  'bench-cpp-junior-mini-problem-1': buildCppBenchmarkDefinition('cpp_int_vector_and_target_to_bool', [
    { label: 'Target present', stdinText: readIntArrayAndTargetInput([1, 2, 3], 2), expectedOutput: 'true' },
    { label: 'Target missing', stdinText: readIntArrayAndTargetInput([4, 5], 1), expectedOutput: 'false' },
    { label: 'Hidden empty list', stdinText: readIntArrayAndTargetInput([], 0), expectedOutput: 'false', hidden: true },
  ]),
  'bench-cpp-junior-mini-problem-2': buildCppBenchmarkDefinition('cpp_string_to_bool', [
    { label: 'Palindrome', stdinText: readStringInput('level'), expectedOutput: 'true' },
    { label: 'Not a palindrome', stdinText: readStringInput('code'), expectedOutput: 'false' },
    { label: 'Hidden even length palindrome', stdinText: readStringInput('abba'), expectedOutput: 'true', hidden: true },
  ]),
  'cpp-functions-1-cpp-implementation-intermediate-exec-1': {
    language: 'cpp',
    testCases: buildCases([
      { label: 'Simple string', stdinText: 'Ada\n', expectedOutput: 'Hi Ada' },
      { label: 'Another name', stdinText: 'Mina\n', expectedOutput: 'Hi Mina' },
      { label: 'Hidden another name', stdinText: 'Noah\n', expectedOutput: 'Hi Noah', hidden: true },
    ]),
  },
  'cpp-vectors-1-cpp-implementation-intermediate-exec-1': {
    language: 'cpp',
    testCases: buildCases([
      { label: 'Basic list', stdinText: '3\n1 2 3\n', expectedOutput: '6' },
      { label: 'Mixed positives', stdinText: '3\n4 1 5\n', expectedOutput: '10' },
      { label: 'Hidden empty list', stdinText: '0\n\n', expectedOutput: '0', hidden: true },
      { label: 'Hidden negatives', stdinText: '3\n5 -2 4\n', expectedOutput: '7', hidden: true },
    ]),
  },
  'cpp-functions-1-cpp-implementation-advanced-exec-1': {
    language: 'cpp',
    testCases: buildCases([
      { label: 'Filter short words', stdinText: 'api server db\n', expectedOutput: 'server' },
      { label: 'Keep multiple', stdinText: 'react js hooks\n', expectedOutput: 'react hooks' },
      { label: 'Hidden no matches', stdinText: 'a to be\n', expectedOutput: '', hidden: true },
      { label: 'Hidden preserve order', stdinText: 'code in cplusplus now\n', expectedOutput: 'code cplusplus', hidden: true },
    ]),
  },
  'cpp-functions-1-cpp-debugging-advanced-exec-1': {
    language: 'cpp',
    testCases: buildCases([
      { label: 'Mixed values', stdinText: '4\n1 2 4 7\n', expectedOutput: '2' },
      { label: 'All odd', stdinText: '3\n1 3 5\n', expectedOutput: '0' },
      { label: 'Hidden all even', stdinText: '3\n2 4 6\n', expectedOutput: '3', hidden: true },
    ]),
  },
};

const benchmarkExecutionCasesByTemplateId = {
  ...pythonExecutionCases,
  ...javascriptExecutionCases,
  ...javaExecutionCases,
  ...cppExecutionCases,
};

export const getBenchmarkExecutionDefinition = (templateId) => benchmarkExecutionCasesByTemplateId[String(templateId || '').trim()] || null;
export { buildDynamicBenchmarkExecutionDefinition };
