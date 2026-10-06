import type { Cubic } from '../../render/frame';

/** SVG path data for the four bundles of silk threads */
export interface SilkPaths {
  /** Upper half, main bundle */
  upperMain: string;
  /** Upper half, faint back bundle */
  upperBack: string;
  /** Lower half, main bundle */
  lowerMain: string;
  /** Lower half, faint back bundle */
  lowerBack: string;
}

const MAIN_THREADS = 34;
const BACK_THREADS = 14;
// One slow sway cycle, in seconds.
const SWAY_SECONDS = 9;

const round = (v: number): number => Math.round(v * 10) / 10;

/**
 * Write threads as SVG path data, optionally turned 180 degrees and shifted.
 * @param threads - Thread curves
 * @param k - 1 as drawn, -1 to turn the bundle 180 degrees
 * @param dx - Horizontal shift after turning
 * @returns Path data
 */
const toPath = (threads: Cubic[], k: number, dx: number): string =>
  threads
    .map((c) => {
      const pt = (x: number, y: number) => `${round(x * k + dx)},${round(y * k)}`;
      return `M${pt(c[0], c[1])}C${pt(c[2], c[3])} ${pt(c[4], c[5])} ${pt(c[6], c[7])}`;
    })
    .join('');

/**
 * Compute the silk threads at a moment in their sway. The upper half fans out from behind the demo window's
 * top-right corner. The lower half is the same bundle turned 180 degrees and slid 120px left, so its deep curve
 * sits in the margin beside the spec list.
 * @param seconds - Time into the sway
 * @returns Path data for each bundle, in each half's own coordinates
 */
export const silkPaths = (seconds: number): SilkPaths => {
  // Each thread runs a little behind the one before, so the twist drifts.
  const w = (Math.PI * 2 * seconds) / SWAY_SECONDS;
  const sway = (phase: number): [number, number, number, number] => [
    5.5 * Math.sin(w + phase),
    7 * Math.sin(w * 0.8 + phase + 1),
    11 * Math.sin(w + phase + 0.6),
    8 * Math.sin(w * 0.7 + phase + 2),
  ];

  const main: Cubic[] = [];
  for (let i = 0; i < MAIN_THREADS; i++) {
    const t = i / (MAIN_THREADS - 1);
    const d = sway(t * 1.6);
    main.push([-1020 + 300 * t, 376, -620 + 60 * t, 176 - 60 * t + d[0], -220 + 180 * (t - 0.5) + d[1], -104 + 160 * (0.5 - t) + d[2], 280, -224 + 240 * t + d[3]]);
  }

  const back: Cubic[] = [];
  for (let i = 0; i < BACK_THREADS; i++) {
    const t = i / (BACK_THREADS - 1);
    const d = sway(t * 1.6 + 0.4);
    back.push([-1120 + 400 * t, 376, -670 + 100 * t, 236 - 120 * t + d[0], -140 + 120 * (t - 0.5) + d[1], -144 + 220 * (0.5 - t) + d[2], 280, -324 + 380 * t + d[3]]);
  }

  return {
    upperMain: toPath(main, 1, 0),
    upperBack: toPath(back, 1, 0),
    lowerMain: toPath(main, -1, -120),
    lowerBack: toPath(back, -1, -120),
  };
};
