import { EMPTY_STATS } from '../../store/filters';

import { CRAWL_LIMITS, SLOW_RESPONSE_MS } from '../../engine/limits';
import { BASE_RINGS, MAX_STRETCH } from '../../graph/layout';
import { bowedLink, pointOnCubic } from '../../render/cubic';
import { labelPlacement, startLabelPlacement } from '../../render/labels';
import { MOTION, clamp01, easeInOutQuad, edgeGrow, edgeStop, labelFade, nodeRadius, rippleAt } from '../../render/motion';

import type { Cubic, FrameEdge, FrameLabel, FrameNode, FramePulse, FrameRipple, GraphFrame } from '../../render/frame';
import type { CrawlStats } from '../../store/filters';

type DemoStatus = 'healthy' | 'broken' | 'redirect';

interface DemoNode {
  x: number;
  y: number;
  status: DemoStatus;
  /** Drives the animation's pacing */
  ms: number;
  /** Response time the demo reports, which decides whether the page counts as slow */
  responseMs: number;
  children: DemoNode[];
  inEdge: DemoEdge | null;
  /** ms into the loop when the node appears */
  appear: number;
  /** ms into the loop when its request starts */
  fetch: number;
  /** ms into the loop when its request finishes */
  resolve: number;
}

interface DemoEdge {
  curve: Cubic;
  stop: number;
  child: DemoNode;
}

interface DemoLabel {
  text: string;
  node: DemoNode;
  /** Angle from the start page, for placing the label; null for the start page's own label */
  angle: number | null;
}

/** A scripted crawl of example.com, laid out and timed in advance */
interface DemoCrawl {
  nodes: DemoNode[];
  edges: DemoEdge[];
  labels: DemoLabel[];
  root: DemoNode;
  /** Map units to frame around the start page */
  extent: { width: number; height: number };
  /** When the last page resolves, in ms */
  end: number;
  /** One full loop: the crawl, a pause on the finished map, and a fade out */
  period: number;
  /** The finished map holds perfectly still from this time until `restUntil`, in ms */
  restFrom: number;
  /** When the fade out begins, in ms */
  restUntil: number;
}

/** What the demo shows at one moment */
export interface DemoSnapshot {
  frame: GraphFrame;
  /** Counts for the filter tabs, as the app keeps them */
  stats: CrawlStats;
  crawling: boolean;
  /** Seconds the crawl took, once it's done */
  seconds: number;
  /** Opacity of the loading line under the top bar */
  loaderOpacity: number;
}

/** The site the demo crawls, named on its map, top bar, and description */
export const DEMO_HOST = 'example.com';

/** Map units the demo is laid out in, centred on the start page */
export const DEMO_VIEW = { width: 1200, height: 640, cx: 600, cy: 320 } as const;

// The compact crawl's round two rings, with room for their labels.
const COMPACT_EXTENT = 480;

const HOLD_MS = 7000;
const FADE_MS = 700;
// The loading line fades out over this long once the crawl ends.
const LOADER_FADE_MS = 600;

// Six sections spaced evenly around the start page. Each number is a page one click deeper, and its value is how
// many pages hang off it. Statuses are placed by hand so the few problems spread across the map, and all but one sit
// on the second ring, which the compact crawl keeps: "b" is broken, "r" is a redirect. Broken pages never have
// children, since Krawly can't read their links.
const HUBS: Array<{ key: string; kids: number[]; status?: Record<string, 'b' | 'r'> }> = [
  { key: 'changelog', kids: [2, 0, 1], status: { k0: 'r' } },
  { key: 'api', kids: [1, 2, 1, 0], status: { k3: 'b' } },
  { key: 'pricing', kids: [1, 1], status: { k0: 'r' } },
  { key: 'about', kids: [0, 1, 1] },
  { key: 'docs', kids: [2, 1, 2, 1], status: { k2l1: 'b' } },
  { key: 'blog', kids: [1, 2, 0], status: { k2: 'b' } },
];

// Angular spacing, in degrees, between a section's pages and between their children.
const KID_GAP = 14;
const LEAF_GAP = 6;

/**
 * Build the scripted crawl: a balanced radial tree of 46 pages, fetched as many at a time as the real crawler. The
 * compact version is round and two rings deep (26 pages), so a phone's square window shows all of it.
 * @param compact - Build the compact version
 * @returns The laid-out, timed crawl
 */
export const buildDemoCrawl = (compact: boolean): DemoCrawl => {
  const stretch = compact ? 1 : MAX_STRETCH;
  let seed = 20261005;
  const rnd = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const randomMs = (): number => Math.round(40 + Math.pow(rnd(), 2.2) * 880);
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const polar = (deg: number, depth: number): { x: number; y: number } => ({
    x: DEMO_VIEW.cx + Math.cos(rad(deg)) * BASE_RINGS[depth] * stretch,
    y: DEMO_VIEW.cy + Math.sin(rad(deg)) * BASE_RINGS[depth],
  });

  const nodes: DemoNode[] = [];
  const edges: DemoEdge[] = [];
  // Reported times run at twice the pacing value, so about one page in seven lands over the slow threshold.
  const add = (x: number, y: number, status: DemoStatus, ms: number): DemoNode => {
    const node: DemoNode = { x, y, status, ms, responseMs: ms * 2, children: [], inEdge: null, appear: 0, fetch: 0, resolve: 0 };
    nodes.push(node);
    return node;
  };
  const link = (a: DemoNode, b: DemoNode): void => {
    const edge: DemoEdge = { curve: bowedLink(a.x, a.y, b.x, b.y), stop: edgeStop(Math.hypot(b.x - a.x, b.y - a.y)), child: b };
    edges.push(edge);
    b.inEdge = edge;
    a.children.push(b);
  };
  const statusOf = (code: 'b' | 'r' | undefined): DemoStatus => (code === 'b' ? 'broken' : code === 'r' ? 'redirect' : 'healthy');

  const root = add(DEMO_VIEW.cx, DEMO_VIEW.cy, 'healthy', 182);
  const labels: DemoLabel[] = [{ text: DEMO_HOST, node: root, angle: null }];

  HUBS.forEach((hub, i) => {
    const hubDeg = i * 60;
    const hp = polar(hubDeg, 1);
    const hubNode = add(hp.x, hp.y, 'healthy', randomMs());
    link(root, hubNode);
    labels.push({ text: `/${hub.key}`, node: hubNode, angle: rad(hubDeg) });

    hub.kids.forEach((leafCount, j) => {
      const kidDeg = hubDeg + (j - (hub.kids.length - 1) / 2) * KID_GAP;
      const kp = polar(kidDeg, 2);
      const kid = add(kp.x, kp.y, statusOf(hub.status?.[`k${j}`]), randomMs());
      link(hubNode, kid);
      if (compact) return;
      for (let k = 0; k < leafCount; k++) {
        const lp = polar(kidDeg + (k - (leafCount - 1) / 2) * LEAF_GAP, 3);
        link(kid, add(lp.x, lp.y, statusOf(hub.status?.[`k${j}l${k}`]), randomMs()));
      }
    });
  });

  // As many requests at a time as the real crawler. A page joins the queue once its parent resolves and its line
  // has finished growing.
  root.appear = 150;
  const waiting: Array<{ node: DemoNode; ready: number }> = [{ node: root, ready: root.appear }];
  const lanes: number[] = new Array(CRAWL_LIMITS.maxConcurrent).fill(0);
  while (waiting.length > 0) {
    waiting.sort((a, b) => a.ready - b.ready);
    const next = waiting.shift();
    if (!next) break;
    lanes.sort((a, b) => a - b);
    const node = next.node;
    node.fetch = Math.max(lanes[0], next.ready);
    node.resolve = node.fetch + 260 + node.ms * 0.35;
    lanes[0] = node.resolve;
    node.children.forEach((child, k) => {
      child.appear = node.resolve + 40 + k * 60;
      waiting.push({ node: child, ready: child.appear + MOTION.grow });
    });
  }

  const end = nodes.reduce((latest, node) => Math.max(latest, node.resolve), 0);
  const period = end + HOLD_MS;
  // The last ripples, settles, and label fades finish within the longest of these.
  const restFrom = end + Math.max(MOTION.ripple, MOTION.settle, MOTION.labelFade, LOADER_FADE_MS);
  const extent = compact ? { width: COMPACT_EXTENT, height: COMPACT_EXTENT } : { width: DEMO_VIEW.width, height: DEMO_VIEW.height };
  return { nodes, edges, labels, root, extent, end, period, restFrom, restUntil: period - FADE_MS };
};

/**
 * Compute what the demo shows at a point in its loop.
 * @param crawl - The scripted crawl
 * @param t - Time into the loop in ms
 * @param labelSize - Label font size in map units
 * @returns The frame, counts, crawl state, the crawl's duration, and loading-line opacity at that moment
 */
export const snapshotAt = (crawl: DemoCrawl, t: number, labelSize: number): DemoSnapshot => {
  const edges: FrameEdge[] = [];
  for (const edge of crawl.edges) {
    if (t >= edge.child.appear) edges.push({ curve: edge.curve, stop: edge.stop, grow: edgeGrow(t - edge.child.appear) });
  }

  const nodes: FrameNode[] = [];
  const pulses: FramePulse[] = [];
  const ripples: FrameRipple[] = [];
  const stats: CrawlStats = { ...EMPTY_STATS };

  for (const node of crawl.nodes) {
    if (t < node.appear) continue;
    stats.total += 1;

    if (t < node.resolve) {
      const fetching = t >= node.fetch;
      nodes.push({ x: node.x, y: node.y, r: nodeRadius(t - node.appear, null), glyph: fetching ? 'fetching' : 'queued' });
      // While a page is being fetched, a pulse travels down its incoming line and lands as the page resolves.
      if (fetching && node.inEdge) {
        const progress = easeInOutQuad(clamp01((t - node.fetch) / (node.resolve - node.fetch)));
        const [x, y] = pointOnCubic(node.inEdge.curve, progress * node.inEdge.stop);
        pulses.push({ x, y });
      }
      continue;
    }

    if (node.responseMs >= SLOW_RESPONSE_MS) stats.slow += 1;
    if (node.status === 'broken') stats.broken += 1;
    if (node.status === 'redirect') stats.redirects += 1;
    nodes.push({ x: node.x, y: node.y, r: nodeRadius(t - node.appear, t - node.resolve), glyph: node.status });
    if (node.status !== 'healthy') {
      const ripple = rippleAt(node.x, node.y, t - node.resolve, node.status);
      if (ripple) ripples.push(ripple);
    }
  }

  const labels: FrameLabel[] = crawl.labels.map(({ text, node, angle }) => ({
    ...(angle === null ? startLabelPlacement(node.x, node.y, labelSize) : labelPlacement(node.x, node.y, angle, labelSize)),
    text,
    emphasis: angle === null,
    alpha: labelFade(t - node.resolve),
  }));

  const crawling = t < crawl.end;
  const alpha = t > crawl.restUntil ? (crawl.period - t) / FADE_MS : 1;

  return {
    frame: {
      edges,
      nodes,
      pulses,
      ripples,
      labels,
      startRing: { x: crawl.root.x, y: crawl.root.y, alpha: labelFade(t - crawl.root.resolve) },
      selectionRings: [],
      grid: false,
      labelSize,
      alpha,
    },
    stats,
    crawling,
    seconds: crawl.end / 1000,
    loaderOpacity: (crawling ? 1 : 1 - clamp01((t - crawl.end) / LOADER_FADE_MS)) * 0.85,
  };
};
