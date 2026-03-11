import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Trophy, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import MascotIcon from './branding/MascotIcon';

interface MatchmakingQueueProps {
  socket: any;
  userId: string;
  username: string;
  rating: number;
  onMatchFound: (matchData: any) => void;
  onMatchEnd: (result: any) => void;
}

const DEVICE_CLUSTER_STORAGE_KEY = 'codhak-device-cluster-id';

const getOrCreateDeviceClusterId = () => {
  if (typeof window === 'undefined') return null;

  try {
    const existing = window.localStorage.getItem(DEVICE_CLUSTER_STORAGE_KEY);
    if (existing) return existing;

    const nextId = typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(DEVICE_CLUSTER_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return null;
  }
};

const buildClientMeta = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {};
  }

  return {
    deviceClusterId: getOrCreateDeviceClusterId(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform || 'unknown',
    language: navigator.language || 'unknown',
    origin: window.location.origin,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    screen: {
      width: window.screen?.width || null,
      height: window.screen?.height || null,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
};

export default function MatchmakingQueue({
  socket,
  userId,
  username,
  rating,
  onMatchFound,
  onMatchEnd,
}: MatchmakingQueueProps) {
  const [inQueue, setInQueue] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [queueSize, setQueueSize] = useState(1);
  const [isJoining, setIsJoining] = useState(false);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMatchRef = useRef<any>(null);
  const pendingMatchEndRef = useRef<any>(null);
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
      pendingMatchEndRef.current = null;
      setCountdown(null);
    };

    const onQueueUpdate = (data: any) => {
      setQueueSize(data.queueSize ?? 1);
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
    };

    const onQueueLeft = (data: any) => {
      toast(data.message || 'Left queue');
      resetPendingState();
      setInQueue(false);
      setIsJoining(false);
    };

    const onMatchFoundEvent = (data: any) => {
      toast.success(`Match found! Opponent: ${data?.opponent?.username ?? 'Unknown'}`);
      pendingMatchRef.current = data;
      pendingMatchEndRef.current = null;
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
          if (pendingMatchEndRef.current) {
            const pendingResult = pendingMatchEndRef.current;
            resetPendingState();
            setInQueue(false);
            setIsJoining(false);
            onMatchEnd(pendingResult);
          }
        }
      }, 1000);
    };

    const onDuelStartedEvent = (data: any) => {
      if (pendingMatchRef.current?.matchId !== data?.matchId) return;
      if (pendingMatchEndRef.current) return;

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

      if (countdownIntervalRef.current && data?.reason === 'disconnect_before_start') {
        pendingMatchEndRef.current = data;
        toast('Opponent disconnected before the duel started.', { icon: '\u26A0' });
        return;
      }

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
      socket.emit('join_matchmaking', { matchType: 'ranked' });
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
    const clientMeta = buildClientMeta();

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('register_player', { userId, username, accessToken, clientMeta }, (err: any, res: any) => {
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
        socket.emit('join_matchmaking', { matchType: 'ranked' });
      });
  };

  const handleLeaveQueue = () => {
    if (!socket) return;

    pendingMatchRef.current = null;
    pendingMatchEndRef.current = null;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    socket.emit('leave_matchmaking');
    setInQueue(false);
    setIsJoining(false);
  };


  if (countdown !== null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 px-4 py-6 sm:px-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-10 lg:p-12">
          <div className="mb-8">
            <div className="mx-auto h-16 w-16 animate-bounce sm:h-20 sm:w-20 lg:h-24 lg:w-24"><MascotIcon mascot="duel" className="h-full w-full" imageClassName="drop-shadow-md" /></div>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-800 sm:text-4xl">Match Starting!</h2>
          <div className="mb-4 text-6xl font-bold text-blue-600 sm:text-7xl lg:text-8xl">{countdown}</div>
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

          <h2 className="mb-3 text-3xl font-bold text-gray-800 sm:text-4xl">Code Duels</h2>
          <p className="mb-8 text-gray-600">Compete against another player in a real-time coding battle</p>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-6">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{rating}</div>
              <div className="text-sm text-gray-600">Your Rating</div>
            </div>

            <div className="rounded-lg bg-green-50 p-6">
              <Users className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{queueSize}</div>
              <div className="text-sm text-gray-600">Players Online</div>
            </div>
          </div>


          {inQueue ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-xl font-semibold text-gray-700">Searching for opponent...</span>
              </div>

              <p className="text-gray-600">You&apos;re in queue. A duel will begin automatically when a match is found.</p>

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



