const express = require('express');
const sectorController = require('../controllers/sectorController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // All sector routes require authentication

router
  .route('/')
  .get(sectorController.getAllSectors)
  .post(restrictTo('Admin'), sectorController.createSector);

router
  .route('/:id')
  .get(sectorController.getSector)
  .patch(restrictTo('Admin'), sectorController.updateSector)
  .delete(restrictTo('Admin'), sectorController.deleteSector);

module.exports = router;
