import React from 'react';
import { BarChart3, CalendarDays, Crown, Mail, TrendingUp, Users } from 'lucide-react';
import { teamUseCases } from '../../data/siteContent';

interface TeamsWorkspaceProps {
  mode?: 'public' | 'app';
}

const demoMembers = [
  { name: 'Maya P.', score: 82, status: 'Benchmarked', streak: 7 },
  { name: 'Jon A.', score: 74, status: 'Practice path active', streak: 5 },
  { name: 'Priya S.', score: 68, status: 'Needs roadmap review', streak: 3 },
  { name: 'Noah T.', score: 61, status: 'Benchmark pending follow-up', streak: 2 },
];

const assignmentPacks = [
  { title: 'Python Fundamentals Benchmark', due: 'This week', type: 'Benchmark', completion: '72%' },
  { title: 'Junior Screening Challenge Pack', due: 'Next week', type: 'Challenge pack', completion: '48%' },
  { title: 'Practice path: Arrays & control flow', due: 'Active', type: 'Roadmap', completion: '55%' },
];

export default function TeamsWorkspace({ mode = 'public' }: TeamsWorkspaceProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
              {mode === 'public' ? 'Demo cohort workspace' : 'Pilot cohort workspace'}
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Benchmark a cohort. Track proof of progress.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Use Codhak to benchmark learners quickly, assign practice paths, run competitions, and keep one shared view of improvement over time.
            </p>
          </div>
          <div className="grid gap-3 sm:min-w-[220px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active learners</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">24</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Median score</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">71/100</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Users className="h-4 w-4 text-sky-600" />
              Benchmark completion
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">83%</div>
            <p className="mt-1 text-sm text-slate-500">20 of 24 learners have completed the benchmark.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Avg. improvement
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">+12 pts</div>
            <p className="mt-1 text-sm text-slate-500">Tracked across current practice paths.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Crown className="h-4 w-4 text-violet-600" />
              Top performer
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">Maya P.</div>
            <p className="mt-1 text-sm text-slate-500">82/100 score with a 7-day practice streak.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <BarChart3 className="h-4 w-4 text-sky-600" />
              Members
            </div>
            <ul className="mt-4 space-y-3">
              {demoMembers.map((member) => (
                <li key={member.name} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{member.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{member.score}/100</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{member.streak}d streak</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.75rem] border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                <CalendarDays className="h-4 w-4 text-amber-600" />
                Assignment packs
              </div>
              <ul className="mt-4 space-y-3">
                {assignmentPacks.map((assignment) => (
                  <li key={assignment.title} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{assignment.title}</div>
                    <div className="mt-1 flex items-center justify-between text-sm text-slate-500">
                      <span>{assignment.type}</span>
                      <span>{assignment.completion} complete</span>
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{assignment.due}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Invite and join flow</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                MVP boundary: this workspace is ready for pilot conversations. Real cohort persistence and invites can connect to auth/user records next.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <Mail className="h-4 w-4" />
                <span>{mode === 'public' ? 'Request pilot walkthrough' : 'Invite cohort placeholder'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="grid gap-4">
        {teamUseCases.map((useCase) => (
          <div key={useCase.slug} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{useCase.title}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{useCase.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {useCase.outcomes.map((outcome) => (
                <li key={outcome} className="rounded-2xl bg-slate-50 px-4 py-3">
                  {outcome}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}
