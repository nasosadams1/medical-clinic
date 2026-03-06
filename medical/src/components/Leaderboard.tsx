import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Medal,
  Flame,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Target,
  TrendingUp,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useAuth } from "../context/AuthContext";
import {
  supabase,
  getLeaderboardData,
  getUserRank,
  subscribeToLeaderboardUpdates,
  LeaderboardPeriod,
  LeaderboardSort,
} from "../lib/supabase";
import { getEloRankInfo } from "../lib/eloRanks";

type RankingCategory = LeaderboardSort;

type Player = {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  xp: number;
  lessons: number;
  streak: number;
  rankedElo: number;
  title?: string;
  globalRank?: number;
  lessonsRank?: number;
  eloRank?: number;
  totalCount?: number;
};

type LeaderboardData = {
  players: Player[];
  totalPlayers: number;
  yourRank: number;
  yourLessonsRank: number;
  yourEloRank: number;
  yourStats: Player | null;
};

const getAvatarEmoji = (avatarId: string): string => {
  const avatarMap: Record<string, string> = {
    default: "\u{1F464}",
    coder: "\u{1F468}\u200D\u{1F4BB}",
    scientist: "\u{1F469}\u200D\u{1F52C}",
    wizard: "\u{1F9D9}",
    ninja: "\u{1F977}",
    robot: "\u{1F916}",
    alien: "\u{1F47D}",
    superhero: "\u{1F9B8}",
    dragon: "\u{1F409}",
    crown: "\u{1F451}",
    master: "\u{1F3C6}",
  };

  return avatarMap[avatarId] || avatarMap.default;
};

const medalForRank = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-semibold text-gray-500">#{rank}</span>;
};

const getPeriodLabel = (period: LeaderboardPeriod) =>
  period === "all" ? "All Time" : period === "month" ? "This Month" : "This Week";

const Tab: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
      active
        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
        : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
    }`}
  >
    {children}
  </button>
);

const StatPill: React.FC<{
  label: string;
  value: number;
  tone: "green" | "blue" | "orange" | "purple" | "yellow";
}> = ({ label, value, tone }) => {
  const dotClass =
    tone === "green"
      ? "bg-green-500"
      : tone === "blue"
      ? "bg-blue-500"
      : tone === "purple"
      ? "bg-purple-500"
      : tone === "yellow"
      ? "bg-yellow-500"
      : "bg-orange-500";

  return (
    <div className="flex items-center gap-1 text-xs text-gray-600">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} />
      <span className="font-semibold text-gray-800">{value.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  );
};

const Row = React.forwardRef<
  HTMLDivElement,
  {
    player: Player;
    isYou: boolean;
    isHighlighted?: boolean;
    sortBy: RankingCategory;
  }
>(({ player, isYou, isHighlighted = false, sortBy }, ref) => {
  const rank =
    sortBy === "lessons"
      ? player.lessonsRank ?? 0
      : sortBy === "elo"
      ? player.eloRank ?? 0
      : player.globalRank ?? 0;

  const rowTone =
    rank === 1
      ? "from-yellow-50 to-amber-50 border-yellow-200"
      : rank === 2
      ? "from-gray-50 to-slate-50 border-gray-200"
      : rank === 3
      ? "from-amber-50 to-orange-50 border-amber-200"
      : isYou || isHighlighted
      ? "from-blue-50 to-indigo-50 border-blue-300 ring-2 ring-blue-200"
      : "from-white to-white border-gray-200";

  const primaryValue =
    sortBy === "lessons"
      ? player.lessons ?? 0
      : sortBy === "elo"
      ? player.rankedElo ?? 500
      : player.xp ?? 0;

  const primaryLabel =
    sortBy === "lessons" ? "Lessons" : sortBy === "elo" ? "Ranked ELO" : "Total XP";

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-2xl border bg-gradient-to-r ${rowTone} p-4 shadow-sm transition-shadow hover:shadow-md`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex w-10 shrink-0 justify-center pt-2">{medalForRank(rank)}</div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-lg ring-2 ring-gray-200">
            {getAvatarEmoji(player.avatar || "default")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-gray-900">
                {player.name}
                {(isYou || isHighlighted) && (
                  <span className="ml-2 font-bold text-blue-600">(You)</span>
                )}
              </p>
              {player.title && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                  {player.title}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <span>Level {player.level ?? 1}</span>
              <span className="flex items-center gap-1 font-medium text-green-600">
                <TrendingUp className="h-3 w-3" />
                {(player.xp ?? 0).toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[240px] lg:items-end">
          <div className="text-left lg:text-right">
            <p className="text-xl font-bold text-gray-900">{primaryValue.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{primaryLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:justify-end lg:gap-4">
            {sortBy !== "xp" && <StatPill label="XP" value={player.xp ?? 0} tone="yellow" />}
            {sortBy !== "lessons" && (
              <StatPill label="Lessons" value={player.lessons ?? 0} tone="green" />
            )}
            {sortBy !== "elo" && (
              <StatPill label="ELO" value={player.rankedElo ?? 500} tone="purple" />
            )}
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-gray-800">{player.streak ?? 0}</span>
              <span>Streak</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

Row.displayName = "Row";

function useLiveLeaderboard(period: LeaderboardPeriod, page: number, userId?: string, sortBy: RankingCategory = "elo") {
  const [data, setData] = useState<LeaderboardData>({
    players: [],
    totalPlayers: 0,
    yourRank: 0,
    yourLessonsRank: 0,
    yourEloRank: 0,
    yourStats: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(
    async (targetPage: number, targetSort: RankingCategory = sortBy, targetPeriod: LeaderboardPeriod = period) => {
      if (targetPage < 1) return;

      setLoading(true);
      setError(null);

      try {
        const limit = 100;
        const offset = (targetPage - 1) * limit;
        const { data: leaderboardData, error: leaderboardError } = await getLeaderboardData(
          limit,
          offset,
          targetSort,
          targetPeriod,
        );

        if (leaderboardError) {
          throw leaderboardError;
        }

        let processedPlayers: Player[] =
          leaderboardData?.map((entry: any) => ({
            id: entry.user_id,
            name: entry.user_profiles?.name || "Unknown Player",
            xp: entry.xp || 0,
            lessons: entry.total_lessons_completed || 0,
            rankedElo: entry.ranked_elo || 500,
            streak: entry.current_streak || 0,
            level: entry.level || 1,
            avatar: entry.user_profiles?.current_avatar || "default",
            title: getEloRankInfo(entry.ranked_elo || 500).tier,
            globalRank: entry.rank || 0,
            lessonsRank: entry.rank || 0,
            eloRank: entry.rank || 0,
            totalCount: entry.total_count || 0,
          })) || [];

        let totalPlayers = processedPlayers[0]?.totalCount || processedPlayers.length || 0;

        let yourStats: Player | null = null;
        let yourRank = 0;
        let yourLessonsRank = 0;
        let yourEloRank = 0;

        if (userId && userId !== "guest") {
          const [statsResult, xpRankResult, lessonsRankResult, eloRankResult] = await Promise.all([
            supabase.rpc('get_public_leaderboard_user_stats', {
              p_user_id: userId,
              p_period: targetPeriod,
            }),
            getUserRank(userId, 'xp', targetPeriod),
            getUserRank(userId, 'lessons', targetPeriod),
            getUserRank(userId, 'elo', targetPeriod),
          ]);

          let statsData = statsResult.data;
          const statsMissingRpc =
            statsResult.error?.message?.includes('get_public_leaderboard_user_stats') ||
            statsResult.error?.message?.includes('schema cache');

          if (statsMissingRpc) {
            const { data: fallbackStats } = await supabase
              .from('public_leaderboard')
              .select('id, name, current_avatar, xp, total_lessons_completed, ranked_elo, current_streak, level')
              .eq('id', userId)
              .maybeSingle();

            statsData = fallbackStats
              ? {
                  user_id: fallbackStats.id,
                  name: fallbackStats.name,
                  current_avatar: fallbackStats.current_avatar,
                  xp: fallbackStats.xp,
                  total_lessons_completed: fallbackStats.total_lessons_completed,
                  ranked_elo: fallbackStats.ranked_elo,
                  current_streak: fallbackStats.current_streak,
                  level: fallbackStats.level,
                }
              : null;
          }

          const statsRows = Array.isArray(statsData) ? statsData : statsData ? [statsData] : [];

          if (statsRows.length > 0) {
            const stats = statsRows[0];
            yourStats = {
              id: stats.user_id,
              name: stats.name || 'You',
              xp: stats.xp || 0,
              lessons: stats.total_lessons_completed || 0,
              rankedElo: stats.ranked_elo || 500,
              streak: stats.current_streak || 0,
              level: stats.level || 1,
              avatar: stats.current_avatar || 'default',
              title: getEloRankInfo(stats.ranked_elo || 500).tier,
            };
          }

          yourRank = xpRankResult.data || 0;
          yourLessonsRank = lessonsRankResult.data || 0;
          yourEloRank = eloRankResult.data || 0;

          if (yourStats) {
            if (yourRank === 0) yourRank = 1;
            if (yourLessonsRank === 0) yourLessonsRank = 1;
            if (yourEloRank === 0) yourEloRank = 1;
          }
        }

        if (processedPlayers.length === 0 && yourStats) {
          processedPlayers = [
            {
              ...yourStats,
              globalRank: yourRank || 1,
              lessonsRank: yourLessonsRank || 1,
              eloRank: yourEloRank || 1,
              totalCount: 1,
            },
          ];
          totalPlayers = 1;
        }

        setData({
          players: processedPlayers,
          totalPlayers,
          yourRank,
          yourLessonsRank,
          yourEloRank,
          yourStats,
        });
      } catch (fetchError: any) {
        console.error('Failed to fetch leaderboard:', fetchError);
        setError(fetchError.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    },
    [period, sortBy, userId],
  );

  useEffect(() => {
    const subscription = subscribeToLeaderboardUpdates(() => {
      setTimeout(() => {
        fetchLeaderboard(page, sortBy, period);
      }, 120);
    });

    fetchLeaderboard(page, sortBy, period);

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchLeaderboard, page, period, sortBy]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

const RankingDropdown: React.FC<{
  data: LeaderboardData;
  period: LeaderboardPeriod;
  currentCategory: RankingCategory;
  onCategoryChange: (category: RankingCategory) => void;
}> = ({ data, period, currentCategory, onCategoryChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const categories = [
    {
      id: "elo" as RankingCategory,
      label: "Ranked ELO",
      icon: Flame,
      rank: data.yourEloRank ?? 0,
      color: "text-orange-500",
    },
    {
      id: "xp" as RankingCategory,
      label: "Total XP",
      icon: Trophy,
      rank: data.yourRank ?? 0,
      color: "text-yellow-500",
    },
    {
      id: "lessons" as RankingCategory,
      label: "Lessons Completed",
      icon: BookOpen,
      rank: data.yourLessonsRank ?? 0,
      color: "text-green-500",
    },
  ];

  const selected = categories.find((category) => category.id === currentCategory);
  const SelectedIcon = selected?.icon;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Your Rankings</h3>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
          {getPeriodLabel(period)}
        </span>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 transition-colors hover:bg-blue-100"
        >
          <div className="flex items-center gap-2">
            {SelectedIcon && <SelectedIcon className={`h-4 w-4 ${selected?.color}`} />}
            <span className="font-medium text-gray-900">{selected?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-blue-600">#{selected?.rank || 0}</span>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-gray-50 ${
                    currentCategory === category.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${category.color}`} />
                    <span className="font-medium text-gray-900">{category.label}</span>
                  </div>
                  <span className="font-bold text-gray-700">#{category.rank || 0}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const YourStats: React.FC<{ data: LeaderboardData; period: LeaderboardPeriod }> = ({ data, period }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2">
      <Trophy className="h-5 w-5 text-emerald-600" />
      <h3 className="font-semibold text-gray-900">Your Stats</h3>
      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {getPeriodLabel(period)}
      </span>
    </div>

    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <p className="mb-1 text-xs text-gray-500">Total XP</p>
        <p className="font-bold text-gray-900">{data.yourStats?.xp?.toLocaleString() ?? 0}</p>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <p className="mb-1 text-xs text-gray-500">Level</p>
        <p className="font-bold text-gray-900">{data.yourStats?.level ?? 1}</p>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <p className="mb-1 text-xs text-gray-500">Lessons</p>
        <p className="font-bold text-gray-900">{data.yourStats?.lessons ?? 0}</p>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <p className="mb-1 text-xs text-gray-500">Ranked ELO</p>
        <p className="font-bold text-gray-900">{data.yourStats?.rankedElo ?? 500}</p>
      </div>
    </div>
  </div>
);

const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalPlayers: number;
  loading: boolean;
}> = ({ currentPage, totalPages, onPageChange, totalPlayers, loading }) => {
  const startRange = (currentPage - 1) * 100 + 1;
  const endRange = Math.min(currentPage * 100, totalPlayers);

  const getVisiblePages = () => {
    const delta = 2;
    const range: number[] = [];
    const pages: (number | string)[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i += 1) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      pages.push(1, '...');
    } else {
      pages.push(1);
    }

    pages.push(...range);

    if (currentPage + delta < totalPages - 1) {
      pages.push('...', totalPages);
    } else if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Users className="h-4 w-4" />
        <span>
          Showing {startRange}-{endRange} of {totalPlayers.toLocaleString()} players
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || loading}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronsLeft className="h-4 w-4" />
          First
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === '...' ? (
              <span key={`dots-${index}`} className="px-3 py-2 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ),
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || loading}
          className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Last
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs text-gray-500">Page {currentPage} of {totalPages}</div>
    </div>
  );
};

const ErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="py-12 text-center">
    <div className="mb-4 text-red-500">
      <Trophy className="mx-auto mb-2 h-12 w-12 opacity-50" />
      <p className="text-lg font-medium">Unable to load leaderboard</p>
      <p className="mt-1 text-sm text-gray-600">{error}</p>
    </div>
    <button
      onClick={onRetry}
      className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
);

export default function RealTimeLeaderboard({ currentUserId }: { currentUserId?: string }) {
  const { user } = useUser();
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rankingCategory, setRankingCategory] = useState<RankingCategory>("elo");

  const effectiveUserId = currentUserId || user?.id || profile?.id;
  const { data, loading, error, refetch } = useLiveLeaderboard(
    period,
    currentPage,
    effectiveUserId,
    rankingCategory,
  );

  const filteredPlayers = useMemo(() => {
    const players = data.players || [];
    if (!query.trim()) return players;

    return players.filter((player) =>
      (player.name || '').toLowerCase().includes(query.trim().toLowerCase()),
    );
  }, [data.players, query]);

  const totalPages = Math.max(1, Math.ceil((data.totalPlayers || 0) / 100));
  const activeRank =
    rankingCategory === 'lessons'
      ? data.yourLessonsRank
      : rankingCategory === 'elo'
      ? data.yourEloRank
      : data.yourRank;
  const userInCurrentPage =
    activeRank > 0 && activeRank >= (currentPage - 1) * 100 + 1 && activeRank <= currentPage * 100;
  const showUserAtBottom = !query && !userInCurrentPage && !!data.yourStats && effectiveUserId !== 'guest';

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setQuery('');
    refetch(page, rankingCategory, period);
  };

  const handleCategoryChange = (category: RankingCategory) => {
    setRankingCategory(category);
    setCurrentPage(1);
    setQuery('');
    refetch(1, category, period);
  };

  const handlePeriodChange = (nextPeriod: LeaderboardPeriod) => {
    setPeriod(nextPeriod);
    setCurrentPage(1);
    setQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 xl:px-10 xl:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 text-center lg:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-gray-900 lg:text-3xl">Global Leaderboard</h1>
          <p className="text-gray-600">Compete with learners worldwide and track your progress.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4 xl:gap-6">
          <div className="xl:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4 sm:p-5 lg:p-6">
              <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
                {(["all", "month", "week"] as LeaderboardPeriod[]).map((value) => (
                  <Tab key={value} active={value === period} onClick={() => handlePeriodChange(value)}>
                    {getPeriodLabel(value)}
                  </Tab>
                ))}
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center rounded-2xl border bg-gray-50 px-4 py-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="w-full flex-1 border-none bg-transparent px-3 text-sm outline-none"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                  { id: 'elo' as RankingCategory, label: 'Ranked ELO', icon: Flame, color: 'bg-orange-100 text-orange-700' },
                  { id: 'xp' as RankingCategory, label: 'Total XP', icon: Trophy, color: 'bg-yellow-100 text-yellow-700' },
                  { id: 'lessons' as RankingCategory, label: 'Lessons', icon: BookOpen, color: 'bg-green-100 text-green-700' },
                ].map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        rankingCategory === category.id
                          ? category.color
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              {error && !loading && <ErrorDisplay error={error} onRetry={() => refetch(currentPage, rankingCategory, period)} />}

              {loading && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <p className="text-gray-500">Loading leaderboard...</p>
                </div>
              )}

              {!loading && !error && (
                <div className="space-y-3 overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredPlayers.map((player) => {
                      const isYou = player.id === effectiveUserId;
                      return (
                        <Row
                          key={`${player.id}-${period}-${currentPage}-${rankingCategory}`}
                          player={player}
                          isYou={isYou}
                          sortBy={rankingCategory}
                        />
                      );
                    })}
                  </AnimatePresence>

                  {showUserAtBottom && data.yourStats && (
                    <>
                      <div className="my-4 border-t border-gray-200" />
                      <div className="mb-3 rounded-lg bg-blue-50 p-3">
                        <p className="text-center text-sm font-medium text-blue-700">Your position in the leaderboard</p>
                      </div>
                      <Row
                        key={`user-highlight-${data.yourStats.id}`}
                        player={{
                          ...data.yourStats,
                          globalRank: data.yourRank,
                          lessonsRank: data.yourLessonsRank,
                          eloRank: data.yourEloRank,
                        }}
                        isYou={true}
                        isHighlighted={true}
                        sortBy={rankingCategory}
                      />
                    </>
                  )}

                  {filteredPlayers.length === 0 && !loading && !error && (
                    <div className="py-12 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                      <p className="text-gray-500">
                        {query ? 'No players found matching your search' : 'No players available'}
                      </p>
                      {query && (
                        <button
                          onClick={() => setQuery('')}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!query && !loading && !error && data.totalPlayers > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalPlayers={data.totalPlayers}
                  loading={loading}
                />
              )}
            </div>
          </div>

          <div className="space-y-4 xl:col-span-1 xl:space-y-6">
            <RankingDropdown
              data={data}
              period={period}
              currentCategory={rankingCategory}
              onCategoryChange={handleCategoryChange}
            />
            <YourStats data={data} period={period} />
          </div>
        </div>
      </div>
    </div>
  );
}
