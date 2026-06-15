const express = require("express");
const financeController = require("../controllers/financeController");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(protect); // Protect all finance routes

// Currencies
router.get("/currencies", financeController.getAvailableCurrencies);

// Expenses
router.post(
  "/expenses",
  restrictTo("Admin", "Financial Manager"),
  financeController.addExpense,
);
router.get("/expenses/:projectId", financeController.getProjectExpenses);

// Funding Source Lookup (Global Catalog)
router.get("/funding-sources", financeController.getAllFundingSources);
router.post(
  "/funding-sources",
  restrictTo("Admin", "Financial Manager"),
  financeController.createFundingSourceLookup,
);

// Project Funding Sources (Allocations)
router.post(
  "/allocations",
  restrictTo("Admin", "Financial Manager"),
  financeController.allocateFunding,
);
router.get("/allocations/:projectId", financeController.getProjectFunding);

// Funding Transactions (Payments/Drawdowns)
router.post(
  "/transactions",
  restrictTo("Admin", "Financial Manager"),
  financeController.addFundingTransaction,
);
router.get("/transactions/:sourceId", financeController.getFundingTransactions);

module.exports = router;
