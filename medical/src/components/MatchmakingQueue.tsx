import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck, Swords, Target, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import MascotIcon from './branding/MascotIcon';
import { trackEvent } from '../lib/analytics';

interface MatchmakingQueueProps {
  socket: any;
  rating: number;
  ensureSocketRegistered: (options?: { silent?: boolean }) => Promise<boolean>;
  onMatchFound: (matchData: any) => void;
  onMatchEnd: (result: any) => void;
  allowedMatchTypes?: MatchType[];
  remainingFreeDuels?: number | null;
  freeDuelLimit?: number | null;
  advancedAnalyticsUnlocked?: boolean;
  onDuelStarted?: (matchType: MatchType) => void;
}

type MatchType = 'ranked' | 'casual';

const normalizeMatchType = (value: unknown): MatchType => (value === 'casual' ? 'casual' : 'ranked');

const formatQueueTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const queueModeCards: Array<{
  id: MatchType;
  title: string;
  eyebrow: string;
  description: string;
  tone: string;
}> = [
  {
    id: 'casual',
    title: 'Casual',
    eyebrow: 'Practice signal',
    description: 'Run head-to-head coding reps under real duel conditions without affecting your rating.',
    tone: 'from-secondary to-card',
  },
  {
    id: 'ranked',
    title: 'Ranked',
    eyebrow: 'Competitive signal',
    description: 'Compete in judged matches where speed and correctness feed directly into your persistent rating.',
    tone: 'from-primary/20 to-accent/10',
  },
];

export default function MatchmakingQueue({
  socket,
  rating,
  ensureSocketRegistered,
  onMatchFound,
  onMatchEnd,
  allowedMatchTypes = ['casual', 'ranked'],
  remainingFreeDuels = null,
  freeDuelLimit = null,
  advancedAnalyticsUnlocked = true,
  onDuelStarted,
}: MatchmakingQueueProps) {
  const initialMatchType: MatchType = allowedMatchTypes.includes('casual') ? 'casual' : allowedMatchTypes[0] || 'casual';
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>(initialMatchType);
  const [activeMatchType, setActiveMatchType] = useState<MatchType>(initialMatchType);
  const [inQueue, setInQueue] = useState(false);
  const [isMatchStarting, setIsMatchStarting] = useState(false);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [queueWaitTime, setQueueWaitTime] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  const pendingMatchRef = useRef<any>(null);
  const selectedMatchTypeRef = useRef<MatchType>(initialMatchType);

  useEffect(() => {
    if (allowedMatchTypes.length === 0) return;

    const nextDefaultMatchType: MatchType = allowedMatchTypes.includes('casual')
      ? 'casual'
      : allowedMatchTypes[0] || 'casual';

    if (!allowedMatchTypes.includes(selectedMatchType)) {
      setSelectedMatchType(nextDefaultMatchType);
      selectedMatchTypeRef.current = nextDefaultMatchType;
    }

    if (!inQueue && !isJoining && !isMatchStarting && !allowedMatchTypes.includes(activeMatchType)) {
      setActiveMatchType(nextDefaultMatchType);
    }
  }, [activeMatchType, allowedMatchTypes, inQueue, isJoining, isMatchStarting, selectedMatchType]);

  useEffect(() => {
    selectedMatchTypeRef.current = selectedMatchType;
    if (!inQueue && !isJoining && !isMatchStarting) {
      setActiveMatchType(selectedMatchType);
    }
  }, [inQueue, isJoining, isMatchStarting, selectedMatchType]);

  useEffect(() => {
    if (!socket) return;

    const resetPendingState = () => {
      pendingMatchRef.current = null;
      setIsMatchStarting(false);
      setQueueWaitTime(0);
    };

    const onQueueUpdate = (data: any) => {
      setActiveMatchType(normalizeMatchType(data?.matchType));
      setPlayersOnline(data.onlinePlayers ?? data.queueSize ?? 0);
      setQueueWaitTime(data.waitTime ?? 0);
    };

    const onDisconnectEvent = () => {
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
      setActiveMatchType(selectedMatchTypeRef.current);
    };

    const onQueueJoined = (data: any) => {
      toast.success(data.message || 'Joined queue');
      setActiveMatchType(normalizeMatchType(data?.matchType ?? selectedMatchTypeRef.current));
      setQueueWaitTime(0);
      setInQueue(true);
      setIsJoining(false);
    };

    const onQueueLeft = (data: any) => {
      toast(data.message || 'Left queue');
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
    };

    const onMatchFoundEvent = (data: any) => {
      toast.success(`Match found! Opponent: ${data?.opponent?.username ?? 'Unknown'}`);
      pendingMatchRef.current = {
        ...data,
        matchType: normalizeMatchType(data?.matchType ?? selectedMatchTypeRef.current),
      };
      setInQueue(false);
      setIsJoining(false);
      setIsMatchStarting(true);
    };

    const onDuelStartedEvent = (data: any) => {
      if (pendingMatchRef.current?.matchId !== data?.matchId) return;

      const merged = {
        ...pendingMatchRef.current,
        ...data,
        opponent: pendingMatchRef.current?.opponent,
      };

      trackEvent('duel_started', {
        matchType: normalizeMatchType(data?.matchType ?? pendingMatchRef.current?.matchType ?? selectedMatchTypeRef.current),
      });
      onDuelStarted?.(normalizeMatchType(data?.matchType ?? pendingMatchRef.current?.matchType ?? selectedMatchTypeRef.current));

      resetPendingState();
      onMatchFound(merged);
    };

    const onMatchEndEvent = (data: any) => {
      if (pendingMatchRef.current?.matchId !== data?.matchId) return;

      if (data?.reason === 'disconnect_before_start') {
        toast('Opponent disconnected before the duel started.', { icon: '\u26A0' });
      }

      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
      onMatchEnd(data);
    };

    const onServerError = (data: any) => {
      console.error('server_error:', data?.message, data?.details || data?.error);
      resetPendingState();
      toast.error(data?.message || 'Server error');
      setInQueue(false);
      setIsJoining(false);
    };

    socket.on('queue_update', onQueueUpdate);
    socket.on('disconnect', onDisconnectEvent);
    socket.on('queue_joined', onQueueJoined);
    socket.on('queue_left', onQueueLeft);
    socket.on('match_found', onMatchFoundEvent);
    socket.on('duel_started', onDuelStartedEvent);
    socket.on('match_end', onMatchEndEvent);
    socket.on('server_error', onServerError);

    return () => {
      socket.off('queue_update', onQueueUpdate);
      socket.off('disconnect', onDisconnectEvent);
      socket.off('queue_joined', onQueueJoined);
      socket.off('queue_left', onQueueLeft);
      socket.off('match_found', onMatchFoundEvent);
      socket.off('duel_started', onDuelStartedEvent);
      socket.off('match_end', onMatchEndEvent);
      socket.off('server_error', onServerError);
    };
  }, [onDuelStarted, onMatchEnd, onMatchFound, socket]);

  const handleJoinQueue = async () => {
    if (!socket) return toast.error('Socket not ready');
    if (!socket.connected) return toast.error('Not connected to duel server');
    if (inQueue || isJoining) return;
    const matchType = selectedMatchTypeRef.current;

    if (!allowedMatchTypes.includes(matchType)) {
      toast.error('Upgrade to unlock this duel mode.');
      return;
    }

    if (remainingFreeDuels !== null && remainingFreeDuels <= 0) {
      toast.error('Free duel access is used up for today. Upgrade to keep playing.');
      return;
    }

    setIsJoining(true);
    setActiveMatchType(matchType);
    setQueueWaitTime(0);

    const isRegistered = await ensureSocketRegistered();
    if (!isRegistered) {
      setIsJoining(false);
      return;
    }

    socket.emit('join_matchmaking', { matchType });
  };

  const handleLeaveQueue = () => {
    if (!socket) return;

    pendingMatchRef.current = null;
    setIsMatchStarting(false);
    socket.emit('leave_matchmaking');
    setInQueue(false);
    setIsJoining(false);
    setQueueWaitTime(0);
    setActiveMatchType(selectedMatchTypeRef.current);
  };

  const displayedMatchType = inQueue ? activeMatchType : selectedMatchType;
  const isRankedMode = displayedMatchType === 'ranked';
  const duelLimitReached = remainingFreeDuels !== null && remainingFreeDuels <= 0;

  if (isMatchStarting) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto mb-6 h-20 w-20 animate-float">
            <MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" />
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <h2 className="text-3xl font-bold font-display text-foreground">Match starting</h2>
          <p className="mt-3 text-muted-foreground">Lock in. The duel arena is loading now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Swords className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Duels as skill proof</span>
          </div>

          <h2 className="mt-5 text-3xl font-bold font-display text-foreground sm:text-4xl">
            {isRankedMode ? 'Queue for a live judged ranking match.' : 'Queue for head-to-head coding practice.'}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            Choose the level of pressure you want. Casual sharpens speed without rating changes. Ranked turns duel performance into a visible competitive signal.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {queueModeCards.map((mode) => {
              const isActive = selectedMatchType === mode.id;
              const isLocked = !allowedMatchTypes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      toast.error('Upgrade to unlock ranked duels.');
                      return;
                    }
                    setSelectedMatchType(mode.id);
                  }}
                  disabled={inQueue || isJoining}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                    isActive
                      ? 'border-primary/40 bg-primary/10 shadow-glow'
                      : 'border-border bg-secondary/30 hover:border-primary/20 hover:bg-secondary/45'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{mode.eyebrow}</div>
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                        <LockKeyhole className="h-3 w-3" />
                        Pro / Sprint
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-xl font-bold font-display text-foreground">{mode.title}</div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{mode.description}</p>
                </button>
              );
            })}
          </div>

          {remainingFreeDuels !== null ? (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
              <div className="font-semibold text-primary">Free duel access</div>
              <div className="mt-1">
                {duelLimitReached
                  ? `You used ${freeDuelLimit ?? 0}/${freeDuelLimit ?? 0} duels today.`
                  : `${remainingFreeDuels} of ${freeDuelLimit ?? 0} casual duels left today.`}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {inQueue ? (
              <>
                <button
                  type="button"
                  onClick={handleLeaveQueue}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-3.5 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90"
                >
                  Cancel search
                </button>
                <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/35 px-5 py-3.5 text-sm font-semibold text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Searching...
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={handleJoinQueue}
                disabled={isJoining || duelLimitReached}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {isJoining ? 'Starting queue...' : duelLimitReached ? 'Upgrade to continue' : 'Start queue'}
              </button>
            )}
            {duelLimitReached || !advancedAnalyticsUnlocked ? (
              <Link
                to="/pricing?intent=pro"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                Unlock Pro
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </section>

        <aside className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isRankedMode ? 'bg-primary/10 text-primary' : 'bg-secondary text-foreground'}`}>
                {isRankedMode ? <Trophy className="h-6 w-6" /> : <Swords className="h-6 w-6" />}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current mode</div>
                <div className="mt-1 text-2xl font-bold font-display text-foreground">{isRankedMode ? 'Ranked' : 'Casual'}</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {isRankedMode
                ? 'Rating changes are based on judged duel outcomes and become part of your leaderboard signal.'
                : 'Casual matches let you rehearse pressure and pacing without affecting your stored rating.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Signal snapshot</div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-border bg-secondary/35 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {isRankedMode ? 'Your skill signal' : 'Queue type'}
                </div>
                <div className="mt-3 text-3xl font-bold font-display text-foreground">
                  {isRankedMode ? (advancedAnalyticsUnlocked ? rating : 'Locked') : 'Casual 1v1'}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {isRankedMode
                    ? advancedAnalyticsUnlocked
                      ? 'Current ranked rating'
                      : 'Ranked rating unlocks with Pro or Interview Sprint'
                    : 'Practice under real duel conditions'}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/35 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Users className="h-4 w-4 text-xp" />
                  Players online
                </div>
                <div className="mt-3 text-3xl font-bold font-display text-foreground">{playersOnline}</div>
                <div className="mt-1 text-sm text-muted-foreground">Available for matchmaking now</div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/35 p-5 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Target className="h-4 w-4 text-coins" />
                  Queue time
                </div>
                <div className="mt-3 text-3xl font-bold font-display text-foreground">{formatQueueTime(queueWaitTime)}</div>
                <div className="mt-1 text-sm text-muted-foreground">{inQueue ? 'Live queue timer' : 'Will start when you join'}</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
