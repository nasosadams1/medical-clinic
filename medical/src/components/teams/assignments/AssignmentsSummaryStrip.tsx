import React from 'react';
import { ASSIGNMENT_SUMMARY_STRIP_ITEMS, AssignmentQueueFilter } from './model';

interface AssignmentsSummaryStripProps {
  counts: Record<AssignmentQueueFilter, number>;
}

const SUMMARY_TONE_CLASS: Record<Exclude<AssignmentQueueFilter, 'all' | 'active' | 'archived'>, string> = {
  needs_action: 'bg-amber-300',
  awaiting_review: 'bg-primary/80',
  overdue: 'bg-rose-400',
  due_this_week: 'bg-sky-300',
  stalled: 'bg-orange-300',
};

export function AssignmentsSummaryStrip({ counts }: AssignmentsSummaryStripProps) {
  return (
    <section
      aria-label="Queue health"
      data-queue-summary="passive"
      className="rounded-xl border border-border/50 bg-card/15 px-2.5 py-1.5"
    >
      <dl className="grid gap-1 md:grid-cols-5 md:divide-x md:divide-border/50">
        {ASSIGNMENT_SUMMARY_STRIP_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <dt className="flex items-center gap-2 text-[11px] font-medium tracking-[0.01em] text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${SUMMARY_TONE_CLASS[item.key]}`} aria-hidden="true" />
              {item.label}
            </dt>
            <dd className="text-sm font-semibold text-foreground">{counts[item.key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
