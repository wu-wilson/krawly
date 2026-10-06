import { MAP_COLORS } from './colors';
import { cutCubic } from './cubic';
import { START_RING_R } from './motion';

import type { FrameNode, GraphFrame, NodeGlyph, ViewTransform } from './frame';

const ARROW = 5;
const PULSE_R = 2.2;
const PULSE_HALO_R = 5;
const GRID_SPACING = 22;
// Below this many pixels apart the grid would crowd into a texture, so it thins to every other dot.
const GRID_MIN_SPACING = 14;
const LABEL_FONT = '"Instrument Sans", system-ui, -apple-system, sans-serif';

// Problems paint last so they're never covered by a neighbour.
const GLYPH_ORDER: Record<NodeGlyph, number> = { skipped: 0, queued: 1, fetching: 2, healthy: 3, redirect: 4, broken: 5 };

// One grid dot, drawn once and repeated as a pattern. Rebuilt only when the dot's size changes.
let gridTile: { canvas: HTMLCanvasElement; size: number; radius: number } | null = null;

/**
 * Draw one frame of a crawl map. Clears the canvas, then paints the dot grid when `frame.grid` is set and leaves
 * it transparent otherwise, so a caller's own backdrop shows through.
 * @param ctx - 2D context of the target canvas
 * @param frame - What to draw
 * @param view - Map-to-screen transform in CSS pixels
 * @param width - Canvas width in CSS pixels
 * @param height - Canvas height in CSS pixels
 * @param dpr - Device pixel ratio the canvas backing store was sized for
 */
export const drawFrame = (
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  view: ViewTransform,
  width: number,
  height: number,
  dpr: number,
): void => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width * dpr, height * dpr);
  if (frame.grid) drawGrid(ctx, view, width * dpr, height * dpr, dpr);
  if (frame.alpha <= 0) return;

  ctx.setTransform(dpr * view.k, 0, 0, dpr * view.k, dpr * view.x, dpr * view.y);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  drawEdges(ctx, frame);

  ctx.fillStyle = MAP_COLORS.accent;
  for (const p of frame.pulses) {
    const alpha = frame.alpha * (p.alpha ?? 1);
    ctx.globalAlpha = alpha * 0.16;
    fillCircle(ctx, p.x, p.y, PULSE_HALO_R);
    ctx.globalAlpha = alpha;
    fillCircle(ctx, p.x, p.y, PULSE_R);
  }

  ctx.lineWidth = 1;
  for (const ripple of frame.ripples) {
    ctx.globalAlpha = frame.alpha * ripple.alpha;
    ctx.strokeStyle = ripple.tone === 'broken' ? MAP_COLORS.broken : MAP_COLORS.redirect;
    strokeCircle(ctx, ripple.x, ripple.y, ripple.r);
  }

  if (frame.startRing && frame.startRing.alpha > 0) {
    ctx.globalAlpha = frame.alpha * frame.startRing.alpha * 0.22;
    ctx.strokeStyle = MAP_COLORS.ink;
    strokeCircle(ctx, frame.startRing.x, frame.startRing.y, START_RING_R);
  }

  const nodes = [...frame.nodes].sort((a, b) => GLYPH_ORDER[a.glyph] - GLYPH_ORDER[b.glyph]);
  for (const node of nodes) drawNode(ctx, node, frame.alpha);

  ctx.strokeStyle = MAP_COLORS.accent;
  for (const { x, y, r, alpha } of frame.selectionRings) {
    ctx.globalAlpha = frame.alpha * alpha;
    ctx.lineWidth = 1.5;
    strokeCircle(ctx, x, y, r + 5);
    ctx.globalAlpha = frame.alpha * alpha * 0.22;
    ctx.lineWidth = 1;
    strokeCircle(ctx, x, y, r + 11);
  }

  drawLabels(ctx, frame);
  ctx.globalAlpha = 1;
};

/**
 * Paint the canvas color and a dot grid fixed to map positions, so the backdrop pans and zooms with the map. Drawn
 * in device pixels as one repeating pattern.
 * @param ctx - Canvas context, in device pixels
 * @param view - Map-to-screen transform in CSS pixels
 * @param width - Canvas width in device pixels
 * @param height - Canvas height in device pixels
 * @param dpr - Device pixel ratio
 */
const drawGrid = (ctx: CanvasRenderingContext2D, view: ViewTransform, width: number, height: number, dpr: number): void => {
  ctx.fillStyle = MAP_COLORS.canvas;
  ctx.fillRect(0, 0, width, height);

  let spacing = GRID_SPACING * view.k * dpr;
  while (spacing < GRID_MIN_SPACING * dpr) spacing *= 2;
  const radius = Math.max(0.6, Math.min(1.4, view.k)) * dpr;

  // The tile is a whole number of pixels; the pattern's scale makes up the fraction so dots stay on the grid.
  const size = Math.max(1, Math.round(spacing));
  const scale = spacing / size;
  const tileRadius = Math.round((radius / scale) * 20) / 20;
  if (!gridTile || gridTile.size !== size || gridTile.radius !== tileRadius) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const tile = canvas.getContext('2d');
    if (!tile) return;
    tile.fillStyle = MAP_COLORS.grid;
    tile.beginPath();
    tile.arc(size / 2, size / 2, tileRadius, 0, Math.PI * 2);
    tile.fill();
    gridTile = { canvas, size, radius: tileRadius };
  }

  const pattern = ctx.createPattern(gridTile.canvas, 'repeat');
  if (!pattern) return;
  const offsetX = (((view.x * dpr) % spacing) + spacing) % spacing;
  const offsetY = (((view.y * dpr) % spacing) + spacing) % spacing;
  pattern.setTransform(new DOMMatrix([scale, 0, 0, scale, offsetX - spacing / 2, offsetY - spacing / 2]));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
};

/**
 * Draw links growing from their parents, each finished with a solid arrowhead it stops under. A link on the
 * selected page's path fades the accent in over its plain colors.
 * @param ctx - Canvas context, in map units
 * @param frame - Frame to draw
 */
const drawEdges = (ctx: CanvasRenderingContext2D, frame: GraphFrame): void => {
  // Trail lines go last so the selected path sits on top of everything it crosses.
  const ordered = frame.edges.some((edge) => edge.trail) ? [...frame.edges].sort((a, b) => (a.trail ?? 0) - (b.trail ?? 0)) : frame.edges;
  for (const edge of ordered) {
    if (edge.grow <= 0) continue;
    const { head, tangent } = cutCubic(edge.curve, edge.grow * edge.stop);
    const [ux, uy] = tangent;
    const endX = head[6];
    const endY = head[7];
    const grown = edge.grow >= 1;
    const lineX = grown ? endX - ux * ARROW * 0.75 : endX;
    const lineY = grown ? endY - uy * ARROW * 0.75 : endY;
    const alpha = frame.alpha * (edge.alpha ?? 1);
    const trail = edge.trail ?? 0;

    const strokeLine = (color: string, width: number, opacity: number) => {
      ctx.globalAlpha = opacity;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(head[0], head[1]);
      ctx.bezierCurveTo(head[2], head[3], head[4], head[5], lineX, lineY);
      ctx.stroke();
    };
    const fillArrow = (color: string, opacity: number) => {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - ux * ARROW + uy * ARROW * 0.45, endY - uy * ARROW - ux * ARROW * 0.45);
      ctx.lineTo(endX - ux * ARROW - uy * ARROW * 0.45, endY - uy * ARROW + ux * ARROW * 0.45);
      ctx.closePath();
      ctx.fill();
    };

    // The wider accent line covers the plain one, so the plain one only shows while the accent fades.
    if (trail < 1) strokeLine(MAP_COLORS.edge, 1, alpha);
    if (trail > 0) strokeLine(MAP_COLORS.accent, 1.5, alpha * trail);
    if (!grown) continue;
    if (trail < 1) fillArrow(MAP_COLORS.arrow, alpha);
    if (trail > 0) fillArrow(MAP_COLORS.accent, alpha * trail);
  }
};

/**
 * Draw a node: healthy and broken pages are solid; redirects, unresolved, and skipped pages are white with a colored ring.
 * @param ctx - Canvas context, in map units
 * @param node - Node to draw
 * @param frameAlpha - The whole frame's opacity
 */
const drawNode = (ctx: CanvasRenderingContext2D, node: FrameNode, frameAlpha: number): void => {
  if (node.r <= 0) return;
  ctx.globalAlpha = frameAlpha * (node.alpha ?? 1);
  switch (node.glyph) {
    case 'healthy':
      ctx.fillStyle = MAP_COLORS.node;
      fillCircle(ctx, node.x, node.y, node.r);
      return;
    case 'broken':
      ctx.fillStyle = MAP_COLORS.broken;
      fillCircle(ctx, node.x, node.y, node.r);
      return;
    case 'redirect':
      ringCircle(ctx, node, MAP_COLORS.redirect, 1.6);
      return;
    case 'fetching':
      ringCircle(ctx, node, MAP_COLORS.accent, 1.4);
      return;
    case 'queued':
    case 'skipped':
      ringCircle(ctx, node, MAP_COLORS.queued, 1.2);
  }
};

/**
 * Draw labels on a halo of the canvas color, so they stay legible where they cross a line.
 * @param ctx - Canvas context, in map units
 * @param frame - Frame whose labels to draw
 */
const drawLabels = (ctx: CanvasRenderingContext2D, frame: GraphFrame): void => {
  ctx.lineJoin = 'round';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = frame.labelSize * 0.36;
  for (const label of frame.labels) {
    if (label.alpha <= 0) continue;
    // Canvas ignores an alpha above 1 and keeps the previous one, so the product is capped.
    ctx.globalAlpha = Math.min(1, frame.alpha * label.alpha);
    ctx.font = `${label.emphasis ? 600 : 500} ${frame.labelSize}px ${LABEL_FONT}`;
    ctx.textAlign = label.anchor === 'end' ? 'right' : 'left';
    ctx.strokeStyle = MAP_COLORS.canvas;
    ctx.strokeText(label.text, label.x, label.y);
    ctx.fillStyle = label.emphasis ? MAP_COLORS.ink : MAP_COLORS.label;
    ctx.fillText(label.text, label.x, label.y);
  }
};

// Circle primitives for the glyphs. A ringed node is a white disc with a colored stroke. Radii are floored at 0, since
// arc() throws on a negative one.
const fillCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.fill();
};

const strokeCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  ctx.stroke();
};

const ringCircle = (ctx: CanvasRenderingContext2D, node: FrameNode, color: string, width: number): void => {
  ctx.fillStyle = MAP_COLORS.white;
  fillCircle(ctx, node.x, node.y, node.r);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  strokeCircle(ctx, node.x, node.y, node.r);
};
