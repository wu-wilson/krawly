import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Button } from './Button';
import { FOCUS_RING_INSET, HOVER_TRANSITION } from './styles';

import type { IconName } from './Icon';

/** One action in a menu */
export interface MenuItem {
  /** Visible label */
  label: string;
  /** Runs when the item is chosen; the menu has already closed */
  onSelect: () => void;
}

interface MenuProps {
  /** The ghost button that opens the menu */
  trigger: {
    /** Visible label; leave out for an icon button */
    label?: string;
    /** Icon before the label, or on its own */
    icon: IconName;
    /** Accessible name, required when there's no label */
    ariaLabel?: string;
    /** `md` in toolbars, `touch` for phones */
    size?: 'md' | 'touch';
  };
  /** Actions in display order */
  items: MenuItem[];
  /** Additional classes for the wrapper */
  className?: string;
}

/**
 * A button that opens a short list of actions. Arrow keys, Home, and End move between items. Choosing an item or
 * pressing Escape closes it and returns focus to the button; Tab or a click elsewhere closes it too.
 * @param props - Trigger and items
 * @returns Menu button with its popover
 */
export const Menu: React.FC<MenuProps> = ({ trigger, items, className = '' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const triggerId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const handlePointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !wrapRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open, close]);

  // A menu whose items change while it's open closes, so a tap meant for one item can't land on another.
  const itemsKey = items.map((item) => item.label).join('\n');
  const itemsKeyRef = useRef(itemsKey);
  useEffect(() => {
    if (itemsKeyRef.current === itemsKey) return;
    itemsKeyRef.current = itemsKey;
    if (open) close(true);
  }, [itemsKey, open, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') return close(false);
    if (e.key === 'Escape') {
      // Marked handled, so other Escape listeners (the detail panel) leave it alone.
      e.preventDefault();
      return close(true);
    }
    const current = itemRefs.current.findIndex((item) => item === document.activeElement);
    const targets: Partial<Record<string, number>> = { ArrowDown: current + 1, ArrowUp: current - 1, Home: 0, End: items.length - 1 };
    const target = targets[e.key];
    if (target === undefined) return;
    e.preventDefault();
    itemRefs.current[(target + items.length) % items.length]?.focus();
  };

  return (
    <div
      ref={wrapRef}
      // A press inside an open menu keeps focus where it is. Safari and Firefox on macOS don't focus a pressed button,
      // so the press would otherwise blur the menu and close it before the click lands.
      onMouseDown={(e) => {
        if (open) e.preventDefault();
      }}
      // Focus leaving by any route closes the menu, such as a keyboard shortcut that jumps elsewhere.
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget)) close(false);
      }}
      className={`relative ${className}`}
    >
      <Button
        ref={triggerRef}
        id={triggerId}
        variant="ghost"
        size={trigger.size ?? 'md'}
        icon={trigger.icon}
        aria-label={trigger.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close(true) : setOpen(true))}
      >
        {trigger.label}
      </Button>
      {open && (
        <div
          id={listId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
          className="absolute right-0 top-full z-50 mt-1.5 min-w-[168px] animate-menu-in rounded-lg border border-line bg-surface p-1 shadow-menu"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className={`flex h-8 w-full items-center whitespace-nowrap rounded-[5px] px-2.5 text-[13px] text-ink-2 max-sm:h-11
                hover:bg-wash-hover hover:text-ink focus-visible:bg-wash-hover ${HOVER_TRANSITION} ${FOCUS_RING_INSET}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
