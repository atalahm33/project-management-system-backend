const express = require('express');
const companyController = require('../controllers/companyController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

router
  .route('/')
  .get(companyController.getAllCompanies)
  .post(authMiddleware.restrictTo('admin', 'manager'), companyController.createCompany);

router
  .route('/:id')
  .get(companyController.getCompany)
  .patch(authMiddleware.restrictTo('admin', 'manager'), companyController.updateCompany)
  .delete(authMiddleware.restrictTo('admin'), companyController.deleteCompany);

module.exports = router;
