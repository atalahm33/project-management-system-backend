const express = require("express");
const contractController = require("../controllers/contractController");
const { uploadContractImages } = require("../middlewares/uploadMiddleware");

const router = express.Router();

const { protect, restrictTo } = require("../middlewares/authMiddleware");

router
  .route("/")
  .get(contractController.getAllContracts)
  .post(
    protect,
    restrictTo("Admin", "Financial Manager"),
    uploadContractImages,
    contractController.createContract,
  );

router
  .route("/:id")
  .get(contractController.getContract)
  .patch(
    protect,
    restrictTo("Admin", "Financial Manager"),
    uploadContractImages,
    contractController.updateContract,
  );

// Add supplementary contract route
router
  .route("/:id/supplementary")
  .post(
    protect,
    restrictTo("Admin", "Financial Manager"),
    uploadContractImages,
    contractController.createSupplementaryContract,
  );

// Contract hierarchy tree route
router.route("/tree").get(protect, contractController.getContractTree);

module.exports = router;
