import React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { BLEED_ROW, FOCUS_RING, HOVER_TRANSITION } from '../UI/styles';
import { TONE_CLASS } from './StatusCode';

import { useCrawlStore } from '../../store/crawlStore';

import { describeStatus, displayPath } from '../../engine/statusText';

interface LinkRowsProps {
  /** Node ids (normalized URLs) to list */
  ids: string[];
  /** Host that paths are shown relative to */
  scopeHost: string;
}

/**
 * A list of linked pages with their status codes. Pages on the map are buttons that select them.
 * @param props - Ids to list and the host for display paths
 * @returns Link list
 */
export const LinkRows: React.FC<LinkRowsProps> = ({ ids, scopeHost }) => {
  // Only the listed nodes, so the list re-renders when one of them changes rather than on every crawl update.
  const nodes = useCrawlStore(useShallow((s) => ids.map((id) => s.nodes.get(id))));
  const selectNode = useCrawlStore((s) => s.selectNode);

  return (
    <ul>
      {ids.map((id, i) => {
        const node = nodes[i];
        const path = displayPath(node?.url ?? id, scopeHost);
        if (!node) {
          return (
            <li key={id} className="flex h-8 items-center text-[12.5px] text-ink-3" title={id}>
              <span className="truncate">{path}</span>
            </li>
          );
        }
        const status = describeStatus(node);
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => selectNode(id)}
              title={node.url}
              className={`flex h-8 items-center justify-between gap-3 text-[12.5px] text-ink-2 hover:text-ink ${BLEED_ROW}
                ${HOVER_TRANSITION} ${FOCUS_RING}`}
            >
              <span className="truncate">{path}</span>
              <span className={`flex-none tabular-nums ${status.tone === 'ok' ? 'text-ink-3' : TONE_CLASS[status.tone]}`}>
                {status.code ?? status.reason}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};
