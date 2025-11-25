/**
 * Type definitions for the Cultural Ancestry & Traits Manifold
 *
 * These types define the shape of data used in the 3D visualization,
 * representing cultural traits, ancestral populations, and their relationships.
 */

import * as THREE from 'three';

import type { Cluster, Node } from '@/data/exampleTemporalManifold';

/**
 * A projected node (cultural trait) ready for 3D rendering
 */
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

/**
 * A projected edge (relationship between traits) ready for 3D rendering
 *
 * Edge types:
 * - "semantic"     : Traits are similar in embedding space
 * - "derived_from" : Target trait evolved from source trait
 * - "diffusion"    : Trait spread from one cultural group to another
 */
export type ProjectedEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
  type?: 'semantic' | 'derived_from' | 'diffusion';
  start: [number, number, number];
  end: [number, number, number];
};

/**
 * A projected cluster (ancestral population) ready for 3D rendering
 */
export type ProjectedCluster = {
  id: string;
  label: string;
  color: string;
  timeStep: number;
  nodeIds: string[];
  /** Opacity for cross-fade transitions during population merge/split (0-1) */
  opacity: number;
  /** Whether this population cluster is emerging (fading in) vs existing */
  isEmerging: boolean;
};

/**
 * Ellipsoid geometry for cluster visualization
 */
export type EllipsoidGeometry = {
  centroid: [number, number, number];
  radii: [number, number, number];
  rotation: THREE.Matrix4;
};

/**
 * Trajectory tracking how a cultural lineage moves through time
 *
 * Lineages follow groups of traits through population transformations:
 * - Steppe → Bronze Age → Slavic
 * - Farmer → Bronze Age → Ottoman
 * - Iranian (continuous)
 */
export type ClusterTrajectory = {
  identity: string;
  label: string;
  centroids: [number, number, number][];
  color: string;
  timeSteps: number[];
};

/**
 * Interpolated cluster with opacity for smooth transitions
 */
export type InterpolatedCluster = Cluster & {
  opacity: number;
  isEmerging: boolean;
};

/**
 * A full interpolated time slice with traits and populations
 */
export type InterpolatedSlice = {
  t: number;
  nodes: Node[];
  clusters: InterpolatedCluster[];
};

/**
 * Bounding box for the manifold visualization
 */
export type ManifoldBounds = {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
};
