import React, { useMemo } from 'react';
import { AssignmentEditorForm } from './AssignmentEditorForm';
import { AssignmentEditorHeader } from './AssignmentEditorHeader';
import { AssignmentEditorPreview } from './AssignmentEditorPreview';
import { createAssignmentEditorViewModel } from './editorModel';
import { AssignmentDraft } from './model';
import { AssignmentDueInputState } from './editorContract';

interface AssignmentsEditorPanelProps {
  draft: AssignmentDraft;
  setDraft: React.Dispatch<React.SetStateAction<AssignmentDraft>>;
  dueInputState: AssignmentDueInputState;
  onDueInputStateChange: (state: AssignmentDueInputState) => void;
  canManageWorkspace: boolean;
  submittingKey: string | null;
  onSave: () => void;
  onClose: () => void;
  onApplyTemplate: (templateId: string) => void;
  formatDateTimeLabel: (value: string | null | undefined) => string;
}

export function AssignmentsEditorPanel({
  draft,
  setDraft,
  dueInputState,
  onDueInputStateChange,
  canManageWorkspace,
  submittingKey,
  onSave,
  onClose,
  onApplyTemplate,
  formatDateTimeLabel,
}: AssignmentsEditorPanelProps) {
  const viewModel = useMemo(
    () => createAssignmentEditorViewModel(draft, dueInputState, formatDateTimeLabel),
    [draft, dueInputState, formatDateTimeLabel]
  );

  return (
    <div
      className="rounded-[1.45rem] border border-border/80 bg-card/95 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.42)] sm:p-5"
      lang="en-US"
    >
      <AssignmentEditorHeader
        draftId={draft.id}
        canManageWorkspace={canManageWorkspace}
        readyToSave={viewModel.readyToSave}
        submittingKey={submittingKey}
        onSave={onSave}
        onClose={onClose}
        onApplyTemplate={onApplyTemplate}
        saveDisabledReason={viewModel.blockingIssues[0] || null}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <AssignmentEditorForm
          draft={draft}
          setDraft={setDraft}
          viewModel={viewModel}
          dueInputState={dueInputState}
          onDueInputStateChange={onDueInputStateChange}
        />
        <AssignmentEditorPreview viewModel={viewModel} />
      </div>
    </div>
  );
}
