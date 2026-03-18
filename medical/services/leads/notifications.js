import { SALES_NOTIFICATION_EMAILS } from '../email/config.js';
import { sendTransactionalEmail, isEmailDeliveryConfigured } from '../email/mailer.js';
import { buildLeadNotificationEmail } from '../email/templates.js';
import { LEADS_NOTIFY_WEBHOOK_URL } from './config.js';

export const isLeadEmailNotificationConfigured = () =>
  isEmailDeliveryConfigured() && SALES_NOTIFICATION_EMAILS.length > 0;

export const isLeadWebhookNotificationConfigured = () => Boolean(LEADS_NOTIFY_WEBHOOK_URL);

export const notifyLeadChannel = async (leadEntry) => {
  const results = {
    webhookDelivered: false,
    emailDelivered: false,
  };

  if (LEADS_NOTIFY_WEBHOOK_URL) {
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
      } else {
        results.webhookDelivered = true;
      }
    } catch (error) {
      console.error('Lead notification webhook error:', error);
    }
  }

  if (isLeadEmailNotificationConfigured()) {
    const emailPayload = buildLeadNotificationEmail(leadEntry);
    const delivery = await sendTransactionalEmail({
      to: SALES_NOTIFICATION_EMAILS,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html,
      replyTo: leadEntry.email || undefined,
    });

    if (delivery.delivered) {
      results.emailDelivered = true;
    }
  }

  return results;
};
