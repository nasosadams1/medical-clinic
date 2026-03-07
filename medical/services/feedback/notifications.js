import { FEEDBACK_NOTIFY_WEBHOOK_URL } from './config.js';

export const notifyFeedbackChannel = async (feedbackEntry) => {
  if (!FEEDBACK_NOTIFY_WEBHOOK_URL) {
    return;
  }

  const payload = {
    event: 'feedback.created',
    feedback: {
      id: feedbackEntry.id,
      type: feedbackEntry.type,
      status: feedbackEntry.status,
      subject: feedbackEntry.subject,
      userId: feedbackEntry.user_id,
      createdAt: feedbackEntry.created_at,
      attachmentsCount: feedbackEntry.attachments_count || 0,
    },
  };

  try {
    const response = await fetch(FEEDBACK_NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Feedback notification webhook failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Feedback notification webhook error:', error);
  }
};
