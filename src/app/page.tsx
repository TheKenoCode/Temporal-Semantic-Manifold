'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';

import { ManifoldScene } from '@/components/manifold-scene';
import { getClusterMetadata } from '@/data/exampleTemporalManifold';
import {
  MAX_TIME_STEP,
  MIN_TIME_STEP,
  useClusterTrajectories,
  useInterpolatedManifold,
} from '@/hooks/use-manifold-data';
import type { ManifoldBounds, ProjectedCluster, ProjectedEdge, ProjectedNode } from '@/types/manifold';

// Playback speed options (time units per second)
const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
] as const;

/**
 * Get event description based on semantic time
 */
const getEventDescription = (semanticTime: number): string => {
  if (semanticTime < 0.5) {
    return 'Clusters A, B, and C overlap heavily in semantic space.';
  }
  if (semanticTime < 1.5) {
    return 'Cluster A drifts upward, B moves left, C descends along the narrative axis.';
  }
  if (semanticTime < 2.5) {
    return 'Clusters A and B merge into unified manifold AB. C continues drifting.';
  }
  return 'Manifold AB decoheres, splitting into A1 and B1. C has drifted beyond the boundary.';
};

/**
 * Build projected slice from interpolated data
 */
const buildProjectedSlice = (
  slice: ReturnType<typeof useInterpolatedManifold>,
): { nodes: ProjectedNode[]; edges: ProjectedEdge[]; clusters: ProjectedCluster[] } => {
  const nodes: ProjectedNode[] = slice.nodes.map((node) => {
    const metadata = getClusterMetadata(node.clusterId);

    return {
      id: node.id,
      label: node.label,
      position: node.position,
      color: metadata.color,
      size: 0.85, // Increased base size for better visibility
      clusterId: node.clusterId,
      clusterLabel: metadata.label,
      timeStep: node.t,
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // Generate edges between nodes in the same cluster
  const edges: ProjectedEdge[] = [];
  let edgeId = 0;

  for (const cluster of slice.clusters) {
    const memberNodes = cluster.nodeIds
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as ProjectedNode[];

    // Create edges between adjacent nodes in the cluster
    for (let i = 0; i < memberNodes.length - 1; i++) {
      const source = memberNodes[i];
      const target = memberNodes[i + 1];
      if (source && target) {
        edges.push({
          id: `edge-${edgeId++}`,
          sourceId: source.id,
          targetId: target.id,
          weight: 0.7,
        start: source.position,
        end: target.position,
        });
      }
    }
  }

  const clusters: ProjectedCluster[] = slice.clusters.map((cluster) => {
    const metadata = getClusterMetadata(cluster.id);
    return {
      id: cluster.id,
      label: metadata.label,
      color: metadata.color,
      timeStep: cluster.t,
      nodeIds: cluster.nodeIds,
      opacity: cluster.opacity,
      isEmerging: cluster.isEmerging,
    };
  });

  return { nodes, edges, clusters };
};

/**
 * Compute manifold bounds from node positions
 */
const computeManifoldBounds = (nodes: ProjectedNode[]): ManifoldBounds => {
  if (nodes.length === 0) {
    return {
      min: [-5, -5, -5],
      max: [5, 5, 5],
      center: [0, 0, 0],
      size: [10, 10, 10],
    };
  }

  const positions = nodes.map((n) => n.position);
  const min: [number, number, number] = [
    Math.min(...positions.map((p) => p[0])),
    Math.min(...positions.map((p) => p[1])),
    Math.min(...positions.map((p) => p[2])),
  ];
  const max: [number, number, number] = [
    Math.max(...positions.map((p) => p[0])),
    Math.max(...positions.map((p) => p[1])),
    Math.max(...positions.map((p) => p[2])),
  ];

  // Add padding (adjusted for better visual matching)
  const padding = 3.5;
  min[0] -= padding;
  min[1] -= padding;
  min[2] -= padding;
  max[0] += padding;
  max[1] += padding;
  max[2] += padding;

  const center: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];

  const size: [number, number, number] = [
    max[0] - min[0],
    max[1] - min[1],
    max[2] - min[2],
  ];

  return { min, max, center, size };
};

export default function HomePage() {
  // Continuous semantic time (0.00 → 3.00)
  const [semanticTime, setSemanticTime] = useState<number>(0);
  const [showEdges, setShowEdges] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showTrajectories, setShowTrajectories] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<ProjectedNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const lastFrameTime = useRef<number>(0);
  const animationFrameId = useRef<number>(0);

  // Store current values in refs for animation loop access
  const playbackSpeedRef = useRef(playbackSpeed);
  const loopPlaybackRef = useRef(loopPlayback);

  // Keep refs in sync with state
  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    loopPlaybackRef.current = loopPlayback;
  }, [loopPlayback]);

  // Start/stop animation based on isPlaying
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      return;
    }

    lastFrameTime.current = 0;

    const animate = (currentTime: number) => {
      if (!lastFrameTime.current) {
        lastFrameTime.current = currentTime;
      }

      const deltaTime = (currentTime - lastFrameTime.current) / 1000; // Convert to seconds
      lastFrameTime.current = currentTime;

      setSemanticTime((prevTime) => {
        const newTime = prevTime + deltaTime * playbackSpeedRef.current;

        if (newTime >= MAX_TIME_STEP) {
          if (loopPlaybackRef.current) {
            return MIN_TIME_STEP;
          } else {
            setIsPlaying(false);
            return MAX_TIME_STEP;
          }
        }

        return newTime;
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying]);

  // Handle play/pause toggle
  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => {
      // If starting playback and at the end (without loop), reset to start
      if (!prev && semanticTime >= MAX_TIME_STEP && !loopPlaybackRef.current) {
        setSemanticTime(MIN_TIME_STEP);
      }
      return !prev;
    });
  }, [semanticTime]);

  // Reset to start
  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setSemanticTime(MIN_TIME_STEP);
  }, []);

  // Stop playback when manually scrubbing
  const handleSliderChange = useCallback((value: number) => {
    setIsPlaying(false);
    setSemanticTime(value);
  }, []);

  const slice = useInterpolatedManifold(semanticTime);
  const trajectories = useClusterTrajectories();
  const { nodes, edges, clusters } = useMemo(() => buildProjectedSlice(slice), [slice]);
  const bounds = useMemo(() => computeManifoldBounds(nodes), [nodes]);

  const activeNode = nodes.find((node) => node.id === (selectedNodeId ?? hoveredNodeId));
  const eventDescription = useMemo(() => getEventDescription(semanticTime), [semanticTime]);

  const handleHover = (node: ProjectedNode | null) => {
    setHoveredNode(node);
    setHoveredNodeId(node?.id ?? null);
  };

  const handleSelect = (nodeId: string | null) => {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  };

  // Get trajectory lineages for legend display
  const trajectoryLegend = useMemo(() => {
    return trajectories.map((traj) => ({
      id: traj.identity,
      label: traj.label,
      color: traj.color,
    }));
  }, [trajectories]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <section className="w-full rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/70 to-slate-900/50 p-6 shadow-xl backdrop-blur lg:w-80">
          <header className="mb-6 space-y-1 animate-fade-in">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
              Temporal Semantic Manifold
            </p>
            <h1 className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-2xl font-semibold text-transparent">
              Navigator
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Scrub semantic time to watch clusters drift, merge, and decohere through volumetric manifold space.
            </p>
          </header>

          <div className="space-y-6">
            {/* Semantic Time Slider */}
            <div>
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Semantic time</span>
                <span className="rounded-md bg-slate-800/60 px-2.5 py-1 font-mono text-sm text-sky-300 shadow-sm">
                  t = {semanticTime.toFixed(2)}
                </span>
              </div>

              {/* Playback Controls */}
              <div className="mb-3 flex items-center gap-2">
                {/* Reset Button */}
                <button
                  type="button"
                  onClick={resetPlayback}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700/50 hover:text-slate-100"
                  title="Reset to start"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v4h4M4 15l4 4v-4H4zM4 4l16 16" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4v4" />
                  </svg>
                </button>

                {/* Play/Pause Button */}
                <button
                  type="button"
                  onClick={togglePlayback}
                  className={classNames(
                    'flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-all duration-200',
                    isPlaying
                      ? 'border-amber-500/60 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                      : 'border-emerald-500/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30',
                  )}
                >
                  {isPlaying ? (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </>
                  )}
                </button>

                {/* Loop Toggle */}
                <button
                  type="button"
                  onClick={() => setLoopPlayback((v) => !v)}
                  className={classNames(
                    'flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200',
                    loopPlayback
                      ? 'border-violet-500/60 bg-violet-500/20 text-violet-100'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300',
                  )}
                  title={loopPlayback ? 'Loop enabled' : 'Loop disabled'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Speed Controls */}
              <div className="mb-3 flex items-center gap-1">
                <span className="mr-2 text-[10px] uppercase tracking-wide text-slate-500">Speed</span>
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPlaybackSpeed(option.value)}
                    className={classNames(
                      'rounded px-2 py-1 text-[10px] font-medium transition-all duration-200',
                      playbackSpeed === option.value
                        ? 'bg-sky-500/30 text-sky-100'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Timeline Slider */}
              <div className="relative">
                {/* Progress indicator */}
                <div
                  className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 opacity-60 transition-all duration-100"
                  style={{ width: `${(semanticTime / MAX_TIME_STEP) * 100}%` }}
                />
                <input
                  type="range"
                  min={MIN_TIME_STEP}
                  max={MAX_TIME_STEP}
                  step={0.01}
                  value={semanticTime}
                  onChange={(event) => handleSliderChange(Number(event.target.value))}
                  className="relative z-10 w-full accent-sky-400 transition-all"
                />
              </div>

              {/* Time step markers */}
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
                <button
                  onClick={() => handleSliderChange(0)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime < 0.5
                      ? 'bg-sky-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  t0
                </button>
                <button
                  onClick={() => handleSliderChange(1)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 0.5 && semanticTime < 1.5
                      ? 'bg-sky-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  t1
                </button>
                <button
                  onClick={() => handleSliderChange(2)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 1.5 && semanticTime < 2.5
                      ? 'bg-purple-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  t2 ⊕
                </button>
                <button
                  onClick={() => handleSliderChange(3)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 2.5
                      ? 'bg-sky-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  t3 ⊖
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/60 p-3 backdrop-blur-sm">
                <p className="text-xs font-medium leading-relaxed text-slate-200">{eventDescription}</p>
              </div>
            </div>

            {/* Toggle Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={classNames(
                  'rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  showEdges
                    ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50',
                )}
                onClick={() => setShowEdges((value) => !value)}
              >
                {showEdges ? 'Hide' : 'Show'} edges
              </button>
              <button
                type="button"
                className={classNames(
                  'rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  showLabels
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50',
                )}
                onClick={() => setShowLabels((value) => !value)}
              >
                {showLabels ? 'Hide' : 'Show'} labels
              </button>
              <button
                type="button"
                className={classNames(
                  'col-span-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 ease-in-out',
                  showTrajectories
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800/50',
                )}
                onClick={() => setShowTrajectories((value) => !value)}
              >
                {showTrajectories ? 'Hide' : 'Show'} trajectories
              </button>
            </div>

            {/* Active Clusters */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Active clusters
              </div>
              <div className="space-y-2">
                {clusters.map((cluster, i) => (
                  <div
                    key={`${cluster.id}-${cluster.timeStep}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-gradient-to-r from-slate-900/70 to-slate-900/50 px-3 py-2.5 text-sm shadow-sm transition-all duration-300 hover:border-slate-700/80 hover:shadow-md"
                    style={{
                      animationDelay: `${i * 50}ms`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-lg transition-transform duration-200 hover:scale-110"
                        style={{
                          backgroundColor: cluster.color,
                          boxShadow: `0 0 8px ${cluster.color}40`,
                        }}
                      />
                      <div>
                        <p className="font-semibold text-slate-100">{cluster.id}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {cluster.nodeIds.length} nodes
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trajectory Lineages (Legend) */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Trajectory lineages
              </div>
              <div className="space-y-1.5">
                {trajectoryLegend.map((lineage) => (
                  <div
                    key={lineage.id}
                    className="group flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80 hover:shadow-md"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-sm transition-all duration-200 group-hover:scale-125"
                      style={{
                        backgroundColor: lineage.color,
                        boxShadow: `0 0 6px ${lineage.color}50`,
                      }}
                    />
                    <span className="font-medium text-slate-300 group-hover:text-slate-100">
                      {lineage.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Trajectories track node groups through merge/split events
              </p>
            </div>

            {/* Focused Node */}
            {activeNode && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900/80 to-slate-800/70 p-4 text-sm shadow-lg backdrop-blur-sm transition-all">
                <div className="mb-3 flex items-center justify-between border-b border-slate-700/50 pb-2 text-xs uppercase tracking-wide text-slate-400">
                  <span>Selected Node</span>
                  <span className="rounded bg-slate-950/60 px-2 py-0.5 font-mono text-xs text-sky-300">
                    t = {activeNode.timeStep.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 animate-pulse rounded-full shadow-lg"
                    style={{
                      backgroundColor: activeNode.color,
                      boxShadow: `0 0 12px ${activeNode.color}`,
                    }}
                  />
                  <div>
                    <p className="text-base font-bold text-slate-100">{activeNode.label}</p>
                    <p className="text-xs text-slate-400">{activeNode.clusterLabel}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="relative flex-1 rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/50 to-slate-950/60 p-4 shadow-xl backdrop-blur-sm">
              <div className="h-[600px] overflow-hidden rounded-2xl border border-slate-800/60">
                <ManifoldScene
              nodes={nodes}
              edges={edges}
              clusters={clusters}
              trajectories={trajectories}
              bounds={bounds}
              semanticTime={semanticTime}
                  showEdges={showEdges}
                  showLabels={showLabels}
              showTrajectories={showTrajectories}
                  hoveredNodeId={hoveredNodeId}
                  selectedNodeId={selectedNodeId}
                  onHover={handleHover}
                  onSelect={handleSelect}
                />
              </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-6 rounded-full bg-violet-400"></span>
                Trajectories
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-purple-500/30 border border-purple-400/50"></span>
                Clusters
              </span>
            </div>
            <span className="text-right">
              X/Y: semantic &nbsp;•&nbsp; Z: altitude
            </span>
          </div>
          {hoveredNode && (
            <div className="pointer-events-none absolute left-6 top-6 max-w-xs animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-md transition-all">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-400">Node Details</p>
                <div
                  className="h-2.5 w-2.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor: hoveredNode.color,
                    boxShadow: `0 0 8px ${hoveredNode.color}`,
                  }}
                />
              </div>
              <p className="text-lg font-bold tracking-tight">{hoveredNode.label}</p>
              <p className="mt-1 text-xs text-slate-400">{hoveredNode.clusterLabel}</p>
              <div className="mt-3 rounded-md bg-slate-950/50 px-2.5 py-1.5">
                <p className="font-mono text-xs text-sky-300">t = {hoveredNode.timeStep.toFixed(2)}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
