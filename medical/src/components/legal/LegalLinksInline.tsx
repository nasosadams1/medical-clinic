import React from 'react';
import { Link } from 'react-router-dom';

interface LegalLinksInlineProps {
  className?: string;
}

const linkClassName = 'font-medium text-blue-600 transition hover:text-blue-700 underline underline-offset-2';

const LegalLinksInline: React.FC<LegalLinksInlineProps> = ({ className = '' }) => {
  return (
    <span className={className}>
      <Link to="/terms" target="_blank" rel="noreferrer" className={linkClassName}>Terms of Service</Link>
      {' · '}
      <Link to="/privacy" target="_blank" rel="noreferrer" className={linkClassName}>Privacy Policy</Link>
      {' · '}
      <Link to="/refunds" target="_blank" rel="noreferrer" className={linkClassName}>Refund Policy</Link>
    </span>
  );
};

export default LegalLinksInline;
