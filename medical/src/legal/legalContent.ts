import { LEGAL_DOCUMENTS } from '../../shared/legal-documents.js';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocumentContent {
  title: string;
  version: string;
  updatedAt: string;
  summary: string;
  sections: LegalSection[];
}

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@codhakmailserver.online';
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Codhak';

export const LEGAL_CONTENT: Record<string, LegalDocumentContent> = {
  terms: {
    title: LEGAL_DOCUMENTS.terms_of_service.title,
    version: LEGAL_DOCUMENTS.terms_of_service.version,
    updatedAt: LEGAL_DOCUMENTS.terms_of_service.updatedAt,
    summary: LEGAL_DOCUMENTS.terms_of_service.summary,
    sections: [
      {
        heading: '1. Scope',
        paragraphs: [
          `${COMPANY_NAME} provides coding lessons, competitive duels, virtual goods, feedback tools, and account-based progression. These terms govern use of the app, website, and any related services.`,
          `By creating an account, purchasing virtual goods, or continuing to use the service after an update to these terms, you agree to the version published on this page.`,
        ],
      },
      {
        heading: '2. Accounts and eligibility',
        paragraphs: [
          'You must provide accurate account information and keep your login credentials secure.',
          'You are responsible for all actions that take place through your account. We may suspend or terminate accounts that are fraudulent, abusive, or used to violate these terms.',
        ],
      },
      {
        heading: '3. Acceptable use',
        paragraphs: [
          'Do not use bots, scripts, exploits, account sharing, multi-accounting, or any other method to manipulate rankings, rewards, purchases, or duel outcomes.',
          'During live duels, do not use external solver assistance, including AI coding tools, answer-sharing, coordinated help from other people, or any automated system that produces or improves solutions for you in real time.',
          'Do not attempt to reverse engineer, attack, or disrupt the service, payment flows, or other users.',
        ],
      },
      {
        heading: '4. Virtual goods and payments',
        paragraphs: [
          'Coins, boosts, hearts, and avatars are digital items licensed for in-app use only. They have no cash value, are non-transferable, and may not be redeemed for money.',
          'Prices, offers, and availability may change. Purchases are charged through the configured payment provider. You are responsible for any taxes, bank fees, or card charges that apply to your transaction.',
        ],
      },
      {
        heading: '5. Competitive integrity',
        paragraphs: [
          'Matchmaking, duel ratings, disconnection handling, anti-cheat controls, and submission validation rules are part of the competitive rules of the platform and may be updated to preserve fairness.',
          'We may investigate suspicious matches, repeated disconnect patterns, collusion, multi-accounting, scripted play, unusual submission behavior, and external-assistance signals.',
          'We may correct ratings, void results, remove rewards, revoke duel access, or suspend accounts when we detect abuse, fraud, or technical exploitation.',
        ],
      },
      {
        heading: '6. Content and intellectual property',
        paragraphs: [
          'The service, including lesson content, problems, software, design, and branding, is owned by or licensed to the operator of the platform.',
          'You may not copy, resell, republish, or redistribute platform content except as explicitly allowed by law or by written permission.',
        ],
      },
      {
        heading: '7. Service availability',
        paragraphs: [
          'The service may change, be interrupted, or be unavailable from time to time. We may modify features, content, and reward systems as needed for security, quality, or operational reasons.',
          'We do not guarantee uninterrupted availability or error-free operation.',
        ],
      },
      {
        heading: '8. Liability and contact',
        paragraphs: [
          'To the maximum extent allowed by law, the service is provided on an as-is basis and liability is limited to the amounts you paid for the affected service in the prior twelve months.',
          `For support, billing questions, or legal notices, contact ${SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  privacy: {
    title: LEGAL_DOCUMENTS.privacy_policy.title,
    version: LEGAL_DOCUMENTS.privacy_policy.version,
    updatedAt: LEGAL_DOCUMENTS.privacy_policy.updatedAt,
    summary: LEGAL_DOCUMENTS.privacy_policy.summary,
    sections: [
      {
        heading: '1. Data we collect',
        paragraphs: [
          'We collect account data such as email address, username, profile metadata, authentication events, and verification state.',
          'We also collect service usage data such as lesson progress, duel results, feedback submissions, support actions, device metadata you choose to include, and payment-related identifiers returned by the payment provider.',
        ],
      },
      {
        heading: '2. Why we use it',
        paragraphs: [
          'We use data to operate accounts, protect the service, process purchases, restore access, investigate abuse, improve features, and provide support.',
          'We may use operational logs and feedback metadata to debug issues and secure the platform.',
        ],
      },
      {
        heading: '3. Payments',
        paragraphs: [
          'Payment card details are processed by the configured payment provider and are not stored directly by the app backend.',
          'We store only the identifiers and fulfillment records needed to confirm purchases, prevent duplicates, and resolve disputes.',
        ],
      },
      {
        heading: '4. Sharing',
        paragraphs: [
          'We share data only with service providers necessary to operate the app, such as authentication, hosting, storage, email, and payments.',
          'We may also disclose information when required by law, to enforce platform rules, or to protect users and the service.',
        ],
      },
      {
        heading: '5. Retention',
        paragraphs: [
          'We retain account, purchase, and support records for as long as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.',
          'Some data may persist in backups, audit logs, or fraud-prevention records for limited periods.',
        ],
      },
      {
        heading: '6. Your choices',
        paragraphs: [
          'You can update your display name, request password recovery, request an email change, and contact support about your data.',
          `For privacy requests or questions, contact ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        heading: '7. Security',
        paragraphs: [
          'We use layered controls such as authentication, access checks, validation, rate limiting, audit logging, and backend fulfillment for sensitive actions.',
          'No system is perfectly secure, so you should also protect your password and devices.',
        ],
      },
    ],
  },
  refunds: {
    title: LEGAL_DOCUMENTS.refund_policy.title,
    version: LEGAL_DOCUMENTS.refund_policy.version,
    updatedAt: LEGAL_DOCUMENTS.refund_policy.updatedAt,
    summary: LEGAL_DOCUMENTS.refund_policy.summary,
    sections: [
      {
        heading: '1. Digital purchase policy',
        paragraphs: [
          'Coins, boosts, hearts, avatars, and other digital items are generally fulfilled immediately after payment confirmation.',
          'Because these are digital goods that can be consumed instantly, purchases are generally non-refundable except where required by law or where a purchase was not delivered correctly.',
        ],
      },
      {
        heading: '2. When we will review a refund request',
        paragraphs: [
          'We will review requests for duplicate charges, technical fulfillment failures, unauthorized purchases, or other billing errors supported by account and payment records.',
          'Requests should be made promptly and should include the account email, approximate purchase time, and any payment receipt or reference you have.',
        ],
      },
      {
        heading: '3. Chargebacks and abuse',
        paragraphs: [
          'If you file a chargeback while retaining delivered digital goods or while an investigation is pending, we may suspend the account, remove access to purchased items, or reverse associated in-app benefits where legally permitted.',
          'Fraudulent or abusive refund activity may result in account restrictions, transaction review, or permanent store access removal.',
        ],
      },
      {
        heading: '4. Support channel',
        paragraphs: [
          `For billing and refund questions, contact ${SUPPORT_EMAIL}.`,
          'We will review each case against account records, fulfillment records, and payment provider records.',
        ],
      },
    ],
  },
};
