import React from 'react';

import { TONE_CLASS } from '../Detail/StatusCode';
import { Icon } from '../UI/Icon';
import { FOCUS_RING, HOVER_TRANSITION, rowBackground } from '../UI/styles';

import { isSlow } from '../../engine/limits';
import { responseMs } from '../../engine/statusText';

import type { ReportRow, SortField, SortState } from './reportRows';

interface ReportTableProps {
  /** Sorted rows */
  rows: ReportRow[];
  /** Current sort */
  sort: SortState;
  /** Sort by a column, or flip the direction if it's already sorted by it */
  onSort: (field: SortField) => void;
  /** Open a page in the graph view */
  onOpen: (id: string) => void;
  /** The page whose details are open */
  selectedId: string | null;
}

const COLUMNS: Array<{ field: SortField; label: string; align: 'start' | 'end' }> = [
  { field: 'page', label: 'Page', align: 'start' },
  { field: 'status', label: 'Status', align: 'start' },
  { field: 'type', label: 'Type', align: 'start' },
  { field: 'response', label: 'Response', align: 'end' },
  { field: 'depth', label: 'Depth', align: 'end' },
  { field: 'links', label: 'Links found', align: 'end' },
];

const GRID = 'grid grid-cols-[minmax(0,1fr)_220px_110px_100px_80px_100px] items-center gap-x-4 px-5';
// The row's one control is the page link, stretched over the whole row; its focus ring is drawn on the row.
const ROW_FOCUS = 'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-accent';

/**
 * Every page as a sortable table. Status leads with the code in its tone and the reason in ink-2, and slow times are
 * set in ink so they stand out. On ultrawide screens the table stops at 1600px and centres.
 * @param props - Rows, sort state, and handlers
 * @returns Report table
 */
export const ReportTable: React.FC<ReportTableProps> = ({ rows, sort, onSort, onOpen, selectedId }) => (
  <div role="table" aria-label="Pages found" aria-rowcount={rows.length + 1} className="mx-auto max-w-[1600px]">
    <div role="rowgroup" className="sticky top-0 z-10 bg-surface">
      <div role="row" className={`${GRID} h-9 border-b border-line text-xs font-medium text-ink-3 coarse:h-11`}>
        {COLUMNS.map((column) => {
          const active = sort.field === column.field;
          return (
            <div
              key={column.field}
              role="columnheader"
              aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
              className={column.align === 'end' ? 'justify-self-end' : 'justify-self-start'}
            >
              <button
                type="button"
                onClick={() => onSort(column.field)}
                className={`flex cursor-pointer items-center gap-1 rounded-sm coarse:h-8 ${active ? 'text-ink' : 'hover:text-ink'} ${HOVER_TRANSITION} ${FOCUS_RING}`}
              >
                {column.label}
                {active && <Icon name="chevron" size={11} className={sort.dir === 'desc' ? 'rotate-180' : ''} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
    <div role="rowgroup">
      {rows.map(({ node, path, status, type }) => {
        const selected = node.id === selectedId;
        const ms = responseMs(node);
        return (
          <div
            key={node.id}
            role="row"
            aria-current={selected || undefined}
            className={`${GRID} relative h-10 border-b border-line-soft text-[12.5px] tabular-nums text-ink
              ${rowBackground(selected)} ${HOVER_TRANSITION} ${ROW_FOCUS}`}
          >
            <span role="cell" className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(node.id)}
                title={node.url}
                className="block w-full scroll-mt-9 cursor-pointer truncate text-left font-medium leading-10 outline-none after:absolute after:inset-0
                  after:content-[''] coarse:scroll-mt-11"
              >
                {path}
              </button>
            </span>
            <span role="cell" className="flex items-baseline gap-2 whitespace-nowrap">
              {status.code !== null && <span className={`font-medium ${TONE_CLASS[status.tone]}`}>{status.code}</span>}
              <span className={status.code === null ? `font-medium ${TONE_CLASS[status.tone]}` : 'text-ink-2'}>{status.reason}</span>
            </span>
            <span role="cell" className="text-ink-2">
              {type}
            </span>
            <span role="cell" className={`text-right ${isSlow(node) ? 'text-ink' : 'text-ink-2'}`}>
              {ms !== null ? `${ms} ms` : ''}
            </span>
            <span role="cell" className="text-right text-ink-2">
              {node.depth}
            </span>
            <span role="cell" className="text-right text-ink-2">
              {node.outbound.length}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);
