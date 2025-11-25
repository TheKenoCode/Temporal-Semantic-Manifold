/**
 * Cultural Ancestry Manifold Data Hook
 *
 * Provides interpolated manifold data for visualizing cultural trait evolution
 * across ancestral populations over time.
 */

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
  const clampedT = Math.max(0, Math.min(1, t));
  const easedT = smootherstep(clampedT);

  const result: [number, number, number] = [
    a[0] + (b[0] - a[0]) * easedT,
    a[1] + (b[1] - a[1]) * easedT,
    a[2] + (b[2] - a[2]) * easedT,
  ];

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
        label: node2.label,
        t: slice1.t + (slice2.t - slice1.t) * t,
        position: lerpVector(node1.position, node2.position, t),
        clusterId: node2.clusterId,
        traitType: node2.traitType,
        description: node2.description,
        ancestryWeights: node2.ancestryWeights,
      });
    } else if (node1 && !node2) {
      interpolated.push({ ...node1, position: node1.position });
    } else if (!node1 && node2) {
      interpolated.push({ ...node2, position: node2.position });
    }
  }

  return interpolated;
};

// Interpolate population clusters between two time slices with cross-fade blending
const interpolateClusters = (
  slice1: TemporalSlice,
  slice2: TemporalSlice,
  t: number,
  interpolatedNodes: Node[],
): InterpolatedCluster[] => {
  const results: InterpolatedCluster[] = [];
  const interpolatedTime = slice1.t + (slice2.t - slice1.t) * t;

  const slice1ClusterIds = new Set(slice1.clusters.map((c) => c.id));
  const slice2ClusterIds = new Set(slice2.clusters.map((c) => c.id));

  const continuingClusters = [...slice1ClusterIds].filter((id) => slice2ClusterIds.has(id));
  const fadingOutClusters = [...slice1ClusterIds].filter((id) => !slice2ClusterIds.has(id));
  const fadingInClusters = [...slice2ClusterIds].filter((id) => !slice1ClusterIds.has(id));

  const fadeOutOpacity = Math.max(0, 1 - t * 1.2);
  const fadeInOpacity = Math.min(1, t * 1.2);

  // Process continuing clusters (population persists across epochs)
  for (const clusterId of continuingClusters) {
    const cluster1 = slice1.clusters.find((c) => c.id === clusterId)!;
    const cluster2 = slice2.clusters.find((c) => c.id === clusterId)!;

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

  // Process fading OUT clusters (population influence waning)
  for (const clusterId of fadingOutClusters) {
    const cluster = slice1.clusters.find((c) => c.id === clusterId)!;

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

  // Process fading IN clusters (new population influence emerging)
  for (const clusterId of fadingInClusters) {
    const cluster = slice2.clusters.find((c) => c.id === clusterId)!;

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
    const safeTime = Number.isFinite(semanticTime) ? semanticTime : 0;
    const clampedTime = Math.max(MIN_TIME_STEP, Math.min(MAX_TIME_STEP, safeTime));
    const t1 = Math.floor(clampedTime);
    const t2 = Math.min(t1 + 1, MAX_TIME_STEP);
    const fraction = clampedTime - t1;

    const safeFraction = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;

    if (safeFraction === 0 || t1 === t2) {
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
 * Compute lineage-aware trajectories that follow cultural trait groups through population transformations.
 *
 * Based on real ancient DNA research, these lineages track how cultural traits flow through:
 * - WHG → EEF_WHG → Bronze → Balkan (Western European hunter-gatherer adaptations)
 * - EEF → Bronze → Regional (Anatolian farmer traditions)
 * - Steppe → Bronze → Regional (Indo-European pastoral traditions)
 *
 * Sources: Lazaridis 2016, Mathieson 2018, Olalde 2018
 */
export const useClusterTrajectories = (): ClusterTrajectory[] => {
  return useMemo(() => {
    // Define cultural lineages based on real ancestry research
    const lineageDefinitions = [
      {
        identity: 'lineage-whg-balkan',
        label: 'WHG → Neolithic → Balkan',
        color: '#0ea5e9', // sky blue
        nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
      },
      {
        identity: 'lineage-eef-farmer',
        label: 'EEF → Bronze Age → Regional',
        color: '#22c55e', // green
        nodeIds: ['n5', 'n6', 'n7', 'n8'],
      },
      {
        identity: 'lineage-steppe-ie',
        label: 'Steppe (Yamnaya) → Bronze → Nordic',
        color: '#ef4444', // red
        nodeIds: ['n9', 'n10', 'n11', 'n12', 'n7', 'n8'],
      },
    ];

    const trajectories: ClusterTrajectory[] = [];

    for (const lineage of lineageDefinitions) {
      const centroids: [number, number, number][] = [];
      const timeSteps: number[] = [];

      for (const slice of TEMPORAL_SLICES) {
        const lineageNodes = slice.nodes.filter((node) =>
          lineage.nodeIds.includes(node.id)
        );

        if (lineageNodes.length > 0) {
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
