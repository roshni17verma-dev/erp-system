const express = require("express");

const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
} = require("../controllers/enquiry.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

const router = express.Router();

// ============================================================
// CREATE ENQUIRY
// ============================================================

router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  createEnquiry
);

// ============================================================
// GET ALL ENQUIRIES
// ============================================================

router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getEnquiries
);

// ============================================================
// GET ENQUIRY BY ID
// ============================================================

router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "SALES_USER"),
  getEnquiryById
);

module.exports = router;