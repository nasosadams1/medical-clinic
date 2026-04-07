import React from 'react';
import { Search } from 'lucide-react';
import { TeamAssignmentType } from '../../../lib/teams';
import {
  ASSIGNMENT_QUEUE_FILTER_OPTIONS,
  AssignmentQueueFilter,
  AssignmentSortOption,
} from './model';

interface AssignmentsQueueToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  assignmentTypeFilter: 'all' | TeamAssignmentType;
  onAssignmentTypeFilterChange: (value: 'all' | TeamAssignmentType) => void;
  assignmentSort: AssignmentSortOption;
  onAssignmentSortChange: (value: AssignmentSortOption) => void;
  assignmentQueueFilter: AssignmentQueueFilter;
  onAssignmentQueueFilterChange: (value: AssignmentQueueFilter) => void;
  queueCounts: Record<AssignmentQueueFilter, number>;
  capacityNote?: string | null;
}

export function AssignmentsQueueToolbar({
  searchQuery,
  onSearchQueryChange,
  assignmentTypeFilter,
  onAssignmentTypeFilterChange,
  assignmentSort,
  onAssignmentSortChange,
  assignmentQueueFilter,
  onAssignmentQueueFilterChange,
  queueCounts,
  capacityNote,
}: AssignmentsQueueToolbarProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">Queue</div>
        {capacityNote ? <div className="text-xs font-medium text-amber-300">{capacityNote}</div> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/75 p-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search title, track, type, or rule"
              className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Assignment type"
              value={assignmentTypeFilter}
              onChange={(event) => onAssignmentTypeFilterChange(event.target.value as 'all' | TeamAssignmentType)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="all">Type</option>
              <option value="benchmark">Benchmark</option>
              <option value="duel_activity">Duel activity goal</option>
              <option value="roadmap">Roadmap</option>
            </select>

            <select
              aria-label="Assignment sort"
              value={assignmentSort}
              onChange={(event) => onAssignmentSortChange(event.target.value as AssignmentSortOption)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="priority">Sort: Priority</option>
              <option value="due">Sort: Due</option>
              <option value="completion">Sort: Completion</option>
              <option value="recent">Sort: Recent</option>
            </select>
          </div>
        </div>

        <div role="tablist" aria-label="Assignment states" className="flex flex-wrap gap-1.5" data-queue-state-control="tabs">
          {ASSIGNMENT_QUEUE_FILTER_OPTIONS.map((option) => {
            const isActive = assignmentQueueFilter === option.value;

            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="assignments-queue-table"
                onClick={() => onAssignmentQueueFilterChange(option.value)}
                className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border-primary/35 bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground'
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                    isActive ? 'bg-black/15 text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}
                >
                  {queueCounts[option.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
