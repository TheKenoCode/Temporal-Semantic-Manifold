import { useMemo } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

export type CommunitySummary = {
  id: number;
  name: string;
  color: string;
  description?: string | null;
};

export type NodeCommunitySummary = {
  id: number;
  name: string;
  color: string;
  strength: number;
};

export type ManifoldNode = {
  id: number;
  timestamp: string;
  label: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  communities: NodeCommunitySummary[];
};

export type ManifoldEdge = {
  id: number;
  sourceId: number;
  targetId: number;
  weight: number;
  type: string;
  createdAt: string;
};

type NodeQueryParams = {
  from?: Date;
  to?: Date;
  communityId?: number | null;
};

type EdgeQueryParams = {
  from?: Date;
  to?: Date;
  nodeIds?: number[];
  enabled?: boolean;
};

const jsonFetch = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const serializeDate = (value?: Date | null) => (value ? value.toISOString() : undefined);

export const useCommunities = (
  options?: UseQueryOptions<CommunitySummary[], Error, CommunitySummary[], ['communities']>,
) =>
  useQuery({
    queryKey: ['communities'],
    queryFn: () => jsonFetch<CommunitySummary[]>('/api/communities'),
    ...options,
  });

export const useNodes = (
  params: NodeQueryParams,
  options?: UseQueryOptions<ManifoldNode[], Error, ManifoldNode[], ['nodes', Record<string, unknown>]>,
) => {
  const query = useMemo(() => {
    const search = new URLSearchParams();
    if (params.from) search.set('from', serializeDate(params.from)!);
    if (params.to) search.set('to', serializeDate(params.to)!);
    if (typeof params.communityId === 'number') search.set('communityId', String(params.communityId));
    const suffix = search.toString();
    return suffix ? `/api/nodes?${suffix}` : '/api/nodes';
  }, [params.from, params.to, params.communityId]);

  const keyPayload = {
    from: serializeDate(params.from),
    to: serializeDate(params.to),
    communityId: params.communityId ?? null,
  };

  return useQuery({
    queryKey: ['nodes', keyPayload],
    queryFn: () => jsonFetch<ManifoldNode[]>(query),
    keepPreviousData: true,
    ...options,
  });
};

export const useEdges = (
  params: EdgeQueryParams,
  options?: UseQueryOptions<ManifoldEdge[], Error, ManifoldEdge[], ['edges', Record<string, unknown>]>,
) => {
  const nodeIdsKey = params.nodeIds?.join(',') ?? null;
  const query = useMemo(() => {
    const search = new URLSearchParams();
    if (params.from) search.set('from', serializeDate(params.from)!);
    if (params.to) search.set('to', serializeDate(params.to)!);
    if (nodeIdsKey) search.set('nodeIds', nodeIdsKey);
    const suffix = search.toString();
    return suffix ? `/api/edges?${suffix}` : '/api/edges';
  }, [params.from, params.to, nodeIdsKey]);

  const keyPayload = {
    from: serializeDate(params.from),
    to: serializeDate(params.to),
    nodeIds: nodeIdsKey,
  };

  return useQuery({
    queryKey: ['edges', keyPayload],
    queryFn: () => jsonFetch<ManifoldEdge[]>(query),
    enabled: params.enabled ?? true,
    keepPreviousData: true,
    ...options,
  });
};

