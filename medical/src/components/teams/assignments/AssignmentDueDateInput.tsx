import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AssignmentDueInputState } from './editorContract';

interface AssignmentDueDateInputProps {
  value: string;
  onChange: (value: string) => void;
  onStateChange?: (state: AssignmentDueInputState) => void;
  className?: string;
  ariaLabel?: string;
  size?: 'default' | 'compact';
}

type DueDateDraft = {
  date: string;
  time: string;
};

const DEFAULT_TIME = '17:00';
const EMPTY_DUE_DATE_DRAFT: DueDateDraft = {
  date: '',
  time: DEFAULT_TIME,
};

const isValidTimeValue = (value: string) => {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
};

const isValidDateValue = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

const parseDueDateValue = (value: string): DueDateDraft => {
  if (!value) {
    return EMPTY_DUE_DATE_DRAFT;
  }

  const [datePart = '', timePart = DEFAULT_TIME] = String(value).trim().split('T');
  return {
    date: isValidDateValue(datePart) ? datePart : '',
    time: isValidTimeValue(timePart.slice(0, 5)) ? timePart.slice(0, 5) : DEFAULT_TIME,
  };
};

const buildDueDateValue = (draft: DueDateDraft) => {
  if (!isValidDateValue(draft.date)) {
    return '';
  }

  return `${draft.date}T${isValidTimeValue(draft.time) ? draft.time : DEFAULT_TIME}`;
};

const padNumber = (value: number) => String(value).padStart(2, '0');

const formatTimeLabel = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  const displayHour = hours % 12 || 12;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${padNumber(minutes)} ${meridiem}`;
};

const buildTimeOptions = (selectedTime: string) => {
  const values = new Set<string>();

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      values.add(`${padNumber(hour)}:${padNumber(minute)}`);
    }
  }

  if (isValidTimeValue(selectedTime)) {
    values.add(selectedTime);
  }

  return Array.from(values)
    .sort()
    .map((time) => ({
      value: time,
      label: formatTimeLabel(time),
    }));
};

export function AssignmentDueDateInput({
  value,
  onChange,
  onStateChange,
  className = '',
  ariaLabel = 'Due date',
  size = 'default',
}: AssignmentDueDateInputProps) {
  const [draft, setDraft] = useState<DueDateDraft>(() => parseDueDateValue(value));
  const lastCommittedValueRef = useRef(value || '');
  const isCompact = size === 'compact';

  useEffect(() => {
    const normalizedValue = value || '';
    if (normalizedValue === lastCommittedValueRef.current) {
      return;
    }

    setDraft(parseDueDateValue(normalizedValue));
    lastCommittedValueRef.current = normalizedValue;
  }, [value]);

  const timeOptions = useMemo(() => buildTimeOptions(draft.time), [draft.time]);
  const hasSelectedValue = Boolean(draft.date || value);
  const showDateError = draft.date.length === 10 && !isValidDateValue(draft.date);

  useEffect(() => {
    if (!onStateChange) return;

    const trimmedDate = draft.date.trim();
    const committedValue = String(lastCommittedValueRef.current || '').trim();
    if (!trimmedDate) {
      onStateChange(
        committedValue
          ? {
              status: 'incomplete',
              hasPendingEdit: true,
              message: 'Finish the due date entry or clear it.',
            }
          : {
              status: 'empty',
              hasPendingEdit: false,
              message: null,
            }
      );
      return;
    }

    if (isValidDateValue(trimmedDate)) {
      onStateChange({
        status: 'valid',
        hasPendingEdit: false,
        message: null,
      });
      return;
    }

    onStateChange({
      status: trimmedDate.length < 10 ? 'incomplete' : 'invalid',
      hasPendingEdit: true,
      message:
        trimmedDate.length < 10
          ? 'Finish the due date entry or clear it.'
          : 'Use YYYY-MM-DD or clear the due date.',
    });
  }, [draft.date, onStateChange, value]);

  const commitDraft = (nextDraft: DueDateDraft) => {
    setDraft(nextDraft);
    const nextValue = buildDueDateValue(nextDraft);
    if (nextValue) {
      lastCommittedValueRef.current = nextValue;
      onChange(nextValue);
    }
  };

  const controlClassName = `${
    isCompact ? 'h-9' : 'h-11'
  } rounded-lg border border-border/70 bg-background/80 px-3.5 text-sm text-foreground outline-none transition focus:border-primary/35 focus:bg-background`;

  const groupedControlClassName = `rounded-xl border bg-background/82 transition ${
    showDateError
      ? 'border-coins/35'
      : 'border-border/70 focus-within:border-primary/35'
  }`;

  if (!isCompact) {
    return (
      <div className={`grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] ${className}`.trim()}>
        <div className={`grid min-w-0 overflow-hidden ${groupedControlClassName} sm:grid-cols-[minmax(0,1fr)_148px]`}>
          <input
            type="text"
            value={draft.date}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={10}
            placeholder="YYYY-MM-DD"
            aria-label={`${ariaLabel} date`}
            onChange={(event) => commitDraft({ ...draft, date: event.target.value.trim() })}
            className="h-11 min-w-0 border-0 bg-transparent px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="border-t border-border/60 sm:border-l sm:border-t-0">
            <select
              value={draft.time}
              aria-label={`${ariaLabel} time`}
              onChange={(event) => commitDraft({ ...draft, time: event.target.value })}
              className="h-11 w-full border-0 bg-transparent px-3.5 text-sm text-foreground outline-none"
            >
              {timeOptions.map((time) => (
                <option key={time.value} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            lastCommittedValueRef.current = '';
            setDraft(EMPTY_DUE_DATE_DRAFT);
            onChange('');
          }}
          disabled={!hasSelectedValue}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${
        isCompact
          ? 'flex flex-wrap items-center gap-2'
          : 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_144px_auto]'
      } ${className}`.trim()}
    >
      <input
        type="text"
        value={draft.date}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        maxLength={10}
        placeholder="YYYY-MM-DD"
        aria-label={`${ariaLabel} date`}
        onChange={(event) => commitDraft({ ...draft, date: event.target.value.trim() })}
        className={`${controlClassName} ${
          showDateError ? 'border-coins/45 text-foreground' : ''
        } ${isCompact ? 'min-w-[168px] flex-[1_1_168px]' : 'min-w-0'}`}
      />

      <select
        value={draft.time}
        aria-label={`${ariaLabel} time`}
        onChange={(event) => commitDraft({ ...draft, time: event.target.value })}
        className={`${controlClassName} ${isCompact ? 'min-w-[128px] flex-[0_1_128px]' : 'min-w-0'}`}
      >
        {timeOptions.map((time) => (
          <option key={time.value} value={time.value}>
            {time.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          lastCommittedValueRef.current = '';
          setDraft(EMPTY_DUE_DATE_DRAFT);
          onChange('');
        }}
        disabled={!hasSelectedValue}
        className={`inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${
          isCompact ? 'h-9' : 'h-11'
        }`}
      >
        Clear
      </button>
    </div>
  );
}
