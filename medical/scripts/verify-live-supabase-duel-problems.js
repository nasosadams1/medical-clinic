import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JudgeService } from '../services/judge.js';
import { duelProblemCatalog, duelProblemCounts } from '../data/duel-problem-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for live verification.');

const supabase = createClient(supabaseUrl, serviceRoleKey);

function parseMaybeJson(value, fallback) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value ?? fallback;
}

async function main() {
  const judge = new JudgeService();
  const { data, error } = await supabase
    .from('problems')
    .select('id, title, difficulty, reference_solution_javascript, test_cases')
    .order('title', { ascending: true });

  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Supabase did not return a problem array.');
  if (data.length !== duelProblemCounts.total) {
    throw new Error(`Expected ${duelProblemCounts.total} seeded problems, found ${data.length} in Supabase.`);
  }

  const localTitles = new Set(duelProblemCatalog.map((p) => p.title));
  const failures = [];

  for (const problem of data) {
    try {
      if (!localTitles.has(problem.title)) {
        throw new Error(`Unexpected problem in DB: ${problem.title}`);
      }
      const testCases = parseMaybeJson(problem.test_cases, []);
      const referenceSolution = (problem.reference_solution_javascript || '').trim();
      if (!referenceSolution) {
        throw new Error('Missing reference solution');
      }
      if (!Array.isArray(testCases) || testCases.length < 5) {
        throw new Error(`Expected at least 5 test cases, found ${Array.isArray(testCases) ? testCases.length : 0}`);
      }

      const result = await judge.executeCode(referenceSolution, 'javascript', testCases);
      if (!(result.result === 'Accepted' && result.passed === result.total)) {
        failures.push({
          title: problem.title,
          id: problem.id,
          difficulty: problem.difficulty,
          result,
        });
      }
    } catch (error) {
      failures.push({
        title: problem.title,
        id: problem.id,
        difficulty: problem.difficulty,
        error: String(error.message || error),
      });
    }
  }

  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log('Live Supabase duel problem verification passed.');
  console.log(JSON.stringify({ verified: data.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
