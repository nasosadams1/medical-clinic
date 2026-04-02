const normalizeSeedQuestion = (template) => ({
  ...template,
  sourceType: template.sourceType ?? 'generated',
  calibrationState: template.calibrationState ?? 'calibrating',
  version: Math.max(3, template.version ?? 3),
  expectedDurationSeconds: template.expectedDurationSeconds ?? 120,
  discrimination: template.discrimination ?? 0.68,
  remediationLessonIds:
    template.remediationLessonIds && template.remediationLessonIds.length > 0
      ? template.remediationLessonIds
      : [template.lessonId],
  remediationPracticeLabel:
    template.remediationPracticeLabel || `Rework ${template.lessonTitle} before the retake.`,
  remediationProjectCheckpointId:
    template.remediationProjectCheckpointId ??
    (template.lessonTitle.toLowerCase().includes('project') ? template.lessonId : null),
  evaluationStrategy:
    template.kind === 'multiple_choice'
      ? 'choice'
      : template.evaluationStrategy ?? (template.executionCases?.length ? 'execution' : 'typing'),
});

const defineChoiceSeedQuestion = (template) =>
  normalizeSeedQuestion({
    ...template,
    kind: 'multiple_choice',
  });

const defineCodeSeedQuestion = (template) =>
  normalizeSeedQuestion({
    ...template,
    kind: 'code',
  });

const cheapDistractorValues = new Set(['error', 'nothing', 'undefined', 'nan', 'null']);

const lesson = (lessonId, lessonTitle) => ({ lessonId, lessonTitle });

const languageConfigs = [
  {
    language: 'python',
    prefix: 'python',
    beginnerPackId: 'python-beginner-fundamentals',
    juniorPackId: 'python-junior-interview-prep',
    lessons: {
      beginner: {
        syntaxOutput: lesson('python-first-output', 'First Output'),
        typesRead: lesson('python-variables-2', 'Variables and Basic Types'),
        flowTrace: lesson('python-if-statements', 'Booleans and Conditionals'),
        dsRead: lesson('python-lists', 'Lists'),
        functionCompletion: lesson('python-functions', 'Functions'),
        functionWrite: lesson('python-functions', 'Functions'),
        debugFix: lesson('python-debugging-basics', 'Debugging Basics'),
        debugCode: lesson('python-debugging-basics', 'Debugging Basics'),
        miniProblem: lesson('python-project-1', 'Project 1: Console Toolkit'),
        pressureRead: lesson('python-loops', 'Loops'),
      },
      junior: {
        readFast: lesson('python-loops', 'Loops'),
        predictOutput: lesson('python-dictionaries', 'Dictionaries'),
        bestFix: lesson('python-debugging-basics', 'Debugging Basics'),
        debugCode: lesson('python-debugging-basics', 'Debugging Basics'),
        writeHelper: lesson('python-functions', 'Functions'),
        completeData: lesson('python-data-structures', 'Data Structures'),
        dsRead: lesson('python-data-structures', 'Data Structures'),
        flowRead: lesson('python-loops', 'Loops'),
        miniProblem: lesson('python-algorithms', 'Algorithms'),
        miniProblem2: lesson('python-algorithms', 'Algorithms'),
        pressureRead: lesson('python-data-structures', 'Data Structures'),
        pressureFix: lesson('python-debugging-basics', 'Debugging Basics'),
      },
    },
  },
  {
    language: 'javascript',
    prefix: 'js',
    beginnerPackId: 'javascript-beginner-fundamentals',
    juniorPackId: 'javascript-junior-interview-prep',
    lessons: {
      beginner: {
        syntaxOutput: lesson('javascript-strings-1', 'Strings and Template Literals'),
        typesRead: lesson('javascript-numbers-1', 'Numbers, Math, and Type Conversion'),
        flowTrace: lesson('javascript-conditionals-1', 'Conditional Logic'),
        dsRead: lesson('javascript-arrays-1', 'Arrays'),
        functionCompletion: lesson('javascript-functions-1', 'Functions'),
        functionWrite: lesson('javascript-functions-1', 'Functions'),
        debugFix: lesson('javascript-debugging-1', 'Debugging with the Browser Console'),
        debugCode: lesson('javascript-debugging-1', 'Debugging with the Browser Console'),
        miniProblem: lesson('javascript-project-1', 'Project 1: Build a Simple JavaScript Calculator'),
        pressureRead: lesson('javascript-loops-1', 'Loops'),
      },
      junior: {
        readFast: lesson('javascript-arrays-1', 'Arrays'),
        predictOutput: lesson('javascript-objects-1', 'Objects'),
        bestFix: lesson('javascript-debugging-1', 'Debugging with the Browser Console'),
        debugCode: lesson('javascript-debugging-1', 'Debugging with the Browser Console'),
        writeHelper: lesson('javascript-functions-1', 'Functions'),
        completeData: lesson('javascript-arrays-1', 'Arrays'),
        dsRead: lesson('javascript-objects-1', 'Objects'),
        flowRead: lesson('javascript-loops-1', 'Loops'),
        miniProblem: lesson('javascript-higher-order-1', 'Higher-Order Functions and Callbacks'),
        miniProblem2: lesson('javascript-strings-1', 'Strings and Template Literals'),
        pressureRead: lesson('javascript-arrays-1', 'Arrays'),
        pressureFix: lesson('javascript-debugging-1', 'Debugging with the Browser Console'),
      },
    },
  },
  {
    language: 'java',
    prefix: 'java',
    beginnerPackId: 'java-beginner-oop-foundations',
    juniorPackId: 'java-junior-class-ds-prep',
    lessons: {
      beginner: {
        syntaxOutput: lesson('java-intro-1', 'What Java Is, the JDK, and Your First Program'),
        typesRead: lesson('java-variables-1', 'Variables and Primitive Data Types'),
        flowTrace: lesson('java-conditionals-1', 'Conditional Logic'),
        dsRead: lesson('java-arrays-1', 'Arrays and Basic Problem Solving'),
        functionCompletion: lesson('java-methods-1', 'Methods'),
        functionWrite: lesson('java-methods-1', 'Methods'),
        debugFix: lesson('java-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        debugCode: lesson('java-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        miniProblem: lesson('java-project-1', 'Project 1: Build a Console Calculator and Number Toolkit'),
        pressureRead: lesson('java-loops-1', 'Loops'),
      },
      junior: {
        readFast: lesson('java-arraylist-1', 'Lists and ArrayList'),
        predictOutput: lesson('java-maps-1', 'Sets, Maps, Queues, and Choosing the Right Collection'),
        bestFix: lesson('java-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        debugCode: lesson('java-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        writeHelper: lesson('java-methods-1', 'Methods'),
        completeData: lesson('java-arraylist-1', 'Lists and ArrayList'),
        dsRead: lesson('java-maps-1', 'Sets, Maps, Queues, and Choosing the Right Collection'),
        flowRead: lesson('java-loops-1', 'Loops'),
        miniProblem: lesson('java-project-3', 'Project 3: Build a Banking System Simulator'),
        miniProblem2: lesson('java-strings-1', 'Strings and Common String Methods'),
        pressureRead: lesson('java-arrays-1', 'Arrays and Basic Problem Solving'),
        pressureFix: lesson('java-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
      },
    },
  },
  {
    language: 'cpp',
    prefix: 'cpp',
    beginnerPackId: 'cpp-beginner-structured-logic',
    juniorPackId: 'cpp-junior-problem-solving',
    lessons: {
      beginner: {
        syntaxOutput: lesson('cpp-intro-1', 'What C++ Is and Where It Runs'),
        typesRead: lesson('cpp-variables-1', 'Variables and Primitive Data Types'),
        flowTrace: lesson('cpp-conditionals-1', 'Conditional Logic'),
        dsRead: lesson('cpp-vectors-1', 'First Containers'),
        functionCompletion: lesson('cpp-functions-1', 'Functions'),
        functionWrite: lesson('cpp-functions-1', 'Functions'),
        debugFix: lesson('cpp-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        debugCode: lesson('cpp-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        miniProblem: lesson('cpp-project-1', 'Project 1: Console Toolkit'),
        pressureRead: lesson('cpp-loops-1', 'Loops'),
      },
      junior: {
        readFast: lesson('cpp-vectors-1', 'First Containers'),
        predictOutput: lesson('cpp-maps-1', 'Associative Containers'),
        bestFix: lesson('cpp-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        debugCode: lesson('cpp-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
        writeHelper: lesson('cpp-functions-1', 'Functions'),
        completeData: lesson('cpp-vectors-1', 'First Containers'),
        dsRead: lesson('cpp-maps-1', 'Associative Containers'),
        flowRead: lesson('cpp-loops-1', 'Loops'),
        miniProblem: lesson('cpp-project-3', 'Project 3: Text RPG or Shape System'),
        miniProblem2: lesson('cpp-strings-1', 'Strings'),
        pressureRead: lesson('cpp-vectors-1', 'First Containers'),
        pressureFix: lesson('cpp-debugging-1', 'Compilation Errors, Runtime Errors, and Debugging'),
      },
    },
  },
];

const beginnerFamilies = {
  syntaxOutput: {
    slug: 'syntax-output',
    role: 'beginner',
    lessonKey: 'syntaxOutput',
    competency: 'Syntax fluency',
    questionType: 'output_prediction',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'theory',
  },
  typesRead: {
    slug: 'types-read',
    role: 'beginner',
    lessonKey: 'typesRead',
    competency: 'Syntax fluency',
    questionType: 'code_reading_comprehension',
    skillBucket: 'syntax_fluency',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
  },
  flowTrace: {
    slug: 'flow-trace',
    role: 'beginner',
    lessonKey: 'flowTrace',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'beginner',
    assessmentType: 'comprehension',
  },
  dsRead: {
    slug: 'ds-reading',
    role: 'beginner',
    lessonKey: 'dsRead',
    competency: 'Data structures basics',
    questionType: 'code_reading_comprehension',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
  functionCompletion: {
    slug: 'function-completion',
    role: 'beginner',
    lessonKey: 'functionCompletion',
    competency: 'Functions / methods',
    questionType: 'code_completion',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
  },
  functionWrite: {
    slug: 'function-write',
    role: 'beginner',
    lessonKey: 'functionWrite',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
  },
  debugFix: {
    slug: 'debug-fix',
    role: 'beginner',
    lessonKey: 'debugFix',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
  },
  debugCode: {
    slug: 'debug-code',
    role: 'beginner',
    lessonKey: 'debugCode',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
  },
  miniProblem: {
    slug: 'mini-problem',
    role: 'beginner',
    lessonKey: 'miniProblem',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
  },
  pressureRead: {
    slug: 'pressure-read',
    role: 'beginner',
    lessonKey: 'pressureRead',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
};

const juniorFamilies = {
  readFast: {
    slug: 'read-fast',
    role: 'junior',
    lessonKey: 'readFast',
    competency: 'Code reading',
    questionType: 'code_reading_comprehension',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
  predictOutput: {
    slug: 'predict-output',
    role: 'junior',
    lessonKey: 'predictOutput',
    competency: 'Code reading',
    questionType: 'output_prediction',
    skillBucket: 'code_reading',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
  bestFix: {
    slug: 'best-fix',
    role: 'junior',
    lessonKey: 'bestFix',
    competency: 'Debugging',
    questionType: 'choose_the_best_fix',
    skillBucket: 'debugging',
    difficulty: 'intermediate',
    assessmentType: 'debugging',
  },
  debugCode: {
    slug: 'debug-code',
    role: 'junior',
    lessonKey: 'debugCode',
    competency: 'Debugging',
    questionType: 'debugging',
    skillBucket: 'debugging',
    difficulty: 'advanced',
    assessmentType: 'debugging',
  },
  writeHelper: {
    slug: 'write-helper',
    role: 'junior',
    lessonKey: 'writeHelper',
    competency: 'Functions / methods',
    questionType: 'short_function_writing',
    skillBucket: 'functions_methods',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
  },
  completeData: {
    slug: 'complete-data',
    role: 'junior',
    lessonKey: 'completeData',
    competency: 'Data structures basics',
    questionType: 'code_completion',
    skillBucket: 'data_structures_basics',
    difficulty: 'intermediate',
    assessmentType: 'implementation',
  },
  dsRead: {
    slug: 'ds-read',
    role: 'junior',
    lessonKey: 'dsRead',
    competency: 'Data structures basics',
    questionType: 'code_tracing',
    skillBucket: 'data_structures_basics',
    difficulty: 'advanced',
    assessmentType: 'comprehension',
  },
  flowRead: {
    slug: 'flow-read',
    role: 'junior',
    lessonKey: 'flowRead',
    competency: 'Control flow',
    questionType: 'code_tracing',
    skillBucket: 'control_flow',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
  miniProblem: {
    slug: 'mini-problem',
    role: 'junior',
    lessonKey: 'miniProblem',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
  },
  miniProblem2: {
    slug: 'mini-problem-2',
    role: 'junior',
    lessonKey: 'miniProblem2',
    competency: 'Problem solving',
    questionType: 'applied_mini_problem',
    skillBucket: 'problem_solving',
    difficulty: 'advanced',
    assessmentType: 'implementation',
  },
  pressureRead: {
    slug: 'pressure-read',
    role: 'junior',
    lessonKey: 'pressureRead',
    competency: 'Speed under pressure',
    questionType: 'output_prediction',
    skillBucket: 'speed_under_pressure',
    difficulty: 'intermediate',
    assessmentType: 'comprehension',
  },
  pressureFix: {
    slug: 'pressure-fix',
    role: 'junior',
    lessonKey: 'pressureFix',
    competency: 'Speed under pressure',
    questionType: 'choose_the_best_fix',
    skillBucket: 'speed_under_pressure',
    difficulty: 'advanced',
    assessmentType: 'debugging',
  },
};

const lineEnd = (language) => (language === 'python' ? '' : ';');
const indent = (lines, size = 4) => lines.map((line) => `${' '.repeat(size)}${line}`);
const joinLines = (lines) => `${lines.join('\n')}\n`;
const quote = (value) => JSON.stringify(value);
const numberList = (values) => values.join(', ');
const stringList = (values) => values.map((value) => quote(value)).join(', ');

const numberAssignment = (language, name, value, mutable = false) => {
  if (language === 'python') return `${name} = ${value}`;
  if (language === 'javascript') return `${mutable ? 'let' : 'const'} ${name} = ${value};`;
  return `int ${name} = ${value};`;
};

const stringAssignment = (language, name, value, mutable = false) => {
  if (language === 'python') return `${name} = ${quote(value)}`;
  if (language === 'javascript') return `${mutable ? 'let' : 'const'} ${name} = ${quote(value)};`;
  if (language === 'java') return `String ${name} = ${quote(value)};`;
  return `std::string ${name} = ${quote(value)};`;
};

const arrayAssignment = (language, name, values) => {
  if (language === 'python') return `${name} = [${numberList(values)}]`;
  if (language === 'javascript') return `const ${name} = [${numberList(values)}];`;
  if (language === 'java') return `int[] ${name} = {${numberList(values)}};`;
  return `std::vector<int> ${name} = {${numberList(values)}};`;
};

const mapAssignment = (language, name, entries) => {
  if (language === 'python') {
    const content = entries.map(([key, value]) => `${quote(key)}: ${value}`).join(', ');
    return `${name} = {${content}}`;
  }
  if (language === 'javascript') {
    const content = entries.map(([key, value]) => `${key}: ${value}`).join(', ');
    return `const ${name} = { ${content} };`;
  }
  if (language === 'java') {
    const content = entries.map(([key, value]) => `${quote(key)}, ${value}`).join(', ');
    return `java.util.Map<String, Integer> ${name} = java.util.Map.of(${content});`;
  }
  const content = entries.map(([key, value]) => `{${quote(key)}, ${value}}`).join(', ');
  return `std::map<std::string, int> ${name}{${content}};`;
};

const mapListAssignment = (language, name, entries) => {
  if (language === 'python') {
    const content = entries.map(([key, values]) => `${quote(key)}: [${numberList(values)}]`).join(', ');
    return `${name} = {${content}}`;
  }
  if (language === 'javascript') {
    const content = entries.map(([key, values]) => `${key}: [${numberList(values)}]`).join(', ');
    return `const ${name} = { ${content} };`;
  }
  if (language === 'java') {
    const content = entries
      .map(([key, values]) => `${quote(key)}, java.util.List.of(${numberList(values)})`)
      .join(', ');
    return `java.util.Map<String, java.util.List<Integer>> ${name} = java.util.Map.of(${content});`;
  }
  const content = entries
    .map(([key, values]) => `{${quote(key)}, {${numberList(values)}}}`)
    .join(', ');
  return `std::map<std::string, std::vector<int>> ${name}{${content}};`;
};

const printLine = (language, expression) => {
  if (language === 'python') return `print(${expression})`;
  if (language === 'javascript') return `console.log(${expression});`;
  if (language === 'java') return `System.out.println(${expression});`;
  return `std::cout << ${expression};`;
};

const arrayLengthExpression = (language, name) => {
  if (language === 'python') return `len(${name})`;
  if (language === 'javascript') return `${name}.length`;
  if (language === 'java') return `${name}.length`;
  return `${name}.size()`;
};

const stringLengthExpression = (language, name) => {
  if (language === 'python') return `len(${name})`;
  if (language === 'javascript') return `${name}.length`;
  if (language === 'java') return `${name}.length()`;
  return `${name}.size()`;
};

const lowercaseExpression = (language, name) => {
  if (language === 'python') return `${name}.lower()`;
  if (language === 'javascript') return `${name}.toLowerCase()`;
  if (language === 'java') return `${name}.toLowerCase()`;
  return `toLower(${name})`;
};

const startsWithExpression = (language, name, prefix) => {
  if (language === 'python') return `${name}.startswith(${quote(prefix)})`;
  if (language === 'javascript') return `${name}.startsWith(${quote(prefix)})`;
  if (language === 'java') return `${name}.startsWith(${quote(prefix)})`;
  return `${name}.rfind(${quote(prefix)}, 0) == 0`;
};

const endsWithExpression = (language, name, suffix) => {
  if (language === 'python') return `${name}.endswith(${quote(suffix)})`;
  if (language === 'javascript') return `${name}.endsWith(${quote(suffix)})`;
  if (language === 'java') return `${name}.endsWith(${quote(suffix)})`;
  return `${name}.size() >= ${suffix.length} && ${name}.substr(${name}.size() - ${suffix.length}) == ${quote(suffix)}`;
};

const parseIntExpression = (language, value) => {
  if (language === 'python') return `int(${quote(value)})`;
  if (language === 'javascript') return `Number(${quote(value)})`;
  if (language === 'java') return `Integer.parseInt(${quote(value)})`;
  return `std::stoi(${quote(value)})`;
};

const mapDefaultExpression = (language, name, key, fallback) => {
  if (language === 'python') return `${name}.get(${quote(key)}, ${fallback})`;
  if (language === 'javascript') return `(${name}[${quote(key)}] ?? ${fallback})`;
  if (language === 'java') return `${name}.getOrDefault(${quote(key)}, ${fallback})`;
  return `${name}.count(${quote(key)}) ? ${name}.at(${quote(key)}) : ${fallback}`;
};

const mapValueExpression = (language, name, key) => {
  if (language === 'python') return `${name}[${quote(key)}]`;
  if (language === 'javascript') return `${name}[${quote(key)}]`;
  if (language === 'java') return `${name}.get(${quote(key)})`;
  return `${name}.at(${quote(key)})`;
};

const arrayLastExpression = (language, name) => {
  if (language === 'python') return `${name}[-1]`;
  if (language === 'javascript') return `${name}[${name}.length - 1]`;
  if (language === 'java') return `${name}[${name}.length - 1]`;
  return `${name}[${name}.size() - 1]`;
};

const forEachLoop = (language, item, collection, bodyLines) => {
  if (language === 'python') return [`for ${item} in ${collection}:`, ...indent(bodyLines, 4)];
  if (language === 'javascript') return [`for (const ${item} of ${collection}) {`, ...indent(bodyLines, 4), '}'];
  return [`for (int ${item} : ${collection}) {`, ...indent(bodyLines, 4), '}'];
};

const forEachStringLoop = (language, item, collection, bodyLines) => {
  if (language === 'python') return [`for ${item} in ${collection}:`, ...indent(bodyLines, 4)];
  if (language === 'javascript') return [`for (const ${item} of ${collection}) {`, ...indent(bodyLines, 4), '}'];
  if (language === 'java') return [`for (String ${item} : ${collection}) {`, ...indent(bodyLines, 4), '}'];
  return [`for (const std::string& ${item} : ${collection}) {`, ...indent(bodyLines, 4), '}'];
};

const ifBlock = (language, condition, bodyLines, elseBodyLines = null) => {
  if (language === 'python') {
    const lines = [`if ${condition}:`, ...indent(bodyLines, 4)];
    if (elseBodyLines) lines.push('else:', ...indent(elseBodyLines, 4));
    return lines;
  }
  const lines = [`if (${condition}) {`, ...indent(bodyLines, 4), '}'];
  if (elseBodyLines) lines.push('else {', ...indent(elseBodyLines, 4), '}');
  return lines;
};

const returnLine = (language, expression) => `return ${expression}${lineEnd(language)}`;
const incrementLine = (language, name, amount = 1) =>
  amount === 1 ? `${name} += 1${lineEnd(language)}` : `${name} += ${amount}${lineEnd(language)}`;

const appendLine = (language, name, expression) => {
  if (language === 'python') return `${name}.append(${expression})`;
  if (language === 'javascript') return `${name}.push(${expression});`;
  if (language === 'java') return `${name}.add(${expression});`;
  return `${name}.push_back(${expression});`;
};

const functionHeader = (language, returnType, name, params) => {
  if (language === 'python') return [`def ${name}(${params.map((param) => param.name).join(', ')}):`];
  if (language === 'javascript') return [`function ${name}(${params.map((param) => param.name).join(', ')}) {`];

  const javaTypes = {
    number: 'int',
    boolean: 'boolean',
    string: 'String',
    numberArray: 'java.util.List<Integer>',
    stringArray: 'java.util.List<String>',
  };
  const cppTypes = {
    number: 'int',
    boolean: 'bool',
    string: 'std::string',
    numberArray: 'std::vector<int>',
    stringArray: 'std::vector<std::string>',
  };
  const javaParamType = (type) => {
    if (type === 'number') return 'int';
    if (type === 'string') return 'String';
    if (type === 'numberList') return 'int[]';
    if (type === 'stringList') return 'java.util.List<String>';
    if (type === 'scoreMap') return 'java.util.Map<String, Integer>';
    return 'int';
  };
  const cppParamType = (type) => {
    if (type === 'number') return 'int';
    if (type === 'string') return 'const std::string&';
    if (type === 'numberList') return 'const std::vector<int>&';
    if (type === 'stringList') return 'const std::vector<std::string>&';
    if (type === 'scoreMap') return 'const std::map<std::string, int>&';
    return 'int';
  };
  if (language === 'java') {
    return [
      `static ${javaTypes[returnType]} ${name}(${params
        .map((param) => `${javaParamType(param.type)} ${param.name}`)
        .join(', ')}) {`,
    ];
  }
  return [
    `${cppTypes[returnType]} ${name}(${params
      .map((param) => `${cppParamType(param.type)} ${param.name}`)
      .join(', ')}) {`,
  ];
};

const renderFunction = (language, returnType, name, params, bodyLines) => {
  const header = functionHeader(language, returnType, name, params);
  const footer = language === 'python' ? [] : ['}'];
  return joinLines([...header, ...indent(bodyLines, 4), ...footer]);
};

const renderConcatOutput = (language, text, count) =>
  joinLines([
    stringAssignment(language, 'label', text),
    numberAssignment(language, 'count', count),
    printLine(
      language,
      language === 'python' ? 'label + " " + str(count)' : 'label + " " + count'
    ),
  ]);

const renderArithmeticOutput = (language, initial, addend, multiplier) =>
  joinLines([
    numberAssignment(language, 'total', initial, true),
    language === 'python' ? `total = total + ${addend}` : `total = total + ${addend};`,
    printLine(language, `total * ${multiplier}`),
  ]);

const renderLengthMathOutput = (language, text, offset) =>
  joinLines([
    stringAssignment(language, 'word', text),
    printLine(language, `${stringLengthExpression(language, 'word')} + ${offset}`),
  ]);

const renderModuloOutput = (language, value, divisor) =>
  joinLines([numberAssignment(language, 'value', value), printLine(language, `value % ${divisor}`)]);

const renderCounterOutput = (language, start, deltas) =>
  joinLines([
    numberAssignment(language, 'count', start, true),
    ...deltas.map((delta) =>
      language === 'python' ? `count = count + ${delta}` : `count = count + ${delta};`
    ),
    printLine(language, 'count'),
  ]);

const renderParsedAdditionOutput = (language, textValue, addend) =>
  joinLines([
    `${
      language === 'python'
        ? 'value = '
        : language === 'javascript'
        ? 'const value = '
        : 'int value = '
    }${parseIntExpression(language, textValue)}${language === 'python' ? '' : ';'}`,
    printLine(language, `value + ${addend}`),
  ]);

const renderParsedMultiplyOutput = (language, textValue, multiplier) =>
  joinLines([
    `${
      language === 'python'
        ? 'value = '
        : language === 'javascript'
        ? 'const value = '
        : 'int value = '
    }${parseIntExpression(language, textValue)}${language === 'python' ? '' : ';'}`,
    printLine(language, `value * ${multiplier}`),
  ]);

const renderIfElseOutput = (language, name, value, operator, threshold, trueLabel, falseLabel) =>
  joinLines([
    numberAssignment(language, name, value),
    ...ifBlock(
      language,
      `${name} ${operator} ${threshold}`,
      [printLine(language, quote(trueLabel))],
      [printLine(language, quote(falseLabel))]
    ),
  ]);

const renderNestedIfOutput = (language, value) =>
  joinLines([
    numberAssignment(language, 'score', value),
    ...(language === 'python'
      ? [
          'if score >= 8:',
          '    print("top")',
          'elif score >= 5:',
          '    print("mid")',
          'else:',
          '    print("low")',
        ]
      : [
          'if (score >= 8) {',
          `    ${printLine(language, '"top"')}`,
          '} else if (score >= 5) {',
          `    ${printLine(language, '"mid"')}`,
          '} else {',
          `    ${printLine(language, '"low"')}`,
          '}',
        ]),
  ]);

const renderAndConditionOutput = (language, age, score) =>
  joinLines([
    numberAssignment(language, 'age', age),
    numberAssignment(language, 'score', score),
    ...ifBlock(
      language,
      language === 'python' ? 'age >= 18 and score >= 70' : 'age >= 18 && score >= 70',
      [printLine(language, quote('pass'))],
      [printLine(language, quote('wait'))]
    ),
  ]);

const renderArrayIndexOutput = (language, values, index) =>
  joinLines([arrayAssignment(language, 'values', values), printLine(language, `values[${index}]`)]);

const renderArrayFirstLastOutput = (language, values) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    printLine(language, `values[0] + ${arrayLastExpression(language, 'values')}`),
  ]);

const renderArrayLengthOutput = (language, values) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    printLine(language, arrayLengthExpression(language, 'values')),
  ]);

const renderArrayMutationOutput = (language, values, index, newValue, readExpression = null) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    language === 'python' ? `values[${index}] = ${newValue}` : `values[${index}] = ${newValue};`,
    printLine(language, readExpression || `values[${index}] + values[0]`),
  ]);

const renderLoopEvenCountOutput = (language, values) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    numberAssignment(language, 'count', 0, true),
    ...forEachLoop(
      language,
      'value',
      'values',
      ifBlock(language, 'value % 2 == 0', [incrementLine(language, 'count')])
    ),
    printLine(language, 'count'),
  ]);

const renderLoopSumOutput = (language, values) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    numberAssignment(language, 'total', 0, true),
    ...forEachLoop(language, 'value', 'values', [`total += value${lineEnd(language)}`]),
    printLine(language, 'total'),
  ]);

const renderLoopBreakOutput = (language, values, stopValue) =>
  joinLines([
    arrayAssignment(language, 'values', values),
    numberAssignment(language, 'total', 0, true),
    ...forEachLoop(language, 'value', 'values', [
      ...ifBlock(language, `value == ${stopValue}`, [language === 'python' ? 'break' : 'break;']),
      `total += value${lineEnd(language)}`,
    ]),
    printLine(language, 'total'),
  ]);

const renderDefaultMapOutput = (language, entries, key, fallback) =>
  joinLines([
    mapAssignment(language, 'scores', entries),
    printLine(language, mapDefaultExpression(language, 'scores', key, fallback)),
  ]);

const renderMapIncrementOutput = (language, entries, key, delta) =>
  joinLines([
    mapAssignment(language, 'scores', entries),
    ...(language === 'java'
      ? [`int next = scores.get(${quote(key)}) + ${delta};`, printLine(language, 'next')]
      : [
          language === 'python'
            ? `scores[${quote(key)}] = scores[${quote(key)}] + ${delta}`
            : `scores[${quote(key)}] = scores[${quote(key)}] + ${delta};`,
          printLine(language, mapValueExpression(language, 'scores', key)),
        ]),
  ]);

const renderMapListSumOutput = (language, entries, key) => {
  const loopTarget =
    language === 'python'
      ? `groups[${quote(key)}]`
      : language === 'javascript'
      ? `groups[${quote(key)}]`
      : language === 'java'
      ? `groups.get(${quote(key)})`
      : `groups.at(${quote(key)})`;
  return joinLines([
    mapListAssignment(language, 'groups', entries),
    numberAssignment(language, 'total', 0, true),
    ...forEachLoop(language, 'value', loopTarget, [`total += value${lineEnd(language)}`]),
    printLine(language, 'total'),
  ]);
};

const buildChoiceQuestion = (config, family, index, details) => {
  const lessonRef = config.lessons[family.role][family.lessonKey];
  const options = sanitizeChoiceOptions(details.options, details.correctAnswer);
  return defineChoiceSeedQuestion({
    templateId: `bench-${config.prefix}-${family.role}-${family.slug}-extra-${index + 1}`,
    language: config.language,
    packIds: [family.role === 'beginner' ? config.beginnerPackId : config.juniorPackId],
    sourceType: details.sourceType,
    familySlug: family.slug,
    familyRole: family.role,
    lessonId: lessonRef.lessonId,
    lessonTitle: lessonRef.lessonTitle,
    competency: family.competency,
    questionType: family.questionType,
    skillBucket: family.skillBucket,
    difficulty: family.difficulty,
    assessmentType: family.assessmentType,
    prompt: details.prompt,
    options,
    correctAnswer: details.correctAnswer,
    explanation: details.explanation,
    expectedDurationSeconds: details.expectedDurationSeconds,
    discrimination: details.discrimination,
    calibrationState: details.calibrationState,
    version: details.version,
  });
};

const buildCodeQuestion = (config, family, index, details) => {
  const lessonRef = config.lessons[family.role][family.lessonKey];
  return defineCodeSeedQuestion({
    templateId: `bench-${config.prefix}-${family.role}-${family.slug}-extra-${index + 1}`,
    language: config.language,
    packIds: [family.role === 'beginner' ? config.beginnerPackId : config.juniorPackId],
    sourceType: details.sourceType,
    familySlug: family.slug,
    familyRole: family.role,
    lessonId: lessonRef.lessonId,
    lessonTitle: lessonRef.lessonTitle,
    competency: family.competency,
    questionType: family.questionType,
    skillBucket: family.skillBucket,
    difficulty: family.difficulty,
    assessmentType: family.assessmentType,
    prompt: details.prompt,
    starterCode: details.starterCode,
    referenceCode: details.referenceCode,
    validationMode: details.validationMode ?? 'includes_all',
    requiredSnippets: details.requiredSnippets,
    qualitySignals: details.qualitySignals,
    forbiddenPatterns: details.forbiddenPatterns,
    explanation: details.explanation,
    executionCases: details.executionCases,
    publicTestCases: details.publicTestCases,
    expectedDurationSeconds: details.expectedDurationSeconds,
    discrimination: details.discrimination,
    calibrationState: details.calibrationState,
    version: details.version,
  });
};

const previewExecutionValue = (value) => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const buildPublicTestCases = (executionCases = [], maxVisible = 2) =>
  executionCases
    .filter((testCase) => !testCase.hidden)
    .slice(0, maxVisible)
    .map((testCase) => ({
      label: testCase.label || 'Sample case',
      inputPreview: previewExecutionValue(testCase.input),
      expectedPreview: previewExecutionValue(testCase.expected ?? testCase.expectedOutput ?? ''),
    }));

const attachExecutionCases = (task, executionCases) => ({
  ...task,
  executionCases,
  publicTestCases: buildPublicTestCases(executionCases),
});

const prependSupportCode = (task, supportCode) => ({
  ...task,
  starterCode: `${supportCode}${task.starterCode}`,
  referenceCode: `${supportCode}${task.referenceCode}`,
});

const pickUnusedCandidate = (used, candidates, fallbackBase = 'other') => {
  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    if (normalized && !used.has(normalized)) return candidate;
  }
  let suffix = 1;
  while (used.has(`${fallbackBase}${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${fallbackBase}${suffix}`;
};

const buildNumericDistractor = (used, numericOptions) => {
  const values = numericOptions.map((option) => Number(option));
  const candidates = [
    String(Math.max(...values) + 1),
    String(Math.min(...values) - 1),
    String(values.reduce((sum, value) => sum + value, 0)),
    String(values[0] + 1),
    String(values[values.length - 1] - 1),
  ];
  return pickUnusedCandidate(used, candidates, '99');
};

const buildTextDistractor = (used, textOptions) => {
  const alphaOnly = textOptions.every((option) => /^[A-Za-z]+$/.test(option));
  if (alphaOnly) {
    return pickUnusedCandidate(used, ['other', 'edge', 'later', 'base', 'final'], 'other');
  }
  const base = textOptions[0] || 'value';
  const candidates = [
    base.replace(/([A-Za-z])\s+(\d+)/, '$1-$2'),
    base.replace(/([A-Za-z]+)(\d+)/, '$1-$2'),
    base.replace(/(\d+)\s+([A-Za-z]+)/, '$1-$2'),
    base.replace(/\s+/g, ''),
    `${base}!`,
    `${base}?`,
  ].filter(Boolean);
  return pickUnusedCandidate(used, candidates, 'value');
};

const buildReplacementDistractor = (options, correctAnswer) => {
  const nonCheapOptions = options.filter(
    (option, index) =>
      index !== correctAnswer && !cheapDistractorValues.has(option.trim().toLowerCase())
  );
  const used = new Set(options.map((option) => option.trim().toLowerCase()).filter(Boolean));
  if (nonCheapOptions.length === 0) {
    return pickUnusedCandidate(used, ['other', 'fallback', 'default'], 'other');
  }
  if (nonCheapOptions.every((option) => /^-?\d+$/.test(option.trim()))) {
    return buildNumericDistractor(used, nonCheapOptions.map((option) => option.trim()));
  }
  return buildTextDistractor(used, nonCheapOptions.map((option) => option.trim()));
};

const sanitizeChoiceOptions = (options = [], correctAnswer = 0) =>
  options.map((option, index) => {
    const normalized = option.trim().toLowerCase();
    if (index === correctAnswer || !cheapDistractorValues.has(normalized)) {
      return option;
    }
    return buildReplacementDistractor(options, correctAnswer);
  });

const renderedSpec = (renderer, options, correctAnswer, explanation, expectedDurationSeconds) => ({
  render: (language) => ({
    prompt: `What is printed?\n\n${renderer(language).trim()}`,
    options,
    correctAnswer,
    explanation,
    expectedDurationSeconds,
  }),
});

const codeSpec = (prompt, build, requiredSnippets, explanation) => ({
  prompt,
  build,
  requiredSnippets,
  explanation,
});

const curatedChoiceSpec = (render, overrides = {}) => ({
  render,
  expectedDurationSeconds: overrides.expectedDurationSeconds,
  discrimination: overrides.discrimination ?? 0.84,
  calibrationState: overrides.calibrationState ?? 'calibrating',
  sourceType: overrides.sourceType ?? 'curated',
  version: overrides.version ?? 3,
});

const curatedCodeSpec = (prompt, build, requiredSnippets, explanation, overrides = {}) => ({
  prompt,
  build,
  requiredSnippets,
  explanation,
  expectedDurationSeconds: overrides.expectedDurationSeconds,
  discrimination: overrides.discrimination ?? 0.86,
  calibrationState: overrides.calibrationState ?? 'calibrating',
  sourceType: overrides.sourceType ?? 'curated',
  version: overrides.version ?? 3,
});

const promoteChoiceSpec = (spec, overrides = {}) =>
  curatedChoiceSpec(
    (language) => {
      const rendered = spec.render(language);
      return {
        ...rendered,
        options: sanitizeChoiceOptions(rendered.options, rendered.correctAnswer),
      };
    },
    {
      expectedDurationSeconds: overrides.expectedDurationSeconds ?? spec.expectedDurationSeconds,
      discrimination: Math.max(spec.discrimination ?? 0.76, overrides.discrimination ?? 0.82),
      calibrationState: overrides.calibrationState ?? spec.calibrationState ?? 'calibrating',
      sourceType: 'curated',
      version: 3,
    }
  );

const promoteCodeSpec = (spec, overrides = {}) =>
  curatedCodeSpec(spec.prompt, spec.build, spec.requiredSnippets, spec.explanation, {
    expectedDurationSeconds: overrides.expectedDurationSeconds ?? spec.expectedDurationSeconds,
    discrimination: Math.max(spec.discrimination ?? 0.78, overrides.discrimination ?? 0.83),
    calibrationState: overrides.calibrationState ?? spec.calibrationState ?? 'calibrating',
    sourceType: 'curated',
    version: 3,
  });

const splitPromotedSpecs = (specs, count, promoter) => ({
  promoted: specs.slice(0, count).map((spec) => promoter(spec)),
  remainder: specs.slice(count),
});

const CURATED_PROMOTION_COUNT = 3;

const curatedBeginnerChoiceSpec = (render, overrides = {}) =>
  curatedChoiceSpec(render, {
    discrimination: 0.86,
    version: 3,
    ...overrides,
  });

const curatedBeginnerCodeSpec = (prompt, build, requiredSnippets, explanation, overrides = {}) =>
  curatedCodeSpec(prompt, build, requiredSnippets, explanation, {
    discrimination: 0.88,
    version: 3,
    ...overrides,
  });

const renderCallBugFix = (language) => {
  const code =
    language === 'python'
      ? 'name = "Ada"\nprint("Hello " + name())'
      : language === 'javascript'
      ? 'const name = "Ada";\nconsole.log("Hello " + name());'
      : language === 'java'
      ? 'String name = "Ada";\nSystem.out.println("Hello " + name());'
      : 'std::string name = "Ada";\nstd::cout << "Hello " << name();';
  return {
    prompt: `Which change fixes the bug?\n\n${code}`,
    options: [
      'Use the variable directly instead of calling it like a function',
      'Wrap the line in another print statement',
      'Convert the string to a number first',
      'Move the greeting into a loop',
    ],
    correctAnswer: 0,
    explanation: 'The variable already stores the string value and should not be called like a function.',
  };
};

const renderEvenConditionBugFix = (language) => {
  const code = renderFunction(
    language,
    'number',
    'firstEven',
    [{ name: 'values', type: 'numberList' }],
    [
      ...forEachLoop(
        language,
        'value',
        'values',
        ifBlock(language, 'value % 2 == 1', [returnLine(language, 'value')])
      ),
      returnLine(language, '-1'),
    ]
  ).trim();
  return {
    prompt: `Which fix makes this function return the first even value?\n\n${code}`,
    options: [
      'Change the condition to check `value % 2 == 0`',
      'Move the fallback return inside the loop',
      'Replace `return value` with `break`',
      'Print the array before returning',
    ],
    correctAnswer: 0,
    explanation: 'The current condition returns the first odd value instead of the first even one.',
  };
};

const renderLastIndexBugFix = (language) => {
  const code =
    language === 'python'
      ? 'values = [4, 7, 9]\nprint(values[len(values)])'
      : language === 'javascript'
      ? 'const values = [4, 7, 9];\nconsole.log(values[values.length]);'
      : language === 'java'
      ? 'int[] values = {4, 7, 9};\nSystem.out.println(values[values.length]);'
      : 'std::vector<int> values = {4, 7, 9};\nstd::cout << values[values.size()];';
  return {
    prompt: `Which change reads the last value safely?\n\n${code}`,
    options: [
      'Use the last valid index instead of the collection length',
      'Add one more element to the collection',
      'Wrap the read in another loop',
      'Replace the collection with a string',
    ],
    correctAnswer: 0,
    explanation: 'Collection length points one past the final valid index.',
  };
};

const renderReturnInsideLoopBugFix = (language) => {
  const code = renderFunction(
    language,
    'number',
    'countPositives',
    [{ name: 'values', type: 'numberList' }],
    [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      ...forEachLoop(language, 'value', 'values', [
        ...ifBlock(language, 'value > 0', [incrementLine(language, 'count')]),
        returnLine(language, 'count'),
      ]),
      returnLine(language, 'count'),
    ]
  ).trim();
  return {
    prompt: `Which fix lets the function count every positive value?\n\n${code}`,
    options: [
      'Move the `return count` so it runs after the loop finishes',
      'Replace `count += 1` with `count = value`',
      'Change the condition to `value < 0`',
      'Print `count` inside the loop',
    ],
    correctAnswer: 0,
    explanation: 'Returning inside the loop stops the scan after the first item.',
  };
};

const renderMissingDefaultBugFix = (language) => {
  const code =
    language === 'python'
      ? 'scores = {"ana": 4}\nprint(scores["mila"])'
      : language === 'javascript'
      ? 'const scores = { ana: 4 };\nconsole.log(scores["mila"].toString());'
      : language === 'java'
      ? 'java.util.Map<String, Integer> scores = java.util.Map.of("ana", 4);\nSystem.out.println(scores.get("mila").toString());'
      : 'std::map<std::string, int> scores{{"ana", 4}};\nstd::cout << scores.at("mila");';
  return {
    prompt: `Which fix makes this safe when the key is missing?\n\n${code}`,
    options: [
      'Use a default-valued lookup instead of assuming the key exists',
      'Add another print after the current one',
      'Rename the map variable',
      'Convert the key to uppercase first',
    ],
    correctAnswer: 0,
    explanation: 'Missing-key access should use a safe fallback path.',
  };
};

const renderOffByOneBugFix = (language) => {
  const code =
    language === 'python'
      ? 'values = [2, 4, 6]\nfor i in range(len(values) + 1):\n    print(values[i])'
      : language === 'javascript'
      ? 'const values = [2, 4, 6];\nfor (let i = 0; i <= values.length; i += 1) {\n  console.log(values[i]);\n}'
      : language === 'java'
      ? 'int[] values = {2, 4, 6};\nfor (int i = 0; i <= values.length; i++) {\n  System.out.println(values[i]);\n}'
      : 'std::vector<int> values = {2, 4, 6};\nfor (int i = 0; i <= values.size(); ++i) {\n    std::cout << values[i];\n}';
  return {
    prompt: `Which fix avoids the off-by-one crash here?\n\n${code}`,
    options: [
      'Stop the loop before the collection length instead of including it',
      'Change the counter to go backwards',
      'Print the length instead of the values',
      'Wrap the loop in an if statement',
    ],
    correctAnswer: 0,
    explanation: 'The loop currently runs one step past the final valid index.',
  };
};

const renderWrongAccumulatorBugFix = (language) => {
  const code =
    language === 'python'
      ? 'values = [2, 5, 8]\ncount = 0\nfor value in values:\n    if value > 4:\n        count = value\nprint(count)'
      : language === 'javascript'
      ? 'const values = [2, 5, 8];\nlet count = 0;\nfor (const value of values) {\n  if (value > 4) {\n    count = value;\n  }\n}\nconsole.log(count);'
      : language === 'java'
      ? 'int[] values = {2, 5, 8};\nint count = 0;\nfor (int value : values) {\n  if (value > 4) {\n    count = value;\n  }\n}\nSystem.out.println(count);'
      : 'std::vector<int> values = {2, 5, 8};\nint count = 0;\nfor (int value : values) {\n    if (value > 4) {\n        count = value;\n    }\n}\nstd::cout << count;';
  return {
    prompt: `Which change makes this count matching values instead of storing the last one?\n\n${code}`,
    options: [
      'Increment `count` when the condition matches',
      'Replace the loop with a print statement',
      'Move `count` into the if header',
      'Change `>` to `<`',
    ],
    correctAnswer: 0,
    explanation: 'A counter should increase for each match instead of being replaced by the current item.',
  };
};

const renderAppendResultBugFix = (language) => {
  const appendFix =
    language === 'python'
      ? 'Replace `result = value` with `result.append(value)`'
      : language === 'javascript'
      ? 'Replace `result = value` with `result.push(value)`'
      : language === 'java'
      ? 'Replace `result = value` with `result.add(value)`'
      : 'Replace `result = value` with `result.push_back(value)`';
  const init =
    language === 'python'
      ? 'result = []'
      : language === 'javascript'
      ? 'const result = [];'
      : language === 'java'
      ? 'java.util.List<Integer> result = new java.util.ArrayList<>();'
      : 'std::vector<int> result;';
  const code = [
    init,
    ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value > 0', [`result = value${lineEnd(language)}`])),
    returnLine(language, 'result'),
  ].join('\n');
  const wrapped =
    language === 'python'
      ? `def solution(values):\n${indent(code.split('\n'), 4).join('\n')}`
      : language === 'javascript'
      ? `function solution(values) {\n${indent(code.split('\n'), 4).join('\n')}\n}`
      : language === 'java'
      ? `static java.util.List<Integer> solution(int[] values) {\n${indent(code.split('\n'), 4).join('\n')}\n}`
      : `std::vector<int> solution(const std::vector<int>& values) {\n${indent(code.split('\n'), 4).join('\n')}\n}`;
  return {
    prompt: `Which fix makes this keep all positive values?\n\n${wrapped}`,
    options: [
      appendFix,
      'Move the result variable into the loop',
      'Replace the return with a print statement',
      'Change `value > 0` to `value < 0`',
    ],
    correctAnswer: 0,
    explanation: 'The code should append each matching value to the result collection instead of replacing the collection with one value.',
  };
};

const renderLargestComparisonBugFix = (language) => {
  const code = renderFunction(
    language,
    'number',
    'solution',
    [{ name: 'values', type: 'numberList' }],
    [
      language === 'python' ? 'largest = 0' : 'int largest = 0;',
      ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value < largest', [`largest = value${lineEnd(language)}`])),
      returnLine(language, 'largest'),
    ]
  ).trim();
  return {
    prompt: `Which fix makes this return the largest number?\n\n${code}`,
    options: [
      'Start from the first value and compare with `value > largest`',
      'Replace the loop with `return 0`',
      'Change `largest` to a string',
      'Print each value before returning',
    ],
    correctAnswer: 0,
    explanation: 'To find the maximum, the comparison must update when a larger value appears, and the initial value should come from the collection.',
  };
};

const renderPositiveConditionBugFix = (language) => {
  const code = renderFunction(
    language,
    'numberArray',
    'solution',
    [{ name: 'values', type: 'numberList' }],
    [
      language === 'python'
        ? 'result = []'
        : language === 'javascript'
        ? 'const result = [];'
        : language === 'java'
        ? 'java.util.List<Integer> result = new java.util.ArrayList<>();'
        : 'std::vector<int> result;',
      ...forEachLoop(
        language,
        'value',
        'values',
        ifBlock(language, 'value < 0', [appendLine(language, 'result', 'value')])
      ),
      returnLine(language, 'result'),
    ]
  ).trim();
  return {
    prompt: `Which fix makes this keep the positive values instead of the negative ones?\n\n${code}`,
    options: [
      'Change the condition to `value > 0`',
      'Move `result` inside the loop',
      'Replace the return with a print statement',
      'Change the list to a string',
    ],
    correctAnswer: 0,
    explanation: 'The current condition selects negative values, but the task needs positive ones.',
  };
};

const renderTargetEqualityBugFix = (language) => {
  const code = renderFunction(
    language,
    'boolean',
    'solution',
    [
      { name: 'values', type: 'numberList' },
      { name: 'target', type: 'number' },
    ],
    [
      ...forEachLoop(
        language,
        'value',
        'values',
        ifBlock(language, 'value != target', [returnLine(language, language === 'python' ? 'True' : 'true')])
      ),
      returnLine(language, language === 'python' ? 'False' : 'false'),
    ]
  ).trim();
  return {
    prompt: `Which fix makes this return true only when the target is found?\n\n${code}`,
    options: [
      'Change the condition to `value == target`',
      'Return false inside the loop',
      'Replace the loop with a print statement',
      'Change the target parameter to a string',
    ],
    correctAnswer: 0,
    explanation: 'The current condition returns true for the wrong values because it checks inequality instead of equality.',
  };
};

const renderLongestWordComparisonBugFix = (language) => {
  const code = renderFunction(
    language,
    'number',
    'solution',
    [{ name: 'words', type: 'stringList' }],
    [
      language === 'python' ? 'best = 0' : 'int best = 0;',
      ...forEachStringLoop(
        language,
        'word',
        'words',
        ifBlock(
          language,
          language === 'python'
            ? 'len(word) < best'
            : language === 'javascript'
            ? 'word.length < best'
            : language === 'java'
            ? 'word.length() < best'
            : 'word.size() < best',
          [
            language === 'python'
              ? 'best = len(word)'
              : language === 'javascript'
              ? 'best = word.length;'
              : language === 'java'
              ? 'best = word.length();'
              : 'best = word.size();',
          ]
        )
      ),
      returnLine(language, 'best'),
    ]
  ).trim();
  return {
    prompt: `Which fix makes this return the longest word length?\n\n${code}`,
    options: [
      'Update `best` when the current word length is greater than `best`',
      'Move `best` inside the loop',
      'Replace `best` with the current word itself',
      'Print each word instead of comparing lengths',
    ],
    correctAnswer: 0,
    explanation: 'To track the longest word, the comparison must update only when a larger length appears.',
  };
};

const buildReturnExpressionTask = (
  language,
  returnType,
  params,
  expression,
  fallback = '',
  executionCases = []
) => {
  const task = {
    starterCode: renderFunction(language, returnType, 'solution', params, [
      returnLine(language, fallback),
    ]),
    referenceCode: renderFunction(language, returnType, 'solution', params, [
      returnLine(language, expression),
    ]),
  };
  return executionCases.length > 0 ? attachExecutionCases(task, executionCases) : task;
};

const buildCountGreaterThanTask = (language, threshold, mode) => {
  const executionCases = [
    {
      label: `Mixed values above ${threshold}`,
      input: [threshold - 1, threshold + 2, threshold + 7, threshold],
      expected: 2,
    },
    {
      label: `No values above ${threshold}`,
      input: [threshold, threshold - 3, threshold - 1],
      expected: 0,
    },
    {
      label: 'Hidden multiple matches',
      input: [threshold + 1, threshold + 5, threshold + 9, threshold - 10],
      expected: 3,
      hidden: true,
    },
    {
      label: 'All values above threshold',
      input: [threshold + 1, threshold + 2, threshold + 3],
      expected: 3,
    },
    {
      label: 'Hidden empty input',
      input: [],
      expected: 0,
      hidden: true,
    },
  ];
  const correctBody = [
    language === 'python' ? 'count = 0' : 'int count = 0;',
    ...forEachLoop(language, 'value', 'values', ifBlock(language, `value > ${threshold}`, [incrementLine(language, 'count')])),
    returnLine(language, 'count'),
  ];
  if (mode === 'completion') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? 'count = 0' : 'int count = 0;',
        ...forEachLoop(language, 'value', 'values', ifBlock(language, `value > ${threshold}`, [''])),
        returnLine(language, 'count'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? 'count = 0' : 'int count = 0;',
        ...forEachLoop(language, 'value', 'values', ifBlock(language, `value > ${threshold}`, [`count = value${lineEnd(language)}`])),
        returnLine(language, 'count'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      language === 'python'
        ? `# count how many values are greater than ${threshold}`
        : `// count how many values are greater than ${threshold}`,
      returnLine(language, 'count'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
  }, executionCases);
};

const buildSumEvenTask = (language, mode) => {
  const executionCases = [
    { label: 'Mixed values', input: [1, 2, 4, 7], expected: 6 },
    { label: 'No even numbers', input: [1, 3, 5], expected: 0 },
    { label: 'Hidden negatives included', input: [-2, 3, 8, 10], expected: 16, hidden: true },
    { label: 'All even numbers', input: [2, 6, 8], expected: 16 },
    { label: 'Hidden empty input', input: [], expected: 0, hidden: true },
  ];
  const correctBody = [
    language === 'python' ? 'total = 0' : 'int total = 0;',
    ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value % 2 == 0', [`total += value${lineEnd(language)}`])),
    returnLine(language, 'total'),
  ];
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? 'total = 0' : 'int total = 0;',
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value % 2 == 1', [`total += value${lineEnd(language)}`])),
        returnLine(language, 'total'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
      language === 'python' ? 'total = 0' : 'int total = 0;',
      language === 'python' ? '# sum the even values' : '// sum the even values',
      returnLine(language, 'total'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
  }, executionCases);
};

const buildContainsTargetTask = (language) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'boolean', 'solution', [
        { name: 'values', type: 'numberList' },
        { name: 'target', type: 'number' },
      ], [
        language === 'python'
          ? '# return True when target appears in values'
          : '// return true when target appears in values',
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
      referenceCode: renderFunction(language, 'boolean', 'solution', [
        { name: 'values', type: 'numberList' },
        { name: 'target', type: 'number' },
      ], [
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value == target', [returnLine(language, language === 'python' ? 'True' : 'true')])),
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
    },
    [
      { label: 'Target present', input: [[1, 2, 3], 2], expected: true },
      { label: 'Target missing', input: [[4, 5], 1], expected: false },
      { label: 'Hidden empty list', input: [[], 9], expected: false, hidden: true },
      { label: 'Target appears multiple times', input: [[7, 7, 1], 7], expected: true },
      { label: 'Hidden negative target', input: [[-4, 2, -1], -1], expected: true, hidden: true },
    ]
  );

const buildCountVowelsTask = (language) => {
  const condition =
    language === 'python'
      ? 'char in "aeiouAEIOU"'
      : language === 'javascript'
      ? '"aeiouAEIOU".includes(char)'
      : language === 'java'
      ? '"aeiouAEIOU".indexOf(charValue) >= 0'
      : 'std::string("aeiouAEIOU").find(charValue) != std::string::npos';
  const correctLoop =
    language === 'python'
      ? ['for char in text:', ...indent(ifBlock(language, condition, [incrementLine(language, 'count')]), 4)]
      : language === 'javascript'
      ? ['for (const char of text) {', ...indent(ifBlock(language, condition, [incrementLine(language, 'count')]), 4), '}']
      : language === 'java'
      ? ['for (int i = 0; i < text.length(); i++) {', '    char charValue = text.charAt(i);', ...indent(ifBlock(language, condition, [incrementLine(language, 'count')]), 4), '}']
      : ['for (char charValue : text) {', ...indent(ifBlock(language, condition, [incrementLine(language, 'count')]), 4), '}'];
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'text', type: 'string' }], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      language === 'python' ? '# count vowels' : '// count vowels',
      returnLine(language, 'count'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'text', type: 'string' }], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      ...correctLoop,
      returnLine(language, 'count'),
    ]),
  }, [
    { label: 'Mixed case vowels', input: 'Ada', expected: 2 },
    { label: 'No vowels', input: 'rhythm', expected: 0 },
    { label: 'Hidden repeated vowels', input: 'Queue', expected: 4, hidden: true },
    { label: 'Uppercase vowels only', input: 'IOU', expected: 3 },
    { label: 'Hidden empty text', input: '', expected: 0, hidden: true },
  ]);
};

const buildFilterPositiveTask = (language, mode) => {
  const executionCases = [
    { label: 'Mixed values', input: [3, -1, 4, 0], expected: [3, 4] },
    { label: 'No positives', input: [-2, 0], expected: [] },
    { label: 'Hidden preserve order', input: [5, 6, -1, 2], expected: [5, 6, 2], hidden: true },
    { label: 'All positives stay in order', input: [1, 2, 3], expected: [1, 2, 3] },
    { label: 'Hidden empty input', input: [], expected: [], hidden: true },
  ];
  const init =
    language === 'python'
      ? 'result = []'
      : language === 'javascript'
      ? 'const result = [];'
      : language === 'java'
      ? 'java.util.List<Integer> result = new java.util.ArrayList<>();'
      : 'std::vector<int> result;';
  const correctBody = [
    init,
    ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value > 0', [appendLine(language, 'result', 'value')])),
    returnLine(language, 'result'),
  ];
  if (mode === 'completion') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [
        init,
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value > 0', [''])),
        returnLine(language, 'result'),
      ]),
      referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [
        init,
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value > 0', [incrementLine(language, 'value')])),
        returnLine(language, 'result'),
      ]),
      referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [
      init,
      language === 'python' ? '# keep only positive values' : '// keep only positive values',
      returnLine(language, 'result'),
    ]),
    referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
  }, executionCases);
};

const buildMaxTask = (language, mode) => {
  const executionCases = [
    { label: 'Mixed values', input: [5, 1, 9, 2], expected: 9 },
    { label: 'Already descending', input: [9, 8, 7], expected: 9 },
    { label: 'Hidden negatives', input: [-4, -1, -7], expected: -1, hidden: true },
    { label: 'Single value', input: [4], expected: 4 },
    { label: 'Hidden repeated maximum', input: [3, 9, 9, 2], expected: 9, hidden: true },
  ];
  const correctBody = [
    language === 'python' ? 'largest = values[0]' : 'int largest = values[0];',
    ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value > largest', [`largest = value${lineEnd(language)}`])),
    returnLine(language, 'largest'),
  ];
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? 'largest = 0' : 'int largest = 0;',
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value < largest', [`largest = value${lineEnd(language)}`])),
        returnLine(language, 'largest'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
      language === 'python' ? 'largest = values[0]' : 'int largest = values[0];',
      language === 'python' ? '# track the largest value' : '// track the largest value',
      returnLine(language, 'largest'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
  }, executionCases);
};

const buildLongestWordLengthTask = (language, mode) => {
  const executionCases = [
    { label: 'Mixed lengths', input: ['api', 'server', 'ui'], expected: 6 },
    { label: 'Single word', input: ['hooks'], expected: 5 },
    { label: 'Hidden empty string kept', input: ['', 'deploy', 'db'], expected: 6, hidden: true },
    { label: 'Tie keeps length only', input: ['logs', 'ship', 'api'], expected: 4 },
    { label: 'Hidden empty list', input: [], expected: 0, hidden: true },
  ];
  const lengthExpr =
    language === 'python'
      ? 'len(word)'
      : language === 'javascript'
      ? 'word.length'
      : language === 'java'
      ? 'word.length()'
      : 'word.size()';
  const correctBody = [
    language === 'python' ? 'best = 0' : 'int best = 0;',
    ...forEachStringLoop(language, 'word', 'words', ifBlock(language, `${lengthExpr} > best`, [`best = ${lengthExpr}${lineEnd(language)}`])),
    returnLine(language, 'best'),
  ];
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
        language === 'python' ? 'best = 0' : 'int best = 0;',
        ...forEachStringLoop(language, 'word', 'words', ifBlock(language, `${lengthExpr} < best`, [`best = ${lengthExpr}${lineEnd(language)}`])),
        returnLine(language, 'best'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
      language === 'python' ? 'best = 0' : 'int best = 0;',
      language === 'python' ? '# track the longest word length' : '// track the longest word length',
      returnLine(language, 'best'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
  }, executionCases);
};

const buildCountMapAboveLimitTask = (language, limit, mode) => {
  const executionCases = [
    { label: 'Some scores above limit', input: { api: limit + 1, db: limit - 1, ui: limit + 3 }, expected: 2 },
    { label: 'No scores above limit', input: { api: limit, db: limit - 2 }, expected: 0 },
    { label: 'Hidden all scores above limit', input: { qa: limit + 4, ops: limit + 1 }, expected: 2, hidden: true },
    { label: 'Single score above limit', input: { core: limit + 6 }, expected: 1 },
    { label: 'Hidden empty score map', input: {}, expected: 0, hidden: true },
  ];
  const correctBody =
    language === 'python'
      ? ['count = 0', 'for value in scores.values():', ...indent(ifBlock(language, `value > ${limit}`, [incrementLine(language, 'count')]), 4), returnLine(language, 'count')]
      : language === 'javascript'
      ? ['let count = 0;', 'for (const value of Object.values(scores)) {', ...indent(ifBlock(language, `value > ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')]
      : language === 'java'
      ? ['int count = 0;', 'for (int value : scores.values()) {', ...indent(ifBlock(language, `value > ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')]
      : ['int count = 0;', 'for (const auto& entry : scores) {', '    int value = entry.second;', ...indent(ifBlock(language, `value > ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')];
  if (mode === 'debug') {
    const buggyBody =
      language === 'python'
        ? ['count = 0', 'for value in scores.values():', ...indent(ifBlock(language, `value < ${limit}`, [incrementLine(language, 'count')]), 4), returnLine(language, 'count')]
        : language === 'javascript'
        ? ['let count = 0;', 'for (const value of Object.values(scores)) {', ...indent(ifBlock(language, `value < ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')]
        : language === 'java'
        ? ['int count = 0;', 'for (int value : scores.values()) {', ...indent(ifBlock(language, `value < ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')]
        : ['int count = 0;', 'for (const auto& entry : scores) {', '    int value = entry.second;', ...indent(ifBlock(language, `value < ${limit}`, [incrementLine(language, 'count')]), 4), '}', returnLine(language, 'count')];
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'scores', type: 'scoreMap' }], buggyBody),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'scores', type: 'scoreMap' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'scores', type: 'scoreMap' }], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      language === 'python' ? `# count scores above ${limit}` : `// count scores above ${limit}`,
      returnLine(language, 'count'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'scores', type: 'scoreMap' }], correctBody),
  }, executionCases);
};

const buildPalindromeTask = (language) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'boolean', 'solution', [{ name: 'text', type: 'string' }], [
        language === 'python'
          ? '# return True when text reads the same backward'
          : '// return true when text reads the same backward',
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
      referenceCode: renderFunction(language, 'boolean', 'solution', [{ name: 'text', type: 'string' }], [
        returnLine(
          language,
          language === 'python'
            ? 'text == text[::-1]'
            : language === 'javascript'
            ? 'text === text.split(\"\").reverse().join(\"\")'
            : language === 'java'
            ? 'text.equals(new StringBuilder(text).reverse().toString())'
            : 'text == std::string(text.rbegin(), text.rend())'
        ),
      ]),
    },
    [
      { label: 'Palindrome', input: 'level', expected: true },
      { label: 'Not a palindrome', input: 'code', expected: false },
      { label: 'Hidden even length palindrome', input: 'abba', expected: true, hidden: true },
      { label: 'Case-sensitive mismatch', input: 'Level', expected: false },
      { label: 'Hidden empty string', input: '', expected: true, hidden: true },
    ]
  );

const buildDedupeTask = (language, mode) => {
  const executionCases = [
    { label: 'Keep first appearance', input: [3, 3, 1, 3, 1], expected: [3, 1] },
    { label: 'Already unique', input: [4, 5, 6], expected: [4, 5, 6] },
    { label: 'Negatives preserve order', input: [-1, 2, -1, 3, 2], expected: [-1, 2, 3] },
    { label: 'Repeated zero stays once', input: [0, 0, 0, 1], expected: [0, 1] },
    { label: 'Hidden empty list', input: [], expected: [], hidden: true },
  ];
  const init =
    language === 'python'
      ? 'result = []'
      : language === 'javascript'
      ? 'const result = [];'
      : language === 'java'
      ? 'java.util.List<Integer> result = new java.util.ArrayList<>();'
      : 'std::vector<int> result;';
  const correctCondition =
    language === 'python'
      ? 'value not in result'
      : language === 'javascript'
      ? '!result.includes(value)'
      : language === 'java'
      ? '!result.contains(value)'
      : 'std::find(result.begin(), result.end(), value) == result.end()';
  const buggyCondition =
    language === 'python'
      ? 'value in result'
      : language === 'javascript'
      ? 'result.includes(value)'
      : language === 'java'
      ? 'result.contains(value)'
      : 'std::find(result.begin(), result.end(), value) != result.end()';
  const correctBody = [init, ...forEachLoop(language, 'value', 'values', ifBlock(language, correctCondition, [appendLine(language, 'result', 'value')])), returnLine(language, 'result')];
  if (mode === 'completion') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [
        init,
        ...forEachLoop(language, 'value', 'values', ifBlock(language, correctCondition, [''])),
        returnLine(language, 'result'),
      ]),
      referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [init, ...forEachLoop(language, 'value', 'values', ifBlock(language, buggyCondition, [appendLine(language, 'result', 'value')])), returnLine(language, 'result')]),
      referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], [
      init,
      language === 'python' ? '# keep first appearance of each value' : '// keep first appearance of each value',
      returnLine(language, 'result'),
    ]),
    referenceCode: renderFunction(language, 'numberArray', 'solution', [{ name: 'values', type: 'numberList' }], correctBody),
  }, executionCases);
};

const buildCountTargetOccurrencesTask = (language, mode) => {
  const executionCases = [
    { label: 'Repeated target', input: [[2, 1, 2, 3, 2], 2], expected: 3 },
    { label: 'Target missing', input: [[4, 5], 1], expected: 0 },
    { label: 'Hidden single hit', input: [[7, 8, 9], 8], expected: 1, hidden: true },
    { label: 'All values are the target', input: [[5, 5, 5], 5], expected: 3 },
    { label: 'Hidden empty input', input: [[], 4], expected: 0, hidden: true },
  ];
  const correctBody = [
    language === 'python' ? 'count = 0' : 'int count = 0;',
    ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value == target', [incrementLine(language, 'count')])),
    returnLine(language, 'count'),
  ];
  if (mode === 'debug') {
    return attachExecutionCases({
      starterCode: renderFunction(language, 'number', 'solution', [
        { name: 'values', type: 'numberList' },
        { name: 'target', type: 'number' },
      ], [
        language === 'python' ? 'count = 0' : 'int count = 0;',
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value != target', [incrementLine(language, 'count')])),
        returnLine(language, 'count'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [
        { name: 'values', type: 'numberList' },
        { name: 'target', type: 'number' },
      ], correctBody),
    }, executionCases);
  }
  return attachExecutionCases({
    starterCode: renderFunction(language, 'number', 'solution', [
      { name: 'values', type: 'numberList' },
      { name: 'target', type: 'number' },
    ], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      language === 'python' ? '# count how many times target appears' : '// count how many times target appears',
      returnLine(language, 'count'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [
      { name: 'values', type: 'numberList' },
      { name: 'target', type: 'number' },
    ], correctBody),
  }, executionCases);
};

const buildAllPositiveTask = (language) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'boolean', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? '# return True only if every value is positive' : '// return true only if every value is positive',
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
      referenceCode: renderFunction(language, 'boolean', 'solution', [{ name: 'values', type: 'numberList' }], [
        ...forEachLoop(language, 'value', 'values', ifBlock(language, 'value <= 0', [returnLine(language, language === 'python' ? 'False' : 'false')])),
        returnLine(language, language === 'python' ? 'True' : 'true'),
      ]),
    },
    [
      { label: 'All positive', input: [1, 2, 3], expected: true },
      { label: 'Contains zero', input: [1, 0, 3], expected: false },
      { label: 'Hidden negative value', input: [7, -1], expected: false, hidden: true },
      { label: 'Single positive value', input: [9], expected: true },
      { label: 'Hidden empty input', input: [], expected: true, hidden: true },
    ]
  );

const buildSumFirstAndLastTask = (language) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        language === 'python' ? '# return first + last' : '// return first + last',
        returnLine(language, '0'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'values', type: 'numberList' }], [
        returnLine(language, `values[0] + ${arrayLastExpression(language, 'values')}`),
      ]),
    },
    [
      { label: 'Three values', input: [4, 1, 6], expected: 10 },
      { label: 'Two values', input: [9, 2], expected: 11 },
      { label: 'Hidden repeated edges', input: [5, 3, 5], expected: 10, hidden: true },
      { label: 'Negative last value', input: [7, 8, -2], expected: 5 },
      { label: 'Hidden single value', input: [4], expected: 8, hidden: true },
    ]
  );

const prefixedTextCases = (prefix) => [
  { label: 'Short name', input: 'Ada', expected: `${prefix}Ada` },
  { label: 'Empty string', input: '', expected: prefix },
  { label: 'Hidden mixed case', input: 'cli', expected: `${prefix}cli`, hidden: true },
  { label: 'Longer name', input: 'Nora', expected: `${prefix}Nora` },
  { label: 'Hidden spaced text', input: 'Dev Ops', expected: `${prefix}Dev Ops`, hidden: true },
];

const suffixedTextCases = (suffix) => [
  { label: 'Basic word', input: 'api', expected: `api${suffix}` },
  { label: 'Single letter', input: 'x', expected: `x${suffix}` },
  { label: 'Hidden mixed case', input: 'Prod', expected: `Prod${suffix}`, hidden: true },
  { label: 'Empty string', input: '', expected: suffix },
  { label: 'Hidden spaced text', input: 'ship it', expected: `ship it${suffix}`, hidden: true },
];

const multiplyCases = (factor) => [
  { label: 'Positive number', input: 4, expected: 4 * factor },
  { label: 'Zero', input: 0, expected: 0 },
  { label: 'Hidden negative value', input: -3, expected: -3 * factor, hidden: true },
  { label: 'One', input: 1, expected: factor },
  { label: 'Hidden larger value', input: 9, expected: 9 * factor, hidden: true },
];

const offsetCases = (offset) => [
  { label: 'Positive number', input: 6, expected: 6 + offset },
  { label: 'Zero input', input: 0, expected: offset },
  { label: 'Hidden negative input', input: -4, expected: -4 + offset, hidden: true },
  { label: 'One input', input: 1, expected: 1 + offset },
  { label: 'Hidden larger input', input: 12, expected: 12 + offset, hidden: true },
];

const evenValueCases = [
  { label: 'Even number', input: 8, expected: true },
  { label: 'Odd number', input: 7, expected: false },
  { label: 'Hidden zero is even', input: 0, expected: true, hidden: true },
  { label: 'Negative even number', input: -2, expected: true },
  { label: 'Hidden negative odd number', input: -5, expected: false, hidden: true },
];

const greaterThanBooleanCases = (threshold) => [
  { label: 'Above threshold', input: threshold + 2, expected: true },
  { label: 'Equal to threshold', input: threshold, expected: false },
  { label: 'Hidden below threshold', input: threshold - 3, expected: false, hidden: true },
  { label: 'Far above threshold', input: threshold + 11, expected: true },
  { label: 'Hidden negative value', input: -1, expected: false, hidden: true },
];

const maxPairCases = [
  { label: 'Left is larger', input: [9, 4], expected: 9 },
  { label: 'Right is larger', input: [3, 8], expected: 8 },
  { label: 'Hidden equal values', input: [5, 5], expected: 5, hidden: true },
  { label: 'Negative values', input: [-1, -6], expected: -1 },
  { label: 'Hidden mixed sign', input: [-4, 2], expected: 2, hidden: true },
];

const stringLengthCases = [
  { label: 'Short word', input: 'api', expected: 3 },
  { label: 'Empty string', input: '', expected: 0 },
  { label: 'Hidden mixed case', input: 'Deploy', expected: 6, hidden: true },
  { label: 'Single letter', input: 'x', expected: 1 },
  { label: 'Hidden spaced text', input: 'hi all', expected: 6, hidden: true },
];

const minutesFromHoursCases = [
  { label: 'Whole hours', input: 2, expected: 120 },
  { label: 'Zero hours', input: 0, expected: 0 },
  { label: 'Hidden one hour', input: 1, expected: 60, hidden: true },
  { label: 'Larger value', input: 5, expected: 300 },
  { label: 'Hidden negative input', input: -1, expected: -60, hidden: true },
];

const absoluteDifferenceCases = [
  { label: 'Left larger', input: [9, 3], expected: 6 },
  { label: 'Right larger', input: [4, 10], expected: 6 },
  { label: 'Hidden equal values', input: [7, 7], expected: 0, hidden: true },
  { label: 'Mixed sign values', input: [-2, 3], expected: 5 },
  { label: 'Hidden negatives', input: [-8, -3], expected: 5, hidden: true },
];

const moduloCases = (divisor) => [
  { label: 'Value above divisor', input: divisor + 7, expected: 7 % divisor },
  { label: 'Exact multiple', input: divisor * 3, expected: 0 },
  { label: 'Hidden small value', input: 4, expected: 4 % divisor, hidden: true },
  { label: 'Zero value', input: 0, expected: 0 },
  { label: 'Hidden larger value', input: divisor * 4 + 2, expected: 2, hidden: true },
];

const sumPairCases = [
  { label: 'Two positives', input: [2, 5], expected: 7 },
  { label: 'Zero plus value', input: [0, 4], expected: 4 },
  { label: 'Hidden negatives', input: [-3, 6], expected: 3, hidden: true },
  { label: 'Two negatives', input: [-2, -8], expected: -10 },
  { label: 'Hidden equal values', input: [9, 9], expected: 18, hidden: true },
];

const cppLowercaseSupport = joinLines([
  '#include <cctype>',
  '#include <string>',
  'static std::string toLower(std::string text) {',
  '    for (char& ch : text) {',
  '        ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));',
  '    }',
  '    return text;',
  '}',
  '',
]);

const cppDigitSupport = joinLines([
  '#include <cctype>',
  '',
]);

const buildCountWordsEndingWithTask = (language, suffix, mode = 'write') => {
  const condition = endsWithExpression(language, 'word', suffix);
  const buggyCondition =
    language === 'python'
      ? 'word.startswith("ing")'
      : language === 'javascript'
      ? 'word.startsWith("ing")'
      : language === 'java'
      ? 'word.startsWith("ing")'
      : 'word.rfind("ing", 0) == 0';
  const correctBody = [
    language === 'python' ? 'count = 0' : 'int count = 0;',
    ...forEachStringLoop(language, 'word', 'words', ifBlock(language, condition, [incrementLine(language, 'count')])),
    returnLine(language, 'count'),
  ];
  const executionCases = [
    { label: `Words ending with ${suffix}`, input: ['logging', 'api', 'ping'], expected: 2 },
    { label: 'No matching suffix', input: ['api', 'tests'], expected: 0 },
    { label: 'Standalone suffix counts', input: ['ing', 'runner', 'thing'], expected: 2 },
    { label: 'Near misses stay out', input: ['ingx', 'stamp', 'ending'], expected: 1 },
    { label: 'Hidden mixed words', input: ['bring', 'run', 'coding'], expected: 2, hidden: true },
  ];

  if (mode === 'debug') {
    return attachExecutionCases(
      {
        starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
          language === 'python' ? 'count = 0' : 'int count = 0;',
          ...forEachStringLoop(language, 'word', 'words', ifBlock(language, buggyCondition, [incrementLine(language, 'count')])),
          returnLine(language, 'count'),
        ]),
        referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
      },
      executionCases
    );
  }

  return attachExecutionCases(
    {
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
        language === 'python' ? 'count = 0' : 'int count = 0;',
        language === 'python' ? `# count words ending with ${suffix}` : `// count words ending with ${suffix}`,
        returnLine(language, 'count'),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
    },
    executionCases
  );
};

const buildFilterLowercaseLongWordsTask = (language, minimumLength, mode = 'write') => {
  const resultInit =
    language === 'python'
      ? 'result = []'
      : language === 'javascript'
      ? 'const result = [];'
      : language === 'java'
      ? 'java.util.List<String> result = new java.util.ArrayList<>();'
      : 'std::vector<std::string> result;';
  const loweredWordExpr =
    language === 'python'
      ? 'word.lower()'
      : language === 'javascript'
      ? 'word.toLowerCase()'
      : language === 'java'
      ? 'word.toLowerCase()'
      : 'toLower(word)';
  const correctBody = [
    resultInit,
    ...forEachStringLoop(
      language,
      'word',
      'words',
      ifBlock(language, `${stringLengthExpression(language, 'word')} > ${minimumLength}`, [
        appendLine(language, 'result', loweredWordExpr),
      ])
    ),
    returnLine(language, 'result'),
  ];
  const baseTask =
    mode === 'completion'
      ? {
          starterCode: renderFunction(language, 'stringArray', 'solution', [{ name: 'words', type: 'stringList' }], [
            resultInit,
            ...forEachStringLoop(
              language,
              'word',
              'words',
              ifBlock(language, `${stringLengthExpression(language, 'word')} > ${minimumLength}`, [''])
            ),
            returnLine(language, 'result'),
          ]),
          referenceCode: renderFunction(language, 'stringArray', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        }
      : {
          starterCode: renderFunction(language, 'stringArray', 'solution', [{ name: 'words', type: 'stringList' }], [
            resultInit,
            language === 'python'
              ? `# keep lowercase words longer than ${minimumLength}`
              : `// keep lowercase words longer than ${minimumLength}`,
            returnLine(language, 'result'),
          ]),
          referenceCode: renderFunction(language, 'stringArray', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        };
  const task = language === 'cpp' ? prependSupportCode(baseTask, cppLowercaseSupport) : baseTask;
  return attachExecutionCases(task, [
    { label: 'Keep long lowercase words', input: ['API', 'Server', 'db', 'HOOKS'], expected: ['server', 'hooks'] },
    { label: 'No matching words', input: ['ui', 'db'], expected: [] },
    { label: 'Boundary length excluded', input: ['tools', 'api', 'Queue'], expected: ['tools', 'queue'] },
    { label: 'Preserve repeated matches', input: ['cache', 'CACHE', 'router'], expected: ['cache', 'cache', 'router'] },
    { label: 'Hidden preserve order', input: ['Queue', 'API', 'Router'], expected: ['queue', 'router'], hidden: true },
  ]);
};

const buildIndexOfFirstPrefixedWordTask = (language, prefix, mode = 'write') => {
  const foundReturn = language === 'cpp' ? 'static_cast<int>(index)' : 'index';
  const missingReturn = '-1';
  const correctBody =
    language === 'python'
      ? [
          'for index, word in enumerate(words):',
          ...indent(ifBlock(language, startsWithExpression(language, 'word', prefix), [returnLine(language, 'index')]), 4),
          returnLine(language, missingReturn),
        ]
      : language === 'javascript'
      ? [
          'for (let index = 0; index < words.length; index += 1) {',
          '    const word = words[index];',
          ...indent(ifBlock(language, startsWithExpression(language, 'word', prefix), [returnLine(language, 'index')]), 4),
          '}',
          returnLine(language, missingReturn),
        ]
      : language === 'java'
      ? [
          'for (int index = 0; index < words.size(); index++) {',
          '    String word = words.get(index);',
          ...indent(ifBlock(language, startsWithExpression(language, 'word', prefix), [returnLine(language, 'index')]), 4),
          '}',
          returnLine(language, missingReturn),
        ]
      : [
          'for (size_t index = 0; index < words.size(); ++index) {',
          '    const std::string& word = words[index];',
          ...indent(ifBlock(language, startsWithExpression(language, 'word', prefix), [returnLine(language, foundReturn)]), 4),
          '}',
          returnLine(language, missingReturn),
        ];
  const buggyCondition = language === 'python' ? 'word == "api"' : 'word == "api"';
  const buggyBody =
    language === 'python'
      ? [
          'for index, word in enumerate(words):',
          ...indent(ifBlock(language, buggyCondition, [returnLine(language, 'index')]), 4),
          returnLine(language, missingReturn),
        ]
      : language === 'javascript'
      ? [
          'for (let index = 0; index < words.length; index += 1) {',
          '    const word = words[index];',
          ...indent(ifBlock(language, buggyCondition, [returnLine(language, 'index')]), 4),
          '}',
          returnLine(language, missingReturn),
        ]
      : language === 'java'
      ? [
          'for (int index = 0; index < words.size(); index++) {',
          '    String word = words.get(index);',
          ...indent(ifBlock(language, buggyCondition, [returnLine(language, 'index')]), 4),
          '}',
          returnLine(language, missingReturn),
        ]
      : [
          'for (size_t index = 0; index < words.size(); ++index) {',
          '    const std::string& word = words[index];',
          ...indent(ifBlock(language, buggyCondition, [returnLine(language, foundReturn)]), 4),
          '}',
          returnLine(language, missingReturn),
        ];

  const executionCases = [
    { label: `Prefix ${prefix} present`, input: ['db', 'apiClient', 'apiGateway'], expected: 1 },
    { label: 'Prefix missing', input: ['worker', 'queue'], expected: -1 },
    { label: 'Ignore partial middle match', input: ['capi', 'apiStart', 'xapi'], expected: 1 },
    { label: 'Exact prefix later in list', input: ['ops', 'docs', 'api'], expected: 2 },
    { label: 'Hidden first item matches', input: ['api', 'apiTools'], expected: 0, hidden: true },
  ];

  if (mode === 'debug') {
    return attachExecutionCases(
      {
        starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], buggyBody),
        referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
      },
      executionCases
    );
  }

  return attachExecutionCases(
    {
      starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
        language === 'python'
          ? `# return the index of the first word that starts with ${prefix}`
          : `// return the index of the first word that starts with ${prefix}`,
        returnLine(language, missingReturn),
      ]),
      referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
    },
    executionCases
  );
};

const buildAllWordsLowercaseTask = (language) => {
  const baseTask = {
    starterCode: renderFunction(language, 'boolean', 'solution', [{ name: 'words', type: 'stringList' }], [
      language === 'python'
        ? '# return True only if every word is already lowercase'
        : '// return true only if every word is already lowercase',
      returnLine(language, language === 'python' ? 'False' : 'false'),
    ]),
    referenceCode: renderFunction(language, 'boolean', 'solution', [{ name: 'words', type: 'stringList' }], [
      ...forEachStringLoop(language, 'word', 'words', ifBlock(language, `word != ${lowercaseExpression(language, 'word')}`, [returnLine(language, language === 'python' ? 'False' : 'false')])),
      returnLine(language, language === 'python' ? 'True' : 'true'),
    ]),
  };
  const task = language === 'cpp' ? prependSupportCode(baseTask, cppLowercaseSupport) : baseTask;
  return attachExecutionCases(task, [
    { label: 'All lowercase', input: ['api', 'worker'], expected: true },
    { label: 'Contains uppercase', input: ['api', 'Worker'], expected: false },
    { label: 'Digits still lowercase-safe', input: ['api2', 'db3'], expected: true },
    { label: 'Mixed punctuation and uppercase', input: ['api-service', 'DB'], expected: false },
    { label: 'Hidden empty list', input: [], expected: true, hidden: true },
  ]);
};

const buildCountDigitsTask = (language) => {
  const body =
    language === 'python'
      ? [
          'count = 0',
          'for char in text:',
          ...indent(ifBlock(language, 'char.isdigit()', [incrementLine(language, 'count')]), 4),
          returnLine(language, 'count'),
        ]
      : language === 'javascript'
      ? [
          'let count = 0;',
          'for (const char of text) {',
          ...indent(ifBlock(language, 'char >= "0" && char <= "9"', [incrementLine(language, 'count')]), 4),
          '}',
          returnLine(language, 'count'),
        ]
      : language === 'java'
      ? [
          'int count = 0;',
          'for (int i = 0; i < text.length(); i++) {',
          '    char charValue = text.charAt(i);',
          ...indent(ifBlock(language, 'Character.isDigit(charValue)', [incrementLine(language, 'count')]), 4),
          '}',
          returnLine(language, 'count'),
        ]
      : [
          'int count = 0;',
          'for (char ch : text) {',
          ...indent(ifBlock(language, 'std::isdigit(static_cast<unsigned char>(ch))', [incrementLine(language, 'count')]), 4),
          '}',
          returnLine(language, 'count'),
        ];
  const baseTask = {
    starterCode: renderFunction(language, 'number', 'solution', [{ name: 'text', type: 'string' }], [
      language === 'python' ? 'count = 0' : 'int count = 0;',
      language === 'python' ? '# count numeric characters in text' : '// count numeric characters in text',
      returnLine(language, 'count'),
    ]),
    referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'text', type: 'string' }], body),
  };
  const task = language === 'cpp' ? prependSupportCode(baseTask, cppDigitSupport) : baseTask;
  return attachExecutionCases(task, [
    { label: 'Two digits', input: 'v2beta5', expected: 2 },
    { label: 'No digits', input: 'release', expected: 0 },
    { label: 'Digits with spaces', input: '1 2 3', expected: 3 },
    { label: 'Punctuation ignored', input: 'v-2.0', expected: 2 },
    { label: 'Hidden repeated digits', input: 'rfc2026', expected: 4, hidden: true },
  ]);
};

const buildAnyWordEndsWithTask = (language, suffix) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'boolean', 'solution', [{ name: 'files', type: 'stringList' }], [
        language === 'python'
          ? `# return True when any file ends with ${suffix}`
          : `// return true when any file ends with ${suffix}`,
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
      referenceCode: renderFunction(language, 'boolean', 'solution', [{ name: 'files', type: 'stringList' }], [
        ...forEachStringLoop(language, 'file', 'files', ifBlock(language, endsWithExpression(language, 'file', suffix), [returnLine(language, language === 'python' ? 'True' : 'true')])),
        returnLine(language, language === 'python' ? 'False' : 'false'),
      ]),
    },
    [
      { label: `Suffix ${suffix} present`, input: ['app.js', 'README.md'], expected: true },
      { label: 'Suffix missing', input: ['api.py', 'worker.ts'], expected: false },
      { label: 'First file matches', input: [`main${suffix}`, 'notes.txt'], expected: true },
      { label: 'Case-sensitive mismatch', input: [`MAIN${suffix.toUpperCase()}`, 'notes.txt'], expected: false },
      { label: 'Hidden second item matches', input: ['notes.txt', `build${suffix}`], expected: true, hidden: true },
    ]
  );

const buildLongestWordTask = (language) =>
  attachExecutionCases(
    {
      starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], [
        language === 'python'
          ? 'best = ""'
          : language === 'javascript'
          ? 'let best = "";'
          : language === 'java'
          ? 'String best = "";'
          : 'std::string best;',
        returnLine(language, 'best'),
      ]),
      referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], [
        language === 'python'
          ? 'best = ""'
          : language === 'javascript'
          ? 'let best = "";'
          : language === 'java'
          ? 'String best = "";'
          : 'std::string best;',
        ...forEachStringLoop(language, 'word', 'words', ifBlock(language, `${stringLengthExpression(language, 'word')} > ${stringLengthExpression(language, 'best')}`, [`best = word${lineEnd(language)}`])),
        returnLine(language, 'best'),
      ]),
    },
    [
      { label: 'Distinct lengths', input: ['api', 'gateway', 'ui'], expected: 'gateway' },
      { label: 'Tie keeps first', input: ['cache', 'hooks'], expected: 'cache' },
      { label: 'Single word', input: ['router'], expected: 'router' },
      { label: 'Later word wins when longer', input: ['api', 'db', 'feature'], expected: 'feature' },
      { label: 'Hidden empty list', input: [], expected: '', hidden: true },
    ]
  );

const buildUniqueLowercaseWordCountTask = (language) => {
  const baseTask =
    language === 'python'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'seen = set()',
            returnLine(language, '0'),
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'seen = set()',
            ...forEachStringLoop(language, 'word', 'words', ['seen.add(word.lower())']),
            returnLine(language, 'len(seen)'),
          ]),
        }
      : language === 'javascript'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'const seen = new Set();',
            returnLine(language, '0'),
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'const seen = new Set();',
            ...forEachStringLoop(language, 'word', 'words', ['seen.add(word.toLowerCase());']),
            returnLine(language, 'seen.size'),
          ]),
        }
      : language === 'java'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'java.util.Set<String> seen = new java.util.HashSet<>();',
            returnLine(language, '0'),
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'java.util.Set<String> seen = new java.util.HashSet<>();',
            ...forEachStringLoop(language, 'word', 'words', ['seen.add(word.toLowerCase());']),
            returnLine(language, 'seen.size()'),
          ]),
        }
      : prependSupportCode(
          {
            starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
              'std::set<std::string> seen;',
              returnLine(language, '0'),
            ]),
            referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
              'std::set<std::string> seen;',
              ...forEachStringLoop(language, 'word', 'words', ['seen.insert(toLower(word));']),
              returnLine(language, 'static_cast<int>(seen.size())'),
            ]),
          },
          joinLines(['#include <cctype>', '#include <set>', '#include <string>', cppLowercaseSupport])
        );

  return attachExecutionCases(baseTask, [
    { label: 'Case-insensitive duplicates', input: ['API', 'api', 'Worker'], expected: 2 },
    { label: 'All unique', input: ['db', 'queue'], expected: 2 },
    { label: 'Many duplicates collapse', input: ['Api', 'API', 'api', 'Db'], expected: 2 },
    { label: 'Mixed casing still unique by value', input: ['UI', 'ui', 'Ui', 'worker'], expected: 2 },
    { label: 'Hidden empty list', input: [], expected: 0, hidden: true },
  ]);
};

const buildFirstDuplicateLowercaseTask = (language, mode = 'write') => {
  const supportCode =
    language === 'cpp' ? joinLines(['#include <set>', cppLowercaseSupport]) : null;
  const correctBody =
    language === 'python'
      ? [
          'seen = set()',
          'for word in words:',
          '    lowered = word.lower()',
          '    if lowered in seen:',
          '        return lowered',
          '    seen.add(lowered)',
          'return ""',
        ]
      : language === 'javascript'
      ? [
          'const seen = new Set();',
          'for (const word of words) {',
          '    const lowered = word.toLowerCase();',
          '    if (seen.has(lowered)) {',
          '        return lowered;',
          '    }',
          '    seen.add(lowered);',
          '}',
          'return "";',
        ]
      : language === 'java'
      ? [
          'java.util.Set<String> seen = new java.util.HashSet<>();',
          'for (String word : words) {',
          '    String lowered = word.toLowerCase();',
          '    if (seen.contains(lowered)) {',
          '        return lowered;',
          '    }',
          '    seen.add(lowered);',
          '}',
          'return "";',
        ]
      : [
          'std::set<std::string> seen;',
          'for (const auto& word : words) {',
          '    std::string lowered = toLower(word);',
          '    if (seen.find(lowered) != seen.end()) {',
          '        return lowered;',
          '    }',
          '    seen.insert(lowered);',
          '}',
          'return "";',
        ];
  const buggyBody =
    language === 'python'
      ? [
          'seen = set()',
          'for word in words:',
          '    lowered = word.lower()',
          '    if word in seen:',
          '        return lowered',
          '    seen.add(lowered)',
          'return ""',
        ]
      : language === 'javascript'
      ? [
          'const seen = new Set();',
          'for (const word of words) {',
          '    const lowered = word.toLowerCase();',
          '    if (seen.has(word)) {',
          '        return lowered;',
          '    }',
          '    seen.add(lowered);',
          '}',
          'return "";',
        ]
      : language === 'java'
      ? [
          'java.util.Set<String> seen = new java.util.HashSet<>();',
          'for (String word : words) {',
          '    String lowered = word.toLowerCase();',
          '    if (seen.contains(word)) {',
          '        return lowered;',
          '    }',
          '    seen.add(lowered);',
          '}',
          'return "";',
        ]
      : [
          'std::set<std::string> seen;',
          'for (const auto& word : words) {',
          '    std::string lowered = toLower(word);',
          '    if (seen.find(word) != seen.end()) {',
          '        return lowered;',
          '    }',
          '    seen.insert(lowered);',
          '}',
          'return "";',
        ];
  const completionBody =
    language === 'python'
      ? [
          'seen = set()',
          'for word in words:',
          '    lowered = word.lower()',
          '    # return the first lowercase duplicate here',
          'return ""',
        ]
      : language === 'javascript'
      ? [
          'const seen = new Set();',
          'for (const word of words) {',
          '    const lowered = word.toLowerCase();',
          '    // return the first lowercase duplicate here',
          '}',
          'return "";',
        ]
      : language === 'java'
      ? [
          'java.util.Set<String> seen = new java.util.HashSet<>();',
          'for (String word : words) {',
          '    String lowered = word.toLowerCase();',
          '    // return the first lowercase duplicate here',
          '}',
          'return "";',
        ]
      : [
          'std::set<std::string> seen;',
          'for (const auto& word : words) {',
          '    std::string lowered = toLower(word);',
          '    // return the first lowercase duplicate here',
          '}',
          'return "";',
        ];
  const executionCases = [
    { label: 'Mixed-case duplicate', input: ['API', 'db', 'api', 'cache'], expected: 'api' },
    { label: 'No duplicates', input: ['worker', 'queue'], expected: '' },
    { label: 'Earlier duplicate wins', input: ['Ui', 'API', 'ui', 'api'], expected: 'ui' },
    { label: 'Later duplicate group', input: ['One', 'two', 'TWO', 'one'], expected: 'two' },
    { label: 'Hidden exact pair', input: ['Tag', 'tag'], expected: 'tag', hidden: true },
  ];
  const baseTask =
    mode === 'debug'
      ? {
          starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], buggyBody),
          referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        }
      : mode === 'completion'
      ? {
          starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], completionBody),
          referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        }
      : {
          starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], [
            language === 'python'
              ? '# return the first lowercase word that appears twice'
              : '// return the first lowercase word that appears twice',
            'return ""',
          ]),
          referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        };
  const task = supportCode ? prependSupportCode(baseTask, supportCode) : baseTask;
  return attachExecutionCases(task, executionCases);
};

const buildMostFrequentLowercaseWordTask = (language, mode = 'write') => {
  const supportCode =
    language === 'cpp' ? joinLines(['#include <map>', cppLowercaseSupport]) : null;
  const correctBody =
    language === 'python'
      ? [
          'counts = {}',
          'best = ""',
          'best_count = 0',
          'for word in words:',
          '    lowered = word.lower()',
          '    counts[lowered] = counts.get(lowered, 0) + 1',
          '    if counts[lowered] > best_count:',
          '        best = lowered',
          '        best_count = counts[lowered]',
          'return best',
        ]
      : language === 'javascript'
      ? [
          'const counts = new Map();',
          'let best = "";',
          'let bestCount = 0;',
          'for (const word of words) {',
          '    const lowered = word.toLowerCase();',
          '    const nextCount = (counts.get(lowered) ?? 0) + 1;',
          '    counts.set(lowered, nextCount);',
          '    if (nextCount > bestCount) {',
          '        best = lowered;',
          '        bestCount = nextCount;',
          '    }',
          '}',
          'return best;',
        ]
      : language === 'java'
      ? [
          'java.util.Map<String, Integer> counts = new java.util.HashMap<>();',
          'String best = "";',
          'int bestCount = 0;',
          'for (String word : words) {',
          '    String lowered = word.toLowerCase();',
          '    int nextCount = counts.getOrDefault(lowered, 0) + 1;',
          '    counts.put(lowered, nextCount);',
          '    if (nextCount > bestCount) {',
          '        best = lowered;',
          '        bestCount = nextCount;',
          '    }',
          '}',
          'return best;',
        ]
      : [
          'std::map<std::string, int> counts;',
          'std::string best;',
          'int bestCount = 0;',
          'for (const auto& word : words) {',
          '    std::string lowered = toLower(word);',
          '    int nextCount = ++counts[lowered];',
          '    if (nextCount > bestCount) {',
          '        best = lowered;',
          '        bestCount = nextCount;',
          '    }',
          '}',
          'return best;',
        ];
  const completionBody =
    language === 'python'
      ? [
          'counts = {}',
          'best = ""',
          'best_count = 0',
          'for word in words:',
          '    lowered = word.lower()',
          '    # update the frequency map and best word here',
          'return best',
        ]
      : language === 'javascript'
      ? [
          'const counts = new Map();',
          'let best = "";',
          'let bestCount = 0;',
          'for (const word of words) {',
          '    const lowered = word.toLowerCase();',
          '    // update the frequency map and best word here',
          '}',
          'return best;',
        ]
      : language === 'java'
      ? [
          'java.util.Map<String, Integer> counts = new java.util.HashMap<>();',
          'String best = "";',
          'int bestCount = 0;',
          'for (String word : words) {',
          '    String lowered = word.toLowerCase();',
          '    // update the frequency map and best word here',
          '}',
          'return best;',
        ]
      : [
          'std::map<std::string, int> counts;',
          'std::string best;',
          'int bestCount = 0;',
          'for (const auto& word : words) {',
          '    std::string lowered = toLower(word);',
          '    // update the frequency map and best word here',
          '}',
          'return best;',
        ];
  const baseTask =
    mode === 'completion'
      ? {
          starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], completionBody),
          referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        }
      : {
          starterCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], [
            language === 'python'
              ? '# return the lowercase word with the highest frequency'
              : '// return the lowercase word with the highest frequency',
            'return ""',
          ]),
          referenceCode: renderFunction(language, 'string', 'solution', [{ name: 'words', type: 'stringList' }], correctBody),
        };
  const task = supportCode ? prependSupportCode(baseTask, supportCode) : baseTask;
  return attachExecutionCases(task, [
    { label: 'Simple leader', input: ['API', 'db', 'api', 'API', 'worker'], expected: 'api' },
    { label: 'Tie keeps earliest leader', input: ['worker', 'db', 'db', 'Worker'], expected: 'db' },
    { label: 'Single word', input: ['one'], expected: 'one' },
    { label: 'Leader appears later', input: ['Ui', 'ui', 'API', 'api', 'api'], expected: 'api' },
    { label: 'Hidden empty list', input: [], expected: '', hidden: true },
  ]);
};

const buildDuplicateLowercaseGroupCountTask = (language) => {
  const supportCode =
    language === 'cpp' ? joinLines(['#include <map>', cppLowercaseSupport]) : null;
  const baseTask =
    language === 'python'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'counts = {}',
            'duplicates = 0',
            'return duplicates',
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'counts = {}',
            'duplicates = 0',
            'for word in words:',
            '    lowered = word.lower()',
            '    counts[lowered] = counts.get(lowered, 0) + 1',
            '    if counts[lowered] == 2:',
            '        duplicates += 1',
            'return duplicates',
          ]),
        }
      : language === 'javascript'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'const counts = new Map();',
            'let duplicates = 0;',
            'return duplicates;',
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'const counts = new Map();',
            'let duplicates = 0;',
            'for (const word of words) {',
            '    const lowered = word.toLowerCase();',
            '    const nextCount = (counts.get(lowered) ?? 0) + 1;',
            '    counts.set(lowered, nextCount);',
            '    if (nextCount === 2) {',
            '        duplicates += 1;',
            '    }',
            '}',
            'return duplicates;',
          ]),
        }
      : language === 'java'
      ? {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'java.util.Map<String, Integer> counts = new java.util.HashMap<>();',
            'int duplicates = 0;',
            'return duplicates;',
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'java.util.Map<String, Integer> counts = new java.util.HashMap<>();',
            'int duplicates = 0;',
            'for (String word : words) {',
            '    String lowered = word.toLowerCase();',
            '    int nextCount = counts.getOrDefault(lowered, 0) + 1;',
            '    counts.put(lowered, nextCount);',
            '    if (nextCount == 2) {',
            '        duplicates += 1;',
            '    }',
            '}',
            'return duplicates;',
          ]),
        }
      : {
          starterCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'std::map<std::string, int> counts;',
            'int duplicates = 0;',
            'return duplicates;',
          ]),
          referenceCode: renderFunction(language, 'number', 'solution', [{ name: 'words', type: 'stringList' }], [
            'std::map<std::string, int> counts;',
            'int duplicates = 0;',
            'for (const auto& word : words) {',
            '    std::string lowered = toLower(word);',
            '    int nextCount = ++counts[lowered];',
            '    if (nextCount == 2) {',
            '        duplicates += 1;',
            '    }',
            '}',
            'return duplicates;',
          ]),
        };
  const task = supportCode ? prependSupportCode(baseTask, supportCode) : baseTask;
  return attachExecutionCases(task, [
    { label: 'One duplicate group', input: ['API', 'api', 'db'], expected: 1 },
    { label: 'Two duplicate groups', input: ['api', 'db', 'DB', 'Api'], expected: 2 },
    { label: 'No duplicate groups', input: ['one', 'two'], expected: 0 },
    { label: 'Multiple repeats count once', input: ['Ui', 'ui', 'UI', 'api', 'API'], expected: 2 },
    { label: 'Hidden empty list', input: [], expected: 0, hidden: true },
  ]);
};

const beginnerSyntaxOutputSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderConcatOutput(language, 'Unit', 3).trim()}`,
      options: ['Unit3', 'Unit 3', '3 Unit', 'Error'],
      correctAnswer: 1,
      explanation: 'The string includes a space before the number.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArithmeticOutput(language, 4, 3, 2).trim()}`,
      options: ['7', '8', '14', '11'],
      correctAnswer: 2,
      explanation: 'The variable becomes 7, then the code prints 7 * 2.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLengthMathOutput(language, 'debug', 1).trim()}`,
      options: ['4', '5', '6', 'Error'],
      correctAnswer: 2,
      explanation: '"debug" has length 5, then the code adds 1.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderModuloOutput(language, 17, 5).trim()}`,
      options: ['2', '3', '5', '12'],
      correctAnswer: 0,
      explanation: '17 divided by 5 leaves remainder 2.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderCounterOutput(language, 2, [3, 4]).trim()}`,
      options: ['5', '7', '9', '14'],
      correctAnswer: 2,
      explanation: 'The counter starts at 2, then becomes 5, then 9.',
    }),
  },
];

const beginnerTypesReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderParsedAdditionOutput(language, '8', 2).trim()}`,
      options: ['10', '82', '16', 'Error'],
      correctAnswer: 0,
      explanation: 'The text is converted to the number 8 before the addition.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderParsedMultiplyOutput(language, '6', 3).trim()}`,
      options: ['18', '63', '9', 'Error'],
      correctAnswer: 0,
      explanation: 'After conversion, the value is multiplied numerically.',
    }),
  },
  {
    render: (language) => ({
      prompt:
        'What is printed?\n\n' +
        joinLines([
          numberAssignment(language, 'value', 5, true),
          language === 'python' ? 'value = value + 4' : 'value = value + 4;',
          printLine(language, 'value - 3'),
        ]).trim(),
      options: ['6', '7', '8', '9'],
      correctAnswer: 0,
      explanation: 'The variable becomes 9, then the code subtracts 3.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLengthMathOutput(language, 'loop', 2).trim()}`,
      options: ['4', '5', '6', '7'],
      correctAnswer: 2,
      explanation: '"loop" has length 4, then the code adds 2.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderModuloOutput(language, 22, 6).trim()}`,
      options: ['2', '3', '4', '5'],
      correctAnswer: 2,
      explanation: '22 divided by 6 leaves remainder 4.',
    }),
  },
];

const beginnerFlowTraceSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'score', 4, '>=', 5, 'pass', 'retry').trim()}`,
      options: ['pass', 'retry', 'passretry', 'Nothing'],
      correctAnswer: 1,
      explanation: '4 is not at least 5, so the else branch runs.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderNestedIfOutput(language, 7).trim()}`,
      options: ['top', 'mid', 'low', 'Nothing'],
      correctAnswer: 1,
      explanation: '7 is not 8 or above, but it is at least 5.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderAndConditionOutput(language, 19, 72).trim()}`,
      options: ['pass', 'wait', 'true', 'false'],
      correctAnswer: 0,
      explanation: 'Both conditions are satisfied, so the pass branch runs.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'temp', 11, '>', 20, 'hot', 'cool').trim()}`,
      options: ['hot', 'cool', '11', '20'],
      correctAnswer: 1,
      explanation: '11 is not greater than 20.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderNestedIfOutput(language, 3).trim()}`,
      options: ['top', 'mid', 'low', 'Error'],
      correctAnswer: 2,
      explanation: '3 fails both higher thresholds, so the fallback branch runs.',
    }),
  },
];

const beginnerDsReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayIndexOutput(language, [4, 7, 9], 1).trim()}`,
      options: ['4', '7', '9', 'Error'],
      correctAnswer: 1,
      explanation: 'Index 1 is the second element.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [3, 5, 8]).trim()}`,
      options: ['8', '11', '13', '16'],
      correctAnswer: 1,
      explanation: 'The code adds the first value 3 and the last value 8.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayLengthOutput(language, [2, 4, 6, 8]).trim()}`,
      options: ['3', '4', '5', '8'],
      correctAnswer: 1,
      explanation: 'There are four values in the collection.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayMutationOutput(language, [1, 2, 3], 1, 9).trim()}`,
      options: ['3', '9', '10', '12'],
      correctAnswer: 2,
      explanation: 'After the update, the values at index 0 and 1 are 1 and 9.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayIndexOutput(language, [6, 2, 5, 1], 3).trim()}`,
      options: ['1', '2', '5', '6'],
      correctAnswer: 0,
      explanation: 'Index 3 points to the fourth value.',
    }),
  },
];

const beginnerFunctionCompletionSpecs = [
  {
    prompt: 'Complete `solution(name)` so it returns `"Hi " + name`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'string',
        [{ name: 'name', type: 'string' }],
        '"Hi " + name',
        '',
        prefixedTextCases('Hi ')
      ),
    requiredSnippets: ['return', '"Hi "', 'name'],
    explanation: 'Return the greeting string instead of printing it.',
  },
  {
    prompt: 'Complete `solution(value)` so it returns `value * 2`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'value', type: 'number' }],
        'value * 2',
        '',
        multiplyCases(2)
      ),
    requiredSnippets: ['return', 'value', '* 2'],
    explanation: 'Multiply the input by 2 and return the result.',
  },
  {
    prompt: 'Complete `solution(value)` so it returns whether `value` is even.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'boolean',
        [{ name: 'value', type: 'number' }],
        'value % 2 == 0',
        language === 'python' ? 'False' : 'false',
        evenValueCases
      ),
    requiredSnippets: ['return', '% 2', '== 0'],
    explanation: 'An even number leaves remainder 0 when divided by 2.',
  },
  {
    prompt: 'Complete `solution(amount)` so it returns `amount + 5`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'amount', type: 'number' }],
        'amount + 5',
        '',
        offsetCases(5)
      ),
    requiredSnippets: ['return', 'amount', '+ 5'],
    explanation: 'The function should add the fixed fee and return the new amount.',
  },
  {
    prompt: 'Complete `solution(left, right)` so it returns the larger number.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [
          { name: 'left', type: 'number' },
          { name: 'right', type: 'number' },
        ],
        language === 'python'
          ? 'left if left > right else right'
          : 'left > right ? left : right',
        '',
        maxPairCases
      ),
    requiredSnippets: ['return', 'left', 'right'],
    explanation: 'Compare the two inputs and return the larger one.',
  },
];

const beginnerFunctionWriteSpecs = [
  {
    prompt: 'Implement `solution(word)` so it returns the length of `word`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'word', type: 'string' }],
        stringLengthExpression(language, 'word'),
        '',
        stringLengthCases
      ),
    requiredSnippets: ['return', 'word'],
    explanation: 'Return the word length directly.',
  },
  {
    prompt: 'Implement `solution(hours)` so it returns how many minutes are in `hours`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'hours', type: 'number' }],
        'hours * 60',
        '',
        minutesFromHoursCases
      ),
    requiredSnippets: ['return', 'hours', '* 60'],
    explanation: 'Each hour contains 60 minutes.',
  },
  {
    prompt: 'Implement `solution(left, right)` so it returns the absolute difference between the two numbers.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [
          { name: 'left', type: 'number' },
          { name: 'right', type: 'number' },
        ],
        language === 'python'
          ? 'abs(left - right)'
          : language === 'javascript'
          ? 'Math.abs(left - right)'
          : language === 'java'
          ? 'Math.abs(left - right)'
          : 'std::abs(left - right)',
        '',
        absoluteDifferenceCases
      ),
    requiredSnippets: ['return', 'left', 'right'],
    explanation: 'Use the absolute difference so the result is never negative.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns how many numbers in `values` are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'write'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Scan the list and count only values above 10.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns the sum of the first and last values.',
    build: (language) => buildSumFirstAndLastTask(language),
    requiredSnippets: ['return', 'values[0]'],
    explanation: 'Read the first and last values and add them.',
  },
];

const beginnerDebugFixSpecs = [
  { render: renderCallBugFix },
  { render: renderEvenConditionBugFix },
  { render: renderLastIndexBugFix },
  { render: renderWrongAccumulatorBugFix },
  { render: renderReturnInsideLoopBugFix },
];

const beginnerDebugCodeSpecs = [
  {
    prompt: 'Fix `solution(values)` so it returns the count of positive numbers.',
    build: (language) => buildCountGreaterThanTask(language, 0, 'debug'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'The function should count matches instead of storing the last matching value.',
  },
  {
    prompt: 'Fix `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'debug'),
    requiredSnippets: ['total', '% 2 == 0', 'return'],
    explanation: 'The current version adds odd numbers instead of even ones.',
  },
  {
    prompt: 'Fix `solution(values)` so it counts numbers greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'debug'),
    requiredSnippets: ['count', '> 10', 'return'],
    explanation: 'The function should increment the counter for each matching value.',
  },
  {
    prompt: 'Fix `solution(values)` so it returns the largest number.',
    build: (language) => buildMaxTask(language, 'debug'),
    requiredSnippets: ['largest', 'value > largest', 'return largest'],
    explanation: 'The comparison is reversed and the initial value is brittle.',
  },
  {
    prompt: 'Fix `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'debug'),
    requiredSnippets: ['result', 'value > 0', 'return result'],
    explanation: 'Push matching values into the result instead of modifying the loop variable.',
  },
];

const beginnerMiniProblemSpecs = [
  {
    prompt: 'Implement `solution(values)` so it returns how many numbers in `values` are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'write'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Count only the values above the threshold.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'write'),
    requiredSnippets: ['total', 'for', 'return'],
    explanation: 'Add only even values to the running total.',
  },
  {
    prompt: 'Implement `solution(values, target)` so it returns true if `target` appears in `values`, else false.',
    build: (language) => buildContainsTargetTask(language),
    requiredSnippets: ['for', 'target', 'return'],
    explanation: 'Scan until the target is found, then return immediately.',
  },
  {
    prompt: 'Implement `solution(text)` so it returns how many vowels appear in `text`.',
    build: (language) => buildCountVowelsTask(language),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Check each character and count only vowels.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'write'),
    requiredSnippets: ['result', 'for', 'return'],
    explanation: 'Build a new collection from the matching values.',
  },
];

const beginnerPressureReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [1, 2, 3]).trim()}`,
      options: ['3', '5', '6', '123'],
      correctAnswer: 2,
      explanation: 'The loop sums all three values.',
      expectedDurationSeconds: 55,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopEvenCountOutput(language, [2, 3, 4, 5]).trim()}`,
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'Only 2 and 4 are even.',
      expectedDurationSeconds: 55,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [1, 4, 7]).trim()}`,
      options: ['5', '7', '8', '11'],
      correctAnswer: 2,
      explanation: 'The code adds the first value 1 and the last value 7.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'level', 9, '>', 3, 'up', 'stay').trim()}`,
      options: ['up', 'stay', '9', '3'],
      correctAnswer: 0,
      explanation: '9 is greater than 3, so the first branch runs.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderCounterOutput(language, 1, [2, 2, 1]).trim()}`,
      options: ['4', '5', '6', '7'],
      correctAnswer: 2,
      explanation: 'The counter becomes 3, then 5, then 6.',
      expectedDurationSeconds: 50,
    }),
  },
];

const juniorReadFastSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [2, 4, 1, 3]).trim()}`,
      options: ['6', '8', '10', '14'],
      correctAnswer: 2,
      explanation: 'The loop accumulates all values in order.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['a', [1, 2]], ['b', [4]]], 'a').trim()}`,
      options: ['2', '3', '4', '7'],
      correctAnswer: 1,
      explanation: 'The selected list contains 1 and 2, so the total is 3.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['ana', 4], ['leo', 7]], 'mila', 0).trim()}`,
      options: ['null', '0', '4', '7'],
      correctAnswer: 1,
      explanation: 'The code uses the default because the key is missing.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopBreakOutput(language, [3, 5, 7, 9], 7).trim()}`,
      options: ['3', '8', '15', '24'],
      correctAnswer: 1,
      explanation: 'The loop stops before adding 7, so it only keeps 3 + 5.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayMutationOutput(language, [2, 6, 1], 2, 5).trim()}`,
      options: ['5', '6', '7', '9'],
      correctAnswer: 2,
      explanation: 'After the update, the code prints the new last value plus the first value.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopEvenCountOutput(language, [1, 2, 4, 7, 8]).trim()}`,
      options: ['2', '3', '4', '5'],
      correctAnswer: 1,
      explanation: 'Three numbers are even: 2, 4, and 8.',
    }),
  },
];

const juniorPredictOutputSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['ana', 4], ['leo', 7]], 'ana', 0).trim()}`,
      options: ['0', '4', '7', 'Error'],
      correctAnswer: 1,
      explanation: 'The key exists, so the stored value is used.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapIncrementOutput(language, [['ana', 4], ['leo', 7]], 'leo', 2).trim()}`,
      options: ['7', '8', '9', '10'],
      correctAnswer: 2,
      explanation: 'The selected entry increases from 7 to 9.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['red', [2, 2]], ['blue', [5]]], 'red').trim()}`,
      options: ['2', '4', '5', '9'],
      correctAnswer: 1,
      explanation: 'The values under "red" sum to 4.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopBreakOutput(language, [1, 4, 6, 9], 6).trim()}`,
      options: ['1', '5', '11', '20'],
      correctAnswer: 1,
      explanation: 'The loop adds 1 and 4, then stops when it reaches 6.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [2, 5, 9, 1]).trim()}`,
      options: ['3', '7', '10', '11'],
      correctAnswer: 0,
      explanation: 'The expression adds the first element 2 and the last element 1.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [5, 1, 2]).trim()}`,
      options: ['6', '7', '8', '12'],
      correctAnswer: 2,
      explanation: 'The running total becomes 5, then 6, then 8.',
    }),
  },
];

const juniorBestFixSpecs = [
  { render: renderEvenConditionBugFix },
  { render: renderMissingDefaultBugFix },
  { render: renderOffByOneBugFix },
  { render: renderReturnInsideLoopBugFix },
  { render: renderLastIndexBugFix },
  { render: renderWrongAccumulatorBugFix },
];

const juniorDebugCodeSpecs = [
  {
    prompt: 'Fix `solution(values)` so it returns the largest number.',
    build: (language) => buildMaxTask(language, 'debug'),
    requiredSnippets: ['largest', 'value > largest', 'return largest'],
    explanation: 'The current method compares in the wrong direction.',
  },
  {
    prompt: 'Fix `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'debug'),
    requiredSnippets: ['count', 'value == target', 'return'],
    explanation: 'The current version counts non-matching values instead.',
  },
  {
    prompt: 'Fix `solution(scores)` so it counts scores greater than 5.',
    build: (language) => buildCountMapAboveLimitTask(language, 5, 'debug'),
    requiredSnippets: ['count', '> 5', 'return'],
    explanation: 'The comparison should count only values above the limit.',
  },
  {
    prompt: 'Fix `solution(words)` so it returns the length of the longest word.',
    build: (language) => buildLongestWordLengthTask(language, 'debug'),
    requiredSnippets: ['best', 'return'],
    explanation: 'The comparison should update the best length on larger words.',
  },
  {
    prompt: 'Fix `solution(values)` so it keeps only the first appearance of each number.',
    build: (language) => buildDedupeTask(language, 'debug'),
    requiredSnippets: ['result', 'return result'],
    explanation: 'The current code adds duplicates instead of skipping them.',
  },
  {
    prompt: 'Fix `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'debug'),
    requiredSnippets: ['result', 'value > 0', 'return result'],
    explanation: 'The correct solution should append matching values to the result.',
  },
];

const juniorWriteHelperSpecs = [
  {
    prompt: 'Implement `solution(text)` so it returns how many vowels appear in `text`.',
    build: (language) => buildCountVowelsTask(language),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Scan the string and count only vowels.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'write'),
    requiredSnippets: ['total', 'for', 'return'],
    explanation: 'Add only even values to the running total.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns the largest number.',
    build: (language) => buildMaxTask(language, 'write'),
    requiredSnippets: ['largest', 'for', 'return'],
    explanation: 'Track the largest value seen so far.',
  },
  {
    prompt: 'Implement `solution(words)` so it returns the length of the longest word.',
    build: (language) => buildLongestWordLengthTask(language, 'write'),
    requiredSnippets: ['best', 'for', 'return'],
    explanation: 'Track the best length while scanning the words.',
  },
  {
    prompt: 'Implement `solution(scores)` so it counts how many scores are greater than 5.',
    build: (language) => buildCountMapAboveLimitTask(language, 5, 'write'),
    requiredSnippets: ['count', 'return'],
    explanation: 'Count only the values above the cutoff.',
  },
  {
    prompt: 'Implement `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'write'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'Increment the counter on every exact match.',
  },
];

const juniorCompleteDataSpecs = [
  {
    prompt: 'Complete `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'completion'),
    requiredSnippets: ['result', 'value > 0', 'return result'],
    explanation: 'Append matching values to the output collection.',
  },
  {
    prompt: 'Complete `solution(values)` so it returns how many numbers are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'completion'),
    requiredSnippets: ['count', '> 10', 'return count'],
    explanation: 'Increment the counter when the condition matches.',
  },
  {
    prompt: 'Complete `solution(values)` so it returns a collection containing only the first appearance of each number.',
    build: (language) => buildDedupeTask(language, 'completion'),
    requiredSnippets: ['result', 'return result'],
    explanation: 'Only append values that are not already in the result.',
  },
  {
    prompt: 'Complete `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'write'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'Count one point for each exact match.',
  },
  {
    prompt: 'Complete `solution(scores)` so it counts how many scores are greater than 5.',
    build: (language) => buildCountMapAboveLimitTask(language, 5, 'write'),
    requiredSnippets: ['count', 'return'],
    explanation: 'Scan the values of the map and count only scores above 5.',
  },
  {
    prompt: 'Complete `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'write'),
    requiredSnippets: ['total', '% 2 == 0', 'return total'],
    explanation: 'Add values to the total only when they are even.',
  },
];

const juniorDsReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['a', [1, 3]], ['b', [2]]], 'a').trim()}`,
      options: ['2', '3', '4', '6'],
      correctAnswer: 2,
      explanation: 'The selected list contains 1 and 3, which sum to 4.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['ana', 4], ['leo', 7]], 'mila', 2).trim()}`,
      options: ['0', '2', '4', '7'],
      correctAnswer: 1,
      explanation: 'The missing key falls back to the provided default value.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapIncrementOutput(language, [['red', 2], ['blue', 5]], 'red', 3).trim()}`,
      options: ['2', '3', '5', '8'],
      correctAnswer: 2,
      explanation: 'The selected entry increases from 2 to 5.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [5, 1, 9]).trim()}`,
      options: ['6', '10', '14', '15'],
      correctAnswer: 2,
      explanation: 'The expression adds the first value 5 and the last value 9.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayLengthOutput(language, [1, 3, 5, 7, 9]).trim()}`,
      options: ['4', '5', '6', '9'],
      correctAnswer: 1,
      explanation: 'There are five values in the collection.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['core', [2, 2, 1]], ['extra', [5]]], 'core').trim()}`,
      options: ['3', '4', '5', '6'],
      correctAnswer: 2,
      explanation: 'The values under the selected key add up to 5.',
    }),
  },
];

const juniorFlowReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopEvenCountOutput(language, [2, 4, 5, 7, 8]).trim()}`,
      options: ['2', '3', '4', '5'],
      correctAnswer: 1,
      explanation: 'The even values are 2, 4, and 8.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopBreakOutput(language, [4, 1, 6, 2], 6).trim()}`,
      options: ['4', '5', '7', '13'],
      correctAnswer: 1,
      explanation: 'The loop stops when it reaches 6, so only 4 and 1 are added.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'score', 12, '>=', 10, 'gold', 'silver').trim()}`,
      options: ['gold', 'silver', '10', '12'],
      correctAnswer: 0,
      explanation: '12 satisfies the threshold, so the first branch runs.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderNestedIfOutput(language, 9).trim()}`,
      options: ['top', 'mid', 'low', 'Error'],
      correctAnswer: 0,
      explanation: '9 satisfies the highest threshold.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [4, 1, 3]).trim()}`,
      options: ['4', '5', '8', '13'],
      correctAnswer: 2,
      explanation: 'The loop adds 4, then 1, then 3.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderAndConditionOutput(language, 17, 69).trim()}`,
      options: ['pass', 'wait', 'true', 'false'],
      correctAnswer: 1,
      explanation: 'The age condition fails, so the fallback branch runs.',
    }),
  },
];

const juniorMiniProblemSpecs = [
  {
    prompt: 'Implement `solution(values, target)` so it returns true if `target` appears in `values`, else false.',
    build: (language) => buildContainsTargetTask(language),
    requiredSnippets: ['target', 'for', 'return'],
    explanation: 'Return immediately once the target is found.',
  },
  {
    prompt: 'Implement `solution(scores)` so it counts how many scores are greater than 5.',
    build: (language) => buildCountMapAboveLimitTask(language, 5, 'write'),
    requiredSnippets: ['count', 'return'],
    explanation: 'Scan the score values and count only those above 5.',
  },
  {
    prompt: 'Implement `solution(words)` so it returns the length of the longest word.',
    build: (language) => buildLongestWordLengthTask(language, 'write'),
    requiredSnippets: ['best', 'for', 'return'],
    explanation: 'Track the maximum word length while scanning the collection.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns a collection containing only the first appearance of each number.',
    build: (language) => buildDedupeTask(language, 'write'),
    requiredSnippets: ['result', 'return result'],
    explanation: 'Preserve the first occurrence and skip later duplicates.',
  },
  {
    prompt: 'Implement `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'write'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'Increment the counter on every exact match.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'Return false immediately when a non-positive number appears.',
  },
];

const juniorMiniProblem2Specs = [
  {
    prompt: 'Implement `solution(text)` so it returns true if `text` is a palindrome, else false.',
    build: (language) => buildPalindromeTask(language),
    requiredSnippets: ['return'],
    explanation: 'Compare the text with its reversed form.',
  },
  {
    prompt: 'Implement `solution(text)` so it returns how many vowels appear in `text`.',
    build: (language) => buildCountVowelsTask(language),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Count only characters that are vowels.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns how many numbers in `values` are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'write'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Count values only when they are above the threshold.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'write'),
    requiredSnippets: ['total', 'for', 'return'],
    explanation: 'The solution should accumulate only even values.',
  },
  {
    prompt: 'Implement `solution(words)` so it returns the length of the longest word.',
    build: (language) => buildLongestWordLengthTask(language, 'write'),
    requiredSnippets: ['best', 'return'],
    explanation: 'Track the best length while scanning the words.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'write'),
    requiredSnippets: ['result', 'return result'],
    explanation: 'Build a new collection with only matching values.',
  },
];

const juniorPressureReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopEvenCountOutput(language, [4, 5, 8, 9]).trim()}`,
      options: ['1', '2', '3', '4'],
      correctAnswer: 1,
      explanation: 'The even values are 4 and 8.',
      expectedDurationSeconds: 55,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['ana', 4]], 'mila', 3).trim()}`,
      options: ['0', '3', '4', 'Error'],
      correctAnswer: 1,
      explanation: 'The default value is used because the key is missing.',
      expectedDurationSeconds: 55,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [6, 2, 1]).trim()}`,
      options: ['6', '7', '8', '9'],
      correctAnswer: 1,
      explanation: 'The expression adds the first value 6 and the last value 1.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['a', [2, 3]], ['b', [1]]], 'a').trim()}`,
      options: ['3', '4', '5', '6'],
      correctAnswer: 2,
      explanation: 'The selected list sums to 5.',
      expectedDurationSeconds: 55,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'tries', 1, '==', 1, 'retry', 'skip').trim()}`,
      options: ['retry', 'skip', '1', 'Nothing'],
      correctAnswer: 0,
      explanation: 'The condition matches exactly.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayMutationOutput(language, [3, 4, 5], 0, 9, 'values[0] + values[1]').trim()}`,
      options: ['9', '12', '13', '14'],
      correctAnswer: 2,
      explanation: 'After the update, the code adds 9 and 4.',
      expectedDurationSeconds: 50,
    }),
  },
];

const juniorPressureFixSpecs = [
  { render: renderOffByOneBugFix },
  { render: renderMissingDefaultBugFix },
  { render: renderWrongAccumulatorBugFix },
  { render: renderReturnInsideLoopBugFix },
  { render: renderLastIndexBugFix },
  { render: renderEvenConditionBugFix },
];

const moreBeginnerSyntaxOutputSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderConcatOutput(language, 'Ready', 7).trim()}`,
      options: ['Ready7', 'Ready 7', '7 Ready', 'Error'],
      correctAnswer: 1,
      explanation: 'The output joins the word and number with the embedded space.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArithmeticOutput(language, 3, 5, 3).trim()}`,
      options: ['8', '15', '24', '30'],
      correctAnswer: 2,
      explanation: 'The variable becomes 8, then the code prints 8 * 3.',
    }),
  },
];

const moreBeginnerTypesReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderParsedAdditionOutput(language, '12', 1).trim()}`,
      options: ['121', '12', '13', 'Error'],
      correctAnswer: 2,
      explanation: 'The parsed number is 12, then the code adds 1.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderParsedMultiplyOutput(language, '7', 2).trim()}`,
      options: ['9', '14', '27', '72'],
      correctAnswer: 1,
      explanation: 'The string is converted to 7 before the multiplication.',
    }),
  },
];

const moreBeginnerFlowTraceSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'coins', 2, '<', 5, 'buy', 'save').trim()}`,
      options: ['buy', 'save', '2', '5'],
      correctAnswer: 0,
      explanation: '2 is less than 5, so the first branch runs.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderAndConditionOutput(language, 22, 60).trim()}`,
      options: ['pass', 'wait', 'true', 'false'],
      correctAnswer: 1,
      explanation: 'The score condition fails, so the fallback branch runs.',
    }),
  },
];

const moreBeginnerDsReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayFirstLastOutput(language, [9, 2, 4]).trim()}`,
      options: ['9', '11', '13', '15'],
      correctAnswer: 2,
      explanation: 'The code adds the first value 9 and the last value 4.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderArrayLengthOutput(language, [5, 5, 5]).trim()}`,
      options: ['2', '3', '4', '5'],
      correctAnswer: 1,
      explanation: 'There are three values in the collection.',
    }),
  },
];

const moreBeginnerFunctionCompletionSpecs = [
  {
    prompt: 'Complete `solution(text)` so it returns `text + "!"`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'string',
        [{ name: 'text', type: 'string' }],
        'text + "!"',
        '',
        suffixedTextCases('!')
      ),
    requiredSnippets: ['return', 'text', '"!"'],
    explanation: 'Return the original text with an exclamation mark appended.',
  },
  {
    prompt: 'Complete `solution(value)` so it returns `value - 1`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'value', type: 'number' }],
        'value - 1',
        '',
        offsetCases(-1)
      ),
    requiredSnippets: ['return', 'value', '- 1'],
    explanation: 'Subtract one from the input and return the result.',
  },
];

const moreBeginnerFunctionWriteSpecs = [
  {
    prompt: 'Implement `solution(value)` so it returns `value % 10`.',
    build: (language) =>
      buildReturnExpressionTask(
        language,
        'number',
        [{ name: 'value', type: 'number' }],
        'value % 10',
        '',
        moduloCases(10)
      ),
    requiredSnippets: ['return', 'value', '% 10'],
    explanation: 'Return the remainder after dividing the value by 10.',
  },
  {
    prompt: 'Implement `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'The function should return false as soon as it finds a non-positive value.',
  },
];

const moreBeginnerDebugFixSpecs = [
  { render: renderMissingDefaultBugFix },
  { render: renderOffByOneBugFix },
];

const moreBeginnerDebugCodeSpecs = [
  {
    prompt: 'Fix `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'debug'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'The fixed version should increase the counter only on exact matches.',
  },
  {
    prompt: 'Fix `solution(values)` so it counts numbers greater than 5.',
    build: (language) => buildCountGreaterThanTask(language, 5, 'debug'),
    requiredSnippets: ['count', '> 5', 'return'],
    explanation: 'The correct solution should increment the counter instead of replacing it with the matching value.',
  },
];

const moreBeginnerMiniProblemSpecs = [
  {
    prompt: 'Implement `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'Return false immediately when a non-positive number appears.',
  },
  {
    prompt: 'Implement `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'write'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'Add one to the counter for each exact match.',
  },
];

const moreBeginnerPressureReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [2, 2, 2]).trim()}`,
      options: ['4', '5', '6', '8'],
      correctAnswer: 2,
      explanation: 'The loop adds all three values.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['sam', 5]], 'mia', 1).trim()}`,
      options: ['0', '1', '5', 'Error'],
      correctAnswer: 1,
      explanation: 'The key is missing, so the default value is printed.',
      expectedDurationSeconds: 50,
    }),
  },
];

const moreJuniorReadFastSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['red', 2], ['blue', 8]], 'green', 5).trim()}`,
      options: ['2', '5', '8', 'Error'],
      correctAnswer: 1,
      explanation: 'The lookup falls back to the provided default value.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [7, 2, 1]).trim()}`,
      options: ['8', '9', '10', '12'],
      correctAnswer: 2,
      explanation: 'The running total becomes 7, then 9, then 10.',
    }),
  },
];

const moreJuniorPredictOutputSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapIncrementOutput(language, [['ana', 4], ['leo', 6]], 'leo', 1).trim()}`,
      options: ['6', '7', '8', '9'],
      correctAnswer: 1,
      explanation: 'The selected entry increases from 6 to 7.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['x', [3, 2]], ['y', [1]]], 'x').trim()}`,
      options: ['3', '4', '5', '6'],
      correctAnswer: 2,
      explanation: 'The values under the selected key add to 5.',
    }),
  },
];

const moreJuniorBestFixSpecs = [
  { render: renderAppendResultBugFix },
  { render: renderLargestComparisonBugFix },
];

const moreJuniorDebugCodeSpecs = [
  {
    prompt: 'Fix `solution(values)` so it counts numbers greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'debug'),
    requiredSnippets: ['count', '> 10', 'return'],
    explanation: 'Increment the counter for each value above the threshold.',
  },
  {
    prompt: 'Fix `solution(values)` so it returns the sum of the even values.',
    build: (language) => buildSumEvenTask(language, 'debug'),
    requiredSnippets: ['total', '% 2 == 0', 'return'],
    explanation: 'The fixed version should add only even values.',
  },
];

const moreJuniorWriteHelperSpecs = [
  {
    prompt: 'Implement `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'Return false as soon as any non-positive value appears.',
  },
  {
    prompt: 'Implement `solution(values)` so it counts how many numbers are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'write'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Count only values that exceed the threshold.',
  },
];

const moreJuniorCompleteDataSpecs = [
  {
    prompt: 'Complete `solution(values)` so it counts how many numbers are greater than 0.',
    build: (language) => buildCountGreaterThanTask(language, 0, 'completion'),
    requiredSnippets: ['count', '> 0', 'return count'],
    explanation: 'Increment the counter when a value is positive.',
  },
  {
    prompt: 'Complete `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'The function should stop early when it finds a non-positive value.',
  },
];

const moreJuniorDsReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapIncrementOutput(language, [['red', 5], ['blue', 1]], 'blue', 4).trim()}`,
      options: ['1', '4', '5', '9'],
      correctAnswer: 2,
      explanation: 'The selected entry increases from 1 to 5.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderMapListSumOutput(language, [['mix', [3, 3]], ['n', [1]]], 'mix').trim()}`,
      options: ['3', '5', '6', '7'],
      correctAnswer: 2,
      explanation: 'The selected list contains 3 and 3, which sum to 6.',
    }),
  },
];

const moreJuniorFlowReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopBreakOutput(language, [2, 2, 9], 9).trim()}`,
      options: ['2', '4', '9', '13'],
      correctAnswer: 1,
      explanation: 'The loop adds 2 and 2, then stops when it reaches 9.',
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderIfElseOutput(language, 'score', 6, '<', 10, 'keep', 'stop').trim()}`,
      options: ['keep', 'stop', '6', '10'],
      correctAnswer: 0,
      explanation: '6 is less than 10, so the first branch runs.',
    }),
  },
];

const moreJuniorMiniProblemSpecs = [
  {
    prompt: 'Implement `solution(values)` so it returns a collection containing only the positive values.',
    build: (language) => buildFilterPositiveTask(language, 'write'),
    requiredSnippets: ['result', 'return result'],
    explanation: 'Build a new result collection using only positive values.',
  },
  {
    prompt: 'Implement `solution(values)` so it counts how many numbers are greater than 10.',
    build: (language) => buildCountGreaterThanTask(language, 10, 'write'),
    requiredSnippets: ['count', 'for', 'return'],
    explanation: 'Scan the collection and count values above 10.',
  },
];

const moreJuniorMiniProblem2Specs = [
  {
    prompt: 'Implement `solution(values)` so it returns true only if every number is positive.',
    build: (language) => buildAllPositiveTask(language),
    requiredSnippets: ['for', 'return'],
    explanation: 'Return false immediately when the scan finds a non-positive value.',
  },
  {
    prompt: 'Implement `solution(values, target)` so it counts how many times `target` appears.',
    build: (language) => buildCountTargetOccurrencesTask(language, 'write'),
    requiredSnippets: ['count', 'target', 'return'],
    explanation: 'Increment the counter on each exact match.',
  },
];

const moreJuniorPressureReadSpecs = [
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderLoopSumOutput(language, [2, 2, 5]).trim()}`,
      options: ['4', '7', '9', '10'],
      correctAnswer: 2,
      explanation: 'The loop adds all three values and prints 9.',
      expectedDurationSeconds: 50,
    }),
  },
  {
    render: (language) => ({
      prompt: `What is printed?\n\n${renderDefaultMapOutput(language, [['sam', 5]], 'mia', 1).trim()}`,
      options: ['0', '1', '5', 'Error'],
      correctAnswer: 1,
      explanation: 'The key is missing, so the lookup falls back to 1.',
      expectedDurationSeconds: 50,
    }),
  },
];

const moreJuniorPressureFixSpecs = [
  { render: renderCallBugFix },
  { render: renderAppendResultBugFix },
];

const megaBeginnerSyntaxOutputSpecs = [
  renderedSpec((language) => renderConcatOutput(language, 'Focus', 5), ['Focus5', 'Focus 5', '5 Focus', 'Error'], 1, 'The output joins the word and number with the embedded space.'),
  renderedSpec((language) => renderArithmeticOutput(language, 6, 2, 4), ['8', '16', '32', '24'], 2, 'The variable becomes 8, then the code prints 8 * 4.'),
  renderedSpec((language) => renderLengthMathOutput(language, 'state', 4), ['6', '8', '9', '10'], 2, '"state" has length 5, then the code adds 4.'),
  renderedSpec((language) => renderModuloOutput(language, 29, 4), ['0', '1', '2', '3'], 1, '29 divided by 4 leaves remainder 1.'),
  renderedSpec((language) => renderCounterOutput(language, 4, [1, 2, 3]), ['7', '8', '9', '10'], 3, 'The counter becomes 5, then 7, then 10.'),
];

const megaBeginnerTypesReadSpecs = [
  renderedSpec((language) => renderParsedAdditionOutput(language, '15', 2), ['152', '16', '17', '30'], 2, 'The parsed number is 15, then the code adds 2.'),
  renderedSpec((language) => renderParsedMultiplyOutput(language, '9', 2), ['11', '18', '92', '81'], 1, 'The string is converted to 9 before the multiplication.'),
  renderedSpec(
    (language) =>
      joinLines([
        numberAssignment(language, 'value', 8, true),
        language === 'python' ? 'value = value + 5' : 'value = value + 5;',
        printLine(language, 'value - 4'),
      ]),
    ['8', '9', '10', '13'],
    1,
    'The variable becomes 13, then the code subtracts 4.'
  ),
  renderedSpec((language) => renderLengthMathOutput(language, 'index', 1), ['5', '6', '7', '8'], 1, '"index" has length 5, then the code adds 1.'),
  renderedSpec((language) => renderParsedAdditionOutput(language, '20', 3), ['20', '203', '22', '23'], 3, 'The code converts the text to 20 before adding 3.'),
];

const megaBeginnerFlowTraceSpecs = [
  renderedSpec((language) => renderIfElseOutput(language, 'coins', 7, '<', 3, 'buy', 'save'), ['buy', 'save', '7', '3'], 1, '7 is not less than 3, so the else branch runs.'),
  renderedSpec((language) => renderNestedIfOutput(language, 5), ['top', 'mid', 'low', 'Nothing'], 1, '5 meets the middle threshold exactly.'),
  renderedSpec((language) => renderAndConditionOutput(language, 18, 90), ['pass', 'wait', 'true', 'false'], 0, 'Both conditions are satisfied.'),
  renderedSpec((language) => renderIfElseOutput(language, 'tries', 0, '==', 0, 'zero', 'other'), ['zero', 'other', '0', 'Error'], 0, 'The equality check succeeds, so the first branch runs.'),
  renderedSpec((language) => renderNestedIfOutput(language, 8), ['top', 'mid', 'low', 'Error'], 0, '8 satisfies the highest threshold.'),
];

const megaBeginnerDsReadSpecs = [
  renderedSpec((language) => renderArrayIndexOutput(language, [8, 1, 6], 0), ['8', '1', '6', 'Error'], 0, 'Index 0 is the first element.'),
  renderedSpec((language) => renderArrayFirstLastOutput(language, [4, 4, 4]), ['6', '8', '10', '12'], 1, 'The code adds the first and last values, both 4.'),
  renderedSpec((language) => renderArrayLengthOutput(language, [1, 2, 3, 4, 5, 6]), ['4', '5', '6', '7'], 2, 'There are six values in the collection.'),
  renderedSpec((language) => renderArrayMutationOutput(language, [2, 3, 4], 2, 10), ['10', '11', '12', '14'], 2, 'After the update, the code prints 10 plus the first value 2.'),
  renderedSpec((language) => renderArrayIndexOutput(language, [7, 8, 9, 10], 2), ['7', '8', '9', '10'], 2, 'Index 2 points to the third value.'),
];

const megaBeginnerFunctionCompletionSpecs = [
codeSpec('Complete `solution(text)` so it returns `text + "?"`.', (language) => buildReturnExpressionTask(language, 'string', [{ name: 'text', type: 'string' }], 'text + "?"', '', suffixedTextCases('?')), ['return', 'text', '"?"'], 'Return the input text with a question mark appended.'),
codeSpec('Complete `solution(value)` so it returns `value - 1`.', (language) => buildReturnExpressionTask(language, 'number', [{ name: 'value', type: 'number' }], 'value - 1', '', offsetCases(-1)), ['return', 'value', '- 1'], 'Subtract one from the input and return it.'),
codeSpec('Complete `solution(value)` so it returns `value % 3`.', (language) => buildReturnExpressionTask(language, 'number', [{ name: 'value', type: 'number' }], 'value % 3', '', moduloCases(3)), ['return', 'value', '% 3'], 'Return the remainder after dividing by 3.'),
codeSpec('Complete `solution(left, right)` so it returns `left + right`.', (language) => buildReturnExpressionTask(language, 'number', [{ name: 'left', type: 'number' }, { name: 'right', type: 'number' }], 'left + right', '', sumPairCases), ['return', 'left', 'right'], 'Return the sum of the two inputs.'),
codeSpec('Complete `solution(value)` so it returns whether `value` is greater than 10.', (language) => buildReturnExpressionTask(language, 'boolean', [{ name: 'value', type: 'number' }], 'value > 10', language === 'python' ? 'False' : 'false', greaterThanBooleanCases(10)), ['return', 'value', '> 10'], 'Return true only when the input is above 10.'),
];

const megaBeginnerFunctionWriteSpecs = [
  codeSpec('Implement `solution(values)` so it returns how many numbers are greater than 5.', (language) => buildCountGreaterThanTask(language, 5, 'write'), ['count', '> 5', 'return'], 'Count the values above 5.'),
  codeSpec('Implement `solution(values)` so it returns the sum of the even values.', (language) => buildSumEvenTask(language, 'write'), ['total', 'for', 'return'], 'Accumulate only even values.'),
  codeSpec('Implement `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'write'), ['count', 'target', 'return'], 'Increment the counter for each exact match.'),
  codeSpec('Implement `solution(values)` so it returns true only if every number is positive.', (language) => buildAllPositiveTask(language), ['for', 'return'], 'Return false immediately when a non-positive value appears.'),
  codeSpec('Implement `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'write'), ['result', 'return result'], 'Build a new collection using only positive values.'),
];

const megaBeginnerDebugFixSpecs = [
  { render: renderAppendResultBugFix },
  { render: renderLargestComparisonBugFix },
  { render: renderPositiveConditionBugFix },
  { render: renderTargetEqualityBugFix },
  { render: renderLongestWordComparisonBugFix },
];

const megaBeginnerDebugCodeSpecs = [
  codeSpec('Fix `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'debug'), ['count', 'target', 'return'], 'Increment the counter only on exact matches.'),
  codeSpec('Fix `solution(values)` so it counts numbers greater than 5.', (language) => buildCountGreaterThanTask(language, 5, 'debug'), ['count', '> 5', 'return'], 'The corrected solution should increment the counter instead of storing the matching value.'),
  codeSpec('Fix `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'debug'), ['result', 'return result'], 'Append positive values to the result collection.'),
  codeSpec('Fix `solution(values)` so it returns the largest number.', (language) => buildMaxTask(language, 'debug'), ['largest', 'return largest'], 'Compare against the current largest value and update it correctly.'),
  codeSpec('Fix `solution(values)` so it returns the sum of the even values.', (language) => buildSumEvenTask(language, 'debug'), ['total', '% 2 == 0', 'return'], 'The corrected version should add even values, not odd ones.'),
];

const megaBeginnerMiniProblemSpecs = [
  codeSpec('Implement `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'write'), ['count', 'target', 'return'], 'Add one to the counter for each exact match.'),
  codeSpec('Implement `solution(values)` so it returns true only if every number is positive.', (language) => buildAllPositiveTask(language), ['for', 'return'], 'Return false as soon as a non-positive value is found.'),
  codeSpec('Implement `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'write'), ['result', 'return result'], 'Build a new collection using only positive values.'),
  codeSpec('Implement `solution(values)` so it counts how many numbers are greater than 5.', (language) => buildCountGreaterThanTask(language, 5, 'write'), ['count', '> 5', 'return'], 'Count only values above the threshold.'),
  codeSpec('Implement `solution(values, target)` so it returns true if `target` appears in `values`, else false.', (language) => buildContainsTargetTask(language), ['target', 'for', 'return'], 'Return true as soon as the target is found.'),
];

const megaBeginnerPressureReadSpecs = [
  renderedSpec((language) => renderLoopSumOutput(language, [3, 1, 1]), ['4', '5', '6', '7'], 1, 'The loop adds all three values and prints 5.', 50),
  renderedSpec((language) => renderLoopEvenCountOutput(language, [2, 2, 2]), ['1', '2', '3', '4'], 2, 'All three values are even, so the count is 3.', 50),
  renderedSpec((language) => renderArrayFirstLastOutput(language, [5, 1, 2]), ['6', '7', '8', '9'], 1, 'The expression adds the first value 5 and the last value 2.', 50),
  renderedSpec((language) => renderIfElseOutput(language, 'age', 2, '==', 2, 'same', 'diff'), ['same', 'diff', '2', 'Error'], 0, 'The equality check succeeds, so the first branch runs.', 50),
  renderedSpec((language) => renderCounterOutput(language, 0, [4, 3]), ['5', '7', '8', '9'], 1, 'The counter becomes 4, then 7.', 50),
];

const megaJuniorReadFastSpecs = [
  renderedSpec((language) => renderDefaultMapOutput(language, [['red', 2], ['blue', 8]], 'green', 5), ['2', '5', '8', 'Error'], 1, 'The lookup falls back to the provided default value.'),
  renderedSpec((language) => renderLoopSumOutput(language, [7, 2, 1]), ['8', '9', '10', '12'], 2, 'The running total becomes 7, then 9, then 10.'),
  renderedSpec((language) => renderMapListSumOutput(language, [['core', [4, 1]], ['x', [2]]], 'core'), ['4', '5', '6', '7'], 1, 'The values under the selected key sum to 5.'),
  renderedSpec((language) => renderLoopBreakOutput(language, [2, 2, 9], 9), ['2', '4', '9', '13'], 1, 'The loop stops before adding 9, so only 2 + 2 is kept.'),
];

const megaJuniorPredictOutputSpecs = [
  renderedSpec((language) => renderMapIncrementOutput(language, [['ana', 4], ['leo', 6]], 'leo', 1), ['6', '7', '8', '9'], 1, 'The selected entry increases from 6 to 7.'),
  renderedSpec((language) => renderMapListSumOutput(language, [['x', [3, 2]], ['y', [1]]], 'x'), ['3', '4', '5', '6'], 2, 'The selected list contains 3 and 2, which sum to 5.'),
  renderedSpec((language) => renderDefaultMapOutput(language, [['ana', 6], ['leo', 3]], 'ana', 0), ['0', '3', '6', 'Error'], 2, 'The key exists, so the stored value is returned.'),
  renderedSpec((language) => renderArrayFirstLastOutput(language, [8, 1, 2, 3]), ['9', '10', '11', '12'], 2, 'The expression adds the first value 8 and the last value 3.'),
];

const megaJuniorBestFixSpecs = [
  { render: renderCallBugFix },
  { render: renderPositiveConditionBugFix },
  { render: renderTargetEqualityBugFix },
  { render: renderLongestWordComparisonBugFix },
];

const megaJuniorDebugCodeSpecs = [
  codeSpec('Fix `solution(values)` so it counts numbers greater than 10.', (language) => buildCountGreaterThanTask(language, 10, 'debug'), ['count', '> 10', 'return'], 'Increment the counter for each value above the threshold.'),
  codeSpec('Fix `solution(values)` so it returns the sum of the even values.', (language) => buildSumEvenTask(language, 'debug'), ['total', '% 2 == 0', 'return'], 'The corrected version should add even values only.'),
  codeSpec('Fix `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'debug'), ['result', 'return result'], 'Append each positive value to the result collection.'),
  codeSpec('Fix `solution(scores)` so it counts scores greater than 7.', (language) => buildCountMapAboveLimitTask(language, 7, 'debug'), ['count', '> 7', 'return'], 'The corrected solution should count only scores above the cutoff.'),
];

const megaJuniorWriteHelperSpecs = [
  codeSpec('Implement `solution(values)` so it returns true only if every number is positive.', (language) => buildAllPositiveTask(language), ['for', 'return'], 'Return false as soon as a non-positive value appears.'),
  codeSpec('Implement `solution(values)` so it counts how many numbers are greater than 10.', (language) => buildCountGreaterThanTask(language, 10, 'write'), ['count', 'for', 'return'], 'Count only values above the threshold.'),
  codeSpec('Implement `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'write'), ['count', 'target', 'return'], 'Increment the counter for each exact match.'),
  codeSpec('Implement `solution(words)` so it returns the length of the longest word.', (language) => buildLongestWordLengthTask(language, 'write'), ['best', 'return'], 'Track the largest word length seen so far.'),
];

const megaJuniorCompleteDataSpecs = [
  codeSpec('Complete `solution(values)` so it counts how many numbers are greater than 0.', (language) => buildCountGreaterThanTask(language, 0, 'completion'), ['count', '> 0', 'return count'], 'Increment the counter when a value is positive.'),
  codeSpec('Complete `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'completion'), ['result', 'return result'], 'Append matching values to the result collection.'),
  codeSpec('Complete `solution(values)` so it returns a collection containing only the first appearance of each number.', (language) => buildDedupeTask(language, 'completion'), ['result', 'return result'], 'Only append a value when it has not already been seen.'),
  codeSpec('Complete `solution(values)` so it returns the sum of the even values.', (language) => buildSumEvenTask(language, 'write'), ['total', '% 2 == 0', 'return total'], 'Add each even value to the running total.'),
];

const megaJuniorDsReadSpecs = [
  renderedSpec((language) => renderMapIncrementOutput(language, [['red', 5], ['blue', 1]], 'blue', 4), ['1', '4', '5', '9'], 2, 'The selected entry increases from 1 to 5.'),
  renderedSpec((language) => renderMapListSumOutput(language, [['mix', [3, 3]], ['n', [1]]], 'mix'), ['3', '5', '6', '7'], 2, 'The selected list contains 3 and 3, which sum to 6.'),
  renderedSpec((language) => renderDefaultMapOutput(language, [['sam', 4]], 'mia', 1), ['0', '1', '4', 'Error'], 1, 'The missing key falls back to the provided default.'),
  renderedSpec((language) => renderArrayLengthOutput(language, [2, 2, 2, 2]), ['2', '3', '4', '5'], 2, 'There are four values in the collection.'),
];

const megaJuniorFlowReadSpecs = [
  renderedSpec((language) => renderLoopBreakOutput(language, [2, 2, 9], 9), ['2', '4', '9', '13'], 1, 'The loop adds the first two values, then stops before 9.'),
  renderedSpec((language) => renderIfElseOutput(language, 'score', 6, '<', 10, 'keep', 'stop'), ['keep', 'stop', '6', '10'], 0, '6 is less than 10, so the first branch runs.'),
  renderedSpec((language) => renderNestedIfOutput(language, 6), ['top', 'mid', 'low', 'Nothing'], 1, '6 meets the middle threshold.'),
  renderedSpec((language) => renderLoopEvenCountOutput(language, [1, 3, 4, 6]), ['1', '2', '3', '4'], 1, 'Only 4 and 6 are even.'),
];

const megaJuniorMiniProblemSpecs = [
  codeSpec('Implement `solution(values)` so it returns a collection containing only the positive values.', (language) => buildFilterPositiveTask(language, 'write'), ['result', 'return result'], 'Build a new collection using only positive values.'),
  codeSpec('Implement `solution(values)` so it counts how many numbers are greater than 10.', (language) => buildCountGreaterThanTask(language, 10, 'write'), ['count', 'for', 'return'], 'Scan the collection and count values above 10.'),
  codeSpec('Implement `solution(values)` so it returns true only if every number is positive.', (language) => buildAllPositiveTask(language), ['for', 'return'], 'Return false immediately when the scan finds a non-positive value.'),
  codeSpec('Implement `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'write'), ['count', 'target', 'return'], 'Increment the counter on each exact match.'),
];

const megaJuniorMiniProblem2Specs = [
  codeSpec('Implement `solution(values)` so it returns true only if every number is positive.', (language) => buildAllPositiveTask(language), ['for', 'return'], 'Return false immediately when a non-positive value appears.'),
  codeSpec('Implement `solution(values, target)` so it counts how many times `target` appears.', (language) => buildCountTargetOccurrencesTask(language, 'write'), ['count', 'target', 'return'], 'Add one to the counter for each exact match.'),
  codeSpec('Implement `solution(text)` so it returns true if `text` is a palindrome, else false.', (language) => buildPalindromeTask(language), ['return'], 'Compare the text with its reversed form.'),
  codeSpec('Implement `solution(text)` so it returns how many vowels appear in `text`.', (language) => buildCountVowelsTask(language), ['count', 'for', 'return'], 'Count only the characters that are vowels.'),
];

const megaJuniorPressureReadSpecs = [
  renderedSpec((language) => renderLoopSumOutput(language, [2, 2, 5]), ['4', '7', '9', '10'], 2, 'The loop adds all three values and prints 9.', 50),
  renderedSpec((language) => renderDefaultMapOutput(language, [['sam', 5]], 'mia', 1), ['0', '1', '5', 'Error'], 1, 'The key is missing, so the lookup falls back to 1.', 50),
  renderedSpec((language) => renderArrayMutationOutput(language, [4, 3, 1], 0, 8, 'values[0] + values[1]'), ['9', '10', '11', '12'], 2, 'After the update, the code adds 8 and 3.', 50),
  renderedSpec((language) => renderMapListSumOutput(language, [['core', [2, 1]], ['x', [9]]], 'core'), ['2', '3', '4', '5'], 1, 'The selected list sums to 3.', 50),
];

const megaJuniorPressureFixSpecs = [
  { render: renderLargestComparisonBugFix },
  { render: renderPositiveConditionBugFix },
  { render: renderTargetEqualityBugFix },
  { render: renderLongestWordComparisonBugFix },
];

const curatedBeginnerChoiceSpecsByLanguage = {
  python: {
    syntaxOutput: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nlabel = "api"\nversion = 3\nprint(label.upper() + "-" + str(version))',
        options: ['API-3', 'api-3', 'API3', 'API-33'],
        correctAnswer: 0,
        explanation: 'upper() capitalizes the label and str(version) adds the number with the hyphen in between.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\ncount = 2\ncount += 3\nprint(count * 2)',
        options: ['5', '6', '10', '23'],
        correctAnswer: 2,
        explanation: 'count becomes 5, then the code prints 5 * 2.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nname = "api"\nprint(f"{name}-{len(name)}")',
        options: ['api-3', 'API-3', 'api3', '3-api'],
        correctAnswer: 0,
        explanation: 'The f-string prints the original text, a hyphen, and the string length.',
      })),
    ],
    typesRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\ntext = "8"\nprint(int(text) + 2)',
        options: ['10', '82', '"10"', '8'],
        correctAnswer: 0,
        explanation: 'int(text) converts the string to the number 8 before adding 2.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nitems = ["api", "db", "ui"]\nprint(items[1] + "-" + str(len(items)))',
        options: ['api-3', 'db-2', 'db-3', 'ui-3'],
        correctAnswer: 2,
        explanation: 'Index 1 is `db`, and the list length is 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\ncount = "4"\nvalue = int(count) // 2\nprint(value + 1)',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'The string becomes number 4, integer division gives 2, and then the code adds 1.',
      })),
    ],
    flowTrace: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nlogged_in = True\npremium = False\nif logged_in and premium:\n    print("full")\nelif logged_in:\n    print("basic")\nelse:\n    print("guest")',
        options: ['full', 'basic', 'guest', 'premium'],
        correctAnswer: 1,
        explanation: 'The first condition fails because premium is False, so the elif branch runs.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nscore = 72\nif score >= 90:\n    print("A")\nelif score >= 70:\n    print("B")\nelse:\n    print("C")',
        options: ['A', 'B', 'C', '72'],
        correctAnswer: 1,
        explanation: '72 does not reach the A branch, but it does satisfy the `>= 70` check.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nactive = True\nadmin = False\nif not active:\n    print("locked")\nelif admin:\n    print("admin")\nelse:\n    print("member")',
        options: ['locked', 'admin', 'member', 'False'],
        correctAnswer: 2,
        explanation: 'The first condition fails because active is true, the second fails because admin is false, so the final branch runs.',
      })),
    ],
    dsRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nqueue = ["api", "worker"]\nqueue.append("email")\nprint(queue[1])',
        options: ['api', 'worker', 'email', '2'],
        correctAnswer: 1,
        explanation: 'append adds the new value at the end, so index 1 still points to `worker`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nsettings = {"retry": 2, "timeout": 5}\nsettings["retry"] += 1\nprint(settings["retry"])',
        options: ['2', '3', '5', '6'],
        correctAnswer: 1,
        explanation: 'The existing `retry` value increases from 2 to 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nqueue = ["api", "db"]\nfirst = queue.pop(0)\nprint(first + "-" + queue[0])',
        options: ['api-db', 'db-api', 'api-api', 'db-db'],
        correctAnswer: 0,
        explanation: 'pop(0) removes and returns the first item, leaving `db` at index 0.',
      })),
    ],
    debugFix: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix avoids reading past the end of the list?\n\nfor i in range(len(values) + 1):\n    print(values[i])',
        options: [
          'Use `range(len(values))`',
          'Use `range(len(values) - 1)`',
          'Replace `values[i]` with `len(values)`',
          'Print the list before the loop',
        ],
        correctAnswer: 0,
        explanation: 'Valid indexes stop at `len(values) - 1`, so the loop should stop at `len(values)`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix makes this safe when `"db"` is missing?\n\nscores = {"api": 2}\nprint(scores["db"] + 1)',
        options: [
          'Use `scores.get("db", 0) + 1`',
          'Change the key to `"API"`',
          'Print the whole dictionary first',
          'Wrap the expression in `str(...)`',
        ],
        correctAnswer: 0,
        explanation: 'get returns the provided fallback when the key is missing, so the expression can still add 1.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix prints the uppercase name?\n\nname = "ada"\nprint(name.upper)',
        options: [
          'Call the method: `name.upper()`',
          'Change it to `name.lower()`',
          'Convert `name` to `int(name)` first',
          'Move the print into a loop',
        ],
        correctAnswer: 0,
        explanation: 'Without parentheses the code refers to the method itself instead of calling it.',
      })),
    ],
    pressureRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nvalues = [3, 4]\nvalues.append(values[0])\nprint(values[-1] + len(values))',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'The appended value is 3 and the new list length is 3, so the result is 6.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\ntext = "Ada"\nprint(text.lower()[0] + str(len(text)))',
        options: ['A3', 'a3', 'ada3', '3a'],
        correctAnswer: 1,
        explanation: 'lower() makes the first character `a`, and the text length is 3.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nvalues = [1, 2]\ncopy = values[:]\ncopy.append(3)\nprint(len(values) + len(copy))',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: 'The slice creates a new list, so the original stays length 2 while the copy grows to length 3.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  javascript: {
    syntaxOutput: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst label = "api";\nconst version = 3;\nconsole.log(label.toUpperCase() + "-" + String(version));',
        options: ['API-3', 'api-3', 'API3', 'API-33'],
        correctAnswer: 0,
        explanation: 'toUpperCase() changes the text to `API`, and String(version) adds the number after the hyphen.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is logged?\n\nlet count = 2;\ncount += 3;\nconsole.log(count * 2);',
        options: ['5', '6', '10', '23'],
        correctAnswer: 2,
        explanation: 'count becomes 5, then the code logs 10.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst name = "api";\nconsole.log(name + "-" + name.length);',
        options: ['api-3', 'API-3', 'api3', '3-api'],
        correctAnswer: 0,
        explanation: 'The expression logs the original text, a hyphen, and the string length.',
      })),
    ],
    typesRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst text = "8";\nconsole.log(Number(text) + 2);',
        options: ['10', '82', '"10"', '8'],
        correctAnswer: 0,
        explanation: 'Number(text) converts the string into the number 8 before the addition.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst items = ["api", "db", "ui"];\nconsole.log(items[1] + "-" + items.length);',
        options: ['api-3', 'db-2', 'db-3', 'ui-3'],
        correctAnswer: 2,
        explanation: 'Index 1 is `db`, and the array length is 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst count = "4";\nconst value = Number(count) / 2;\nconsole.log(value + 1);',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'Number(count) becomes 4, the division gives 2, and then the code adds 1.',
      })),
    ],
    flowTrace: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst loggedIn = true;\nconst premium = false;\nif (loggedIn && premium) {\n  console.log("full");\n} else if (loggedIn) {\n  console.log("basic");\n} else {\n  console.log("guest");\n}',
        options: ['full', 'basic', 'guest', 'premium'],
        correctAnswer: 1,
        explanation: 'The first branch fails because premium is false, but the `else if` condition still passes.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst score = 72;\nif (score >= 90) {\n  console.log("A");\n} else if (score >= 70) {\n  console.log("B");\n} else {\n  console.log("C");\n}',
        options: ['A', 'B', 'C', '72'],
        correctAnswer: 1,
        explanation: '72 reaches the middle branch, so the code logs `B`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst active = true;\nconst admin = false;\nif (!active) {\n  console.log("locked");\n} else if (admin) {\n  console.log("admin");\n} else {\n  console.log("member");\n}',
        options: ['locked', 'admin', 'member', 'false'],
        correctAnswer: 2,
        explanation: 'The first condition fails because active is true, the second fails because admin is false, so the final branch runs.',
      })),
    ],
    dsRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst queue = ["api", "worker"];\nqueue.push("email");\nconsole.log(queue[1]);',
        options: ['api', 'worker', 'email', '2'],
        correctAnswer: 1,
        explanation: 'push adds to the end, so index 1 still holds `worker`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst settings = { retry: 2, timeout: 5 };\nsettings.retry += 1;\nconsole.log(settings.retry);',
        options: ['2', '3', '5', '6'],
        correctAnswer: 1,
        explanation: 'The `retry` field increases from 2 to 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst queue = ["api", "db"];\nconst first = queue.shift();\nconsole.log(first + "-" + queue[0]);',
        options: ['api-db', 'db-api', 'api-api', 'db-db'],
        correctAnswer: 0,
        explanation: 'shift removes and returns the first item, leaving `db` at index 0.',
      })),
    ],
    debugFix: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix avoids reading past the end of the array?\n\nfor (let i = 0; i <= values.length; i += 1) {\n  console.log(values[i]);\n}',
        options: [
          'Change the condition to `i < values.length`',
          'Start the loop at `i = 1`',
          'Replace `values[i]` with `values.length`',
          'Log `i` after the loop instead',
        ],
        correctAnswer: 0,
        explanation: 'The last valid index is `values.length - 1`, so the loop must stop before `values.length`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which change lets this code turn the greeting into uppercase text?\n\nfunction greet(name) {\n  console.log("Hi " + name);\n}\nconst message = greet("Ada");\nconsole.log(message.toUpperCase());',
        options: [
          'Return `"Hi " + name` from `greet` instead of only logging it',
          'Wrap `message` in `Number(...)`',
          'Rename `message` to `greeting`',
          'Move `toUpperCase()` inside `console.log` only',
        ],
        correctAnswer: 0,
        explanation: 'The caller needs a returned string value. Logging inside the function is not enough.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix logs the uppercase name?\n\nconst name = "ada";\nconsole.log(name.toUpperCase);',
        options: [
          'Call the method: `name.toUpperCase()`',
          'Change it to `name.toLowerCase()`',
          'Convert `name` with `Number(name)` first',
          'Wrap the line in a loop',
        ],
        correctAnswer: 0,
        explanation: 'Without parentheses the code reads the method instead of calling it.',
      })),
    ],
    pressureRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst values = [3, 4];\nvalues.push(values[0]);\nconsole.log(values[values.length - 1] + values.length);',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'The new last value is 3 and the array length becomes 3, so the result is 6.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst text = "Ada";\nconsole.log(text.toLowerCase()[0] + text.length);',
        options: ['A3', 'a3', 'ada3', '3a'],
        correctAnswer: 1,
        explanation: 'The first lowercased character is `a`, and the string length is 3.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst values = [1, 2];\nconst copy = [...values];\ncopy.push(3);\nconsole.log(values.length + copy.length);',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: 'The spread expression clones the array, so the original keeps length 2 and the copy grows to length 3.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  java: {
    syntaxOutput: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nString label = "api";\nint version = 3;\nSystem.out.println(label.toUpperCase() + "-" + version);',
        options: ['API-3', 'api-3', 'API3', 'API-33'],
        correctAnswer: 0,
        explanation: 'toUpperCase() produces `API`, and Java concatenates the number after the hyphen.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nint count = 2;\ncount += 3;\nSystem.out.println(count * 2);',
        options: ['5', '6', '10', '23'],
        correctAnswer: 2,
        explanation: 'count becomes 5, then the code prints 10.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nString name = "api";\nSystem.out.println(name + "-" + name.length());',
        options: ['api-3', 'API-3', 'api3', '3-api'],
        correctAnswer: 0,
        explanation: 'The expression prints the string, a hyphen, and the string length.',
      })),
    ],
    typesRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nString text = "8";\nSystem.out.println(Integer.parseInt(text) + 2);',
        options: ['10', '82', '"10"', '8'],
        correctAnswer: 0,
        explanation: 'Integer.parseInt(text) converts the string to the number 8 before adding 2.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> items = java.util.List.of("api", "db", "ui");\nSystem.out.println(items.get(1) + "-" + items.size());',
        options: ['api-3', 'db-2', 'db-3', 'ui-3'],
        correctAnswer: 2,
        explanation: 'The second item is `db`, and the list size is 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nString count = "4";\nint value = Integer.parseInt(count) / 2;\nSystem.out.println(value + 1);',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'The parsed number is 4, dividing by 2 gives 2, and then the code adds 1.',
      })),
    ],
    flowTrace: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nboolean loggedIn = true;\nboolean premium = false;\nif (loggedIn && premium) {\n    System.out.println("full");\n} else if (loggedIn) {\n    System.out.println("basic");\n} else {\n    System.out.println("guest");\n}',
        options: ['full', 'basic', 'guest', 'premium'],
        correctAnswer: 1,
        explanation: 'The first condition fails because premium is false, so the code falls through to the `else if` branch.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nint score = 72;\nif (score >= 90) {\n    System.out.println("A");\n} else if (score >= 70) {\n    System.out.println("B");\n} else {\n    System.out.println("C");\n}',
        options: ['A', 'B', 'C', '72'],
        correctAnswer: 1,
        explanation: '72 matches the middle branch, so the code prints `B`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nboolean active = true;\nboolean admin = false;\nif (!active) {\n    System.out.println("locked");\n} else if (admin) {\n    System.out.println("admin");\n} else {\n    System.out.println("member");\n}',
        options: ['locked', 'admin', 'member', 'false'],
        correctAnswer: 2,
        explanation: 'The first condition fails because active is true, the second fails because admin is false, so the final branch prints `member`.',
      })),
    ],
    dsRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> queue = new java.util.ArrayList<>(java.util.List.of("api", "worker"));\nqueue.add("email");\nSystem.out.println(queue.get(1));',
        options: ['api', 'worker', 'email', '2'],
        correctAnswer: 1,
        explanation: 'add appends to the end, so index 1 still refers to `worker`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.Map<String, Integer> settings = new java.util.HashMap<>();\nsettings.put("retry", 2);\nsettings.put("timeout", 5);\nsettings.put("retry", settings.get("retry") + 1);\nSystem.out.println(settings.get("retry"));',
        options: ['2', '3', '5', '6'],
        correctAnswer: 1,
        explanation: 'The updated map entry changes `retry` from 2 to 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> queue = new java.util.ArrayList<>(java.util.List.of("api", "db"));\nString first = queue.remove(0);\nSystem.out.println(first + "-" + queue.get(0));',
        options: ['api-db', 'db-api', 'api-api', 'db-db'],
        correctAnswer: 0,
        explanation: 'remove(0) removes and returns the first element, leaving `db` at index 0.',
      })),
    ],
    debugFix: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix avoids reading past the end of the list?\n\nfor (int i = 0; i <= values.size(); i += 1) {\n    System.out.println(values.get(i));\n}',
        options: [
          'Change the condition to `i < values.size()`',
          'Change the start value to `i = 1`',
          'Replace `values.get(i)` with `values.size()`',
          'Print the list before the loop',
        ],
        correctAnswer: 0,
        explanation: 'The largest valid list index is `size() - 1`, so the loop must stop before `size()`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix correctly checks whether `status` equals `"ok"`?\n\nif (status == "ok") {\n    System.out.println("ready");\n}',
        options: [
          'Use `if (status.equals("ok"))`',
          'Use `if (status = "ok")`',
          'Convert `status` to an int first',
          'Print `status` before the condition',
        ],
        correctAnswer: 0,
        explanation: 'equals compares string contents. `==` only checks whether the references are the same object.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix prints the uppercase name?\n\nString name = "ada";\nSystem.out.println(name.toUpperCase);',
        options: [
          'Call the method: `name.toUpperCase()`',
          'Change it to `name.toLowerCase()`',
          'Convert `name` to an int first',
          'Move the line into a loop',
        ],
        correctAnswer: 0,
        explanation: 'The method needs parentheses to run and return the uppercase string.',
      })),
    ],
    pressureRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<Integer> values = new java.util.ArrayList<>(java.util.List.of(3, 4));\nvalues.add(values.get(0));\nSystem.out.println(values.get(values.size() - 1) + values.size());',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'The new last value is 3 and the list size becomes 3, so the result is 6.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nString text = "Ada";\nSystem.out.println(text.toLowerCase().charAt(0) + "-" + text.length());',
        options: ['A-3', 'a-3', 'ada-3', '3-a'],
        correctAnswer: 1,
        explanation: 'The first lowercased character is `a`, and the string length is 3.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<Integer> values = new java.util.ArrayList<>(java.util.List.of(1, 2));\njava.util.List<Integer> copy = new java.util.ArrayList<>(values);\ncopy.add(3);\nSystem.out.println(values.size() + copy.size());',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: 'The copied list is independent, so the original stays size 2 while the copy grows to size 3.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  cpp: {
    syntaxOutput: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::string label = "api";\nint version = 3;\nstd::cout << label << "-" << version;',
        options: ['api-3', 'API-3', 'api3', 'api-33'],
        correctAnswer: 0,
        explanation: 'The stream prints the string, then the hyphen, then the number.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nint count = 2;\ncount += 3;\nstd::cout << count * 2;',
        options: ['5', '6', '10', '23'],
        correctAnswer: 2,
        explanation: 'count becomes 5, so the final expression prints 10.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nstd::string name = "api";\nstd::cout << name << "-" << name.size();',
        options: ['api-3', 'API-3', 'api3', '3-api'],
        correctAnswer: 0,
        explanation: 'The stream prints the string, a hyphen, and the string size.',
      })),
    ],
    typesRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt: 'What is printed?\n\nstd::string text = "8";\nstd::cout << std::stoi(text) + 2;',
        options: ['10', '82', '"10"', '8'],
        correctAnswer: 0,
        explanation: 'std::stoi converts the string into the number 8 before adding 2.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> items{"api", "db", "ui"};\nstd::cout << items[1] << "-" << items.size();',
        options: ['api-3', 'db-2', 'db-3', 'ui-3'],
        correctAnswer: 2,
        explanation: 'Index 1 refers to `db`, and the vector size is 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::string count = "4";\nint value = std::stoi(count) / 2;\nstd::cout << value + 1;',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'std::stoi(count) becomes 4, the division gives 2, and then the code adds 1.',
      })),
    ],
    flowTrace: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nbool loggedIn = true;\nbool premium = false;\nif (loggedIn && premium) {\n    std::cout << "full";\n} else if (loggedIn) {\n    std::cout << "basic";\n} else {\n    std::cout << "guest";\n}',
        options: ['full', 'basic', 'guest', 'premium'],
        correctAnswer: 1,
        explanation: 'The first condition fails because premium is false, so the `else if` branch prints `basic`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nint score = 72;\nif (score >= 90) {\n    std::cout << "A";\n} else if (score >= 70) {\n    std::cout << "B";\n} else {\n    std::cout << "C";\n}',
        options: ['A', 'B', 'C', '72'],
        correctAnswer: 1,
        explanation: '72 matches the middle branch, so the output is `B`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nbool active = true;\nbool admin = false;\nif (!active) {\n    std::cout << "locked";\n} else if (admin) {\n    std::cout << "admin";\n} else {\n    std::cout << "member";\n}',
        options: ['locked', 'admin', 'member', 'false'],
        correctAnswer: 2,
        explanation: 'The first condition fails because active is true, the second fails because admin is false, so the final branch prints `member`.',
      })),
    ],
    dsRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> queue{"api", "worker"};\nqueue.push_back("email");\nstd::cout << queue[1];',
        options: ['api', 'worker', 'email', '2'],
        correctAnswer: 1,
        explanation: 'push_back appends to the end, so index 1 still points to `worker`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::map<std::string, int> settings{{"retry", 2}, {"timeout", 5}};\nsettings["retry"] += 1;\nstd::cout << settings["retry"];',
        options: ['2', '3', '5', '6'],
        correctAnswer: 1,
        explanation: 'The map entry for `retry` increases from 2 to 3.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> queue{"api", "db"};\nstd::string first = queue.front();\nqueue.erase(queue.begin());\nstd::cout << first << "-" << queue[0];',
        options: ['api-db', 'db-api', 'api-api', 'db-db'],
        correctAnswer: 0,
        explanation: 'The code stores the first element, removes it, and then reads the new first element.',
      })),
    ],
    debugFix: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix avoids reading past the end of the vector?\n\nfor (std::size_t i = 0; i <= values.size(); i += 1) {\n    std::cout << values[i];\n}',
        options: [
          'Change the condition to `i < values.size()`',
          'Start the loop at `i = 1`',
          'Replace `values[i]` with `values.size()`',
          'Print the vector before the loop',
        ],
        correctAnswer: 0,
        explanation: 'The last valid index is `values.size() - 1`, so the loop must stop before `values.size()`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix prints the last element instead of reading past the end?\n\nstd::vector<int> values{3, 4, 5};\nstd::cout << values[values.size()];',
        options: [
          'Use `values[values.size() - 1]`',
          'Use `values[0]`',
          'Replace the vector with a map',
          'Print `values.size()` instead',
        ],
        correctAnswer: 0,
        explanation: 'Index `size()` is one step past the end. The last element lives at `size() - 1`.',
      })),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'Which fix appends `3` to the vector?\n\nstd::vector<int> values{1, 2};\nvalues.push(3);',
        options: [
          'Use `values.push_back(3)`',
          'Start the vector at index 1',
          'Replace the vector with a map',
          'Print `values.size()` instead',
        ],
        correctAnswer: 0,
        explanation: '`std::vector` uses `push_back` to append a new element at the end.',
      })),
    ],
    pressureRead: [
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> values{3, 4};\nvalues.push_back(values[0]);\nstd::cout << values.back() + values.size();',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        explanation: 'The new last value is 3 and the vector size becomes 3, so the result is 6.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::string text = "Ada";\nstd::cout << text.substr(1) << text.size();',
        options: ['Ada3', 'da2', 'da3', 'A3'],
        correctAnswer: 2,
        explanation: 'substr(1) keeps `da`, and the string size is 3.',
      }), { expectedDurationSeconds: 45 }),
      curatedBeginnerChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> values{1, 2};\nauto copy = values;\ncopy.push_back(3);\nstd::cout << values.size() + copy.size();',
        options: ['3', '4', '5', '6'],
        correctAnswer: 2,
        explanation: 'The vector is copied by value, so the original stays size 2 while the copy grows to size 3.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
};

const curatedBeginnerCodeSpecsByLanguage = {
  python: {
    functionCompletion: [
      curatedBeginnerCodeSpec(
        'Complete `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Count only characters whose value is a digit.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(words)` so it returns a new list of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'append', 'return'],
        'Keep only lowercase words longer than 4, preserving their original order.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Append each ID only the first time it appears and keep the original order.'
      ),
    ],
    functionWrite: [
      curatedBeginnerCodeSpec(
        'Implement `solution(files)` so it returns `True` if any file ends with `".py"`, else `False`.',
        (language) => buildAnyWordEndsWithTask(language, '.py'),
        ['for', 'return'],
        'Return as soon as you find a Python file.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['for', 'return'],
        'Track the best candidate seen so far and keep the first word on ties.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns `True` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Stop early as soon as you find a word that changes when lowercased.'
      ),
    ],
    debugCode: [
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'return'],
        'The fixed loop should check each word suffix and count matches.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', '-1'],
        'Return the first matching index and fall back to `-1` when nothing matches.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Normalize each word before checking whether it has already appeared.'
      ),
    ],
    miniProblem: [
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['return'],
        'Normalize each word to lowercase before counting unique values.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Keep the first time each ID appears and ignore later duplicates.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Walk the text once and count only digit characters.'
      ),
    ],
  },
  javascript: {
    functionCompletion: [
      curatedBeginnerCodeSpec(
        'Complete `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Count only the characters that are digits.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(words)` so it returns a new array of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'push', 'return'],
        'Preserve the original order while keeping only lowercase words longer than 4.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Append an ID only the first time it appears and keep the original order.'
      ),
    ],
    functionWrite: [
      curatedBeginnerCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".js"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.js'),
        ['for', 'return'],
        'Return immediately once a JavaScript file appears.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['for', 'return'],
        'Update the best word only when you find a strictly longer one.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns `true` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Return false as soon as the scan finds a mixed-case word.'
      ),
    ],
    debugCode: [
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'return'],
        'The fixed version should count matching suffixes instead of skipping them.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', '-1'],
        'Return the first matching index and keep `-1` as the fallback.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Normalize before checking the set so mixed-case duplicates are handled correctly.'
      ),
    ],
    miniProblem: [
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['return'],
        'Lowercase each word before deciding whether it is unique.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Preserve insertion order while skipping later duplicates.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Count only numeric characters and ignore letters or punctuation.'
      ),
    ],
  },
  java: {
    functionCompletion: [
      curatedBeginnerCodeSpec(
        'Complete `solution(String text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Count only the characters that are digits.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(words)` so it returns a new list of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'add', 'return'],
        'Build a new list and keep only lowercase words longer than 4.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Append each ID only the first time it appears and preserve the original order.'
      ),
    ],
    functionWrite: [
      curatedBeginnerCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".java"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.java'),
        ['for', 'return'],
        'Return as soon as you find a Java source file.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['for', 'return'],
        'Keep the first longest word when there is a tie.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns `true` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Return false as soon as you find a mixed-case word.'
      ),
    ],
    debugCode: [
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'return'],
        'The repaired helper should count words with the target suffix.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', '-1'],
        'Return the first matching index and keep `-1` when nothing matches.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Lowercase each word before checking whether it has already been seen.'
      ),
    ],
    miniProblem: [
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['return'],
        'Lowercase each word before adding it to the unique set.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Keep only the first occurrence of each ID in the original order.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(String text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Walk the string once and count only numeric characters.'
      ),
    ],
  },
  cpp: {
    functionCompletion: [
      curatedBeginnerCodeSpec(
        'Complete `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Count only characters that are digits.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(words)` so it returns a new vector of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'push_back', 'return'],
        'Build a new result vector in the original order.'
      ),
      curatedBeginnerCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Append each ID only the first time it appears and keep the original order.'
      ),
    ],
    functionWrite: [
      curatedBeginnerCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".cpp"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.cpp'),
        ['for', 'return'],
        'Return as soon as a C++ source file appears.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['for', 'return'],
        'Update the best word only when a strictly longer one appears.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns `true` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Return false as soon as the scan finds a mixed-case word.'
      ),
    ],
    debugCode: [
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'return'],
        'The fixed helper should count matching suffixes.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', '-1'],
        'Return the first matching index and keep `-1` as the fallback.'
      ),
      curatedBeginnerCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Normalize each word before checking whether it has already appeared.'
      ),
    ],
    miniProblem: [
      curatedBeginnerCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['return'],
        'Normalize words to lowercase before counting unique values.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return'],
        'Keep only the first occurrence of each ID and preserve the original order.'
      ),
      curatedBeginnerCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Use a single pass and count only digit characters.'
      ),
    ],
  },
};

const curatedJuniorChoiceSpecsByLanguage = {
  python: {
    readFast: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nfiles = ["api.py", "db.py"]\nalias = files\nalias.append("cache.py")\nprint(len(files))',
        options: ['2', '3', '["api.py", "db.py", "cache.py"]', '4'],
        correctAnswer: 1,
        explanation: 'The alias points to the same list, so appending through one name changes the original list too.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nconfig = {"tags": ["api"]}\nsnapshot = config["tags"]\nsnapshot.append("stable")\nprint(len(config["tags"]))',
        options: ['1', '2', '["api", "stable"]', '3'],
        correctAnswer: 1,
        explanation: 'The list stored in the dictionary is still aliased, so appending through `snapshot` changes the original entry.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nrows = [["api"], ["db"]]\ncopy = rows[:]\ncopy[0].append("v2")\nprint(len(rows[0]) + len(copy))',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        explanation: 'The slice only copies the outer list. `rows[0]` is still shared, so its length becomes 2 and `copy` still has 2 rows.',
      }), { expectedDurationSeconds: 70 }),
    ],
    predictOutput: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nmodules = ["api", "worker", "ui", "hooks"]\nselected = [name.upper() for name in modules if len(name) > 3]\nprint(selected[1])',
        options: ['WORKER', 'HOOKS', 'UI', 'API'],
        correctAnswer: 1,
        explanation: 'The comprehension keeps worker and hooks, then uppercases them. Index 1 is HOOKS.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\npairs = {"api": 3, "db": 1, "ui": 2}\nselected = [name for name, count in pairs.items() if count >= 2]\nprint(selected[1])',
        options: ['api', 'db', 'ui', 'apiGateway'],
        correctAnswer: 2,
        explanation: 'The comprehension keeps the keys with counts at least 2, preserving insertion order: api then ui.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\ndef add_label(label, labels=[]):\n    labels.append(label)\n    return len(labels)\n\nprint(add_label("api"), add_label("db"))',
        options: ['1 1', '1 2', '2 1', '2 2'],
        correctAnswer: 1,
        explanation: 'The default list is shared across calls, so the first call returns 1 and the second returns 2.',
      })),
    ],
    bestFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which change prevents this helper from mutating the original list?\n\ndef extend_tags(tags):\n    snapshot = tags\n    snapshot.append("stable")\n    return snapshot',
        options: [
          'Change `snapshot = tags` to `snapshot = tags[:]`',
          'Move `append` below the return statement',
          'Rename `snapshot` to `result`',
          'Wrap `tags` in `print()` before appending',
        ],
        correctAnswer: 0,
        explanation: 'A slice copy breaks the alias. Appending to the copy no longer mutates the caller-owned list.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix prevents earlier calls from leaking into later ones?\n\ndef collect(item, seen=[]):\n    seen.append(item)\n    return seen',
        options: [
          'Use `seen=None`, then create `seen = []` inside the function',
          'Rename `seen` to `items`',
          'Move `append` below the return statement',
          'Wrap `seen` in `tuple(seen)` before appending',
        ],
        correctAnswer: 0,
        explanation: 'The default list is shared across calls. Using `None` and creating a fresh list inside avoids the mutation leak.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely uppercases the profile name when `profile` may be missing?\n\nname = user["profile"]["name"].upper()',
        options: [
          'Use `(user.get("profile") or {}).get("name", "guest").upper()`',
          'Replace `upper()` with `lower()`',
          'Convert `user` to a list first',
          'Print `user` before reading the name',
        ],
        correctAnswer: 0,
        explanation: 'The fallback dictionary handles a missing profile, and the nested `get` provides a safe default name.',
      })),
    ],
    dsRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nbatches = {"api": [2, 3], "db": [5]}\ntotal = 0\nfor value in batches.get("api", []):\n    total += value\nprint(total)',
        options: ['3', '5', '6', '7'],
        correctAnswer: 1,
        explanation: 'The code reads the list under "api" and sums 2 + 3.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\ngroups = {"api": [2, 4], "db": [1]}\ngroups["api"].append(8)\nprint(sum(groups["api"]))',
        options: ['6', '8', '14', '10'],
        correctAnswer: 2,
        explanation: 'After the append, the list under "api" becomes [2, 4, 8], and the sum is 14.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\ngroups = {"api": ["v1"], "db": ["v2"]}\nselected = groups.get("api", [])\nselected += ["v3"]\nprint(len(groups["api"]))',
        options: ['1', '2', '3', '0'],
        correctAnswer: 1,
        explanation: 'The `selected` variable still points to the original list under `api`, and `+=` mutates that list in place.',
      })),
    ],
    flowRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nwords = ["go", "tests", "ui", "deploy"]\ncount = 0\nfor word in words:\n    if len(word) < 3:\n        continue\n    count += 1\nprint(count)',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Only tests and deploy survive the continue guard.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nwords = ["db", "apiClient", "ui", "apiGateway"]\nfor index, word in enumerate(words):\n    if word.startswith("api"):\n        print(index)\n        break',
        options: ['0', '1', '2', '3'],
        correctAnswer: 1,
        explanation: 'The first word with the `api` prefix is at index 1, so the loop prints 1 and stops.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nvalues = ["7", "x", "2"]\ntotal = 0\nfor value in values:\n    try:\n        total += int(value)\n    except ValueError:\n        continue\nprint(total)',
        options: ['7', '8', '9', 'ValueError'],
        correctAnswer: 2,
        explanation: 'The invalid value is skipped by the exception handler, so the code adds only 7 and 2.',
      })),
    ],
    pressureRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nscores = [4, 7, 9]\ntop = scores\ntop[0] = 10\nprint(scores[0] + scores[-1])',
        options: ['16', '17', '18', '19'],
        correctAnswer: 3,
        explanation: 'Both names point to the same list, so scores becomes [10, 7, 9].',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nprint("ready" if {} else "wait")',
        options: ['ready', 'wait', '{}', 'false'],
        correctAnswer: 1,
        explanation: 'An empty dictionary is falsy in Python, so the fallback branch runs.',
      }), { expectedDurationSeconds: 40 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nitems = ["api", "db"]\nview = items\nitems = items + ["ui"]\nview.append("cache")\nprint(len(items) + len(view))',
        options: ['5', '6', '7', '3'],
        correctAnswer: 1,
        explanation: 'Rebinding `items` creates a new list, but `view` still points at the original one. Both lists end up length 3.',
      }), { expectedDurationSeconds: 45 }),
    ],
    pressureFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely increments a frequency map for the first occurrence of a name?\n\ncounts = {}\nfor name in names:\n    counts[name] += 1',
        options: [
          'Use `counts[name] = counts.get(name, 0) + 1`',
          'Use `counts[name] = 1` on every loop',
          'Call `names.get(name, 0)` instead',
          'Replace the dictionary with `counts.append(name)`',
        ],
        correctAnswer: 0,
        explanation: 'get supplies a default for unseen names, so the first increment no longer crashes.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix prevents state from leaking between fast helper calls?\n\ndef collect(item, seen=[]):\n    seen.append(item)\n    return seen',
        options: [
          'Use `seen=None`, then create `seen = []` inside the function',
          'Replace `append` with `print`',
          'Rename `item` to `value`',
          'Return `len(seen)` instead of the list',
        ],
        correctAnswer: 0,
        explanation: 'The shared default list is the bug. Creating a new list inside the function makes each call independent.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely appends a label even when the group does not exist yet?\n\ngroups = {}\ngroups[name].append(label)',
        options: [
          'Use `groups.setdefault(name, []).append(label)`',
          'Use `groups[name] = []` on every iteration before appending',
          'Replace `append` with `print`',
          'Convert `groups` into a tuple first',
        ],
        correctAnswer: 0,
        explanation: 'setdefault creates the missing list once and then returns it so the append can proceed safely.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  javascript: {
    readFast: [
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst profile = { score: 2 };\nconst alias = profile;\nalias.score += 3;\nconsole.log(profile.score);',
        options: ['2', '3', '5', '4'],
        correctAnswer: 2,
        explanation: 'Objects are assigned by reference here, so mutating alias also mutates profile.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst jobs = ["api", "worker", "ui"];\nconst picked = jobs.map((name) => name.toUpperCase()).filter((name) => name.length > 2);\nconsole.log(picked[1]);',
        options: ['API', 'WORKER', 'UI', 'JOBS'],
        correctAnswer: 1,
        explanation: 'The map creates API, WORKER, UI; the filter keeps API and WORKER. Index 1 is WORKER.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst state = { tags: ["api"] };\nconst copy = { ...state };\ncopy.tags.push("stable");\nconsole.log(state.tags.length);',
        options: ['1', '2', '3', '0'],
        correctAnswer: 1,
        explanation: 'Object spread copies the outer object only. The nested array is still shared, so the original length becomes 2.',
      }), { expectedDurationSeconds: 70 }),
    ],
    predictOutput: [
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst files = ["api.js", "db.js", "README.md"];\nconst jsFiles = files.filter((name) => name.endsWith(".js"));\nconsole.log(jsFiles.length);',
        options: ['1', '2', '3', '0'],
        correctAnswer: 1,
        explanation: 'Only api.js and db.js pass the filter.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst adders = [];\nfor (let i = 0; i < 3; i += 1) {\n  adders.push(() => i);\n}\nconsole.log(adders[1]());',
        options: ['0', '1', '2', '3'],
        correctAnswer: 1,
        explanation: 'Using `let` creates a new binding each iteration, so the second closure returns 1.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst readers = [];\nfor (var i = 0; i < 2; i += 1) {\n  readers.push(() => i);\n}\nconsole.log(readers[0]() + readers[1]());',
        options: ['1', '2', '3', '4'],
        correctAnswer: 3,
        explanation: 'With `var`, both closures share the same loop variable. After the loop finishes, both return 2.',
      })),
    ],
    bestFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which change avoids mutating the original array passed into this helper?\n\nfunction addTag(tags) {\n  const copy = tags;\n  copy.push("stable");\n  return copy;\n}',
        options: [
          'Change `const copy = tags` to `const copy = [...tags]`',
          'Rename `copy` to `result`',
          'Move `push` into a console.log call',
          'Return `tags.length` instead of the array',
        ],
        correctAnswer: 0,
        explanation: 'The spread expression clones the array before mutation.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix makes each async callback log its own loop index?\n\nfor (var i = 0; i < tasks.length; i += 1) {\n  setTimeout(() => console.log(i), 0);\n}',
        options: [
          'Change `var i` to `let i`',
          'Move `console.log(i)` above `setTimeout`',
          'Rename `i` to `index`',
          'Replace `setTimeout` with `tasks.push(i)`',
        ],
        correctAnswer: 0,
        explanation: 'The issue is the function-scoped `var`. Switching to `let` gives each iteration its own binding.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which change keeps `0` as a valid configured retry count?\n\nconst retries = config.retries || 3;',
        options: [
          'Use `const retries = config.retries ?? 3;`',
          'Change `3` to `"3"`',
          'Replace `retries` with `config.length`',
          'Wrap `config.retries` in `Boolean(...)`',
        ],
        correctAnswer: 0,
        explanation: '`||` treats 0 as missing because it is falsy. `??` falls back only for null or undefined.',
      })),
    ],
    dsRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst config = { api: { retries: 2 }, ui: { retries: 1 } };\nconsole.log(config.api.retries + config.ui.retries);',
        options: ['2', '3', '21', '12'],
        correctAnswer: 1,
        explanation: 'The code reads both nested values and adds them.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst response = { data: { items: ["api", "worker"] } };\nresponse.data.items.push("ui");\nconsole.log(response.data.items[response.data.items.length - 1]);',
        options: ['api', 'worker', 'ui', 'items'],
        correctAnswer: 2,
        explanation: 'After the push, the last item in the array is `ui`.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst settings = { api: { retry: 0 } };\nconst copy = { ...settings };\ncopy.api.retry = 2;\nconsole.log(settings.api.retry);',
        options: ['0', '1', '2', '3'],
        correctAnswer: 2,
        explanation: 'The spread copy is shallow. `copy.api` and `settings.api` still point to the same nested object.',
      })),
    ],
    flowRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconst values = [1, 2, 3, 4];\nlet total = 0;\nfor (const value of values) {\n  if (value % 2 !== 0) {\n    continue;\n  }\n  total += value;\n}\nconsole.log(total);',
        options: ['3', '4', '6', '10'],
        correctAnswer: 2,
        explanation: 'The loop skips odd values and adds only 2 and 4.',
      })),
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nlet total = 0;\nfor (const value of ["1", "", "4"]) {\n  if (!value) {\n    continue;\n  }\n  total += Number(value);\n}\nconsole.log(total);',
        options: ['1', '4', '5', '14'],
        correctAnswer: 2,
        explanation: 'The empty string is skipped by the guard, so the code adds only 1 and 4.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nfunction totalValid(values) {\n  let total = 0;\n  values.forEach((value) => {\n    if (!value) {\n      return;\n    }\n    total += Number(value);\n  });\n  return total;\n}\nconsole.log(totalValid(["3", "", "5"]));',
        options: ['3', '5', '8', '15'],
        correctAnswer: 2,
        explanation: 'The `return` exits only the callback for the empty string, which acts like a continue here. The helper still adds 3 and 5.',
      })),
    ],
    pressureRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconsole.log([] ? "ready" : "wait");',
        options: ['ready', 'wait', '[]', 'false'],
        correctAnswer: 0,
        explanation: 'In JavaScript an empty array is truthy, so the first branch runs.',
      }), { expectedDurationSeconds: 40 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is logged?\n\nconsole.log("0" ? "keep" : "drop");',
        options: ['keep', 'drop', '"0"', '0'],
        correctAnswer: 0,
        explanation: 'Non-empty strings are truthy in JavaScript, including `"0"`.',
      }), { expectedDurationSeconds: 40 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is logged?\n\nconst items = ["api", "db"];\nconst alias = items;\nconst next = [...items, "ui"];\nalias.pop();\nconsole.log(next.length + items.length);',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        explanation: '`next` is an independent copy with length 3, while `alias.pop()` mutates the original `items` array down to length 1.',
      }), { expectedDurationSeconds: 45 }),
    ],
    pressureFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely increments a per-key counter when the property might not exist yet?\n\nfor (const name of names) {\n  totals[name] = totals[name] + 1;\n}',
        options: [
          'Use `totals[name] = (totals[name] ?? 0) + 1`',
          'Use `totals[name] = 1` on every iteration',
          'Replace `totals` with `names.length`',
          'Call `totals.push(name)`',
        ],
        correctAnswer: 0,
        explanation: 'Nullish coalescing covers the missing-property case without overwriting existing counts.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely reads the name when `profile` may be missing?\n\nconsole.log(user.profile.name.toUpperCase());',
        options: [
          'Use `console.log((user.profile?.name ?? "guest").toUpperCase())`',
          'Use `console.log(user.profile.name || "guest")` only',
          'Convert `user` into an array first',
          'Wrap the expression in `Number(...)`',
        ],
        correctAnswer: 0,
        explanation: 'Optional chaining guards the nested access and the nullish fallback covers the missing-name case.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix keeps a configured timeout of `0` instead of replacing it with the fallback?\n\nconst timeout = settings.timeout || 5000;',
        options: [
          'Use `const timeout = settings.timeout ?? 5000;`',
          'Use `const timeout = settings.timeout && 5000;`',
          'Convert `settings.timeout` to a string first',
          'Wrap the assignment in `Boolean(...)`',
        ],
        correctAnswer: 0,
        explanation: '`??` preserves 0 and only falls back when the value is null or undefined.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  java: {
    readFast: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<Integer> scores = new java.util.ArrayList<>(java.util.List.of(2, 4));\njava.util.List<Integer> alias = scores;\nalias.add(6);\nSystem.out.println(scores.size());',
        options: ['2', '3', '4', '6'],
        correctAnswer: 1,
        explanation: 'Both variables reference the same ArrayList instance, so add changes scores as well.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> tags = new java.util.ArrayList<>(java.util.List.of("api"));\njava.util.List<String> copy = new java.util.ArrayList<>(tags);\ncopy.add("ui");\nSystem.out.println(tags.size() + copy.size());',
        options: ['1', '2', '3', '4'],
        correctAnswer: 2,
        explanation: 'The copy is independent, so the original size stays 1 while the copied list grows to 2.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.Map<String, java.util.List<String>> config = new java.util.HashMap<>();\nconfig.put("tags", new java.util.ArrayList<>(java.util.List.of("api")));\njava.util.Map<String, java.util.List<String>> copy = new java.util.HashMap<>(config);\ncopy.get("tags").add("stable");\nSystem.out.println(config.get("tags").size());',
        options: ['1', '2', '3', '0'],
        correctAnswer: 1,
        explanation: 'The copied map is shallow. Both maps still reference the same `ArrayList` stored under `tags`.',
      }), { expectedDurationSeconds: 70 }),
    ],
    predictOutput: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.Map<String, Integer> counts = new java.util.HashMap<>();\ncounts.put("api", 2);\ncounts.put("api", counts.get("api") + 3);\nSystem.out.println(counts.get("api"));',
        options: ['2', '3', '5', '7'],
        correctAnswer: 2,
        explanation: 'The stored value is updated from 2 to 5.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nStringBuilder builder = new StringBuilder("api");\nbuilder.append("-v2");\nSystem.out.println(builder.toString());',
        options: ['api', 'api-v2', 'v2-api', 'api-v22'],
        correctAnswer: 1,
        explanation: 'append mutates the StringBuilder and the final string becomes `api-v2`.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<Integer> values = new java.util.ArrayList<>(java.util.List.of(10, 20, 30));\nvalues.remove(Integer.valueOf(20));\nSystem.out.println(values.get(1));',
        options: ['10', '20', '30', '1'],
        correctAnswer: 2,
        explanation: 'Removing `Integer.valueOf(20)` removes the element with value 20, leaving [10, 30]. Index 1 is then 30.',
      })),
    ],
    bestFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix compares the text correctly here?\n\nString status = scanner.nextLine();\nif (status == "ready") {\n    System.out.println("go");\n}',
        options: [
          'Use `status.equals("ready")`',
          'Use `status = "ready"` inside the condition',
          'Convert `status` to an int first',
          'Wrap the whole if block in another print statement',
        ],
        correctAnswer: 0,
        explanation: 'Java string content comparison should use equals, not ==.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix makes this collection mutable before calling `add`?\n\njava.util.List<Integer> scores = java.util.List.of(1, 2, 3);\nscores.add(4);',
        options: [
          'Create the list with `new java.util.ArrayList<>(java.util.List.of(1, 2, 3))`',
          'Rename `scores` to `items`',
          'Replace `add` with `get`',
          'Convert the list into a string before mutating it',
        ],
        correctAnswer: 0,
        explanation: '`List.of` creates an immutable list. Wrapping it in `ArrayList` gives you a mutable collection.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix avoids a `NullPointerException` when `status` may be null?\n\nif (status.equals("ready")) {\n    System.out.println("go");\n}',
        options: [
          'Use `if ("ready".equals(status))`',
          'Use `if (status == "ready")`',
          'Convert `status` to an int first',
          'Print `status` before checking it',
        ],
        correctAnswer: 0,
        explanation: 'Calling `equals` on the constant string is null-safe and still performs a correct content comparison.',
      })),
    ],
    dsRead: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nString text = "debug";\nSystem.out.println(text.substring(1, 4));',
        options: ['deb', 'ebu', 'bug', 'ebug'],
        correctAnswer: 1,
        explanation: 'substring starts at index 1 and stops before index 4.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<Integer> nums = new java.util.ArrayList<>(java.util.List.of(10, 20, 30));\nnums.remove(1);\nSystem.out.println(nums.get(1));',
        options: ['10', '20', '30', '2'],
        correctAnswer: 2,
        explanation: 'Removing index 1 drops the value 20, leaving [10, 30]. The item at index 1 is then 30.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.Map<String, java.util.List<String>> groups = new java.util.HashMap<>();\ngroups.computeIfAbsent("api", key -> new java.util.ArrayList<>()).add("v1");\ngroups.computeIfAbsent("api", key -> new java.util.ArrayList<>()).add("v2");\nSystem.out.println(groups.get("api").size());',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'The second `computeIfAbsent` reuses the existing list for `api`, so the list ends up with two values.',
      })),
    ],
    flowRead: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> words = java.util.List.of("go", "tests", "ui", "deploy");\nint count = 0;\nfor (String word : words) {\n    if (word.length() < 3) {\n        continue;\n    }\n    count += 1;\n}\nSystem.out.println(count);',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Only tests and deploy are counted.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.List<String> words = java.util.List.of("db", "apiClient", "ui", "apiGateway");\nint count = 0;\nfor (String word : words) {\n    if (!word.startsWith("api")) {\n        continue;\n    }\n    count += 1;\n}\nSystem.out.println(count);',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Only the words with the `api` prefix make it past the continue guard.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nString[] values = {"7", "x", "2"};\nint total = 0;\nfor (String value : values) {\n    try {\n        total += Integer.parseInt(value);\n    } catch (NumberFormatException ex) {\n        continue;\n    }\n}\nSystem.out.println(total);',
        options: ['7', '8', '9', 'NumberFormatException'],
        correctAnswer: 2,
        explanation: 'The invalid value is skipped by the catch block, so the loop adds only 7 and 2.',
      })),
    ],
    pressureRead: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\njava.util.Map<String, Integer> scores = java.util.Map.of("api", 2);\nSystem.out.println(scores.getOrDefault("db", 0) + 1);',
        options: ['0', '1', '2', '3'],
        correctAnswer: 1,
        explanation: 'The missing key falls back to 0, then the code adds 1.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nString flag = "0";\nSystem.out.println(flag.isEmpty() ? "drop" : "keep");',
        options: ['drop', 'keep', '0', 'empty'],
        correctAnswer: 1,
        explanation: 'The string is not empty, so the second branch runs.',
      }), { expectedDurationSeconds: 40 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nString status = null;\nSystem.out.println("ready".equals(status) ? "go" : "wait");',
        options: ['go', 'wait', 'ready', 'guest'],
        correctAnswer: 1,
        explanation: 'Calling `equals` on the constant string is safe when `status` is null, so the false branch runs.',
      }), { expectedDurationSeconds: 40 }),
    ],
    pressureFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix makes this safe when the key is missing?\n\njava.util.Map<String, Integer> scores = new java.util.HashMap<>();\nscores.put("api", 2);\nSystem.out.println(scores.get("db") + 1);',
        options: [
          'Use `scores.getOrDefault("db", 0) + 1`',
          'Replace `get` with `put`',
          'Convert the key to uppercase first',
          'Print the whole map before reading it',
        ],
        correctAnswer: 0,
        explanation: 'getOrDefault keeps the expression safe without a null read.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix correctly checks whether the text starts with `api`?\n\nif (text.substring(0, 3) == "api") {\n    System.out.println("match");\n}',
        options: [
          'Use `if (text.startsWith("api"))`',
          'Use `if (text.substring(0, 3) = "api")`',
          'Convert `text` into an int first',
          'Wrap the condition in another `println`',
        ],
        correctAnswer: 0,
        explanation: 'startsWith states the intent directly and avoids the incorrect `==` string comparison.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely appends a label even when the list for the key does not exist yet?\n\njava.util.Map<String, java.util.List<String>> groups = new java.util.HashMap<>();\ngroups.get(name).add(label);',
        options: [
          'Use `groups.computeIfAbsent(name, key -> new java.util.ArrayList<>()).add(label)`',
          'Use `groups.put(name, new java.util.ArrayList<>())` on every loop before adding',
          'Replace `add` with `get`',
          'Convert the map into a string before updating it',
        ],
        correctAnswer: 0,
        explanation: 'computeIfAbsent creates the missing list once and returns the stored list so the append is safe.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
  cpp: {
    readFast: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> values = {1, 2};\nauto& alias = values;\nalias.push_back(3);\nstd::cout << values.size();',
        options: ['2', '3', '4', '5'],
        correctAnswer: 1,
        explanation: 'alias is a reference to the same vector, so push_back grows values too.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> values = {1, 2};\nauto copy = values;\ncopy.push_back(3);\nstd::cout << values.size() + copy.size();',
        options: ['2', '3', '5', '6'],
        correctAnswer: 2,
        explanation: 'The copied vector is independent. The original stays size 2 and the copy grows to size 3.',
      }), { expectedDurationSeconds: 70 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::map<std::string, std::vector<int>> groups{{"api", {1}}};\nauto copy = groups;\ncopy["api"].push_back(2);\nstd::cout << groups["api"].size();',
        options: ['1', '2', '3', '0'],
        correctAnswer: 0,
        explanation: 'Copying the map copies the stored vector too, so mutating `copy` does not change the original map entry.',
      }), { expectedDurationSeconds: 70 }),
    ],
    predictOutput: [
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nstd::string text = "debug";\nstd::cout << text.substr(1, 3);',
        options: ['deb', 'ebu', 'bug', 'ebug'],
        correctAnswer: 1,
        explanation: 'substr starts at index 1 and takes three characters.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::map<std::string, int> counts;\nstd::cout << counts["api"];',
        options: ['0', '1', 'api', '2'],
        correctAnswer: 0,
        explanation: 'operator[] inserts the missing key with the default int value 0, then returns it.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> values{10, 20, 30};\nauto it = std::find(values.begin(), values.end(), 20);\nstd::cout << (it - values.begin());',
        options: ['0', '1', '2', '20'],
        correctAnswer: 1,
        explanation: 'The iterator points at the value 20, which is one position after the beginning of the vector.',
      })),
    ],
    bestFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix keeps only the first appearance of each value?\n\nstd::vector<int> result;\nfor (int value : values) {\n    if (std::find(result.begin(), result.end(), value) != result.end()) {\n        result.push_back(value);\n    }\n}',
        options: [
          'Change the condition to `std::find(result.begin(), result.end(), value) == result.end()`',
          'Replace `push_back` with `std::cout`',
          'Move `result` inside the loop',
          'Change `value` to `double`',
        ],
        correctAnswer: 0,
        explanation: 'You should only append when find does not locate the value yet.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which change lets this helper mutate the caller-owned vector?\n\nvoid addTag(std::vector<std::string> tags) {\n    tags.push_back("stable");\n}',
        options: [
          'Change the parameter to `std::vector<std::string>& tags`',
          'Rename `tags` to `items`',
          'Replace `push_back` with `std::cout`',
          'Move the function into `main`',
        ],
        correctAnswer: 0,
        explanation: 'Passing by reference makes the helper work on the caller-owned vector instead of a copy.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'Which change avoids copying the caller-owned vector on every call?\n\nint total(std::vector<int> values) {\n    int sum = 0;\n    for (int value : values) {\n        sum += value;\n    }\n    return sum;\n}',
        options: [
          'Change the parameter to `const std::vector<int>& values`',
          'Rename `values` to `items`',
          'Replace the loop with `std::cout`',
          'Move the function into `main`',
        ],
        correctAnswer: 0,
        explanation: 'A const reference avoids the extra copy while still preventing accidental mutation of the caller-owned vector.',
      })),
    ],
    dsRead: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::map<std::string, int> hits{{"api", 2}};\nhits["api"] += 3;\nstd::cout << hits["api"];',
        options: ['2', '3', '5', '7'],
        correctAnswer: 2,
        explanation: 'The existing value is incremented from 2 to 5.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::set<std::string> seen{"api", "api", "db"};\nstd::cout << seen.size();',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'A set stores unique values only, so the duplicate `api` is ignored.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::map<std::string, int> counts{{"api", 2}};\nauto copy = counts;\ncopy["api"] += 3;\nstd::cout << counts["api"];',
        options: ['2', '3', '5', '0'],
        correctAnswer: 0,
        explanation: 'The map is copied by value, so changing `copy` does not affect the original `counts` map.',
      })),
    ],
    flowRead: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> words = {"go", "tests", "ui", "deploy"};\nint count = 0;\nfor (const auto& word : words) {\n    if (word.size() < 3) {\n        continue;\n    }\n    count += 1;\n}\nstd::cout << count;',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Only tests and deploy are counted.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> words = {"db", "apiClient", "ui", "apiGateway"};\nint count = 0;\nfor (const auto& word : words) {\n    if (word.rfind("api", 0) != 0) {\n        continue;\n    }\n    count += 1;\n}\nstd::cout << count;',
        options: ['1', '2', '3', '4'],
        correctAnswer: 1,
        explanation: 'Only the words whose prefix starts at position 0 pass the guard.',
      })),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<std::string> words = {"api", "db", "api2"};\nint count = 0;\nfor (const auto& word : words) {\n    if (word.find("api")) {\n        continue;\n    }\n    count += 1;\n}\nstd::cout << count;',
        options: ['0', '1', '2', '3'],
        correctAnswer: 2,
        explanation: 'When `find` matches at position 0 it converts to false in the condition, so both prefix matches are counted.',
      })),
    ],
    pressureRead: [
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::vector<int> scores = {4, 7, 9};\nauto& top = scores;\ntop[0] = 10;\nstd::cout << scores[0] + scores.back();',
        options: ['16', '17', '18', '19'],
        correctAnswer: 3,
        explanation: 'The reference mutates the original vector, so the sum is 10 + 9.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'What is printed?\n\nstd::string flag = "0";\nstd::cout << (flag.empty() ? "drop" : "keep");',
        options: ['drop', 'keep', '0', 'empty'],
        correctAnswer: 1,
        explanation: 'The string is not empty, so the expression prints `keep`.',
      }), { expectedDurationSeconds: 40 }),
      curatedChoiceSpec(() => ({
        prompt: 'What is printed?\n\nstd::string text = "api";\nstd::cout << (text.find("a") ? "miss" : "hit");',
        options: ['miss', 'hit', 'api', '0'],
        correctAnswer: 1,
        explanation: 'The match starts at position 0, which converts to false in the condition, so the expression prints `hit`.',
      }), { expectedDurationSeconds: 40 }),
    ],
    pressureFix: [
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix safely increments a counter for the first time a key appears?\n\nstd::map<std::string, int> counts;\ncounts.at(name) += 1;',
        options: [
          'Use `counts[name] += 1`',
          'Use `counts.clear()` before incrementing',
          'Replace the map with a vector of chars',
          'Read `counts.at(name)` twice instead',
        ],
        correctAnswer: 0,
        explanation: 'operator[] inserts a missing key with the default value 0 before incrementing it.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix correctly checks whether `text` contains `api` anywhere?\n\nif (text.find("api")) {\n    std::cout << "match";\n}',
        options: [
          'Use `if (text.find("api") != std::string::npos)`',
          'Use `if (text.find("api") == 1)`',
          'Convert `text` into an int before searching',
          'Replace `find` with `push_back`',
        ],
        correctAnswer: 0,
        explanation: 'find returns `npos` when the substring is absent, so comparing against `npos` is the safe check.',
      }), { expectedDurationSeconds: 45 }),
      curatedChoiceSpec(() => ({
        prompt:
          'Which fix checks whether the key exists without inserting a new map entry?\n\nstd::map<std::string, int> counts;\nif (counts["api"] > 0) {\n    std::cout << "seen";\n}',
        options: [
          'Use `if (counts.find("api") != counts.end())`',
          'Use `if (counts["api"] == 1)` instead',
          'Convert the map to a vector first',
          'Read `counts["api"]` twice before the if block',
        ],
        correctAnswer: 0,
        explanation: 'Using `find` checks presence without creating a default-valued entry as `operator[]` would.',
      }), { expectedDurationSeconds: 45 }),
    ],
  },
};

const curatedJuniorCodeSpecsByLanguage = {
  python: {
    debugCode: [
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', 'startswith', '-1'],
        'The fixed version should match prefixes, not only the exact word `api`.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'endswith', 'return'],
        'The bug is checking the wrong end of each word.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Normalize each word before checking whether it has already been seen.',
        { version: 3 }
      ),
    ],
    writeHelper: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing'),
        ['count', 'for', 'return'],
        'Scan the list once and count only the matching suffixes.'
      ),
      curatedCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'for', 'return'],
        'Count only numeric characters and ignore letters or punctuation.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Track frequencies as you scan and update the leader only when its count strictly increases.',
        { version: 3 }
      ),
    ],
    completeData: [
      curatedCodeSpec(
        'Complete `solution(words)` so it returns a new list of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'lower', 'return'],
        'Filter by length, normalize to lowercase, and preserve order.'
      ),
      curatedCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return result'],
        'Only append an ID when it has not already been seen.'
      ),
      curatedCodeSpec(
        'Complete `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'completion'),
        ['seen', 'return'],
        'Use a set of normalized values and return as soon as you hit the first duplicate.',
        { version: 3 }
      ),
    ],
    miniProblem: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns `True` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Stop early when you find a mixed-case word.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['best', 'return'],
        'Track the best candidate and keep the earlier word on ties.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Update the current leader only when a word takes the clear lead.',
        { version: 3 }
      ),
    ],
    miniProblem2: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['set', 'return'],
        'Treat `API` and `api` as the same word when counting uniqueness.'
      ),
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `True` if any file ends with `".py"`, else `False`.',
        (language) => buildAnyWordEndsWithTask(language, '.py'),
        ['for', 'return'],
        'Return early when you find the first matching file extension.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many lowercase word groups appear at least twice ignoring case.',
        (language) => buildDuplicateLowercaseGroupCountTask(language),
        ['count', 'return'],
        'Increment the duplicate-group total only when a normalized word reaches a count of exactly 2.',
        { version: 3 }
      ),
    ],
  },
  javascript: {
    debugCode: [
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', 'startsWith', '-1'],
        'The current bug matches only the exact string `api` instead of the whole prefix family.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'endsWith', 'return'],
        'The broken code checks the prefix instead of the suffix.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'The bug comes from tracking raw strings instead of normalized lowercase values.',
        { version: 3 }
      ),
    ],
    writeHelper: [
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".js"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.js'),
        ['for', 'return'],
        'Return as soon as you find a matching file name.'
      ),
      curatedCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'for', 'return'],
        'Count only numeric characters and ignore letters or punctuation.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Use a map of normalized values and update the leader only when a count strictly increases.',
        { version: 3 }
      ),
    ],
    completeData: [
      curatedCodeSpec(
        'Complete `solution(words)` so it returns a new array of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'toLowerCase', 'return'],
        'Filter, normalize, and keep the original order.'
      ),
      curatedCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return result'],
        'Only append an ID when it has not already been added.'
      ),
      curatedCodeSpec(
        'Complete `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'completion'),
        ['seen', 'return'],
        'Normalize each word, then return as soon as you hit the first duplicate.',
        { version: 3 }
      ),
    ],
    miniProblem: [
      curatedCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'for', 'return'],
        'Count only numeric characters, not letters or punctuation.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['set', 'return'],
        'Treat differently cased versions of the same word as one entry.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Keep the current leader stable when a later word only ties its count.',
        { version: 3 }
      ),
    ],
    miniProblem2: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['best', 'return'],
        'Track the best candidate and keep the earlier word on ties.'
      ),
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".js"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.js'),
        ['for', 'return'],
        'Return immediately when you find the first matching extension.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many lowercase word groups appear at least twice ignoring case.',
        (language) => buildDuplicateLowercaseGroupCountTask(language),
        ['count', 'return'],
        'Only increment the duplicate-group total the first time a normalized word reaches count 2.',
        { version: 3 }
      ),
    ],
  },
  java: {
    debugCode: [
      curatedCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'endsWith', 'return'],
        'The broken code checks the wrong end of the string.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', 'startsWith', '-1'],
        'The bug is matching only an exact word instead of the whole prefix family.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'Normalize before checking set membership, otherwise mixed-case duplicates slip through.',
        { version: 3 }
      ),
    ],
    writeHelper: [
      curatedCodeSpec(
        'Implement `solution(String text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'Character.isDigit', 'return'],
        'Walk the string once and count only numeric characters.'
      ),
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".java"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.java'),
        ['for', 'return'],
        'Return early when you find the first matching file extension.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Track normalized frequencies with a map and update the leader only on a strict increase.',
        { version: 3 }
      ),
    ],
    completeData: [
      curatedCodeSpec(
        'Complete `solution(words)` so it returns a new list of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'toLowerCase', 'return'],
        'Keep the long words, lower-case them, and return the filtered list.'
      ),
      curatedCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return result'],
        'Append each ID only once and keep the original order.'
      ),
      curatedCodeSpec(
        'Complete `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'completion'),
        ['seen', 'return'],
        'Use a set of normalized strings and return on the first duplicate hit.',
        { version: 3 }
      ),
    ],
    miniProblem: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['best', 'return'],
        'Update the stored best word only when you find a strictly longer one.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['set', 'return'],
        'Count case-insensitive unique words rather than raw string duplicates.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Keep the first clear leader even if another word later ties it.',
        { version: 3 }
      ),
    ],
    miniProblem2: [
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".java"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.java'),
        ['for', 'return'],
        'Return early when you find the first matching file extension.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns `true` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Return false as soon as you find a mixed-case word.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many lowercase word groups appear at least twice ignoring case.',
        (language) => buildDuplicateLowercaseGroupCountTask(language),
        ['count', 'return'],
        'Only increase the duplicate-group count the first time a normalized word reaches frequency 2.',
        { version: 3 }
      ),
    ],
  },
  cpp: {
    debugCode: [
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the index of the first word that starts with `"api"`, or `-1` if none match.',
        (language) => buildIndexOfFirstPrefixedWordTask(language, 'api', 'debug'),
        ['return', 'rfind', '-1'],
        'The bug checks only the exact string `api` instead of any prefix match.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing', 'debug'),
        ['count', 'return'],
        'The code is checking the prefix instead of the suffix.'
      ),
      curatedCodeSpec(
        'Fix `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'debug'),
        ['seen', 'return'],
        'The broken version compares raw strings instead of normalized lowercase values.',
        { version: 3 }
      ),
    ],
    writeHelper: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many words end with `"ing"`.',
        (language) => buildCountWordsEndingWithTask(language, 'ing'),
        ['count', 'return'],
        'Check the suffix carefully and count only the matching words.'
      ),
      curatedCodeSpec(
        'Implement `solution(files)` so it returns `true` if any file ends with `".cpp"`, else `false`.',
        (language) => buildAnyWordEndsWithTask(language, '.cpp'),
        ['for', 'return'],
        'Return early when you find the first matching file extension.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Use a map of normalized strings and only replace the leader on a strict frequency increase.',
        { version: 3 }
      ),
    ],
    completeData: [
      curatedCodeSpec(
        'Complete `solution(words)` so it returns a new vector of lowercase words whose length is greater than 4.',
        (language) => buildFilterLowercaseLongWordsTask(language, 4, 'completion'),
        ['result', 'push_back', 'return'],
        'Filter by size, convert to lowercase, and preserve the input order.'
      ),
      curatedCodeSpec(
        'Complete `solution(ids)` so it returns the first appearance of each ID, preserving order.',
        (language) => buildDedupeTask(language, 'completion'),
        ['result', 'return result'],
        'Only append an ID when it has not already appeared.'
      ),
      curatedCodeSpec(
        'Complete `solution(words)` so it returns the first lowercase word that appears twice ignoring case, or `""` if every word is unique.',
        (language) => buildFirstDuplicateLowercaseTask(language, 'completion'),
        ['seen', 'return'],
        'Normalize each word first, then return on the first duplicate hit.',
        { version: 3 }
      ),
    ],
    miniProblem: [
      curatedCodeSpec(
        'Implement `solution(text)` so it returns how many digit characters appear in `text`.',
        (language) => buildCountDigitsTask(language),
        ['count', 'return'],
        'Use a single scan and count only numeric characters.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the longest word. If two words have the same length, return the first one.',
        (language) => buildLongestWordTask(language),
        ['best', 'return'],
        'Track the best candidate and keep the earlier word on ties.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns the lowercase word with the highest frequency. If multiple words tie, keep the one that reached that frequency first.',
        (language) => buildMostFrequentLowercaseWordTask(language),
        ['count', 'return'],
        'Keep the first clear leader rather than replacing it on a tie.',
        { version: 3 }
      ),
    ],
    miniProblem2: [
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many unique words remain after lowercasing all inputs.',
        (language) => buildUniqueLowercaseWordCountTask(language),
        ['set', 'return'],
        'Treat `API` and `api` as the same entry when counting uniqueness.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns `true` only if every word is already lowercase.',
        (language) => buildAllWordsLowercaseTask(language),
        ['for', 'return'],
        'Return false as soon as the scan finds a mixed-case word.'
      ),
      curatedCodeSpec(
        'Implement `solution(words)` so it returns how many lowercase word groups appear at least twice ignoring case.',
        (language) => buildDuplicateLowercaseGroupCountTask(language),
        ['count', 'return'],
        'Increase the duplicate-group total only when a normalized word reaches count 2 for the first time.',
        { version: 3 }
      ),
    ],
  },
};

const buildTemplatesForConfig = (config) => {
  const curatedBeginnerChoiceSpecs = curatedBeginnerChoiceSpecsByLanguage[config.language] || {};
  const curatedBeginnerCodeSpecs = curatedBeginnerCodeSpecsByLanguage[config.language] || {};
  const curatedJuniorChoiceSpecs = curatedJuniorChoiceSpecsByLanguage[config.language] || {};
  const curatedJuniorCodeSpecs = curatedJuniorCodeSpecsByLanguage[config.language] || {};
  const beginnerChoicePromotions = {
    syntaxOutput: splitPromotedSpecs(
      [...moreBeginnerSyntaxOutputSpecs, ...megaBeginnerSyntaxOutputSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    typesRead: splitPromotedSpecs(
      [...moreBeginnerTypesReadSpecs, ...megaBeginnerTypesReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    flowTrace: splitPromotedSpecs(
      [...moreBeginnerFlowTraceSpecs, ...megaBeginnerFlowTraceSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    dsRead: splitPromotedSpecs(
      [...moreBeginnerDsReadSpecs, ...megaBeginnerDsReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    debugFix: splitPromotedSpecs(
      [...moreBeginnerDebugFixSpecs, ...megaBeginnerDebugFixSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    pressureRead: splitPromotedSpecs(
      [...moreBeginnerPressureReadSpecs, ...megaBeginnerPressureReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
  };
  const beginnerCodePromotions = {
    functionCompletion: splitPromotedSpecs(
      [...moreBeginnerFunctionCompletionSpecs, ...megaBeginnerFunctionCompletionSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    functionWrite: splitPromotedSpecs(
      [...moreBeginnerFunctionWriteSpecs, ...megaBeginnerFunctionWriteSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    debugCode: splitPromotedSpecs(
      [...moreBeginnerDebugCodeSpecs, ...megaBeginnerDebugCodeSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    miniProblem: splitPromotedSpecs(
      [...moreBeginnerMiniProblemSpecs, ...megaBeginnerMiniProblemSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
  };
  const juniorChoicePromotions = {
    readFast: splitPromotedSpecs(
      [...moreJuniorReadFastSpecs, ...megaJuniorReadFastSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    predictOutput: splitPromotedSpecs(
      [...moreJuniorPredictOutputSpecs, ...megaJuniorPredictOutputSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    bestFix: splitPromotedSpecs(
      [...moreJuniorBestFixSpecs, ...megaJuniorBestFixSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    dsRead: splitPromotedSpecs(
      [...moreJuniorDsReadSpecs, ...megaJuniorDsReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    flowRead: splitPromotedSpecs(
      [...moreJuniorFlowReadSpecs, ...megaJuniorFlowReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    pressureRead: splitPromotedSpecs(
      [...moreJuniorPressureReadSpecs, ...megaJuniorPressureReadSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
    pressureFix: splitPromotedSpecs(
      [...moreJuniorPressureFixSpecs, ...megaJuniorPressureFixSpecs],
      CURATED_PROMOTION_COUNT,
      promoteChoiceSpec
    ),
  };
  const juniorCodePromotions = {
    debugCode: splitPromotedSpecs(
      [...moreJuniorDebugCodeSpecs, ...megaJuniorDebugCodeSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    writeHelper: splitPromotedSpecs(
      [...moreJuniorWriteHelperSpecs, ...megaJuniorWriteHelperSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    completeData: splitPromotedSpecs(
      [...moreJuniorCompleteDataSpecs, ...megaJuniorCompleteDataSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    miniProblem: splitPromotedSpecs(
      [...moreJuniorMiniProblemSpecs, ...megaJuniorMiniProblemSpecs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
    miniProblem2: splitPromotedSpecs(
      [...moreJuniorMiniProblem2Specs, ...megaJuniorMiniProblem2Specs],
      CURATED_PROMOTION_COUNT,
      promoteCodeSpec
    ),
  };
  const beginnerTemplates = [
    ...[
      ...(curatedBeginnerChoiceSpecs.syntaxOutput || []),
      ...beginnerChoicePromotions.syntaxOutput.promoted,
      ...beginnerSyntaxOutputSpecs,
      ...beginnerChoicePromotions.syntaxOutput.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.syntaxOutput, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedBeginnerChoiceSpecs.typesRead || []),
      ...beginnerChoicePromotions.typesRead.promoted,
      ...beginnerTypesReadSpecs,
      ...beginnerChoicePromotions.typesRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.typesRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedBeginnerChoiceSpecs.flowTrace || []),
      ...beginnerChoicePromotions.flowTrace.promoted,
      ...beginnerFlowTraceSpecs,
      ...beginnerChoicePromotions.flowTrace.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.flowTrace, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedBeginnerChoiceSpecs.dsRead || []),
      ...beginnerChoicePromotions.dsRead.promoted,
      ...beginnerDsReadSpecs,
      ...beginnerChoicePromotions.dsRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.dsRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedBeginnerCodeSpecs.functionCompletion || []),
      ...beginnerCodePromotions.functionCompletion.promoted,
      ...beginnerFunctionCompletionSpecs,
      ...beginnerCodePromotions.functionCompletion.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, beginnerFamilies.functionCompletion, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['clear return value', 'single-purpose helper'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 155,
        discrimination: spec.discrimination ?? 0.73,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedBeginnerCodeSpecs.functionWrite || []),
      ...beginnerCodePromotions.functionWrite.promoted,
      ...beginnerFunctionWriteSpecs,
      ...beginnerCodePromotions.functionWrite.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, beginnerFamilies.functionWrite, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['clear helper', 'correct returned value'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 185,
        discrimination: spec.discrimination ?? 0.76,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedBeginnerChoiceSpecs.debugFix || []),
      ...beginnerChoicePromotions.debugFix.promoted,
      ...beginnerDebugFixSpecs,
      ...beginnerChoicePromotions.debugFix.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.debugFix, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedBeginnerCodeSpecs.debugCode || []),
      ...beginnerCodePromotions.debugCode.promoted,
      ...beginnerDebugCodeSpecs,
      ...beginnerCodePromotions.debugCode.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, beginnerFamilies.debugCode, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['bug removed', 'logic repaired'],
        forbiddenPatterns: ['TODO'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 195,
        discrimination: spec.discrimination ?? 0.79,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedBeginnerCodeSpecs.miniProblem || []),
      ...beginnerCodePromotions.miniProblem.promoted,
      ...beginnerMiniProblemSpecs,
      ...beginnerCodePromotions.miniProblem.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, beginnerFamilies.miniProblem, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['complete solution', 'correct control flow'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 215,
        discrimination: spec.discrimination ?? 0.8,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedBeginnerChoiceSpecs.pressureRead || []),
      ...beginnerChoicePromotions.pressureRead.promoted,
      ...beginnerPressureReadSpecs,
      ...beginnerChoicePromotions.pressureRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, beginnerFamilies.pressureRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
  ];

  const juniorTemplates = [
    ...[
      ...(curatedJuniorChoiceSpecs.readFast || []),
      ...juniorChoicePromotions.readFast.promoted,
      ...juniorReadFastSpecs,
      ...juniorChoicePromotions.readFast.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.readFast, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorChoiceSpecs.predictOutput || []),
      ...juniorChoicePromotions.predictOutput.promoted,
      ...juniorPredictOutputSpecs,
      ...juniorChoicePromotions.predictOutput.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.predictOutput, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorChoiceSpecs.bestFix || []),
      ...juniorChoicePromotions.bestFix.promoted,
      ...juniorBestFixSpecs,
      ...juniorChoicePromotions.bestFix.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.bestFix, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorCodeSpecs.debugCode || []),
      ...juniorCodePromotions.debugCode.promoted,
      ...juniorDebugCodeSpecs,
      ...juniorCodePromotions.debugCode.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, juniorFamilies.debugCode, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['bug repaired', 'logic stable'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 210,
        discrimination: spec.discrimination ?? 0.82,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedJuniorCodeSpecs.writeHelper || []),
      ...juniorCodePromotions.writeHelper.promoted,
      ...juniorWriteHelperSpecs,
      ...juniorCodePromotions.writeHelper.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, juniorFamilies.writeHelper, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['clear helper', 'correct return path'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 195,
        discrimination: spec.discrimination ?? 0.79,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedJuniorCodeSpecs.completeData || []),
      ...juniorCodePromotions.completeData.promoted,
      ...juniorCompleteDataSpecs,
      ...juniorCodePromotions.completeData.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, juniorFamilies.completeData, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['data pass complete', 'result returned'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 190,
        discrimination: spec.discrimination ?? 0.78,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedJuniorChoiceSpecs.dsRead || []),
      ...juniorChoicePromotions.dsRead.promoted,
      ...juniorDsReadSpecs,
      ...juniorChoicePromotions.dsRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.dsRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorChoiceSpecs.flowRead || []),
      ...juniorChoicePromotions.flowRead.promoted,
      ...juniorFlowReadSpecs,
      ...juniorChoicePromotions.flowRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.flowRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorCodeSpecs.miniProblem || []),
      ...juniorCodePromotions.miniProblem.promoted,
      ...juniorMiniProblemSpecs,
      ...juniorCodePromotions.miniProblem.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, juniorFamilies.miniProblem, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['complete reasoning path', 'correct return value'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 225,
        discrimination: spec.discrimination ?? 0.83,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedJuniorCodeSpecs.miniProblem2 || []),
      ...juniorCodePromotions.miniProblem2.promoted,
      ...juniorMiniProblem2Specs,
      ...juniorCodePromotions.miniProblem2.remainder,
    ].map((spec, index) => {
      const task = spec.build(config.language);
      return buildCodeQuestion(config, juniorFamilies.miniProblem2, index, {
        prompt: spec.prompt,
        starterCode: task.starterCode,
        referenceCode: task.referenceCode,
        validationMode: task.validationMode,
        executionCases: task.executionCases,
        publicTestCases: task.publicTestCases,
        requiredSnippets: spec.requiredSnippets,
        qualitySignals: ['correct implementation', 'good control flow'],
        explanation: spec.explanation,
        expectedDurationSeconds: spec.expectedDurationSeconds ?? 235,
        discrimination: spec.discrimination ?? 0.84,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      });
    }),
    ...[
      ...(curatedJuniorChoiceSpecs.pressureRead || []),
      ...juniorChoicePromotions.pressureRead.promoted,
      ...juniorPressureReadSpecs,
      ...juniorChoicePromotions.pressureRead.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.pressureRead, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
    ...[
      ...(curatedJuniorChoiceSpecs.pressureFix || []),
      ...juniorChoicePromotions.pressureFix.promoted,
      ...juniorPressureFixSpecs,
      ...juniorChoicePromotions.pressureFix.remainder,
    ].map((spec, index) =>
      buildChoiceQuestion(config, juniorFamilies.pressureFix, index, {
        ...spec.render(config.language),
        expectedDurationSeconds: spec.expectedDurationSeconds,
        discrimination: spec.discrimination,
        calibrationState: spec.calibrationState,
        sourceType: spec.sourceType,
        version: spec.version,
      })
    ),
  ];

  return [...beginnerTemplates, ...juniorTemplates];
};

export const benchmarkExpandedSeedTemplatesByLanguage = Object.fromEntries(
  languageConfigs.map((config) => [config.language, buildTemplatesForConfig(config)])
);
