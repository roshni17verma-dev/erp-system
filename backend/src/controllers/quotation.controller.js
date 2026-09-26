const quotationService = require("../services/quotation.service");

const {
  createQuotationSchema,
} = require("../validators/quotation.validator");

const {
  updateQuotationStatusSchema,
} = require("../validators/quotation.status.validator");

// ============================================================
// CREATE QUOTATION
// ============================================================

const createQuotation = async (req, res) => {
  try {
    const validationResult = createQuotationSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const quotation = await quotationService.createQuotation(
      validationResult.data
    );

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Create quotation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ============================================================
// GET ALL QUOTATIONS
// ============================================================

const getQuotations = async (req, res) => {
  try {
    const quotations = await quotationService.getQuotations();

    return res.status(200).json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    console.error("Get quotations error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ============================================================
// GET QUOTATION BY ID
// ============================================================

const getQuotationById = async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await quotationService.getQuotationById(quotationId);

    return res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Get quotation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ============================================================
// UPDATE QUOTATION STATUS
// ============================================================

const updateQuotationStatus = async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const validationResult =
      updateQuotationStatusSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const quotation =
      await quotationService.updateQuotationStatus(
        quotationId,
        validationResult.data.status
      );

    return res.status(200).json({
      success: true,
      message: "Quotation status updated successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Update quotation status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
};