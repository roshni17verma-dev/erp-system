const enquiryService = require("../services/enquiry.service");
const {
  createEnquirySchema,
} = require("../validators/enquiry.validator");

const createEnquiry = async (req, res) => {
  try {
    const validationResult = createEnquirySchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const enquiry = await enquiryService.createEnquiry(
      validationResult.data,
      req.user.userId
    );

    return res.status(201).json({
      success: true,
      message: "Enquiry created successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Create enquiry error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getEnquiries = async (req, res) => {
  try {
    const enquiries = await enquiryService.getEnquiries();

    return res.status(200).json({
      success: true,
      data: enquiries,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getEnquiryById = async (req, res) => {
  try {
    const enquiryId = Number(req.params.id);

    if (!Number.isInteger(enquiryId) || enquiryId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID",
      });
    }

    const enquiry = await enquiryService.getEnquiryById(enquiryId);

    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    console.error("Get enquiry error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
};