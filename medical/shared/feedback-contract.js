import { z } from 'zod';

export const FEEDBACK_TYPES = ['bug_report', 'feature_request', 'general_feedback'];
export const FEEDBACK_STATUSES = ['new', 'in_review', 'resolved'];
export const FEEDBACK_ALLOWED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
];

export const FEEDBACK_MAX_SUBJECT_LENGTH = 160;
export const FEEDBACK_MAX_MESSAGE_LENGTH = 5000;
export const FEEDBACK_MIN_SUBJECT_LENGTH = 4;
export const FEEDBACK_MIN_MESSAGE_LENGTH = 20;
export const FEEDBACK_MAX_ATTACHMENTS = 3;
export const FEEDBACK_MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

export const FeedbackMetadataSchema = z
  .object({
    appVersion: z.string().max(64).optional(),
    environment: z.string().max(64).optional(),
    page: z.string().max(256).optional(),
    userAgent: z.string().max(1024).optional(),
    platform: z.string().max(128).optional(),
    language: z.string().max(32).optional(),
    timezone: z.string().max(64).optional(),
    locale: z.string().max(64).optional(),
    viewport: z
      .object({
        width: z.number().int().positive().max(10000),
        height: z.number().int().positive().max(10000),
      })
      .optional(),
    screen: z
      .object({
        width: z.number().int().positive().max(10000),
        height: z.number().int().positive().max(10000),
        pixelRatio: z.number().positive().max(10).optional(),
      })
      .optional(),
  })
  .strict();

export const FeedbackAttachmentSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    contentType: z.enum(FEEDBACK_ALLOWED_ATTACHMENT_TYPES),
    size: z.number().int().positive().max(FEEDBACK_MAX_ATTACHMENT_BYTES),
    contentBase64: z.string().trim().min(1).max(Math.ceil(FEEDBACK_MAX_ATTACHMENT_BYTES * 1.5)),
  })
  .strict();

export const FeedbackSubmissionSchema = z
  .object({
    type: z.enum(FEEDBACK_TYPES),
    subject: z.string().trim().min(FEEDBACK_MIN_SUBJECT_LENGTH).max(FEEDBACK_MAX_SUBJECT_LENGTH),
    message: z.string().trim().min(FEEDBACK_MIN_MESSAGE_LENGTH).max(FEEDBACK_MAX_MESSAGE_LENGTH),
    includeMetadata: z.boolean().optional().default(false),
    metadata: FeedbackMetadataSchema.optional(),
    attachments: z.array(FeedbackAttachmentSchema).max(FEEDBACK_MAX_ATTACHMENTS).optional().default([]),
  })
  .strict();

export const FeedbackStatusUpdateSchema = z
  .object({
    status: z.enum(FEEDBACK_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
