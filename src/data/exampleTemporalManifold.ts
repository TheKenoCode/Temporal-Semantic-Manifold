/**
 * Cultural Ancestry & Traits — RESEARCH-BASED Demonstration Dataset
 *
 * Based on real ancient DNA research and ethnographic data:
 *
 * Ancestry Model (standard European ancient DNA framework):
 *   - WHG (Western Hunter-Gatherers) — Mesolithic Europeans
 *   - EEF (Early European Farmers) — Anatolian Neolithic farmers
 *   - Steppe (Yamnaya) — Bronze Age pastoralists, Proto-Indo-European
 *   - CHG (Caucasus Hunter-Gatherers) — Contributed to both Yamnaya and Near East
 *   - EHG (Eastern Hunter-Gatherers) — Mesolithic Eastern Europeans
 *
 * Sources:
 *   - Lazaridis et al. 2016 "Genomic insights into farming origins"
 *   - Mathieson et al. 2018 "Genomic history of southeastern Europe"
 *   - D-PLACE database (Max Planck Institute)
 *   - Ethnographic Atlas (Murdock 1967)
 *
 * Time evolution shows how cultural traits transform as ancestry patterns shift:
 *   T0: Mesolithic/Neolithic — WHG foraging vs EEF farming emergence
 *   T1: Chalcolithic — EEF expansion, CHG connections form
 *   T2: Bronze Age — Steppe migration, cultural synthesis
 *   T3: Iron Age/Medieval — Regional diversification, modern traits emerge
 */

export type Node = {
  id: string;
  label: string;
  t: number;
  position: [number, number, number];
  clusterId: string;
  traitCategory?: 'subsistence' | 'kinship' | 'religion' | 'political' | 'material' | 'artistic';
  ancestryCorrelation?: Record<string, number>;
  sources?: string[];
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
  region?: string;
  era?: string;
  lineage?: {
    parent?: string;
    children?: string[];
  };
};

// Ancestral component metadata — based on real ancient DNA research
export const CLUSTER_METADATA: Record<string, ClusterMetadata> = {
  WHG: {
    id: 'WHG',
    label: 'Western Hunter-Gatherers',
    color: '#0ea5e9', // sky blue
    region: 'Western & Central Europe',
    era: '~15,000–5,000 BCE',
    lineage: { children: ['EEF_WHG'] },
  },
  EEF: {
    id: 'EEF',
    label: 'Early European Farmers',
    color: '#22c55e', // green
    region: 'Anatolia → Europe',
    era: '~7,000–4,000 BCE',
    lineage: { children: ['EEF_WHG', 'Bronze'] },
  },
  CHG: {
    id: 'CHG',
    label: 'Caucasus Hunter-Gatherers',
    color: '#a855f7', // purple
    region: 'Caucasus & Iranian Plateau',
    era: '~25,000–5,000 BCE',
    lineage: { children: ['Steppe'] },
  },
  EHG: {
    id: 'EHG',
    label: 'Eastern Hunter-Gatherers',
    color: '#f97316', // orange
    region: 'Eastern Europe & Russia',
    era: '~15,000–5,000 BCE',
    lineage: { children: ['Steppe'] },
  },
  Steppe: {
    id: 'Steppe',
    label: 'Steppe Pastoralists (Yamnaya)',
    color: '#ef4444', // red
    region: 'Pontic-Caspian Steppe',
    era: '~3,300–2,500 BCE',
    lineage: { parent: 'CHG', children: ['Bronze'] },
  },
  // Merged populations
  EEF_WHG: {
    id: 'EEF_WHG',
    label: 'Neolithic Europeans (EEF + WHG mix)',
    color: '#4ade80', // light green
    region: 'Central & Western Europe',
    era: '~5,500–3,500 BCE',
    lineage: { parent: 'EEF', children: ['Bronze'] },
  },
  Bronze: {
    id: 'Bronze',
    label: 'Bronze Age Europeans',
    color: '#f59e0b', // amber
    region: 'Europe-wide',
    era: '~3,000–1,200 BCE',
    lineage: { parent: 'Steppe', children: ['Balkan', 'Nordic'] },
  },
  // Regional variants
  Balkan: {
    id: 'Balkan',
    label: 'Balkan Iron Age/Medieval',
    color: '#06b6d4', // cyan
    region: 'Balkans',
    era: '~1,200 BCE – 1,500 CE',
    lineage: { parent: 'Bronze' },
  },
  Nordic: {
    id: 'Nordic',
    label: 'Northern European',
    color: '#3b82f6', // blue
    region: 'Scandinavia & Baltic',
    era: '~1,200 BCE – 1,500 CE',
    lineage: { parent: 'Bronze' },
  },
};

// ============================================================================
// T0: MESOLITHIC/EARLY NEOLITHIC (~8000-5500 BCE)
// WHG foraging cultures, early EEF farming, CHG in east
// ============================================================================
const T0_NODES: Node[] = [
  // WHG traits — Mesolithic forager adaptations
  {
    id: 'n1',
    label: 'Hunting-Gathering',
    t: 0,
    position: [-3.0, 2.5, 0.3],
    clusterId: 'WHG',
    traitCategory: 'subsistence',
    ancestryCorrelation: { WHG: 0.6, EHG: 0.3, CHG: 0.1 },
    sources: ['D-PLACE EA003', 'Binford 2001'],
  },
  {
    id: 'n2',
    label: 'Bilateral Kinship',
    t: 0,
    position: [-2.7, 2.8, 0.1],
    clusterId: 'WHG',
    traitCategory: 'kinship',
    ancestryCorrelation: { WHG: 0.5, EHG: 0.25, EEF: 0.15, CHG: 0.1 },
    sources: ['Murdock 1967 EA043'],
  },
  {
    id: 'n3',
    label: 'Mobile Band Society',
    t: 0,
    position: [-3.3, 2.2, 0.5],
    clusterId: 'WHG',
    traitCategory: 'political',
    ancestryCorrelation: { WHG: 0.55, EHG: 0.35, CHG: 0.1 },
  },
  {
    id: 'n4',
    label: 'Forest Adaptation',
    t: 0,
    position: [-2.5, 2.0, 0.2],
    clusterId: 'WHG',
    traitCategory: 'material',
    ancestryCorrelation: { WHG: 0.7, EHG: 0.2, CHG: 0.1 },
  },

  // EEF traits — Early farming adaptations
  {
    id: 'n5',
    label: 'Intensive Agriculture',
    t: 0,
    position: [2.5, -1.5, 0.4],
    clusterId: 'EEF',
    traitCategory: 'subsistence',
    ancestryCorrelation: { EEF: 0.75, CHG: 0.15, WHG: 0.1 },
    sources: ['D-PLACE EA001', 'Murdock 1967'],
  },
  {
    id: 'n6',
    label: 'Tell Settlements',
    t: 0,
    position: [2.8, -1.2, 0.2],
    clusterId: 'EEF',
    traitCategory: 'material',
    ancestryCorrelation: { EEF: 0.8, CHG: 0.12, WHG: 0.08 },
    sources: ['Todorova 1978', 'Bailey 2000'],
  },
  {
    id: 'n7',
    label: 'Earth/Fertility Goddess',
    t: 0,
    position: [2.2, -1.8, 0.6],
    clusterId: 'EEF',
    traitCategory: 'religion',
    ancestryCorrelation: { EEF: 0.75, CHG: 0.15, WHG: 0.1 },
    sources: ['Gimbutas 1989', 'Hodder 2006'],
  },
  {
    id: 'n8',
    label: 'Geometric Pottery',
    t: 0,
    position: [3.0, -1.0, 0.3],
    clusterId: 'EEF',
    traitCategory: 'artistic',
    ancestryCorrelation: { EEF: 0.8, CHG: 0.1, WHG: 0.1 },
    sources: ['Gimbutas 1989', 'Chapman 2000'],
  },

  // CHG/EHG traits — Eastern adaptations
  {
    id: 'n9',
    label: 'Mountain Pastoralism',
    t: 0,
    position: [4.0, 1.0, 0.4],
    clusterId: 'CHG',
    traitCategory: 'subsistence',
    ancestryCorrelation: { CHG: 0.6, EHG: 0.25, WHG: 0.15 },
  },
  {
    id: 'n10',
    label: 'Fire Veneration',
    t: 0,
    position: [4.3, 0.7, 0.2],
    clusterId: 'CHG',
    traitCategory: 'religion',
    ancestryCorrelation: { CHG: 0.7, EHG: 0.2, EEF: 0.1 },
  },
  {
    id: 'n11',
    label: 'Steppe Foraging',
    t: 0,
    position: [1.0, 3.5, 0.5],
    clusterId: 'EHG',
    traitCategory: 'subsistence',
    ancestryCorrelation: { EHG: 0.6, WHG: 0.25, CHG: 0.15 },
  },
  {
    id: 'n12',
    label: 'Cold Adaptation',
    t: 0,
    position: [0.7, 3.2, 0.3],
    clusterId: 'EHG',
    traitCategory: 'material',
    ancestryCorrelation: { EHG: 0.65, WHG: 0.2, CHG: 0.15 },
  },
];

// ============================================================================
// T1: CHALCOLITHIC/COPPER AGE (~5500-3500 BCE)
// EEF expansion into Europe, mixing with WHG, CHG-EHG beginning to form Steppe
// ============================================================================
const T1_NODES: Node[] = [
  // WHG declining, mixing with EEF
  {
    id: 'n1',
    label: 'Hunting-Gathering',
    t: 1,
    position: [-1.5, 1.5, 0.4],
    clusterId: 'EEF_WHG',
    traitCategory: 'subsistence',
  },
  {
    id: 'n2',
    label: 'Bilateral Kinship',
    t: 1,
    position: [-1.2, 1.8, 0.2],
    clusterId: 'EEF_WHG',
    traitCategory: 'kinship',
  },
  {
    id: 'n3',
    label: 'Village Communities',
    t: 1,
    position: [-1.8, 1.2, 0.5],
    clusterId: 'EEF_WHG',
    traitCategory: 'political',
  },
  {
    id: 'n4',
    label: 'Forest Clearance',
    t: 1,
    position: [-1.0, 1.0, 0.3],
    clusterId: 'EEF_WHG',
    traitCategory: 'material',
  },

  // EEF expanding, developing tells
  {
    id: 'n5',
    label: 'Intensive Agriculture',
    t: 1,
    position: [0.5, -2.0, 0.5],
    clusterId: 'EEF',
    traitCategory: 'subsistence',
  },
  {
    id: 'n6',
    label: 'Tell Settlements',
    t: 1,
    position: [0.8, -1.7, 0.3],
    clusterId: 'EEF',
    traitCategory: 'material',
  },
  {
    id: 'n7',
    label: 'Earth/Fertility Goddess',
    t: 1,
    position: [0.2, -2.3, 0.7],
    clusterId: 'EEF',
    traitCategory: 'religion',
  },
  {
    id: 'n8',
    label: 'Copper Metallurgy',
    t: 1,
    position: [1.0, -1.5, 0.4],
    clusterId: 'EEF',
    traitCategory: 'material',
  },

  // Proto-Steppe forming from CHG + EHG
  {
    id: 'n9',
    label: 'Pastoralism Emerging',
    t: 1,
    position: [3.0, 2.5, 0.5],
    clusterId: 'Steppe',
    traitCategory: 'subsistence',
  },
  {
    id: 'n10',
    label: 'Horse Domestication',
    t: 1,
    position: [3.3, 2.2, 0.3],
    clusterId: 'Steppe',
    traitCategory: 'material',
  },
  {
    id: 'n11',
    label: 'Patrilineal Organization',
    t: 1,
    position: [2.7, 2.8, 0.6],
    clusterId: 'Steppe',
    traitCategory: 'kinship',
  },
  {
    id: 'n12',
    label: 'Wheeled Vehicles',
    t: 1,
    position: [3.5, 2.0, 0.4],
    clusterId: 'Steppe',
    traitCategory: 'material',
  },
];

// ============================================================================
// T2: BRONZE AGE (~3500-1200 BCE)
// Steppe migrations, massive cultural transformation, synthesis begins
// ============================================================================
const T2_NODES: Node[] = [
  // Bronze Age synthesis — merged traits
  {
    id: 'n1',
    label: 'Agropastoralism',
    t: 2,
    position: [0.0, 0.5, 0.5],
    clusterId: 'Bronze',
    traitCategory: 'subsistence',
  },
  {
    id: 'n2',
    label: 'Patrilineal Descent',
    t: 2,
    position: [0.3, 0.8, 0.3],
    clusterId: 'Bronze',
    traitCategory: 'kinship',
  },
  {
    id: 'n3',
    label: 'Warrior Elite Society',
    t: 2,
    position: [-0.3, 0.2, 0.7],
    clusterId: 'Bronze',
    traitCategory: 'political',
  },
  {
    id: 'n4',
    label: 'Bronze Metallurgy',
    t: 2,
    position: [0.5, 0.0, 0.4],
    clusterId: 'Bronze',
    traitCategory: 'material',
  },
  {
    id: 'n5',
    label: 'Sky God Worship',
    t: 2,
    position: [0.8, 1.0, 0.6],
    clusterId: 'Bronze',
    traitCategory: 'religion',
  },
  {
    id: 'n6',
    label: 'Kurgan Burial',
    t: 2,
    position: [1.0, 0.7, 0.2],
    clusterId: 'Bronze',
    traitCategory: 'religion',
  },
  {
    id: 'n7',
    label: 'Epic Poetry Tradition',
    t: 2,
    position: [-0.5, 1.2, 0.5],
    clusterId: 'Bronze',
    traitCategory: 'artistic',
  },
  {
    id: 'n8',
    label: 'Corded Ware Pottery',
    t: 2,
    position: [0.2, -0.3, 0.3],
    clusterId: 'Bronze',
    traitCategory: 'material',
  },
  {
    id: 'n9',
    label: 'Guest-Host Reciprocity',
    t: 2,
    position: [-0.8, 0.5, 0.4],
    clusterId: 'Bronze',
    traitCategory: 'political',
  },
  {
    id: 'n10',
    label: 'Extended Households',
    t: 2,
    position: [0.6, 1.3, 0.6],
    clusterId: 'Bronze',
    traitCategory: 'kinship',
  },
  {
    id: 'n11',
    label: 'Ancestor Veneration',
    t: 2,
    position: [-0.2, 0.9, 0.5],
    clusterId: 'Bronze',
    traitCategory: 'religion',
  },
  {
    id: 'n12',
    label: 'Clan Organization',
    t: 2,
    position: [0.9, 0.4, 0.4],
    clusterId: 'Bronze',
    traitCategory: 'kinship',
  },
];

// ============================================================================
// T3: IRON AGE/MEDIEVAL (~1200 BCE - 1500 CE)
// Regional differentiation into Balkan, Nordic, etc. variants
// ============================================================================
const T3_NODES: Node[] = [
  // Balkan regional traits
  {
    id: 'n1',
    label: 'Transhumance',
    t: 3,
    position: [-2.5, -2.0, 0.5],
    clusterId: 'Balkan',
    traitCategory: 'subsistence',
  },
  {
    id: 'n2',
    label: 'Extended Households (Zadruga)',
    t: 3,
    position: [-2.2, -1.7, 0.3],
    clusterId: 'Balkan',
    traitCategory: 'kinship',
  },
  {
    id: 'n3',
    label: 'Blood Feud Institution',
    t: 3,
    position: [-2.8, -2.3, 0.7],
    clusterId: 'Balkan',
    traitCategory: 'political',
  },
  {
    id: 'n4',
    label: 'Slava (Patron Saint)',
    t: 3,
    position: [-2.0, -2.5, 0.4],
    clusterId: 'Balkan',
    traitCategory: 'religion',
  },
  {
    id: 'n5',
    label: 'South Slavic Epic Cycle',
    t: 3,
    position: [-2.5, -1.5, 0.6],
    clusterId: 'Balkan',
    traitCategory: 'artistic',
  },
  {
    id: 'n6',
    label: 'Sevdalinka Songs',
    t: 3,
    position: [-2.3, -2.7, 0.5],
    clusterId: 'Balkan',
    traitCategory: 'artistic',
  },

  // Nordic regional traits
  {
    id: 'n7',
    label: 'Maritime Economy',
    t: 3,
    position: [2.5, -2.0, 0.5],
    clusterId: 'Nordic',
    traitCategory: 'subsistence',
  },
  {
    id: 'n8',
    label: 'Thing Assembly',
    t: 3,
    position: [2.2, -1.7, 0.3],
    clusterId: 'Nordic',
    traitCategory: 'political',
  },
  {
    id: 'n9',
    label: 'Runic Writing',
    t: 3,
    position: [2.8, -2.3, 0.7],
    clusterId: 'Nordic',
    traitCategory: 'material',
  },
  {
    id: 'n10',
    label: 'Eddic Poetry',
    t: 3,
    position: [2.0, -2.5, 0.4],
    clusterId: 'Nordic',
    traitCategory: 'artistic',
  },
  {
    id: 'n11',
    label: 'Ship Burial',
    t: 3,
    position: [2.5, -1.5, 0.6],
    clusterId: 'Nordic',
    traitCategory: 'religion',
  },
  {
    id: 'n12',
    label: 'Farmstead Independence',
    t: 3,
    position: [2.3, -2.7, 0.5],
    clusterId: 'Nordic',
    traitCategory: 'kinship',
  },
];

// ============================================================================
// Temporal Slices
// ============================================================================
export const TEMPORAL_SLICES: TemporalSlice[] = [
  {
    t: 0,
    nodes: T0_NODES,
    clusters: [
      { id: 'WHG', t: 0, nodeIds: ['n1', 'n2', 'n3', 'n4'] },
      { id: 'EEF', t: 0, nodeIds: ['n5', 'n6', 'n7', 'n8'] },
      { id: 'CHG', t: 0, nodeIds: ['n9', 'n10'] },
      { id: 'EHG', t: 0, nodeIds: ['n11', 'n12'] },
    ],
  },
  {
    t: 1,
    nodes: T1_NODES,
    clusters: [
      { id: 'EEF_WHG', t: 1, nodeIds: ['n1', 'n2', 'n3', 'n4'] },
      { id: 'EEF', t: 1, nodeIds: ['n5', 'n6', 'n7', 'n8'] },
      { id: 'Steppe', t: 1, nodeIds: ['n9', 'n10', 'n11', 'n12'] },
    ],
  },
  {
    t: 2,
    nodes: T2_NODES,
    clusters: [
      { id: 'Bronze', t: 2, nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9', 'n10', 'n11', 'n12'] },
    ],
  },
  {
    t: 3,
    nodes: T3_NODES,
    clusters: [
      { id: 'Balkan', t: 3, nodeIds: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'] },
      { id: 'Nordic', t: 3, nodeIds: ['n7', 'n8', 'n9', 'n10', 'n11', 'n12'] },
    ],
  },
];

export const MAX_TIME_STEP = 3;
export const MIN_TIME_STEP = 0;

export const getSliceAtTime = (t: number): TemporalSlice => {
  const clampedT = Math.max(MIN_TIME_STEP, Math.min(MAX_TIME_STEP, Math.floor(t)));
  return TEMPORAL_SLICES[clampedT] || TEMPORAL_SLICES[0];
};

export const getClusterMetadata = (clusterId: string): ClusterMetadata => {
  return (
    CLUSTER_METADATA[clusterId] || {
      id: clusterId,
      label: `Population ${clusterId}`,
      color: '#94a3b8',
    }
  );
};
