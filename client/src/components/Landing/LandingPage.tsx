import React from 'react';

import { DemoWindow } from './DemoWindow';
import { Hero } from './Hero';
import { COLUMN } from './layout';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { SpecList } from './SpecList';

interface LandingPageProps {
  /** Start a crawl of the given URL */
  onStartCrawl: (url: string) => void;
  /** Whether the page is transitioning out */
  isTransitioning: boolean;
  /** Address to start the field with, for "Change address" after a failed crawl */
  initialAddress: string | undefined;
}

/**
 * Landing page: header, hero with the address field, a live demo of a crawl, the crawler's limits, and a footer.
 * Everything renders immediately; besides the demo and its silk, the only motion is the fade-out when a crawl starts.
 * @param props - Crawl handler, fade-out flag, and the address to prefill
 * @returns Full landing page
 */
export const LandingPage: React.FC<LandingPageProps> = ({ onStartCrawl, isTransitioning, initialAddress }) => (
  <div
    className={`min-h-dvh overflow-hidden pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]
      transition-opacity duration-200 ease-quart ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
  >
    <SiteHeader />
    <main>
      <section>
        <div className={`${COLUMN} relative z-[1] pt-20`}>
          <Hero onStartCrawl={onStartCrawl} initialAddress={initialAddress} />
          <DemoWindow />
        </div>
      </section>
      <SpecList />
    </main>
    <SiteFooter />
  </div>
);
