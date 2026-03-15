import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLegalDocumentBySlug } from '../../../shared/legal-documents.js';
import { LEGAL_CONTENT } from '../../legal/legalContent';
import BrandLockup from '../branding/BrandLockup';

interface LegalDocumentPageProps {
  slug: 'terms' | 'privacy' | 'refunds';
}

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ slug }) => {
  const document = getLegalDocumentBySlug(slug);
  const content = LEGAL_CONTENT[slug];

  if (!document || !content) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <BrandLockup
            title="Codhak Legal"
            subtitle="Policies for account use, purchases, privacy, and support activity."
            className="max-w-lg"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Codhak
            </Link>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Version {content.version}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            <FileText className="h-4 w-4" />
            {content.title}
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">{content.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{content.summary}</p>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>Updated {content.updatedAt}</span>
            <span>/</span>
            <span>Applies to account use, purchases, and support activity</span>
          </div>

          <div className="mt-10 space-y-8">
            {content.sections.map((section) => (
              <section key={section.heading} className="border-t border-slate-100 pt-8 first:border-t-0 first:pt-0">
                <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
                <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentPage;

