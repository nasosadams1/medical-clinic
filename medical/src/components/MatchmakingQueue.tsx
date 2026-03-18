import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Trophy, Users, Swords } from 'lucide-react';
import toast from 'react-hot-toast';
import MascotIcon from './branding/MascotIcon';
import { trackEvent } from '../lib/analytics';

interface MatchmakingQueueProps {
  socket: any;
  rating: number;
  ensureSocketRegistered: (options?: { silent?: boolean }) => Promise<boolean>;
  onMatchFound: (matchData: any) => void;
  onMatchEnd: (result: any) => void;
}

type MatchType = 'ranked' | 'casual';

const normalizeMatchType = (value: unknown): MatchType => (value === 'casual' ? 'casual' : 'ranked');

const formatQueueTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function MatchmakingQueue({
  socket,
  rating,
  ensureSocketRegistered,
  onMatchFound,
  onMatchEnd,
}: MatchmakingQueueProps) {
  const [selectedMatchType, setSelectedMatchType] = useState<MatchType>('casual');
  const [activeMatchType, setActiveMatchType] = useState<MatchType>('casual');
  const [inQueue, setInQueue] = useState(false);
  const [isMatchStarting, setIsMatchStarting] = useState(false);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [queueWaitTime, setQueueWaitTime] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  const pendingMatchRef = useRef<any>(null);
  const selectedMatchTypeRef = useRef<MatchType>('casual');

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
  }, [onMatchEnd, onMatchFound, socket]);

  const handleJoinQueue = async () => {
    if (!socket) return toast.error('Socket not ready');
    if (!socket.connected) return toast.error('Not connected to duel server');
    if (inQueue || isJoining) return;
    const matchType = selectedMatchTypeRef.current;

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

  if (isMatchStarting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 px-4 py-6 sm:px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-10 lg:p-12">
          <div className="mb-8">
            <div className="mx-auto h-16 w-16 animate-bounce sm:h-20 sm:w-20 lg:h-24 lg:w-24"><MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" /></div>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-800 sm:text-4xl">Match Starting!</h2>
          <p className="text-gray-600">Prepare yourself...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 px-4 py-6 sm:px-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8 lg:p-12">
        <div className="text-center">
          <div className="mb-6">
            <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20"><MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" /></div>
          </div>

          <h2 className="mb-3 text-3xl font-bold text-gray-800 sm:text-4xl">Duels as Skill Proof</h2>
          <p className="mb-6 text-gray-600">
            {isRankedMode
              ? 'Compete in a live judged match where performance contributes to your rating signal'
              : 'Use a casual 1v1 match to practice under pressure without rating changes'}
          </p>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedMatchType('casual')}
              disabled={inQueue || isJoining}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                selectedMatchType === 'casual'
                  ? 'border-slate-700 bg-slate-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="text-base font-semibold text-gray-900">Casual</div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMatchType('ranked')}
              disabled={inQueue || isJoining}
              className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                selectedMatchType === 'ranked'
                  ? 'border-blue-600 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="text-base font-semibold text-gray-900">Ranked</div>
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isRankedMode ? (
              <div className="rounded-lg bg-blue-50 p-6">
                <Trophy className="mx-auto mb-2 h-8 w-8 text-blue-600" />
                <div className="text-2xl font-bold text-blue-600">{rating}</div>
                <div className="text-sm text-gray-600">Your skill signal</div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-6">
                <Swords className="mx-auto mb-2 h-8 w-8 text-slate-700" />
                <div className="text-2xl font-bold text-slate-700">Casual 1v1</div>
                <div className="text-sm text-gray-600">Head-to-head practice under real duel conditions</div>
              </div>
            )}

            <div className="rounded-lg bg-green-50 p-6">
              <Users className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{playersOnline}</div>
              <div className="text-sm text-gray-600">Players available</div>
            </div>
          </div>


          {inQueue ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-xl font-semibold text-gray-700">Searching for opponent...</span>
              </div>

              <div className="mx-auto flex w-fit min-w-[180px] flex-col items-center rounded-2xl bg-blue-50 px-8 py-5 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Queue Time</div>
                <div className="mt-2 text-3xl font-bold tracking-tight text-blue-700">{formatQueueTime(queueWaitTime)}</div>
              </div>

              <button
                onClick={handleLeaveQueue}
                className="rounded-lg bg-red-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-700"
              >
                Cancel Search
              </button>
            </div>
          ) : (
            <button
              onClick={handleJoinQueue}
              disabled={isJoining}
              className="rounded-lg bg-blue-600 px-12 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isJoining ? 'Starting...' : 'Start Queue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



