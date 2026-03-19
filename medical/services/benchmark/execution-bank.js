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

const pythonExecutionCases = {
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
