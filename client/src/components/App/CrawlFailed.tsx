import React from 'react';

import { Button } from '../UI/Button';
import { DOT_GRID } from '../UI/styles';
import { EmptyState } from './EmptyState';

import { useCrawlHosts } from '../../hooks/useCrawlHosts';
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { selectRoot, useCrawlStore } from '../../store/crawlStore';

import { rootFailedCopy } from './emptyCopy';

interface CrawlFailedProps {
  /** Crawl the same address again */
  onRetry: () => void;
  /** Return to the landing page with the address ready to edit */
  onChangeAddress: () => void;
}

/**
 * The failure state that replaces the map and report when the start page itself failed, so there was nothing to crawl.
 * @param props - Retry and change-address handlers
 * @returns Failure state, or nothing before the start page exists
 */
export const CrawlFailed: React.FC<CrawlFailedProps> = ({ onRetry, onChangeAddress }) => {
  const root = useCrawlStore(selectRoot);
  const phone = useMediaQuery(PHONE_QUERY);
  const { host } = useCrawlHosts();
  if (!root) return null;
  const copy = rootFailedCopy(root, host);

  return (
    <EmptyState
      title={copy.title}
      body={copy.body}
      className={DOT_GRID}
      actions={
        <>
          <Button variant="primary" size={phone ? 'touch' : 'lg'} icon="refresh" onClick={onRetry}>
            Try again
          </Button>
          <Button variant="secondary" size={phone ? 'touch' : 'lg'} onClick={onChangeAddress}>
            Change address
          </Button>
        </>
      }
    />
  );
};
