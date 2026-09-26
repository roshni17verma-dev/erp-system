const express = require("express");

const {
  createCustomer,
  getCustomers,
  getCustomerById,
} = require("../controllers/customer.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// CUSTOMER ROUTES
// ============================================================

// SALES_USER can create customers
router.post(
  "/",
  authenticateToken,
  authorizeRoles("SALES_USER"),
  createCustomer
);

// Both ADMIN and SALES_USER can view customers
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getCustomers
);

// Both ADMIN and SALES_USER can view one customer
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getCustomerById
);

module.exports = router;