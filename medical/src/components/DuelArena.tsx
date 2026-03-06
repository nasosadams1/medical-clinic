import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Clock, Trophy, Target, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface DuelArenaProps {
  matchId: string;
  problem: {
    id: string;
    title: string;
    statement: string;
    difficulty: string;
    timeLimit: number;
    supportedLanguages: string[];
  };
  opponent: {
    username: string;
    rating: number;
  };
  socket: any;
  userId: string;
  onMatchEnd: (result: any) => void;
}

export default function DuelArena({
  matchId,
  problem,
  opponent,
  socket,
  userId,
  onMatchEnd
}: DuelArenaProps) {
  const [code, setCode] = useState('// Write your solution here\nfunction solution(input) {\n  \n}');
  const [language] = useState('javascript');
  const [timeRemaining, setTimeRemaining] = useState(problem.timeLimit);
  const uiLanguages = ['javascript'];
  const [testResults, setTestResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState<any>(null);
  const [matchStarted, setMatchStarted] = useState(false);
  const snapshotIntervalRef = useRef<any>(null);

  useEffect(() => {
    const onDuelStarted = (data: any) => {
      if (data.matchId === matchId) {
        setMatchStarted(true);
        toast.success('Duel started! Good luck!');
      }
    };

    const onSubmissionResult = (data: any) => {
      setTestResults(data);
      setIsSubmitting(false);

      const verdict = (data?.result ?? data?.verdict ?? '').toString();
      const isAccepted = verdict.toLowerCase() === 'accepted';
      const passed = Number.isFinite(data?.passed) ? data.passed : 0;
      const total = Number.isFinite(data?.total) ? data.total : 0;

      if (isAccepted) {
        toast.success(`All tests passed! (${passed}/${total})`);
      } else {
        toast.error(`${verdict.replace(/_/g, ' ')} - ${passed}/${total} tests passed`);
      }
    };

    const onOpponentSubmitted = (data: any) => {
      setOpponentStatus(data);

      const verdict = (data?.result ?? data?.verdict ?? '').toString();
      const isAccepted = verdict.toLowerCase() === 'accepted';
      const passed = Number.isFinite(data?.passed) ? data.passed : 0;
      const total = Number.isFinite(data?.total) ? data.total : 0;

      if (isAccepted) {
        toast.error('Opponent passed all tests.');
      } else {
        toast(`Opponent submitted: ${passed}/${total} tests passed`, {
          icon: '\u2694',
        });
      }
    };

    const onMatchEndEvent = (data: any) => {
      clearInterval(snapshotIntervalRef.current);
      onMatchEnd(data);
    };

    const onSubmissionError = (data: any) => {
      toast.error(data.message);
      setIsSubmitting(false);
    };

    socket.on('duel_started', onDuelStarted);
    socket.on('submission_result', onSubmissionResult);
    socket.on('opponent_submitted', onOpponentSubmitted);
    socket.on('match_end', onMatchEndEvent);
    socket.on('submission_error', onSubmissionError);

    return () => {
      socket.off('duel_started', onDuelStarted);
      socket.off('submission_result', onSubmissionResult);
      socket.off('opponent_submitted', onOpponentSubmitted);
      socket.off('match_end', onMatchEndEvent);
      socket.off('submission_error', onSubmissionError);
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
    };
  }, [matchId, socket, onMatchEnd]);

  useEffect(() => {
    if (!matchStarted) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    snapshotIntervalRef.current = setInterval(() => {
      socket.emit('code_snapshot', {
        matchId,
        userId,
        code
      });
    }, 30000);

    return () => {
      clearInterval(timer);
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
    };
  }, [matchStarted, matchId, userId, code, socket]);

  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error('Please write some code first.');
      return;
    }

    setIsSubmitting(true);
    socket.emit('submit_code', {
      matchId,
      language,
      code
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white sm:p-5 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                <Trophy className="h-6 w-6" />
                <div>
                  <h2 className="text-lg font-bold leading-tight sm:text-xl lg:text-2xl">{problem.title}</h2>
                  <span className={`mt-1 inline-block rounded px-2 py-1 text-xs font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                    {problem.difficulty.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:justify-end">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
                  <Target className="h-5 w-5" />
                  <div className="text-sm">
                    <div className="font-semibold">vs {opponent.username}</div>
                    <div className="text-xs text-blue-200">Rating: {opponent.rating}</div>
                  </div>
                </div>

                <div className={`flex items-center gap-2 self-start rounded-xl px-3 py-2 sm:px-4 ${timeRemaining < 60 ? 'bg-red-500' : 'bg-blue-800'}`}>
                  <Clock className="h-5 w-5" />
                  <span className="text-xl font-mono font-bold">{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-2 lg:gap-6 lg:p-6">
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-4">
                <h3 className="mb-2 text-lg font-semibold">Problem Statement</h3>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700">{problem.statement}</p>
                </div>
              </div>

              {testResults && (
                <div className="rounded-xl bg-gray-50 p-4">
                  <h3 className="mb-3 text-lg font-semibold">Test Results</h3>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">Status:</span>
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${(testResults?.result ?? '').toString().toLowerCase() === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {(testResults?.result ?? testResults?.verdict ?? 'UNKNOWN').toString().replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">Tests Passed:</span>
                      <span className="text-sm">{testResults?.passed ?? 0}/{testResults?.total ?? 0}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">Score:</span>
                      <span className="text-sm font-bold">{Number(testResults?.score ?? 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium">Runtime:</span>
                      <span className="text-sm">{testResults?.runtimeMs ?? 0}ms</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {testResults.testResults?.map((test: any, idx: number) => (
                      <div
                        key={idx}
                        className={`rounded border p-2 text-xs ${test.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Test {test.testNumber}:</span>
                          <span className={test.passed ? 'text-green-600' : 'text-red-600'}>
                            {test.passed ? '\u2713 Passed' : '\u2717 Failed'}
                          </span>
                        </div>
                        {test.error && <div className="mt-1 text-red-600">Error: {test.error}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {opponentStatus && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold">Opponent Status</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Tests Passed: {opponentStatus.passed}/{opponentStatus.total}</div>
                    <div>Score: {opponentStatus.score.toFixed(1)}%</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select
                  value={language}
                  disabled
                  title="Only JavaScript is currently supported"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {uiLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || timeRemaining === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:px-6"
                >
                  <Play className="h-4 w-4" />
                  {isSubmitting ? 'Running...' : 'Submit Solution'}
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-300" style={{ minHeight: '360px', height: 'min(65vh, 600px)' }}>
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(value: string | undefined) => setCode(value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
