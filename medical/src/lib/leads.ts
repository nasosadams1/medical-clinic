import { buildApiUrl } from './apiBase';
import { supabase } from './supabase';

export type LeadSource = 'teams_page' | 'pricing_page' | 'benchmark_report' | 'general';
export type LeadIntent = 'team_demo' | 'teams_growth' | 'custom_plan' | 'interview_sprint' | 'pro_upgrade';

export interface DemoLeadInput {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  useCase: string;
  objective: string;
  source?: LeadSource;
  intent?: LeadIntent;
}

const getAccessToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
};

export const submitDemoRequest = async (input: DemoLeadInput) => {
  const accessToken = await getAccessToken();
  const response = await fetch(buildApiUrl('/api/leads/demo-request'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Could not submit demo request.');
  }

  return payload as { lead: { id: string; createdAt: string } };
};
