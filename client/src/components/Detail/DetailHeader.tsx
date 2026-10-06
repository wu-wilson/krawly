import React from 'react';

import { Button } from '../UI/Button';
import { StatusCode } from './StatusCode';

import { describeStatus, displayPath, explainNode, responseMs } from '../../engine/statusText';
import { hostOf } from '../../engine/urlUtils';

import type { DetailLayout } from './DetailContent';
import type { CrawlNode } from '../../engine/types';

interface DetailHeaderProps {
  /** The page to describe */
  node: CrawlNode;
  /** Host that paths are shown relative to */
  scopeHost: string;
  /** Side panel or bottom sheet */
  layout: DetailLayout;
  /** Size the close button for touch */
  touch: boolean;
  /** Close the details */
  onClose: () => void;
}

/**
 * The top of the details: the page's address and host, its status, and a sentence on what happened.
 * @param props - Page, host, layout, touch sizing, and close handler
 * @returns Detail header
 */
export const DetailHeader: React.FC<DetailHeaderProps> = ({ node, scopeHost, layout, touch, onClose }) => {
  const sheet = layout === 'sheet';
  const status = describeStatus(node);
  // The close button reaches into the header's padding so its icon lines up with the title, while leaving room for its
  // focus ring at the top of the sheet's scrolling area.
  const closeOffset = `${touch ? '-mr-2.5' : '-mr-1.5'} ${sheet ? '-mt-0.5' : touch ? '-mt-2.5' : '-mt-1'}`;

  return (
    <div className={`border-b border-line ${sheet ? 'px-4 pb-3.5 pt-1.5' : 'px-5 py-[18px]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`break-all font-semibold tracking-[-0.01em] text-ink ${sheet ? 'text-[15px]' : 'text-[14.5px]'}`}>
            {displayPath(node.url, scopeHost)}
          </h2>
          <p className={`mt-0.5 truncate text-ink-3 ${sheet ? 'text-[12.5px]' : 'text-xs'}`}>{hostOf(node.url)}</p>
        </div>
        <Button
          variant="ghost"
          size={touch ? 'touch' : 'md'}
          icon="close"
          iconSize={touch ? 16 : 13}
          aria-label="Close details"
          onClick={onClose}
          className={closeOffset}
        />
      </div>
      <div className={sheet ? 'mt-3' : 'mt-4'}>
        <StatusCode code={status.code} reason={status.reason} tone={status.tone} ms={responseMs(node)} size={sheet ? 'md' : 'lg'} />
      </div>
      <p className={`mt-3 text-ink-2 ${sheet ? 'text-[13px]' : 'text-[12.5px]'}`}>{explainNode(node, scopeHost)}</p>
    </div>
  );
};
