/** The parts of a crawl node the layout needs */
interface LayoutNode {
  id: string;
  parentId: string | null;
}

/** A page's place on the map, in map units with the start page at the origin */
interface LayoutPoint {
  x: number;
  y: number;
  /** Angle from the start page in radians, clockwise from east */
  angle: number;
  depth: number;
}

/** The whole map's positions and extent */
export interface MapLayout {
  points: Map<string, LayoutPoint>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** Ring radii for a small site: the start page, then one, two, and three clicks out */
export const BASE_RINGS = [0, 125, 210, 282];

/** The most a map stretches sideways to fill a landscape canvas */
export const MAX_STRETCH = 1.75;

// Rings never sit closer than this, so each depth reads as its own band.
const MIN_RING_GAP = 60;
// Neighbours on a ring keep at least this much space between their centres.
const MIN_NODE_GAP = 12;

/**
 * Pick how far to stretch the map sideways for a canvas, so it fills a landscape canvas but stays round on a phone.
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Stretch factor from 1 to MAX_STRETCH
 */
export const stretchFor = (width: number, height: number): number =>
  height > 0 ? Math.max(1, Math.min(MAX_STRETCH, (width / height) * 0.93)) : 1;

/**
 * Lay a crawl out as a radial tree. Each page sits on the ring for its depth, and each branch gets a share of the
 * circle proportional to the leaf pages under it, so the outer rings fill evenly. Children keep discovery order,
 * so pages don't reshuffle as a crawl streams in. Crowded rings grow until neighbours have room.
 * @param nodes - Nodes in discovery order; the first without a known parent is the start page
 * @param stretchX - Horizontal stretch (1 keeps the map round)
 * @returns Positions for every node, plus the map's bounds
 */
export const layoutRadialTree = (nodes: Iterable<LayoutNode>, stretchX: number): MapLayout => {
  const list = Array.from(nodes);
  const ids = new Set(list.map((node) => node.id));
  const children = new Map<string, string[]>();
  const childrenOf = (id: string): string[] => {
    let kids = children.get(id);
    if (!kids) {
      kids = [];
      children.set(id, kids);
    }
    return kids;
  };

  let rootId: string | null = null;
  for (const node of list) {
    const parent = node.parentId !== null && ids.has(node.parentId) ? node.parentId : null;
    if (parent !== null) childrenOf(parent).push(node.id);
    else if (rootId === null) rootId = node.id;
    else childrenOf(rootId).push(node.id);
  }

  const points = new Map<string, LayoutPoint>();
  if (rootId === null) return { points, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };

  // Leaves under each node, so every page gets at least one equal slice of the circle.
  const weight = new Map<string, number>();
  const measure = (id: string): number => {
    const kids = children.get(id) ?? [];
    const total = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + measure(kid), 0);
    weight.set(id, total);
    return total;
  };
  const unit = (Math.PI * 2) / measure(rootId);

  // Each child takes the middle of its share of the parent's span. The first branch is centred due east and
  // the rest follow clockwise.
  const angles = new Map<string, { angle: number; depth: number }>();
  const assign = (id: string, start: number, depth: number): void => {
    angles.set(id, { angle: start + ((weight.get(id) ?? 1) * unit) / 2, depth });
    let cursor = start;
    for (const kid of children.get(id) ?? []) {
      assign(kid, cursor, depth + 1);
      cursor += (weight.get(kid) ?? 1) * unit;
    }
  };
  const firstBranch = children.get(rootId)?.[0];
  assign(rootId, firstBranch ? -((weight.get(firstBranch) ?? 1) * unit) / 2 : 0, 0);
  angles.set(rootId, { angle: 0, depth: 0 });

  // Grow any ring whose closest neighbours would touch.
  const byDepth = new Map<number, number[]>();
  for (const { angle, depth } of angles.values()) {
    if (depth === 0) continue;
    const ring = byDepth.get(depth) ?? [];
    ring.push(angle);
    byDepth.set(depth, ring);
  }
  const maxDepth = Math.max(0, ...byDepth.keys());
  const radii = [0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const base = BASE_RINGS[depth] ?? 0;
    const ring = (byDepth.get(depth) ?? []).sort((a, b) => a - b);
    let needed = 0;
    if (ring.length > 1) {
      let tightest = Math.PI * 2;
      for (let i = 0; i < ring.length; i++) {
        const next = i === ring.length - 1 ? ring[0] + Math.PI * 2 : ring[i + 1];
        tightest = Math.min(tightest, next - ring[i]);
      }
      needed = MIN_NODE_GAP / tightest;
    }
    radii.push(Math.max(base, needed, radii[depth - 1] + MIN_RING_GAP));
  }

  const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  for (const [id, { angle, depth }] of angles) {
    const r = radii[depth] ?? 0;
    const x = Math.cos(angle) * r * stretchX;
    const y = Math.sin(angle) * r;
    points.set(id, { x, y, angle, depth });
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  return { points, bounds };
};
