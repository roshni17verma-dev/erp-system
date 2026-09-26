const inventoryService = require("../services/inventory.service");
const {
  updateInventorySchema,
} = require("../validators/inventory.validator");

const getInventory = async (req, res) => {
  try {
    const inventory = await inventoryService.getInventory();

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getInventoryByProductId = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const inventory =
      await inventoryService.getInventoryByProductId(productId);

    return res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory by product error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const updateInventory = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const validationResult = updateInventorySchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const updatedInventory = await inventoryService.updateInventory(
      productId,
      validationResult.data.physicalQuantity
    );

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Update inventory error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  getInventory,
  getInventoryByProductId,
  updateInventory,
};