import React from 'react';

import { Button, ButtonLink } from '../UI/Button';
import { Disclosure } from '../UI/Disclosure';
import { DetailHeader } from './DetailHeader';
import { LinkRows } from './LinkRows';
import { PathTrail } from './PathTrail';
import { RedirectChain } from './RedirectChain';

import { useCopy } from '../../hooks/useCopy';
import { COARSE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';

import { clicksFromStart, plural, typeLabel } from '../../engine/statusText';

import type { CrawlNode } from '../../engine/types';

/** Which form the details take: a side panel or a bottom sheet */
export type DetailLayout = 'panel' | 'sheet';

interface DetailContentProps {
  /** The page to describe */
  node: CrawlNode;
  /** Host that paths are shown relative to */
  scopeHost: string;
  /** Side panel or bottom sheet */
  layout: DetailLayout;
  /** Close the details */
  onClose: () => void;
}

const COPY_LABELS = { idle: 'Copy URL', copied: 'Copied', failed: 'Couldn’t copy' } as const;

/**
 * Everything Krawly knows about one page: its status and what it means, where it sits, how to reach it from the
 * start page, what links to it, and the raw response. Everything but the actions scrolls, so a short screen keeps
 * them in reach. The sheet, and any touch screen, gets 44px buttons and 32px path-trail rows. Memoized, so dragging the sheet doesn't
 * re-render it.
 * @param props - Page, host, layout, and close handler
 * @returns Detail content
 */
export const DetailContent = React.memo<DetailContentProps>(({ node, scopeHost, layout, onClose }) => {
  const coarsePointer = useMediaQuery(COARSE_QUERY);
  const { copy, state: copyState } = useCopy();
  const sheet = layout === 'sheet';
  const touch = sheet || coarsePointer;

  const rows: Array<[string, string]> = [['Type', typeLabel(node.resourceType)], ['Depth', clicksFromStart(node.depth)]];
  if (node.contentType) rows.push(['Content type', node.contentType.split(';')[0]]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <DetailHeader node={node} scopeHost={scopeHost} layout={layout} touch={touch} onClose={onClose} />

        <div className={sheet ? 'px-4 pb-3 pt-0.5' : 'px-5 pb-5 pt-1'}>
          <dl>
            {rows.map(([label, value], i) => (
              <div
                key={label}
                className={`flex h-9 items-center justify-between gap-4 ${sheet ? 'text-[13px]' : 'text-[12.5px]'} ${i < rows.length - 1 ? 'border-b border-line-soft' : ''}`}
              >
                <dt className="flex-none text-ink-3">{label}</dt>
                <dd className="truncate tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {node.redirects.length > 0 && (
            <Section title="Redirects">
              <RedirectChain node={node} scopeHost={scopeHost} />
            </Section>
          )}

          {node.depth > 0 && (
            <Section title="Path from your start page">
              <PathTrail node={node} scopeHost={scopeHost} touch={touch} />
            </Section>
          )}

          {node.inbound.length > 0 && (
            <Section title={`Linked from ${plural(node.inbound.length, 'page')}`}>
              <LinkRows ids={node.inbound} scopeHost={scopeHost} />
            </Section>
          )}

          <div className="mt-3.5">
            {node.outbound.length > 0 && (
              <Disclosure title={`Links on this page (${node.outbound.length})`}>
                <LinkRows ids={node.outbound} scopeHost={scopeHost} />
              </Disclosure>
            )}
            {node.headers && Object.keys(node.headers).length > 0 && (
              <Disclosure title="Response headers">
                <dl className="flex flex-col gap-1.5 pb-1">
                  {Object.entries(node.headers).map(([key, value]) => (
                    <div key={key} className="text-xs leading-snug">
                      <dt className="text-ink-3">{key}</dt>
                      <dd className="break-all text-ink-2">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Disclosure>
            )}
          </div>
        </div>
      </div>

      <div
        className={`flex gap-2 border-t border-line ${sheet ? 'px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3' : 'px-5 pb-[calc(14px+env(safe-area-inset-bottom))] pt-3.5'}`}
      >
        <ButtonLink
          href={node.finalUrl ?? node.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          size={touch ? 'touch' : 'lg'}
          icon="external"
          className={sheet ? 'flex-1' : ''}
        >
          Open page
        </ButtonLink>
        <Button variant="ghost" size={touch ? 'touch' : 'lg'} icon={copyState === 'copied' ? 'check' : 'copy'} onClick={() => copy(node.url)}>
          {COPY_LABELS[copyState]}
        </Button>
        <span role="status" className="sr-only">{copyState === 'idle' ? '' : COPY_LABELS[copyState]}</span>
      </div>
    </div>
  );
});

DetailContent.displayName = 'DetailContent';

interface SectionProps {
  /** Small heading above the content */
  title: string;
  /** The section's content */
  children: React.ReactNode;
}

/**
 * A titled block in the details' scrolling body.
 * @param props - Heading and content
 * @returns Section
 */
const Section: React.FC<SectionProps> = ({ title, children }) => (
  <section>
    <h3 className="mb-1.5 mt-[18px] text-xs font-medium text-ink-3">{title}</h3>
    {children}
  </section>
);
