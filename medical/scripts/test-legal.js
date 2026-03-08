import assert from 'node:assert/strict';
import { CURRENT_LEGAL_VERSIONS, LEGAL_DOCUMENT_LIST, REQUIRED_LEGAL_DOCUMENT_KEYS, getLegalDocumentBySlug } from '../shared/legal-documents.js';

assert.equal(LEGAL_DOCUMENT_LIST.length, 3, 'Expected three legal documents');
assert.deepEqual([...REQUIRED_LEGAL_DOCUMENT_KEYS].sort(), ['privacy_policy', 'refund_policy', 'terms_of_service']);
assert.equal(getLegalDocumentBySlug('terms')?.key, 'terms_of_service');
assert.equal(getLegalDocumentBySlug('privacy')?.key, 'privacy_policy');
assert.equal(getLegalDocumentBySlug('refunds')?.key, 'refund_policy');
assert.ok(CURRENT_LEGAL_VERSIONS.terms_of_service, 'Terms version missing');
assert.ok(CURRENT_LEGAL_VERSIONS.privacy_policy, 'Privacy version missing');
assert.ok(CURRENT_LEGAL_VERSIONS.refund_policy, 'Refund version missing');

console.log('Legal document metadata tests passed.');
