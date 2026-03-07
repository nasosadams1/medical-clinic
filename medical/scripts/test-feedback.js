import assert from 'assert';
import {
  FeedbackSubmissionSchema,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
} from '../shared/feedback-contract.js';
import {
  buildFeedbackFingerprint,
  normalizeText,
  sanitizeFeedbackPayload,
  sanitizeFileName,
  sanitizeMetadata,
} from '../services/feedback/sanitize.js';

const normalized = normalizeText('  Hello\r\n\r\n\r\nworld\u0007  ', 100);
assert.equal(normalized, 'Hello\n\nworld');

const metadata = sanitizeMetadata({
  appVersion: ' 1.0.0 ',
  environment: 'production',
  userAgent: 'Mozilla/5.0',
  viewport: { width: 390, height: 844 },
  screen: { width: 1170, height: 2532, pixelRatio: 3 },
  ignored: 'value',
});
assert.deepEqual(metadata, {
  appVersion: '1.0.0',
  environment: 'production',
  userAgent: 'Mozilla/5.0',
  viewport: { width: 390, height: 844 },
  screen: { width: 1170, height: 2532, pixelRatio: 3 },
});

const cleanedPayload = sanitizeFeedbackPayload({
  type: 'bug_report',
  subject: '  Broken submit button ',
  message: '  The submit button stops working after opening the modal twice.  ',
  includeMetadata: true,
  metadata,
  attachments: [],
});
assert.equal(cleanedPayload.subject, 'Broken submit button');
assert.equal(cleanedPayload.message, 'The submit button stops working after opening the modal twice.');

const parsed = FeedbackSubmissionSchema.safeParse({
  ...cleanedPayload,
  attachments: [
    {
      name: 'capture.png',
      contentType: 'image/png',
      size: 1024,
      contentBase64: 'aGVsbG8=',
    },
  ],
});
assert.equal(parsed.success, true);

const invalid = FeedbackSubmissionSchema.safeParse({
  type: 'bug_report',
  subject: 'Bad',
  message: 'short',
  attachments: [
    {
      name: 'capture.exe',
      contentType: 'application/x-msdownload',
      size: FEEDBACK_MAX_ATTACHMENT_BYTES + 1,
      contentBase64: 'abc',
    },
  ],
});
assert.equal(invalid.success, false);

const fingerprintA = buildFeedbackFingerprint({
  userId: 'user-1',
  type: 'bug_report',
  subject: 'Login issue',
  message: 'The login form breaks on submit.',
});
const fingerprintB = buildFeedbackFingerprint({
  userId: 'user-1',
  type: 'bug_report',
  subject: '  login issue ',
  message: 'The login form breaks on submit.  ',
});
assert.equal(fingerprintA, fingerprintB);
assert.equal(sanitizeFileName('../../My Screenshot (final).png'), 'My-Screenshot-final-.png');

console.log('Feedback validation tests passed.');
