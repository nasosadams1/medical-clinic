import React from 'react';
import { StatusPill } from '../reviewUi';
import { AssignmentEditorViewModel } from './editorModel';

interface AssignmentEditorPreviewProps {
  viewModel: AssignmentEditorViewModel;
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}

export function AssignmentEditorPreview({
  viewModel,
}: AssignmentEditorPreviewProps) {
  return (
    <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
      <div className="rounded-[1.15rem] border border-border/65 bg-background/72 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">Publish snapshot</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">{viewModel.statusDetail}</div>
          </div>
          <StatusPill tone={viewModel.statusTone}>{viewModel.statusLabel}</StatusPill>
        </div>

        <div className="mt-3.5 border-t border-border/60 pt-3.5">
          <div className="text-xs font-medium text-muted-foreground">Learners will see</div>
          <div
            className={`mt-2 break-words text-lg font-semibold leading-tight ${
              viewModel.previewTitle ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {viewModel.previewTitle || 'Title required before saving'}
          </div>
          <div className="mt-2 text-sm leading-[1.55] text-muted-foreground">
            {viewModel.previewDescription || 'No learner-facing description yet.'}
          </div>
        </div>

        <div className="mt-3.5 grid gap-2.5 border-t border-border/60 pt-3.5">
          <PreviewRow label="Assignment" value={viewModel.publishSummary} />
          <PreviewRow label="Audience" value={viewModel.audienceLabel} />
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-muted-foreground">Due</div>
              <StatusPill tone={viewModel.dueStatusTone}>{viewModel.dueStatusLabel}</StatusPill>
            </div>
            <div className="text-sm leading-6 text-foreground">{viewModel.dueValue}</div>
          </div>
        </div>

        {viewModel.blockingIssues.length > 0 ? (
          <div className="mt-3.5 border-t border-border/60 pt-3.5">
            <div className="text-sm font-semibold text-foreground">Save check</div>
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-muted-foreground">
              {viewModel.blockingIssues.map((issue) => (
                <li key={issue}>- {issue}</li>
              ))}
            </ul>
          </div>
        ) : viewModel.advisory ? (
          <div className="mt-3.5 border-t border-border/60 pt-3.5">
            <div className="text-sm font-semibold text-foreground">Note</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground">{viewModel.advisory}</div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
