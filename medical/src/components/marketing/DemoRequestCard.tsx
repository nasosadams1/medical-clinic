import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../lib/analytics';
import { submitDemoRequest, type LeadIntent, type LeadSource } from '../../lib/leads';

interface DemoRequestCardProps {
  source: LeadSource;
  intent: LeadIntent;
  title: string;
  description: string;
  submitLabel?: string;
  defaultUseCase?: string;
}

const fieldClassName =
  'w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none';

export default function DemoRequestCard({
  source,
  intent,
  title,
  description,
  submitLabel = 'Request walkthrough',
  defaultUseCase = '',
}: DemoRequestCardProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: user?.email || '',
    company: '',
    teamSize: '',
    useCase: defaultUseCase,
    objective: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submittedAt) return;

    try {
      setIsSubmitting(true);
      trackEvent('demo_request_started', { source, intent });

      const result = await submitDemoRequest({
        ...form,
        source,
        intent,
      });

      setSubmittedAt(result.lead.createdAt);
      trackEvent('demo_request_submitted', {
        source,
        intent,
        teamSize: form.teamSize,
        useCase: form.useCase,
      });
      toast.success('Demo request received. You can now follow up from the backend lead queue.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not submit demo request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sales-ready flow</div>
      <h3 className="mt-3 text-2xl font-semibold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>

      {submittedAt ? (
        <div className="mt-6 rounded-2xl border border-xp/20 bg-xp/10 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-xp">
            <CheckCircle2 className="h-4 w-4" />
            Demo request submitted
          </div>
          <p className="mt-3 text-sm leading-7 text-foreground/80">
            This lead is now stored for follow-up. Use the request details to book a pilot, send a manual intro, or qualify the account.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="Full name"
              className={fieldClassName}
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="Work email"
              className={fieldClassName}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              value={form.company}
              onChange={(event) => updateField('company', event.target.value)}
              placeholder="Company or program"
              className={fieldClassName}
            />
            <input
              required
              value={form.teamSize}
              onChange={(event) => updateField('teamSize', event.target.value)}
              placeholder="Team size (e.g. 25 learners)"
              className={fieldClassName}
            />
          </div>
          <input
            required
            value={form.useCase}
            onChange={(event) => updateField('useCase', event.target.value)}
            placeholder="Use case (bootcamp cohort, upskilling team, university class)"
            className={fieldClassName}
          />
          <textarea
            required
            rows={4}
            value={form.objective}
            onChange={(event) => updateField('objective', event.target.value)}
            placeholder="What outcome do you need: benchmark a cohort, screen juniors, improve interview readiness, or prove skill growth?"
            className={fieldClassName}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-card transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>{isSubmitting ? 'Submitting request...' : submitLabel}</span>
          </button>
        </form>
      )}
    </div>
  );
}
