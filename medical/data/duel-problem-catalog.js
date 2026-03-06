import { easyDuelProblems } from './duel-problems-easy.js';
import { mediumDuelProblems } from './duel-problems-medium.js';
import { hardDuelProblems } from './duel-problems-hard.js';
import { duelProblemJudgeContracts } from './duel-problem-judge-contracts.js';

const baseCatalog = [
  ...easyDuelProblems,
  ...mediumDuelProblems,
  ...hardDuelProblems,
];

export const duelProblemCatalog = baseCatalog.map((problem) => ({
  ...problem,
  judge_contract: duelProblemJudgeContracts[problem.title] ?? problem.judge_contract ?? { mode: 'exact_json', explicit: false },
}));

export const duelProblemCounts = {
  easy: easyDuelProblems.length,
  medium: mediumDuelProblems.length,
  hard: hardDuelProblems.length,
  total: duelProblemCatalog.length,
};
