import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { benchmarkExpandedSeedTemplatesByLanguage } from '../src/data/benchmarkExpandedSeedBank.js';
import { buildDynamicBenchmarkExecutionDefinition } from '../services/benchmark/execution-bank.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const enginePath = path.join(repoRoot, 'src', 'data', 'benchmarkEngine.ts');
const expandedBankPath = path.join(repoRoot, 'src', 'data', 'benchmarkExpandedSeedBank.js');

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

const requiredEngineSnippets = [
  "sourceType: template.sourceType ?? 'seeded'",
  "version: Math.max(3, template.version ?? 3)",
  'return dedupeTemplatesById(seeded);',
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
