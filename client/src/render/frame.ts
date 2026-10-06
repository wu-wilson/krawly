/** A cubic Bézier curve as [x0, y0, x1, y1, x2, y2, x3, y3], in map units */
export type Cubic = [number, number, number, number, number, number, number, number];

/** How a page is drawn. Status reads from fill, ring, and color; every glyph settles at `NODE_R`. */
export type NodeGlyph = 'healthy' | 'broken' | 'redirect' | 'queued' | 'fetching' | 'skipped';

/** A page on the map */
export interface FrameNode {
  x: number;
  y: number;
  /** Radius in map units, including any pop-in scale */
  r: number;
  glyph: NodeGlyph;
  /** 0 to 1, multiplied with the frame's opacity */
  alpha?: number;
}

/** A link from a parent page to a page it led to */
export interface FrameEdge {
  curve: Cubic;
  /** Curve parameter where the line meets the child's edge, so it never runs into the node */
  stop: number;
  /** 0 to 1 growth from the parent. The arrowhead appears once the line is fully grown. */
  grow: number;
  /** 0 to 1, multiplied with the frame's opacity */
  alpha?: number;
  /** 0 to 1, how far the line has turned into the accent as part of the selected page's path */
  trail?: number;
}

/** A request in flight, shown as a dot travelling down the incoming line */
export interface FramePulse {
  x: number;
  y: number;
  /** 0 to 1, multiplied with the frame's opacity */
  alpha?: number;
}

/** A ring that spreads from a page as it lands with a problem */
export interface FrameRipple {
  x: number;
  y: number;
  /** Radius in map units, growing as the ripple spreads */
  r: number;
  tone: 'broken' | 'redirect';
  /** 0 to 1, multiplied with the frame's opacity */
  alpha: number;
}

/** A text label beside a page */
export interface FrameLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'end';
  /** Set in ink at a heavier weight, for the start page */
  emphasis?: boolean;
  /** 0 to 1, multiplied with the frame's opacity */
  alpha: number;
}

/** The double accent ring around a selected page */
export interface FrameRing {
  x: number;
  y: number;
  /** The page's radius in map units; the rings sit outside it */
  r: number;
  /** 0 to 1, multiplied with the frame's opacity */
  alpha: number;
}

/** Everything drawn in one frame of a crawl map */
export interface GraphFrame {
  edges: FrameEdge[];
  nodes: FrameNode[];
  pulses: FramePulse[];
  ripples: FrameRipple[];
  labels: FrameLabel[];
  /** Thin ring that marks the start page */
  startRing: { x: number; y: number; alpha: number } | null;
  /** Double accent rings around the selected page, and around one whose ring is still fading out */
  selectionRings: FrameRing[];
  /** Paint the canvas color and a dot grid that moves with the map, instead of leaving the canvas transparent */
  grid: boolean;
  /** Label font size in map units */
  labelSize: number;
  /** 0 to 1 for the whole frame */
  alpha: number;
}

/** Maps map units to CSS pixels: screen = map * k + (x, y) */
export interface ViewTransform {
  k: number;
  x: number;
  y: number;
}
