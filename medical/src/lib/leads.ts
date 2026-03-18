import { buildApiUrl, isApiNetworkError } from './apiBase';
import { supabase } from './supabase';

export type LeadSource = 'teams_page' | 'pricing_page' | 'benchmark_report' | 'general';
export type LeadIntent = 'team_demo' | 'teams_growth' | 'custom_plan' | 'interview_sprint' | 'pro_upgrade';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
export type LeadPriority = 'low' | 'medium' | 'high';

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

export interface SalesLeadEvent {
  id: string;
  lead_id: string;
  actor_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor_profile?: {
    id: string;
    name?: string | null;
    email?: string | null;
    current_avatar?: string | null;
  } | null;
}

export interface SalesLeadAdminEntry {
  id: string;
  user_id: string | null;
  lead_type: string;
  source: LeadSource;
  intent: LeadIntent;
  name: string;
  email: string;
  company: string;
  team_size: string;
  use_case: string;
  objective: string;
  status: LeadStatus;
  priority: LeadPriority;
  owner_user_id: string | null;
  last_contacted_at: string | null;
  next_step: string | null;
  qualification_notes: string | null;
  metadata: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
  user_profile?: {
    id: string;
    name?: string | null;
    email?: string | null;
    current_avatar?: string | null;
  } | null;
  owner_profile?: {
    id: string;
    name?: string | null;
    email?: string | null;
    current_avatar?: string | null;
  } | null;
  recent_events?: SalesLeadEvent[];
}

export interface UpdateSalesLeadInput {
  status?: LeadStatus;
  priority?: LeadPriority;
  nextStep?: string | null;
  qualificationNotes?: string | null;
  assignToSelf?: boolean;
  unassignOwner?: boolean;
  markContactedNow?: boolean;
}

const getAccessToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
};

const authorizedLeadFetch = async (path: string, init: RequestInit = {}) => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('You must be signed in to access the sales pipeline.');
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(`/api/leads${path}`), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers || {}),
      },
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the sales pipeline service right now.');
    }
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'Sales pipeline request failed.');
  }

  return payload;
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

export const fetchLeadAdminCapabilities = async () => {
  const payload = await authorizedLeadFetch('/admin/capabilities', { method: 'GET' });
  return { canReview: Boolean((payload as { canReview?: boolean }).canReview) };
};

export const fetchAdminSalesLeads = async (
  options: {
    status?: LeadStatus | 'all';
    intent?: LeadIntent | 'all';
    source?: LeadSource | 'all';
    priority?: LeadPriority | 'all';
    limit?: number;
  } = {}
): Promise<SalesLeadAdminEntry[]> => {
  const searchParams = new URLSearchParams();
  if (options.status && options.status !== 'all') {
    searchParams.set('status', options.status);
  }
  if (options.intent && options.intent !== 'all') {
    searchParams.set('intent', options.intent);
  }
  if (options.source && options.source !== 'all') {
    searchParams.set('source', options.source);
  }
  if (options.priority && options.priority !== 'all') {
    searchParams.set('priority', options.priority);
  }
  if (options.limit) {
    searchParams.set('limit', String(options.limit));
  }

  const payload = await authorizedLeadFetch(`/admin${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
    method: 'GET',
  });

  return ((payload as { entries?: SalesLeadAdminEntry[] }).entries || []) as SalesLeadAdminEntry[];
};

export const updateSalesLead = async (leadId: string, input: UpdateSalesLeadInput) => {
  const payload = await authorizedLeadFetch(`/admin/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

  return payload as { entry: SalesLeadAdminEntry };
};
