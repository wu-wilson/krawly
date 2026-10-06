import React, { useCallback, useEffect, useRef, useState } from 'react';

import { DetailContent } from './DetailContent';

import { useCrawlHosts } from '../../hooks/useCrawlHosts';
import { WIDE_QUERY } from '../../hooks/useMediaQuery';
import { useCrawlStore } from '../../store/crawlStore';

import { sheetCover } from '../../graph/viewMath';

import type { DetailLayout } from './DetailContent';

interface DetailPanelProps {
  /** Side panel or bottom sheet, chosen with `PANEL_QUERY` */
  layout: DetailLayout;
  /** Changes to move focus into the details again, such as when a report row opens the page they already show */
  focusRequest: number;
}

/** Screens that show the details as a side panel: wide ones, and short landscape ones the sheet would cover */
export const PANEL_QUERY = `${WIDE_QUERY}, (min-width: 640px) and (max-height: 639.98px)`;
/** Height of the detail sheet, which the map leaves clear; on short screens it stops at `MAX_SHEET_SHARE` of the map */
export const SHEET_HEIGHT = 344;
/** Width of the detail side panel, which the map leaves clear */
export const PANEL_WIDTH = 340;

// Matches the `duration-300` slide, so the last page stays on screen until it's out of view.
const SLIDE_MS = 300;
// Focus moves in once the details have started to slide into view.
const FOCUS_DELAY_MS = 150;
// Dragging the sheet's handle down this far closes it.
const DISMISS_DRAG_PX = 80;

/**
 * Details for the selected page: a panel that slides in from the right, or a sheet that rises from the bottom on
 * phones and tablets held upright. It's non-modal, so the map stays usable behind it. Close it with the close
 * button, Escape, a click on empty map, or by dragging the sheet down.
 * @param props - Which layout to use, and the focus request
 * @returns Detail panel or sheet, or nothing while no page is shown
 */
export const DetailPanel: React.FC<DetailPanelProps> = ({ layout, focusRequest }) => {
  const selectedId = useCrawlStore((s) => s.selectedNodeId);
  // The page on screen: the selected one, or the last one while the panel slides away.
  const [shownId, setShownId] = useState<string | null>(null);
  const shown = useCrawlStore((s) => (shownId ? s.nodes.get(shownId) : undefined));
  const selectNode = useCrawlStore((s) => s.selectNode);
  const graphShown = useCrawlStore((s) => s.view === 'graph');
  const { scopeHost } = useCrawlHosts();
  const containerRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // Where a drag on the sheet's handle started, and how far down it has moved.
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => {
    if (selectedId) {
      setShownId(selectedId);
      const raf = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
    const timer = setTimeout(() => setShownId(null), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [selectedId]);

  // Move focus into the details when a page opens or focus is requested, and give it back to where it was when they
  // close. The container takes focus rather than a button, so no focus ring appears after a click on the map.
  useEffect(() => {
    if (!selectedId) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !containerRef.current?.contains(active)) returnFocusRef.current = active;
    const timer = setTimeout(() => containerRef.current?.focus({ preventScroll: true }), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [selectedId, focusRequest]);

  const handleClose = useCallback(() => {
    const container = containerRef.current;
    if (container?.contains(document.activeElement)) returnFocusRef.current?.focus({ preventScroll: true });
    returnFocusRef.current = null;
    selectNode(null);
  }, [selectNode]);

  // Escape closes the details only while they're showing; the report keeps them for when the map comes back.
  useEffect(() => {
    if (!open || !graphShown) return;
    const handleKey = (e: KeyboardEvent) => {
      // A menu that handled Escape first marks it, so it closes the menu and not the panel.
      if (e.key === 'Escape' && !e.defaultPrevented) handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, graphShown, handleClose]);

  if (!shown) return null;

  const sheet = layout === 'sheet';
  const endDrag = (dismiss: boolean) => {
    setDragStart(null);
    setDrag(0);
    if (dismiss) handleClose();
  };

  // One container for both layouts, so turning a tablet or resizing across the breakpoint keeps focus, scroll, and
  // open disclosures in place.
  return (
    <section
      ref={containerRef}
      tabIndex={-1}
      aria-label="Page details"
      style={
        sheet
          ? { height: sheetCover(SHEET_HEIGHT), transform: open ? `translateY(${drag}px)` : 'translateY(100%)' }
          : { width: PANEL_WIDTH }
      }
      className={`absolute z-20 flex flex-col border-line bg-surface outline-none ${
        sheet
          ? `inset-x-0 bottom-0 rounded-t-xl border-t shadow-sheet ${dragStart === null ? 'transition-transform duration-300 ease-quart' : ''}`
          : `inset-y-0 right-0 border-l shadow-panel transition-transform duration-300 ease-quart ${open ? 'translate-x-0' : 'translate-x-full'}`
      }`}
    >
      {sheet && (
        <div
          aria-hidden="true"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            setDragStart(e.clientY);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragStart !== null) setDrag(Math.max(0, e.clientY - dragStart));
          }}
          onPointerUp={() => endDrag(drag > DISMISS_DRAG_PX)}
          onPointerCancel={() => endDrag(false)}
          className="flex h-6 flex-none cursor-grab touch-none items-center justify-center"
        >
          <span className="h-1 w-9 rounded-sm bg-line-strong" />
        </div>
      )}
      <DetailContent key={shown.id} node={shown} scopeHost={scopeHost} layout={layout} onClose={handleClose} />
    </section>
  );
};
