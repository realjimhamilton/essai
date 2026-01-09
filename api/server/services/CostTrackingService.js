const { logger } = require('@librechat/data-schemas');
const { Transaction } = require('~/db/models');

/**
 * Get cost summary by agent/bot
 * @param {Object} params
 * @param {string} [params.agentId] - Filter by specific agent ID
 * @param {Date} [params.startDate] - Start date for filtering
 * @param {Date} [params.endDate] - End date for filtering
 * @returns {Promise<Array>} Array of cost summaries grouped by agent
 */
async function getCostByAgent({ agentId, startDate, endDate } = {}) {
  try {
    const matchStage = {
      estimated_cost_usd: { $exists: true, $ne: null, $gt: 0 },
      agent_id: { $exists: true, $ne: null },
    };

    if (agentId) {
      matchStage.agent_id = agentId;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    const results = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$agent_id',
          totalCost: { $sum: '$estimated_cost_usd' },
          totalTransactions: { $sum: 1 },
          totalInputTokens: { $sum: { $abs: '$rawAmount' } },
          avgCostPerTransaction: { $avg: '$estimated_cost_usd' },
          models: { $addToSet: '$model' },
          providers: { $addToSet: '$provider' },
        },
      },
      { $sort: { totalCost: -1 } },
      {
        $project: {
          agent_id: '$_id',
          totalCost: { $round: ['$totalCost', 6] },
          totalTransactions: 1,
          totalInputTokens: 1,
          avgCostPerTransaction: { $round: ['$avgCostPerTransaction', 6] },
          models: 1,
          providers: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  } catch (error) {
    logger.error('[CostTrackingService] Error getting cost by agent', error);
    throw error;
  }
}

/**
 * Get cost breakdown by time period (day/week/month)
 * @param {Object} params
 * @param {string} params.period - 'day', 'week', or 'month'
 * @param {string} [params.agentId] - Filter by specific agent ID
 * @param {Date} [params.startDate] - Start date for filtering
 * @param {Date} [params.endDate] - End date for filtering
 * @returns {Promise<Array>} Array of cost summaries grouped by time period
 */
async function getCostByPeriod({ period, agentId, startDate, endDate } = {}) {
  try {
    const matchStage = {
      estimated_cost_usd: { $exists: true, $ne: null, $gt: 0 },
    };

    if (agentId) {
      matchStage.agent_id = agentId;
    }

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    // Group by date format based on period
    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        dateFormat = {
          $dateToString: {
            format: '%Y-W%V',
            date: '$createdAt',
          },
        };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const groupStage = {
      _id: dateFormat,
      totalCost: { $sum: '$estimated_cost_usd' },
      totalTransactions: { $sum: 1 },
      totalInputTokens: { $sum: { $abs: '$rawAmount' } },
      agents: agentId ? [] : { $addToSet: '$agent_id' },
      models: { $addToSet: '$model' },
    };

    if (!agentId) {
      groupStage.agents = { $addToSet: '$agent_id' };
    }

    const results = await Transaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } },
      {
        $project: {
          period: '$_id',
          totalCost: { $round: ['$totalCost', 6] },
          totalTransactions: 1,
          totalInputTokens: 1,
          agentCount: agentId ? 1 : { $size: '$agents' },
          modelCount: { $size: '$models' },
          _id: 0,
        },
      },
    ]);

    return results;
  } catch (error) {
    logger.error('[CostTrackingService] Error getting cost by period', error);
    throw error;
  }
}

/**
 * Get cost breakdown by agent and time period
 * @param {Object} params
 * @param {string} params.period - 'day', 'week', or 'month'
 * @param {Date} [params.startDate] - Start date for filtering
 * @param {Date} [params.endDate] - End date for filtering
 * @returns {Promise<Array>} Array of cost summaries grouped by agent and time period
 */
async function getCostByAgentAndPeriod({ period, startDate, endDate } = {}) {
  try {
    const matchStage = {
      estimated_cost_usd: { $exists: true, $ne: null, $gt: 0 },
      agent_id: { $exists: true, $ne: null },
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    let dateFormat;
    switch (period) {
      case 'day':
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        dateFormat = {
          $dateToString: {
            format: '%Y-W%V',
            date: '$createdAt',
          },
        };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const results = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            agent_id: '$agent_id',
            period: dateFormat,
          },
          totalCost: { $sum: '$estimated_cost_usd' },
          totalTransactions: { $sum: 1 },
          totalInputTokens: { $sum: { $abs: '$rawAmount' } },
        },
      },
      { $sort: { '_id.period': 1, totalCost: -1 } },
      {
        $project: {
          agent_id: '$_id.agent_id',
          period: '$_id.period',
          totalCost: { $round: ['$totalCost', 6] },
          totalTransactions: 1,
          totalInputTokens: 1,
          _id: 0,
        },
      },
    ]);

    return results;
  } catch (error) {
    logger.error('[CostTrackingService] Error getting cost by agent and period', error);
    throw error;
  }
}

/**
 * Get overall cost summary (total, last 7 days, last 30 days)
 * @param {Date} [params.startDate] - Start date for filtering
 * @param {Date} [params.endDate] - End date for filtering
 * @returns {Promise<Object>} Summary object with total cost and statistics
 */
async function getCostSummary({ startDate, endDate } = {}) {
  try {
    const matchStage = {
      estimated_cost_usd: { $exists: true, $ne: null, $gt: 0 },
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last7, last30] = await Promise.all([
      Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$estimated_cost_usd' },
            totalTransactions: { $sum: 1 },
            uniqueAgents: { $addToSet: '$agent_id' },
            uniqueUsers: { $addToSet: '$user' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...matchStage,
            createdAt: { $gte: last7Days },
          },
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$estimated_cost_usd' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            ...matchStage,
            createdAt: { $gte: last30Days },
          },
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$estimated_cost_usd' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalData = total[0] || { totalCost: 0, totalTransactions: 0, uniqueAgents: [], uniqueUsers: [] };
    const last7Data = last7[0] || { totalCost: 0, totalTransactions: 0 };
    const last30Data = last30[0] || { totalCost: 0, totalTransactions: 0 };

    return {
      totalCost: Math.round(totalData.totalCost * 1000000) / 1000000,
      totalTransactions: totalData.totalTransactions,
      uniqueAgents: totalData.uniqueAgents?.filter((id) => id)?.length || 0,
      uniqueUsers: totalData.uniqueUsers?.length || 0,
      last7Days: {
        totalCost: Math.round(last7Data.totalCost * 1000000) / 1000000,
        totalTransactions: last7Data.totalTransactions,
      },
      last30Days: {
        totalCost: Math.round(last30Data.totalCost * 1000000) / 1000000,
        totalTransactions: last30Data.totalTransactions,
      },
    };
  } catch (error) {
    logger.error('[CostTrackingService] Error getting cost summary', error);
    throw error;
  }
}

module.exports = {
  getCostByAgent,
  getCostByPeriod,
  getCostByAgentAndPeriod,
  getCostSummary,
};
