const express = require("express");

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
} = require("../controllers/quotation.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// CREATE QUOTATION
// ADMIN + SALES_USER
// ============================================================

router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  createQuotation
);

// ============================================================
// GET ALL QUOTATIONS
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getQuotations
);

// ============================================================
// GET QUOTATION BY ID
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getQuotationById
);

// ============================================================
// UPDATE QUOTATION STATUS
// ADMIN + SALES_USER
// ============================================================

router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  updateQuotationStatus
);

module.exports = router;