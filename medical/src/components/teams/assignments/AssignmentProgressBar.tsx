import React from 'react';

export function AssignmentProgressBar({
  completed,
  inProgress,
  notStarted,
}: {
  completed: number;
  inProgress: number;
  notStarted: number;
}) {
  const total = completed + inProgress + notStarted;
  const completedWidth = total > 0 ? (completed / total) * 100 : 0;
  const inProgressWidth = total > 0 ? (inProgress / total) * 100 : 0;
  const notStartedWidth = total > 0 ? (notStarted / total) * 100 : 100;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-secondary">
      <div className="flex h-full w-full">
        <div className="bg-emerald-400/90" style={{ width: `${completedWidth}%` }} />
        <div className="bg-primary/90" style={{ width: `${inProgressWidth}%` }} />
        <div className="bg-secondary-foreground/20" style={{ width: `${notStartedWidth}%` }} />
      </div>
    </div>
  );
}
