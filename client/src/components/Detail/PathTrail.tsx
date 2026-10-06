import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { FOCUS_RING, HOVER_TRANSITION } from '../UI/styles';

import { useCrawlStore } from '../../store/crawlStore';

import { displayPath } from '../../engine/statusText';

import type { CrawlNode } from '../../engine/types';

interface PathTrailProps {
  /** The selected page */
  node: CrawlNode;
  /** Host that paths are shown relative to */
  scopeHost: string;
  /** Use 32px rows for touch */
  touch: boolean;
}

/**
 * The chain of pages from the start page to this one, drawn as a thin tree line. Earlier steps select their page.
 * @param props - Selected page, the host for display paths, and touch sizing
 * @returns Trail list
 */
export const PathTrail: React.FC<PathTrailProps> = ({ node, scopeHost, touch }) => {
  // Only the pages on the trail, so it re-renders when one of them changes rather than on every crawl update.
  const trail = useCrawlStore(
    useShallow((s) => {
      const steps: CrawlNode[] = [];
      let current: CrawlNode | undefined = node;
      while (current && !steps.includes(current)) {
        steps.unshift(current);
        current = current.parentId ? s.nodes.get(current.parentId) : undefined;
      }
      return steps;
    }),
  );
  const selectNode = useCrawlStore((s) => s.selectNode);

  return (
    <ol>
      {trail.map((step, i) => {
        const last = i === trail.length - 1;
        return (
          <li key={step.id} className={`relative flex items-center pl-4 text-[12.5px] ${touch ? 'h-8' : 'h-[26px]'}`}>
            <span
              aria-hidden="true"
              className={`absolute left-[3px] w-px bg-line-strong ${i === 0 ? 'top-1/2' : 'top-0'} ${last ? 'bottom-1/2' : 'bottom-0'}`}
            />
            <span aria-hidden="true" className="absolute left-[3px] top-1/2 h-px w-[7px] bg-line-strong" />
            {last ? (
              <span className="truncate font-semibold text-ink" aria-current="page" title={step.url}>
                {displayPath(step.url, scopeHost)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => selectNode(step.id)}
                title={step.url}
                className={`h-full flex-1 truncate rounded-sm text-left text-ink-2 hover:text-ink ${HOVER_TRANSITION} ${FOCUS_RING}`}
              >
                {displayPath(step.url, scopeHost)}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
};
