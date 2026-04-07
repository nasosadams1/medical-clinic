import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { PYTHON_LESSON_EVALUATION_BANK } from '../services/progression/python-lesson-evaluation-bank.generated.js';
import { JAVASCRIPT_LESSON_EVALUATION_BANK } from '../services/progression/javascript-lesson-evaluation-bank.generated.js';
import { CPP_LESSON_EVALUATION_BANK } from '../services/progression/cpp-lesson-evaluation-bank.generated.js';
import { JAVA_LESSON_EVALUATION_BANK } from '../services/progression/java-lesson-evaluation-bank.generated.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const issues = [];

const lessonSources = [
  {
    language: 'python',
    filePath: path.join(repoRoot, 'src', 'data', 'pythonLessons.generated.ts'),
    bank: PYTHON_LESSON_EVALUATION_BANK,
  },
  {
    language: 'javascript',
    filePath: path.join(repoRoot, 'src', 'data', 'javascriptLessons.generated.ts'),
    bank: JAVASCRIPT_LESSON_EVALUATION_BANK,
  },
  {
    language: 'cpp',
    filePath: path.join(repoRoot, 'src', 'data', 'cppLessons.generated.ts'),
    bank: CPP_LESSON_EVALUATION_BANK,
  },
  {
    language: 'java',
    filePath: path.join(repoRoot, 'src', 'data', 'javaLessons.generated.ts'),
    bank: JAVA_LESSON_EVALUATION_BANK,
  },
];

const lessonJudgePath = path.join(repoRoot, 'services', 'progression', 'lesson-program-judge.js');
const lessonModalPath = path.join(repoRoot, 'src', 'components', 'LessonModal.tsx');

const recordIssue = (message) => {
  issues.push(message);
};

const unwrapNode = (node) => {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      current.kind === ts.SyntaxKind.SatisfiesExpression)
  ) {
    current = current.expression;
  }
  return current;
};

const getPropertyNameText = (nameNode) => {
  if (!nameNode) return null;
  if (ts.isIdentifier(nameNode) || ts.isStringLiteral(nameNode) || ts.isNumericLiteral(nameNode)) {
    return nameNode.text;
  }
  if (ts.isComputedPropertyName(nameNode) && ts.isStringLiteral(nameNode.expression)) {
    return nameNode.expression.text;
  }
  return null;
};

const getObjectProperty = (objectNode, propertyName) =>
  objectNode.properties.find(
    (property) =>
      ts.isPropertyAssignment(property) && getPropertyNameText(property.name) === propertyName
  ) || null;

const extractStaticValue = (node) => {
  const current = unwrapNode(node);
  if (!current) return undefined;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (current.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isArrayLiteralExpression(current)) {
    return current.elements.map((element) => extractStaticValue(element));
  }
  if (ts.isObjectLiteralExpression(current)) {
    return Object.fromEntries(
      current.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => [getPropertyNameText(property.name), extractStaticValue(property.initializer)])
        .filter(([key]) => Boolean(key))
    );
  }
  return undefined;
};

const parseLessonPracticeSteps = (filePath, language) => {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let lessonsArray = null;

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /Lessons$/.test(node.name.text) &&
      node.initializer
    ) {
      const initializer = unwrapNode(node.initializer);
      if (initializer && ts.isArrayLiteralExpression(initializer)) {
        lessonsArray = initializer;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (!lessonsArray) {
    recordIssue(`${language}: could not parse generated lesson array from ${path.basename(filePath)}.`);
    return [];
  }

  const steps = [];
  for (const lessonNode of lessonsArray.elements) {
    const lessonObject = unwrapNode(lessonNode);
    if (!lessonObject || !ts.isObjectLiteralExpression(lessonObject)) continue;

    const lessonId = extractStaticValue(getObjectProperty(lessonObject, 'id')?.initializer);
    const contentNode = unwrapNode(getObjectProperty(lessonObject, 'content')?.initializer);
    if (!lessonId || !contentNode || !ts.isObjectLiteralExpression(contentNode)) continue;

    const stepsNode = unwrapNode(getObjectProperty(contentNode, 'steps')?.initializer);
    if (!stepsNode || !ts.isArrayLiteralExpression(stepsNode)) continue;

    for (const stepNode of stepsNode.elements) {
      const stepObject = unwrapNode(stepNode);
      if (!stepObject || !ts.isObjectLiteralExpression(stepObject)) continue;

      const stepType = extractStaticValue(getObjectProperty(stepObject, 'type')?.initializer);
      if (stepType !== 'practice') continue;

      steps.push({
        language,
        lessonId,
        title:
          extractStaticValue(getObjectProperty(stepObject, 'title')?.initializer) ||
          extractStaticValue(getObjectProperty(stepObject, 'content')?.initializer) ||
          'Practice step',
        evaluationMode:
          extractStaticValue(getObjectProperty(stepObject, 'evaluationMode')?.initializer) || 'static',
        evaluationId: extractStaticValue(getObjectProperty(stepObject, 'evaluationId')?.initializer) || null,
      });
    }
  }

  return steps;
};

const lessonSteps = lessonSources.flatMap(({ language, filePath }) => parseLessonPracticeSteps(filePath, language));

for (const { language, bank } of lessonSources) {
  const executionSteps = lessonSteps.filter(
    (step) => step.language === language && step.evaluationMode === 'execution'
  );
  const staticSteps = lessonSteps.filter(
    (step) => step.language === language && step.evaluationMode === 'static'
  );

  for (const step of executionSteps) {
    if (!step.evaluationId) {
      recordIssue(`${language}:${step.lessonId}:${step.title} is execution-backed but missing evaluationId.`);
      continue;
    }

    const definition = bank[step.evaluationId];
    if (!definition) {
      recordIssue(`${language}:${step.lessonId}:${step.evaluationId} is missing from the lesson evaluation bank.`);
      continue;
    }

    if (definition.language !== language) {
      recordIssue(
        `${language}:${step.lessonId}:${step.evaluationId} points at a ${definition.language} evaluation definition.`
      );
    }

    if (!Array.isArray(definition.testCases) || definition.testCases.length === 0) {
      recordIssue(`${language}:${step.lessonId}:${step.evaluationId} has no executable test cases.`);
    }
  }

  for (const step of staticSteps) {
    if (step.evaluationId) {
      recordIssue(`${language}:${step.lessonId}:${step.title} is static but still declares evaluationId ${step.evaluationId}.`);
    }
  }
}

const lessonJudgeSource = fs.readFileSync(lessonJudgePath, 'utf8');
if (!lessonJudgeSource.includes('const passedOverall = passedAllTests;')) {
  recordIssue('lesson-program-judge.js no longer makes execution-backed lesson passing depend only on test results.');
}
if (lessonJudgeSource.includes('passedAllTests && passedStructure && passedCleanup')) {
  recordIssue('lesson-program-judge.js still blocks execution-backed lesson passing on snippet or cleanup checks.');
}
if (!lessonJudgeSource.includes("const missingSnippets = passedOverall ? [] : rawMissingSnippets;")) {
  recordIssue('lesson-program-judge.js is missing the pass-time snippet suppression guard.');
}
if (!lessonJudgeSource.includes("const flaggedPatterns = passedOverall ? [] : rawFlaggedPatterns;")) {
  recordIssue('lesson-program-judge.js is missing the pass-time cleanup suppression guard.');
}

const lessonModalSource = fs.readFileSync(lessonModalPath, 'utf8');
const stayLocalMatch = lessonModalSource.match(/const shouldStayLocal =[\s\S]*?;/);
if (!stayLocalMatch) {
  recordIssue('LessonModal.tsx is missing the execution preflight gate.');
} else {
  const stayLocalBlock = stayLocalMatch[0];
  if (!stayLocalBlock.includes('preflightAssessment.feedbackKind === "empty"')) {
    recordIssue('LessonModal.tsx no longer preserves the empty-code preflight guard.');
  }
  if (!stayLocalBlock.includes('preflightAssessment.feedbackKind === "starter"')) {
    recordIssue('LessonModal.tsx no longer preserves the starter-code preflight guard.');
  }
  if (stayLocalBlock.includes('structure_missing') || stayLocalBlock.includes('cleanup')) {
    recordIssue('LessonModal.tsx still blocks execution-backed lesson checks on snippet or cleanup preflight feedback.');
  }
}

if (issues.length > 0) {
  console.error('Lesson practice bank audit failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const summary = lessonSources.reduce((accumulator, { language }) => {
  accumulator[language] = {
    totalPracticeSteps: lessonSteps.filter((step) => step.language === language).length,
    executionBacked: lessonSteps.filter(
      (step) => step.language === language && step.evaluationMode === 'execution'
    ).length,
    staticOnly: lessonSteps.filter(
      (step) => step.language === language && step.evaluationMode === 'static'
    ).length,
  };
  return accumulator;
}, {});

console.log('Lesson practice bank audit passed.');
console.log(JSON.stringify(summary, null, 2));
