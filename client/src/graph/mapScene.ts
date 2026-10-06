import { bowedLink, pointOnCubic } from '../render/cubic';
import { labelPlacement, startLabelPlacement } from '../render/labels';
import {
  MOTION,
  NODE_R,
  clamp01,
  easeInOutQuad,
  easeOutCubic,
  edgeGrow,
  edgeStop,
  labelFade,
  nodeRadius,
  rippleAt,
} from '../render/motion';
import { layoutRadialTree } from './layout';

import type { CrawlNode, NodeStatus } from '../engine/types';
import type { Cubic, FrameEdge, FrameLabel, FrameNode, FramePulse, FrameRing, FrameRipple, GraphFrame, NodeGlyph } from '../render/frame';
import type { MapLayout } from './layout';

/** What changes how the map is drawn, beyond the crawl itself */
export interface SceneFocus {
  /** Page whose trail from the start page is highlighted */
  selectedId: string | null;
  /** Page under the pointer, which gets a label */
  hoveredId: string | null;
  /** Ids that pass the active filters, or null when nothing is filtered */
  matching: Set<string> | null;
  /** Label text for a node, such as "/docs" or the start page's host */
  labelFor: (node: CrawlNode) => string;
  /** Label size in map units */
  labelSize: number;
}

/** A value easing toward a target */
interface Ease {
  from: number;
  to: number;
  start: number;
}

/**
 * How the selection, filters, and pointer show on a node, each eased: its opacity, hover label, accent trail,
 * selection ring, and section label.
 */
type FocusChannel = 'dim' | 'hover' | 'trail' | 'ring' | 'section';

const FOCUS_CHANNELS: readonly FocusChannel[] = ['dim', 'hover', 'trail', 'ring', 'section'];

interface NodeMotion {
  node: CrawlNode;
  /** False until the first layout pass places the node */
  placed: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Angle from the start page, for label placement */
  angle: number;
  depth: number;
  moveStart: number;
  appearAt: number;
  fetchStart: number | null;
  resolvedAt: number | null;
  /** Eased focus values; null until the node's first frame, which takes its targets without easing */
  focus: Record<FocusChannel, Ease> | null;
}

/** A crawl map's animation state, fed from the store and turned into frames */
interface MapScene {
  /** Record new nodes and status changes; returns true when the tree's shape changed */
  sync: (nodes: Map<string, CrawlNode>, now: number) => boolean;
  /** Recompute positions; placed nodes ease to their new places */
  relayout: (stretchX: number, now: number) => void;
  /** Build the frame for a moment */
  frame: (now: number, focus: SceneFocus) => GraphFrame;
  /** True while anything is still moving, growing, or being fetched */
  isAnimating: (now: number) => boolean;
  /** Extent of the settled layout in map units */
  bounds: () => MapLayout['bounds'];
  /** Where a node ends up once it finishes moving, which is where the view should aim */
  restingPositionOf: (id: string) => { x: number; y: number } | null;
  /** Nearest node within `radius` map units of a point */
  hitTest: (x: number, y: number, radius: number, now: number) => string | null;
}

const MOVE_MS = 450;
const PULSE_MS = 900;
// New pages from one response appear in quick succession instead of all at once.
const STAGGER_MS = 18;
const MAX_STAGGER_MS = 420;
// Labels on the first ring only show while there are few enough sections to read them.
const MAX_SECTION_LABELS = 12;
const DIM_FILTERED = 0.16;
const DIM_UNSELECTED = 0.42;
const EMPTY_BOUNDS: MapLayout['bounds'] = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

const GLYPHS: Record<NodeStatus, NodeGlyph> = {
  queued: 'queued',
  pending: 'fetching',
  healthy: 'healthy',
  broken: 'broken',
  redirect: 'redirect',
  skipped: 'skipped',
};

const isUnresolved = (status: NodeStatus): boolean => status === 'queued' || status === 'pending';

/**
 * Read an eased value at a moment.
 * @param ease - The value and its target
 * @param now - Current time in ms
 * @returns The value, between its start and target
 */
const easedValue = (ease: Ease, now: number): number =>
  ease.from + (ease.to - ease.from) * easeOutCubic(clamp01((now - ease.start) / MOTION.focus));

/**
 * Start easing toward a new target, from wherever the value is now. Does nothing if that's already the target.
 * @param ease - The value to move
 * @param target - Where it should end up
 * @param now - Current time in ms
 */
const easeToward = (ease: Ease, target: number, now: number): void => {
  if (ease.to === target) return;
  ease.from = easedValue(ease, now);
  ease.to = target;
  ease.start = now;
};

/**
 * Hold a set of focus values at their targets, with nothing to ease.
 * @param targets - Value for each channel
 * @returns Settled eases
 */
const settledFocus = (targets: Record<FocusChannel, number>): Record<FocusChannel, Ease> => {
  const still = (value: number): Ease => ({ from: value, to: value, start: -Infinity });
  return {
    dim: still(targets.dim),
    hover: still(targets.hover),
    trail: still(targets.trail),
    ring: still(targets.ring),
    section: still(targets.section),
  };
};

/**
 * Create the animation state for one crawl map.
 * @returns Scene controls
 */
export const createMapScene = (): MapScene => {
  const motions = new Map<string, NodeMotion>();
  let bounds = EMPTY_BOUNDS;
  let sectionCount = 0;

  const current = (m: NodeMotion, now: number): { x: number; y: number } => {
    const p = easeOutCubic(clamp01((now - m.moveStart) / MOVE_MS));
    return { x: m.fromX + (m.toX - m.fromX) * p, y: m.fromY + (m.toY - m.fromY) * p };
  };

  const sync = (nodes: Map<string, CrawlNode>, now: number): boolean => {
    let added = 0;
    for (const node of nodes.values()) {
      const existing = motions.get(node.id);
      if (!existing) {
        const appearAt = now + Math.min(added * STAGGER_MS, MAX_STAGGER_MS);
        motions.set(node.id, {
          node,
          placed: false,
          fromX: 0,
          fromY: 0,
          toX: 0,
          toY: 0,
          angle: 0,
          depth: 0,
          moveStart: now,
          appearAt,
          fetchStart: node.status === 'pending' ? now : null,
          resolvedAt: isUnresolved(node.status) ? null : appearAt,
          focus: null,
        });
        added += 1;
        continue;
      }
      if (existing.node.status !== node.status) {
        if (node.status === 'pending') existing.fetchStart = now;
        if (isUnresolved(existing.node.status) && !isUnresolved(node.status)) {
          existing.resolvedAt = Math.max(now, existing.appearAt);
        }
      }
      existing.node = node;
    }
    return added > 0;
  };

  const relayout = (stretchX: number, now: number): void => {
    const layout = layoutRadialTree(Array.from(motions.values(), (m) => m.node), stretchX);
    bounds = layout.bounds;
    sectionCount = 0;
    for (const [id, point] of layout.points) {
      const m = motions.get(id);
      if (!m) continue;
      if (point.depth === 1) sectionCount += 1;
      // A newly placed page starts where it settles, so its line grows straight to it.
      const from = m.placed ? current(m, now) : point;
      m.placed = true;
      m.fromX = from.x;
      m.fromY = from.y;
      m.toX = point.x;
      m.toY = point.y;
      m.angle = point.angle;
      m.depth = point.depth;
      m.moveStart = now;
    }
  };

  const frame = (now: number, focus: SceneFocus): GraphFrame => {
    const trail = new Set<string>();
    let cursor = focus.selectedId;
    while (cursor && motions.has(cursor) && !trail.has(cursor)) {
      trail.add(cursor);
      cursor = motions.get(cursor)?.node.parentId ?? null;
    }
    const dimOf = (id: string): number =>
      (focus.matching && !focus.matching.has(id) ? DIM_FILTERED : 1) * (trail.size > 0 && !trail.has(id) ? DIM_UNSELECTED : 1);

    const edges: FrameEdge[] = [];
    const nodes: FrameNode[] = [];
    const pulses: FramePulse[] = [];
    const ripples: FrameRipple[] = [];
    const labels: FrameLabel[] = [];
    const selectionRings: FrameRing[] = [];
    let startRing: GraphFrame['startRing'] = null;

    for (const m of motions.values()) {
      if (now < m.appearAt) continue;
      const { node } = m;
      const at = current(m, now);
      const parent = node.parentId ? motions.get(node.parentId) : undefined;

      // Selection, filter, and hover changes ease in and out; a new page takes its values straight away.
      const targets: Record<FocusChannel, number> = {
        dim: dimOf(node.id),
        hover: node.id === focus.hoveredId ? 1 : 0,
        trail: parent && trail.has(node.id) && trail.has(parent.node.id) ? 1 : 0,
        ring: node.id === focus.selectedId ? 1 : 0,
        section: m.depth === 1 && sectionCount <= MAX_SECTION_LABELS ? 1 : 0,
      };
      if (!m.focus) m.focus = settledFocus(targets);
      for (const channel of FOCUS_CHANNELS) easeToward(m.focus[channel], targets[channel], now);
      const alpha = easedValue(m.focus.dim, now);
      const hover = easedValue(m.focus.hover, now);

      let curve: Cubic | null = null;
      let stop = 1;
      if (parent && now >= parent.appearAt) {
        const from = current(parent, now);
        curve = bowedLink(from.x, from.y, at.x, at.y);
        stop = edgeStop(Math.hypot(at.x - from.x, at.y - from.y));
        edges.push({ curve, stop, grow: edgeGrow(now - m.appearAt), alpha, trail: easedValue(m.focus.trail, now) });
      }

      const resolvedAge = m.resolvedAt === null ? null : now - m.resolvedAt;
      nodes.push({ x: at.x, y: at.y, r: nodeRadius(now - m.appearAt, resolvedAge), glyph: GLYPHS[node.status], alpha });

      // While a page is being fetched, a pulse keeps travelling down its incoming line.
      if (node.status === 'pending' && curve && m.fetchStart !== null) {
        const [x, y] = pointOnCubic(curve, easeInOutQuad(((now - m.fetchStart) % PULSE_MS) / PULSE_MS) * stop);
        pulses.push({ x, y, alpha });
      }

      if ((node.status === 'broken' || node.status === 'redirect') && resolvedAge !== null) {
        const ripple = rippleAt(at.x, at.y, resolvedAge, node.status);
        if (ripple) ripples.push({ ...ripple, alpha: ripple.alpha * alpha });
      }

      const labelAlpha = resolvedAge === null ? 0 : labelFade(resolvedAge);
      if (node.parentId === null) {
        startRing = { x: at.x, y: at.y, alpha: labelAlpha * alpha };
        labels.push({
          ...startLabelPlacement(at.x, at.y, focus.labelSize),
          text: focus.labelFor(node),
          emphasis: true,
          alpha: labelAlpha * alpha,
        });
      } else {
        const sectionAlpha = labelAlpha * alpha * easedValue(m.focus.section, now);
        if (sectionAlpha > 0 || hover > 0) {
          labels.push({
            ...labelPlacement(at.x, at.y, m.angle, focus.labelSize),
            text: focus.labelFor(node),
            alpha: Math.max(sectionAlpha, hover),
          });
        }
      }

      const ring = easedValue(m.focus.ring, now);
      if (ring > 0) selectionRings.push({ x: at.x, y: at.y, r: NODE_R, alpha: ring });
    }

    return { edges, nodes, pulses, ripples, labels, startRing, selectionRings, grid: true, labelSize: focus.labelSize, alpha: 1 };
  };

  const isAnimating = (now: number): boolean => {
    for (const m of motions.values()) {
      // A pending page's pulse travels down its link; the start page has none, so it holds still.
      if (m.node.status === 'pending' && m.node.parentId !== null) return true;
      if (now - m.moveStart < MOVE_MS || now < m.appearAt + Math.max(MOTION.grow, MOTION.pop)) return true;
      // A resolved page settles and fades in its label; only problem pages also ripple, which runs longer.
      if (m.resolvedAt !== null) {
        const ripples = m.node.status === 'broken' || m.node.status === 'redirect';
        if (now - m.resolvedAt < (ripples ? MOTION.ripple : Math.max(MOTION.settle, MOTION.labelFade))) return true;
      }
      const eases = m.focus;
      if (eases && FOCUS_CHANNELS.some((channel) => now - eases[channel].start < MOTION.focus)) return true;
    }
    return false;
  };

  const restingPositionOf = (id: string): { x: number; y: number } | null => {
    const m = motions.get(id);
    return m ? { x: m.toX, y: m.toY } : null;
  };

  const hitTest = (x: number, y: number, radius: number, now: number): string | null => {
    let best: string | null = null;
    let bestDist = radius;
    for (const m of motions.values()) {
      if (now < m.appearAt) continue;
      const at = current(m, now);
      const dist = Math.hypot(at.x - x, at.y - y);
      if (dist <= bestDist) {
        best = m.node.id;
        bestDist = dist;
      }
    }
    return best;
  };

  return { sync, relayout, frame, isAnimating, bounds: () => bounds, restingPositionOf, hitTest };
};
