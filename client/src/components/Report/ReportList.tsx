import React from 'react';

import { TONE_CLASS } from '../Detail/StatusCode';
import { FOCUS_RING_INSET, HOVER_TRANSITION, rowBackground } from '../UI/styles';

import { responseMs } from '../../engine/statusText';

import type { ReportRow } from './reportRows';

interface ReportListProps {
  /** Sorted rows */
  rows: ReportRow[];
  /** Open a page in the graph view */
  onOpen: (id: string) => void;
  /** The page whose details are open */
  selectedId: string | null;
}

/**
 * The report on smaller screens: each page on two lines, its address and code on top, the reason and timing beneath.
 * @param props - Rows, open handler, and the selected page
 * @returns Report list
 */
export const ReportList: React.FC<ReportListProps> = ({ rows, onOpen, selectedId }) => (
  <ul aria-label="Pages found">
    {rows.map(({ node, path, status }) => {
      const ms = responseMs(node);
      const selected = node.id === selectedId;
      return (
        <li key={node.id}>
          <button
            type="button"
            onClick={() => onOpen(node.id)}
            title={node.url}
            aria-current={selected || undefined}
            className={`block w-full cursor-pointer border-b border-line-soft px-4 py-[11px] sm:px-5 text-left tabular-nums
              ${rowBackground(selected)} ${HOVER_TRANSITION} ${FOCUS_RING_INSET}`}
          >
            <span className="flex justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink">{path}</span>
              <span className={`flex-none font-medium ${TONE_CLASS[status.tone]}`}>{status.code ?? ''}</span>
            </span>
            <span className="mt-px flex justify-between gap-3 text-[12.5px] text-ink-3">
              {/* A failed request has no code, so its reason carries the tone instead. */}
              <span className={`truncate ${status.code === null ? TONE_CLASS[status.tone] : ''}`}>{status.reason}</span>
              {ms !== null && <span className="flex-none">{ms} ms</span>}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);
