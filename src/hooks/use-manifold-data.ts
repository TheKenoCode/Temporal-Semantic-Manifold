import { useMemo } from 'react';

import {
  CLUSTER_METADATA,
  MAX_TIME_STEP,
  MIN_TIME_STEP,
  TEMPORAL_SLICES,
  getSliceAtTime,
  type Cluster,
  type ClusterMetadata,
  type Node,
  type TemporalSlice,
} from '@/data/exampleTemporalManifold';
import type { ClusterTrajectory, InterpolatedCluster, InterpolatedSlice } from '@/types/manifold';
import { smootherstep } from '@/utils/easing';

export type { Cluster, ClusterMetadata, Node, TemporalSlice };

export const AVAILABLE_TIME_STEPS = TEMPORAL_SLICES.map((slice) => slice.t);

// Smooth interpolation for vectors with easing and NaN protection
const lerpVector = (
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] => {
  // Clamp t to [0, 1] to prevent extrapolation issues
  const clampedT = Math.max(0, Math.min(1, t));
  
  // Apply smooth easing for organic motion
  const easedT = smootherstep(clampedT);
  
  const result: [number, number, number] = [
    a[0] + (b[0] - a[0]) * easedT,
    a[1] + (b[1] - a[1]) * easedT,
    a[2] + (b[2] - a[2]) * easedT,
  ];
  
  // Ensure no NaN values
  result[0] = Number.isFinite(result[0]) ? result[0] : a[0];
  result[1] = Number.isFinite(result[1]) ? result[1] : a[1];
  result[2] = Number.isFinite(result[2]) ? result[2] : a[2];
  
  return result;
};

// Interpolate nodes between two time slices
const interpolateNodes = (
  slice1: TemporalSlice,
  slice2: TemporalSlice,
  t: number,
): Node[] => {
  const nodeMap1 = new Map(slice1.nodes.map((n) => [n.id, n]));
  const nodeMap2 = new Map(slice2.nodes.map((n) => [n.id, n]));

  const allNodeIds = new Set([...nodeMap1.keys(), ...nodeMap2.keys()]);
  const interpolated: Node[] = [];

  for (const id of allNodeIds) {
    const node1 = nodeMap1.get(id);
    const node2 = nodeMap2.get(id);

    if (node1 && node2) {
      // Node exists in both slices - interpolate position
      interpolated.push({
        id: node1.id,
        label: node2.label, // Use later label
        t: slice1.t + (slice2.t - slice1.t) * t,
        position: lerpVector(node1.position, node2.position, t),
        clusterId: node2.clusterId, // Use later cluster assignment
      });
    } else if (node1 && !node2) {
      // Node only in first slice - fade out
      interpolated.push({
        ...node1,
        position: node1.position,
      });
    } else if (!node1 && node2) {
      // Node only in second slice - fade in
      interpolated.push({
        ...node2,
        position: node2.position,
      });
    }
  }

  return interpolated;
};

// Interpolate clusters between two time slices with cross-fade blending
const interpolateClusters = (
  slice1: TemporalSlice,
  slice2: TemporalSlice,
  t: number,
  interpolatedNodes: Node[],
): InterpolatedCluster[] => {
  const results: InterpolatedCluster[] = [];
  const interpolatedTime = slice1.t + (slice2.t - slice1.t) * t;
  
  // Get cluster IDs from both slices
  const slice1ClusterIds = new Set(slice1.clusters.map((c) => c.id));
  const slice2ClusterIds = new Set(slice2.clusters.map((c) => c.id));
  
  // Identify clusters that exist in both, only in slice1, or only in slice2
  const continuingClusters = [...slice1ClusterIds].filter((id) => slice2ClusterIds.has(id));
  const fadingOutClusters = [...slice1ClusterIds].filter((id) => !slice2ClusterIds.has(id));
  const fadingInClusters = [...slice2ClusterIds].filter((id) => !slice1ClusterIds.has(id));
  
  // Smooth cross-fade with extended overlap for visible color blending
  // Simple linear fade with boosted middle range for overlap visibility
  const fadeOutOpacity = Math.max(0, 1 - t * 1.2); // Fade out slightly faster
  const fadeInOpacity = Math.min(1, t * 1.2);      // Fade in slightly faster
  
  // Both are visible in the 0.2-0.8 range for color blending
  
  // Process continuing clusters (exist in both slices)
  for (const clusterId of continuingClusters) {
    const cluster1 = slice1.clusters.find((c) => c.id === clusterId)!;
    const cluster2 = slice2.clusters.find((c) => c.id === clusterId)!;
    
    // Use interpolated node positions - get nodes that belong to this cluster
    const memberNodeIds = new Set([...cluster1.nodeIds, ...cluster2.nodeIds]);
    const activeNodeIds = [...memberNodeIds].filter((nodeId) => {
      const node = interpolatedNodes.find((n) => n.id === nodeId);
      return node && node.clusterId === clusterId;
    });
    
    if (activeNodeIds.length > 0) {
      results.push({
        id: clusterId,
        t: interpolatedTime,
        nodeIds: activeNodeIds,
        opacity: 1,
        isEmerging: false,
      });
    }
  }
  
  // Process fading OUT clusters (exist in slice1 but not slice2)
  for (const clusterId of fadingOutClusters) {
    const cluster = slice1.clusters.find((c) => c.id === clusterId)!;
    
    // Get all nodes that WERE in this cluster, use their interpolated positions
    const activeNodeIds = cluster.nodeIds.filter((nodeId) => 
      interpolatedNodes.some((n) => n.id === nodeId)
    );
    
    if (activeNodeIds.length > 0 && fadeOutOpacity > 0.01) {
      results.push({
        id: clusterId,
        t: interpolatedTime,
        nodeIds: activeNodeIds,
        opacity: fadeOutOpacity,
        isEmerging: false,
      });
    }
  }
  
  // Process fading IN clusters (exist in slice2 but not slice1)
  for (const clusterId of fadingInClusters) {
    const cluster = slice2.clusters.find((c) => c.id === clusterId)!;
    
    // Get all nodes that WILL be in this cluster, use their interpolated positions
    const activeNodeIds = cluster.nodeIds.filter((nodeId) => 
      interpolatedNodes.some((n) => n.id === nodeId)
    );
    
    if (activeNodeIds.length > 0 && fadeInOpacity > 0.01) {
      results.push({
        id: clusterId,
        t: interpolatedTime,
        nodeIds: activeNodeIds,
        opacity: fadeInOpacity,
        isEmerging: true,
      });
    }
  }
  
  return results;
};

// Main interpolation function with NaN protection
export const useInterpolatedManifold = (semanticTime: number): InterpolatedSlice => {
  return useMemo(() => {
    // Ensure semanticTime is finite
    const safeTime = Number.isFinite(semanticTime) ? semanticTime : 0;
    const clampedTime = Math.max(MIN_TIME_STEP, Math.min(MAX_TIME_STEP, safeTime));
    const t1 = Math.floor(clampedTime);
    const t2 = Math.min(t1 + 1, MAX_TIME_STEP);
    const fraction = clampedTime - t1;

    // Safety check for fraction
    const safeFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;

    if (safeFraction === 0 || t1 === t2) {
      // Exact time step - no interpolation needed
      const slice = getSliceAtTime(t1);
      return {
        t: clampedTime,
        nodes: slice.nodes,
        clusters: slice.clusters.map((c) => ({
          ...c,
          opacity: 1,
          isEmerging: false,
        })),
      };
    }

    // Interpolate between two slices
    const slice1 = getSliceAtTime(t1);
    const slice2 = getSliceAtTime(t2);

    const nodes = interpolateNodes(slice1, slice2, safeFraction);
    const clusters = interpolateClusters(slice1, slice2, safeFraction, nodes);

    return {
      t: clampedTime,
      nodes,
      clusters,
    };
  }, [semanticTime]);
};

/**
 * Compute lineage-aware trajectories that follow node groups through cluster transformations.
 * 
 * The key insight is that we track NODE GROUPS, not cluster identities.
 * - Nodes n1-n8 follow path: A → A → AB → A1 (blue lineage)
 * - Nodes n9-n16 follow path: B → B → AB → B1 (purple lineage)  
 * - Nodes n17-n24 follow path: C → C → C → C (yellow lineage)
 * 
 * This shows the merge (A+B → AB) and split (AB → A1+B1) visually.
 */
export const useClusterTrajectories = (): ClusterTrajectory[] => {
  return useMemo(() => {
    // Define the lineages by the original node groups at T0
    // Each lineage tracks a specific set of nodes through all time steps
    const lineageDefinitions = [
      {
        identity: 'lineage-A',
        label: 'A Lineage (Spatial Synthesis)',
        color: '#3b82f6', // blue
        nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'],
      },
      {
        identity: 'lineage-B', 
        label: 'B Lineage (Temporal Inference)',
        color: '#a855f7', // purple
        nodeIds: ['n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'],
      },
      {
        identity: 'lineage-C',
        label: 'C Lineage (Narrative Drift)',
        color: '#fbbf24', // yellow
        nodeIds: ['n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24'],
      },
    ];

    const trajectories: ClusterTrajectory[] = [];

    for (const lineage of lineageDefinitions) {
      const centroids: [number, number, number][] = [];
      const timeSteps: number[] = [];

      // For each time slice, compute the centroid of this lineage's nodes
      for (const slice of TEMPORAL_SLICES) {
        // Find the nodes belonging to this lineage at this time step
        const lineageNodes = slice.nodes.filter((node) => 
          lineage.nodeIds.includes(node.id)
        );

        if (lineageNodes.length > 0) {
          // Compute centroid
          const centroid = lineageNodes.reduce<[number, number, number]>(
            (acc, node) => [
              acc[0] + node.position[0],
              acc[1] + node.position[1],
              acc[2] + node.position[2],
            ],
            [0, 0, 0],
          );
          centroid[0] /= lineageNodes.length;
          centroid[1] /= lineageNodes.length;
          centroid[2] /= lineageNodes.length;

          centroids.push(centroid);
          timeSteps.push(slice.t);
        }
      }

      trajectories.push({
        identity: lineage.identity,
        label: lineage.label,
        centroids,
        color: lineage.color,
        timeSteps,
      });
    }

    return trajectories;
  }, []);
};

export { CLUSTER_METADATA, MAX_TIME_STEP, MIN_TIME_STEP };
