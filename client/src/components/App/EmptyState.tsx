import React, { useLayoutEffect, useRef } from 'react';

interface EmptyStateProps {
  /** One-line heading */
  title: string;
  /** A sentence or two on what happened and what to do */
  body: string;
  /** Buttons offering the way forward */
  actions: React.ReactNode;
  /** Additional classes, typically a background */
  className?: string;
}

/**
 * A centred message that fills its container, used wherever a view would otherwise be blank. Focus that would drop
 * to the page lands on the app's main area instead: focus left behind by the controls it replaced, and focus inside
 * it when its own action removes it.
 * @param props - Heading, body, and actions
 * @returns Empty state
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, actions, className = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // A layout effect, so its cleanup runs while the element is still in the document and can tell whether focus was inside.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const main = root?.closest<HTMLElement>('main');
    if (document.activeElement === document.body) main?.focus({ preventScroll: true });
    return () => {
      if (root?.contains(document.activeElement)) main?.focus({ preventScroll: true });
    };
  }, []);

  return (
    // Centred with auto margins, so content taller than a short map scrolls instead of being cut at both ends.
    <div ref={rootRef} className={`absolute inset-0 z-10 flex overflow-y-auto p-6 text-center ${className}`}>
      <div className="m-auto flex flex-col items-center gap-2">
        <h2 className="max-w-full text-[15px] font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">{title}</h2>
        <p className="max-w-[38ch] text-pretty text-[13px] leading-normal text-ink-2 [overflow-wrap:anywhere]">{body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
};
