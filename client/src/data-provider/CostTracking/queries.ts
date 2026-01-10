import { useQuery, QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import { QueryKeys, request } from 'librechat-data-provider';

export interface CostSummary {
  totalCost: number;
  totalTransactions: number;
  uniqueAgents: number;
  uniqueUsers: number;
  last7Days: {
    totalCost: number;
    totalTransactions: number;
  };
  last30Days: {
    totalCost: number;
    totalTransactions: number;
  };
}

export interface CostByAgent {
  agent_id: string;
  agent_name?: string;
  totalCost: number;
  totalTransactions: number;
  totalInputTokens: number;
  avgCostPerTransaction: number;
  models: string[];
  providers: string[];
}

export interface CostByPeriod {
  period: string;
  totalCost: number;
  totalTransactions: number;
  totalInputTokens: number;
  agentCount: number;
  modelCount: number;
}

export interface CostByAgentAndPeriod {
  agent_id: string;
  period: string;
  totalCost: number;
  totalTransactions: number;
  totalInputTokens: number;
}

const getCostSummary = async (params?: { startDate?: string; endDate?: string }): Promise<CostSummary> => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  const queryString = queryParams.toString();
  const url = `/api/cost-tracking/summary${queryString ? `?${queryString}` : ''}`;
  return request.get(url);
};

const getCostByAgent = async (params?: {
  agentId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CostByAgent[]> => {
  const queryParams = new URLSearchParams();
  if (params?.agentId) {
    queryParams.append('agentId', params.agentId);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  const queryString = queryParams.toString();
  const url = `/api/cost-tracking/by-agent${queryString ? `?${queryString}` : ''}`;
  return request.get(url);
};

const getCostByPeriod = async (params?: {
  period?: 'day' | 'week' | 'month';
  agentId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CostByPeriod[]> => {
  const queryParams = new URLSearchParams();
  if (params?.period) {
    queryParams.append('period', params.period);
  }
  if (params?.agentId) {
    queryParams.append('agentId', params.agentId);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  const queryString = queryParams.toString();
  const url = `/api/cost-tracking/by-period${queryString ? `?${queryString}` : ''}`;
  return request.get(url);
};

const getCostByAgentAndPeriod = async (params?: {
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}): Promise<CostByAgentAndPeriod[]> => {
  const queryParams = new URLSearchParams();
  if (params?.period) {
    queryParams.append('period', params.period);
  }
  if (params?.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params?.endDate) {
    queryParams.append('endDate', params.endDate);
  }
  const queryString = queryParams.toString();
  const url = `/api/cost-tracking/by-agent-and-period${queryString ? `?${queryString}` : ''}`;
  return request.get(url);
};

export const useCostSummaryQuery = (
  params?: { startDate?: string; endDate?: string },
  config?: UseQueryOptions<CostSummary>,
): QueryObserverResult<CostSummary> => {
  return useQuery<CostSummary>(
    [QueryKeys.user, 'cost-tracking', 'summary', params],
    () => getCostSummary(params),
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCostByAgentQuery = (
  params?: { agentId?: string; startDate?: string; endDate?: string },
  config?: UseQueryOptions<CostByAgent[]>,
): QueryObserverResult<CostByAgent[]> => {
  return useQuery<CostByAgent[]>(
    [QueryKeys.user, 'cost-tracking', 'by-agent', params],
    () => getCostByAgent(params),
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCostByPeriodQuery = (
  params?: { period?: 'day' | 'week' | 'month'; agentId?: string; startDate?: string; endDate?: string },
  config?: UseQueryOptions<CostByPeriod[]>,
): QueryObserverResult<CostByPeriod[]> => {
  return useQuery<CostByPeriod[]>(
    [QueryKeys.user, 'cost-tracking', 'by-period', params],
    () => getCostByPeriod(params),
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCostByAgentAndPeriodQuery = (
  params?: { period?: 'day' | 'week' | 'month'; startDate?: string; endDate?: string },
  config?: UseQueryOptions<CostByAgentAndPeriod[]>,
): QueryObserverResult<CostByAgentAndPeriod[]> => {
  return useQuery<CostByAgentAndPeriod[]>(
    [QueryKeys.user, 'cost-tracking', 'by-agent-and-period', params],
    () => getCostByAgentAndPeriod(params),
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};
