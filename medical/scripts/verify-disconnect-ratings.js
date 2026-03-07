import assert from 'node:assert/strict';
import { MatchController } from '../services/match-controller.js';
import { EloRatingService } from '../services/elo-rating.js';

function createSupabaseStub() {
  return {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        update() { return this; },
        insert() { return this; },
        delete() { return this; },
      };
    },
  };
}

function createIoCapture(events) {
  return {
    to() {
      return {
        emit(event, payload) {
          events.push({ event, payload });
        },
      };
    },
  };
}

function createBaseMatch(status) {
  return {
    playerA: { userId: 'player-a', username: 'Player A', rating: 531 },
    playerB: { userId: 'player-b', username: 'Player B', rating: 500 },
    difficulty: 'easy',
    startTimeMs: Date.now() - 2000,
    timeLimitMs: 300000,
    timeLimitSec: 300,
    submissions: new Map(),
    attempts: new Map(),
    wrongSubmissions: new Map(),
    lastSubmissionAtMs: new Map(),
    winnerId: null,
    resultStrength: 'draw',
    status,
    matchType: 'ranked',
    isRanked: true,
    ending: false,
    timeoutHandle: null,
    countdownHandle: null,
  };
}

async function run() {
  const events = [];
  const controller = new MatchController(createSupabaseStub(), createIoCapture(events), null, new EloRatingService());

  controller._safeUpdate = async () => {};
  controller._safeInsert = async () => {};
  controller.createReplay = async () => {};

  controller.pendingMatches.set('countdown-match', createBaseMatch('COUNTDOWN'));
  await controller.endMatch('countdown-match', 'player-b', 'disconnect_before_start', null);

  const countdownEnd = events.find((entry) => entry.event === 'match_end' && entry.payload.matchId === 'countdown-match')?.payload;
  assert.ok(countdownEnd, 'Countdown disconnect should emit match_end');
  assert.equal(countdownEnd.reason, 'disconnect_before_start');
  assert.equal(countdownEnd.playerA.ratingChange, -22);
  assert.equal(countdownEnd.playerB.ratingChange, 0);
  assert.equal(countdownEnd.playerB.ratingAfter, 500);
  assert.equal(countdownEnd.playerB.actualScore, 1);

  controller.activeMatches.set('active-match', createBaseMatch('ACTIVE'));
  await controller.endMatch('active-match', 'player-b', 'disconnect_during_match', null);

  const activeEnd = events.find((entry) => entry.event === 'match_end' && entry.payload.matchId === 'active-match')?.payload;
  assert.ok(activeEnd, 'Active disconnect should emit match_end');
  assert.equal(activeEnd.reason, 'disconnect_during_match');
  assert.equal(activeEnd.playerA.ratingChange, -22);
  assert.equal(activeEnd.playerB.ratingChange, 22);
  assert.equal(activeEnd.playerB.ratingAfter, 522);
  assert.equal(activeEnd.resultStrength, 'clear');

  console.log('Disconnect rating policy verified.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
