/**
 * Scripted Temporal Semantic Manifold Dataset
 *
 * T0: Heavy overlap - all clusters near origin
 * T1: Drift - A upward, B left, C downward
 * T2: Merge - A + B → AB, C continues away
 * T3: Split - AB → A1 + B1, C far away
 *
 * IMPORTANT: All 24 nodes (n1-n24) are present in every time slice for smooth interpolation.
 * Cluster assignments change over time but node IDs remain consistent.
 */

export type Node = {
  id: string;
  label: string;
  t: number;
  position: [number, number, number];
  clusterId: string;
};

export type Cluster = {
  id: string;
  t: number;
  nodeIds: string[];
};

export type TemporalSlice = {
  t: number;
  nodes: Node[];
  clusters: Cluster[];
};

export type ClusterMetadata = {
  id: string;
  label: string;
  color: string;
  lineage?: {
    parent?: string;
    children?: string[];
  };
};

// Cluster color and metadata mapping
export const CLUSTER_METADATA: Record<string, ClusterMetadata> = {
  A: {
    id: 'A',
    label: 'Cluster A — Spatial Synthesis',
    color: '#3b82f6', // blue
    lineage: { children: ['AB'] },
  },
  B: {
    id: 'B',
    label: 'Cluster B — Temporal Inference',
    color: '#a855f7', // purple
    lineage: { children: ['AB'] },
  },
  C: {
    id: 'C',
    label: 'Cluster C — Narrative Drift',
    color: '#fbbf24', // yellow
  },
  AB: {
    id: 'AB',
    label: 'Cluster AB — Merged Manifold',
    color: '#7c3aed', // blended purple-blue
    lineage: { parent: 'A', children: ['A1', 'B1'] },
  },
  A1: {
    id: 'A1',
    label: 'Cluster A1 — Abstract Synthesis',
    color: '#60a5fa', // light blue
    lineage: { parent: 'AB' },
  },
  B1: {
    id: 'B1',
    label: 'Cluster B1 — Deferred Planning',
    color: '#c084fc', // light purple
    lineage: { parent: 'AB' },
  },
};

// T0: TRUE HEAVY OVERLAP - all clusters occupy the SAME central space
// Nodes have varied positions showing different semantic relationships
// Greater spread = weaker/more varied relationships within cluster
const T0_NODES: Node[] = [
  // Cluster A - 8 nodes (blue) - spread across upper-right region
  // Core nodes (stronger relationship)
  { id: 'n1', label: 'A1', t: 0, position: [1.2, 0.8, 0.5], clusterId: 'A' },
  { id: 'n2', label: 'A2', t: 0, position: [0.9, 1.1, 0.2], clusterId: 'A' },
  { id: 'n3', label: 'A3', t: 0, position: [1.5, 0.5, 0.8], clusterId: 'A' },
  // Peripheral nodes (weaker relationship, closer to boundaries)
  { id: 'n4', label: 'A4', t: 0, position: [0.3, 0.6, -0.3], clusterId: 'A' },
  { id: 'n5', label: 'A5', t: 0, position: [1.8, 1.3, -0.2], clusterId: 'A' },
  { id: 'n6', label: 'A6', t: 0, position: [0.6, 0.2, 0.9], clusterId: 'A' },
  { id: 'n7', label: 'A7', t: 0, position: [1.4, 0.9, -0.5], clusterId: 'A' },
  { id: 'n8', label: 'A8', t: 0, position: [0.5, 1.4, 0.4], clusterId: 'A' },

  // Cluster B - 8 nodes (purple) - spread across left region
  // Core nodes
  { id: 'n9', label: 'B1', t: 0, position: [-1.3, 0.6, 0.6], clusterId: 'B' },
  { id: 'n10', label: 'B2', t: 0, position: [-1.0, 0.9, 0.3], clusterId: 'B' },
  { id: 'n11', label: 'B3', t: 0, position: [-1.6, 0.3, 0.8], clusterId: 'B' },
  // Peripheral nodes (reaching toward other clusters)
  { id: 'n12', label: 'B4', t: 0, position: [-0.4, 0.5, 0.1], clusterId: 'B' },
  { id: 'n13', label: 'B5', t: 0, position: [-1.9, 1.1, 0.0], clusterId: 'B' },
  { id: 'n14', label: 'B6', t: 0, position: [-0.7, 0.2, 1.1], clusterId: 'B' },
  { id: 'n15', label: 'B7', t: 0, position: [-1.5, 0.8, -0.6], clusterId: 'B' },
  { id: 'n16', label: 'B8', t: 0, position: [-0.9, 1.3, 0.5], clusterId: 'B' },

  // Cluster C - 8 nodes (yellow) - spread across bottom region
  // Core nodes
  { id: 'n17', label: 'C1', t: 0, position: [-0.1, -1.2, 0.4], clusterId: 'C' },
  { id: 'n18', label: 'C2', t: 0, position: [0.3, -1.0, 0.1], clusterId: 'C' },
  { id: 'n19', label: 'C3', t: 0, position: [-0.5, -1.5, 0.7], clusterId: 'C' },
  // Peripheral nodes
  { id: 'n20', label: 'C4', t: 0, position: [0.8, -0.9, -0.4], clusterId: 'C' },
  { id: 'n21', label: 'C5', t: 0, position: [0.1, -0.5, 0.8], clusterId: 'C' },
  { id: 'n22', label: 'C6', t: 0, position: [-0.8, -1.8, 0.3], clusterId: 'C' },
  { id: 'n23', label: 'C7', t: 0, position: [0.6, -1.3, -0.7], clusterId: 'C' },
  { id: 'n24', label: 'C8', t: 0, position: [-0.3, -0.7, 0.9], clusterId: 'C' },
];

// T1: Drift - A up, B left, C down (starting to separate)
// Nodes maintain internal variance showing semantic relationships
const T1_NODES: Node[] = [
  // Cluster A - drifting upward with spread (n1-n8)
  // Core nodes stay together
  { id: 'n1', label: 'A1', t: 1, position: [-0.2, 3.5, 0.6], clusterId: 'A' },
  { id: 'n2', label: 'A2', t: 1, position: [0.1, 3.8, 0.3], clusterId: 'A' },
  { id: 'n3', label: 'A3', t: 1, position: [0.4, 3.2, 0.9], clusterId: 'A' },
  // Peripheral nodes have more variance
  { id: 'n4', label: 'A4', t: 1, position: [-0.8, 3.0, -0.2], clusterId: 'A' },
  { id: 'n5', label: 'A5', t: 1, position: [0.7, 4.1, -0.3], clusterId: 'A' },
  { id: 'n6', label: 'A6', t: 1, position: [-0.5, 2.7, 1.0], clusterId: 'A' },
  { id: 'n7', label: 'A7', t: 1, position: [0.5, 3.6, -0.6], clusterId: 'A' },
  { id: 'n8', label: 'A8', t: 1, position: [-0.3, 4.3, 0.5], clusterId: 'A' },

  // Cluster B - drifting left with spread (n9-n16)
  // Core nodes
  { id: 'n9', label: 'B1', t: 1, position: [-4.2, 0.4, 0.7], clusterId: 'B' },
  { id: 'n10', label: 'B2', t: 1, position: [-3.9, 0.7, 0.4], clusterId: 'B' },
  { id: 'n11', label: 'B3', t: 1, position: [-4.5, 0.2, 0.9], clusterId: 'B' },
  // Peripheral nodes (some reaching toward A for eventual merge)
  { id: 'n12', label: 'B4', t: 1, position: [-3.2, 0.9, -0.5], clusterId: 'B' },
  { id: 'n13', label: 'B5', t: 1, position: [-5.0, 0.6, 0.2], clusterId: 'B' },
  { id: 'n14', label: 'B6', t: 1, position: [-3.6, -0.3, 1.1], clusterId: 'B' },
  { id: 'n15', label: 'B7', t: 1, position: [-4.8, 1.0, -0.7], clusterId: 'B' },
  { id: 'n16', label: 'B8', t: 1, position: [-3.5, 1.2, 0.6], clusterId: 'B' },

  // Cluster C - drifting downward with spread (n17-n24)
  // Core nodes
  { id: 'n17', label: 'C1', t: 1, position: [0.1, -4.5, 0.8], clusterId: 'C' },
  { id: 'n18', label: 'C2', t: 1, position: [0.5, -4.2, 0.5], clusterId: 'C' },
  { id: 'n19', label: 'C3', t: 1, position: [-0.4, -4.8, 1.0], clusterId: 'C' },
  // Peripheral nodes
  { id: 'n20', label: 'C4', t: 1, position: [1.1, -4.0, -0.3], clusterId: 'C' },
  { id: 'n21', label: 'C5', t: 1, position: [-0.2, -5.3, 0.4], clusterId: 'C' },
  { id: 'n22', label: 'C6', t: 1, position: [0.8, -4.7, -0.8], clusterId: 'C' },
  { id: 'n23', label: 'C7', t: 1, position: [0.3, -4.4, 1.2], clusterId: 'C' },
  { id: 'n24', label: 'C8', t: 1, position: [-0.7, -5.0, 0.6], clusterId: 'C' },
];

// T2: Merge - A + B → AB (16 nodes merge), C continues away
// AB cluster shows merged nodes with internal variance
const T2_NODES: Node[] = [
  // Cluster AB - merged from A and B (n1-n16)
  // Former A nodes (n1-n8) tend toward upper region of AB
  { id: 'n1', label: 'AB1', t: 2, position: [-0.8, 2.3, 0.8], clusterId: 'AB' },
  { id: 'n2', label: 'AB2', t: 2, position: [-0.3, 2.6, 0.4], clusterId: 'AB' },
  { id: 'n3', label: 'AB3', t: 2, position: [-1.2, 2.0, 1.1], clusterId: 'AB' },
  { id: 'n4', label: 'AB4', t: 2, position: [0.1, 2.2, -0.3], clusterId: 'AB' },
  { id: 'n5', label: 'AB5', t: 2, position: [-1.5, 2.8, 0.5], clusterId: 'AB' },
  { id: 'n6', label: 'AB6', t: 2, position: [-0.6, 1.7, 0.9], clusterId: 'AB' },
  { id: 'n7', label: 'AB7', t: 2, position: [-0.9, 2.5, -0.5], clusterId: 'AB' },
  { id: 'n8', label: 'AB8', t: 2, position: [0.3, 2.9, 0.6], clusterId: 'AB' },
  // Former B nodes (n9-n16) now in AB, tend toward left/lower region
  { id: 'n9', label: 'AB9', t: 2, position: [-2.1, 1.6, 0.3], clusterId: 'AB' },
  { id: 'n10', label: 'AB10', t: 2, position: [-1.8, 1.9, 0.6], clusterId: 'AB' },
  { id: 'n11', label: 'AB11', t: 2, position: [-2.5, 1.3, 1.0], clusterId: 'AB' },
  { id: 'n12', label: 'AB12', t: 2, position: [-1.4, 1.5, -0.4], clusterId: 'AB' },
  { id: 'n13', label: 'AB13', t: 2, position: [-2.8, 2.1, 0.2], clusterId: 'AB' },
  { id: 'n14', label: 'AB14', t: 2, position: [-1.6, 0.9, 0.9], clusterId: 'AB' },
  { id: 'n15', label: 'AB15', t: 2, position: [-2.3, 1.8, -0.6], clusterId: 'AB' },
  { id: 'n16', label: 'AB16', t: 2, position: [-1.9, 1.2, 0.7], clusterId: 'AB' },

  // Cluster C - continuing away with spread (n17-n24)
  // Core nodes
  { id: 'n17', label: 'C1', t: 2, position: [0.4, -7.2, 0.9], clusterId: 'C' },
  { id: 'n18', label: 'C2', t: 2, position: [0.8, -6.8, 0.5], clusterId: 'C' },
  { id: 'n19', label: 'C3', t: 2, position: [-0.2, -7.6, 1.2], clusterId: 'C' },
  // Peripheral nodes with greater variance
  { id: 'n20', label: 'C4', t: 2, position: [1.5, -6.5, -0.5], clusterId: 'C' },
  { id: 'n21', label: 'C5', t: 2, position: [0.1, -8.1, 0.3], clusterId: 'C' },
  { id: 'n22', label: 'C6', t: 2, position: [-0.9, -7.9, 0.6], clusterId: 'C' },
  { id: 'n23', label: 'C7', t: 2, position: [1.1, -7.4, -0.9], clusterId: 'C' },
  { id: 'n24', label: 'C8', t: 2, position: [0.5, -7.0, 1.3], clusterId: 'C' },
];

// T3: Split - AB → A1 (n1-n8) + B1 (n9-n16), C far away
// Nodes spread out more in separated clusters
const T3_NODES: Node[] = [
  // Cluster A1 - split from AB (n1-n8), drifting right and up with spread
  // Core nodes
  { id: 'n1', label: 'A1-1', t: 3, position: [2.0, 5.5, 0.5], clusterId: 'A1' },
  { id: 'n2', label: 'A1-2', t: 3, position: [2.3, 5.2, 0.2], clusterId: 'A1' },
  { id: 'n3', label: 'A1-3', t: 3, position: [1.6, 5.9, 0.9], clusterId: 'A1' },
  // Peripheral nodes with greater variance
  { id: 'n4', label: 'A1-4', t: 3, position: [1.2, 4.7, -0.4], clusterId: 'A1' },
  { id: 'n5', label: 'A1-5', t: 3, position: [2.8, 5.8, -0.3], clusterId: 'A1' },
  { id: 'n6', label: 'A1-6', t: 3, position: [1.5, 4.3, 1.0], clusterId: 'A1' },
  { id: 'n7', label: 'A1-7', t: 3, position: [2.5, 5.0, -0.6], clusterId: 'A1' },
  { id: 'n8', label: 'A1-8', t: 3, position: [1.8, 6.2, 0.6], clusterId: 'A1' },

  // Cluster B1 - split from AB (n9-n16), drifting left and down with spread
  // Core nodes
  { id: 'n9', label: 'B1-1', t: 3, position: [-5.5, 0.8, 0.5], clusterId: 'B1' },
  { id: 'n10', label: 'B1-2', t: 3, position: [-5.2, 1.1, 0.2], clusterId: 'B1' },
  { id: 'n11', label: 'B1-3', t: 3, position: [-5.8, 0.5, 0.8], clusterId: 'B1' },
  // Peripheral nodes
  { id: 'n12', label: 'B1-4', t: 3, position: [-4.8, 0.6, -0.4], clusterId: 'B1' },
  { id: 'n13', label: 'B1-5', t: 3, position: [-6.2, 1.3, 0.1], clusterId: 'B1' },
  { id: 'n14', label: 'B1-6', t: 3, position: [-5.0, 0.2, 1.0], clusterId: 'B1' },
  { id: 'n15', label: 'B1-7', t: 3, position: [-5.6, 1.5, -0.5], clusterId: 'B1' },
  { id: 'n16', label: 'B1-8', t: 3, position: [-5.3, 0.9, 0.7], clusterId: 'B1' },

  // Cluster C - far away with spread (n17-n24)
  // Core nodes tightly grouped
  { id: 'n17', label: 'C1', t: 3, position: [0.6, -10.5, 0.6], clusterId: 'C' },
  { id: 'n18', label: 'C2', t: 3, position: [0.9, -10.2, 0.3], clusterId: 'C' },
  { id: 'n19', label: 'C3', t: 3, position: [0.3, -10.8, 0.9], clusterId: 'C' },
  // Peripheral nodes showing internal variance
  { id: 'n20', label: 'C4', t: 3, position: [1.5, -10.0, -0.4], clusterId: 'C' },
  { id: 'n21', label: 'C5', t: 3, position: [0.1, -11.3, 0.5], clusterId: 'C' },
  { id: 'n22', label: 'C6', t: 3, position: [-0.4, -11.0, 0.2], clusterId: 'C' },
  { id: 'n23', label: 'C7', t: 3, position: [1.2, -10.6, -0.8], clusterId: 'C' },
  { id: 'n24', label: 'C8', t: 3, position: [0.7, -10.3, 1.0], clusterId: 'C' },
];

// Temporal slices with correct cluster nodeIds matching actual nodes
export const TEMPORAL_SLICES: TemporalSlice[] = [
  {
    t: 0,
    nodes: T0_NODES,
    clusters: [
      { id: 'A', t: 0, nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
      { id: 'B', t: 0, nodeIds: ['n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'] },
      { id: 'C', t: 0, nodeIds: ['n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24'] },
    ],
  },
  {
    t: 1,
    nodes: T1_NODES,
    clusters: [
      { id: 'A', t: 1, nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
      { id: 'B', t: 1, nodeIds: ['n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'] },
      { id: 'C', t: 1, nodeIds: ['n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24'] },
    ],
  },
  {
    t: 2,
    nodes: T2_NODES,
    clusters: [
      {
        id: 'AB',
        t: 2,
        nodeIds: [
          'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8',
          'n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16',
        ],
      },
      { id: 'C', t: 2, nodeIds: ['n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24'] },
    ],
  },
  {
    t: 3,
    nodes: T3_NODES,
    clusters: [
      { id: 'A1', t: 3, nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
      { id: 'B1', t: 3, nodeIds: ['n9', 'n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'] },
      { id: 'C', t: 3, nodeIds: ['n17', 'n18', 'n19', 'n20', 'n21', 'n22', 'n23', 'n24'] },
    ],
  },
];

export const MAX_TIME_STEP = 3;
export const MIN_TIME_STEP = 0;

// Helper to get slice by time
export const getSliceAtTime = (t: number): TemporalSlice => {
  const clampedT = Math.max(MIN_TIME_STEP, Math.min(MAX_TIME_STEP, Math.floor(t)));
  return TEMPORAL_SLICES[clampedT] || TEMPORAL_SLICES[0];
};

// Helper to get cluster metadata
export const getClusterMetadata = (clusterId: string): ClusterMetadata => {
  return (
    CLUSTER_METADATA[clusterId] || {
      id: clusterId,
      label: `Cluster ${clusterId}`,
      color: '#94a3b8',
    }
  );
};
