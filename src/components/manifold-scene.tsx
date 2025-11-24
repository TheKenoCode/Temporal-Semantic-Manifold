'use client';

import { useMemo, useRef } from 'react';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ProjectedEdge, ProjectedNode } from '@/types/manifold';

type NodeSphereProps = {
  node: ProjectedNode;
  isHovered: boolean;
  isSelected: boolean;
  showLabels: boolean;
  onHover: (node: ProjectedNode | null) => void;
  onSelect: (nodeId: number | null) => void;
};

type ManifoldSceneProps = {
  nodes: ProjectedNode[];
  edges: ProjectedEdge[];
  showEdges: boolean;
  showLabels: boolean;
  hoveredNodeId: number | null;
  selectedNodeId: number | null;
  onHover: (node: ProjectedNode | null) => void;
  onSelect: (nodeId: number | null) => void;
};

const EDGE_COLOR = '#94a3b8';
const EDGE_HIGHLIGHT_COLOR = '#f8fafc';

// Smooth interpolation function with easing
const lerp = (start: number, end: number, factor: number) => {
  return start + (end - start) * factor;
};

function NodeSphere({ node, isHovered, isSelected, showLabels, onHover, onSelect }: NodeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const scaleRef = useRef(node.size);
  const opacityRef = useRef(0.65);
  const emissiveIntensityRef = useRef(0.1);
  const floatOffsetRef = useRef(0);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current || !groupRef.current) return;

    const targetScale = node.size * (isHovered ? 1.15 : 1) * (isSelected ? 1.2 : 1);
    const targetOpacity = isSelected || isHovered ? 0.95 : 0.65;
    const targetEmissive = isSelected ? 0.5 : isHovered ? 0.25 : 0.1;

    // Smooth interpolation with easing (higher factor = faster, smoother)
    const scaleFactor = 0.15;
    const opacityFactor = 0.2;
    const emissiveFactor = 0.2;

    scaleRef.current = lerp(scaleRef.current, targetScale, scaleFactor);
    opacityRef.current = lerp(opacityRef.current, targetOpacity, opacityFactor);
    emissiveIntensityRef.current = lerp(emissiveIntensityRef.current, targetEmissive, emissiveFactor);

    // Subtle floating animation (breathing effect)
    floatOffsetRef.current = Math.sin(state.clock.elapsedTime * 0.5 + node.id * 0.1) * 0.05;
    const floatY = node.position[1] + floatOffsetRef.current;

    meshRef.current.scale.setScalar(scaleRef.current);
    materialRef.current.opacity = opacityRef.current;
    materialRef.current.emissiveIntensity = emissiveIntensityRef.current;
    groupRef.current.position.set(node.position[0], floatY, node.position[2]);
  });

  return (
    <group ref={groupRef} key={node.id} position={node.position}>
      <mesh
        ref={meshRef}
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
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color={node.color}
          opacity={opacityRef.current}
          transparent
          emissive={node.color}
          emissiveIntensity={emissiveIntensityRef.current}
        />
      </mesh>
      {showLabels && isHovered && (
        <Html position={[0, 0.75, 0]} center distanceFactor={16}>
          <div className="rounded-md border border-slate-500/50 bg-slate-900/85 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur">
            <div className="font-semibold">{node.label}</div>
            <div className="text-[10px] text-slate-300">
              {node.timestamp.toLocaleString()}
            </div>
            <div className="mt-1 text-[10px] text-slate-300">
              {node.communities.map((community) => community.name).join(', ')}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

type AnimatedEdgeProps = {
  edge: ProjectedEdge;
  isHighlighted: boolean;
  isActive: boolean;
};

function AnimatedEdge({ edge, isHighlighted, isActive }: AnimatedEdgeProps) {
  const opacityRef = useRef(0.2);
  const lineWidthRef = useRef(1);
  const colorRef = useRef(new THREE.Color(EDGE_COLOR));

  useFrame(() => {
    const targetOpacity = isHighlighted || !isActive ? 0.9 : 0.2;
    const targetLineWidth = isHighlighted ? 2 : 1;
    const targetColor = isHighlighted ? EDGE_HIGHLIGHT_COLOR : EDGE_COLOR;

    // Smooth interpolation
    opacityRef.current = lerp(opacityRef.current, targetOpacity, 0.2);
    lineWidthRef.current = lerp(lineWidthRef.current, targetLineWidth, 0.15);
    colorRef.current.lerp(new THREE.Color(targetColor), 0.2);
  });

  return (
    <Line
      key={edge.id}
      points={[edge.start, edge.end]}
      color={colorRef.current}
      lineWidth={lineWidthRef.current}
      transparent
      opacity={opacityRef.current}
    />
  );
}

function TemporalAxis() {
  const axisPoints = useMemo(() => {
    const depth = 16;
    return [
      [0, -8, -depth],
      [0, -8, depth],
    ];
  }, []);

  return (
    <>
      <Line
        points={axisPoints}
        color="#cbd5f5"
        lineWidth={1}
        dashed
        dashSize={0.4}
        gapSize={0.25}
      />
      <mesh position={[0, -8, 16]}>
        <coneGeometry args={[0.3, 1.2, 12]} />
        <meshStandardMaterial color="#cbd5f5" />
      </mesh>
    </>
  );
}

export function ManifoldScene({
  nodes,
  edges,
  showEdges,
  showLabels,
  hoveredNodeId,
  selectedNodeId,
  onHover,
  onSelect,
}: ManifoldSceneProps) {
  const activeNodeId = selectedNodeId ?? hoveredNodeId;

  return (
    <Canvas camera={{ position: [0, 10, 24], fov: 40 }}>
      <color attach="background" args={['#030712']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 25, 10]} intensity={0.7} />
      <pointLight position={[-25, -10, -10]} intensity={0.4} />
      <gridHelper args={[80, 40, '#1f2937', '#111827']} />
      <axesHelper args={[10]} />

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

      {showEdges &&
        edges.map((edge) => {
          const isHighlighted =
            activeNodeId !== null &&
            (edge.sourceId === activeNodeId || edge.targetId === activeNodeId);

          return (
            <AnimatedEdge
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
        dampingFactor={0.05}
        enableDamping
        minDistance={5}
        maxDistance={100}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
      />
    </Canvas>
  );
}

