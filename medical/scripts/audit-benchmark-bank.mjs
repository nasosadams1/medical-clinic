import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { benchmarkExpandedSeedTemplatesByLanguage } from '../src/data/benchmarkExpandedSeedBank.js';
import {
  buildDynamicBenchmarkExecutionDefinition,
  getBenchmarkExecutionDefinition,
} from '../services/benchmark/execution-bank.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const enginePath = path.join(repoRoot, 'src', 'data', 'benchmarkEngine.ts');
const expandedBankPath = path.join(repoRoot, 'src', 'data', 'benchmarkExpandedSeedBank.js');
const experiencePath = path.join(repoRoot, 'src', 'components', 'benchmark', 'BenchmarkExperience.tsx');

const issues = [];
const cheapDistractors = new Set(['error', 'nothing', 'undefined', 'nan', 'null']);
const minimumPackCounts = {
  beginner: 150,
  junior: 180,
};
const minimumCuratedTemplatesPerFamily = 6;
const expectedPackIdsByLanguage = {
  python: {
    beginner: 'python-beginner-fundamentals',
    junior: 'python-junior-interview-prep',
  },
  javascript: {
    beginner: 'javascript-beginner-fundamentals',
    junior: 'javascript-junior-interview-prep',
  },
  java: {
    beginner: 'java-beginner-oop-foundations',
    junior: 'java-junior-class-ds-prep',
  },
  cpp: {
    beginner: 'cpp-beginner-structured-logic',
    junior: 'cpp-junior-problem-solving',
  },
};
const expectedQuestionTypesByRole = {
  beginner: [
    'output_prediction',
    'code_reading_comprehension',
    'code_tracing',
    'code_completion',
    'short_function_writing',
    'choose_the_best_fix',
    'debugging',
    'applied_mini_problem',
  ],
  junior: [
    'code_reading_comprehension',
    'output_prediction',
    'choose_the_best_fix',
    'debugging',
    'short_function_writing',
    'code_completion',
    'code_tracing',
    'applied_mini_problem',
  ],
};
const expectedFamilySlugsByRole = {
  beginner: [
    'syntax-output',
    'types-read',
    'flow-trace',
    'ds-reading',
    'function-completion',
    'function-write',
    'debug-fix',
    'debug-code',
    'mini-problem',
    'pressure-read',
  ],
  junior: [
    'read-fast',
    'predict-output',
    'best-fix',
    'debug-code',
    'write-helper',
    'complete-data',
    'ds-read',
    'flow-read',
    'mini-problem',
    'mini-problem-2',
    'pressure-read',
    'pressure-fix',
  ],
};

const recordIssue = (message) => {
  issues.push(message);
};

const countByPack = (templates) =>
  templates.reduce((accumulator, template) => {
    for (const packId of template.packIds ?? []) {
      accumulator[packId] = (accumulator[packId] ?? 0) + 1;
    }
    return accumulator;
  }, {});

const countByPackAndType = (templates) =>
  templates.reduce((accumulator, template) => {
    for (const packId of template.packIds ?? []) {
      accumulator[packId] ??= {};
      accumulator[packId][template.questionType] = (accumulator[packId][template.questionType] ?? 0) + 1;
    }
    return accumulator;
  }, {});

const countByPackAndFamilyAndSource = (templates) =>
  templates.reduce((accumulator, template) => {
    for (const packId of template.packIds ?? []) {
      accumulator[packId] ??= {};
      const familySlug = template.familySlug ?? 'unknown';
      accumulator[packId][familySlug] ??= {};
      accumulator[packId][familySlug][template.sourceType] =
        (accumulator[packId][familySlug][template.sourceType] ?? 0) + 1;
    }
    return accumulator;
  }, {});

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
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => extractStaticValue(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return Object.fromEntries(
      node.properties
        .filter(ts.isPropertyAssignment)
        .map((property) => [getPropertyNameText(property.name), extractStaticValue(property.initializer)])
        .filter(([key]) => Boolean(key))
    );
  }
  return undefined;
};

const parseEngineSeedCodeTemplates = (sourceText) => {
  const sourceFile = ts.createSourceFile(
    enginePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const executionCasesByTemplateId = new Map();
  const codeTemplates = [];

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'benchmarkSeedExecutionCases' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      node.initializer.properties
        .filter(ts.isPropertyAssignment)
        .forEach((property) => {
          const templateId = getPropertyNameText(property.name);
          const executionCases = extractStaticValue(property.initializer);
          if (templateId && Array.isArray(executionCases)) {
            executionCasesByTemplateId.set(templateId, executionCases);
          }
        });
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'defineSeedQuestion' || node.expression.text === 'defineCodeSeedQuestion')
    ) {
      const [argument] = node.arguments;
      if (argument && ts.isObjectLiteralExpression(argument)) {
        const templateId = extractStaticValue(getObjectProperty(argument, 'templateId')?.initializer);
        const kind = extractStaticValue(getObjectProperty(argument, 'kind')?.initializer);
        const isCode = node.expression.text === 'defineCodeSeedQuestion' || kind === 'code';

        if (isCode && typeof templateId === 'string') {
          codeTemplates.push({
            templateId,
            language: extractStaticValue(getObjectProperty(argument, 'language')?.initializer),
            starterCode: extractStaticValue(getObjectProperty(argument, 'starterCode')?.initializer),
            referenceCode: extractStaticValue(getObjectProperty(argument, 'referenceCode')?.initializer),
            evaluationStrategy: extractStaticValue(
              getObjectProperty(argument, 'evaluationStrategy')?.initializer
            ),
            hasExecutionCasesProp: Boolean(getObjectProperty(argument, 'executionCases')),
            hasPublicTestCasesProp: Boolean(getObjectProperty(argument, 'publicTestCases')),
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return { executionCasesByTemplateId, codeTemplates };
};

const parseBlueprintSlotCounts = (sourceText) => {
  const sourceFile = ts.createSourceFile(
    enginePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const counts = {};
  const targetFunctions = new Set([
    'beginnerQuickBlueprint',
    'beginnerFullBlueprint',
    'juniorQuickBlueprint',
    'juniorFullBlueprint',
  ]);

  const countReturnedSlots = (body) => {
    if (!body) return null;
    if (ts.isArrayLiteralExpression(body)) {
      return body.elements.length;
    }
    if (ts.isBlock(body)) {
      const returnStatement = body.statements.find(
        (statement) => ts.isReturnStatement(statement) && statement.expression && ts.isArrayLiteralExpression(statement.expression)
      );
      if (returnStatement && ts.isArrayLiteralExpression(returnStatement.expression)) {
        return returnStatement.expression.elements.length;
      }
    }
    return null;
  };

  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      targetFunctions.has(node.name.text) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer)
    ) {
      const count = countReturnedSlots(node.initializer.body);
      if (typeof count === 'number') {
        counts[node.name.text] = count;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return counts;
};

const extractConstFunctionSource = (sourceText, functionName) => {
  const startToken = `const ${functionName} = (`;
  const startIndex = sourceText.indexOf(startToken);
  if (startIndex === -1) return '';

  const bodyStart = sourceText.indexOf('{', startIndex);
  if (bodyStart === -1) return '';

  let depth = 0;
  for (let index = bodyStart; index < sourceText.length; index += 1) {
    const character = sourceText[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const statementEnd = sourceText.indexOf(';', index);
        return sourceText.slice(startIndex, statementEnd === -1 ? index + 1 : statementEnd + 1);
      }
    }
  }

  return sourceText.slice(startIndex);
};

for (const [language, templates] of Object.entries(benchmarkExpandedSeedTemplatesByLanguage)) {
  if (!Array.isArray(templates) || templates.length === 0) {
    recordIssue(`${language}: bank is empty.`);
    continue;
  }

  const packCounts = countByPack(templates);
  const packTypeCounts = countByPackAndType(templates);
  const packFamilySourceCounts = countByPackAndFamilyAndSource(templates);
  const expectedPackIds = expectedPackIdsByLanguage[language];

  for (const template of templates) {
    if ((template.version ?? 0) < 3) {
      recordIssue(`${language}:${template.templateId} is not premium versioned.`);
    }
    if ((template.calibrationState ?? 'draft') === 'draft') {
      recordIssue(`${language}:${template.templateId} is still draft-calibrated.`);
    }
    if (!template.sourceType) {
      recordIssue(`${language}:${template.templateId} is missing sourceType.`);
    }
    if (!template.familySlug) {
      recordIssue(`${language}:${template.templateId} is missing familySlug.`);
    }
    if (template.sourceType === 'legacy') {
      recordIssue(`${language}:${template.templateId} is marked legacy inside the expanded bank.`);
    }
    if (template.kind === 'multiple_choice') {
      const cheapOptionCount = (template.options ?? []).filter(
        (option, index) =>
          index !== template.correctAnswer && cheapDistractors.has(option.trim().toLowerCase())
      ).length;
      if (cheapOptionCount > 0) {
        recordIssue(`${language}:${template.templateId} still uses cheap distractors.`);
      }
    }
    if (template.kind === 'code') {
      if ((template.executionCases?.length ?? 0) < 5) {
        recordIssue(`${language}:${template.templateId} has fewer than 5 execution cases.`);
      }
      if (template.evaluationStrategy === 'execution') {
        const executionDefinition = buildDynamicBenchmarkExecutionDefinition({
          language,
          starterCode: template.starterCode,
          referenceCode: template.referenceCode,
          executionCases: template.executionCases,
        });
        if (!executionDefinition) {
          recordIssue(
            `${language}:${template.templateId} does not build a backend execution definition.`
          );
        }
      }
    }
  }

  if ((packCounts[expectedPackIds.beginner] ?? 0) < minimumPackCounts.beginner) {
    recordIssue(
      `${language}:${expectedPackIds.beginner} has only ${packCounts[expectedPackIds.beginner] ?? 0} templates.`
    );
  }
  if ((packCounts[expectedPackIds.junior] ?? 0) < minimumPackCounts.junior) {
    recordIssue(
      `${language}:${expectedPackIds.junior} has only ${packCounts[expectedPackIds.junior] ?? 0} templates.`
    );
  }

  for (const role of ['beginner', 'junior']) {
    const packId = expectedPackIds[role];
    const typeCounts = packTypeCounts[packId] ?? {};
    const familySourceCounts = packFamilySourceCounts[packId] ?? {};
    for (const questionType of expectedQuestionTypesByRole[role]) {
      if ((typeCounts[questionType] ?? 0) < 3) {
        recordIssue(`${language}:${packId} has fewer than 3 templates for ${questionType}.`);
      }
    }
    for (const familySlug of expectedFamilySlugsByRole[role]) {
      const curatedCount = familySourceCounts[familySlug]?.curated ?? 0;
      if (curatedCount < minimumCuratedTemplatesPerFamily) {
        recordIssue(
          `${language}:${packId}:${familySlug} has only ${curatedCount} curated templates.`
        );
      }
    }
  }
}

const engineSource = fs.readFileSync(enginePath, 'utf8');
const expandedBankSource = fs.readFileSync(expandedBankPath, 'utf8');
const experienceSource = fs.readFileSync(experiencePath, 'utf8');
const { executionCasesByTemplateId, codeTemplates } = parseEngineSeedCodeTemplates(engineSource);
const blueprintSlotCounts = parseBlueprintSlotCounts(engineSource);
const retakeBlueprintSource = extractConstFunctionSource(engineSource, 'buildRetakeBlueprint');

const expectedBlueprintCounts = {
  beginnerQuickBlueprint: 5,
  beginnerFullBlueprint: 12,
  juniorQuickBlueprint: 5,
  juniorFullBlueprint: 12,
};

for (const [functionName, expectedCount] of Object.entries(expectedBlueprintCounts)) {
  if (blueprintSlotCounts[functionName] !== expectedCount) {
    recordIssue(
      `${functionName} should contain ${expectedCount} slots but has ${blueprintSlotCounts[functionName] ?? 'none'}.`
    );
  }
}

for (const template of codeTemplates) {
  const executionCases = executionCasesByTemplateId.get(template.templateId) || [];
  const effectiveEvaluationStrategy =
    template.evaluationStrategy || (executionCases.length > 0 ? 'execution' : 'typing');

  if (!template.hasExecutionCasesProp) {
    recordIssue(`seed:${template.templateId} is missing executionCases.`);
  }
  if (executionCases.length < 3) {
    recordIssue(`seed:${template.templateId} has fewer than 3 execution cases.`);
  }
  if (effectiveEvaluationStrategy !== 'execution') {
    recordIssue(`seed:${template.templateId} is not execution-backed.`);
  }
  if (!template.hasPublicTestCasesProp) {
    recordIssue(`seed:${template.templateId} is missing publicTestCases.`);
  }

  const executionDefinition =
    getBenchmarkExecutionDefinition(template.templateId) ||
    buildDynamicBenchmarkExecutionDefinition({
      language: template.language,
      starterCode: template.starterCode,
      referenceCode: template.referenceCode,
      executionCases,
    });

  if (!executionDefinition) {
    recordIssue(`seed:${template.templateId} does not build a backend execution definition.`);
  }
}

const requiredEngineSnippets = [
  'export interface BenchmarkRetakePlan {',
  "sourceType: template.sourceType ?? 'seeded'",
  "version: Math.max(3, template.version ?? 3)",
  'const QUICK_BENCHMARK_QUESTION_COUNT = 5;',
  'const FULL_BENCHMARK_QUESTION_COUNT = 12;',
  'const RETAKE_BENCHMARK_QUESTION_COUNT = 4;',
  'quick: QUICK_BENCHMARK_QUESTION_COUNT',
  'full: FULL_BENCHMARK_QUESTION_COUNT',
  'retake: RETAKE_BENCHMARK_QUESTION_COUNT',
  "options.selectionSeed ?? `${attemptIndex}:${options.stage ?? 'full'}:${format}:${pack.id}`",
  'selected.length < pack.questionCount.retake',
  'return selected.slice(0, pack.questionCount.retake);',
  'return dedupeTemplatesById(seeded);',
  'const buildTemplateQuestionIdentity =',
  'const usedQuestionIdentities = new Set<string>(',
  '!usedQuestionIdentities.has(buildTemplateQuestionIdentity(template))',
  'export const getBenchmarkRetakePlanFromReport =',
  'export const getBenchmarkRetakePlan =',
  "requireFormat: format === 'retake' ? null : format,",
  "retakeSourceReportId: format === 'retake' ? options.retakeSourceReportId ?? null : null,",
  'const authoredPool =',
  'const executionBackedPool =',
];
for (const snippet of requiredEngineSnippets) {
  if (!engineSource.includes(snippet)) {
    recordIssue(`benchmarkEngine.ts is missing expected guard snippet: ${snippet}`);
  }
}

const requiredExpandedBankSnippets = [
  "sourceType: template.sourceType ?? 'generated'",
  "version: Math.max(3, template.version ?? 3)",
  "sourceType: overrides.sourceType ?? 'curated'",
  'const CURATED_PROMOTION_COUNT = 3;',
  'const splitPromotedSpecs =',
  'familySlug: family.slug',
];
for (const snippet of requiredExpandedBankSnippets) {
  if (!expandedBankSource.includes(snippet)) {
    recordIssue(`benchmarkExpandedSeedBank.js is missing expected guard snippet: ${snippet}`);
  }
}

const forbiddenEngineSnippets = ['versionScore', 'template.version >= 3'];
for (const snippet of forbiddenEngineSnippets) {
  if (engineSource.includes(snippet)) {
    recordIssue(`benchmarkEngine.ts still contains deprecated quality heuristic: ${snippet}`);
  }
}

const forbiddenEngineCountSnippets = ['full: meta.roleLevel === \'junior\' ? 12 : 10'];
for (const snippet of forbiddenEngineCountSnippets) {
  if (engineSource.includes(snippet)) {
    recordIssue(`benchmarkEngine.ts still contains deprecated format sizing logic: ${snippet}`);
  }
}

const forbiddenRetakeSizingSnippets = ['while (selected.length < 4', 'slice(0, 4)'];
for (const snippet of forbiddenRetakeSizingSnippets) {
  if (retakeBlueprintSource.includes(snippet)) {
    recordIssue(`buildRetakeBlueprint still contains deprecated retake sizing logic: ${snippet}`);
  }
}

const requiredExperienceSnippets = [
  "const [assessmentStage, setAssessmentStage] = useState<BenchmarkStage>('full');",
  'const [retakePlanOverride, setRetakePlanOverride] = useState<BenchmarkRetakePlan | null>(null);',
  'const availableRetakePlan = useMemo(',
  "const nextQuestions = buildQuestionSet(nextSelectionSeed, 'full');",
  "stage: storedSession.stage || 'full',",
  'retakePlan: activeRetakePlan,',
  'const nextRetakePlan =',
  'getBenchmarkRetakePlan(nextReport.setup, reportHistory, nextReport.retakeSourceReportId ?? null);',
  "if (option.value === 'retake' && !availableRetakePlan) {",
  'Run one trusted quick or full benchmark in this pack before starting a retake.',
];
for (const snippet of requiredExperienceSnippets) {
  if (!experienceSource.includes(snippet)) {
    recordIssue(`BenchmarkExperience.tsx is missing expected fixed-count snippet: ${snippet}`);
  }
}

const forbiddenExperienceSnippets = [
  'appendAdaptiveFollowupIfNeeded',
  "buildQuestionSet(\n      assessmentSelectionSeed || `followup:${assessmentAttemptIndex}`",
  "stage: storedSession.stage || 'baseline',",
];
for (const snippet of forbiddenExperienceSnippets) {
  if (experienceSource.includes(snippet)) {
    recordIssue(`BenchmarkExperience.tsx still contains deprecated adaptive-count logic: ${snippet}`);
  }
}

if (issues.length > 0) {
  console.error('Benchmark bank audit failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

const summary = Object.fromEntries(
  Object.entries(benchmarkExpandedSeedTemplatesByLanguage).map(([language, templates]) => [
    language,
    {
      total: templates.length,
      curated: templates.filter((template) => template.sourceType === 'curated').length,
      executionBackedCurated: templates.filter(
        (template) => template.sourceType === 'curated' && template.kind === 'code'
      ).length,
      byPack: countByPack(templates),
    },
  ])
);

console.log('Benchmark bank audit passed.');
console.log(JSON.stringify(summary, null, 2));
