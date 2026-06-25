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

const { uploadContractImages } = require("../middlewares/uploadMiddleware");

// Financial Manager Routes
["contract", "expense", "funding", "transaction"].forEach((type) => {
  router.post(
    `/${type}`,
    authController.restrictTo("Admin", "Financial Manager"),
    uploadContractImages,
    (req, res, next) => {
      req.params.type = type;
      next();
    },
    submissionController.createSubmission,
  );

  router.patch(
    `/${type}/:id`,
    authController.restrictTo("Admin", "Financial Manager"),
    uploadContractImages,
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

router.delete(
  "/:type/:id",
  authController.restrictTo("Admin", "Financial Manager", "Engineering Manager"),
  (req, res, next) => {
    // Validate types
    const allowed = ["contract", "expense", "funding", "transaction", "progress"];
    if (!allowed.includes(req.params.type)) {
      return res.status(400).json({ status: "fail", message: "Invalid submission type" });
    }
    next();
  },
  submissionController.deleteSubmission
);

module.exports = router;
