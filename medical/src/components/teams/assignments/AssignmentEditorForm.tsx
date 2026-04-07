import React from 'react';
import { interviewTracks } from '../../../data/siteContent';
import { AssignmentDueDateInput } from './AssignmentDueDateInput';
import {
  applyAssignmentTypeToDraft,
  ASSIGNMENT_EDITOR_TYPE_OPTIONS,
  AssignmentEditorViewModel,
} from './editorModel';
import { AssignmentDueInputState } from './editorContract';
import { AssignmentDraft } from './model';

interface AssignmentEditorFormProps {
  draft: AssignmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssignmentDraft>>;
  viewModel: AssignmentEditorViewModel;
  dueInputState: AssignmentDueInputState;
  onDueInputStateChange: (state: AssignmentDueInputState) => void;
}

const fieldClassName =
  'w-full rounded-lg border border-border/70 bg-background/80 px-3.5 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/35 focus:bg-background';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-4">
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      {children}
    </section>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="rounded-lg border border-border/55 bg-background/45 px-3.5 py-3 text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function SystemSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/35 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">System generated</span>
      </div>
      <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}

export function AssignmentEditorForm({
  draft,
  setDraft,
  viewModel,
  dueInputState,
  onDueInputStateChange,
}: AssignmentEditorFormProps) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-border/70 bg-background/55">
      <Section title="Setup">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(232px,260px)]">
          <Field label="Assignment type">
            <div className="inline-flex w-full flex-wrap gap-1 rounded-xl bg-background/70 p-1">
              {ASSIGNMENT_EDITOR_TYPE_OPTIONS.map((option) => {
                const isActive = draft.assignmentType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDraft((current) => applyAssignmentTypeToDraft(current, option.value))}
                    className={`min-w-[144px] flex-1 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                      isActive
                        ? 'bg-primary/12 text-primary ring-1 ring-primary/15'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <ReadOnlyField label="Audience" value={viewModel.audienceLabel} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)]">
          <Field label={viewModel.focusField.label} helper={viewModel.focusField.kind === 'duel_target_count' ? 'Per learner' : undefined}>
            {viewModel.focusField.kind === 'roadmap_track' ? (
              <select
                value={draft.trackId}
                onChange={(event) => setDraft((current) => ({ ...current, trackId: event.target.value }))}
                className={`${fieldClassName} h-11`}
              >
                <option value="">Select a roadmap track</option>
                {interviewTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.title}
                  </option>
                ))}
              </select>
            ) : viewModel.focusField.kind === 'duel_target_count' ? (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="3"
                value={draft.duelTargetCount}
                onChange={(event) => setDraft((current) => ({ ...current, duelTargetCount: event.target.value }))}
                className={`${fieldClassName} h-11`}
              />
            ) : (
              <select
                value={draft.benchmarkLanguage || 'python'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    benchmarkLanguage: event.target.value as AssignmentDraft['benchmarkLanguage'],
                  }))
                }
                className={`${fieldClassName} h-11`}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            )}
          </Field>
        </div>
      </Section>

      <div className="border-t border-border/70" />

      <Section title="Assignment details">
        <Field label="Title" helper={`${draft.title.trim().length}/120`}>
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            maxLength={120}
            placeholder={viewModel.titlePlaceholder}
            className={`${fieldClassName} h-11 text-base font-medium`}
          />
        </Field>

        <div className="mt-4">
          <Field label="Learner instructions" helper={`${draft.description.trim().length}/500`}>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              maxLength={500}
              rows={6}
              placeholder={viewModel.descriptionPlaceholder}
              className={`${fieldClassName} min-h-[156px] py-3 leading-6`}
            />
          </Field>
        </div>
      </Section>

      <div className="border-t border-border/70" />

      <Section title="Schedule and review">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          <Field label="Due date">
            <AssignmentDueDateInput
              value={draft.dueAt}
              onChange={(value) => setDraft((current) => ({ ...current, dueAt: value }))}
              onStateChange={onDueInputStateChange}
              ariaLabel="Assignment due date"
            />
            {dueInputState.hasPendingEdit ? (
              <div className="mt-2 text-xs text-coins">{dueInputState.message}</div>
            ) : null}
          </Field>

          <SystemSummary label="Completion rule" value={viewModel.completionRuleSummary} />
        </div>
      </Section>
    </div>
  );
}
