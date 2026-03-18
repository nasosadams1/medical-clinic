import { useEffect } from 'react';

type PageMetadata = {
  title: string;
  description: string;
};

const DEFAULT_DESCRIPTION =
  'Measure real coding skill with hands-on benchmarks, interview-style practice, live duels, and cohort-ready reporting.';

export const setPageMetadata = ({ title, description }: PageMetadata) => {
  if (typeof document === 'undefined') return;

  document.title = title;

  const resolvedDescription = description || DEFAULT_DESCRIPTION;
  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    document.head.appendChild(descriptionTag);
  }

  descriptionTag.setAttribute('content', resolvedDescription);
};

export const usePageMetadata = (metadata: PageMetadata) => {
  useEffect(() => {
    setPageMetadata(metadata);
  }, [metadata.description, metadata.title]);
};
