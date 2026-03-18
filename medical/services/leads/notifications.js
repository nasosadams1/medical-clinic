import { LEADS_NOTIFY_WEBHOOK_URL } from './config.js';

export const notifyLeadChannel = async (leadEntry) => {
  if (!LEADS_NOTIFY_WEBHOOK_URL) {
    return;
  }

  const payload = {
    event: 'sales_lead.created',
    lead: {
      id: leadEntry.id,
      status: leadEntry.status,
      source: leadEntry.source,
      intent: leadEntry.intent,
      name: leadEntry.name,
      email: leadEntry.email,
      company: leadEntry.company,
      teamSize: leadEntry.team_size,
      useCase: leadEntry.use_case,
      createdAt: leadEntry.created_at,
    },
  };

  try {
    const response = await fetch(LEADS_NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Lead notification webhook failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Lead notification webhook error:', error);
  }
};
