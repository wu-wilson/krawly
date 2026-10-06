import React from 'react';

import type { StatusTone } from '../../engine/statusText';

interface StatusCodeProps {
  /** HTTP code, or null when there was no response */
  code: number | null;
  /** Reason phrase or failure, such as "Not Found" */
  reason: string;
  /** Colors the code, or the reason when there's no code */
  tone: StatusTone;
  /** Response time to show at the far end, in ms */
  ms?: number | null;
  /** `lg` for the detail panel header, `md` for the sheet */
  size?: 'lg' | 'md';
}

/** Text color for each status tone */
export const TONE_CLASS: Record<StatusTone, string> = {
  broken: 'text-broken',
  redirect: 'text-redirect',
  ok: 'text-ink',
  muted: 'text-ink-3',
};

/**
 * A status code in its tone, followed by the reason in ink. With no code, the reason itself carries the tone.
 * @param props - Code, reason, tone, and optional timing
 * @returns Status line
 */
export const StatusCode: React.FC<StatusCodeProps> = ({ code, reason, tone, ms, size = 'lg' }) => (
  <div className="flex items-baseline gap-2.5">
    {code !== null ? (
      <>
        <span className={`font-medium leading-none tracking-[-0.02em] tabular-nums ${TONE_CLASS[tone]} ${size === 'lg' ? 'text-[26px]' : 'text-2xl'}`}>
          {code}
        </span>
        <span className="text-[13.5px] font-medium text-ink">{reason}</span>
      </>
    ) : (
      <span className={`text-[15px] font-semibold tracking-[-0.01em] ${TONE_CLASS[tone]}`}>{reason}</span>
    )}
    {ms !== null && ms !== undefined && (
      <span className="ml-auto whitespace-nowrap text-[12.5px] tabular-nums text-ink-3">{ms} ms</span>
    )}
  </div>
);
