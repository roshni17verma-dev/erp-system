const { z } = require("zod");

// ============================================================
// CREATE DISPATCH VALIDATOR
// ============================================================

const createDispatchSchema = z.object({
  dispatchDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Dispatch date must be in YYYY-MM-DD format"
    ),

  vehicleNumber: z
    .string()
    .trim()
    .min(1, "Vehicle number is required")
    .max(50, "Vehicle number must not exceed 50 characters"),

  driverName: z
    .string()
    .trim()
    .min(1, "Driver name is required")
    .max(100, "Driver name must not exceed 100 characters"),

  items: z
    .array(
      z.object({
        productId: z
          .number({
            message: "Product ID must be a number",
          })
          .int("Product ID must be an integer")
          .positive("Product ID must be positive"),

        quantity: z
          .number({
            message: "Quantity must be a number",
          })
          .int("Quantity must be an integer")
          .positive("Quantity must be greater than 0"),
      })
    )
    .min(1, "At least one dispatch item is required"),
});

// ============================================================
// VALIDATE CREATE DISPATCH
// ============================================================

const validateCreateDispatch = (req, res, next) => {
  const result = createDispatchSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  req.body = result.data;

  next();
};

// ============================================================
// VALIDATE SALES ORDER ID
// ============================================================

const validateSalesOrderId = (req, res, next) => {
  const salesOrderId = Number(req.params.id);

  if (
    !Number.isInteger(salesOrderId) ||
    salesOrderId <= 0
  ) {
    return res.status(400).json({
      message: "Sales Order ID must be a positive integer",
    });
  }

  req.params.id = salesOrderId;

  next();
};

// ============================================================
// VALIDATE DISPATCH ID
// ============================================================

const validateDispatchId = (req, res, next) => {
  const dispatchId = Number(req.params.id);

  if (
    !Number.isInteger(dispatchId) ||
    dispatchId <= 0
  ) {
    return res.status(400).json({
      message: "Dispatch ID must be a positive integer",
    });
  }

  req.params.id = dispatchId;

  next();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createDispatchSchema,
  validateCreateDispatch,
  validateSalesOrderId,
  validateDispatchId,
};