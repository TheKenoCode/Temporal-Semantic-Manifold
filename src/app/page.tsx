'use client';

import { useMemo, useState } from 'react';
import classNames from 'classnames';
import { addDays, format, subDays } from 'date-fns';

import { ManifoldScene } from '@/components/manifold-scene';
import {
  useCommunities,
  useEdges,
  useNodes,
  type ManifoldEdge,
  type ManifoldNode,
} from '@/hooks/use-manifold-data';
import type { ProjectedEdge, ProjectedNode } from '@/types/manifold';

const TOTAL_WINDOW_DAYS = 30;
const SEMANTIC_SCALE_X = 12;
const SEMANTIC_SCALE_Y = 8;
const TIME_SCALE_Z = 16;

const formatRangeLabel = (from: Date, to: Date) =>
  `${format(from, 'MMM d, HH:mm')} → ${format(to, 'MMM d, HH:mm')}`;

const defaultTimeRange: [number, number] = [TOTAL_WINDOW_DAYS - 7, TOTAL_WINDOW_DAYS];

const toRange = (value: number, min: number, max: number, scale: number) => {
  if (max === min) return 0;
  const normalized = (value - min) / (max - min) - 0.5;
  return normalized * scale * 2;
};

const projectManifold = (nodes: ManifoldNode[], edges: ManifoldEdge[]) => {
  if (!nodes.length) return { nodes: [] as ProjectedNode[], edges: [] as ProjectedEdge[] };

  const xValues = nodes.map((node) => node.embedding[0] ?? 0);
  const yValues = nodes.map((node) => node.embedding[1] ?? 0);
  const tValues = nodes.map((node) => new Date(node.timestamp).getTime());

  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const tMin = Math.min(...tValues);
  const tMax = Math.max(...tValues);

  const projectedNodes: ProjectedNode[] = nodes.map((node) => {
    const timestamp = new Date(node.timestamp);
    const dominant = [...node.communities].sort((a, b) => b.strength - a.strength)[0];
    const color = dominant?.color ?? '#e2e8f0';
    const strength = dominant?.strength ?? 0.6;

    return {
      id: node.id,
      label: node.label,
      timestamp,
      position: [
        toRange(node.embedding[0] ?? 0, xMin, xMax, SEMANTIC_SCALE_X),
        toRange(node.embedding[1] ?? 0, yMin, yMax, SEMANTIC_SCALE_Y),
        toRange(timestamp.getTime(), tMin, tMax, TIME_SCALE_Z),
      ],
      color,
      size: 0.6 + strength,
      communities: node.communities,
      metadata: node.metadata,
    };
  });

  const nodeMap = new Map(projectedNodes.map((node) => [node.id, node]));
  const projectedEdges: ProjectedEdge[] = edges
    .map((edge) => {
      const source = nodeMap.get(edge.sourceId);
      const target = nodeMap.get(edge.targetId);
      if (!source || !target) return null;
      return {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        weight: edge.weight,
        type: edge.type,
        start: source.position,
        end: target.position,
      };
    })
    .filter(Boolean) as ProjectedEdge[];

  return { nodes: projectedNodes, edges: projectedEdges };
};

export default function HomePage() {
  const [timeRange, setTimeRange] = useState<[number, number]>(defaultTimeRange);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | null>(null);
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<ProjectedNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  const baseStart = useMemo(() => subDays(new Date(), TOTAL_WINDOW_DAYS), []);
  const now = new Date();
  const fromDate = addDays(baseStart, timeRange[0]);
  const candidateTo = addDays(baseStart, timeRange[1]);
  const toDate = candidateTo > now ? now : candidateTo;

  const communitiesQuery = useCommunities();
  const nodesQuery = useNodes({
    from: fromDate,
    to: toDate,
    communityId: selectedCommunityId ?? undefined,
  });

  const edgesQuery = useEdges(
    {
      from: fromDate,
      to: toDate,
      nodeIds: nodesQuery.data?.map((node) => node.id) ?? [],
      enabled: showEdges && (nodesQuery.data?.length ?? 0) > 0,
    },
    {
      enabled: showEdges && (nodesQuery.data?.length ?? 0) > 0,
    },
  );

  const { nodes: projectedNodes, edges: projectedEdges } = useMemo(
    () => projectManifold(nodesQuery.data ?? [], edgesQuery.data ?? []),
    [nodesQuery.data, edgesQuery.data],
  );

  const handleHover = (node: ProjectedNode | null) => {
    setHoveredNode(node);
    setHoveredNodeId(node?.id ?? null);
  };

  const handleSelect = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
  };

  const activeCommunities = communitiesQuery.data ?? [];
  const isLoading = nodesQuery.isLoading || communitiesQuery.isLoading;
  const hasError = nodesQuery.isError || communitiesQuery.isError;
  const errorMessage = nodesQuery.error?.message ?? communitiesQuery.error?.message;
  const edgesError = edgesQuery.isError;

  const activeNode = projectedNodes.find((node) => node.id === (selectedNodeId ?? hoveredNodeId));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <section className="w-full rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6 backdrop-blur lg:w-80">
          <header className="mb-6 space-y-1">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
              Temporal Semantic Manifold
            </p>
            <h1 className="text-2xl font-semibold">Control Panel</h1>
            <p className="text-sm text-slate-400">
              Scrub time, isolate communities, and toggle layers for the 4D experience graph.
            </p>
          </header>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Time Window
              </div>
              <p className="text-sm text-slate-300">{formatRangeLabel(fromDate, toDate)}</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={TOTAL_WINDOW_DAYS - 1}
                  value={timeRange[0]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTimeRange((previous) => {
                      const [, end] = previous;
                      return [Math.min(value, end - 1), end];
                    });
                  }}
                  className="w-full accent-sky-400"
                />
                <input
                  type="range"
                  min={1}
                  max={TOTAL_WINDOW_DAYS}
                  value={timeRange[1]}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTimeRange(([start]) => [start, Math.max(value, start + 1)]);
                  }}
                  className="w-full accent-sky-400"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Z-axis encodes chronological depth (older events sit lower).
              </p>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Community
              </div>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
                value={selectedCommunityId ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedCommunityId(value ? Number(value) : null);
                }}
              >
                <option value="">All communities</option>
                {activeCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeCommunities.map((community) => (
                  <div
                    key={community.id}
                    className={classNames(
                      'flex items-center gap-2 rounded-full border border-slate-700/70 px-3 py-1 text-xs transition-all duration-200 ease-in-out cursor-pointer',
                      selectedCommunityId === community.id
                        ? 'bg-slate-800 text-white scale-105'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800/70 hover:scale-105',
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full transition-all duration-200"
                      style={{ backgroundColor: community.color }}
                    />
                    {community.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={classNames(
                  'flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  showEdges
                    ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50',
                )}
                onClick={() => setShowEdges((value) => !value)}
              >
                {showEdges ? 'Hide edges' : 'Show edges'}
              </button>
              <button
                type="button"
                className={classNames(
                  'flex-1 rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  showLabels
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50',
                )}
                onClick={() => setShowLabels((value) => !value)}
              >
                {showLabels ? 'Hide labels' : 'Show labels'}
              </button>
            </div>

            {activeNode && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-sm transition-all">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                  Focused Node
                  <span
                    className="h-2 w-2 rounded-full transition-all duration-200"
                    style={{ backgroundColor: activeNode.color }}
                  />
                </div>
                <p className="font-semibold">{activeNode.label}</p>
                <p className="text-xs text-slate-400">{activeNode.timestamp.toLocaleString()}</p>
                <p className="mt-2 text-xs text-slate-300">
                  {activeNode.communities.map((community) => community.name).join(', ')}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="relative flex-1 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-4">
          {isLoading && !hasError && (
            <div className="flex h-[600px] items-center justify-center text-slate-400">
              Loading manifold…
            </div>
          )}
          {hasError && (
            <div className="flex h-[600px] flex-col items-center justify-center gap-2 text-center text-slate-300">
              <p className="text-lg font-semibold">Unable to load data</p>
              <p className="text-sm text-slate-400">{errorMessage ?? 'Please check the API logs.'}</p>
            </div>
          )}
          {!isLoading && !hasError && (
            <>
              <div className="h-[600px] overflow-hidden rounded-2xl border border-slate-800/60">
                <ManifoldScene
                  nodes={projectedNodes}
                  edges={projectedEdges}
                  showEdges={showEdges}
                  showLabels={showLabels}
                  hoveredNodeId={hoveredNodeId}
                  selectedNodeId={selectedNodeId}
                  onHover={handleHover}
                  onSelect={handleSelect}
                />
              </div>
              <div className="mt-3 text-right text-xs text-slate-400">
                X/Y: semantic projection &nbsp;•&nbsp; Z: time (newer = higher)
              </div>
              {edgesError && (
                <div className="mt-2 text-xs text-amber-300">
                  Edge layer failed to load. Try toggling it back on once the API recovers.
                </div>
              )}
              {hoveredNode && (
                <div className="pointer-events-none absolute left-6 top-6 max-w-xs animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-slate-700/70 bg-slate-900/90 p-4 text-sm text-slate-100 shadow-2xl transition-all">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Hover</p>
                  <p className="text-base font-semibold">{hoveredNode.label}</p>
                  <p className="text-xs text-slate-400">{hoveredNode.timestamp.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-slate-300">
                    {hoveredNode.communities.map((community) => community.name).join(', ')}
                  </p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
