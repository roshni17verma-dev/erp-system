const express = require("express");

const {
  getInventory,
  getInventoryByProductId,
  updateInventory,
} = require("../controllers/inventory.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// GET ALL INVENTORY
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getInventory
);

// ============================================================
// GET INVENTORY BY PRODUCT
// ADMIN + SALES_USER
// ============================================================

router.get(
  "/:productId",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getInventoryByProductId
);

// ============================================================
// UPDATE INVENTORY
// ADMIN ONLY
// ============================================================

router.patch(
  "/:productId",
  authenticateToken,
  authorizeRoles("ADMIN"),
  updateInventory
);

module.exports = router;