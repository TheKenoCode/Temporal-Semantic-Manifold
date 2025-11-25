'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type {
  ClusterTrajectory,
  EllipsoidGeometry,
  ManifoldBounds,
  ProjectedCluster,
  ProjectedEdge,
  ProjectedNode,
} from '@/types/manifold';
import { computeEigendecomposition, createRotationMatrix } from '@/utils/eigendecomposition';

type NodeSphereProps = {
  node: ProjectedNode;
  isHovered: boolean;
  isSelected: boolean;
  showLabels: boolean;
  onHover: (node: ProjectedNode | null) => void;
  onSelect: (nodeId: string | null) => void;
};

type ClusterVolumeProps = {
  cluster: ProjectedCluster;
  members: ProjectedNode[];
  /** Current semantic time for jump detection */
  semanticTime: number;
};

type ClusterTrajectoryProps = {
  trajectory: ClusterTrajectory;
};

type ManifoldBoundaryProps = {
  bounds: ManifoldBounds;
};

type ManifoldSceneProps = {
  nodes: ProjectedNode[];
  edges: ProjectedEdge[];
  clusters: ProjectedCluster[];
  trajectories: ClusterTrajectory[];
  bounds: ManifoldBounds;
  semanticTime: number;
  showEdges: boolean;
  showLabels: boolean;
  showTrajectories: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  onHover: (node: ProjectedNode | null) => void;
  onSelect: (nodeId: string | null) => void;
};

const EDGE_COLOR = '#94a3b8';
const EDGE_HIGHLIGHT_COLOR = '#f8fafc';

// Smooth interpolation function
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

/**
 * Compute ellipsoid geometry from node positions using PROPER PCA
 * with full eigenvalue decomposition for accurate orientation
 */
const computeEllipsoidGeometry = (members: ProjectedNode[]): EllipsoidGeometry | null => {
  if (members.length === 0) {
    return null;
  }

  // Enhanced constants for beautiful fuzzy blobs
  const EPSILON = 0.05;
  const MIN_RADIUS = 2.0;
  const SCALE_FACTOR = 7.0;
  const FATNESS_FACTOR = 1.6;

  // 1. Compute centroid
  const centroid = members.reduce<[number, number, number]>(
    (acc, node) => [
      acc[0] + node.position[0],
      acc[1] + node.position[1],
      acc[2] + node.position[2],
    ],
    [0, 0, 0],
  );
  centroid[0] /= members.length;
  centroid[1] /= members.length;
  centroid[2] /= members.length;

  // 2. Build symmetric 3x3 covariance matrix with regularization
  const cov: [[number, number, number], [number, number, number], [number, number, number]] = [
    [EPSILON, 0, 0],
    [0, EPSILON, 0],
    [0, 0, EPSILON],
  ];

  for (const node of members) {
    const dx = node.position[0] - centroid[0];
    const dy = node.position[1] - centroid[1];
    const dz = node.position[2] - centroid[2];

    cov[0][0] += dx * dx;
    cov[0][1] += dx * dy;
    cov[0][2] += dx * dz;
    cov[1][1] += dy * dy;
    cov[1][2] += dy * dz;
    cov[2][2] += dz * dz;
  }

  const n = members.length;
  cov[0][0] /= n;
  cov[0][1] /= n;
  cov[0][2] /= n;
  cov[1][0] = cov[0][1]; // Symmetric
  cov[1][1] /= n;
  cov[1][2] /= n;
  cov[2][0] = cov[0][2]; // Symmetric
  cov[2][1] = cov[1][2]; // Symmetric
  cov[2][2] /= n;

  // 3. Compute proper eigendecomposition
  const { eigenvalues, eigenvectors } = computeEigendecomposition(cov);

  // 4. Convert eigenvalues to radii (take sqrt and scale)
  const radii: [number, number, number] = [
    Math.max(Math.sqrt(Math.abs(eigenvalues[0])) * SCALE_FACTOR, MIN_RADIUS) * FATNESS_FACTOR,
    Math.max(Math.sqrt(Math.abs(eigenvalues[1])) * SCALE_FACTOR, MIN_RADIUS) * FATNESS_FACTOR,
    Math.max(Math.sqrt(Math.abs(eigenvalues[2])) * SCALE_FACTOR, MIN_RADIUS) * FATNESS_FACTOR,
  ];

  // 5. Create rotation matrix from eigenvectors
  const rotation = createRotationMatrix(eigenvectors);

  // 6. Safety checks
  radii[0] = Number.isFinite(radii[0]) ? radii[0] : MIN_RADIUS;
  radii[1] = Number.isFinite(radii[1]) ? radii[1] : MIN_RADIUS;
  radii[2] = Number.isFinite(radii[2]) ? radii[2] : MIN_RADIUS;

  return {
    centroid,
    radii,
    rotation,
  };
};

/**
 * Node sphere component (no floating animation)
 */
function NodeSphere({ node, isHovered, isSelected, showLabels, onHover, onSelect }: NodeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const scaleRef = useRef(node.size);
  const opacityRef = useRef(0.85);
  const emissiveIntensityRef = useRef(0.2);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current || !groupRef.current) return;

    const targetScale = node.size * (isHovered ? 1.15 : 1) * (isSelected ? 1.2 : 1);
    const targetOpacity = isSelected || isHovered ? 0.98 : 0.85;
    const targetEmissive = isSelected ? 0.6 : isHovered ? 0.35 : 0.2;

    // Smooth interpolation
    scaleRef.current = lerp(scaleRef.current, targetScale, 0.15);
    opacityRef.current = lerp(opacityRef.current, targetOpacity, 0.2);
    emissiveIntensityRef.current = lerp(emissiveIntensityRef.current, targetEmissive, 0.2);

    meshRef.current.scale.setScalar(scaleRef.current);
    materialRef.current.opacity = opacityRef.current;
    materialRef.current.emissiveIntensity = emissiveIntensityRef.current;

    // NO floating animation - deterministic position only
    groupRef.current.position.set(...node.position);
  });

  return (
    <group ref={groupRef} key={node.id} position={node.position}>
      <mesh
        ref={meshRef}
        renderOrder={2}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(node);
        }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.id);
        }}
      >
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={node.color}
          opacity={0.85}
          transparent
          emissive={node.color}
          emissiveIntensity={0.2}
        />
      </mesh>
      {showLabels && isHovered && (
        <Html position={[0, 0.75, 0]} center distanceFactor={16}>
          <div className="rounded-md border border-slate-500/50 bg-slate-900/85 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur">
            <div className="font-semibold">{node.label}</div>
            <div className="text-[10px] text-slate-300">t = {node.timeStep.toFixed(2)}</div>
            <div className="mt-1 text-[10px] text-slate-300">{node.clusterLabel}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Cluster volume as ellipsoid with proper blending for overlapping colors
 * Supports smooth opacity transitions during merge/split events
 */
// Scale factor to make blobs smaller (0.65 = 65% of original size)
const BLOB_SCALE = 0.65;

function ClusterVolume({ cluster, members, semanticTime }: ClusterVolumeProps) {
  const geometry = useMemo(() => computeEllipsoidGeometry(members), [members]);
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // Smooth interpolation refs - initialize with defaults to avoid hydration issues
  const scaleRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
  const opacityRef = useRef(0.55);
  const emissiveRef = useRef(0.25);
  const positionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  
  // Track previous semantic time to detect scrubbing
  const prevTimeRef = useRef(semanticTime);
  
  // Initialize refs on first render
  const isInitializedRef = useRef(false);
  if (!isInitializedRef.current && geometry) {
    scaleRef.current.set(...geometry.radii);
    positionRef.current.set(...geometry.centroid);
    opacityRef.current = cluster.opacity * 0.55;
    emissiveRef.current = cluster.isEmerging ? 0.35 : 0.25;
    isInitializedRef.current = true;
  }

  useFrame(() => {
    if (!meshRef.current || !materialRef.current || !groupRef.current || !geometry) return;
    
    const targetScale = new THREE.Vector3(...geometry.radii);
    const targetPosition = new THREE.Vector3(...geometry.centroid);
    
    // Detect time jump (scrubbing) - if time changed by more than 0.1 in one frame
    const timeDelta = Math.abs(semanticTime - prevTimeRef.current);
    const isJump = timeDelta > 0.1;
    
    if (isJump) {
      // Immediate snap for scrubbing - no interpolation
      scaleRef.current.copy(targetScale);
      positionRef.current.copy(targetPosition);
    } else {
      // Smooth interpolation during normal playback
      scaleRef.current.lerp(targetScale, 0.12);
      positionRef.current.lerp(targetPosition, 0.15);
    }
    
    prevTimeRef.current = semanticTime;
    
    meshRef.current.scale.copy(scaleRef.current);
    groupRef.current.position.copy(positionRef.current);
    
    // Apply rotation
    groupRef.current.rotation.setFromRotationMatrix(geometry.rotation);
    
    // Smooth opacity transition
    const targetOpacity = cluster.opacity * 0.55;
    opacityRef.current = lerp(opacityRef.current, targetOpacity, 0.12);
    materialRef.current.opacity = opacityRef.current;
    
    // Emerging clusters glow slightly more
    const targetEmissive = cluster.isEmerging ? 0.35 : 0.25;
    emissiveRef.current = lerp(emissiveRef.current, targetEmissive, 0.1);
    materialRef.current.emissiveIntensity = emissiveRef.current;
  });

  if (!geometry) return null;

  // Initial position for first render
  const initialPosition = geometry.centroid;

  return (
    <group ref={groupRef} position={initialPosition}>
      <mesh ref={meshRef} renderOrder={cluster.isEmerging ? 0 : -1}>
        <sphereGeometry args={[BLOB_SCALE, 64, 64]} />
        <meshPhysicalMaterial
          ref={materialRef}
          color={cluster.color}
          transparent
          opacity={cluster.opacity * 0.55}
          roughness={0.6}
          metalness={0.0}
          clearcoat={0.2}
          clearcoatRoughness={0.7}
          emissive={cluster.color}
          emissiveIntensity={cluster.isEmerging ? 0.35 : 0.25}
          depthWrite={false}
          depthTest={true}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          transmission={0.1}
          thickness={0.5}
        />
      </mesh>
    </group>
  );
}

/**
 * Cluster trajectory line showing movement through time with smooth curves
 */
function ClusterTrajectoryLine({ trajectory }: ClusterTrajectoryProps) {
  // Filter out invalid centroids (with NaN values)
  const validCentroids = useMemo(() => {
    return trajectory.centroids.filter(
      (c) => c && c.every((v) => Number.isFinite(v))
    );
  }, [trajectory.centroids]);

  // Create smooth curve using Catmull-Rom spline
  const curve = useMemo(() => {
    if (validCentroids.length < 2) return null;
    const points = validCentroids.map((c) => new THREE.Vector3(...c));
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3);
  }, [validCentroids]);

  const curvePoints = useMemo(() => {
    if (!curve) return [];
    return curve.getPoints(50); // 50 points for smooth curve
  }, [curve]);

  if (!curve || curvePoints.length === 0) return null;

  return (
    <>
      <Line
        points={curvePoints}
        color={trajectory.color}
        lineWidth={4}
        transparent
        opacity={0.88}
        dashed={false}
      />
      {/* Add glowing spheres at each actual time point */}
      {validCentroids.map((centroid, i) => (
        <mesh key={i} position={centroid}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color={trajectory.color}
            transparent
            opacity={0.9}
            emissive={trajectory.color}
            emissiveIntensity={0.8}
          />
        </mesh>
      ))}
    </>
  );
}

/**
 * Dynamic manifold boundary box
 */
function ManifoldBoundary({ bounds }: ManifoldBoundaryProps) {
  const meshRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Validate bounds - don't render if values are invalid
  const hasValidBounds = 
    bounds.center.every(Number.isFinite) && 
    bounds.size.every(Number.isFinite) &&
    bounds.size.every((v) => v > 0);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Subtle breathing animation for boundary
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.3) * 0.015;
    groupRef.current.scale.setScalar(pulse);
  });

  if (!hasValidBounds) return null;

  return (
    <group ref={groupRef} position={bounds.center}>
      <lineSegments ref={meshRef}>
        <edgesGeometry args={[new THREE.BoxGeometry(...bounds.size)]} />
        <lineBasicMaterial color="#64748b" transparent opacity={0.45} />
      </lineSegments>
      {/* Corner spheres for visual anchors */}
      {[
        [bounds.size[0] / 2, bounds.size[1] / 2, bounds.size[2] / 2],
        [-bounds.size[0] / 2, bounds.size[1] / 2, bounds.size[2] / 2],
        [bounds.size[0] / 2, -bounds.size[1] / 2, bounds.size[2] / 2],
        [bounds.size[0] / 2, bounds.size[1] / 2, -bounds.size[2] / 2],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#64748b" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Edge component with state-based styling
 */
type EdgeLineProps = {
  edge: ProjectedEdge;
  isHighlighted: boolean;
  isActive: boolean;
};

function EdgeLine({ edge, isHighlighted, isActive }: EdgeLineProps) {
  // Validate edge positions - don't render if any value is NaN or undefined
  const hasValidStart = edge.start && edge.start.every((v) => Number.isFinite(v));
  const hasValidEnd = edge.end && edge.end.every((v) => Number.isFinite(v));
  
  if (!hasValidStart || !hasValidEnd) {
    return null; // Skip rendering edges with invalid positions
  }

  // Compute styles based on state - no animation to avoid ref issues
  const opacity = isHighlighted ? 0.95 : isActive ? 0.15 : 0.35;
  const lineWidth = isHighlighted ? 2.5 : 1.2;
  const color = isHighlighted ? EDGE_HIGHLIGHT_COLOR : EDGE_COLOR;

  return (
    <Line
      key={edge.id}
      points={[edge.start, edge.end]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}

/**
 * Temporal axis indicator with enhanced visibility
 */
function TemporalAxis() {
  const axisPoints = useMemo(() => {
    const depth = 16;
    return [
      [0, -8, -depth],
      [0, -8, depth],
    ];
  }, []);

  const arrowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!arrowRef.current) return;
    // Subtle glow pulse on arrow
    const pulse = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
    arrowRef.current.scale.setScalar(pulse);
  });

  return (
    <>
      <Line
        points={axisPoints}
        color="#94a3b8"
        lineWidth={1.5}
        dashed
        dashSize={0.5}
        gapSize={0.3}
      />
      <mesh ref={arrowRef} position={[0, -8, 16]}>
        <coneGeometry args={[0.35, 1.4, 16]} />
        <meshStandardMaterial
          color="#94a3b8"
          emissive="#60a5fa"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Axis labels */}
      {[-12, -4, 4, 12].map((z) => (
        <mesh key={z} position={[0, -8, z]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshBasicMaterial color="#64748b" transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Main manifold scene component
 */
export function ManifoldScene({
  nodes,
  edges,
  clusters,
  trajectories,
  bounds,
  semanticTime,
  showEdges,
  showLabels,
  showTrajectories,
  hoveredNodeId,
  selectedNodeId,
  onHover,
  onSelect,
}: ManifoldSceneProps) {
  const activeNodeId = selectedNodeId ?? hoveredNodeId;
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <Canvas camera={{ position: [0, 10, 24], fov: 40 }} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#030712']} />
      <fog attach="fog" args={['#030712', 30, 90]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[20, 25, 10]} intensity={0.8} castShadow />
      <pointLight position={[-25, -10, -10]} intensity={0.5} />
      <pointLight position={[0, 0, 0]} intensity={0.7} color="#ffffff" />
      <pointLight position={[10, 5, 10]} intensity={0.3} color="#60a5fa" />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#a855f7" />
      <gridHelper args={[80, 40, '#1f2937', '#111827']} />
      <axesHelper args={[8]} />

      {/* Manifold boundary */}
      <ManifoldBoundary bounds={bounds} />

      {/* Cluster trajectories - render early for depth */}
      {showTrajectories &&
        trajectories.map((trajectory) => (
          <group key={trajectory.identity} renderOrder={0}>
            <ClusterTrajectoryLine trajectory={trajectory} />
          </group>
        ))}

      {/* Cluster volumes (ellipsoids) */}
      {clusters.map((cluster) => {
        const members = cluster.nodeIds
          .map((id) => nodeMap.get(id))
          .filter(Boolean) as ProjectedNode[];
        return (
          <ClusterVolume 
            key={`${cluster.id}-${cluster.timeStep}`} 
            cluster={cluster} 
            members={members} 
            semanticTime={semanticTime}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <NodeSphere
          key={node.id}
          node={node}
          isHovered={hoveredNodeId === node.id}
          isSelected={selectedNodeId === node.id}
          showLabels={showLabels}
          onHover={onHover}
          onSelect={(nodeId) => onSelect(nodeId === selectedNodeId ? null : nodeId)}
        />
      ))}

      {/* Edges */}
      {showEdges &&
        edges.map((edge) => {
          const isHighlighted =
            activeNodeId !== null &&
            (edge.sourceId === activeNodeId || edge.targetId === activeNodeId);

          return (
            <EdgeLine
              key={edge.id}
              edge={edge}
              isHighlighted={isHighlighted}
              isActive={activeNodeId !== null}
            />
          );
        })}

      <TemporalAxis />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        dampingFactor={0.04}
        enableDamping
        minDistance={8}
        maxDistance={80}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.1}
        rotateSpeed={0.6}
        zoomSpeed={0.9}
        panSpeed={0.7}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
