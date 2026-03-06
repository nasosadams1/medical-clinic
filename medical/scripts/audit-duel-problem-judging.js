import { duelProblemCatalog, duelProblemCounts } from '../data/duel-problem-catalog.js';
import { duelProblemJudgeContracts } from '../data/duel-problem-judge-contracts.js';

function fail(message) {
  throw new Error(message);
}

function contractFromTests(problem) {
  const validators = [...new Set((problem.test_cases || []).map((t) => t?.validator).filter(Boolean))];
  const compareModes = [...new Set((problem.test_cases || []).map((t) => t?.compare_mode).filter(Boolean))];
  return { validators, compareModes };
}

async function main() {
  const failures = [];

  if (duelProblemCounts.total !== 50) failures.push(`Expected 50 problems, found ${duelProblemCounts.total}`);

  for (const problem of duelProblemCatalog) {
    try {
      if (!problem.judge_contract || !problem.judge_contract.mode) {
        fail(`${problem.title}: missing judge_contract`);
      }

      const derived = contractFromTests(problem);
      const explicitContract = duelProblemJudgeContracts[problem.title] ?? null;

      if (derived.validators.length || derived.compareModes.length) {
        if (!explicitContract || explicitContract.explicit !== true) {
          fail(`${problem.title}: non-exact judging is used but no explicit contract is declared`);
        }
      }

      if (derived.validators.length) {
        if (problem.judge_contract.mode !== 'validator') {
          fail(`${problem.title}: expected validator contract mode`);
        }
        const actual = JSON.stringify([...derived.validators].sort());
        const declared = JSON.stringify([...(problem.judge_contract.validators || [])].sort());
        if (actual !== declared) {
          fail(`${problem.title}: validator contract mismatch ${declared} vs ${actual}`);
        }
      } else if (derived.compareModes.length) {
        if (problem.judge_contract.mode !== 'compare_mode') {
          fail(`${problem.title}: expected compare_mode contract mode`);
        }
        const actual = JSON.stringify([...derived.compareModes].sort());
        const declared = JSON.stringify([...(problem.judge_contract.compare_modes || [])].sort());
        if (actual !== declared) {
          fail(`${problem.title}: compare_mode contract mismatch ${declared} vs ${actual}`);
        }
      } else if (problem.judge_contract.mode !== 'exact_json') {
        fail(`${problem.title}: exact-output problem should use exact_json contract`);
      }
    } catch (error) {
      failures.push(String(error.message || error));
    }
  }

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Judge contract audit passed.');
  console.log(JSON.stringify({ total: duelProblemCatalog.length, explicitContracts: Object.keys(duelProblemJudgeContracts).length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
