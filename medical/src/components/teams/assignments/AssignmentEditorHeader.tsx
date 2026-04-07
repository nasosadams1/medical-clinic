import React, { useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { ASSIGNMENT_TEMPLATES } from './model';

interface AssignmentEditorHeaderProps {
  draftId: string | null;
  canManageWorkspace: boolean;
  readyToSave: boolean;
  submittingKey: string | null;
  onSave: () => void;
  onClose: () => void;
  onApplyTemplate: (templateId: string) => void;
  saveDisabledReason: string | null;
}

export function AssignmentEditorHeader({
  draftId,
  canManageWorkspace,
  readyToSave,
  submittingKey,
  onSave,
  onClose,
  onApplyTemplate,
  saveDisabledReason,
}: AssignmentEditorHeaderProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleApplyTemplate = () => {
    if (!selectedTemplateId) return;
    onApplyTemplate(selectedTemplateId);
    setSelectedTemplateId('');
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="max-w-2xl">
        <div className="text-sm font-medium text-muted-foreground">Assignments</div>
        <div className="mt-1 text-[1.55rem] font-semibold leading-tight text-foreground sm:text-[1.75rem]">
          {draftId ? 'Edit assignment' : 'Create assignment'}
        </div>
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          Set what learners will receive, when it is due, and how completion will be measured.
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-[1rem] border border-border/70 bg-background/55 p-2 lg:justify-end">
          {!readyToSave && canManageWorkspace ? (
            <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-coins/20 bg-coins/10 px-3 text-xs font-medium text-coins">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{saveDisabledReason || 'Complete the required fields to enable saving.'}</span>
            </div>
          ) : null}

          {!draftId ? (
            <div className="flex min-w-[244px] gap-2">
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary/35"
              >
                <option value="">Start from a template</option>
                {ASSIGNMENT_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            Back to queue
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!canManageWorkspace || !readyToSave || submittingKey === 'save-assignment'}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed ${
              canManageWorkspace && readyToSave
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border border-border/70 bg-background text-muted-foreground'
            }`}
          >
            {submittingKey === 'save-assignment' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {draftId ? 'Save assignment' : 'Create assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
