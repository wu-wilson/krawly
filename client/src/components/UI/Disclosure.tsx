import React, { useId, useState } from 'react';

import { Icon } from './Icon';
import { BLEED_ROW, FOCUS_RING, HOVER_TRANSITION } from './styles';

interface DisclosureProps {
  /** Always-visible heading that toggles the content */
  title: string;
  /** Revealed content */
  children: React.ReactNode;
}

/**
 * A row that reveals more detail below it, for long lists most people won't need.
 * @param props - Heading and content
 * @returns Disclosure
 */
export const Disclosure: React.FC<DisclosureProps> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-[34px] items-center justify-between text-[12.5px] font-medium text-ink-2 ${BLEED_ROW}
          ${HOVER_TRANSITION} ${FOCUS_RING}`}
      >
        {title}
        <Icon name="chevron" size={13} className={`transition-transform duration-200 ease-quart ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={contentId} className="py-1">
          {children}
        </div>
      )}
    </div>
  );
};
