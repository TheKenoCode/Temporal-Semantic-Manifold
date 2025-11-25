/**
 * Hook for fetching AI-generated visualization data
 * 
 * Uses stable state management to prevent excessive re-renders
 * and implements proper cleanup on topic change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type GeneratedCommunity = {
  id: number;
  name: string;
  color: string;
  description: string | null;
  region: string | null;
  generatedFrom: string | null;
  isGenerated: boolean;
};

export type GeneratedNode = {
  id: number;
  timestamp: string;
  label: string;
  embedding: number[];
  metadata: any;
  communities: Array<{
    id: number;
    name: string;
    color: string;
    strength: number;
  }>;
};

export type GeneratedEdge = {
  id: number;
  sourceId: number;
  targetId: number;
  weight: number;
  type: string;
  createdAt: string;
};

export type GeneratedVisualizationData = {
  communities: GeneratedCommunity[];
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

// Empty arrays for stable reference
const EMPTY_COMMUNITIES: GeneratedCommunity[] = [];
const EMPTY_NODES: GeneratedNode[] = [];
const EMPTY_EDGES: GeneratedEdge[] = [];

export function useGeneratedData(topic: string | null): GeneratedVisualizationData {
  const [communities, setCommunities] = useState<GeneratedCommunity[]>(EMPTY_COMMUNITIES);
  const [nodes, setNodes] = useState<GeneratedNode[]>(EMPTY_NODES);
  const [edges, setEdges] = useState<GeneratedEdge[]>(EMPTY_EDGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the current topic to handle race conditions
  const currentTopicRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (topicToFetch: string) => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);

    try {
      const farPast = new Date(0).toISOString();
      const farFuture = new Date('2100-01-01').toISOString();
      
      // Fetch all data in parallel
      const [communitiesRes, nodesRes, edgesRes] = await Promise.all([
        fetch(`/api/communities?topic=${encodeURIComponent(topicToFetch)}`, {
          signal: abortController.signal,
        }),
        fetch(
          `/api/nodes?topic=${encodeURIComponent(topicToFetch)}&from=${farPast}&to=${farFuture}`,
          { signal: abortController.signal }
        ),
        fetch(`/api/edges?topic=${encodeURIComponent(topicToFetch)}`, {
          signal: abortController.signal,
        }),
      ]);

      // Check if the topic changed while fetching
      if (currentTopicRef.current !== topicToFetch) {
        return;
      }

      if (!communitiesRes.ok) throw new Error('Failed to fetch communities');
      if (!nodesRes.ok) throw new Error('Failed to fetch nodes');
      if (!edgesRes.ok) throw new Error('Failed to fetch edges');

      const [communitiesData, nodesData, edgesData] = await Promise.all([
        communitiesRes.json(),
        nodesRes.json(),
        edgesRes.json(),
      ]);

      // Final check before setting state
      if (currentTopicRef.current !== topicToFetch) {
        return;
      }

      setCommunities(communitiesData);
      setNodes(nodesData);
      setEdges(edgesData);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      // Only set error if topic hasn't changed
      if (currentTopicRef.current === topicToFetch) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      }
    } finally {
      // Only clear loading if topic hasn't changed
      if (currentTopicRef.current === topicToFetch) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    currentTopicRef.current = topic;
    
    if (!topic) {
      setCommunities(EMPTY_COMMUNITIES);
      setNodes(EMPTY_NODES);
      setEdges(EMPTY_EDGES);
      setError(null);
      return;
    }

    fetchData(topic);
    
    // Cleanup on unmount or topic change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [topic, fetchData]);

  const refetch = useCallback(() => {
    if (topic) {
      fetchData(topic);
    }
  }, [topic, fetchData]);

  return {
    communities,
    nodes,
    edges,
    isLoading,
    error,
    refetch,
  };
}

