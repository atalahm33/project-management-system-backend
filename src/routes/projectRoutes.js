const express = require('express');
const projectController = require('../controllers/projectController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect); // Protect all project routes

// ─── Self-Review Routes ───────────────────────────────────────────────────────
// Get my own pending projects (awaiting self-review)
router.get('/my-pending', projectController.getMyPendingProjects);

// Approve a project (creator or Admin only — enforced in controller)
router.patch('/:id/approve', projectController.approveProject);

// ─── Standard CRUD ───────────────────────────────────────────────────────────
router
  .route('/')
  .get(projectController.getAllProjects)
  .post(restrictTo('Admin', 'Official', 'Reviewer'), projectController.createProject);

router
  .route('/:id')
  .get(projectController.getProject)
  .patch(restrictTo('Admin', 'Official', 'Reviewer'), projectController.updateProject)
  .delete(restrictTo('Admin'), projectController.deleteProject);

module.exports = router;
