// services/duel-problem-service.js
export class DuelProblemService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async getRandomActiveProblem() {
    const { data, error } = await this.supabase
      .from('duel_problems')
      .select('*')
      .eq('is_active', true);

    if (error || !data.length) {
      throw new Error('No active problems found');
    }

    const random = data[Math.floor(Math.random() * data.length)];
    return random;
  }

  async getTestCases(problemId) {
    const { data, error } = await this.supabase
      .from('duel_test_cases')
      .select('*')
      .eq('problem_id', problemId);

    if (error) throw error;

    return {
      samples: data.filter(t => t.is_sample),
      hidden: data.filter(t => !t.is_sample)
    };
  }
}