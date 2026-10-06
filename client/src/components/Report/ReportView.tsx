import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { NoMatches } from '../App/NoMatches';
import { ReportList } from './ReportList';
import { ReportTable } from './ReportTable';

import { useCrawlHosts } from '../../hooks/useCrawlHosts';
import { WIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useCrawlStore } from '../../store/crawlStore';
import { filterNodes } from '../../store/filters';

import { buildReportRows } from './reportRows';

import type { SortField, SortState } from './reportRows';

interface ReportViewProps {
  /** Whether the report is the view on screen; it stops following the crawl while hidden */
  active: boolean;
  /** Select a page and show it on the map */
  onShowInGraph: (id: string) => void;
}

/**
 * Every page Krawly found, problems first: a sortable table on wide screens and a two-line list on smaller ones.
 * @param props - Whether the report is showing, and the handler for opening a page on the map
 * @returns Report view
 */
export const ReportView: React.FC<ReportViewProps> = ({ active, onShowInGraph }) => {
  const filter = useCrawlStore((s) => s.filter);
  const selectedId = useCrawlStore((s) => s.selectedNodeId);
  const { scopeHost } = useCrawlHosts();
  const wide = useMediaQuery(WIDE_QUERY);
  const [sort, setSort] = useState<SortState>({ field: 'status', dir: 'asc' });
  const [nodes, setNodes] = useState(() => useCrawlStore.getState().nodes);

  // Follow the crawl only while showing, so a hidden report doesn't re-sort and re-render on every update.
  useEffect(() => {
    if (!active) return;
    setNodes(useCrawlStore.getState().nodes);
    return useCrawlStore.subscribe((state) => setNodes(state.nodes));
  }, [active]);

  const rows = useMemo(() => buildReportRows(filterNodes(nodes, filter), scopeHost, sort), [nodes, filter, scopeHost, sort]);

  const handleSort = useCallback((field: SortField) => {
    setSort((prev) => (prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));
  }, []);

  if (nodes.size > 0 && rows.length === 0) return <NoMatches className="bg-surface" />;

  return wide ? (
    <ReportTable rows={rows} sort={sort} onSort={handleSort} onOpen={onShowInGraph} selectedId={selectedId} />
  ) : (
    <ReportList rows={rows} onOpen={onShowInGraph} selectedId={selectedId} />
  );
};
