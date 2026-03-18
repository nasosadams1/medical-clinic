import nodemailer from 'nodemailer';
import {
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_REPLY_TO,
  SMTP_SECURE,
  SMTP_USER,
  isSmtpConfigured,
} from './config.js';

let transporterPromise = null;

const buildTransporter = async () => {
  if (!isSmtpConfigured()) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    ).catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }

  return transporterPromise;
};

const distinctEmails = (value) =>
  [...new Set((Array.isArray(value) ? value : [value]).map((entry) => String(entry || '').trim()).filter(Boolean))];

export const isEmailDeliveryConfigured = () => isSmtpConfigured();

export const sendTransactionalEmail = async ({
  to,
  cc,
  bcc,
  replyTo,
  subject,
  text,
  html,
}) => {
  const toList = distinctEmails(to);
  if (toList.length === 0) {
    return { delivered: false, skipped: true, reason: 'missing_recipient' };
  }

  const transporter = await buildTransporter();
  if (!transporter) {
    return { delivered: false, skipped: true, reason: 'smtp_not_configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: {
        name: SMTP_FROM_NAME,
        address: SMTP_FROM_EMAIL,
      },
      to: toList,
      cc: distinctEmails(cc),
      bcc: distinctEmails(bcc),
      replyTo: replyTo || SMTP_REPLY_TO || undefined,
      subject,
      text,
      html,
    });

    return {
      delivered: true,
      skipped: false,
      messageId: info.messageId || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  } catch (error) {
    console.error('Transactional email failed:', error);
    return {
      delivered: false,
      skipped: false,
      reason: error instanceof Error ? error.message : 'unknown_email_error',
    };
  }
};
