'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';

import { ErrorToast, SuccessToast } from '@/components/error-toast';
import { GenerationInput } from '@/components/generation-input';
import { ManifoldScene } from '@/components/manifold-scene';
import { TraitInspector } from '@/components/trait-inspector';
import { getClusterMetadata } from '@/data/exampleTemporalManifold';
import {
  getGeoClusterMetadata,
  getGeoSliceAtTime,
  GEO_TEMPORAL_SLICES,
} from '@/data/geographicManifold';
import { useGeneratedData } from '@/hooks/use-generated-data';
import {
  MAX_TIME_STEP,
  MIN_TIME_STEP,
  useClusterTrajectories,
  useInterpolatedManifold,
} from '@/hooks/use-manifold-data';
import type { ManifoldBounds, ProjectedCluster, ProjectedEdge, ProjectedNode } from '@/types/manifold';
import { projectTo3D } from '@/utils/pca';

type ViewMode = 'semantic' | 'geographic';
type DataMode = 'research' | 'ai-generated';

// Playback speed options (time units per second)
const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '4×', value: 4 },
] as const;

/**
 * Cultural epoch descriptions based on semantic time
 */
const getEpochDescription = (semanticTime: number, viewMode: ViewMode): string => {
  if (viewMode === 'geographic') {
    const geoSlice = getGeoSliceAtTime(semanticTime);
    return `${geoSlice.period} (${geoSlice.dateRange}): Real ancient DNA sample locations and population movements across Europe.`;
  }

  if (semanticTime < 0.5) {
    return 'Early Period: Distinct ancestral populations — Steppe nomads, Anatolian farmers, and Iranian highlanders maintain separate cultural complexes.';
  }
  if (semanticTime < 1.5) {
    return 'Expansion Era: Populations drift and expand. Steppe groups move northwest, farmers consolidate, Iranian traditions persist in the east.';
  }
  if (semanticTime < 2.5) {
    return 'Bronze Age Synthesis: Steppe and Farmer traditions merge into a syncretic Balkan Bronze Age culture. Iranian traditions remain distinct.';
  }
  return 'Medieval Divergence: Bronze Age heritage splits into Slavic and Ottoman-influenced cultural streams. Regional identities crystallize.';
};

/**
 * Build geographic slice from real coordinate data
 */
const buildGeoProjectedSlice = (
  semanticTime: number,
): { nodes: ProjectedNode[]; edges: ProjectedEdge[]; clusters: ProjectedCluster[] } => {
  const geoSlice = getGeoSliceAtTime(semanticTime);

  const nodes: ProjectedNode[] = geoSlice.nodes.map((node) => {
    const metadata = getGeoClusterMetadata(node.clusterId);
    return {
      id: node.id,
      label: node.label,
      position: node.position,
      color: metadata.color,
      size: 0.95,
      clusterId: node.clusterId,
      clusterLabel: metadata.label,
      timeStep: node.t,
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  // Generate edges between nodes in the same cluster
  const edges: ProjectedEdge[] = [];
  let edgeId = 0;

  for (const cluster of geoSlice.clusters) {
    const memberNodes = cluster.nodeIds
      .map((id) => nodeMap.get(id))
      .filter(Boolean) as ProjectedNode[];

    for (let i = 0; i < memberNodes.length - 1; i++) {
      const source = memberNodes[i];
      const target = memberNodes[i + 1];
      if (source && target) {
        edges.push({
          id: `edge-${edgeId++}`,
          sourceId: source.id,
          targetId: target.id,
          weight: 0.7,
          type: 'migration',
          start: source.position,
          end: target.position,
        });
      }
    }
  }

  const clusters: ProjectedCluster[] = geoSlice.clusters.map((cluster) => {
    const metadata = getGeoClusterMetadata(cluster.id);
    return {
      id: cluster.id,
      label: metadata.label,
      color: metadata.color,
      timeStep: cluster.t,
      nodeIds: cluster.nodeIds,
      opacity: 0.6,
      isEmerging: false,
    };
  });

  return { nodes, edges, clusters };
};

/**
 * Cache for projected 3D positions to avoid recalculating on every render
 */
let projectionCache: Map<string, number[][]> = new Map();

/**
 * Build projected slice from AI-generated data
 */
const buildGeneratedSlice = (
  data: ReturnType<typeof useGeneratedData>,
  semanticTime: number,
): { nodes: ProjectedNode[]; edges: ProjectedEdge[]; clusters: ProjectedCluster[] } => {
  if (!data.nodes.length) {
    return { nodes: [], edges: [], clusters: [] };
  }

  // Check if nodes have embeddings
  const nodesWithEmbeddings = data.nodes.filter((n) => n.embedding && n.embedding.length > 0);
  
  if (nodesWithEmbeddings.length === 0) {
    return { nodes: [], edges: [], clusters: [] };
  }

  // Create cache key from node IDs
  const cacheKey = nodesWithEmbeddings.map((n) => n.id).join('-');

  // Check cache or compute projection
  let projected3D = projectionCache.get(cacheKey);
  if (!projected3D) {
    const embeddings = nodesWithEmbeddings.map((node) => node.embedding);
    projected3D = projectTo3D(embeddings);
    projectionCache.set(cacheKey, projected3D);
    
    // Limit cache size
    if (projectionCache.size > 10) {
      const firstKey = projectionCache.keys().next().value;
      if (firstKey) projectionCache.delete(firstKey);
    }
  }

  // Create default community fallback
  const defaultCommunity = { id: 0, name: 'Unknown', color: '#888888', strength: 1 };

  // Create projected nodes with proper 3D positions - validate and filter
  const projectedNodes: ProjectedNode[] = nodesWithEmbeddings
    .map((node, idx) => {
      const [x, y, z] = projected3D![idx] || [0, 0, 0];

      // Validate position values are finite numbers
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        console.warn(`Invalid position for node ${node.id}:`, [x, y, z]);
        return null;
      }

      // Get dominant community for color (with proper fallback including id)
      const dominantCommunity = node.communities && node.communities.length > 0
        ? node.communities.reduce((prev, curr) =>
            curr.strength > prev.strength ? curr : prev
          , node.communities[0])
        : defaultCommunity;

      return {
        id: String(node.id),
        label: node.label,
        position: [x, y, z] as [number, number, number],
        color: dominantCommunity.color,
        size: 0.85,
        clusterId: String(dominantCommunity.id),
        clusterLabel: dominantCommunity.name,
        timeStep: semanticTime,
      };
    })
    .filter((node): node is ProjectedNode => node !== null);

  // Create edges - filter out invalid ones
  const edges: ProjectedEdge[] = data.edges
    .map((edge) => {
      const sourceNode = projectedNodes.find((n) => n.id === String(edge.sourceId));
      const targetNode = projectedNodes.find((n) => n.id === String(edge.targetId));

      // Skip if nodes not found
      if (!sourceNode || !targetNode) return null;

      // Validate positions don't have NaN
      const hasValidPositions =
        sourceNode.position.every((v) => Number.isFinite(v)) &&
        targetNode.position.every((v) => Number.isFinite(v));

      if (!hasValidPositions) return null;

      return {
        id: String(edge.id),
        sourceId: String(edge.sourceId),
        targetId: String(edge.targetId),
        weight: edge.weight,
        type: edge.type as 'semantic' | 'derived_from' | 'diffusion',
        start: sourceNode.position,
        end: targetNode.position,
      };
    })
    .filter((edge): edge is ProjectedEdge => edge !== null);

  // Create clusters from communities
  const clusters: ProjectedCluster[] = data.communities.map((community) => {
    const memberNodeIds = projectedNodes
      .filter((node) => node.clusterId === String(community.id))
      .map((node) => node.id);

    return {
      id: String(community.id),
      label: community.name,
      color: community.color,
      timeStep: semanticTime,
      nodeIds: memberNodeIds,
      opacity: 1.0,
      isEmerging: false,
    };
  });

  return { nodes: projectedNodes, edges, clusters };
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
      size: 0.85,
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
          type: 'semantic',
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
  // Filter out nodes with invalid positions (NaN or undefined)
  const validNodes = nodes.filter(
    (n) => n.position && n.position.every((v) => Number.isFinite(v))
  );

  if (validNodes.length === 0) {
    return {
      min: [-5, -5, -5],
      max: [5, 5, 5],
      center: [0, 0, 0],
      size: [10, 10, 10],
    };
  }

  const positions = validNodes.map((n) => n.position);
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

  // Safety check for NaN in computed values (shouldn't happen but just in case)
  if (!min.every(Number.isFinite) || !max.every(Number.isFinite)) {
    return {
      min: [-5, -5, -5],
      max: [5, 5, 5],
      center: [0, 0, 0],
      size: [10, 10, 10],
    };
  }

  // Add padding
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
  // Data mode: research (static data) or ai-generated
  const [dataMode, setDataMode] = useState<DataMode>('research');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  
  // View mode: semantic (abstract embedding space) or geographic (real coordinates)
  const [viewMode, setViewMode] = useState<ViewMode>('semantic');

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

      const deltaTime = (currentTime - lastFrameTime.current) / 1000;
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
  
  // Fetch AI-generated data when in AI mode
  const generatedData = useGeneratedData(dataMode === 'ai-generated' ? currentTopic : null);

  // Build projected slice based on data mode and view mode
  const { nodes, edges, clusters } = useMemo(() => {
    // AI-generated mode - use fetched data
    if (dataMode === 'ai-generated' && currentTopic) {
      if (generatedData.isLoading || generatedData.nodes.length === 0) {
        return { nodes: [], edges: [], clusters: [] };
      }

      try {
        return buildGeneratedSlice(generatedData, semanticTime);
      } catch (error) {
        console.error('Error building generated slice:', error);
        return { nodes: [], edges: [], clusters: [] };
      }
    }
    
    // Research mode - use static data
    if (viewMode === 'geographic') {
      return buildGeoProjectedSlice(semanticTime);
    }
    return buildProjectedSlice(slice);
  }, [slice, viewMode, semanticTime, dataMode, currentTopic, generatedData.isLoading, generatedData.nodes.length]);

  const bounds = useMemo(() => computeManifoldBounds(nodes), [nodes]);

  const activeNode = nodes.find((node) => node.id === (selectedNodeId ?? hoveredNodeId));
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const epochDescription = useMemo(
    () => getEpochDescription(semanticTime, viewMode),
    [semanticTime, viewMode],
  );

  const handleHover = (node: ProjectedNode | null) => {
    setHoveredNode(node);
    setHoveredNodeId(node?.id ?? null);
  };

  const handleSelect = (nodeId: string | null) => {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  };

  // Handle AI generation
  const handleGenerate = async (topic: string, mode: 'hybrid' | 'ancestry' | 'custom') => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, mode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const result = await response.json();
      setCurrentTopic(topic);
      
      // Show success message
      setGenerationSuccess(
        `Generated ${result.stats.nodes} concepts and ${result.stats.edges} relationships for "${topic}"`
      );
      
      // Reset timeline to start to show the generated visualization
      setSemanticTime(MIN_TIME_STEP);
      setIsPlaying(false);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Generation failed');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle selecting a previously generated topic
  const handleSelectPrevious = (topic: string) => {
    setCurrentTopic(topic);
    setSemanticTime(MIN_TIME_STEP);
    setIsPlaying(false);
    setGenerationSuccess(`Loaded visualization for "${topic}"`);
  };

  // Get lineage trajectories for legend display
  const trajectoryLegend = useMemo(() => {
    return trajectories.map((traj) => ({
      id: traj.identity,
      label: traj.label,
      color: traj.color,
    }));
  }, [trajectories]);

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Toast Notifications */}
      <ErrorToast message={generationError} onClose={() => setGenerationError(null)} />
      <SuccessToast message={generationSuccess} onClose={() => setGenerationSuccess(null)} />
      
      <div className="mx-auto flex h-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Left Sidebar - Controls (independently scrollable) */}
        <section className="flex w-full flex-col rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/70 to-slate-900/50 shadow-xl backdrop-blur lg:w-80 lg:max-h-[calc(100vh-3rem)] lg:overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-slate-800/30 scrollbar-thumb-slate-600/50 hover:scrollbar-thumb-slate-500/50">
          <header className="mb-6 space-y-1 animate-fade-in">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
              Cultural Ancestry
            </p>
            <h1 className="bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-2xl font-semibold text-transparent">
              Traits Explorer
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Navigate through time to see how cultural traits evolve, merge, and diverge across ancestral populations.
            </p>
          </header>

          {/* Data Mode Toggle */}
          <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Data Source</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDataMode('research')}
                className={classNames(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                  dataMode === 'research'
                    ? 'bg-blue-500/30 text-blue-100 border border-blue-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-transparent hover:bg-slate-700/50 hover:text-slate-300',
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Research Data
                </div>
                <div className="mt-0.5 text-[9px] opacity-60">Curated ancestry model</div>
              </button>
              <button
                type="button"
                onClick={() => setDataMode('ai-generated')}
                className={classNames(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                  dataMode === 'ai-generated'
                    ? 'bg-purple-500/30 text-purple-100 border border-purple-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-transparent hover:bg-slate-700/50 hover:text-slate-300',
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Generated
                </div>
                <div className="mt-0.5 text-[9px] opacity-60">Generate from topic</div>
              </button>
            </div>
          </div>

          {/* AI Generation Input (when in AI mode) */}
          {dataMode === 'ai-generated' && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <GenerationInput
                onGenerate={handleGenerate}
                onSelectPrevious={handleSelectPrevious}
                isGenerating={isGenerating}
                currentTopic={currentTopic}
              />
              {currentTopic && !isGenerating && (
                <div className="mt-3 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm">
                  <p className="text-purple-200">
                    <span className="font-semibold">Current topic:</span> {currentTopic}
                  </p>
                  {generatedData.isLoading && (
                    <p className="mt-1 text-xs text-purple-300">Loading visualization data...</p>
                  )}
                  {generatedData.nodes.length > 0 && !generatedData.isLoading && (
                    <p className="mt-1 text-xs text-purple-300">
                      {generatedData.nodes.length} concepts, {generatedData.edges.length} relationships
                    </p>
                  )}
                </div>
              )}
              {currentTopic && generatedData.error && (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Error loading data: {generatedData.error}
                </div>
              )}
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
            <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">View Mode</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode('semantic')}
                className={classNames(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                  viewMode === 'semantic'
                    ? 'bg-violet-500/30 text-violet-100 border border-violet-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-transparent hover:bg-slate-700/50 hover:text-slate-300',
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
                  </svg>
                  Semantic
                </div>
                <div className="mt-0.5 text-[9px] opacity-60">Abstract similarity</div>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('geographic')}
                className={classNames(
                  'flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                  viewMode === 'geographic'
                    ? 'bg-emerald-500/30 text-emerald-100 border border-emerald-500/50'
                    : 'bg-slate-700/30 text-slate-400 border border-transparent hover:bg-slate-700/50 hover:text-slate-300',
                )}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Geographic
                </div>
                <div className="mt-0.5 text-[9px] opacity-60">Real coordinates</div>
              </button>
            </div>
            {viewMode === 'geographic' && (
              <div className="mt-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[10px] text-emerald-200">
                📍 X/Y = Longitude/Latitude • Z = Time
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Semantic Time Slider */}
            <div>
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>Cultural Epoch</span>
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

              {/* Epoch markers */}
              <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-slate-500">
                <button
                  onClick={() => handleSliderChange(0)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime < 0.5
                      ? 'bg-red-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Early
                </button>
                <button
                  onClick={() => handleSliderChange(1)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 0.5 && semanticTime < 1.5
                      ? 'bg-green-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Expand
                </button>
                <button
                  onClick={() => handleSliderChange(2)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 1.5 && semanticTime < 2.5
                      ? 'bg-cyan-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Merge ⊕
                </button>
                <button
                  onClick={() => handleSliderChange(3)}
                  className={classNames(
                    'rounded px-2 py-0.5 transition-all duration-200',
                    semanticTime >= 2.5
                      ? 'bg-blue-500/20 text-slate-100 font-semibold'
                      : 'text-slate-500 hover:text-slate-300',
                  )}
                >
                  Split ⊖
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/40 to-slate-900/60 p-3 backdrop-blur-sm">
                <p className="text-xs font-medium leading-relaxed text-slate-200">{epochDescription}</p>
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
                {showTrajectories ? 'Hide' : 'Show'} lineage trajectories
              </button>
            </div>

            {/* Active Ancestral Populations */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ancestral Populations
              </div>
              <div className="space-y-2">
                {clusters.map((cluster, i) => (
                  <div
                    key={`${cluster.id}-${cluster.timeStep}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-gradient-to-r from-slate-900/70 to-slate-900/50 px-3 py-2.5 text-sm shadow-sm transition-all duration-300 hover:border-slate-700/80 hover:shadow-md"
                    style={{ animationDelay: `${i * 50}ms` }}
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
                        <p className="font-semibold text-slate-100">{cluster.label}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {cluster.nodeIds.length} traits
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lineage Trajectories Legend */}
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Population Lineages
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
                Lineages track how trait clusters transform through cultural mergers and divergence
              </p>
            </div>

            {/* Hovered Trait (quick preview) */}
            {activeNode && !selectedNodeId && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900/80 to-slate-800/70 p-4 text-sm shadow-lg backdrop-blur-sm transition-all">
                <div className="mb-3 flex items-center justify-between border-b border-slate-700/50 pb-2 text-xs uppercase tracking-wide text-slate-400">
                  <span>Cultural Trait</span>
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
                <p className="mt-2 text-[10px] text-slate-500">Click to inspect ancestry contributions</p>
              </div>
            )}
          </div>
          </div>
        </section>

        {/* Right Panel - 3D Visualization + Trait Inspector */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Main 3D Visualization */}
          <section className="relative rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/50 to-slate-950/60 p-4 shadow-xl backdrop-blur-sm">
            <div className="h-[600px] overflow-hidden rounded-2xl border border-slate-800/60">
            <ManifoldScene
              nodes={nodes}
              edges={edges}
              clusters={clusters}
              trajectories={dataMode === 'ai-generated' ? [] : trajectories}
              bounds={bounds}
              semanticTime={semanticTime}
              showEdges={showEdges}
              showLabels={showLabels}
              showTrajectories={dataMode === 'ai-generated' ? false : showTrajectories}
              hoveredNodeId={hoveredNodeId}
              selectedNodeId={selectedNodeId}
              onHover={handleHover}
              onSelect={(nodeId) => onSelect(nodeId === selectedNodeId ? null : nodeId)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                Cultural Traits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-6 rounded-full bg-violet-400"></span>
                Lineage Trajectories
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-purple-500/30 border border-purple-400/50"></span>
                Population Clusters
              </span>
            </div>
            <span className="text-right">
              X/Y: semantic similarity &nbsp;•&nbsp; Z: time depth
            </span>
          </div>

          {/* Hover tooltip overlay */}
          {hoveredNode && !selectedNodeId && (
            <div className="pointer-events-none absolute left-6 top-6 max-w-xs animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-4 text-sm text-slate-100 shadow-2xl backdrop-blur-md transition-all">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-400">Trait Details</p>
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

          {/* Trait Inspector - Below the visualization */}
          {selectedNode && (
            <section className="animate-in slide-in-from-bottom-4 duration-300">
              <TraitInspector
                node={selectedNode}
                edges={edges}
                allNodes={nodes}
                onClose={() => setSelectedNodeId(null)}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );

  function onSelect(nodeId: string | null) {
    setSelectedNodeId(nodeId);
  }
}
