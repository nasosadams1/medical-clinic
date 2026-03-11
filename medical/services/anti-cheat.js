import * as acorn from "acorn";

const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const CONTROL_FLOW_KEYWORDS = [
  "if",
  "else",
  "for",
  "while",
  "switch",
  "case",
  "return",
  "break",
  "continue",
  "try",
  "catch",
  "throw",
  "function",
  "class",
];

const LOOP_NODE_TYPES = new Set(["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"]);
const AST_OPERATOR_TYPES = new Set([
  "BinaryExpression",
  "LogicalExpression",
  "AssignmentExpression",
  "UpdateExpression",
  "UnaryExpression",
  "ConditionalExpression",
]);

const RESERVED_WORDS = new Set([
  ...CONTROL_FLOW_KEYWORDS,
  "const",
  "let",
  "var",
  "new",
  "true",
  "false",
  "null",
  "undefined",
  "async",
  "await",
  "default",
  "import",
  "export",
  "from",
  "extends",
  "super",
  "this",
]);

export const ANTI_CHEAT_CASE_THRESHOLD = 55;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 1000) / 1000;
const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeWhitespace = (value) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();

const toSafeString = (value, maxLength = 512) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;

const normalizeTimestampMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const deriveIpPrefix = (value) => {
  if (!value) return null;
  if (value.includes(":")) return value.split(":").slice(0, 4).join(":") || null;
  return value.split(".").slice(0, 3).join(".") || null;
};

export const stripComments = (code) =>
  normalizeWhitespace(code)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();

export const tokenizeSource = (code) =>
  stripComments(code).match(/[A-Za-z_$][A-Za-z0-9_$]*|\d+(?:\.\d+)?|==|!=|<=|>=|=>|&&|\|\||[{}()[\].,;:+\-*/%<>!=]/g) || [];

const canonicalizeTokens = (tokens) =>
  tokens.map((token) => {
    if (!IDENTIFIER_REGEX.test(token)) return token;
    if (RESERVED_WORDS.has(token)) return token;
    return "__id__";
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
  const keys = new Set([...Object.keys(leftCounts || {}), ...Object.keys(rightCounts || {})]);
  if (keys.size === 0) return 1;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const key of keys) {
    const leftValue = leftCounts?.[key] ?? 0;
    const rightValue = rightCounts?.[key] ?? 0;
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
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const compareIpPrefix = (left, right) => {
  if (!left || !right) return { exact: false, prefix: false, leftPrefix: deriveIpPrefix(left), rightPrefix: deriveIpPrefix(right) };
  if (left === right) return { exact: true, prefix: true, leftPrefix: deriveIpPrefix(left), rightPrefix: deriveIpPrefix(right) };

  const leftPrefix = deriveIpPrefix(left);
  const rightPrefix = deriveIpPrefix(right);
  return { exact: false, prefix: !!leftPrefix && leftPrefix === rightPrefix, leftPrefix, rightPrefix };
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
    if (event.user_id !== userId || event.event_type !== "editor_telemetry") continue;
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

const buildTimingSignals = (submissionA, submissionB, historyA, historyB) => {
  if (!submissionA || !submissionB) {
    return {
      acceptedDeltaMs: null,
      submittedDeltaMs: null,
      scoreDelta: null,
      historyStartDeltaMs: null,
      historyEndDeltaMs: null,
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

  const historyStartA = historyA?.[0]?.timestampMs ?? null;
  const historyStartB = historyB?.[0]?.timestampMs ?? null;
  const historyEndA = historyA?.[historyA.length - 1]?.timestampMs ?? null;
  const historyEndB = historyB?.[historyB.length - 1]?.timestampMs ?? null;

  return {
    acceptedDeltaMs,
    submittedDeltaMs,
    scoreDelta,
    historyStartDeltaMs:
      Number.isFinite(historyStartA) && Number.isFinite(historyStartB)
        ? Math.abs(historyStartA - historyStartB)
        : null,
    historyEndDeltaMs:
      Number.isFinite(historyEndA) && Number.isFinite(historyEndB)
        ? Math.abs(historyEndA - historyEndB)
        : null,
  };
};


const tryParseAst = (code) => {
  const source = stripComments(code);
  if (!source) return null;

  const parseOptions = { ecmaVersion: "latest", sourceType: "module", allowHashBang: true };
  const attempts = [source, `(${source})`];
  for (const attempt of attempts) {
    try {
      return acorn.parse(attempt, parseOptions);
    } catch {
      // Try the next shape.
    }
  }
  return null;
};

const walkAst = (node, visitor, parentType = null) => {
  if (!node || typeof node.type !== "string") return;
  visitor(node, parentType);

  for (const [key, value] of Object.entries(node)) {
    if (key === "start" || key === "end" || key === "loc" || key === "range") continue;
    if (Array.isArray(value)) {
      value.forEach((child) => walkAst(child, visitor, node.type));
      continue;
    }
    if (value && typeof value === "object" && typeof value.type === "string") {
      walkAst(value, visitor, node.type);
    }
  }
};

const buildAstFingerprint = (code) => {
  const ast = tryParseAst(code);
  if (!ast) {
    return {
      parsed: false,
      nodeCounts: Object.create(null),
      pathCounts: Object.create(null),
      normalizedTokens: [],
      identifierCount: 0,
    };
  }

  const nodeCounts = Object.create(null);
  const pathCounts = Object.create(null);
  const normalizedTokens = [];
  const identifierMap = new Map();

  const normalizeIdentifier = (name) => {
    if (RESERVED_WORDS.has(name)) return name;
    if (!identifierMap.has(name)) {
      identifierMap.set(name, `id${identifierMap.size + 1}`);
    }
    return identifierMap.get(name);
  };

  walkAst(ast, (node, parentType) => {
    nodeCounts[node.type] = (nodeCounts[node.type] || 0) + 1;
    if (parentType) {
      const key = `${parentType}>${node.type}`;
      pathCounts[key] = (pathCounts[key] || 0) + 1;
    }

    if (node.type === "Identifier" && typeof node.name === "string") {
      normalizedTokens.push(`id:${normalizeIdentifier(node.name)}`);
      return;
    }

    if (node.type === "Literal") {
      const literalKind = node.value === null ? "null" : typeof node.value;
      normalizedTokens.push(`lit:${literalKind}`);
      return;
    }

    if (node.type === "TemplateElement") {
      normalizedTokens.push("lit:template");
      return;
    }

    if (AST_OPERATOR_TYPES.has(node.type) && typeof node.operator === "string") {
      normalizedTokens.push(`op:${node.operator}`);
      return;
    }

    if (node.type === "CallExpression") {
      normalizedTokens.push("call");
      return;
    }

    if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
      normalizedTokens.push(`fn:${safeArray(node.params).length}`);
      return;
    }

    if (LOOP_NODE_TYPES.has(node.type)) {
      normalizedTokens.push(`loop:${node.type}`);
      return;
    }

    if (node.type === "MemberExpression") {
      normalizedTokens.push(node.computed ? "member:computed" : "member:direct");
    }
  });

  return {
    parsed: true,
    nodeCounts,
    pathCounts,
    normalizedTokens,
    identifierCount: identifierMap.size,
  };
};

const computeCodeSimilarity = (codeA, codeB) => {
  const tokensA = tokenizeSource(codeA);
  const tokensB = tokenizeSource(codeB);
  const canonicalTokensA = canonicalizeTokens(tokensA);
  const canonicalTokensB = canonicalizeTokens(tokensB);
  const lineFingerprintA = normalizeCodeLines(codeA);
  const lineFingerprintB = normalizeCodeLines(codeB);
  const astA = buildAstFingerprint(codeA);
  const astB = buildAstFingerprint(codeB);

  return {
    tokenSimilarity: round(jaccard(tokensA, tokensB)),
    identifierInsensitiveSimilarity: round(jaccard(canonicalTokensA, canonicalTokensB)),
    lineSimilarity: round(jaccard(lineFingerprintA, lineFingerprintB)),
    controlFlowSimilarity: round(cosineSimilarity(buildControlFlowCounts(tokensA), buildControlFlowCounts(tokensB))),
    astNodeSimilarity: round(cosineSimilarity(astA.nodeCounts, astB.nodeCounts)),
    astPathSimilarity: round(cosineSimilarity(astA.pathCounts, astB.pathCounts)),
    astTokenSimilarity: round(jaccard(astA.normalizedTokens, astB.normalizedTokens)),
    astParsedBoth: astA.parsed && astB.parsed,
  };
};

const buildHistoryEntries = ({ userId, finalSubmission, submissions, snapshots }) => {
  const entries = [];

  safeArray(snapshots)
    .filter((snapshot) => snapshot?.user_id === userId && typeof snapshot?.code === "string" && snapshot.code.trim())
    .forEach((snapshot, index) => {
      entries.push({
        source: "snapshot",
        sequence: index + 1,
        timestampMs: normalizeTimestampMs(snapshot.timestamp) ?? normalizeTimestampMs(snapshot.created_at) ?? null,
        code: snapshot.code,
        codeHash: toSafeString(snapshot.code_hash, 256),
      });
    });

  safeArray(submissions)
    .filter((submission) => submission?.user_id === userId && typeof submission?.code === "string" && submission.code.trim())
    .forEach((submission, index) => {
      entries.push({
        source: "submission",
        sequence: Number(submission.submission_sequence) || index + 1,
        timestampMs:
          normalizeTimestampMs(submission.submitted_at_ms) ??
          normalizeTimestampMs(submission.submitted_at) ??
          normalizeTimestampMs(submission.created_at) ??
          null,
        code: submission.code,
        codeHash: toSafeString(submission.code_hash, 256),
      });
    });

  if (finalSubmission?.code) {
    entries.push({
      source: "final_submission",
      sequence: Number(finalSubmission.submissionSequence) || Number(finalSubmission.attempts) || entries.length + 1,
      timestampMs: normalizeTimestampMs(finalSubmission.submittedAtMs) ?? null,
      code: finalSubmission.code,
      codeHash: toSafeString(finalSubmission.codeHash, 256),
    });
  }

  entries.sort((left, right) => {
    const leftTime = left.timestampMs ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.timestampMs ?? Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) return leftTime - rightTime;
    return (left.sequence ?? 0) - (right.sequence ?? 0);
  });

  const deduped = [];
  let previousFingerprint = null;
  for (const entry of entries) {
    const fingerprint = entry.codeHash || stripComments(entry.code);
    if (fingerprint && previousFingerprint === fingerprint) continue;
    previousFingerprint = fingerprint;
    deduped.push({
      ...entry,
      similarity: computeCodeSimilarity(entry.code, entry.code),
    });
  }

  return deduped;
};

const alignHistories = (historyA, historyB, maxSamples = 6) => {
  if (!historyA.length || !historyB.length) return [];
  const sampleCount = Math.min(maxSamples, Math.max(historyA.length, historyB.length));
  if (sampleCount <= 0) return [];

  const pairs = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const aIndex = sampleCount === 1 ? historyA.length - 1 : Math.round((index / (sampleCount - 1)) * (historyA.length - 1));
    const bIndex = sampleCount === 1 ? historyB.length - 1 : Math.round((index / (sampleCount - 1)) * (historyB.length - 1));
    const left = historyA[aIndex];
    const right = historyB[bIndex];
    if (!left || !right) continue;
    pairs.push({
      checkpoint: index + 1,
      playerA: left,
      playerB: right,
      similarity: computeCodeSimilarity(left.code, right.code),
    });
  }

  return pairs;
};

const buildLongitudinalSignals = (historyA, historyB) => {
  const alignedPairs = alignHistories(historyA, historyB);
  if (!alignedPairs.length) {
    return {
      historySamples: 0,
      averageIdentifierInsensitiveSimilarity: 0,
      averageAstPathSimilarity: 0,
      averageAstNodeSimilarity: 0,
      maxIdentifierInsensitiveSimilarity: 0,
      maxAstPathSimilarity: 0,
      highSimilarityCheckpointCount: 0,
      earlyHighSimilarityCount: 0,
      snapshotMaxIdentifierInsensitiveSimilarity: 0,
      exactCheckpointMatchCount: 0,
    };
  }

  const totals = {
    identifierInsensitive: 0,
    astPath: 0,
    astNode: 0,
  };
  let maxIdentifierInsensitiveSimilarity = 0;
  let maxAstPathSimilarity = 0;
  let highSimilarityCheckpointCount = 0;
  let earlyHighSimilarityCount = 0;
  let snapshotMaxIdentifierInsensitiveSimilarity = 0;
  let exactCheckpointMatchCount = 0;

  alignedPairs.forEach((pair, index) => {
    const similarity = pair.similarity;
    totals.identifierInsensitive += similarity.identifierInsensitiveSimilarity;
    totals.astPath += similarity.astPathSimilarity;
    totals.astNode += similarity.astNodeSimilarity;
    maxIdentifierInsensitiveSimilarity = Math.max(maxIdentifierInsensitiveSimilarity, similarity.identifierInsensitiveSimilarity);
    maxAstPathSimilarity = Math.max(maxAstPathSimilarity, similarity.astPathSimilarity);

    const isHighSimilarity =
      similarity.identifierInsensitiveSimilarity >= 0.82 ||
      similarity.astPathSimilarity >= 0.88 ||
      similarity.astTokenSimilarity >= 0.85;

    if (isHighSimilarity) {
      highSimilarityCheckpointCount += 1;
      if (index < Math.max(1, Math.floor(alignedPairs.length / 2))) {
        earlyHighSimilarityCount += 1;
      }
    }

    if (pair.playerA.source === "snapshot" || pair.playerB.source === "snapshot") {
      snapshotMaxIdentifierInsensitiveSimilarity = Math.max(
        snapshotMaxIdentifierInsensitiveSimilarity,
        similarity.identifierInsensitiveSimilarity
      );
    }

    if (
      (pair.playerA.codeHash && pair.playerA.codeHash === pair.playerB.codeHash) ||
      stripComments(pair.playerA.code) === stripComments(pair.playerB.code)
    ) {
      exactCheckpointMatchCount += 1;
    }
  });

  return {
    historySamples: alignedPairs.length,
    averageIdentifierInsensitiveSimilarity: round(totals.identifierInsensitive / alignedPairs.length),
    averageAstPathSimilarity: round(totals.astPath / alignedPairs.length),
    averageAstNodeSimilarity: round(totals.astNode / alignedPairs.length),
    maxIdentifierInsensitiveSimilarity: round(maxIdentifierInsensitiveSimilarity),
    maxAstPathSimilarity: round(maxAstPathSimilarity),
    highSimilarityCheckpointCount,
    earlyHighSimilarityCount,
    snapshotMaxIdentifierInsensitiveSimilarity: round(snapshotMaxIdentifierInsensitiveSimilarity),
    exactCheckpointMatchCount,
    checkpoints: alignedPairs.map((pair) => ({
      checkpoint: pair.checkpoint,
      sources: [pair.playerA.source, pair.playerB.source],
      similarity: pair.similarity,
      timeDeltaMs:
        Number.isFinite(pair.playerA.timestampMs) && Number.isFinite(pair.playerB.timestampMs)
          ? Math.abs(pair.playerA.timestampMs - pair.playerB.timestampMs)
          : null,
    })),
  };
};

const summarizeHistory = (historyEntries) => ({
  samples: historyEntries.length,
  submissions: historyEntries.filter((entry) => entry.source === "submission" || entry.source === "final_submission").length,
  snapshots: historyEntries.filter((entry) => entry.source === "snapshot").length,
  firstTimestampMs: historyEntries[0]?.timestampMs ?? null,
  lastTimestampMs: historyEntries[historyEntries.length - 1]?.timestampMs ?? null,
});

const summarizeSession = (session) => ({
  ipAddress: toSafeString(session?.ipAddress, 128),
  ipPrefix: deriveIpPrefix(toSafeString(session?.ipAddress, 128)),
  deviceClusterId: toSafeString(session?.deviceClusterId, 128),
  userAgent: toSafeString(session?.userAgent, 256),
  timezone: toSafeString(session?.clientMeta?.timezone, 64),
  platform: toSafeString(session?.clientMeta?.platform, 64),
  language: toSafeString(session?.clientMeta?.language, 32),
  transport: toSafeString(session?.transport, 32),
});

const buildRiskSignals = ({ similarity, session, telemetry, timing, longitudinal, submissionA, submissionB }) => {
  const flags = [];
  let riskScore = 0;

  if (submissionA?.codeHash && submissionA.codeHash === submissionB?.codeHash) {
    riskScore += 40;
    flags.push("exact_code_hash_match");
  }

  if (similarity.tokenSimilarity >= 0.82) {
    riskScore += 18;
    flags.push("high_token_similarity");
  }

  if (similarity.identifierInsensitiveSimilarity >= 0.86) {
    riskScore += 22;
    flags.push("high_identifier_insensitive_similarity");
  }

  if (similarity.controlFlowSimilarity >= 0.9) {
    riskScore += 12;
    flags.push("high_control_flow_similarity");
  }

  if (similarity.lineSimilarity >= 0.78) {
    riskScore += 10;
    flags.push("high_line_similarity");
  }

  if (similarity.astParsedBoth && similarity.astPathSimilarity >= 0.9) {
    riskScore += 14;
    flags.push("high_ast_shape_similarity");
  }

  if (similarity.astParsedBoth && similarity.astNodeSimilarity >= 0.95) {
    riskScore += 8;
    flags.push("high_ast_node_similarity");
  }

  if (similarity.astParsedBoth && similarity.astTokenSimilarity >= 0.86) {
    riskScore += 8;
    flags.push("high_ast_token_similarity");
  }

  if (longitudinal.historySamples >= 3 && longitudinal.averageAstPathSimilarity >= 0.84) {
    riskScore += 12;
    flags.push("longitudinal_ast_similarity");
  }

  if (longitudinal.highSimilarityCheckpointCount >= Math.max(2, Math.ceil(longitudinal.historySamples * 0.5))) {
    riskScore += 10;
    flags.push("longitudinal_code_similarity");
  }

  if (longitudinal.earlyHighSimilarityCount >= 1) {
    riskScore += 12;
    flags.push("early_history_convergence");
  }

  if (longitudinal.snapshotMaxIdentifierInsensitiveSimilarity >= 0.84) {
    riskScore += 8;
    flags.push("high_snapshot_similarity");
  }

  if (longitudinal.exactCheckpointMatchCount >= 1) {
    riskScore += 12;
    flags.push("matching_history_checkpoint");
  }

  if (session.sameDeviceCluster) {
    riskScore += 20;
    flags.push("same_device_cluster");
  }

  if (session.sameIpExact) {
    riskScore += 16;
    flags.push("same_ip_exact");
  } else if (session.sameIpPrefix) {
    riskScore += 8;
    flags.push("same_ip_prefix");
  }

  if (session.sameUserAgent) {
    riskScore += 6;
    flags.push("same_user_agent");
  }

  if (session.sameTimezone && session.samePlatform && session.sameLanguage) {
    riskScore += 5;
    flags.push("matching_client_environment");
  }

  if (Number.isFinite(timing.acceptedDeltaMs) && timing.acceptedDeltaMs !== null && timing.acceptedDeltaMs <= 10000) {
    riskScore += 10;
    flags.push("close_accepted_timing");
  }

  if (Number.isFinite(timing.submittedDeltaMs) && timing.submittedDeltaMs !== null && timing.submittedDeltaMs <= 3000) {
    riskScore += 6;
    flags.push("close_submission_timing");
  }

  if (Number.isFinite(timing.historyStartDeltaMs) && timing.historyStartDeltaMs !== null && timing.historyStartDeltaMs <= 15000) {
    riskScore += 5;
    flags.push("close_history_start_timing");
  }

  if (
    telemetry.playerA.pasteEvents > 0 &&
    telemetry.playerB.pasteEvents > 0 &&
    (telemetry.playerA.largePasteEvents > 0 || telemetry.playerB.largePasteEvents > 0)
  ) {
    riskScore += 8;
    flags.push("paste_activity_on_both_clients");
  }

  if (telemetry.playerA.focusLosses >= 3 || telemetry.playerB.focusLosses >= 3) {
    riskScore += 4;
    flags.push("high_focus_loss_count");
  }

  return {
    riskScore: clamp(Math.round(riskScore), 0, 100),
    flags: [...new Set(flags)],
  };
};

export const analyzeMatchForAntiCheat = ({
  matchId,
  playerA = null,
  playerB = null,
  playerASubmission,
  playerBSubmission,
  matchEvents = null,
  submissions = null,
  snapshots = null,
  match = null,
  events = null,
  submissionHistory = null,
  snapshotHistory = null,
}) => {
  const resolvedPlayerA = playerA ?? match?.playerA ?? null;
  const resolvedPlayerB = playerB ?? match?.playerB ?? null;
  const resolvedMatchEvents = safeArray(matchEvents ?? events);
  const resolvedSubmissionHistory = safeArray(submissionHistory ?? submissions);
  const resolvedSnapshotHistory = safeArray(snapshotHistory ?? snapshots);
  const codeA = playerASubmission?.code || "";
  const codeB = playerBSubmission?.code || "";

  const similarity = computeCodeSimilarity(codeA, codeB);

  const historyA = buildHistoryEntries({
    userId: resolvedPlayerA?.userId,
    finalSubmission: playerASubmission,
    submissions: resolvedSubmissionHistory,
    snapshots: resolvedSnapshotHistory,
  });
  const historyB = buildHistoryEntries({
    userId: resolvedPlayerB?.userId,
    finalSubmission: playerBSubmission,
    submissions: resolvedSubmissionHistory,
    snapshots: resolvedSnapshotHistory,
  });
  const longitudinal = buildLongitudinalSignals(historyA, historyB);

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
    leftIpPrefix: ipSignals.leftPrefix,
    rightIpPrefix: ipSignals.rightPrefix,
  };

  const telemetry = {
    playerA: summarizeTelemetry(resolvedMatchEvents, resolvedPlayerA?.userId),
    playerB: summarizeTelemetry(resolvedMatchEvents, resolvedPlayerB?.userId),
  };

  const timing = buildTimingSignals(playerASubmission, playerBSubmission, historyA, historyB);
  const risk = buildRiskSignals({
    similarity,
    session,
    telemetry,
    timing,
    longitudinal,
    submissionA: playerASubmission,
    submissionB: playerBSubmission,
  });

  const summaryParts = [];
  if (risk.flags.includes("exact_code_hash_match")) summaryParts.push("identical final submission hashes");
  if (risk.flags.includes("same_device_cluster")) summaryParts.push("same device cluster");
  if (risk.flags.includes("same_ip_exact")) summaryParts.push("same IP");
  if (risk.flags.includes("same_ip_prefix")) summaryParts.push("same network prefix");
  if (risk.flags.includes("high_identifier_insensitive_similarity")) summaryParts.push("high renamed-code similarity");
  if (risk.flags.includes("high_ast_shape_similarity")) summaryParts.push("very similar AST structure");
  if (risk.flags.includes("longitudinal_ast_similarity")) summaryParts.push("similar edit history over time");
  if (risk.flags.includes("early_history_convergence")) summaryParts.push("high similarity early in the session");
  if (risk.flags.includes("close_accepted_timing")) summaryParts.push("very close solve timing");
  if (risk.flags.includes("paste_activity_on_both_clients")) summaryParts.push("paste activity on both clients");

  const summary =
    summaryParts.length > 0
      ? `Suspicious duel evidence: ${summaryParts.join(", ")}.`
      : "Moderation review recommended due to combined duel integrity signals.";

  return {
    matchId,
    riskScore: risk.riskScore,
    shouldCreateCase: risk.riskScore >= ANTI_CHEAT_CASE_THRESHOLD,
    summary,
    evidence: {
      similarity,
      longitudinal,
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
          history: summarizeHistory(historyA),
          session: summarizeSession(leftSession),
        },
        playerB: {
          userId: resolvedPlayerB?.userId,
          username: resolvedPlayerB?.username,
          codeHash: playerBSubmission?.codeHash || null,
          attempts: playerBSubmission?.attempts || 0,
          wrongSubmissions: playerBSubmission?.wrongSubmissionCount || 0,
          history: summarizeHistory(historyB),
          session: summarizeSession(rightSession),
        },
      },
    },
  };
};