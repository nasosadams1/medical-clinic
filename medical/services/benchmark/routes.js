import express from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { createAuthenticatedUserMiddleware } from '../auth-utils.js';
import { getBenchmarkExecutionDefinition } from './execution-bank.js';

const BenchmarkSetupSchema = z.object({
  goal: z.enum(['interview_prep', 'class_improvement', 'skill_growth']),
  language: z.enum(['python', 'javascript', 'java', 'cpp']),
  roleLevel: z.enum(['beginner', 'intern', 'junior', 'general_practice']),
});

const BenchmarkAnswerRecordSchema = z
  .object({
  questionId: z.string().trim().min(1).max(160),
  selectedAnswer: z.number().int().min(-1).max(20).optional(),
  submittedCode: z.string().max(12000).optional(),
  evaluationMessage: z.string().trim().min(1).max(800).optional(),
  scorePercent: z.number().int().min(0).max(100).optional(),
  rubricBreakdown: z
    .object({
      correctness: z.number().int().min(0).max(100),
      edgeCaseHandling: z.number().int().min(0).max(100),
      codeQuality: z.number().int().min(0).max(100),
      efficiency: z.number().int().min(0).max(100),
    })
    .optional(),
  isCorrect: z.boolean(),
})
  .passthrough();

const BenchmarkQuestionSchema = z
  .object({
  id: z.string().trim().min(1).max(200),
  templateId: z.string().trim().min(1).max(200),
  slotId: z.string().trim().min(1).max(120),
  section: z.enum(['baseline', 'implementation', 'debugging', 'comprehension', 'theory']).optional(),
  sectionLabel: z.string().trim().min(1).max(120).optional(),
  assessmentType: z.enum(['theory', 'implementation', 'debugging', 'comprehension']).optional(),
  dimensions: z
    .array(
      z.enum([
        'language_fluency',
        'code_writing',
        'code_reading',
        'debugging',
        'problem_solving',
        'code_quality',
        'efficiency',
        'consistency',
      ])
    )
    .max(8)
    .optional(),
  anchor: z.boolean().optional(),
  lessonId: z.string().trim().min(1).max(160),
  lessonTitle: z.string().trim().min(1).max(200),
  kind: z.enum(['multiple_choice', 'code']),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(400)).min(2).max(8).optional(),
  correctAnswer: z.number().int().min(0).max(7).optional(),
  starterCode: z.string().max(12000).optional(),
  referenceCode: z.string().max(12000).optional(),
  validationMode: z.enum(['exact', 'includes_all']).optional(),
  requiredSnippets: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
  edgeCaseSnippets: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
  qualitySignals: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
  efficiencySignals: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
  forbiddenPatterns: z.array(z.string().trim().min(1).max(400)).max(12).optional(),
  weights: z
    .object({
      correctness: z.number().min(0).max(1).optional(),
      edgeCaseHandling: z.number().min(0).max(1).optional(),
      codeQuality: z.number().min(0).max(1).optional(),
      efficiency: z.number().min(0).max(1).optional(),
    })
    .optional(),
  explanation: z.string().trim().min(1).max(1200),
  competency: z.string().trim().min(1).max(120),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  weight: z.number().min(0.5).max(5),
})
  .passthrough();

const BenchmarkReportSchema = z
  .object({
  id: z.string().trim().min(1).max(160),
  benchmarkVersion: z.string().trim().min(1).max(60),
  attemptIndex: z.number().int().min(0).max(1000),
  setup: BenchmarkSetupSchema,
  isPublic: z.boolean().optional(),
  shareToken: z.string().trim().min(1).max(160).nullable().optional(),
  publicSharedAt: z.string().trim().min(1).max(80).nullable().optional(),
  overallScore: z.number().int().min(0).max(100),
  correctAnswers: z.number().int().min(0).max(100),
  totalQuestions: z.number().int().min(1).max(100),
  strengths: z.array(z.string().trim().min(1).max(120)).max(8),
  weaknesses: z.array(z.string().trim().min(1).max(120)).max(8),
  dimensionScores: z
    .array(
      z.object({
        key: z.enum([
          'language_fluency',
          'code_writing',
          'code_reading',
          'debugging',
          'problem_solving',
          'code_quality',
          'efficiency',
          'consistency',
        ]),
        label: z.string().trim().min(1).max(120),
        score: z.number().int().min(0).max(100),
        description: z.string().trim().min(1).max(600),
      })
    )
    .max(12)
    .optional(),
  sectionScores: z
    .array(
      z.object({
        section: z.enum(['baseline', 'implementation', 'debugging', 'comprehension', 'theory']),
        label: z.string().trim().min(1).max(120),
        score: z.number().int().min(0).max(100),
        questionCount: z.number().int().min(1).max(20),
      })
    )
    .max(8)
    .optional(),
  confidenceBand: z
    .object({
      label: z.string().trim().min(1).max(120),
      percent: z.number().int().min(0).max(100),
      description: z.string().trim().min(1).max(600),
    })
    .optional(),
  recommendedTrackIds: z.array(z.string().trim().min(1).max(120)).max(8),
  suggestedLessonIds: z.array(z.string().trim().min(1).max(160)).max(8),
  suggestedDuelProblemTitles: z.array(z.string().trim().min(1).max(160)).max(8),
  duelReadiness: z.object({
    label: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(600),
    confidencePercent: z.number().int().min(0).max(100),
  }),
  estimation: z.object({
    label: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(600),
    targetRoleLabel: z.string().trim().min(1).max(120),
    baselineScore: z.number().int().min(0).max(100),
    competencyCoveragePercent: z.number().int().min(0).max(100),
  }),
  summary: z.string().trim().min(1).max(1200),
  createdAt: z.string().trim().min(1).max(80),
  questions: z.array(BenchmarkQuestionSchema).min(1).max(25),
  answerRecords: z.array(BenchmarkAnswerRecordSchema).max(25),
})
  .passthrough();

const ListReportsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

const ReportRouteParamsSchema = z.object({
  reportId: z.string().trim().min(1).max(160),
});

const SharedReportRouteParamsSchema = z.object({
  publicToken: z.string().trim().min(6).max(160),
});

const BenchmarkEvaluateRequestSchema = z.object({
  templateId: z.string().trim().min(1).max(200),
  language: z.enum(['python', 'javascript', 'java', 'cpp']),
  submittedCode: z.string().trim().min(1).max(12000),
});

const mapJudgeResultToBenchmarkEvaluation = (judgeResult) => {
  const publicTests = (judgeResult?.testResults || []).filter((entry) => !entry.hidden);
  const hiddenTests = (judgeResult?.testResults || []).filter((entry) => entry.hidden);
  const publicPassed = publicTests.filter((entry) => entry.passed).length;
  const hiddenPassed = hiddenTests.filter((entry) => entry.passed).length;
  const publicRatio = publicTests.length > 0 ? publicPassed / publicTests.length : (judgeResult?.score || 0) / 100;
  const hiddenRatio = hiddenTests.length > 0 ? hiddenPassed / hiddenTests.length : publicRatio;
  const overallRatio = (judgeResult?.score || 0) / 100;
  const efficiencyScore = judgeResult?.result === 'Time Limit Exceeded' ? 20 : overallRatio >= 1 ? 86 : Math.round(38 + overallRatio * 42);
  const codeQualityScore = overallRatio >= 1 ? 82 : Math.round(32 + overallRatio * 40);

  return {
    passed: judgeResult?.result === 'Accepted',
    message:
      judgeResult?.result === 'Accepted'
        ? 'Public and hidden benchmark tests passed.'
        : judgeResult?.result === 'Wrong Answer'
        ? 'The code did not satisfy all benchmark tests yet.'
        : judgeResult?.result === 'Runtime Error'
        ? 'The code raised a runtime error during benchmark execution.'
        : judgeResult?.result === 'Time Limit Exceeded'
        ? 'The solution exceeded the benchmark time limit.'
        : 'Benchmark execution could not be completed.',
    scorePercent: Math.round(judgeResult?.score || 0),
    rubricBreakdown: {
      correctness: Math.round(publicRatio * 100),
      edgeCaseHandling: Math.round(hiddenRatio * 100),
      codeQuality: codeQualityScore,
      efficiency: efficiencyScore,
    },
    testResults: judgeResult?.testResults || [],
    runtimeMs: judgeResult?.runtimeMs || 0,
  };
};

const buildPersistedReportRow = (userId, report) => ({
  user_id: userId,
  client_report_id: report.id,
  report_payload: report,
  goal: report.setup.goal,
  language: report.setup.language,
  role_level: report.setup.roleLevel,
  overall_score: report.overallScore,
  correct_answers: report.correctAnswers,
  total_questions: report.totalQuestions,
  source: report.benchmarkVersion || 'benchmark_v2',
  created_at: report.createdAt,
});

const mergeReportRow = (row) => ({
  ...(row.report_payload || {}),
  isPublic: Boolean(row.is_public),
  shareToken: row.public_token || null,
  publicSharedAt: row.public_shared_at || null,
});

const buildPublicShareToken = () => randomBytes(12).toString('base64url');

const roundAverage = (values = []) => {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

const roundRate = (value, total) => {
  if (!total) return null;
  return Math.round((value / total) * 100);
};

const toValidDate = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : null;
};

const normalizeBenchmarkFormat = (value) => {
  const format = String(value || '').trim().toLowerCase();
  if (format === 'quick' || format === 'full' || format === 'retake') {
    return format;
  }
  return 'quick';
};

const matchesReportSetup = (left, right) =>
  Boolean(left && right) &&
  left.language === right.language &&
  left.goal === right.goal &&
  left.roleLevel === right.roleLevel;

const getTrustTier = (score = 0) => {
  if (score >= 82) return 'high';
  if (score >= 60) return 'moderate';
  return 'review';
};

const getTrustTierLabel = (tier) =>
  tier === 'high' ? 'High trust' : tier === 'moderate' ? 'Moderate trust' : 'Needs review';

const getLatestReportsByUser = (reports) => {
  const reportsByUser = new Map();

  reports.forEach((report) => {
    if (!report?.userId || !report.createdAt) return;
    const current = reportsByUser.get(report.userId);
    if (!current || toValidDate(report.createdAt) > toValidDate(current.createdAt)) {
      reportsByUser.set(report.userId, report);
    }
  });

  return Array.from(reportsByUser.values());
};

const getPlanPurchaseTimestamp = (row) => {
  const metadataPurchaseAt = row?.metadata?.latest_purchase_at;
  return (
    toValidDate(metadataPurchaseAt) ??
    toValidDate(row?.updated_at) ??
    toValidDate(row?.current_period_start) ??
    null
  );
};

const buildFormatFunnels = (reports, analyticsEvents = [], planEntitlements = []) => {
  const emptyFunnel = () => ({
    starts: 0,
    completes: 0,
    completionRate: null,
    reportViews: 0,
    signupAfterReport: 0,
    subscriptionClicks: 0,
    upgradeIntentRate: null,
    paidConversions: 0,
    reportSignupRate: null,
    reportPaidRate: null,
  });

  const funnels = {
    quick: emptyFunnel(),
    full: emptyFunnel(),
    retake: emptyFunnel(),
  };

  analyticsEvents.forEach((event) => {
    const format = normalizeBenchmarkFormat(event?.properties?.format);
    const funnel = funnels[format];
    if (!funnel) return;

    switch (event?.event_name) {
      case 'benchmark_start':
        funnel.starts += 1;
        break;
      case 'benchmark_complete':
        funnel.completes += 1;
        break;
      case 'benchmark_report_viewed':
        funnel.reportViews += 1;
        break;
      case 'signup_after_report':
        funnel.signupAfterReport += 1;
        break;
      case 'subscription_cta_clicked':
        if (String(event?.properties?.source || '') === 'benchmark_report') {
          funnel.subscriptionClicks += 1;
        }
        break;
      default:
        break;
    }
  });

  const reportsByUser = reports.reduce((map, report) => {
    if (!report?.userId || !report?.createdAt) return map;
    const current = map.get(report.userId) || [];
    current.push(report);
    map.set(report.userId, current);
    return map;
  }, new Map());

  reportsByUser.forEach((userReports) => {
    userReports.sort((left, right) => toValidDate(left.createdAt) - toValidDate(right.createdAt));
  });

  const countedConversions = new Set();
  planEntitlements.forEach((entitlement) => {
    if (!entitlement?.user_id || entitlement.status !== 'active') return;
    const purchaseAt = getPlanPurchaseTimestamp(entitlement);
    if (purchaseAt === null) return;

    const reportsForUser = reportsByUser.get(entitlement.user_id) || [];
    const candidate = [...reportsForUser]
      .filter((report) => {
        const reportAt = toValidDate(report.createdAt);
        return (
          reportAt !== null &&
          purchaseAt >= reportAt &&
          purchaseAt - reportAt <= 1000 * 60 * 60 * 24 * 14
        );
      })
      .sort((left, right) => toValidDate(right.createdAt) - toValidDate(left.createdAt))[0];

    if (!candidate) return;

    const conversionKey = `${entitlement.user_id}:${candidate.id}:${entitlement.item_id}:${purchaseAt}`;
    if (countedConversions.has(conversionKey)) return;
    countedConversions.add(conversionKey);

    funnels[normalizeBenchmarkFormat(candidate.format)].paidConversions += 1;
  });

  Object.values(funnels).forEach((funnel) => {
    const reportExposureCount = Math.max(funnel.reportViews, funnel.completes);
    funnel.completionRate = roundRate(funnel.completes, funnel.starts);
    funnel.upgradeIntentRate = roundRate(funnel.subscriptionClicks, reportExposureCount);
    funnel.reportSignupRate = roundRate(funnel.signupAfterReport, reportExposureCount);
    funnel.reportPaidRate = roundRate(funnel.paidConversions, reportExposureCount);
  });

  return funnels;
};

const computeOutcomeValidation = (reports, lessonEvents, matchEvents) => {
  const latestReports = getLatestReportsByUser(reports);
  if (latestReports.length === 0) {
    return {
      lessonFollowThroughRate: null,
      duelParticipationRate: null,
      highVsLowScoreLessonLift: null,
      highVsLowScoreDuelLift: null,
    };
  }

  const reportsWithOutcomes = latestReports
    .map((report) => {
      const benchmarkAt = toValidDate(report.createdAt);
      if (!benchmarkAt) return null;

      const windowEnd = benchmarkAt + 1000 * 60 * 60 * 24 * 14;
      const lessonHit = lessonEvents.some((event) => {
        const occurredAt = toValidDate(event.created_at);
        return (
          event.user_id === report.userId &&
          occurredAt !== null &&
          occurredAt >= benchmarkAt &&
          occurredAt <= windowEnd
        );
      });
      const duelHit = matchEvents.some((event) => {
        const occurredAt = toValidDate(event.created_at);
        return (
          (event.player_a_user_id === report.userId || event.player_b_user_id === report.userId) &&
          occurredAt !== null &&
          occurredAt >= benchmarkAt &&
          occurredAt <= windowEnd
        );
      });

      return {
        score: Number(report.overallScore || 0),
        lessonHit,
        duelHit,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.score - right.score);

  if (reportsWithOutcomes.length === 0) {
    return {
      lessonFollowThroughRate: null,
      duelParticipationRate: null,
      highVsLowScoreLessonLift: null,
      highVsLowScoreDuelLift: null,
    };
  }

  const overallLessonRate = Math.round(
    (reportsWithOutcomes.filter((entry) => entry.lessonHit).length / reportsWithOutcomes.length) * 100
  );
  const overallDuelRate = Math.round(
    (reportsWithOutcomes.filter((entry) => entry.duelHit).length / reportsWithOutcomes.length) * 100
  );

  const bandSize = Math.max(1, Math.floor(reportsWithOutcomes.length / 3));
  const lowBand = reportsWithOutcomes.slice(0, bandSize);
  const highBand = reportsWithOutcomes.slice(-bandSize);
  const getBandRate = (entries, key) =>
    entries.length > 0 ? Math.round((entries.filter((entry) => entry[key]).length / entries.length) * 100) : null;

  const lowLessonRate = getBandRate(lowBand, 'lessonHit');
  const highLessonRate = getBandRate(highBand, 'lessonHit');
  const lowDuelRate = getBandRate(lowBand, 'duelHit');
  const highDuelRate = getBandRate(highBand, 'duelHit');

  return {
    lessonFollowThroughRate: overallLessonRate,
    duelParticipationRate: overallDuelRate,
    highVsLowScoreLessonLift:
      lowLessonRate === null || highLessonRate === null ? null : highLessonRate - lowLessonRate,
    highVsLowScoreDuelLift: lowDuelRate === null || highDuelRate === null ? null : highDuelRate - lowDuelRate,
  };
};

const computeTrustTierOutcomes = (reports, matchEvents) => {
  const buckets = {
    high: {
      tier: 'high',
      label: getTrustTierLabel('high'),
      benchmarkCount: 0,
      trustScores: [],
      retakeCount: 0,
      retakeDeltas: [],
      positiveRetakes: 0,
      duelHits: 0,
    },
    moderate: {
      tier: 'moderate',
      label: getTrustTierLabel('moderate'),
      benchmarkCount: 0,
      trustScores: [],
      retakeCount: 0,
      retakeDeltas: [],
      positiveRetakes: 0,
      duelHits: 0,
    },
    review: {
      tier: 'review',
      label: getTrustTierLabel('review'),
      benchmarkCount: 0,
      trustScores: [],
      retakeCount: 0,
      retakeDeltas: [],
      positiveRetakes: 0,
      duelHits: 0,
    },
  };

  const reportsByUser = reports.reduce((map, report) => {
    if (!report?.userId || !report?.createdAt || !report?.setup) return map;
    const current = map.get(report.userId) || [];
    current.push(report);
    map.set(report.userId, current);
    return map;
  }, new Map());

  reportsByUser.forEach((userReports) => {
    userReports.sort((left, right) => toValidDate(left.createdAt) - toValidDate(right.createdAt));

    userReports.forEach((report, index) => {
      const tier = getTrustTier(report.trustScore);
      const bucket = buckets[tier];
      const benchmarkAt = toValidDate(report.createdAt);
      if (!bucket || benchmarkAt === null) return;

      bucket.benchmarkCount += 1;
      bucket.trustScores.push(Number(report.trustScore || 0));

      const duelHit = matchEvents.some((event) => {
        const occurredAt = toValidDate(event.created_at);
        return (
          (event.player_a_user_id === report.userId || event.player_b_user_id === report.userId) &&
          occurredAt !== null &&
          occurredAt >= benchmarkAt &&
          occurredAt <= benchmarkAt + 1000 * 60 * 60 * 24 * 14
        );
      });

      if (duelHit) {
        bucket.duelHits += 1;
      }

      const nextComparableReport = userReports.slice(index + 1).find((candidate) => {
        const candidateAt = toValidDate(candidate.createdAt);
        return (
          candidateAt !== null &&
          candidateAt > benchmarkAt &&
          candidateAt <= benchmarkAt + 1000 * 60 * 60 * 24 * 60 &&
          matchesReportSetup(candidate.setup, report.setup)
        );
      });

      if (!nextComparableReport) {
        return;
      }

      const delta = Number(nextComparableReport.overallScore || 0) - Number(report.overallScore || 0);
      bucket.retakeCount += 1;
      bucket.retakeDeltas.push(delta);
      if (delta > 0) {
        bucket.positiveRetakes += 1;
      }
    });
  });

  return Object.values(buckets).map((bucket) => ({
    tier: bucket.tier,
    label: bucket.label,
    benchmarkCount: bucket.benchmarkCount,
    averageTrustScore: roundAverage(bucket.trustScores),
    retakeCount: bucket.retakeCount,
    retakeRate: roundRate(bucket.retakeCount, bucket.benchmarkCount),
    averageRetakeDelta:
      bucket.retakeDeltas.length > 0
        ? Math.round((bucket.retakeDeltas.reduce((total, value) => total + value, 0) / bucket.retakeDeltas.length) * 10) / 10
        : null,
    positiveRetakeRate: roundRate(bucket.positiveRetakes, bucket.retakeCount),
    duelParticipationRate: roundRate(bucket.duelHits, bucket.benchmarkCount),
  }));
};

const buildQualitySummary = ({
  reportRows = [],
  lessonEvents = [],
  matchEvents = [],
  analyticsEvents = [],
  planEntitlements = [],
}) => {
  const hydratedReports = reportRows
    .map((row) => {
      const merged = mergeReportRow(row);
      if (!merged?.questions || !merged?.answerRecords) return null;
      return {
        userId: row.user_id || null,
        overallScore: Number(merged.overallScore || 0),
        createdAt: merged.createdAt || row.created_at,
        id: merged.id || row.id || null,
        setup: merged.setup,
        format: merged.format || 'quick',
        trustScore: Number(merged?.trustSignal?.score || 0),
        confidencePercent: Number(merged?.confidenceBand?.percent || 0),
        questions: Array.isArray(merged.questions) ? merged.questions : [],
        answerRecords: Array.isArray(merged.answerRecords) ? merged.answerRecords : [],
      };
    })
    .filter(Boolean);

  const itemSignalMap = new Map();
  const formatMix = { quick: 0, full: 0, retake: 0 };
  const calibrationMix = { draft: 0, calibrating: 0, validated: 0 };

  hydratedReports.forEach((report) => {
    formatMix[report.format] = (formatMix[report.format] || 0) + 1;
    const answerMap = new Map(report.answerRecords.map((answer) => [answer.questionId, answer]));

    report.questions.forEach((question) => {
      const signal = itemSignalMap.get(question.templateId) || {
        templateId: question.templateId,
        exposureCount: 0,
        correctCount: 0,
        discriminationTotal: 0,
        calibrationState: question.calibrationState || 'calibrating',
      };

      signal.exposureCount += 1;
      signal.correctCount += answerMap.get(question.id)?.isCorrect ? 1 : 0;
      signal.discriminationTotal += Number(question.discrimination || 0.6);
      signal.calibrationState = question.calibrationState || signal.calibrationState;
      itemSignalMap.set(question.templateId, signal);
    });
  });

  itemSignalMap.forEach((signal) => {
    calibrationMix[signal.calibrationState] = (calibrationMix[signal.calibrationState] || 0) + 1;
  });

  const validation = computeOutcomeValidation(hydratedReports, lessonEvents, matchEvents);
  const trustTierOutcomes = computeTrustTierOutcomes(hydratedReports, matchEvents);
  const formatFunnels = buildFormatFunnels(hydratedReports, analyticsEvents, planEntitlements);

  return {
    available: true,
    benchmarkCount: hydratedReports.length,
    averageTrustScore: roundAverage(hydratedReports.map((report) => report.trustScore).filter(Boolean)),
    averageConfidencePercent: roundAverage(
      hydratedReports.map((report) => report.confidencePercent).filter(Boolean)
    ),
    formatMix,
    formatFunnels,
    calibrationMix,
    validation,
    trustTierOutcomes,
    itemSignals: Array.from(itemSignalMap.values())
      .map((signal) => ({
        templateId: signal.templateId,
        exposureCount: signal.exposureCount,
        passRate: signal.exposureCount > 0 ? Math.round((signal.correctCount / signal.exposureCount) * 100) : 0,
        discrimination:
          signal.exposureCount > 0
            ? Math.round((signal.discriminationTotal / signal.exposureCount) * 100) / 100
            : 0.6,
        calibrationState: signal.calibrationState,
      }))
      .sort((left, right) => right.exposureCount - left.exposureCount)
      .slice(0, 8),
  };
};

const buildUnavailableQualitySummary = (reason = null) => ({
  available: false,
  reason,
  benchmarkCount: 0,
  averageTrustScore: 0,
  averageConfidencePercent: 0,
  formatMix: { quick: 0, full: 0, retake: 0 },
  formatFunnels: {
    quick: {
      starts: 0,
      completes: 0,
      completionRate: null,
      reportViews: 0,
      signupAfterReport: 0,
      subscriptionClicks: 0,
      upgradeIntentRate: null,
      paidConversions: 0,
      reportSignupRate: null,
      reportPaidRate: null,
    },
    full: {
      starts: 0,
      completes: 0,
      completionRate: null,
      reportViews: 0,
      signupAfterReport: 0,
      subscriptionClicks: 0,
      upgradeIntentRate: null,
      paidConversions: 0,
      reportSignupRate: null,
      reportPaidRate: null,
    },
    retake: {
      starts: 0,
      completes: 0,
      completionRate: null,
      reportViews: 0,
      signupAfterReport: 0,
      subscriptionClicks: 0,
      upgradeIntentRate: null,
      paidConversions: 0,
      reportSignupRate: null,
      reportPaidRate: null,
    },
  },
  calibrationMix: { draft: 0, calibrating: 0, validated: 0 },
  validation: {
    lessonFollowThroughRate: null,
    duelParticipationRate: null,
    highVsLowScoreLessonLift: null,
    highVsLowScoreDuelLift: null,
  },
  trustTierOutcomes: [],
  itemSignals: [],
});

const createUniquePublicShareToken = async (supabaseAdmin) => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildPublicShareToken();
    const { data, error } = await supabaseAdmin
      .from('benchmark_reports')
      .select('id')
      .eq('public_token', candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Could not create a public share token.');
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error('Could not create a unique public share token.');
};

export const createBenchmarkRouter = ({ supabaseAdmin, judgeService = null }) => {
  const router = express.Router();
  const requireAuth = createAuthenticatedUserMiddleware(supabaseAdmin, 'Benchmark API');

  router.post('/evaluate', async (req, res) => {
    try {
      const { templateId, language, submittedCode } = BenchmarkEvaluateRequestSchema.parse(req.body || {});
      if (!judgeService || typeof judgeService.executeCode !== 'function') {
        return res.status(503).json({ error: 'Benchmark execution is not configured on this server.' });
      }

      const executionDefinition = getBenchmarkExecutionDefinition(templateId);
      if (!executionDefinition) {
        return res.status(400).json({ error: 'This benchmark task is not execution-backed.' });
      }

      if (executionDefinition.language !== language) {
        return res.status(400).json({ error: 'Benchmark execution definition does not match the selected language.' });
      }

      const judgeResult = await judgeService.executeCode(submittedCode, executionDefinition.language, executionDefinition.testCases);
      return res.json(mapJudgeResultToBenchmarkEvaluation(judgeResult));
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not evaluate the benchmark task.' });
    }
  });

  router.get('/quality/summary', async (_req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.json({
          summary: buildUnavailableQualitySummary('Benchmark quality is unavailable because the API is not configured.'),
        });
      }

      const [
        benchmarkRowsResult,
        lessonEventsResult,
        matchEventsResult,
        analyticsEventsResult,
        planEntitlementsResult,
      ] = await Promise.all([
        supabaseAdmin
          .from('benchmark_reports')
          .select('id, user_id, created_at, report_payload, is_public, public_token, public_shared_at')
          .order('created_at', { ascending: false })
          .limit(2000),
        supabaseAdmin
          .from('lesson_completion_events')
          .select('user_id, created_at')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabaseAdmin
          .from('matches')
          .select('player_a_user_id, player_b_user_id, created_at, status')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabaseAdmin
          .from('analytics_events')
          .select('user_id, anonymous_id, event_name, properties, occurred_at')
          .in('event_name', [
            'benchmark_start',
            'benchmark_complete',
            'benchmark_report_viewed',
            'signup_after_report',
            'subscription_cta_clicked',
          ])
          .order('occurred_at', { ascending: false })
          .limit(8000),
        supabaseAdmin
          .from('plan_entitlements')
          .select('user_id, item_id, plan_name, status, current_period_start, current_period_end, updated_at, metadata')
          .order('updated_at', { ascending: false })
          .limit(2000),
      ]);

      if (benchmarkRowsResult.error) {
        return res.json({
          summary: buildUnavailableQualitySummary(
            benchmarkRowsResult.error.message || 'Benchmark quality is unavailable until benchmark reports are configured.'
          ),
        });
      }

      const optionalQueryErrors = [
        lessonEventsResult.error,
        matchEventsResult.error,
        analyticsEventsResult.error,
        planEntitlementsResult.error,
      ].filter(Boolean);

      const summary = buildQualitySummary({
        reportRows: benchmarkRowsResult.data || [],
        lessonEvents: lessonEventsResult.error ? [] : lessonEventsResult.data || [],
        matchEvents: matchEventsResult.error ? [] : matchEventsResult.data || [],
        analyticsEvents: analyticsEventsResult.error ? [] : analyticsEventsResult.data || [],
        planEntitlements: planEntitlementsResult.error ? [] : planEntitlementsResult.data || [],
      });

      if (optionalQueryErrors.length > 0) {
        summary.reason = 'Some quality metrics are temporarily unavailable because supporting analytics data is missing.';
      }

      return res.json({
        summary,
      });
    } catch (error) {
      return res.json({
        summary: buildUnavailableQualitySummary(
          error.message || 'Benchmark calibration details are temporarily unavailable.'
        ),
      });
    }
  });

  router.get('/shared/:publicToken', async (req, res) => {
    try {
      const { publicToken } = SharedReportRouteParamsSchema.parse(req.params || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .select('report_payload, is_public, public_token, public_shared_at')
        .eq('public_token', publicToken)
        .eq('is_public', true)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Could not load the shared benchmark report.');
      }

      if (!data?.report_payload) {
        return res.status(404).json({ error: 'Shared benchmark report not found.' });
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load the shared benchmark report.' });
    }
  });

  router.get('/reports', requireAuth, async (req, res) => {
    try {
      const { limit = 8 } = ListReportsQuerySchema.parse(req.query || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .select('id, report_payload, created_at, is_public, public_token, public_shared_at')
        .eq('user_id', req.authenticatedUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message || 'Could not load benchmark history.');
      }

      const reports = (data || [])
        .map((row) => mergeReportRow(row))
        .filter(Boolean);

      return res.json({ reports });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not load benchmark history.' });
    }
  });

  router.post('/reports', requireAuth, async (req, res) => {
    try {
      const report = BenchmarkReportSchema.parse(req.body || {});
      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .upsert(buildPersistedReportRow(req.authenticatedUser.id, report), {
          onConflict: 'user_id,client_report_id',
        })
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not save benchmark report.');
      }

      return res.status(201).json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not save benchmark report.' });
    }
  });

  router.post('/reports/:reportId/share', requireAuth, async (req, res) => {
    try {
      const { reportId } = ReportRouteParamsSchema.parse(req.params || {});
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('benchmark_reports')
        .select('*')
        .eq('user_id', req.authenticatedUser.id)
        .eq('client_report_id', reportId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message || 'Could not load the benchmark report for sharing.');
      }

      if (!existingRow) {
        return res.status(404).json({ error: 'Benchmark report not found.' });
      }

      const publicToken = existingRow.public_token || (await createUniquePublicShareToken(supabaseAdmin));
      const publicSharedAt = new Date().toISOString();
      const mergedReportPayload = {
        ...(existingRow.report_payload || {}),
        isPublic: true,
        shareToken: publicToken,
        publicSharedAt,
      };

      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .update({
          is_public: true,
          public_token: publicToken,
          public_shared_at: publicSharedAt,
          report_payload: mergedReportPayload,
        })
        .eq('id', existingRow.id)
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not publish the benchmark report.');
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not publish the benchmark report.' });
    }
  });

  router.delete('/reports/:reportId/share', requireAuth, async (req, res) => {
    try {
      const { reportId } = ReportRouteParamsSchema.parse(req.params || {});
      const { data: existingRow, error: existingError } = await supabaseAdmin
        .from('benchmark_reports')
        .select('*')
        .eq('user_id', req.authenticatedUser.id)
        .eq('client_report_id', reportId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message || 'Could not load the benchmark report.');
      }

      if (!existingRow) {
        return res.status(404).json({ error: 'Benchmark report not found.' });
      }

      const mergedReportPayload = {
        ...(existingRow.report_payload || {}),
        isPublic: false,
        shareToken: existingRow.public_token || null,
        publicSharedAt: null,
      };

      const { data, error } = await supabaseAdmin
        .from('benchmark_reports')
        .update({
          is_public: false,
          public_shared_at: null,
          report_payload: mergedReportPayload,
        })
        .eq('id', existingRow.id)
        .select('report_payload, is_public, public_token, public_shared_at')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Could not disable the public benchmark link.');
      }

      return res.json({ report: mergeReportRow(data) });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Could not disable the public benchmark link.' });
    }
  });

  return router;
};
