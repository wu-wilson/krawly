import React from 'react';

import { TEXT_LINK } from '../UI/styles';
import { INSET } from './layout';
import { UrlField } from './UrlField';

interface HeroProps {
  /** Start a crawl of the given URL */
  onStartCrawl: (url: string) => void;
  /** Address to start the field with, if any */
  initialAddress: string | undefined;
}

const SAMPLES = [
  { url: 'https://reqres.in', label: 'reqres.in' },
  { url: 'https://jsonplaceholder.typicode.com', label: 'jsonplaceholder.typicode.com' },
  { url: 'https://git-tower.com', label: 'git-tower.com' },
];

/**
 * Two-tone headline, a sentence on what Krawly does, the address field, and sample crawls.
 * @param props - Crawl handler and the address to start the field with
 * @returns Hero block
 */
export const Hero: React.FC<HeroProps> = ({ onStartCrawl, initialAddress }) => (
  <div className={INSET}>
    <h1 className="text-balance text-[clamp(32px,3.2vw,46px)] leading-[1.08] tracking-[-0.03em]">
      <span className="block text-ink">Map any website in seconds.</span>
      <span className="block text-ink-4">See what’s broken before your users do.</span>
    </h1>
    <p className="mt-7 max-w-[34em] text-pretty text-[17px] leading-[1.55] text-ink-2">
      Krawly follows every link on your site, checks each response, and draws what it finds as a live map you can
      explore, filter, and share.
    </p>
    <UrlField onSubmit={onStartCrawl} initialValue={initialAddress} className="mt-9 w-[min(580px,100%)]" />
    <p className="mt-4 text-[13.5px] text-ink-3">
      Or try a sample crawl of{' '}
      {SAMPLES.map((sample, i) => (
        <React.Fragment key={sample.url}>
          <button
            type="button"
            onClick={() => onStartCrawl(sample.url)}
            className={TEXT_LINK}
          >
            {sample.label}
          </button>
          {i < SAMPLES.length - 2 ? ', ' : i === SAMPLES.length - 2 ? ', or ' : '.'}
        </React.Fragment>
      ))}
    </p>
  </div>
);
