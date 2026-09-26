const express = require("express");

const cors = require("cors");

const authRoutes = require("./routes/auth.routes");

const customerRoutes = require("./routes/customer.routes");

const enquiryRoutes = require("./routes/enquiry.routes");

const productRoutes = require("./routes/product.routes");

const inventoryRoutes = require("./routes/inventory.routes");

const quotationRoutes = require("./routes/quotation.routes");

const salesOrderRoutes = require("./routes/salesOrder.routes");

const dispatchRoutes = require("./routes/dispatch.routes");

const { authenticateToken } = require("./middleware/auth.middleware");

const { authorizeRoles } = require("./middleware/role.middleware");

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ERP API is running",
  });
});

// ============================================================
// AUTH ROUTES
// ============================================================

app.use("/api/auth", authRoutes);

// ============================================================
// CUSTOMER ROUTES
// ============================================================

app.use("/api/customers", customerRoutes);

// ============================================================
// ENQUIRY ROUTES
// ============================================================

app.use("/api/enquiries", enquiryRoutes);

// ============================================================
// PRODUCT ROUTES
// ============================================================

app.use("/api/products", productRoutes);

// ============================================================
// INVENTORY ROUTES
// ============================================================

app.use("/api/inventory", inventoryRoutes);

// ============================================================
// QUOTATION ROUTES
// ============================================================

app.use("/api/quotations", quotationRoutes);

// ============================================================
// SALES ORDER ROUTES
// ============================================================

app.use("/api/sales-orders", salesOrderRoutes);

// ============================================================
// DISPATCH ROUTES
// ============================================================

app.use("/api/dispatches", dispatchRoutes);

// ============================================================
// PROTECTED AUTHENTICATION TEST
// ============================================================

app.get("/api/auth/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: req.user,
  });
});

// ============================================================
// ADMIN-ONLY TEST ROUTE
// ============================================================

app.get(
  "/api/admin/test",
  authenticateToken,
  authorizeRoles("ADMIN"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin authorization successful",
      user: req.user,
    });
  }
);

module.exports = app;