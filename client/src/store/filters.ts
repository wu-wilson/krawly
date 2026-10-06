import { isSlow } from '../engine/limits';

import type { CrawlEdge, CrawlNode, ResourceType } from '../engine/types';

/** Values of the status filter: every node, or only broken, redirecting, or slow ones */
export const STATUS_FILTERS = ['all', 'broken', 'redirects', 'slow'] as const;

/** Values of the type filter. The stylesheet value is `styles`, as it appears in shared links. */
export const TYPE_FILTERS = ['all', 'pages', 'scripts', 'styles', 'images', 'other'] as const;

/** What the filter bar narrows the map and report to */
export interface FilterState {
  statusFilter: (typeof STATUS_FILTERS)[number];
  typeFilter: (typeof TYPE_FILTERS)[number];
  /** Case-insensitive URL substring; empty for no search */
  search: string;
}

/** Counts behind the status filter tabs */
export interface CrawlStats {
  /** Every node found */
  total: number;
  broken: number;
  redirects: number;
  /** Responses that took at least `SLOW_RESPONSE_MS` */
  slow: number;
}

/** Filters a crawl starts with: everything shown, no search */
export const DEFAULT_FILTER: FilterState = { statusFilter: 'all', typeFilter: 'all', search: '' };

/** Counts for a crawl with nothing found yet */
export const EMPTY_STATS: CrawlStats = { total: 0, broken: 0, redirects: 0, slow: 0 };

const TYPE_MATCH: Record<Exclude<FilterState['typeFilter'], 'all'>, (type: ResourceType) => boolean> = {
  pages: (type) => type === 'page',
  scripts: (type) => type === 'script',
  styles: (type) => type === 'stylesheet',
  images: (type) => type === 'image',
  other: (type) => type === 'media' || type === 'font' || type === 'other',
};

/**
 * Check whether a node passes the current filters.
 * @param node - Node to test
 * @param filter - Active filters
 * @returns True when the node matches every active filter
 */
export const matchesFilter = (node: CrawlNode, filter: FilterState): boolean => {
  if (filter.statusFilter === 'broken' && node.status !== 'broken') return false;
  if (filter.statusFilter === 'redirects' && node.status !== 'redirect') return false;
  if (filter.statusFilter === 'slow' && !isSlow(node)) return false;
  if (filter.typeFilter !== 'all' && !TYPE_MATCH[filter.typeFilter](node.resourceType)) return false;
  const query = filter.search.trim().toLowerCase();
  return query === '' || node.url.toLowerCase().includes(query);
};

/**
 * Check whether any filter is narrowing the results.
 * @param filter - Active filters
 * @returns True when a status, type, or search filter is set
 */
export const isFilterActive = (filter: FilterState): boolean =>
  filter.statusFilter !== 'all' || filter.typeFilter !== 'all' || filter.search.trim() !== '';

/**
 * Get the nodes that pass the filters.
 * @param nodes - All nodes
 * @param filter - Active filters
 * @returns Matching nodes in discovery order
 */
export const filterNodes = (nodes: Map<string, CrawlNode>, filter: FilterState): CrawlNode[] => {
  const all = Array.from(nodes.values());
  return isFilterActive(filter) ? all.filter((node) => matchesFilter(node, filter)) : all;
};

/**
 * Get the edges whose ends are both in a set of nodes.
 * @param edges - All edges
 * @param ids - Ids of the nodes to keep
 * @returns Edges between kept nodes
 */
export const filterEdges = (edges: CrawlEdge[], ids: Set<string>): CrawlEdge[] =>
  edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));

/**
 * Count nodes for the status filter tabs.
 * @param nodes - All nodes
 * @returns Counts
 */
export const computeStats = (nodes: Map<string, CrawlNode>): CrawlStats => {
  const stats = { ...EMPTY_STATS, total: nodes.size };
  for (const node of nodes.values()) {
    if (node.status === 'broken') stats.broken++;
    else if (node.status === 'redirect') stats.redirects++;
    if (isSlow(node)) stats.slow++;
  }
  return stats;
};
