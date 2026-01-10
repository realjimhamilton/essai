const { logger } = require('@librechat/data-schemas');
const { parseEphemeralAgentId } = require('librechat-data-provider');
const { Transaction, Agent } = require('~/db/models');

/**
 * Resolve agent IDs from agent ID or name filter
 * @param {string} agentFilter - Agent ID or name to search for
 * @returns {Promise<string[]>} Array of matching agent IDs
 */
async function resolveAgentIds(agentFilter) {
  if (!agentFilter) {
    return null;
  }

  const filter = agentFilter.trim();
  const agents = await Agent.find({
    $or: [{ id: filter }, { name: { $regex: filter, $options: 'i' } }],
  })
    .select('id')
    .lean();

  const matchingAgentIds = agents.map((a) => a.id);
  return matchingAgentIds.length > 0 ? matchingAgentIds : null;
}

/**
 * Get cost summary by agent/bot
 * @param {Object} params
 * @param {string} [params.agentId] - Filter by specific agent ID or name
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
      const matchingAgentIds = await resolveAgentIds(agentId);
      if (matchingAgentIds) {
        matchStage.agent_id = { $in: matchingAgentIds };
      } else {
        // If no agents found by name, still try exact match on agent_id
        // This handles cases where agent might not exist in Agent collection
        matchStage.agent_id = agentId.trim();
      }
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

    // Fetch agent names for each agent_id
    const agentIds = results.map((r) => r.agent_id).filter(Boolean);
    const realAgentIds = agentIds.filter((id) => id && id.startsWith('agent_'));
    const ephemeralAgentIds = agentIds.filter((id) => id && !id.startsWith('agent_'));
    
    // Fetch real agents from database
    const agents = realAgentIds.length > 0
      ? await Agent.find({ id: { $in: realAgentIds } }).select('id name').lean()
      : [];
    const agentMap = new Map(agents.map((a) => [a.id, a.name || a.id]));

    // For ephemeral agents, look up conversations to find the real agent_id
    if (ephemeralAgentIds.length > 0) {
      const { Conversation } = require('~/db/models');
      try {
        logger.info(`[CostTrackingService] Looking up ephemeral agent IDs: ${ephemeralAgentIds.join(', ')}`);
        console.log(`[CostTrackingService] Looking up ephemeral agent IDs: ${ephemeralAgentIds.join(', ')}`);
        
        // Get unique conversationIds from transactions with these ephemeral agent_ids
        const transactionConversations = await Transaction.aggregate([
          {
            $match: {
              agent_id: { $in: ephemeralAgentIds },
              conversationId: { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: { agent_id: '$agent_id', conversationId: '$conversationId' },
            },
          },
          {
            $project: {
              agent_id: '$_id.agent_id',
              conversationId: '$_id.conversationId',
              _id: 0,
            },
          },
        ]);
        
        logger.info(`[CostTrackingService] Found ${transactionConversations.length} transaction-conversation pairs`);
        console.log(`[CostTrackingService] Found ${transactionConversations.length} transaction-conversation pairs`);
        
        const conversationIds = [...new Set(transactionConversations.map((t) => t.conversationId).filter(Boolean))];
        
        if (conversationIds.length > 0) {
          // Strategy 1: Check conversations for real agent_ids
          const allConversations = await Conversation.find({
            conversationId: { $in: conversationIds },
            agent_id: { $exists: true, $ne: null },
          })
            .select('conversationId agent_id')
            .lean();
          
          logger.info(`[CostTrackingService] Found ${allConversations.length} conversations, checking for real agent IDs...`);
          console.log(`[CostTrackingService] Found ${allConversations.length} conversations, checking for real agent IDs...`);
          
          // Create a map from conversationId to agent_id (prefer real agent_ids)
          const convoToAgentMap = new Map();
          allConversations.forEach((c) => {
            // Only use real agent_ids (starting with agent_)
            if (c.agent_id && c.agent_id.startsWith('agent_')) {
              convoToAgentMap.set(c.conversationId, c.agent_id);
            }
          });
          
          logger.info(`[CostTrackingService] Found ${convoToAgentMap.size} conversations with real agent IDs`);
          console.log(`[CostTrackingService] Found ${convoToAgentMap.size} conversations with real agent IDs`);
          
          // Strategy 2: Also check other transactions with the same conversationIds for real agent_ids
          // This handles cases where the conversation might not have been updated but later transactions have real agent_ids
          const otherTransactions = await Transaction.aggregate([
            {
              $match: {
                conversationId: { $in: conversationIds },
                agent_id: { $exists: true, $ne: null, $regex: /^agent_/ },
              },
            },
            {
              $group: {
                _id: '$conversationId',
                agent_id: { $first: '$agent_id' }, // Take the first real agent_id for each conversation
              },
            },
          ]);
          
          logger.info(`[CostTrackingService] Found ${otherTransactions.length} other transactions with real agent IDs`);
          console.log(`[CostTrackingService] Found ${otherTransactions.length} other transactions with real agent IDs`);
          
          // Update convoToAgentMap with real agent_ids from other transactions
          otherTransactions.forEach((tx) => {
            if (tx._id && tx.agent_id && !convoToAgentMap.has(tx._id)) {
              convoToAgentMap.set(tx._id, tx.agent_id);
              logger.info(`[CostTrackingService] Added real agent_id ${tx.agent_id} for conversation ${tx._id} from transactions`);
            }
          });
          
          // Map ephemeral agent_ids to real agent_ids via conversations
          const ephemeralToRealMap = new Map();
          transactionConversations.forEach((tx) => {
            if (tx.conversationId && convoToAgentMap.has(tx.conversationId)) {
              const realAgentId = convoToAgentMap.get(tx.conversationId);
              if (realAgentId && realAgentId.startsWith('agent_')) {
                ephemeralToRealMap.set(tx.agent_id, realAgentId);
                logger.info(`[CostTrackingService] Mapped ephemeral ${tx.agent_id} -> real ${realAgentId} via conversation ${tx.conversationId}`);
                console.log(`[CostTrackingService] Mapped ephemeral ${tx.agent_id} -> real ${realAgentId} via conversation ${tx.conversationId}`);
              }
            }
          });
          
          // Fetch agent names for the real agent_ids we found
          const realIdsFromEphemeral = [...new Set(ephemeralToRealMap.values())];
          if (realIdsFromEphemeral.length > 0) {
            logger.info(`[CostTrackingService] Fetching names for real agent IDs: ${realIdsFromEphemeral.join(', ')}`);
            const additionalAgents = await Agent.find({ id: { $in: realIdsFromEphemeral } })
              .select('id name')
              .lean();
            logger.info(`[CostTrackingService] Found ${additionalAgents.length} agents:`, JSON.stringify(additionalAgents.map(a => `${a.id}: ${a.name}`)));
            console.log(`[CostTrackingService] Found ${additionalAgents.length} agents:`, additionalAgents.map(a => `${a.id}: ${a.name}`));
            additionalAgents.forEach((a) => {
              // Map ephemeral IDs to real agent names
              ephemeralToRealMap.forEach((realId, ephemeralId) => {
                if (realId === a.id) {
                  agentMap.set(ephemeralId, a.name || a.id);
                  logger.info(`[CostTrackingService] Set agent name for ${ephemeralId}: ${a.name || a.id}`);
                  console.log(`[CostTrackingService] Set agent name for ${ephemeralId}: ${a.name || a.id}`);
                }
              });
            });
          } else {
            logger.info('[CostTrackingService] No real agent IDs found from ephemeral mappings');
          }
          
          // Strategy 3: Fallback - try to match agents by model name if we still haven't found matches
          // Parse the ephemeral ID to get endpoint and model, then look for agents using that model
          if (ephemeralToRealMap.size === 0) {
            logger.info('[CostTrackingService] Attempting fallback: matching agents by model name');
            console.log('[CostTrackingService] Attempting fallback: matching agents by model name');
            
            for (const ephemeralId of ephemeralAgentIds) {
              try {
                // Parse ephemeral ID to extract model
                const parsed = parseEphemeralAgentId(ephemeralId);
                if (parsed && parsed.model) {
                  // Look for agents that use this model in their latest version
                  const matchingAgents = await Agent.find({
                    'versions.model': parsed.model,
                  })
                    .select('id name versions.model')
                    .lean();
                  
                  if (matchingAgents.length > 0) {
                    // Use the first matching agent (or we could pick the most recent one)
                    // Filter to only agents that actually have this model in their latest version
                    const agentsWithModel = matchingAgents.filter((agent) => {
                      if (!agent.versions || agent.versions.length === 0) return false;
                      const latestVersion = agent.versions[agent.versions.length - 1];
                      return latestVersion.model === parsed.model;
                    });
                    
                    if (agentsWithModel.length > 0) {
                      const matchedAgent = agentsWithModel[0];
                      agentMap.set(ephemeralId, matchedAgent.name || matchedAgent.id);
                      logger.info(`[CostTrackingService] Matched ephemeral ${ephemeralId} to agent ${matchedAgent.id} (${matchedAgent.name}) by model ${parsed.model}`);
                      console.log(`[CostTrackingService] Matched ephemeral ${ephemeralId} to agent ${matchedAgent.id} (${matchedAgent.name}) by model ${parsed.model}`);
                    }
                  }
                }
              } catch (error) {
                logger.debug(`[CostTrackingService] Error parsing ephemeral ID ${ephemeralId}:`, error);
              }
            }
          }
        } else {
          logger.info('[CostTrackingService] No conversation IDs found for ephemeral agents');
          
          // Even if no conversations found, try the model matching fallback
          logger.info('[CostTrackingService] Attempting fallback: matching agents by model name');
          console.log('[CostTrackingService] Attempting fallback: matching agents by model name');
          
          for (const ephemeralId of ephemeralAgentIds) {
            try {
              const parsed = parseEphemeralAgentId(ephemeralId);
              if (parsed && parsed.model) {
                const matchingAgents = await Agent.find({
                  'versions.model': parsed.model,
                })
                  .select('id name versions.model')
                  .lean();
                
                if (matchingAgents.length > 0) {
                  const agentsWithModel = matchingAgents.filter((agent) => {
                    if (!agent.versions || agent.versions.length === 0) return false;
                    const latestVersion = agent.versions[agent.versions.length - 1];
                    return latestVersion.model === parsed.model;
                  });
                  
                  if (agentsWithModel.length > 0) {
                    const matchedAgent = agentsWithModel[0];
                    agentMap.set(ephemeralId, matchedAgent.name || matchedAgent.id);
                    logger.info(`[CostTrackingService] Matched ephemeral ${ephemeralId} to agent ${matchedAgent.id} (${matchedAgent.name}) by model ${parsed.model}`);
                    console.log(`[CostTrackingService] Matched ephemeral ${ephemeralId} to agent ${matchedAgent.id} (${matchedAgent.name}) by model ${parsed.model}`);
                  }
                }
              }
            } catch (error) {
              logger.debug(`[CostTrackingService] Error parsing ephemeral ID ${ephemeralId}:`, error);
            }
          }
        }
      } catch (error) {
        logger.error('[CostTrackingService] Error looking up ephemeral agent names', error);
      }
    }

    // Add agent_name to each result
    logger.info(`[CostTrackingService] Agent map has ${agentMap.size} entries:`, JSON.stringify(Array.from(agentMap.entries()).map(([k, v]) => `${k}: ${v}`)));
    console.log(`[CostTrackingService] Agent map has ${agentMap.size} entries:`, Array.from(agentMap.entries()).map(([k, v]) => `${k}: ${v}`));
    const resultsWithNames = results.map((result) => {
      const agentName = agentMap.get(result.agent_id) || result.agent_id;
      logger.info(`[CostTrackingService] Mapping agent_id ${result.agent_id} to name: ${agentName}`);
      console.log(`[CostTrackingService] Mapping agent_id ${result.agent_id} to name: ${agentName}`);
      return {
        ...result,
        agent_name: agentName,
      };
    });

    logger.info(`[CostTrackingService] Returning ${resultsWithNames.length} results with names (filtered from ${results.length} total)`);
    return resultsWithNames;
  } catch (error) {
    logger.error('[CostTrackingService] Error getting cost by agent', error);
    throw error;
  }
}

/**
 * Get cost breakdown by time period (day/week/month)
 * @param {Object} params
 * @param {string} params.period - 'day', 'week', or 'month'
 * @param {string} [params.agentId] - Filter by specific agent ID or name
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
      const matchingAgentIds = await resolveAgentIds(agentId);
      if (matchingAgentIds) {
        matchStage.agent_id = { $in: matchingAgentIds };
      } else {
        // If no agents found by name, still try exact match on agent_id
        matchStage.agent_id = agentId.trim();
      }
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
