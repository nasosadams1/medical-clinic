import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { duelProblemCatalog, duelProblemCounts } from './data/duel-problem-catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('SUPABASE_URL or VITE_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for reset seeding.');

if (duelProblemCounts.total !== 50) {
  throw new Error(`Expected 50 duel problems, found ${duelProblemCounts.total}.`);
}
if (duelProblemCounts.easy !== 20 || duelProblemCounts.medium !== 20 || duelProblemCounts.hard !== 10) {
  throw new Error(`Unexpected difficulty split: ${JSON.stringify(duelProblemCounts)}`);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function clearTableIfExists(tableName) {
  const { error } = await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (
    error &&
    error.code !== 'PGRST205' &&
    !/relation .* does not exist/i.test(error.message || '') &&
    !/could not find the table/i.test(error.message || '')
  ) {
    throw error;
  }
}

function toDatabaseProblem(problem) {
  const { judge_contract, ...dbProblem } = problem;
  return dbProblem;
}

async function insertInBatches(tableName, rows, batchSize = 10) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize).map(toDatabaseProblem);
    const { error } = await supabase.from(tableName).insert(batch);
    if (error) throw error;
    console.log(`Inserted ${Math.min(i + batch.length, rows.length)}/${rows.length} problems`);
  }
}

async function main() {
  console.log('Resetting duel problems...');
  await clearTableIfExists('match_events');
  await clearTableIfExists('submissions');
  await clearTableIfExists('matches');
  await clearTableIfExists('test_cases');
  await clearTableIfExists('duel_test_cases');
  await clearTableIfExists('duel_problems');
  await clearTableIfExists('problems');

  await insertInBatches('problems', duelProblemCatalog, 10);

  console.log('Seed complete.');
  console.log(JSON.stringify(duelProblemCounts));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
