export const getAssignmentStateTone = (label: string): 'default' | 'success' | 'warn' | 'danger' => {
  if (label === 'Overdue' || label === 'Past due') return 'danger';
  if (label === 'Awaiting review' || label === 'Due this week' || label === 'Due soon' || label === 'Stalled') {
    return 'warn';
  }
  if (label === 'Active' || label === 'Live' || label === 'Scheduled') return 'success';
  return 'default';
};
