const salesOrderService = require("../services/salesOrder.service");

const {
  updateSalesOrderStatusSchema,
} = require("../validators/salesOrder.status.validator");

// ============================================================
// CONVERT QUOTATION TO SALES ORDER
// ============================================================

const convertQuotationToSalesOrder = async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const salesOrder =
      await salesOrderService.convertQuotationToSalesOrder(
        quotationId
      );

    return res.status(201).json({
      success: true,
      message: "Quotation converted to Sales Order successfully",
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      "Convert quotation to Sales Order error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ============================================================
// GET ALL SALES ORDERS
// ============================================================

const getSalesOrders = async (req, res) => {
  try {
    const salesOrders = await salesOrderService.getSalesOrders();

    return res.status(200).json({
      success: true,
      data: salesOrders,
    });
  } catch (error) {
    console.error("Get Sales Orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// GET SALES ORDER BY ID
// ============================================================

const getSalesOrderById = async (req, res) => {
  try {
    const salesOrderId = Number(req.params.id);

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Order ID",
      });
    }

    const salesOrder =
      await salesOrderService.getSalesOrderById(
        salesOrderId
      );

    return res.status(200).json({
      success: true,
      data: salesOrder,
    });
  } catch (error) {
    console.error("Get Sales Order error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ============================================================
// UPDATE SALES ORDER STATUS
// ============================================================

const updateSalesOrderStatus = async (req, res) => {
  try {
    const salesOrderId = Number(req.params.id);

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid Sales Order ID",
      });
    }

    const validationResult =
      updateSalesOrderStatusSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const salesOrder =
      await salesOrderService.updateSalesOrderStatus(
        salesOrderId,
        validationResult.data.status
      );

    return res.status(200).json({
      success: true,
      message: "Sales Order status updated successfully",
      data: salesOrder,
    });
  } catch (error) {
    console.error(
      "Update Sales Order status error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  convertQuotationToSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
};