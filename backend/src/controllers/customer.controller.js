const customerService = require("../services/customer.service");
const { createCustomerSchema } = require("../validators/customer.validator");

const createCustomer = async (req, res) => {
  try {
    const validationResult = createCustomerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const customer = await customerService.createCustomer(
      validationResult.data
    );

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await customerService.getCustomers();

    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await customerService.getCustomerById(customerId);

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
};