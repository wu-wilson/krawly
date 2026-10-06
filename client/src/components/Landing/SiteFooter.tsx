import React from 'react';

import { TEXT_LINK } from '../UI/styles';
import { COLUMN, INSET } from './layout';

/**
 * A footer bar the same height as the header. On phones its two lines stack, so it takes a little padding instead.
 * @returns Site footer
 */
export const SiteFooter: React.FC = () => (
  <footer
    className={`${COLUMN} ${INSET} relative z-[1] mt-24 flex min-h-[65px] flex-wrap items-center justify-between gap-x-6 gap-y-2
      border-t border-line pb-[calc(18px+env(safe-area-inset-bottom))] pt-[18px] text-[12.5px] text-ink-3`}
  >
    <span>Krawly fetches each page through its own proxy, so any public site can be mapped from your browser.</span>
    <a
      href="https://github.com/wu-wilson/krawly"
      target="_blank"
      rel="noopener noreferrer"
      className={`font-medium ${TEXT_LINK}`}
    >
      Source on GitHub
    </a>
  </footer>
);
