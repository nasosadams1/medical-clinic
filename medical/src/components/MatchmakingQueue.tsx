import React, { useEffect, useRef, useState } from 'react';
import { Swords, Loader2, Trophy, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface MatchmakingQueueProps {
  socket: any;
  userId: string;
  username: string;
  rating: number;
  onMatchFound: (matchData: any) => void;
  onMatchEnd: (result: any) => void;
}

export default function MatchmakingQueue({
  socket,
  userId,
  username,
  rating,
  onMatchFound,
  onMatchEnd,
}: MatchmakingQueueProps) {
  const [inQueue, setInQueue] = useState(false);
  const [matchType, setMatchType] = useState<'ranked' | 'casual'>('ranked');
  const [queueTime, setQueueTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [queuePosition, setQueuePosition] = useState(1);
  const [queueSize, setQueueSize] = useState(1);
  const [ratingRange, setRatingRange] = useState(100);
  const [isJoining, setIsJoining] = useState(false);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMatchRef = useRef<any>(null);
  const registeredSocketKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const clearCountdown = () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };

    const resetPendingState = () => {
      clearCountdown();
      pendingMatchRef.current = null;
      setCountdown(null);
    };

    const onQueueUpdate = (data: any) => {
      setQueueTime(data.waitTime ?? 0);
      setQueuePosition(data.queuePosition ?? 1);
      setQueueSize(data.queueSize ?? 1);
      setRatingRange(data.ratingRange ?? 100);
    };

    const onDisconnectEvent = () => {
      registeredSocketKeyRef.current = null;
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
    };

    const onQueueJoined = (data: any) => {
      toast.success(data.message || 'Joined queue');
      setInQueue(true);
      setIsJoining(false);
      setQueueTime(0);
    };

    const onQueueLeft = (data: any) => {
      toast(data.message || 'Left queue');
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
      setQueueTime(0);
      setQueuePosition(1);
      setQueueSize(1);
      setRatingRange(100);
    };

    const onMatchFoundEvent = (data: any) => {
      toast.success(`Match found! Opponent: ${data?.opponent?.username ?? 'Unknown'}`);
      pendingMatchRef.current = data;
      setInQueue(false);
      setIsJoining(false);
      setCountdown(data.countdown ?? 3);

      clearCountdown();
      let timeLeft = data.countdown ?? 3;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(Math.max(timeLeft, 0));
        if (timeLeft <= 0) {
          clearCountdown();
        }
      }, 1000);
    };

    const onDuelStartedEvent = (data: any) => {
      if (pendingMatchRef.current?.matchId !== data?.matchId) return;

      const merged = {
        ...pendingMatchRef.current,
        ...data,
        opponent: pendingMatchRef.current?.opponent,
      };

      resetPendingState();
      onMatchFound(merged);
    };

    const onMatchEndEvent = (data: any) => {
      if (pendingMatchRef.current?.matchId !== data?.matchId) return;
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
      onMatchEnd(data);
    };

    const onServerError = (data: any) => {
      console.error('server_error:', data?.message, data?.details || data?.error);
      if (data?.message === 'Player not registered' || data?.message === 'Stale duel connection') {
        registeredSocketKeyRef.current = null;
      }
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
      clearCountdown();
      socket.off('queue_update', onQueueUpdate);
      socket.off('disconnect', onDisconnectEvent);
      socket.off('queue_joined', onQueueJoined);
      socket.off('queue_left', onQueueLeft);
      socket.off('match_found', onMatchFoundEvent);
      socket.off('duel_started', onDuelStartedEvent);
      socket.off('match_end', onMatchEndEvent);
      socket.off('server_error', onServerError);
    };
  }, [socket, onMatchFound, onMatchEnd]);

  const handleJoinQueue = async () => {
    if (!socket) return toast.error('Socket not ready');
    if (!socket.connected) return toast.error('Not connected to duel server');
    if (inQueue || isJoining) return;

    const registrationKey = `${socket.id}:${userId}`;
    if (registeredSocketKeyRef.current === registrationKey) {
      setIsJoining(true);
      socket.emit('join_matchmaking', { matchType });
      return;
    }

    setIsJoining(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      toast.error('Your session expired. Please sign in again.');
      setIsJoining(false);
      return;
    }

    const ACK_TIMEOUT_MS = 20000;

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('register_player', { userId, username, accessToken }, (err: any, res: any) => {
        if (err) {
          console.error('register_player failed', err);
          toast.error('No response from the duel server. Try again in a moment.');
          setIsJoining(false);
          return;
        }

        if (!res?.ok) {
          toast.error(res?.message || 'Failed to register player');
          setIsJoining(false);
          return;
        }

        registeredSocketKeyRef.current = registrationKey;
        socket.emit('join_matchmaking', { matchType });
      });
  };

  const handleLeaveQueue = () => {
    if (!socket) return;

    pendingMatchRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    socket.emit('leave_matchmaking');
    setQueueTime(0);
    setQueuePosition(1);
    setQueueSize(1);
    setRatingRange(100);
    setInQueue(false);
    setIsJoining(false);
  };

  const formatQueueTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (countdown !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 px-4 py-6 sm:px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-10 lg:p-12">
          <div className="mb-8">
            <Swords className="mx-auto h-16 w-16 animate-bounce text-blue-600 sm:h-20 sm:w-20 lg:h-24 lg:w-24" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-800 sm:text-4xl">Match Starting!</h2>
          <div className="mb-4 text-6xl font-bold text-blue-600 sm:text-7xl lg:text-8xl">{countdown}</div>
          <p className="text-gray-600">Prepare yourself...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-6 sm:px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6 lg:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Code Duels</h1>
          <p className="mt-2 text-gray-600">Ranked 1v1 matchmaking</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold sm:text-base ${matchType === 'ranked' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setMatchType('ranked')}
            disabled={inQueue || isJoining}
          >
            <Trophy className="mr-1 inline h-4 w-4" />
            Ranked
          </button>

          <button
            type="button"
            className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold sm:text-base ${matchType === 'casual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setMatchType('casual')}
            disabled={inQueue || isJoining}
          >
            <Users className="mr-1 inline h-4 w-4" />
            Casual
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span>Your rating</span>
            <span className="font-semibold text-slate-900">{rating}</span>
          </div>
        </div>

        {!inQueue ? (
          <button
            type="button"
            onClick={handleJoinQueue}
            disabled={isJoining}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition sm:text-base ${isJoining ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isJoining ? 'Connecting...' : 'Find Match'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLeaveQueue}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 sm:text-base"
          >
            Leave Queue
          </button>
        )}

        {inQueue && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="flex flex-col gap-3 text-gray-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time: {formatQueueTime(queueTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
              <div>Position: {queuePosition}/{queueSize}</div>
              <div>Rating range: +/-{ratingRange}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
