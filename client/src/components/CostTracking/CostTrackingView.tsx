import { useState, useMemo } from 'react';
import { useCostSummaryQuery, useCostByAgentQuery, useCostByPeriodQuery } from '~/data-provider/CostTracking/queries';
import { useAuthContext } from '~/hooks';
import { SystemRoles } from 'librechat-data-provider';
import DashBreadcrumb from '~/routes/Layouts/DashBreadcrumb';

export default function CostTrackingView() {
  const { user } = useAuthContext();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const isAdmin = user?.role === SystemRoles.ADMIN;

  const summaryQuery = useCostSummaryQuery(dateRange);
  const agentsQuery = useCostByAgentQuery({ ...dateRange, agentId: agentFilter || undefined });
  const periodQuery = useCostByPeriodQuery({
    period,
    ...dateRange,
    agentId: agentFilter || undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-surface-primary p-0 lg:p-2">
      <DashBreadcrumb />
      <div className="flex w-full flex-grow flex-col overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-token-text-primary">API Cost Tracker</h1>
          <p className="mt-2 text-sm text-token-text-secondary">
            Track and analyze API costs by bot, time period, and model usage
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-border-light bg-surface-secondary p-4">
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-token-text-primary">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="rounded border border-border-light bg-surface-primary px-3 py-2 text-token-text-primary"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-token-text-primary">Start Date</label>
            <input
              type="date"
              value={dateRange.start || ''}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded border border-border-light bg-surface-primary px-3 py-2 text-token-text-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-token-text-primary">End Date</label>
            <input
              type="date"
              value={dateRange.end || ''}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded border border-border-light bg-surface-primary px-3 py-2 text-token-text-primary"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-token-text-primary">Filter by Agent</label>
            <input
              type="text"
              placeholder="Agent ID (optional)"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="rounded border border-border-light bg-surface-primary px-3 py-2 text-token-text-primary"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({});
                setAgentFilter('');
              }}
              className="rounded border border-border-light bg-surface-primary px-4 py-2 text-token-text-primary hover:bg-surface-tertiary"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summaryQuery.data && (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
              <div className="text-sm font-medium text-token-text-secondary">Total Cost</div>
              <div className="mt-1 text-2xl font-bold text-token-text-primary">
                {formatCurrency(summaryQuery.data.totalCost)}
              </div>
              <div className="mt-2 text-xs text-token-text-tertiary">
                {formatNumber(summaryQuery.data.totalTransactions)} transactions
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
              <div className="text-sm font-medium text-token-text-secondary">Last 7 Days</div>
              <div className="mt-1 text-2xl font-bold text-token-text-primary">
                {formatCurrency(summaryQuery.data.last7Days.totalCost)}
              </div>
              <div className="mt-2 text-xs text-token-text-tertiary">
                {formatNumber(summaryQuery.data.last7Days.totalTransactions)} transactions
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
              <div className="text-sm font-medium text-token-text-secondary">Last 30 Days</div>
              <div className="mt-1 text-2xl font-bold text-token-text-primary">
                {formatCurrency(summaryQuery.data.last30Days.totalCost)}
              </div>
              <div className="mt-2 text-xs text-token-text-tertiary">
                {formatNumber(summaryQuery.data.last30Days.totalTransactions)} transactions
              </div>
            </div>
            <div className="rounded-lg border border-border-light bg-surface-secondary p-4">
              <div className="text-sm font-medium text-token-text-secondary">Active Agents</div>
              <div className="mt-1 text-2xl font-bold text-token-text-primary">
                {summaryQuery.data.uniqueAgents}
              </div>
              <div className="mt-2 text-xs text-token-text-tertiary">
                {summaryQuery.data.uniqueUsers} users
              </div>
            </div>
          </div>
        )}

        {/* Loading States */}
        {(summaryQuery.isLoading || agentsQuery.isLoading || periodQuery.isLoading) && (
          <div className="mb-4 text-center text-token-text-secondary">Loading cost data...</div>
        )}

        {/* Error States */}
        {(summaryQuery.isError || agentsQuery.isError || periodQuery.isError) && (
          <div className="mb-4 rounded-lg border border-red-500 bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            Error loading cost data. Please check your admin permissions and try again.
          </div>
        )}

        {/* Cost by Agent Table */}
        {agentsQuery.data && agentsQuery.data.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-xl font-semibold text-token-text-primary">Cost by Agent</h2>
            <div className="overflow-x-auto rounded-lg border border-border-light">
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-token-text-primary">Agent ID</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">Total Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">
                      Transactions
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">Tokens</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">
                      Avg Cost/Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-token-text-primary">Models</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {agentsQuery.data.map((agent) => (
                    <tr key={agent.agent_id} className="hover:bg-surface-secondary">
                      <td className="px-4 py-3 text-sm text-token-text-primary">{agent.agent_id}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">
                        {formatCurrency(agent.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {formatNumber(agent.totalTransactions)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {formatNumber(agent.totalInputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {formatCurrency(agent.avgCostPerTransaction)}
                      </td>
                      <td className="px-4 py-3 text-sm text-token-text-secondary">
                        {agent.models.slice(0, 3).join(', ')}
                        {agent.models.length > 3 && ` +${agent.models.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cost Over Time */}
        {periodQuery.data && periodQuery.data.length > 0 && (
          <div>
            <h2 className="mb-3 text-xl font-semibold text-token-text-primary">Cost Over Time</h2>
            <div className="overflow-x-auto rounded-lg border border-border-light">
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-token-text-primary">Period</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">Total Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">
                      Transactions
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">Tokens</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">Agents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {periodQuery.data.map((item) => (
                    <tr key={item.period} className="hover:bg-surface-secondary">
                      <td className="px-4 py-3 text-sm text-token-text-primary">{item.period}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-token-text-primary">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {formatNumber(item.totalTransactions)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {formatNumber(item.totalInputTokens)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-token-text-secondary">
                        {item.agentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!summaryQuery.isLoading &&
          !agentsQuery.isLoading &&
          !periodQuery.isLoading &&
          agentsQuery.data &&
          agentsQuery.data.length === 0 && (
            <div className="rounded-lg border border-border-light bg-surface-secondary p-8 text-center">
              <p className="text-token-text-secondary">No cost data found for the selected filters.</p>
              <p className="mt-2 text-sm text-token-text-tertiary">
                Try adjusting your date range or filters, or make some API calls to generate cost data.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
