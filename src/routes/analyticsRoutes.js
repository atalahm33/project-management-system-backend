const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', analyticsController.getDashboardSummary);
router.get('/funding-stats', analyticsController.getFundingSourcesStats);
router.get('/budget', analyticsController.getBudgetAnalytics);

module.exports = router;
