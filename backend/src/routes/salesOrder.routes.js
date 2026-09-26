const express = require("express");

const {
  convertQuotationToSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
} = require("../controllers/salesOrder.controller");

const {
  authenticateToken,
} = require("../middleware/auth.middleware");

const {
  authorizeRoles,
} = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// GET ALL SALES ORDERS
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getSalesOrders
);

// ============================================================
// GET SALES ORDER BY ID
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getSalesOrderById
);

// ============================================================
// CONVERT QUOTATION TO SALES ORDER
// ADMIN + SALES_USER
// ============================================================

router.post(
  "/from-quotation/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  convertQuotationToSalesOrder
);

// ============================================================
// UPDATE SALES ORDER STATUS
// ADMIN ONLY
// ============================================================

router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("ADMIN"),
  updateSalesOrderStatus
);

module.exports = router;