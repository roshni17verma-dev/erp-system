const express = require("express");

const {
  getProducts,
  getProductById,
} = require("../controllers/product.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// GET ALL PRODUCTS
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getProducts
);

// ============================================================
// GET PRODUCT BY ID
// ============================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getProductById
);

module.exports = router;