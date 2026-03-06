import { duelProblemCatalog, duelProblemCounts } from '../data/duel-problem-catalog.js';
import { JudgeService } from '../services/judge.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('Verifying duel problem catalog...');
  assert(duelProblemCounts.total === 50, `Expected 50 problems, found ${duelProblemCounts.total}`);
  assert(duelProblemCounts.easy === 20, `Expected 20 easy problems, found ${duelProblemCounts.easy}`);
  assert(duelProblemCounts.medium === 20, `Expected 20 medium problems, found ${duelProblemCounts.medium}`);
  assert(duelProblemCounts.hard === 10, `Expected 10 hard problems, found ${duelProblemCounts.hard}`);

  const titles = new Set();
  const judge = new JudgeService();
  const failures = [];

  for (const [index, problem] of duelProblemCatalog.entries()) {
    try {
      assert(problem.title, `Problem ${index + 1} missing title`);
      assert(!titles.has(problem.title), `Duplicate title: ${problem.title}`);
      titles.add(problem.title);
      assert(Array.isArray(problem.test_cases) && problem.test_cases.length >= 5, `${problem.title} must have at least 5 test cases`);
      assert(problem.reference_solution_javascript, `${problem.title} missing JS reference solution`);
      assert(problem.difficulty === 'easy' || problem.difficulty === 'medium' || problem.difficulty === 'hard', `${problem.title} has invalid difficulty`);

      const result = await judge.executeCode(problem.reference_solution_javascript, 'javascript', problem.test_cases);
      if (!(result.result === 'Accepted' && result.passed === result.total)) {
        failures.push({ title: problem.title, result });
      }
    } catch (error) {
      failures.push({ title: problem.title || `Problem ${index + 1}`, error: String(error) });
    }
  }

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('All duel problems verified successfully.');
  console.log(JSON.stringify(duelProblemCounts));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
