// src/components/MatchmakingQueue.tsx
import React, { useEffect, useState } from 'react';
import { Swords, Loader2, Trophy, Users, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface MatchmakingQueueProps {
  socket: any;
  userId: string;
  username: string;
  rating: number;
  onMatchFound: (matchData: any) => void;
}

export default function MatchmakingQueue({
  socket,
  userId,
  username,
  rating,
  onMatchFound: onMatchFoundProp
}: MatchmakingQueueProps) {
  const [inQueue, setInQueue] = useState(false);
  const [matchType, setMatchType] = useState<'ranked' | 'casual'>('ranked');
  const [queueTime, setQueueTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [queuePosition, setQueuePosition] = useState(1);
  const [queueSize, setQueueSize] = useState(1);
  const [ratingRange, setRatingRange] = useState(100);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onQueueUpdate = (data: any) => {
      console.log('📡 queue_update', data);
      setQueueTime(data.waitTime ?? 0);
      setQueuePosition(data.queuePosition ?? 1);
      setQueueSize(data.queueSize ?? 1);
      setRatingRange(data.ratingRange ?? 100);
    };

    const onQueueJoined = (data: any) => {
      console.log('✅ queue_joined', data);
      toast.success(data.message || 'Joined queue');
      setInQueue(true);
      setIsJoining(false);
      setQueueTime(0);
    };

    const onQueueLeft = (data: any) => {
      console.log('👋 queue_left', data);
      toast(data.message || 'Left queue');
      setInQueue(false);
      setIsJoining(false);
      setQueueTime(0);
      setQueuePosition(1);
      setQueueSize(1);
      setRatingRange(100);
    };

    const onMatchFoundEvent = (data: any) => {
      console.log('🎯 match_found', data);
      toast.success(`Match found! Opponent: ${data?.opponent?.username ?? 'Unknown'}`);
      setInQueue(false);
      setIsJoining(false);
      setCountdown(data.countdown ?? 3);

      let timeLeft = data.countdown ?? 3;
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);

        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          onMatchFoundProp(data);
        }
      }, 1000);
    };

    const onServerError = (data: any) => {
      console.error('🚨 server_error raw:', data);
      console.error('🚨 server_error message:', data?.message);
      console.error('🚨 server_error details:', data?.details || data?.error);

      toast.error(data?.message || 'Server error');
      setInQueue(false);
      setIsJoining(false);
    };

    socket.on('queue_update', onQueueUpdate);
    socket.on('queue_joined', onQueueJoined);
    socket.on('queue_left', onQueueLeft);
    socket.on('match_found', onMatchFoundEvent);
    socket.on('server_error', onServerError);

    return () => {
      socket.off('queue_update', onQueueUpdate);
      socket.off('queue_joined', onQueueJoined);
      socket.off('queue_left', onQueueLeft);
      socket.off('match_found', onMatchFoundEvent);
      socket.off('server_error', onServerError);
    };
  }, [socket, onMatchFoundProp]);

  const handleJoinQueue = () => {
    console.log('🟩 Find Match clicked', {
      userId,
      username,
      matchType,
      socketConnected: socket?.connected
    });

    if (!socket) return toast.error('Socket not ready');
    if (!socket.connected) return toast.error('Not connected to duel server');
    if (inQueue) return;
    if (isJoining) return;

    setIsJoining(true);

    // Render free can cold-start (30–60s). Use a generous timeout.
    const ACK_TIMEOUT_MS = 20000;

    socket
      .timeout(ACK_TIMEOUT_MS)
      .emit('register_player', { userId, username }, (err: any, res: any) => {
        if (err) {
          console.error('❌ register_player ACK timeout / failed', err);
          toast.error('register_player: no response (server sleeping / wrong URL / handler issue)');
          setIsJoining(false);
          return;
        }

        console.log('🟨 register_player ack:', res);

        if (!res?.ok) {
          toast.error(res?.message || 'Failed to register player');
          setIsJoining(false);
          return;
        }

        console.log('🟧 Emitting join_matchmaking', { matchType });
        socket.emit('join_matchmaking', { matchType });
        // `isJoining` will be cleared by queue_joined / server_error / queue_left
      });
  };

  const handleLeaveQueue = () => {
    console.log('🟥 Leave Queue clicked');
    if (!socket) return;

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
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md w-full">
          <div className="mb-8">
            <Swords className="w-24 h-24 mx-auto text-blue-600 animate-bounce" />
          </div>
          <h2 className="text-4xl font-bold mb-4 text-gray-800">Match Starting!</h2>
          <div className="text-8xl font-bold text-blue-600 mb-4">{countdown}</div>
          <p className="text-gray-600">Prepare yourself...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Code Duels</h1>
          <p className="text-gray-600 mt-2">Ranked 1v1 matchmaking</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 rounded-xl font-semibold ${
              matchType === 'ranked' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setMatchType('ranked')}
            disabled={inQueue || isJoining}
          >
            <Trophy className="inline w-4 h-4 mr-1" />
            Ranked
          </button>

          <button
            type="button"
            className={`flex-1 py-2 rounded-xl font-semibold ${
              matchType === 'casual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            onClick={() => setMatchType('casual')}
            disabled={inQueue || isJoining}
          >
            <Users className="inline w-4 h-4 mr-1" />
            Casual
          </button>
        </div>

        {!inQueue ? (
          <button
            type="button"
            onClick={handleJoinQueue}
            disabled={isJoining}
            className={`w-full py-3 rounded-xl font-bold transition ${
              isJoining ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isJoining ? 'Connecting...' : 'Find Match'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLeaveQueue}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition"
          >
            Leave Queue
          </button>
        )}

        {inQueue && (
          <div className="mt-6 bg-gray-50 p-4 rounded-xl">
            <div className="flex items-center justify-between text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Time: {formatQueueTime(queueTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Position: {queuePosition}/{queueSize} • Rating range: ±{ratingRange}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}