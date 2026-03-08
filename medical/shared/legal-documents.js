export const LEGAL_DOCUMENTS = {
  terms_of_service: {
    key: 'terms_of_service',
    slug: 'terms',
    title: 'Terms of Service',
    version: '2026-03-07',
    updatedAt: '2026-03-07',
    summary: 'Rules for using Codhak, account eligibility, acceptable use, purchases, and platform enforcement.',
  },
  privacy_policy: {
    key: 'privacy_policy',
    slug: 'privacy',
    title: 'Privacy Policy',
    version: '2026-03-07',
    updatedAt: '2026-03-07',
    summary: 'How Codhak collects, uses, stores, and protects account, billing, usage, and support data.',
  },
  refund_policy: {
    key: 'refund_policy',
    slug: 'refunds',
    title: 'Refund Policy',
    version: '2026-03-07',
    updatedAt: '2026-03-07',
    summary: 'Rules for digital purchases, non-refundable virtual goods, billing disputes, and support handling.',
  },
};

export const REQUIRED_LEGAL_DOCUMENT_KEYS = Object.keys(LEGAL_DOCUMENTS);

export const LEGAL_DOCUMENT_LIST = REQUIRED_LEGAL_DOCUMENT_KEYS.map((key) => LEGAL_DOCUMENTS[key]);

export const CURRENT_LEGAL_VERSIONS = LEGAL_DOCUMENT_LIST.reduce((accumulator, document) => {
  accumulator[document.key] = document.version;
  return accumulator;
}, {});

export function getLegalDocumentBySlug(slug) {
  return LEGAL_DOCUMENT_LIST.find((document) => document.slug === slug) || null;
}

export function getLegalDocumentByKey(key) {
  return LEGAL_DOCUMENTS[key] || null;
}
