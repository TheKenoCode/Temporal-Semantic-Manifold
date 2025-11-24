import { type ManifoldEdge, type ManifoldNode } from '@/hooks/use-manifold-data';

export type ProjectedNode = {
  id: ManifoldNode['id'];
  label: ManifoldNode['label'];
  timestamp: Date;
  position: [number, number, number];
  color: string;
  size: number;
  communities: ManifoldNode['communities'];
  metadata: ManifoldNode['metadata'];
};

export type ProjectedEdge = {
  id: ManifoldEdge['id'];
  sourceId: ManifoldEdge['sourceId'];
  targetId: ManifoldEdge['targetId'];
  weight: ManifoldEdge['weight'];
  type: ManifoldEdge['type'];
  start: [number, number, number];
  end: [number, number, number];
};

