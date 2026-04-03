import React, { useEffect, useId, useRef } from 'react';
import { ArrowRight, Loader2, X } from 'lucide-react';

export type ReviewTone = 'default' | 'warn' | 'success';

export type CoachingStarter = {
  id: string;
  label: string;
  useCase: string;
  summary: string;
  strengths: string;
  focusAreas: string;
};

export const COACHING_STARTERS: CoachingStarter[] = [
  {
    id: 'mostly-correct-needs-edges',
    label: 'Mostly correct, weak on edges',
    useCase: 'Use when the learner solved the main path but missed boundary cases, formatting, or empty-input handling.',
    summary: 'The main path works and the solution is understandable, but it still breaks when the input gets less forgiving.',
    strengths: 'You chose a workable approach and kept the control flow readable enough to follow.',
    focusAreas: 'Test empty input, one-item cases, duplicates, and output formatting before treating the task as done.',
  },
  {
    id: 'readable-but-fragile',
    label: 'Readable, but still fragile',
    useCase: 'Use when the code is clean and organized, but the implementation is not yet reliable enough under variation.',
    summary: 'The structure is cleaner than the result. The code reads well, but the implementation is still too easy to break.',
    strengths: 'Naming, layout, and the overall problem framing make the work easy to inspect and coach.',
    focusAreas: 'Verify assumptions line by line and tighten the cases where the current logic silently produces the wrong result.',
  },
  {
    id: 'timed-pressure-drops-quality',
    label: 'Pressure hurts consistency',
    useCase: 'Use when the learner can solve the problem, but timed pressure causes rushed mistakes or unfinished checks.',
    summary: 'You can reach a solution, but timed pressure is still costing you correctness and final polish.',
    strengths: 'Your first instincts are usually pointed in the right direction once you settle into the task.',
    focusAreas: 'Slow the first pass down just enough to lock in correctness, then build speed on repeated timed reps.',
  },
  {
    id: 'ready-for-harder-pass',
    label: 'Ready for a harder retake',
    useCase: 'Use when the learner is showing stable execution and should be pushed into harder or faster work next.',
    summary: 'This is no longer just a passable attempt. The work is stable enough to justify a harder next step.',
    strengths: 'Your execution looks more deliberate, and the solution quality is strong enough to build on.',
    focusAreas: 'Move up in difficulty or add tighter time pressure so the next rep forces sharper tradeoff decisions.',
  },
];

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container: HTMLElement | null) => {
  if (!container) return [] as HTMLElement[];

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true') return false;
    if (element.tabIndex === -1) return false;
    return element.getClientRects().length > 0;
  });
};

function DialogFrame({
  title,
  description,
  onClose,
  children,
  maxWidthClassName,
  bodyClassName,
  closeLabel,
  showCloseButton = true,
  dialogRole = 'dialog',
  disableClose = false,
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidthClassName: string;
  bodyClassName: string;
  closeLabel: string;
  showCloseButton?: boolean;
  dialogRole?: 'dialog' | 'alertdialog';
  disableClose?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const rafId = window.requestAnimationFrame(() => {
      const primaryFocusTarget = showCloseButton ? closeButtonRef.current : null;
      const fallbackTarget = getFocusableElements(dialogRef.current)[0] || dialogRef.current;
      (primaryFocusTarget || fallbackTarget)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      document.body.style.overflow = previousOverflow;
      previousFocusedElement?.focus?.();
    };
  }, [showCloseButton]);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !disableClose && onClose) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(dialogRef.current);
    if (focusableElements.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstFocusable || activeElement === dialogRef.current) {
        event.preventDefault();
        lastFocusable.focus();
      }
      return;
    }

    if (activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 py-6 backdrop-blur sm:py-10">
      <div className="absolute inset-0" aria-hidden="true" onClick={!disableClose ? onClose : undefined} />
      <div
        ref={dialogRef}
        role={dialogRole}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        className={`relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-elevated ${maxWidthClassName}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <div id={titleId} className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {title}
            </div>
            {description ? (
              <div id={descriptionId} className="mt-2 text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {showCloseButton && onClose ? (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={disableClose}
              aria-label={closeLabel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  closeLabel,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel?: string;
}) {
  return (
    <DialogFrame
      title={title}
      description={subtitle}
      onClose={onClose}
      closeLabel={closeLabel || `Close ${title}`}
      maxWidthClassName="max-w-[min(98vw,1680px)]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6"
    >
      {children}
    </DialogFrame>
  );
}

export function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  tone = 'default',
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'default' | 'destructive';
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <DialogFrame
      title={title}
      description={description}
      onClose={busy ? undefined : onCancel}
      closeLabel={`Close ${title}`}
      showCloseButton={false}
      disableClose={busy}
      dialogRole="alertdialog"
      maxWidthClassName="max-w-md"
      bodyClassName="px-6 pb-6 pt-5"
    >
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition disabled:opacity-60 ${
            tone === 'destructive'
              ? 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15'
              : 'border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </DialogFrame>
  );
}

export function ActionButton({
  title,
  value,
  onClick,
  disabled,
  icon,
}: {
  title: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-border bg-background px-4 py-4 text-left transition hover:border-primary/30 hover:bg-card disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{title}</div>
        <div className="mt-2 text-base font-semibold text-foreground">{value}</div>
      </div>
    </button>
  );
}

export function StatusPill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-xp/20 bg-xp/10 text-xp'
      : tone === 'danger'
      ? 'border-destructive/20 bg-destructive/10 text-destructive'
      : tone === 'warn'
      ? 'border-coins/20 bg-coins/10 text-coins'
      : 'border-primary/20 bg-primary/10 text-primary';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  helper,
  action,
}: {
  title: string;
  helper: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/50 px-4 py-6 text-sm text-muted-foreground">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-2">{helper}</div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{label}</div>
      <div className="mt-2 break-words text-lg font-semibold leading-tight text-foreground sm:text-xl">{value}</div>
      {helper ? <div className="mt-1 text-xs text-muted-foreground">{helper}</div> : null}
    </div>
  );
}

export function ReviewStatePill({
  label,
  tone,
}: {
  label: string;
  tone: ReviewTone;
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
      : tone === 'warn'
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
      : 'border-border bg-background text-foreground';

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClassName}`}>
      {label}
    </span>
  );
}

export function ReviewField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        {helper ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</div> : null}
      </div>
      {children}
    </label>
  );
}

export function RubricScoreControl({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: string;
  onChange: (nextValue: string) => void;
}) {
  const numericValue = value === '' ? null : Number(value);
  const safeNumericValue = Number.isFinite(numericValue) ? Math.max(0, Math.min(10, numericValue as number)) : null;

  const updateValue = (nextValue: number | null) => {
    if (nextValue === null) {
      onChange('');
      return;
    }

    onChange(String(Math.max(0, Math.min(10, nextValue))));
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">{helper}</div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateValue(null)}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Clear
            </button>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={safeNumericValue ?? 0}
              aria-label={`${label} score`}
              aria-valuetext={safeNumericValue === null ? 'Not scored' : `${safeNumericValue} out of 10`}
              onChange={(event) => updateValue(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-card accent-primary"
            />
            <div className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground">
              {safeNumericValue !== null ? `${safeNumericValue}/10` : '--'}
            </div>
          </div>
          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-1 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => updateValue(Math.max(0, (safeNumericValue ?? 0) - 1))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm transition hover:bg-secondary hover:text-foreground"
                aria-label={`Decrease ${label} score`}
              >
                -
              </button>
              <span className="px-1">adjust</span>
              <button
                type="button"
                onClick={() => updateValue(Math.min(10, (safeNumericValue ?? 0) + 1))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm transition hover:bg-secondary hover:text-foreground"
                aria-label={`Increase ${label} score`}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{label}</span>
        {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}
