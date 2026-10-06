import React from 'react';

import { NoMatches } from '../App/NoMatches';
import { DOT_GRID } from '../UI/styles';
import { ZoomControls } from './ZoomControls';

import { useCrawlHosts } from '../../hooks/useCrawlHosts';
import { useCrawlMap } from '../../hooks/useCrawlMap';
import { COARSE_QUERY, PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useCrawlStore } from '../../store/crawlStore';
import { isFilterActive, matchesFilter } from '../../store/filters';

import { mapSummary } from '../../engine/statusText';
import { sheetCover } from '../../graph/viewMath';

interface GraphViewProps {
  /** Width the detail panel covers on the right */
  insetRight: number;
  /** Height the detail sheet covers at the bottom */
  insetBottom: number;
  /** Whether the map is the view on screen */
  active: boolean;
}

/**
 * The live crawl map on a canvas, with zoom controls in the visible corner. When the filters match nothing, an empty
 * state takes the map's place. Drawing and gestures live in `useCrawlMap`.
 * @param props - Areas covered by the detail panel or sheet, and whether the map is showing
 * @returns Map view
 */
export const GraphView: React.FC<GraphViewProps> = ({ insetRight, insetBottom, active }) => {
  const { host, scopeHost } = useCrawlHosts();
  const stats = useCrawlStore((s) => s.stats);
  const noMatches = useCrawlStore(
    (s) => isFilterActive(s.filter) && s.nodes.size > 0 && !Array.from(s.nodes.values()).some((node) => matchesFilter(node, s.filter)),
  );
  const touch = useMediaQuery(`${PHONE_QUERY}, ${COARSE_QUERY}`);
  // The map stops drawing while the empty state takes its place.
  const map = useCrawlMap({ insetRight, insetBottom, scopeHost, active: active && !noMatches });
  const covered = insetBottom > 0 ? sheetCover(insetBottom) : '0px';
  // Over an open sheet the zoom controls sit 16px above it; otherwise they clear the home indicator.
  const bottom = insetBottom > 0 ? `calc(${covered} + 16px)` : 'max(16px, env(safe-area-inset-bottom))';

  return (
    <div ref={map.containerRef} className="relative h-full overflow-hidden bg-canvas">
      <canvas
        ref={map.canvasRef}
        role="img"
        aria-label={mapSummary(host, stats)}
        {...map.pointerHandlers}
        onContextMenu={(e) => e.preventDefault()}
        className={`absolute inset-0 h-full w-full touch-none select-none [-webkit-touch-callout:none]
          ${map.hovering ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      />
      {/* With nothing to show, the empty state takes the map's place on the same dotted canvas, centred in the part
          the details leave visible. */}
      {noMatches ? (
        <div className="absolute inset-0" style={{ right: insetRight, bottom: covered }}>
          <NoMatches className={DOT_GRID} />
        </div>
      ) : (
        <ZoomControls
          onZoomOut={map.zoomOut}
          onZoomIn={map.zoomIn}
          onFit={map.fit}
          size={touch ? 'touch' : 'sm'}
          className="absolute right-4 transition-[bottom,transform] duration-300 ease-quart"
          style={{ bottom, transform: `translateX(${-insetRight}px)` }}
        />
      )}
    </div>
  );
};
