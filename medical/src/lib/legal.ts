import { CURRENT_LEGAL_VERSIONS, LEGAL_DOCUMENT_LIST } from '../../shared/legal-documents.js';
import { supabase } from './supabase';
import { buildApiUrl, isApiNetworkError } from './apiBase';
const PENDING_LEGAL_ACCEPTANCE_KEY = 'codhak-pending-legal-acceptance';

export type LegalSource = 'signup' | 'checkout' | 'account';

export interface LegalStatusResponse {
  documents: Array<{
    key: string;
    slug: string;
    title: string;
    version: string;
    updatedAt: string;
    summary: string;
  }>;
  acceptances: Record<string, { version: string | null; acceptedAt: string | null; isCurrent: boolean }>;
  allCurrentAccepted: boolean;
  latestAcceptedAt: string | null;
}

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to manage legal settings.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export function getLegalDocumentLinks() {
  return LEGAL_DOCUMENT_LIST.map((document) => ({
    key: document.key,
    title: document.title,
    href: `/${document.slug}`,
    version: document.version,
    updatedAt: document.updatedAt,
  }));
}

export function savePendingLegalAcceptance(source: LegalSource) {
  localStorage.setItem(
    PENDING_LEGAL_ACCEPTANCE_KEY,
    JSON.stringify({
      source,
      versions: CURRENT_LEGAL_VERSIONS,
      createdAt: new Date().toISOString(),
    })
  );
}

export function clearPendingLegalAcceptance() {
  localStorage.removeItem(PENDING_LEGAL_ACCEPTANCE_KEY);
}

export async function fetchLegalStatus(): Promise<LegalStatusResponse> {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/legal/status'), {
      method: 'GET',
      headers: await getAuthHeaders(),
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the legal service.');
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Could not load legal status.');
  }

  return payload as LegalStatusResponse;
}

export async function acceptLatestLegalDocuments(source: LegalSource, documentKeys?: string[]) {
  let response: Response;

  try {
    response = await fetch(buildApiUrl('/api/legal/accept'), {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ source, documentKeys }),
    });
  } catch (error) {
    if (isApiNetworkError(error)) {
      throw new Error('Could not reach the legal service.');
    }

    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Could not record legal acceptance.');
  }

  clearPendingLegalAcceptance();
  return payload as LegalStatusResponse;
}

export async function flushPendingLegalAcceptanceIfNeeded() {
  const rawValue = localStorage.getItem(PENDING_LEGAL_ACCEPTANCE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const pending = JSON.parse(rawValue) as { source?: LegalSource } | null;
    return await acceptLatestLegalDocuments(pending?.source || 'signup');
  } catch (error) {
    console.error('Failed to flush pending legal acceptance:', error);
    return null;
  }
}
