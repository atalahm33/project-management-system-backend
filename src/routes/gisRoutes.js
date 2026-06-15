const express = require('express');
const gisController = require('../controllers/gisController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/projects', gisController.getProjectsOnMap);

module.exports = router;
