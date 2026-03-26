import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, LockKeyhole, Swords, Trophy, Users } from 'lucide-react';
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
}> = [
  {
    id: 'casual',
    title: 'Casual',
    eyebrow: 'Practice signal',
    description: 'Run head-to-head coding reps under real duel conditions without affecting your rating.',
  },
  {
    id: 'ranked',
    title: 'Ranked',
    eyebrow: 'Competitive signal',
    description: 'Compete in judged matches where speed and correctness feed directly into your persistent rating.',
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
      toast.error('This duel mode is unavailable right now.');
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
      <div className="flex min-h-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto mb-6 h-20 w-20 animate-float">
            <MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" />
          </div>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <h2 className="type-display-section text-foreground">Match starting</h2>
          <p className="type-body-md mt-3 text-muted-foreground">The arena is loading now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-5 lg:px-6">
      <div className="w-full max-w-3xl rounded-[1.75rem] border border-border bg-card p-6 shadow-elevated sm:p-8 lg:p-10">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-primary/20 bg-primary/10 text-primary">
            <MascotIcon mascot="duel" className="h-12 w-12 sm:h-14 sm:w-14" imageClassName="drop-shadow-md" />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Swords className="h-3.5 w-3.5 text-primary" />
            <span className="type-kicker text-primary">Code Duels</span>
          </div>

          <h2 className="type-display-section mt-5 text-foreground">
            {isRankedMode ? 'Queue for a ranked duel.' : 'Queue for a casual duel.'}
          </h2>
          <p className="type-body-md mx-auto mt-3 max-w-2xl text-muted-foreground">
            {isRankedMode
              ? 'Race another player in a judged coding match and move your rating with every win.'
              : 'Jump into a fast head-to-head coding rep without changing your rating.'}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {queueModeCards.map((mode) => {
              const isActive = selectedMatchType === mode.id;
              const isLocked = !allowedMatchTypes.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    if (isLocked) {
                      toast.error('This duel mode is unavailable right now.');
                      return;
                    }
                    setSelectedMatchType(mode.id);
                  }}
                  disabled={inQueue || isJoining}
                  className={`rounded-[1.35rem] border px-5 py-4 text-left transition-all ${
                    isActive
                      ? 'border-primary/40 bg-primary/10 shadow-card'
                      : 'border-border bg-background hover:border-primary/25 hover:bg-card'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="type-kicker text-primary">{mode.eyebrow}</div>
                    {isLocked ? (
                      <span className="type-label-tight inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-primary">
                        <LockKeyhole className="h-3 w-3" />
                        Locked
                      </span>
                    ) : null}
                  </div>
                  <div className="type-title-sm mt-2 text-foreground">{mode.title}</div>
                  <p className="type-body-sm mt-2 text-muted-foreground">{mode.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[1.35rem] border border-border bg-background px-5 py-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isRankedMode ? <Trophy className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
              </div>
              <div className="type-stat mt-3 text-foreground">
                {isRankedMode ? rating : 'Casual 1v1'}
              </div>
              <div className="type-body-sm mt-1 text-muted-foreground">
                {isRankedMode ? 'Current rating' : 'Head-to-head practice'}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-border bg-background px-5 py-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-xp/10 text-xp">
                <Users className="h-5 w-5" />
              </div>
              <div className="type-stat mt-3 text-foreground">{playersOnline}</div>
              <div className="type-body-sm mt-1 text-muted-foreground">Players online</div>
            </div>

            <div className="rounded-[1.35rem] border border-border bg-background px-5 py-5 sm:col-span-2 lg:col-span-1">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-coins/10 text-coins">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div className="type-stat mt-3 text-foreground">{formatQueueTime(queueWaitTime)}</div>
              <div className="type-body-sm mt-1 text-muted-foreground">{inQueue ? 'Queue time' : 'Starts when you join'}</div>
            </div>
          </div>

          {remainingFreeDuels !== null ? (
            <div className="mt-6 rounded-[1.35rem] border border-primary/20 bg-primary/10 px-5 py-4 text-left text-sm leading-6 text-foreground">
              <div className="font-semibold text-primary">Free duel access</div>
              <div className="mt-1">
                {duelLimitReached
                  ? `You used ${freeDuelLimit ?? 0}/${freeDuelLimit ?? 0} duels today.`
                  : `${remainingFreeDuels} of ${freeDuelLimit ?? 0} duels left today.`}
              </div>
            </div>
          ) : null}

          {advancedAnalyticsUnlocked ? null : (
            <div className="type-body-sm mt-4 text-muted-foreground">
              Need deeper duel stats and unlimited access?
              {' '}
              <Link to="/pricing?intent=pro" className="font-semibold text-primary transition hover:text-primary/80">
                Unlock Pro
              </Link>
            </div>
          )}

          <div className="mt-8">
            {inQueue ? (
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-3 text-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-lg font-semibold">Searching for opponent...</span>
                </div>

                <button
                  type="button"
                  onClick={handleLeaveQueue}
                  className="inline-flex items-center justify-center rounded-xl bg-destructive px-8 py-3.5 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90"
                >
                  Cancel search
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleJoinQueue}
                  disabled={isJoining || duelLimitReached}
                  className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                  {isJoining ? 'Starting...' : duelLimitReached ? 'Daily limit reached' : 'Start queue'}
                </button>
                {duelLimitReached ? (
                  <Link
                    to="/pricing?intent=pro"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-card"
                  >
                    Unlock unlimited duels
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
