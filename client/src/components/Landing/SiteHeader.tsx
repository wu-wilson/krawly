import React from 'react';

import { KrawlyLogo } from '../Brand/KrawlyLogo';
import { FOCUS_RING, HOVER_TRANSITION } from '../UI/styles';
import { COLUMN, INSET } from './layout';

/**
 * The landing page's header. It holds only the logo, since the hero already carries the call to action.
 * @returns Site header
 */
export const SiteHeader: React.FC = () => (
  <header className="relative z-[2] border-b border-line pt-[env(safe-area-inset-top)]">
    <div className={`${COLUMN} ${INSET} flex h-16 items-center`}>
      {/* Nudged left so the mark's ink, not its viewBox, lines up with the text below. */}
      <a
        href="/"
        onClick={handleHomeClick}
        aria-label="Krawly home"
        className={`-ml-[3px] flex h-11 items-center rounded-sm text-ink hover:text-ink-2 ${HOVER_TRANSITION} ${FOCUS_RING}`}
      >
        <KrawlyLogo />
      </a>
    </div>
  </header>
);

/**
 * Scroll back to the top in place on a plain click, so the address doesn't gain a #fragment or a history entry.
 * Modified clicks still open the home page as a link would.
 * @param e - Click on the logo
 */
const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  window.scrollTo({ top: 0 });
};
