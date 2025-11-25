import * as THREE from 'three';

import type { Cluster, Node } from '@/data/exampleTemporalManifold';

export type ProjectedNode = {
  id: string;
  label: string;
  position: [number, number, number];
  color: string;
  size: number;
  clusterId: string;
  clusterLabel: string;
  timeStep: number;
};

export type ProjectedEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  start: [number, number, number];
  end: [number, number, number];
};

export type ProjectedCluster = {
  id: string;
  label: string;
  color: string;
  timeStep: number;
  nodeIds: string[];
  /** Opacity for cross-fade transitions during merge/split (0-1) */
  opacity: number;
  /** Whether this cluster is emerging (fading in) vs existing */
  isEmerging: boolean;
};

export type EllipsoidGeometry = {
  centroid: [number, number, number];
  radii: [number, number, number];
  rotation: THREE.Matrix4;
};

export type ClusterTrajectory = {
  identity: string;
  label: string;
  centroids: [number, number, number][];
  color: string;
  timeSteps: number[];
};

export type InterpolatedCluster = Cluster & {
  opacity: number;
  isEmerging: boolean;
};

export type InterpolatedSlice = {
  t: number;
  nodes: Node[];
  clusters: InterpolatedCluster[];
};

export type ManifoldBounds = {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
};
