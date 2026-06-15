const express = require("express");
const submissionController = require("../controllers/submissionController");
const authController = require("../middlewares/authMiddleware"); // Use existing auth middleware structure

const router = express.Router();

router.use(authController.protect);

// My Submissions - Users can see their own submissions (pending or needs_changes)
router.get("/my-submissions", submissionController.getMySubmissions);

// Reviewer Routes - Should come before generic /:type routes to avoid conflicts
router.get(
  "/pending",
  authController.restrictTo("Admin", "Reviewer"),
  submissionController.getPendingSubmissions,
);

router.post(
  "/:type/:id/review",
  authController.restrictTo("Admin", "Reviewer"),
  submissionController.reviewSubmission,
);

// Financial Manager Routes
["contract", "expense", "funding", "transaction"].forEach((type) => {
  router.post(
    `/${type}`,
    authController.restrictTo("Admin", "Financial Manager"),
    (req, res, next) => {
      req.params.type = type;
      next();
    },
    submissionController.createSubmission,
  );

  router.patch(
    `/${type}/:id`,
    authController.restrictTo("Admin", "Financial Manager"),
    (req, res, next) => {
      req.params.type = type;
      next();
    },
    submissionController.updateSubmission,
  );
});

// Engineering Manager Routes
router.post(
  "/progress",
  authController.restrictTo("Admin", "Engineering Manager"),
  (req, res, next) => {
    req.params.type = "progress";
    next();
  },
  submissionController.createSubmission,
);

router.patch(
  "/progress/:id",
  authController.restrictTo("Admin", "Engineering Manager"),
  (req, res, next) => {
    req.params.type = "progress";
    next();
  },
  submissionController.updateSubmission,
);

module.exports = router;
