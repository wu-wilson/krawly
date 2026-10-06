import React from 'react';

import { COLUMN, INSET } from './layout';

import { CRAWL_LIMITS } from '../../engine/limits';

const SPECS = [
  { label: 'Pages per crawl', value: String(CRAWL_LIMITS.maxUrls) },
  { label: 'Link depth', value: `${CRAWL_LIMITS.maxDepth} levels` },
  { label: 'Requests in parallel', value: String(CRAWL_LIMITS.maxConcurrent) },
  { label: 'Timeout per page', value: `${CRAWL_LIMITS.requestTimeoutMs / 1000} seconds` },
];

/**
 * A two-tone statement beside the crawler's limits, read straight from the engine so they never drift.
 * @returns Spec section
 */
export const SpecList: React.FC = () => (
  <section
    className={`${COLUMN} ${INSET} relative z-[1] mt-[104px] grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-x-16 gap-y-10`}
  >
    <h2 className="text-balance text-[clamp(24px,2.2vw,30px)] leading-[1.12] tracking-[-0.03em]">
      <span className="block text-ink">Quick enough to run every time you ship.</span>
      <span className="block text-ink-4">There’s nothing to install and no account to create.</span>
    </h2>
    <dl className="border-t border-line">
      {SPECS.map((spec) => (
        <div key={spec.label} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
          <dt className="text-sm text-ink-2">{spec.label}</dt>
          <dd className="text-sm font-medium tabular-nums text-ink">{spec.value}</dd>
        </div>
      ))}
    </dl>
  </section>
);
