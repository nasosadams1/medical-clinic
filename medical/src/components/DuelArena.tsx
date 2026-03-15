import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    starterCode?: Record<string, string> | string | null;
  };
  opponent: {
    username: string;
    rating: number;
  };
  matchType?: 'ranked' | 'casual';
  socket: any;
  userId: string;
  startTime?: number | null;
  endTime?: number | null;
  serverNow?: number | null;
  onMatchEnd: (result: any) => void;
}

interface EditorTelemetryState {
  pasteEvents: number;
  largePasteEvents: number;
  pasteChars: number;
  majorEdits: number;
  focusLosses: number;
}

const createEmptyTelemetry = (): EditorTelemetryState => ({
  pasteEvents: 0,
  largePasteEvents: 0,
  pasteChars: 0,
  majorEdits: 0,
  focusLosses: 0,
});

type DuelLanguage = 'javascript' | 'python';

const DEFAULT_STARTER_CODE: Record<DuelLanguage, string> = {
  javascript: '// Write your solution here\nfunction solution(input) {\n  \n}\n',
  python: 'def solution(input):\n    # Write your solution here\n    return None\n',
};

const normalizeDuelLanguage = (value: unknown): DuelLanguage | null => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'javascript' || normalized === 'js') return 'javascript';
  if (normalized === 'python' || normalized === 'py') return 'python';
  return null;
};

const getSupportedLanguages = (value: unknown): DuelLanguage[] => {
  const normalized = Array.isArray(value)
    ? [...new Set(value.map(normalizeDuelLanguage).filter(Boolean))]
    : [];

  return normalized.length ? normalized : ['javascript', 'python'];
};

const getStarterCodeMap = (value: unknown): Record<DuelLanguage, string> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const provided = value as Record<string, unknown>;
    return {
      javascript: typeof provided.javascript === 'string' ? provided.javascript : DEFAULT_STARTER_CODE.javascript,
      python: typeof provided.python === 'string' ? provided.python : DEFAULT_STARTER_CODE.python,
    };
  }

  if (typeof value === 'string' && value.trim()) {
    return {
      javascript: value,
      python: DEFAULT_STARTER_CODE.python,
    };
  }

  return { ...DEFAULT_STARTER_CODE };
};

const formatLanguageLabel = (language: DuelLanguage) => (
  language === 'python' ? 'Python' : 'JavaScript'
);

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveClockOffsetMs = (serverNow: unknown): number | null => {
  const parsedServerNow = toFiniteNumber(serverNow);
  if (parsedServerNow === null) return null;
  return parsedServerNow - Date.now();
};

const resolveMatchDeadlineMs = ({
  startTime,
  endTime,
  timeLimitSeconds,
}: {
  startTime?: unknown;
  endTime?: unknown;
  timeLimitSeconds?: unknown;
}): number | null => {
  const parsedEndTime = toFiniteNumber(endTime);
  if (parsedEndTime !== null) return parsedEndTime;

  const parsedStartTime = toFiniteNumber(startTime);
  const parsedTimeLimitSeconds = toFiniteNumber(timeLimitSeconds);
  if (parsedStartTime === null || parsedTimeLimitSeconds === null) return null;

  return parsedStartTime + Math.max(0, parsedTimeLimitSeconds) * 1000;
};

const computeRemainingSeconds = (deadlineMs: number | null, clockOffsetMs: number, fallbackSeconds: number) => {
  if (deadlineMs === null) {
    return Math.max(0, Math.floor(fallbackSeconds));
  }

  const adjustedNow = Date.now() + clockOffsetMs;
  return Math.max(0, Math.ceil((deadlineMs - adjustedNow) / 1000));
};

export default function DuelArena({
  matchId,
  problem,
  opponent,
  matchType = 'ranked',
  socket,
  userId,
  startTime = null,
  endTime = null,
  serverNow = null,
  onMatchEnd,
}: DuelArenaProps) {
  const supportedLanguages = React.useMemo(() => getSupportedLanguages(problem.supportedLanguages), [problem.supportedLanguages]);
  const starterCodeByLanguage = React.useMemo(() => getStarterCodeMap(problem.starterCode), [problem.starterCode]);
  const initialClockOffsetMs = React.useMemo(() => resolveClockOffsetMs(serverNow) ?? 0, [serverNow]);
  const initialDeadlineMs = React.useMemo(
    () => resolveMatchDeadlineMs({ startTime, endTime, timeLimitSeconds: problem.timeLimit }),
    [endTime, problem.timeLimit, startTime]
  );
  const [language, setLanguage] = useState<DuelLanguage>(supportedLanguages[0] ?? 'javascript');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<DuelLanguage, string>>(() => ({
    javascript: starterCodeByLanguage.javascript,
    python: starterCodeByLanguage.python,
  }));
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(initialClockOffsetMs);
  const [matchDeadlineMs, setMatchDeadlineMs] = useState<number | null>(initialDeadlineMs);
  const [timeRemaining, setTimeRemaining] = useState(() => computeRemainingSeconds(initialDeadlineMs, initialClockOffsetMs, problem.timeLimit));
  const [testResults, setTestResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opponentStatus, setOpponentStatus] = useState<any>(null);
  const [matchStarted, setMatchStarted] = useState(initialDeadlineMs !== null);
  const code = codeByLanguage[language] ?? starterCodeByLanguage[language];

  const codeRef = useRef(code);
  const editorRef = useRef<any>(null);
  const snapshotIntervalRef = useRef<any>(null);
  const telemetryIntervalRef = useRef<any>(null);
  const telemetryRef = useRef<EditorTelemetryState>(createEmptyTelemetry());

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    const nextClockOffsetMs = resolveClockOffsetMs(serverNow);
    const resolvedClockOffsetMs = nextClockOffsetMs ?? serverClockOffsetMs;
    if (nextClockOffsetMs !== null) {
      setServerClockOffsetMs(nextClockOffsetMs);
    }

    const nextDeadlineMs = resolveMatchDeadlineMs({
      startTime,
      endTime,
      timeLimitSeconds: problem.timeLimit,
    });

    setMatchDeadlineMs(nextDeadlineMs);
    setTimeRemaining(computeRemainingSeconds(nextDeadlineMs, resolvedClockOffsetMs, problem.timeLimit));
    setMatchStarted(nextDeadlineMs !== null);
  }, [endTime, problem.timeLimit, serverClockOffsetMs, serverNow, startTime]);

  useEffect(() => {
    if (!supportedLanguages.includes(language)) {
      setLanguage(supportedLanguages[0] ?? 'javascript');
    }
  }, [language, supportedLanguages]);

  const flushTelemetry = useCallback((reason: 'interval' | 'submit' | 'cleanup' | 'blur') => {
    const snapshot = telemetryRef.current;
    const hasTelemetry = Object.values(snapshot).some((value) => value > 0);
    if (!matchStarted || (!hasTelemetry && reason === 'interval')) {
      return;
    }

    socket.emit('editor_telemetry', {
      matchId,
      telemetry: {
        ...snapshot,
        reason,
        clientTimestamp: Date.now(),
        language,
      },
    });

    telemetryRef.current = createEmptyTelemetry();
  }, [language, matchId, matchStarted, socket]);

  useEffect(() => {
    const onDuelStarted = (data: any) => {
      if (data.matchId === matchId) {
        const nextClockOffsetMs = resolveClockOffsetMs(data?.serverNow);
        if (nextClockOffsetMs !== null) {
          setServerClockOffsetMs(nextClockOffsetMs);
        }

        const nextDeadlineMs = resolveMatchDeadlineMs({
          startTime: data?.startTime,
          endTime: data?.endTime,
          timeLimitSeconds: data?.timeLimit ?? problem.timeLimit,
        });

        setMatchDeadlineMs(nextDeadlineMs);
        setTimeRemaining(
          computeRemainingSeconds(
            nextDeadlineMs,
            nextClockOffsetMs ?? serverClockOffsetMs,
            data?.timeLimit ?? problem.timeLimit
          )
        );
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

      if (isAccepted) {
        toast.error('Opponent passed all tests.');
      } else {
        toast('Opponent submitted again.', {
          icon: '\u2694',
        });
      }
    };

    const onMatchEndEvent = (data: any) => {
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      flushTelemetry('cleanup');
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
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      flushTelemetry('cleanup');
    };
  }, [flushTelemetry, matchId, onMatchEnd, problem.timeLimit, serverClockOffsetMs, socket]);

  useEffect(() => {
    if (!matchStarted) return;

    const syncTimeRemaining = () => {
      if (matchDeadlineMs !== null) {
        setTimeRemaining(computeRemainingSeconds(matchDeadlineMs, serverClockOffsetMs, problem.timeLimit));
        return;
      }

      setTimeRemaining((prev) => Math.max(prev - 1, 0));
    };

    syncTimeRemaining();
    const timer = setInterval(syncTimeRemaining, 1000);

    snapshotIntervalRef.current = setInterval(() => {
      socket.emit('code_snapshot', {
        matchId,
        userId,
        code: codeRef.current,
      });
    }, 30000);

    telemetryIntervalRef.current = setInterval(() => {
      flushTelemetry('interval');
    }, 15000);

    const onWindowBlur = () => {
      telemetryRef.current.focusLosses += 1;
      flushTelemetry('blur');
    };

    window.addEventListener('blur', onWindowBlur);

    return () => {
      clearInterval(timer);
      if (snapshotIntervalRef.current) clearInterval(snapshotIntervalRef.current);
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      window.removeEventListener('blur', onWindowBlur);
      flushTelemetry('cleanup');
    };
  }, [flushTelemetry, matchDeadlineMs, matchId, matchStarted, problem.timeLimit, serverClockOffsetMs, socket, userId]);

  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;

    editor.onDidPaste((event: any) => {
      const pastedText = editor.getModel()?.getValueInRange(event.range) ?? '';
      telemetryRef.current.pasteEvents += 1;
      telemetryRef.current.pasteChars += pastedText.length;

      if (pastedText.length >= 120 || (event.range.endLineNumber - event.range.startLineNumber) >= 3) {
        telemetryRef.current.largePasteEvents += 1;
      }
    });

    editor.onDidChangeModelContent((event: any) => {
      const changeMagnitude = (event.changes || []).reduce((total: number, change: any) => {
        return total + Math.abs((change.text?.length ?? 0) - (change.rangeLength ?? 0));
      }, 0);

      if ((event.changes || []).length >= 3 || changeMagnitude >= 80) {
        telemetryRef.current.majorEdits += 1;
      }
    });
  }, []);

  const handleSubmit = () => {
    if (!code.trim()) {
      toast.error('Please write some code first.');
      return;
    }

    flushTelemetry('submit');
    setIsSubmitting(true);
    socket.emit('submit_code', {
      matchId,
      language,
      code,
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

  const isRankedMatch = matchType === 'ranked';

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
                    <div className="text-xs text-blue-200">
                      {isRankedMatch ? `Rating: ${opponent.rating}` : 'Casual 1v1'}
                    </div>
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
                    <div>Attempts: {opponentStatus.attempts ?? 1}</div>
                    <div>
                      Latest result:{' '}
                      {(opponentStatus?.accepted
                        ? 'Accepted'
                        : (opponentStatus?.verdict ?? 'Submitted')).toString().replace(/_/g, ' ')}
                    </div>
                    {!opponentStatus?.accepted && Number.isFinite(opponentStatus?.wrongSubmissions) && (
                      <div>Wrong submissions: {opponentStatus.wrongSubmissions}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select
                  value={language}
                  onChange={(event) => setLanguage(normalizeDuelLanguage(event.target.value) ?? 'javascript')}
                  title="Choose the language for this duel submission"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {supportedLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {formatLanguageLabel(lang)}
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
                  onMount={handleEditorMount}
                  onChange={(value: string | undefined) => {
                    setCodeByLanguage((previous) => ({
                      ...previous,
                      [language]: value || '',
                    }));
                  }}
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
