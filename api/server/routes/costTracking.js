const express = require('express');
const costTrackingController = require('~/server/controllers/costTracking');
const checkAdmin = require('~/server/middleware/roles/admin');
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');

const router = express.Router();

// All cost tracking routes require admin access
router.use(requireJwtAuth);
router.use(checkAdmin);

router.get('/summary', costTrackingController.getSummary);
router.get('/by-agent', costTrackingController.getByAgent);
router.get('/by-period', costTrackingController.getByPeriod);
router.get('/by-agent-and-period', costTrackingController.getByAgentAndPeriod);

module.exports = router;
