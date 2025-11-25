/**
 * TraitInspector Component
 *
 * Displays detailed information about a selected cultural trait, including:
 * - Trait name and type
 * - Description
 * - Ancestry contributions (which populations contributed to this trait)
 * - Incoming/outgoing edges (cultural influences)
 */

'use client';

import type { ProjectedEdge, ProjectedNode } from '@/types/manifold';

type AncestryContribution = {
  name: string;
  color: string;
  strength: number; // 0.0 - 1.0
};

type TraitInspectorProps = {
  node: ProjectedNode;
  edges: ProjectedEdge[];
  allNodes: ProjectedNode[];
  onClose: () => void;
};

const TraitTypeLabels: Record<string, string> = {
  subsistence: '🌾 Subsistence',
  social: '👥 Social Structure',
  ritual: '🔮 Ritual / Religious',
  material: '⚒️ Material Culture',
  artistic: '🎭 Artistic',
  linguistic: '🗣️ Linguistic',
};

function AncestryBar({ contributions }: { contributions: AncestryContribution[] }) {
  // Sort by strength descending
  const sorted = [...contributions].sort((a, b) => b.strength - a.strength);
  const total = sorted.reduce((sum, c) => sum + c.strength, 0);

  return (
    <div className="space-y-2">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
        {sorted.map((contribution, i) => (
          <div
            key={contribution.name}
            className="h-full transition-all duration-300"
            style={{
              width: `${(contribution.strength / total) * 100}%`,
              backgroundColor: contribution.color,
            }}
            title={`${contribution.name}: ${Math.round(contribution.strength * 100)}%`}
          />
        ))}
      </div>
      <div className="space-y-1">
        {sorted.map((contribution) => (
          <div
            key={contribution.name}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: contribution.color }}
              />
              <span className="text-slate-300">{contribution.name}</span>
            </div>
            <span className="font-mono text-slate-400">
              {Math.round(contribution.strength * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EdgeList({
  title,
  edges,
  nodes,
  direction,
}: {
  title: string;
  edges: ProjectedEdge[];
  nodes: ProjectedNode[];
  direction: 'incoming' | 'outgoing';
}) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (edges.length === 0) {
    return (
      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
          {title}
        </div>
        <div className="text-xs italic text-slate-500">None</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="space-y-1.5">
        {edges.slice(0, 3).map((edge) => {
          const relatedId = direction === 'incoming' ? edge.sourceId : edge.targetId;
          const relatedNode = nodeMap.get(relatedId);
          const edgeTypeLabel =
            edge.type === 'derived_from'
              ? '← derived'
              : edge.type === 'diffusion'
                ? '↔ diffused'
                : '≈ similar';

          return (
            <div
              key={edge.id}
              className="flex items-center gap-2 text-xs"
            >
              {relatedNode && (
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: relatedNode.color }}
                />
              )}
              <span className="truncate text-slate-300">{relatedNode?.label ?? `Node ${relatedId}`}</span>
            </div>
          );
        })}
        {edges.length > 3 && (
          <div className="text-[10px] text-slate-500">+{edges.length - 3} more</div>
        )}
      </div>
    </div>
  );
}

export function TraitInspector({ node, edges, allNodes, onClose }: TraitInspectorProps) {
  // Get ancestry contributions from node data if available
  // For the demo, we use the cluster as the primary ancestry
  const ancestryContributions: AncestryContribution[] = [
    {
      name: node.clusterLabel,
      color: node.color,
      strength: 0.8,
    },
  ];

  // Find incoming and outgoing edges
  const incomingEdges = edges.filter((e) => e.targetId === node.id);
  const outgoingEdges = edges.filter((e) => e.sourceId === node.id);

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900/95 to-slate-800/95 p-5 shadow-2xl backdrop-blur-md">
      {/* Header Row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <span
              className="h-4 w-4 animate-pulse rounded-full"
              style={{
                backgroundColor: node.color,
                boxShadow: `0 0 12px ${node.color}`,
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100">{node.label}</h3>
                <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {node.clusterLabel}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span>Semantic Time:</span>
                <span className="font-mono text-sky-300">t = {node.timeStep.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
          title="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content Grid - Horizontal Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ancestry Contributions */}
        <div className="rounded-lg border border-slate-700/30 bg-slate-950/30 p-3">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Ancestral Contributions
          </div>
          <AncestryBar contributions={ancestryContributions} />
        </div>

        {/* Incoming Edges */}
        <div className="rounded-lg border border-slate-700/30 bg-slate-950/30 p-3">
          <EdgeList
            title="Influenced by (Incoming)"
            edges={incomingEdges}
            nodes={allNodes}
            direction="incoming"
          />
        </div>

        {/* Outgoing Edges */}
        <div className="rounded-lg border border-slate-700/30 bg-slate-950/30 p-3">
          <EdgeList
            title="Influenced (Outgoing)"
            edges={outgoingEdges}
            nodes={allNodes}
            direction="outgoing"
          />
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 rounded-lg border border-slate-700/30 bg-slate-950/30 px-3 py-2">
        <p className="text-[10px] leading-relaxed text-slate-500">
          💡 Traits inherit characteristics from ancestral populations. Edges show how
          cultural innovations flowed between groups over time.
        </p>
      </div>
    </div>
  );
}

