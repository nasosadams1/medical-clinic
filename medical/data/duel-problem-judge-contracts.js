export const duelProblemJudgeContracts = {
  "Hopper's Packet Pair": {
    mode: 'validator',
    validators: ['two_sum'],
    explicit: true,
    rationale: 'Any valid index pair should pass as long as it satisfies the target sum and index constraints.'
  },
  "McClintock's Segment Merge": {
    mode: 'compare_mode',
    compare_modes: ['interval_set'],
    explicit: true,
    rationale: 'Merged intervals should be judged after interval normalization, not by raw formatting or ordering.'
  }
};
