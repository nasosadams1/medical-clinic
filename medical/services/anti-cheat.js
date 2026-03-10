const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const CONTROL_FLOW_KEYWORDS = [
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'return',
  'break',
  'continue',
  'try',
  'catch',
  'throw',
  'function',
  'class',
];

const RESERVED_WORDS = new Set([
  ...CONTROL_FLOW_KEYWORDS,
  'const',
  'let',
  'var',
  'new',
  'true',
  'false',
  'null',
  'undefined',
  'async',
  'await',
  'default',
  'import',
  'export',
  'from',
  'extends',
  'super',
  'this',
]);

export const ANTI_CHEAT_CASE_THRESHOLD = 55;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 1000) / 1000;
const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

export const stripComments = (code) =>
  normalizeWhitespace(code)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .trim();

export const tokenizeSource = (code) =>
  stripComments(code).match(/[A-Za-z_$][A-Za-z0-9_$]*|\d+(?:\.\d+)?|==|!=|<=|>=|=>|&&|\|\||[{}()[\].,;:+\-*/%<>!=]/g) || [];

const canonicalizeTokens = (tokens) =>
  tokens.map((token) => {
    if (!IDENTIFIER_REGEX.test(token)) return token;
    if (RESERVED_WORDS.has(token)) return token;
    return '__id__';
  });

const toSet = (items) => new Set(items.filter(Boolean));

const jaccard = (left, right) => {
  const a = toSet(left);
  const b = toSet(right);
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((value) => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

const cosineSimilarity = (leftCounts, rightCounts) => {
  const keys = new Set([...Object.keys(leftCounts), ...Object.keys(rightCounts)]);
  if (keys.size === 0) return 1;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const key of keys) {
    const leftValue = leftCounts[key] ?? 0;
    const rightValue = rightCounts[key] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue ** 2;
    rightMagnitude += rightValue ** 2;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
};

const buildControlFlowCounts = (tokens) => {
  const counts = Object.create(null);
  for (const keyword of CONTROL_FLOW_KEYWORDS) {
    counts[keyword] = 0;
  }
  for (const token of tokens) {
    if (CONTROL_FLOW_KEYWORDS.includes(token)) counts[token] += 1;
  }
  return counts;
};

const normalizeCodeLines = (code) =>
  stripComments(code)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const compareIpPrefix = (left, right) => {
  if (!left || !right) return { exact: false, prefix: false };
  if (left === right) return { exact: true, prefix: true };

  if (left.includes(':') || right.includes(':')) {
    const leftPrefix = left.split(':').slice(0, 4).join(':');
    const rightPrefix = right.split(':').slice(0, 4).join(':');
    return { exact: false, prefix: !!leftPrefix && leftPrefix === rightPrefix };
  }

  const leftPrefix = left.split('.').slice(0, 3).join('.');
  const rightPrefix = right.split('.').slice(0, 3).join('.');
  return { exact: false, prefix: !!leftPrefix && leftPrefix === rightPrefix };
};

const summarizeTelemetry = (events, userId) => {
  const summary = {
    count: 0,
    pasteEvents: 0,
    largePasteEvents: 0,
    pasteChars: 0,
    majorEdits: 0,
    focusLosses: 0,
    reasons: [],
  };

  for (const event of safeArray(events)) {
    if (event.user_id !== userId || event.event_type !== 'editor_telemetry') continue;
    const payload = event.payload || {};
    summary.count += 1;
    summary.pasteEvents += Number(payload.pasteEvents || 0);
    summary.largePasteEvents += Number(payload.largePasteEvents || 0);
    summary.pasteChars += Number(payload.pasteChars || 0);
    summary.majorEdits += Number(payload.majorEdits || 0);
    summary.focusLosses += Number(payload.focusLosses || 0);
    if (payload.reason) summary.reasons.push(String(payload.reason));
  }

  return summary;
};

const buildTimingSignals = (submissionA, submissionB) => {
  if (!submissionA || !submissionB) {
    return {
      acceptedDeltaMs: null,
      submittedDeltaMs: null,
      scoreDelta: null,
    };
  }

  const acceptedDeltaMs =
    Number.isFinite(submissionA.elapsedMs) && Number.isFinite(submissionB.elapsedMs)
      ? Math.abs(submissionA.elapsedMs - submissionB.elapsedMs)
      : null;

  const submittedDeltaMs =
    Number.isFinite(submissionA.submittedAtMs) && Number.isFinite(submissionB.submittedAtMs)
      ? Math.abs(submissionA.submittedAtMs - submissionB.submittedAtMs)
      : null;

  const scoreDelta =
    Number.isFinite(submissionA.matchScore) && Number.isFinite(submissionB.matchScore)
      ? Math.abs(submissionA.matchScore - submissionB.matchScore)
      : null;

  return {
    acceptedDeltaMs,
    submittedDeltaMs,
    scoreDelta,
  };
};

const buildRiskSignals = ({ similarity, session, telemetry, timing, submissionA, submissionB }) => {
  const flags = [];
  let riskScore = 0;

  if (submissionA?.codeHash && submissionA.codeHash === submissionB?.codeHash) {
    riskScore += 40;
    flags.push('exact_code_hash_match');
  }

  if (similarity.tokenSimilarity >= 0.82) {
    riskScore += 18;
    flags.push('high_token_similarity');
  }

  if (similarity.identifierInsensitiveSimilarity >= 0.86) {
    riskScore += 22;
    flags.push('high_identifier_insensitive_similarity');
  }

  if (similarity.controlFlowSimilarity >= 0.9) {
    riskScore += 12;
    flags.push('high_control_flow_similarity');
  }

  if (similarity.lineSimilarity >= 0.78) {
    riskScore += 10;
    flags.push('high_line_similarity');
  }

  if (session.sameDeviceCluster) {
    riskScore += 20;
    flags.push('same_device_cluster');
  }

  if (session.sameIpExact) {
    riskScore += 16;
    flags.push('same_ip_exact');
  } else if (session.sameIpPrefix) {
    riskScore += 8;
    flags.push('same_ip_prefix');
  }

  if (session.sameUserAgent) {
    riskScore += 6;
    flags.push('same_user_agent');
  }

  if (session.sameTimezone && session.samePlatform && session.sameLanguage) {
    riskScore += 5;
    flags.push('matching_client_environment');
  }

  if (Number.isFinite(timing.acceptedDeltaMs) && timing.acceptedDeltaMs !== null && timing.acceptedDeltaMs <= 10000) {
    riskScore += 10;
    flags.push('close_accepted_timing');
  }

  if (Number.isFinite(timing.submittedDeltaMs) && timing.submittedDeltaMs !== null && timing.submittedDeltaMs <= 3000) {
    riskScore += 6;
    flags.push('close_submission_timing');
  }

  if (
    telemetry.playerA.pasteEvents > 0 &&
    telemetry.playerB.pasteEvents > 0 &&
    (telemetry.playerA.largePasteEvents > 0 || telemetry.playerB.largePasteEvents > 0)
  ) {
    riskScore += 8;
    flags.push('paste_activity_on_both_clients');
  }

  if (telemetry.playerA.focusLosses >= 3 || telemetry.playerB.focusLosses >= 3) {
    riskScore += 4;
    flags.push('high_focus_loss_count');
  }

  return {
    riskScore: clamp(Math.round(riskScore), 0, 100),
    flags,
  };
};

export const analyzeMatchForAntiCheat = ({
  matchId,
  playerA = null,
  playerB = null,
  playerASubmission,
  playerBSubmission,
  matchEvents = null,
  match = null,
  events = null,
}) => {
  const resolvedPlayerA = playerA ?? match?.playerA ?? null;
  const resolvedPlayerB = playerB ?? match?.playerB ?? null;
  const resolvedMatchEvents = safeArray(matchEvents ?? events);
  const codeA = playerASubmission?.code || '';
  const codeB = playerBSubmission?.code || '';

  const tokensA = tokenizeSource(codeA);
  const tokensB = tokenizeSource(codeB);
  const canonicalTokensA = canonicalizeTokens(tokensA);
  const canonicalTokensB = canonicalizeTokens(tokensB);
  const lineFingerprintA = normalizeCodeLines(codeA);
  const lineFingerprintB = normalizeCodeLines(codeB);

  const similarity = {
    tokenSimilarity: round(jaccard(tokensA, tokensB)),
    identifierInsensitiveSimilarity: round(jaccard(canonicalTokensA, canonicalTokensB)),
    lineSimilarity: round(jaccard(lineFingerprintA, lineFingerprintB)),
    controlFlowSimilarity: round(cosineSimilarity(buildControlFlowCounts(tokensA), buildControlFlowCounts(tokensB))),
  };

  const leftSession = resolvedPlayerA?.sessionEvidence || {};
  const rightSession = resolvedPlayerB?.sessionEvidence || {};
  const ipSignals = compareIpPrefix(leftSession.ipAddress, rightSession.ipAddress);

  const session = {
    sameDeviceCluster:
      !!leftSession.deviceClusterId &&
      !!rightSession.deviceClusterId &&
      leftSession.deviceClusterId === rightSession.deviceClusterId,
    sameIpExact: ipSignals.exact,
    sameIpPrefix: ipSignals.prefix,
    sameUserAgent:
      !!leftSession.userAgent &&
      !!rightSession.userAgent &&
      leftSession.userAgent === rightSession.userAgent,
    sameTimezone:
      !!leftSession.clientMeta?.timezone &&
      !!rightSession.clientMeta?.timezone &&
      leftSession.clientMeta.timezone === rightSession.clientMeta.timezone,
    samePlatform:
      !!leftSession.clientMeta?.platform &&
      !!rightSession.clientMeta?.platform &&
      leftSession.clientMeta.platform === rightSession.clientMeta.platform,
    sameLanguage:
      !!leftSession.clientMeta?.language &&
      !!rightSession.clientMeta?.language &&
      leftSession.clientMeta.language === rightSession.clientMeta.language,
  };

  const telemetry = {
    playerA: summarizeTelemetry(resolvedMatchEvents, resolvedPlayerA?.userId),
    playerB: summarizeTelemetry(resolvedMatchEvents, resolvedPlayerB?.userId),
  };

  const timing = buildTimingSignals(playerASubmission, playerBSubmission);
  const risk = buildRiskSignals({
    similarity,
    session,
    telemetry,
    timing,
    submissionA: playerASubmission,
    submissionB: playerBSubmission,
  });

  const summaryParts = [];
  if (risk.flags.includes('exact_code_hash_match')) summaryParts.push('Identical final submission hashes');
  if (risk.flags.includes('same_device_cluster')) summaryParts.push('same device cluster');
  if (risk.flags.includes('same_ip_exact')) summaryParts.push('same IP');
  if (risk.flags.includes('same_ip_prefix')) summaryParts.push('same network prefix');
  if (risk.flags.includes('high_identifier_insensitive_similarity')) summaryParts.push('high renamed-code similarity');
  if (risk.flags.includes('close_accepted_timing')) summaryParts.push('very close solve timing');
  if (risk.flags.includes('paste_activity_on_both_clients')) summaryParts.push('paste activity on both clients');

  const summary =
    summaryParts.length > 0
      ? `Suspicious duel evidence: ${summaryParts.join(', ')}.`
      : 'Moderation review recommended due to combined duel integrity signals.';

  return {
    matchId,
    riskScore: risk.riskScore,
    shouldCreateCase: risk.riskScore >= ANTI_CHEAT_CASE_THRESHOLD,
    summary,
    evidence: {
      similarity,
      session,
      telemetry,
      timing,
      flags: risk.flags,
      players: {
        playerA: {
          userId: resolvedPlayerA?.userId,
          username: resolvedPlayerA?.username,
          codeHash: playerASubmission?.codeHash || null,
          attempts: playerASubmission?.attempts || 0,
          wrongSubmissions: playerASubmission?.wrongSubmissionCount || 0,
        },
        playerB: {
          userId: resolvedPlayerB?.userId,
          username: resolvedPlayerB?.username,
          codeHash: playerBSubmission?.codeHash || null,
          attempts: playerBSubmission?.attempts || 0,
          wrongSubmissions: playerBSubmission?.wrongSubmissionCount || 0,
        },
      },
    },
  };
};
