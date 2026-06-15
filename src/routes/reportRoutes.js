const express = require('express');
const reportController = require('../controllers/reportController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('Admin', 'Official', 'Viewer', 'Reviewer','Financial Manager','Engineering Manager')); // Adjust as needed

// Excel Exports
router.get('/excel/projects', reportController.exportProjectsExcel);

// PDF Exports
router.get('/pdf/project/:projectId', reportController.exportProjectPDF);
router.get('/pdf/company/:companyId', reportController.exportCompanyPDF);

module.exports = router;
