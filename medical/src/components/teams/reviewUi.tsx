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
  headerActions,
  children,
  maxWidthClassName,
  bodyClassName,
  closeLabel,
  showCloseButton = true,
  dialogRole = 'dialog',
  disableClose = false,
  titlePresentation = 'eyebrow',
}: {
  title: string;
  description?: string;
  onClose?: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClassName: string;
  bodyClassName: string;
  closeLabel: string;
  showCloseButton?: boolean;
  dialogRole?: 'dialog' | 'alertdialog';
  disableClose?: boolean;
  titlePresentation?: 'eyebrow' | 'headline';
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
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <div
              id={titleId}
              className={
                titlePresentation === 'headline'
                  ? 'text-lg font-semibold text-foreground'
                  : 'text-xs font-semibold uppercase tracking-[0.18em] text-primary'
              }
            >
              {title}
            </div>
            {description ? (
              <div
                id={descriptionId}
                className={titlePresentation === 'headline' ? 'mt-1.5 text-sm text-muted-foreground' : 'mt-2 text-sm text-muted-foreground'}
              >
                {description}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerActions}
            {showCloseButton && onClose ? (
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                disabled={disableClose}
                aria-label={closeLabel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition hover:border-primary/20 hover:bg-background hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
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
  headerActions,
  children,
  closeLabel,
  titlePresentation = 'eyebrow',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  closeLabel?: string;
  titlePresentation?: 'eyebrow' | 'headline';
}) {
  return (
    <DialogFrame
      title={title}
      description={subtitle}
      onClose={onClose}
      headerActions={headerActions}
      closeLabel={closeLabel || `Close ${title}`}
      titlePresentation={titlePresentation}
      maxWidthClassName="max-w-[min(98vw,1680px)]"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
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
  const scoreOptions = Array.from({ length: 11 }, (_, index) => index);

  return (
    <div className="rounded-[1rem] border border-border/60 bg-background/60 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{label}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-7 min-w-[84px] items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground">
            {safeNumericValue !== null ? `${safeNumericValue}/10` : 'Not scored'}
          </div>
          {safeNumericValue !== null ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[repeat(6,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(11,minmax(0,1fr))]">
        {scoreOptions.map((option) => {
          const isActive = safeNumericValue === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(String(option))}
              aria-label={`${label} score ${option} out of 10`}
              aria-pressed={isActive}
              className={`inline-flex h-8 min-w-0 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                isActive
                  ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
                  : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {option}
            </button>
          );
        })}
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
