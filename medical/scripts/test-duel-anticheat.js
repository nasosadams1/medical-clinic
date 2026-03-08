import assert from 'node:assert/strict';
import { ANTI_CHEAT_CASE_THRESHOLD, analyzeMatchForAntiCheat } from '../services/anti-cheat.js';

function basePlayer(userId, username, extras = {}) {
  return {
    userId,
    username,
    sessionEvidence: {
      ipAddress: extras.ipAddress ?? null,
      userAgent: extras.userAgent ?? null,
      deviceClusterId: extras.deviceClusterId ?? null,
      clientMeta: {
        timezone: extras.timezone ?? null,
        platform: extras.platform ?? null,
        language: extras.language ?? null,
      },
    },
  };
}

function baseSubmission(code, extras = {}) {
  return {
    code,
    codeHash: extras.codeHash ?? null,
    attempts: extras.attempts ?? 1,
    wrongSubmissionCount: extras.wrongSubmissionCount ?? 0,
    elapsedMs: extras.elapsedMs ?? null,
    submittedAtMs: extras.submittedAtMs ?? null,
    matchScore: extras.matchScore ?? 0,
  };
}

function runScenario(name, build, expectation) {
  const result = analyzeMatchForAntiCheat(build());
  expectation(result);
  console.log(`[pass] ${name}: risk=${result.riskScore} flags=${result.evidence.flags.join(',')}`);
}

runScenario(
  'exact duplicate code with shared device cluster creates a case',
  () => ({
    matchId: 'match-1',
    playerA: basePlayer('a', 'Alpha', {
      ipAddress: '10.0.0.15',
      userAgent: 'BrowserA',
      deviceClusterId: 'cluster-1',
      timezone: 'Europe/Athens',
      platform: 'Win32',
      language: 'en-US',
    }),
    playerB: basePlayer('b', 'Bravo', {
      ipAddress: '10.0.0.15',
      userAgent: 'BrowserA',
      deviceClusterId: 'cluster-1',
      timezone: 'Europe/Athens',
      platform: 'Win32',
      language: 'en-US',
    }),
    playerASubmission: baseSubmission('function solution(input){ return input.x + input.y; }', {
      codeHash: 'same-hash',
      elapsedMs: 42000,
      submittedAtMs: 1710000000000,
      matchScore: 140,
    }),
    playerBSubmission: baseSubmission('function solution(input){ return input.x + input.y; }', {
      codeHash: 'same-hash',
      elapsedMs: 45000,
      submittedAtMs: 1710000001000,
      matchScore: 138,
    }),
    matchEvents: [
      { user_id: 'a', event_type: 'editor_telemetry', payload: { pasteEvents: 1, largePasteEvents: 1, pasteChars: 350, majorEdits: 2, focusLosses: 0 } },
      { user_id: 'b', event_type: 'editor_telemetry', payload: { pasteEvents: 1, largePasteEvents: 1, pasteChars: 340, majorEdits: 2, focusLosses: 0 } },
    ],
  }),
  (result) => {
    assert.equal(result.shouldCreateCase, true);
    assert.ok(result.riskScore >= ANTI_CHEAT_CASE_THRESHOLD);
    assert.ok(result.evidence.flags.includes('exact_code_hash_match'));
    assert.ok(result.evidence.flags.includes('same_device_cluster'));
  }
);

runScenario(
  'renamed but structurally similar code with close timing creates a case',
  () => ({
    matchId: 'match-2',
    playerA: basePlayer('a', 'Alpha', {
      ipAddress: '192.168.1.10',
      userAgent: 'BrowserB',
      deviceClusterId: 'cluster-a',
      timezone: 'Europe/Athens',
      platform: 'Linux x86_64',
      language: 'en-US',
    }),
    playerB: basePlayer('b', 'Bravo', {
      ipAddress: '192.168.1.23',
      userAgent: 'BrowserC',
      deviceClusterId: 'cluster-b',
      timezone: 'Europe/Athens',
      platform: 'Linux x86_64',
      language: 'en-US',
    }),
    playerASubmission: baseSubmission(
      `
      function solution(input) {
        let total = 0;
        for (const value of input.items) {
          if (value % 2 === 0) total += value;
        }
        return total;
      }
      `,
      { codeHash: 'hash-a', elapsedMs: 88000, submittedAtMs: 1710001000000, matchScore: 126 }
    ),
    playerBSubmission: baseSubmission(
      `
      function solution(payload) {
        let answer = 0;
        for (const number of payload.items) {
          if (number % 2 === 0) answer += number;
        }
        return answer;
      }
      `,
      { codeHash: 'hash-b', elapsedMs: 91000, submittedAtMs: 1710001002000, matchScore: 124 }
    ),
    matchEvents: [],
  }),
  (result) => {
    assert.equal(result.shouldCreateCase, true);
    assert.ok(result.evidence.flags.includes('high_identifier_insensitive_similarity'));
    assert.ok(result.evidence.flags.includes('close_accepted_timing'));
  }
);

runScenario(
  'different code and session signals do not create a case',
  () => ({
    matchId: 'match-3',
    playerA: basePlayer('a', 'Alpha', {
      ipAddress: '172.16.10.5',
      userAgent: 'BrowserD',
      deviceClusterId: 'cluster-x',
      timezone: 'Europe/Athens',
      platform: 'Win32',
      language: 'en-US',
    }),
    playerB: basePlayer('b', 'Bravo', {
      ipAddress: '88.198.20.12',
      userAgent: 'BrowserE',
      deviceClusterId: 'cluster-y',
      timezone: 'America/New_York',
      platform: 'MacIntel',
      language: 'en-GB',
    }),
    playerASubmission: baseSubmission('function solution(input){ return input.values.filter(v => v > 0).length; }', {
      codeHash: 'hash-c',
      elapsedMs: 44000,
      submittedAtMs: 1710010000000,
      matchScore: 133,
    }),
    playerBSubmission: baseSubmission('function solution(input){ return Math.max(...input.values); }', {
      codeHash: 'hash-d',
      elapsedMs: 120000,
      submittedAtMs: 1710010300000,
      matchScore: 98,
    }),
    matchEvents: [],
  }),
  (result) => {
    assert.equal(result.shouldCreateCase, false);
    assert.ok(result.riskScore < ANTI_CHEAT_CASE_THRESHOLD);
  }
);

console.log('Duel anti-cheat checks passed.');
