import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, ArrowRight, Clock } from 'lucide-react';

interface MatchResultsProps {
  matchData: any;
  userId: string;
  onClose: () => void;
  onViewReplay?: () => void;
}

export default function MatchResults({ matchData, userId, onClose, onViewReplay }: MatchResultsProps) {
  const isWinner = matchData.winnerId === userId;
  const isDraw = !matchData.winnerId;
  const isRankedMatch = (matchData.matchType ?? 'ranked') === 'ranked';
  const playerData = matchData.playerA.userId === userId ? matchData.playerA : matchData.playerB;
  const opponentData = matchData.playerA.userId === userId ? matchData.playerB : matchData.playerA;

  const getRatingChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  const getRatingChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const difficultyLabel = (matchData.difficulty ?? 'medium')
    .toString()
    .replace(/\b\w/g, (l: string) => l.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`${isWinner ? 'bg-gradient-to-r from-green-600 to-green-700' : isDraw ? 'bg-gradient-to-r from-gray-600 to-gray-700' : 'bg-gradient-to-r from-red-600 to-red-700'} p-6 text-white sm:p-8`}>
          <div className="text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 sm:h-20 sm:w-20" />
            <h2 className="mb-2 text-3xl font-bold sm:text-4xl">
              {isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
            </h2>
            <p className="text-base opacity-90 sm:text-lg">
              {isWinner ? 'Well played! You won the duel.' : isDraw ? 'The duel ended level.' : 'Better luck next time.'}
            </p>
          </div>
        </div>

        <div className="max-h-[calc(92vh-180px)] overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Match Summary</h3>
            <div className="space-y-3 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Difficulty:</span>
                <span className="font-semibold text-gray-800">{difficultyLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Duration:</span>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold">{Math.floor(matchData.duration / 60)}:{(matchData.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-600">Result:</span>
                <span className="text-right font-semibold text-gray-800">
                  {matchData.reason.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              </div>
            </div>
          </div>

          {isRankedMatch && (
            <div className="mb-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Rating Changes</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={`${isWinner ? 'border-green-500 bg-green-50' : isDraw ? 'border-gray-300 bg-gray-50' : 'border-red-500 bg-red-50'} rounded-lg border-2 p-4`}>
                  <div className="mb-1 text-sm text-gray-600">You</div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-bold text-gray-800">{playerData.ratingBefore}</span>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <span className="text-2xl font-bold text-gray-800">{playerData.ratingAfter}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRatingChangeIcon(playerData.ratingChange)}
                    <span className={`font-semibold ${getRatingChangeColor(playerData.ratingChange)}`}>
                      {playerData.ratingChange > 0 ? '+' : ''}{playerData.ratingChange}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  <div className="mb-1 text-sm text-gray-600">Opponent</div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-2xl font-bold text-gray-800">{opponentData.ratingBefore}</span>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                    <span className="text-2xl font-bold text-gray-800">{opponentData.ratingAfter}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRatingChangeIcon(opponentData.ratingChange)}
                    <span className={`font-semibold ${getRatingChangeColor(opponentData.ratingChange)}`}>
                      {opponentData.ratingChange > 0 ? '+' : ''}{opponentData.ratingChange}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">Performance</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="mb-2 text-sm text-gray-600">Your Duel Score</div>
                <div className="text-3xl font-bold text-blue-600">{Number(playerData.matchScore ?? playerData.submission?.matchScore ?? 0).toFixed(1)}</div>
                <div className="mt-1 text-sm text-gray-600">{playerData.submission?.passed || 0}/{playerData.submission?.total || 0} tests passed</div>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <div className="mb-2 text-sm text-gray-600">Opponent Duel Score</div>
                <div className="text-3xl font-bold text-gray-600">{Number(opponentData.matchScore ?? opponentData.submission?.matchScore ?? 0).toFixed(1)}</div>
                <div className="mt-1 text-sm text-gray-600">{opponentData.submission?.passed || 0}/{opponentData.submission?.total || 0} tests passed</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {onViewReplay && (
              <button
                onClick={onViewReplay}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                View Replay
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
