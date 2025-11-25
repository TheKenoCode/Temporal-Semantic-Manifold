/**
 * Geographic Ancestry Visualization — REAL COORDINATES
 *
 * This maps ancient DNA populations and cultural traits to their actual
 * geographic locations, enabling visualization of:
 *   - Yamnaya expansion from the Pontic-Caspian Steppe westward
 *   - EEF farming spread from Anatolia into Europe
 *   - WHG populations in Western/Central Europe
 *   - Bronze Age ancestry transformations
 *
 * Coordinate System:
 *   x = longitude (normalized: -10° to 60° → -5 to 5)
 *   y = latitude (normalized: 35° to 60° → -3 to 3)
 *   z = time (0 to 3, with 0 = earliest)
 *
 * Key Archaeological Sites (from ancient DNA papers):
 *   - Yamnaya: Samara region, Russia (~50°N, 50°E)
 *   - Catalhoyuk: Central Anatolia (~37.5°N, 32.8°E)
 *   - Lepenski Vir: Iron Gates, Serbia (~44.5°N, 22°E)
 *   - Varna: Bulgaria (~43.2°N, 27.9°E)
 *   - Corded Ware: Central Europe (~52°N, 15°E)
 *
 * Sources:
 *   - Mathieson et al. 2018 supplementary tables
 *   - Haak et al. 2015 ancient DNA coordinates
 *   - Reich lab sample database
 */

export type GeoNode = {
  id: string;
  label: string;
  t: number; // time step
  geoPosition: {
    lat: number;
    lon: number;
  };
  position: [number, number, number]; // normalized for 3D
  clusterId: string;
  siteType?: 'population_center' | 'archaeological_site' | 'sample_location' | 'trait_origin';
  period?: string;
  sources?: string[];
};

export type GeoCluster = {
  id: string;
  t: number;
  nodeIds: string[];
  centroid: { lat: number; lon: number };
  region: string;
};

export type GeoTemporalSlice = {
  t: number;
  period: string;
  dateRange: string;
  nodes: GeoNode[];
  clusters: GeoCluster[];
};

export type GeoClusterMetadata = {
  id: string;
  label: string;
  color: string;
  homeland: { lat: number; lon: number };
  region: string;
  era: string;
  migrationDirection?: string;
};

// Convert real coordinates to normalized 3D space
// Europe roughly: lat 35-60°N, lon -10-60°E
function geoTo3D(lat: number, lon: number, t: number): [number, number, number] {
  // Normalize longitude: -10 to 60 → -5 to 5
  const x = ((lon - (-10)) / 70) * 10 - 5;
  // Normalize latitude: 35 to 60 → -3 to 3
  const y = ((lat - 35) / 25) * 6 - 3;
  // Time stays as z
  const z = t * 0.5; // scale for visual separation
  return [x, y, z];
}

// ============================================================================
// GEOGRAPHIC CLUSTER METADATA — Real homeland locations
// ============================================================================

export const GEO_CLUSTER_METADATA: Record<string, GeoClusterMetadata> = {
  WHG: {
    id: 'WHG',
    label: 'Western Hunter-Gatherers',
    color: '#0ea5e9',
    homeland: { lat: 48, lon: 5 }, // France/Germany region
    region: 'Western & Central Europe',
    era: '~15,000–5,000 BCE',
    migrationDirection: 'Retreated as EEF expanded',
  },
  EEF: {
    id: 'EEF',
    label: 'Early European Farmers',
    color: '#22c55e',
    homeland: { lat: 38, lon: 33 }, // Central Anatolia
    region: 'Anatolia',
    era: '~7,000–4,000 BCE',
    migrationDirection: 'Northwest into Europe via Balkans',
  },
  Steppe: {
    id: 'Steppe',
    label: 'Yamnaya / Steppe Pastoralists',
    color: '#ef4444',
    homeland: { lat: 48, lon: 45 }, // Pontic-Caspian Steppe
    region: 'Pontic-Caspian Steppe',
    era: '~3,300–2,500 BCE',
    migrationDirection: 'West into Europe, East into Asia',
  },
  CHG: {
    id: 'CHG',
    label: 'Caucasus Hunter-Gatherers',
    color: '#a855f7',
    homeland: { lat: 42, lon: 44 }, // Georgia/Caucasus
    region: 'Caucasus Mountains',
    era: '~25,000–5,000 BCE',
  },
  EHG: {
    id: 'EHG',
    label: 'Eastern Hunter-Gatherers',
    color: '#f97316',
    homeland: { lat: 55, lon: 50 }, // Volga region
    region: 'Eastern Europe / Russia',
    era: '~15,000–5,000 BCE',
  },
  Balkans: {
    id: 'Balkans',
    label: 'Balkan Bronze Age',
    color: '#06b6d4',
    homeland: { lat: 43, lon: 22 }, // Serbia/Bulgaria
    region: 'Balkans',
    era: '~3,000–1,200 BCE',
  },
  CordedWare: {
    id: 'CordedWare',
    label: 'Corded Ware Culture',
    color: '#f59e0b',
    homeland: { lat: 52, lon: 15 }, // Poland/Germany
    region: 'Central/Northern Europe',
    era: '~2,900–2,200 BCE',
    migrationDirection: 'Spread from east with Steppe ancestry',
  },
};

// ============================================================================
// ARCHAEOLOGICAL SITES — Real coordinates from ancient DNA papers
// ============================================================================

export const ARCHAEOLOGICAL_SITES = [
  // Yamnaya sites
  { id: 'samara', name: 'Samara (Yamnaya)', lat: 53.2, lon: 50.1, period: 'Bronze Age', type: 'Yamnaya' },
  { id: 'kalmykia', name: 'Kalmykia', lat: 46.3, lon: 45.3, period: 'Bronze Age', type: 'Yamnaya' },

  // Anatolian Neolithic
  { id: 'catalhoyuk', name: 'Çatalhöyük', lat: 37.67, lon: 32.83, period: 'Neolithic', type: 'EEF' },
  { id: 'barcin', name: 'Barcın Höyük', lat: 40.0, lon: 29.6, period: 'Neolithic', type: 'EEF' },

  // Balkan Neolithic/Chalcolithic
  { id: 'lepenski', name: 'Lepenski Vir', lat: 44.56, lon: 22.02, period: 'Mesolithic/Neolithic', type: 'WHG→EEF' },
  { id: 'varna', name: 'Varna Necropolis', lat: 43.21, lon: 27.91, period: 'Chalcolithic', type: 'EEF' },
  { id: 'vinca', name: 'Vinča', lat: 44.76, lon: 20.62, period: 'Neolithic', type: 'EEF' },

  // Central European
  { id: 'lbk', name: 'LBK (Linearbandkeramik)', lat: 49.5, lon: 10.0, period: 'Neolithic', type: 'EEF' },
  { id: 'corded', name: 'Corded Ware sites', lat: 52.0, lon: 15.0, period: 'Late Neolithic', type: 'Steppe+EEF' },

  // WHG sites
  { id: 'loschbour', name: 'Loschbour', lat: 49.7, lon: 6.2, period: 'Mesolithic', type: 'WHG' },
  { id: 'lacaze', name: 'La Brana', lat: 42.9, lon: -5.3, period: 'Mesolithic', type: 'WHG' },
];

// ============================================================================
// T0: MESOLITHIC / EARLY NEOLITHIC (~10,000 - 6,000 BCE)
// Populations in their homelands before major mixing
// ============================================================================

const T0_NODES: GeoNode[] = [
  // WHG in Western Europe
  {
    id: 'whg-1',
    label: 'WHG Foragers (France)',
    t: 0,
    geoPosition: { lat: 47, lon: 2 },
    position: geoTo3D(47, 2, 0),
    clusterId: 'WHG',
    siteType: 'population_center',
    period: 'Mesolithic',
    sources: ['Loschbour, La Braña samples'],
  },
  {
    id: 'whg-2',
    label: 'WHG Foragers (Balkans)',
    t: 0,
    geoPosition: { lat: 44.5, lon: 22 },
    position: geoTo3D(44.5, 22, 0),
    clusterId: 'WHG',
    siteType: 'archaeological_site',
    period: 'Mesolithic',
    sources: ['Lepenski Vir, Iron Gates'],
  },
  {
    id: 'whg-3',
    label: 'WHG Foragers (Iberia)',
    t: 0,
    geoPosition: { lat: 42, lon: -4 },
    position: geoTo3D(42, -4, 0),
    clusterId: 'WHG',
    siteType: 'population_center',
    period: 'Mesolithic',
    sources: ['La Braña sample'],
  },

  // EEF in Anatolia (just emerging)
  {
    id: 'eef-1',
    label: 'Anatolian Farmers (origin)',
    t: 0,
    geoPosition: { lat: 37.5, lon: 33 },
    position: geoTo3D(37.5, 33, 0),
    clusterId: 'EEF',
    siteType: 'trait_origin',
    period: 'Pre-Pottery Neolithic',
    sources: ['Çatalhöyük region'],
  },
  {
    id: 'eef-2',
    label: 'Anatolian Farmers (northwest)',
    t: 0,
    geoPosition: { lat: 40, lon: 30 },
    position: geoTo3D(40, 30, 0),
    clusterId: 'EEF',
    siteType: 'archaeological_site',
    period: 'Neolithic',
    sources: ['Barcın Höyük'],
  },

  // CHG in Caucasus
  {
    id: 'chg-1',
    label: 'Caucasus HG',
    t: 0,
    geoPosition: { lat: 42, lon: 44 },
    position: geoTo3D(42, 44, 0),
    clusterId: 'CHG',
    siteType: 'population_center',
    period: 'Mesolithic',
    sources: ['Kotias Klde, Satsurblia caves'],
  },

  // EHG in Eastern Europe
  {
    id: 'ehg-1',
    label: 'Eastern HG (Volga)',
    t: 0,
    geoPosition: { lat: 55, lon: 50 },
    position: geoTo3D(55, 50, 0),
    clusterId: 'EHG',
    siteType: 'population_center',
    period: 'Mesolithic',
    sources: ['Samara region samples'],
  },
  {
    id: 'ehg-2',
    label: 'Eastern HG (Karelia)',
    t: 0,
    geoPosition: { lat: 62, lon: 34 },
    position: geoTo3D(62, 34, 0),
    clusterId: 'EHG',
    siteType: 'population_center',
    period: 'Mesolithic',
    sources: ['Karelian samples'],
  },
];

// ============================================================================
// T1: NEOLITHIC EXPANSION (~6,000 - 4,000 BCE)
// EEF spreads into Europe, mixing with WHG
// ============================================================================

const T1_NODES: GeoNode[] = [
  // EEF expanding into Balkans
  {
    id: 'eef-balkans-1',
    label: 'Farmers reach Balkans',
    t: 1,
    geoPosition: { lat: 42, lon: 24 },
    position: geoTo3D(42, 24, 1),
    clusterId: 'EEF',
    siteType: 'archaeological_site',
    period: 'Early Neolithic',
    sources: ['Starčevo-Körös-Criș culture'],
  },
  {
    id: 'eef-balkans-2',
    label: 'Vinča Culture',
    t: 1,
    geoPosition: { lat: 44.7, lon: 20.6 },
    position: geoTo3D(44.7, 20.6, 1),
    clusterId: 'EEF',
    siteType: 'archaeological_site',
    period: 'Middle Neolithic',
    sources: ['Vinča-Belo Brdo'],
  },
  {
    id: 'eef-varna',
    label: 'Varna (Copper Age)',
    t: 1,
    geoPosition: { lat: 43.2, lon: 27.9 },
    position: geoTo3D(43.2, 27.9, 1),
    clusterId: 'EEF',
    siteType: 'archaeological_site',
    period: 'Chalcolithic',
    sources: ['Varna Necropolis gold'],
  },

  // EEF reaching Central Europe (LBK)
  {
    id: 'eef-lbk',
    label: 'LBK Farmers (Central Europe)',
    t: 1,
    geoPosition: { lat: 50, lon: 12 },
    position: geoTo3D(50, 12, 1),
    clusterId: 'EEF',
    siteType: 'population_center',
    period: 'Middle Neolithic',
    sources: ['Linearbandkeramik culture'],
  },

  // WHG retreating/mixing
  {
    id: 'whg-retreat',
    label: 'WHG (peripheral areas)',
    t: 1,
    geoPosition: { lat: 55, lon: 0 },
    position: geoTo3D(55, 0, 1),
    clusterId: 'WHG',
    siteType: 'population_center',
    period: 'Neolithic',
    sources: ['Britain, Scandinavia'],
  },

  // EHG + CHG beginning to mix (proto-Steppe)
  {
    id: 'proto-steppe',
    label: 'EHG-CHG mixing (proto-Yamnaya)',
    t: 1,
    geoPosition: { lat: 47, lon: 45 },
    position: geoTo3D(47, 45, 1),
    clusterId: 'EHG',
    siteType: 'population_center',
    period: 'Eneolithic',
    sources: ['Khvalynsk, Progress samples'],
  },
];

// ============================================================================
// T2: BRONZE AGE / YAMNAYA EXPANSION (~3,300 - 2,000 BCE)
// Massive Steppe migration westward
// ============================================================================

const T2_NODES: GeoNode[] = [
  // Yamnaya homeland
  {
    id: 'yamnaya-core',
    label: 'Yamnaya (homeland)',
    t: 2,
    geoPosition: { lat: 48, lon: 45 },
    position: geoTo3D(48, 45, 2),
    clusterId: 'Steppe',
    siteType: 'population_center',
    period: 'Early Bronze Age',
    sources: ['Samara, Kalmykia kurgans'],
  },

  // Yamnaya moving west
  {
    id: 'yamnaya-west-1',
    label: 'Yamnaya reaches Hungary',
    t: 2,
    geoPosition: { lat: 47, lon: 20 },
    position: geoTo3D(47, 20, 2),
    clusterId: 'Steppe',
    siteType: 'archaeological_site',
    period: 'Early Bronze Age',
    sources: ['Hungarian Yamnaya burials'],
  },
  {
    id: 'yamnaya-west-2',
    label: 'Yamnaya reaches Balkans',
    t: 2,
    geoPosition: { lat: 44, lon: 25 },
    position: geoTo3D(44, 25, 2),
    clusterId: 'Steppe',
    siteType: 'archaeological_site',
    period: 'Early Bronze Age',
    sources: ['Balkan Bronze Age samples'],
  },

  // Corded Ware (Steppe + EEF mix)
  {
    id: 'corded-ware',
    label: 'Corded Ware Culture',
    t: 2,
    geoPosition: { lat: 52, lon: 15 },
    position: geoTo3D(52, 15, 2),
    clusterId: 'CordedWare',
    siteType: 'population_center',
    period: 'Late Neolithic / EBA',
    sources: ['Haak 2015, Allentoft 2015'],
  },

  // Bell Beaker (Steppe spreading further west)
  {
    id: 'bell-beaker',
    label: 'Bell Beaker (Steppe ancestry)',
    t: 2,
    geoPosition: { lat: 50, lon: 0 },
    position: geoTo3D(50, 0, 2),
    clusterId: 'CordedWare',
    siteType: 'population_center',
    period: 'Late Neolithic / EBA',
    sources: ['Olalde 2018'],
  },

  // Balkans mixing
  {
    id: 'balkans-mix',
    label: 'Balkan Bronze Age (mixed)',
    t: 2,
    geoPosition: { lat: 43, lon: 22 },
    position: geoTo3D(43, 22, 2),
    clusterId: 'Balkans',
    siteType: 'population_center',
    period: 'Bronze Age',
    sources: ['Mathieson 2018'],
  },

  // EEF remnant in Greece
  {
    id: 'greece-eef',
    label: 'Greece (high EEF retention)',
    t: 2,
    geoPosition: { lat: 39, lon: 22 },
    position: geoTo3D(39, 22, 2),
    clusterId: 'EEF',
    siteType: 'population_center',
    period: 'Bronze Age',
    sources: ['Lazaridis 2016'],
  },
];

// ============================================================================
// T3: IRON AGE / MEDIEVAL (~1,200 BCE - 500 CE)
// Modern population structure emerges
// ============================================================================

const T3_NODES: GeoNode[] = [
  // Balkan populations
  {
    id: 'serbia',
    label: 'Serbia (Slavic)',
    t: 3,
    geoPosition: { lat: 44.0, lon: 21.0 },
    position: geoTo3D(44.0, 21.0, 3),
    clusterId: 'Balkans',
    siteType: 'population_center',
    period: 'Medieval-Modern',
    sources: ['Mathieson 2018: 42% EEF, 38% Steppe'],
  },
  {
    id: 'croatia',
    label: 'Croatia (Slavic)',
    t: 3,
    geoPosition: { lat: 45.8, lon: 16.0 },
    position: geoTo3D(45.8, 16.0, 3),
    clusterId: 'Balkans',
    siteType: 'population_center',
    period: 'Medieval-Modern',
    sources: ['45% EEF, 35% Steppe'],
  },
  {
    id: 'bosnia',
    label: 'Bosnia',
    t: 3,
    geoPosition: { lat: 43.9, lon: 17.7 },
    position: geoTo3D(43.9, 17.7, 3),
    clusterId: 'Balkans',
    siteType: 'population_center',
    period: 'Medieval-Modern',
    sources: ['43% EEF, 36% Steppe'],
  },
  {
    id: 'bulgaria',
    label: 'Bulgaria',
    t: 3,
    geoPosition: { lat: 42.7, lon: 25.5 },
    position: geoTo3D(42.7, 25.5, 3),
    clusterId: 'Balkans',
    siteType: 'population_center',
    period: 'Medieval-Modern',
    sources: ['Mathieson 2018: 48% EEF, 32% Steppe'],
  },

  // Greece (high EEF)
  {
    id: 'greece',
    label: 'Greece',
    t: 3,
    geoPosition: { lat: 39.0, lon: 22.0 },
    position: geoTo3D(39.0, 22.0, 3),
    clusterId: 'EEF',
    siteType: 'population_center',
    period: 'Modern',
    sources: ['Lazaridis 2016: 58% EEF, 22% Steppe'],
  },

  // Northern Europe (high Steppe)
  {
    id: 'poland',
    label: 'Poland',
    t: 3,
    geoPosition: { lat: 52.0, lon: 19.0 },
    position: geoTo3D(52.0, 19.0, 3),
    clusterId: 'CordedWare',
    siteType: 'population_center',
    period: 'Modern',
    sources: ['38% EEF, 42% Steppe'],
  },
  {
    id: 'ukraine',
    label: 'Ukraine',
    t: 3,
    geoPosition: { lat: 49.0, lon: 32.0 },
    position: geoTo3D(49.0, 32.0, 3),
    clusterId: 'CordedWare',
    siteType: 'population_center',
    period: 'Modern',
    sources: ['35% EEF, 45% Steppe (highest in Slavs)'],
  },

  // Western Europe
  {
    id: 'britain',
    label: 'Britain',
    t: 3,
    geoPosition: { lat: 54.0, lon: -2.0 },
    position: geoTo3D(54.0, -2.0, 3),
    clusterId: 'CordedWare',
    siteType: 'population_center',
    period: 'Modern',
    sources: ['Olalde 2018: ~90% replacement in Bronze Age'],
  },
];

// ============================================================================
// Temporal Slices
// ============================================================================

export const GEO_TEMPORAL_SLICES: GeoTemporalSlice[] = [
  {
    t: 0,
    period: 'Mesolithic / Early Neolithic',
    dateRange: '~10,000 – 6,000 BCE',
    nodes: T0_NODES,
    clusters: [
      { id: 'WHG', t: 0, nodeIds: ['whg-1', 'whg-2', 'whg-3'], centroid: { lat: 46, lon: 5 }, region: 'Western Europe' },
      { id: 'EEF', t: 0, nodeIds: ['eef-1', 'eef-2'], centroid: { lat: 38, lon: 32 }, region: 'Anatolia' },
      { id: 'CHG', t: 0, nodeIds: ['chg-1'], centroid: { lat: 42, lon: 44 }, region: 'Caucasus' },
      { id: 'EHG', t: 0, nodeIds: ['ehg-1', 'ehg-2'], centroid: { lat: 58, lon: 42 }, region: 'Eastern Europe' },
    ],
  },
  {
    t: 1,
    period: 'Neolithic Expansion',
    dateRange: '~6,000 – 4,000 BCE',
    nodes: T1_NODES,
    clusters: [
      { id: 'EEF', t: 1, nodeIds: ['eef-balkans-1', 'eef-balkans-2', 'eef-varna', 'eef-lbk'], centroid: { lat: 46, lon: 20 }, region: 'Balkans → Central Europe' },
      { id: 'WHG', t: 1, nodeIds: ['whg-retreat'], centroid: { lat: 55, lon: 0 }, region: 'Periphery' },
      { id: 'EHG', t: 1, nodeIds: ['proto-steppe'], centroid: { lat: 47, lon: 45 }, region: 'Steppe forming' },
    ],
  },
  {
    t: 2,
    period: 'Bronze Age / Yamnaya Expansion',
    dateRange: '~3,300 – 2,000 BCE',
    nodes: T2_NODES,
    clusters: [
      { id: 'Steppe', t: 2, nodeIds: ['yamnaya-core', 'yamnaya-west-1', 'yamnaya-west-2'], centroid: { lat: 46, lon: 35 }, region: 'Steppe → Europe' },
      { id: 'CordedWare', t: 2, nodeIds: ['corded-ware', 'bell-beaker'], centroid: { lat: 51, lon: 8 }, region: 'Central/Western Europe' },
      { id: 'Balkans', t: 2, nodeIds: ['balkans-mix'], centroid: { lat: 43, lon: 22 }, region: 'Balkans' },
      { id: 'EEF', t: 2, nodeIds: ['greece-eef'], centroid: { lat: 39, lon: 22 }, region: 'Greece' },
    ],
  },
  {
    t: 3,
    period: 'Iron Age / Medieval / Modern',
    dateRange: '~1,200 BCE – Present',
    nodes: T3_NODES,
    clusters: [
      { id: 'Balkans', t: 3, nodeIds: ['serbia', 'croatia', 'bosnia', 'bulgaria'], centroid: { lat: 44, lon: 21 }, region: 'Balkans' },
      { id: 'EEF', t: 3, nodeIds: ['greece'], centroid: { lat: 39, lon: 22 }, region: 'Greece' },
      { id: 'CordedWare', t: 3, nodeIds: ['poland', 'ukraine', 'britain'], centroid: { lat: 52, lon: 15 }, region: 'Northern Europe' },
    ],
  },
];

export const getGeoClusterMetadata = (clusterId: string): GeoClusterMetadata => {
  return (
    GEO_CLUSTER_METADATA[clusterId] || {
      id: clusterId,
      label: `Population ${clusterId}`,
      color: '#94a3b8',
      homeland: { lat: 45, lon: 20 },
      region: 'Unknown',
      era: 'Unknown',
    }
  );
};

export const getGeoSliceAtTime = (t: number): GeoTemporalSlice => {
  const clampedT = Math.max(0, Math.min(3, Math.floor(t)));
  return GEO_TEMPORAL_SLICES[clampedT] || GEO_TEMPORAL_SLICES[0];
};

