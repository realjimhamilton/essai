const costTrackingService = require('~/server/services/CostTrackingService');
const checkAdmin = require('~/server/middleware/roles/admin');

/**
 * GET /api/cost-tracking/summary
 * Get overall cost summary
 */
async function getSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const summary = await costTrackingService.getCostSummary({ startDate, endDate });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/cost-tracking/by-agent
 * Get cost breakdown by agent/bot
 */
async function getByAgent(req, res) {
  try {
    const { agentId, startDate, endDate } = req.query;
    const results = await costTrackingService.getCostByAgent({ agentId, startDate, endDate });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/cost-tracking/by-period
 * Get cost breakdown by time period (day/week/month)
 */
async function getByPeriod(req, res) {
  try {
    const { period = 'day', agentId, startDate, endDate } = req.query;
    
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be: day, week, or month' });
    }
    
    const results = await costTrackingService.getCostByPeriod({ period, agentId, startDate, endDate });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/cost-tracking/by-agent-and-period
 * Get cost breakdown by agent and time period
 */
async function getByAgentAndPeriod(req, res) {
  try {
    const { period = 'day', startDate, endDate } = req.query;
    
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Must be: day, week, or month' });
    }
    
    const results = await costTrackingService.getCostByAgentAndPeriod({ period, startDate, endDate });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSummary,
  getByAgent,
  getByPeriod,
  getByAgentAndPeriod,
};
