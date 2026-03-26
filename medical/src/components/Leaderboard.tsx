import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  Flame,
  Search,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import {
  supabase,
  getLeaderboardData,
  getUserRank,
  subscribeToLeaderboardUpdates,
  LeaderboardPeriod,
  LeaderboardSort,
} from '../lib/supabase';
import { getEloRankInfo } from '../lib/eloRanks';
import MascotIcon from './branding/MascotIcon';

const isLeaderboardDebugEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_LEADERBOARD === '1';

const leaderboardDebugError = (...args: any[]) => {
  if (isLeaderboardDebugEnabled) {
    console.error(...args);
  }
};

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

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const getAvatarEmoji = (avatarId: string): string => {
  const avatarMap: Record<string, string> = {
    default: '\u{1F464}',
    coder: '\u{1F468}\u200D\u{1F4BB}',
    scientist: '\u{1F469}\u200D\u{1F52C}',
    wizard: '\u{1F9D9}',
    ninja: '\u{1F977}',
    robot: '\u{1F916}',
    alien: '\u{1F47D}',
    superhero: '\u{1F9B8}',
    dragon: '\u{1F409}',
    crown: '\u{1F451}',
    master: '\u{1F3C6}',
  };

  return avatarMap[avatarId] || avatarMap.default;
};

const getPeriodLabel = (period: LeaderboardPeriod) =>
  period === 'all' ? 'All Time' : period === 'month' ? 'This Month' : 'This Week';

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank <= 3
      ? rank === 1
        ? 'bg-[hsl(var(--rank-gold))] text-background shadow-[0_0_12px_hsl(var(--rank-gold)/0.4)]'
        : rank === 2
        ? 'bg-[hsl(var(--rank-silver))] text-background'
        : 'bg-[hsl(var(--rank-bronze))] text-background'
      : 'bg-secondary text-secondary-foreground';

  return (
    <div className={cx('inline-flex h-8 w-8 items-center justify-center rounded-full font-bold font-mono text-sm', tone)}>
      #{rank}
    </div>
  );
}

function LeaderboardRow({
  player,
  isYou,
  isHighlighted = false,
  sortBy,
}: {
  player: Player;
  isYou: boolean;
  isHighlighted?: boolean;
  sortBy: RankingCategory;
}) {
  const rank =
    sortBy === 'lessons'
      ? player.lessonsRank ?? 0
      : sortBy === 'elo'
      ? player.eloRank ?? 0
      : player.globalRank ?? 0;

  const primaryValue =
    sortBy === 'lessons'
      ? player.lessons ?? 0
      : sortBy === 'elo'
      ? player.rankedElo ?? 500
      : player.xp ?? 0;

  const primaryLabel =
    sortBy === 'lessons' ? 'Lessons' : sortBy === 'elo' ? 'ELO' : 'XP';

  return (
    <div
      className={cx(
        'flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-200',
        isYou || isHighlighted
          ? 'border border-primary/30 bg-primary/5 glow-primary'
          : 'border border-transparent hover:bg-secondary/50'
      )}
    >
      <RankBadge rank={rank} />
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
        {getAvatarEmoji(player.avatar || 'default')}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cx('truncate font-semibold text-foreground', (isYou || isHighlighted) && 'text-primary')}>
            {player.name}
            {(isYou || isHighlighted) ? <span className="ml-2 text-xs uppercase tracking-[0.18em]">(You)</span> : null}
          </p>
          {player.title ? (
            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {player.title}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Level {player.level ?? 1} · {player.streak ?? 0} day streak
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-lg font-bold text-foreground">{primaryValue.toLocaleString()}</p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{primaryLabel}</p>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'xp' | 'lessons' | 'elo' | 'streak';
}) {
  const color = {
    xp: 'text-coins',
    lessons: 'text-xp',
    elo: 'text-primary',
    streak: 'text-streak',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-secondary/35 px-3 py-2 text-center">
      <div className={cx('text-sm font-bold font-mono', color)}>{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-full border px-4 py-2 text-sm font-medium transition-all',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-glow'
          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function useLiveLeaderboard(period: LeaderboardPeriod, page: number, userId?: string, sortBy: RankingCategory = 'elo') {
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

        if (leaderboardError) throw leaderboardError;

        let processedPlayers: Player[] =
          leaderboardData?.map((entry: any) => ({
            id: entry.user_id,
            name: entry.user_profiles?.name || 'Unknown Player',
            xp: entry.xp || 0,
            lessons: entry.total_lessons_completed || 0,
            rankedElo: entry.ranked_elo || 500,
            streak: entry.current_streak || 0,
            level: entry.level || 1,
            avatar: entry.user_profiles?.current_avatar || 'default',
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

        if (userId && userId !== 'guest') {
          const [statsResult, xpRankResult, lessonsRankResult, eloRankResult] = await Promise.all([
            supabase.rpc('get_public_leaderboard_user_stats', { p_user_id: userId, p_period: targetPeriod }),
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
        leaderboardDebugError('Failed to fetch leaderboard:', fetchError);
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
    return () => subscription.unsubscribe();
  }, [fetchLeaderboard, page, period, sortBy]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

function RankingDropdown({
  data,
  period,
  currentCategory,
  onCategoryChange,
}: {
  data: LeaderboardData;
  period: LeaderboardPeriod;
  currentCategory: RankingCategory;
  onCategoryChange: (category: RankingCategory) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const categories = [
    { id: 'elo' as RankingCategory, label: 'Ranked ELO', icon: Flame, rank: data.yourEloRank ?? 0, color: 'text-primary' },
    { id: 'xp' as RankingCategory, label: 'Total XP', icon: Trophy, rank: data.yourRank ?? 0, color: 'text-coins' },
    { id: 'lessons' as RankingCategory, label: 'Lessons Completed', icon: BookOpen, rank: data.yourLessonsRank ?? 0, color: 'text-xp' },
  ];
  const selected = categories.find((category) => category.id === currentCategory);
  const SelectedIcon = selected?.icon;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Your Rankings</h3>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">{getPeriodLabel(period)}</span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-3 transition-colors hover:bg-primary/15"
        >
          <div className="flex items-center gap-2">
            {SelectedIcon ? <SelectedIcon className={cx('h-4 w-4', selected?.color)} /> : null}
            <span className="font-medium text-foreground">{selected?.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono text-primary">#{selected?.rank || 0}</span>
            <ChevronDown className={cx('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
          </div>
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-elevated">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    onCategoryChange(category.id);
                    setIsOpen(false);
                  }}
                  className={cx(
                    'flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-secondary/50',
                    currentCategory === category.id && 'bg-secondary/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cx('h-4 w-4', category.color)} />
                    <span className="font-medium text-foreground">{category.label}</span>
                  </div>
                  <span className="font-bold font-mono text-foreground">#{category.rank || 0}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function YourStats({ data, period }: { data: LeaderboardData; period: LeaderboardPeriod }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-xp" />
        <h3 className="font-semibold text-foreground">Your Stats</h3>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">{getPeriodLabel(period)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatChip label="XP" value={data.yourStats?.xp ?? 0} tone="xp" />
        <StatChip label="Level" value={data.yourStats?.level ?? 1} tone="elo" />
        <StatChip label="Lessons" value={data.yourStats?.lessons ?? 0} tone="lessons" />
        <StatChip label="ELO" value={data.yourStats?.rankedElo ?? 500} tone="elo" />
      </div>
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalPlayers,
  loading,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalPlayers: number;
  loading: boolean;
}) {
  const startRange = (currentPage - 1) * 100 + 1;
  const endRange = Math.min(currentPage * 100, totalPlayers);

  const getVisiblePages = () => {
    const delta = 2;
    const range: number[] = [];
    const pages: Array<number | string> = [];

    for (let index = Math.max(2, currentPage - delta); index <= Math.min(totalPages - 1, currentPage + delta); index += 1) {
      range.push(index);
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
  const buttonClass =
    'flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          Showing {startRange}-{endRange} of {totalPlayers.toLocaleString()} players
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => onPageChange(1)} disabled={currentPage <= 1 || loading} className={buttonClass}>
          <ChevronsLeft className="h-4 w-4" />
          First
        </button>
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || loading} className={buttonClass}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) =>
            page === '...' ? (
              <span key={`dots-${index}`} className="px-3 py-2 text-muted-foreground">...</span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading} className={buttonClass}>
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages || loading} className={buttonClass}>
          Last
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      <div className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</div>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="py-12 text-center">
      <Trophy className="mx-auto mb-3 h-12 w-12 text-destructive/60" />
      <p className="text-lg font-medium text-foreground">Unable to load leaderboard</p>
      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}

export default function RealTimeLeaderboard({ currentUserId }: { currentUserId?: string }) {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rankingCategory, setRankingCategory] = useState<RankingCategory>('elo');

  const effectiveUserId = currentUserId;
  const { data, loading, error, refetch } = useLiveLeaderboard(period, currentPage, effectiveUserId, rankingCategory);

  const filteredPlayers = useMemo(() => {
    if (!query.trim()) return data.players || [];
    return (data.players || []).filter((player) =>
      (player.name || '').toLowerCase().includes(query.trim().toLowerCase())
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
    <div className="space-y-8 p-4 lg:p-8">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 sm:h-28 sm:w-28">
          <MascotIcon mascot="leaderboard" className="h-full w-full" imageClassName="drop-shadow-md" />
        </div>
        <h1 className="type-display-section mt-4 text-foreground">Leaderboard</h1>
        <p className="type-body-md mx-auto mt-3 max-w-2xl text-muted-foreground">
          Ranked ELO, XP, and lesson completion now sit inside the same dark competitive dashboard language as the rest of Codhak.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card shadow-card xl:col-span-3">
          <div className="border-b border-border p-5 sm:p-6">
            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {(['all', 'month', 'week'] as LeaderboardPeriod[]).map((value) => (
                <Tab key={value} active={value === period} onClick={() => handlePeriodChange(value)}>
                  {getPeriodLabel(value)}
                </Tab>
              ))}
            </div>

            <div className="mb-4 flex min-w-0 flex-1 items-center rounded-2xl border border-border bg-secondary/35 px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                className="w-full flex-1 border-none bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'elo' as RankingCategory, label: 'Ranked ELO', icon: Flame, active: 'bg-primary/10 text-primary border border-primary/20' },
                { id: 'xp' as RankingCategory, label: 'Total XP', icon: Trophy, active: 'bg-coins/10 text-coins border border-coins/20' },
                { id: 'lessons' as RankingCategory, label: 'Lessons', icon: BookOpen, active: 'bg-xp/10 text-xp border border-xp/20' },
              ].map((category) => {
                const Icon = category.icon;
                const isActive = rankingCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryChange(category.id)}
                    className={cx(
                      'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? category.active : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {error && !loading ? <ErrorDisplay error={error} onRetry={() => refetch(currentPage, rankingCategory, period)} /> : null}

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="space-y-3 overflow-hidden">
                {filteredPlayers.map((player) => (
                  <LeaderboardRow
                    key={`${player.id}-${period}-${currentPage}-${rankingCategory}`}
                    player={player}
                    isYou={player.id === effectiveUserId}
                    sortBy={rankingCategory}
                  />
                ))}

                {showUserAtBottom && data.yourStats ? (
                  <>
                    <div className="my-4 border-t border-border" />
                    <div className="mb-3 rounded-lg bg-primary/10 p-3">
                      <p className="text-center text-sm font-medium text-primary">Your position in the leaderboard</p>
                    </div>
                    <LeaderboardRow
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
                ) : null}

                {filteredPlayers.length === 0 && !loading && !error ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      {query ? 'No players found matching your search' : 'No players available'}
                    </p>
                    {query ? (
                      <button type="button" onClick={() => setQuery('')} className="mt-2 text-sm text-primary hover:text-accent">
                        Clear search
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!query && !loading && !error && data.totalPlayers > 0 ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalPlayers={data.totalPlayers}
                loading={loading}
              />
            ) : null}
          </div>
        </div>

        <div className="space-y-6 xl:col-span-1">
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
  );
}
