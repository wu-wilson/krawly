import { create } from 'zustand';

import { DEFAULT_FILTER, EMPTY_STATS, computeStats } from './filters';

import { URL_PARAMS, readUrlState } from '../utils/urlState';

import type { CrawlEdge, CrawlNode, CrawlStatus } from '../engine/types';
import type { CrawlStats, FilterState } from './filters';

/** The two ways to look at a crawl */
export type AppView = 'graph' | 'report';

/** The view a crawl opens in */
export const DEFAULT_VIEW: AppView = 'graph';

/** Why a completed crawl ended */
type EndReason = 'finished' | 'stopped';

/** What the store holds */
interface CrawlState {
  status: CrawlStatus;
  /** Every node found, by id */
  nodes: Map<string, CrawlNode>;
  edges: CrawlEdge[];
  /** Counts for the current nodes, refreshed with every flush */
  stats: CrawlStats;
  /** The page whose details are open */
  selectedNodeId: string | null;
  filter: FilterState;
  view: AppView;
  /** URL the crawl started from, as entered */
  startUrl: string | null;
  /** Id of the start page's node, set when the crawler discovers it */
  rootId: string | null;
  startTime: number | null;
  /** When the crawl completed or was stopped */
  endTime: number | null;
  /** Time spent paused, so the reported duration only counts crawling */
  pausedMs: number;
  /** When the current pause began, while paused */
  pausedAt: number | null;
  endReason: EndReason | null;
  /** True once the crawl left links out because it hit its URL limit */
  limitReached: boolean;
}

/** What the store can do */
interface CrawlActions {
  /** Clear the previous crawl's results and mark a new crawl as running */
  beginCrawl: (url: string) => void;
  pauseCrawl: () => void;
  resumeCrawl: () => void;
  /** End the crawl at the visitor's request */
  stopCrawl: () => void;
  /** End the crawl because it ran out of URLs */
  completeCrawl: () => void;
  /** Clear the crawl's results back to idle, keeping the view and filters */
  resetCrawl: () => void;
  addNode: (node: CrawlNode) => void;
  /** Merge changes into a node, replacing it so selectors see the change */
  updateNode: (id: string, updates: Partial<CrawlNode>) => void;
  /** Record a link, once per source and target, and add the source to the target's `inbound` */
  addEdge: (edge: CrawlEdge) => void;
  selectNode: (id: string | null) => void;
  /** Change some filters, keeping the rest */
  setFilter: (filter: Partial<FilterState>) => void;
  /** Reset every filter */
  clearFilters: () => void;
  setView: (view: AppView) => void;
  /** Note that the crawl hit its URL limit */
  setLimitReached: () => void;
}

/** Crawl state and the actions that change it */
type CrawlStore = CrawlState & CrawlActions;

/**
 * Select the start page's node.
 * @param state - Store state
 * @returns The node, once discovered
 */
export const selectRoot = (state: CrawlStore): CrawlNode | undefined =>
  state.rootId ? state.nodes.get(state.rootId) : undefined;

/**
 * Select whether the crawl ended because the start page itself failed, leaving nothing to map.
 * @param state - Store state
 * @returns True when the crawl is over and the start page is broken
 */
export const selectRootFailed = (state: CrawlStore): boolean =>
  state.status === 'complete' && selectRoot(state)?.status === 'broken';

/**
 * Select the query string that reopens the crawl as it's shown: its start URL, plus the view and filters that
 * differ from the defaults.
 * @param state - Store state
 * @returns Query string without the leading "?", empty when there's no crawl
 */
export const selectUrlSearch = (state: CrawlStore): string => {
  if (!state.startUrl) return '';
  const { view, filter } = state;
  const params = new URLSearchParams({ [URL_PARAMS.startUrl]: state.startUrl });
  if (view !== DEFAULT_VIEW) params.set(URL_PARAMS.view, view);
  if (filter.statusFilter !== DEFAULT_FILTER.statusFilter) params.set(URL_PARAMS.status, filter.statusFilter);
  if (filter.typeFilter !== DEFAULT_FILTER.typeFilter) params.set(URL_PARAMS.type, filter.typeFilter);
  if (filter.search.trim()) params.set(URL_PARAMS.search, filter.search.trim());
  return params.toString();
};

const initialUrlState = readUrlState();

/**
 * Build the state of a crawl that hasn't started, with fresh collections each time.
 * @returns Idle crawl fields
 */
const idleCrawl = (): Omit<CrawlState, 'filter' | 'view'> => ({
  status: 'idle',
  nodes: new Map(),
  edges: [],
  stats: EMPTY_STATS,
  selectedNodeId: null,
  startUrl: null,
  rootId: null,
  startTime: null,
  endTime: null,
  pausedMs: 0,
  pausedAt: null,
  endReason: null,
  limitReached: false,
});

/**
 * Read and update the crawl's nodes, edges, view, filters, and selection. Node and edge changes mutate in place and
 * flush as one update per microtask, so hundreds of engine callbacks cost one render.
 * @param selector - Picks the state to read; leave it out for the whole store
 * @returns The selected state, re-rendering when it changes
 */
export const useCrawlStore = create<CrawlStore>((set, get) => {
  let pendingFlush = false;
  let dirtyNodes = false;
  let dirtyEdges = false;
  const edgeIndex = new Set<string>();

  const scheduleFlush = () => {
    if (pendingFlush) return;
    pendingFlush = true;
    queueMicrotask(() => {
      pendingFlush = false;
      const state = get();
      const patch: Partial<Pick<CrawlStore, 'nodes' | 'edges' | 'stats'>> = {};
      if (dirtyNodes) {
        patch.nodes = new Map(state.nodes);
        patch.stats = computeStats(patch.nodes);
        dirtyNodes = false;
      }
      if (dirtyEdges) {
        patch.edges = [...state.edges];
        dirtyEdges = false;
      }
      if (Object.keys(patch).length > 0) set(patch);
    });
  };

  /**
   * Fold an open pause into the paused total, for when the crawl resumes or ends.
   * @param state - Current state
   * @param now - Time the pause ends
   * @returns Updated pause fields
   */
  const closePause = (state: CrawlStore, now: number): Pick<CrawlStore, 'pausedMs' | 'pausedAt'> => ({
    pausedMs: state.pausedMs + (state.pausedAt !== null ? now - state.pausedAt : 0),
    pausedAt: null,
  });

  const endCrawl = (reason: EndReason) => {
    const state = get();
    if (state.status !== 'crawling' && state.status !== 'paused') return;
    const now = Date.now();
    set({ status: 'complete', endTime: now, endReason: reason, ...closePause(state, now) });
  };

  const resetCrawl = () => {
    edgeIndex.clear();
    dirtyNodes = false;
    dirtyEdges = false;
    set(idleCrawl());
  };

  return {
    ...idleCrawl(),
    filter: { ...DEFAULT_FILTER, ...initialUrlState.filter },
    view: initialUrlState.view ?? DEFAULT_VIEW,

    beginCrawl: (url: string) => {
      resetCrawl();
      set({ status: 'crawling', startUrl: url, startTime: Date.now() });
    },

    pauseCrawl: () => {
      if (get().status !== 'crawling') return;
      set({ status: 'paused', pausedAt: Date.now() });
    },

    resumeCrawl: () => {
      const state = get();
      if (state.status !== 'paused') return;
      set({ status: 'crawling', ...closePause(state, Date.now()) });
    },

    stopCrawl: () => endCrawl('stopped'),

    completeCrawl: () => endCrawl('finished'),

    resetCrawl,

    addNode: (node: CrawlNode) => {
      get().nodes.set(node.id, node);
      if (node.parentId === null) set({ rootId: node.id });
      dirtyNodes = true;
      scheduleFlush();
    },

    updateNode: (id: string, updates: Partial<CrawlNode>) => {
      const nodes = get().nodes;
      const existing = nodes.get(id);
      if (!existing) return;
      nodes.set(id, { ...existing, ...updates });
      dirtyNodes = true;
      scheduleFlush();
    },

    addEdge: (edge: CrawlEdge) => {
      const key = `${edge.source}->${edge.target}`;
      if (edgeIndex.has(key)) return;
      edgeIndex.add(key);

      // Keep the target's inbound list in step with its edges.
      const nodes = get().nodes;
      const target = nodes.get(edge.target);
      if (target && !target.inbound.includes(edge.source)) {
        nodes.set(edge.target, { ...target, inbound: [...target.inbound, edge.source] });
        dirtyNodes = true;
      }

      get().edges.push(edge);
      dirtyEdges = true;
      scheduleFlush();
    },

    selectNode: (id: string | null) => set({ selectedNodeId: id }),

    setFilter: (filter: Partial<FilterState>) => set((state) => ({ filter: { ...state.filter, ...filter } })),

    clearFilters: () => set({ filter: DEFAULT_FILTER }),

    setView: (view: AppView) => set({ view }),

    setLimitReached: () => set({ limitReached: true }),
  };
});
