import { describeStatus, displayPath, responseMs, typeLabel } from '../../engine/statusText';

import type { StatusDescription } from '../../engine/statusText';
import type { CrawlNode, NodeStatus } from '../../engine/types';

/** Columns the report can sort by */
export type SortField = 'page' | 'status' | 'type' | 'response' | 'depth' | 'links';

/** Which column the report is sorted by, and which way */
export interface SortState {
  field: SortField;
  dir: 'asc' | 'desc';
}

/** One page, ready to show in the report */
export interface ReportRow {
  node: CrawlNode;
  /** Address as shown */
  path: string;
  /** Code, reason, and tone as the UI shows them */
  status: StatusDescription;
  /** Resource type label */
  type: string;
}

// Problems first: broken, then redirects, then pages left unchecked, then healthy pages, then the crawl's queue.
const STATUS_RANK: Record<NodeStatus, number> = { broken: 0, redirect: 1, skipped: 2, healthy: 3, pending: 4, queued: 5 };

const byPath = (a: ReportRow, b: ReportRow): number => a.path.localeCompare(b.path);

const COMPARE: Record<SortField, (a: ReportRow, b: ReportRow) => number> = {
  page: byPath,
  status: (a, b) => STATUS_RANK[a.node.status] - STATUS_RANK[b.node.status] || a.node.depth - b.node.depth || byPath(a, b),
  type: (a, b) => a.type.localeCompare(b.type) || byPath(a, b),
  response: (a, b) => (responseMs(a.node) ?? 0) - (responseMs(b.node) ?? 0) || byPath(a, b),
  depth: (a, b) => a.node.depth - b.node.depth || byPath(a, b),
  links: (a, b) => a.node.outbound.length - b.node.outbound.length || byPath(a, b),
};

/**
 * Turn nodes into sorted report rows.
 * @param nodes - Nodes that pass the filters
 * @param scopeHost - Host paths are shown relative to
 * @param sort - Sort column and direction
 * @returns Sorted rows
 */
export const buildReportRows = (nodes: CrawlNode[], scopeHost: string, sort: SortState): ReportRow[] => {
  const rows = nodes.map((node) => ({
    node,
    path: displayPath(node.url, scopeHost),
    status: describeStatus(node),
    type: typeLabel(node.resourceType),
  }));
  const compare = COMPARE[sort.field];
  // Pages without a timed response stay after every timed page, whichever way the response column runs.
  const untimed = (row: ReportRow) => Number(sort.field === 'response' && responseMs(row.node) === null);
  return rows.sort((a, b) => untimed(a) - untimed(b) || (sort.dir === 'asc' ? compare(a, b) : compare(b, a)));
};
