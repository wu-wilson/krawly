import React from 'react';

import { Button } from '../UI/Button';
import { EmptyState } from './EmptyState';

import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useCrawlStore } from '../../store/crawlStore';

import { noMatchCopy } from './emptyCopy';

interface NoMatchesProps {
  /** Additional classes, typically a background */
  className?: string;
}

/**
 * The empty state for filters that match nothing, with a button that clears them.
 * @param props - Classes
 * @returns Empty state for the current filters
 */
export const NoMatches: React.FC<NoMatchesProps> = ({ className }) => {
  const filter = useCrawlStore((s) => s.filter);
  const phone = useMediaQuery(PHONE_QUERY);
  const clearFilters = useCrawlStore((s) => s.clearFilters);
  const copy = noMatchCopy(filter);

  return (
    <EmptyState
      title={copy.title}
      body={copy.body}
      className={className}
      actions={
        <Button variant="secondary" size={phone ? 'touch' : 'lg'} onClick={clearFilters}>
          Clear filters
        </Button>
      }
    />
  );
};
