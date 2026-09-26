const express = require("express");

const {
  createDispatchController,
  getDispatchesController,
  getDispatchByIdController,
} = require("../controllers/dispatch.controller");

const {
  authenticateToken,
} = require("../middleware/auth.middleware");

const {
  authorizeRoles,
} = require("../middleware/role.middleware");

const {
  validateCreateDispatch,
  validateSalesOrderId,
  validateDispatchId,
} = require("../validators/dispatch.validator");

const router = express.Router();

// ============================================================
// GET ALL DISPATCHES
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/",
  authenticateToken,
  getDispatchesController
);

// ============================================================
// GET DISPATCH BY ID
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/:id",
  authenticateToken,
  validateDispatchId,
  getDispatchByIdController
);

// ============================================================
// CREATE DISPATCH FOR SALES ORDER
// ADMIN ONLY
// ============================================================

router.post(
  "/sales-orders/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  validateSalesOrderId,
  validateCreateDispatch,
  createDispatchController
);

module.exports = router;