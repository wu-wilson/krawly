import React from 'react';

import { TONE_CLASS } from './StatusCode';

import { displayPath, reasonPhrase, toneForCode } from '../../engine/statusText';

import type { CrawlNode } from '../../engine/types';

interface RedirectChainProps {
  /** A node that redirected */
  node: CrawlNode;
  /** Host that paths are shown relative to */
  scopeHost: string;
}

/**
 * Each address a redirecting page passed through, with its code, ending at where it landed.
 * @param props - Node and host for display paths
 * @returns Ordered list of hops
 */
export const RedirectChain: React.FC<RedirectChainProps> = ({ node, scopeHost }) => {
  const hops = node.finalUrl ? [...node.redirects, { url: node.finalUrl, status: node.httpStatus ?? 0 }] : node.redirects;

  return (
    <ol className="flex flex-col">
      {hops.map((hop, i) => (
        <li key={`${hop.url}-${i}`} className="flex h-8 items-center gap-2.5 text-[12.5px]">
          <span
            className={`w-8 flex-none font-medium tabular-nums ${TONE_CLASS[toneForCode(hop.status)]}`}
            title={hop.status ? reasonPhrase(hop.status) : undefined}
          >
            {hop.status || ''}
          </span>
          <span className="truncate text-ink-2" title={hop.url}>
            {displayPath(hop.url, scopeHost)}
          </span>
        </li>
      ))}
    </ol>
  );
};
