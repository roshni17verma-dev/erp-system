const prisma = require("../config/prisma");

const formatInventory = (inventory) => {
  return {
    id: inventory.id,
    productId: inventory.productId,
    physicalQuantity: inventory.physicalQuantity,
    reservedQuantity: inventory.reservedQuantity,
    availableQuantity:
      inventory.physicalQuantity - inventory.reservedQuantity,
    createdAt: inventory.createdAt,
    updatedAt: inventory.updatedAt,
  };
};

const getInventory = async () => {
  const inventoryRecords = await prisma.inventory.findMany({
    orderBy: {
      productId: "asc",
    },

    include: {
      product: true,
    },
  });

  return inventoryRecords.map((inventory) => ({
    ...formatInventory(inventory),
    product: inventory.product,
  }));
};

const getInventoryByProductId = async (productId) => {
  const inventory = await prisma.inventory.findUnique({
    where: {
      productId,
    },

    include: {
      product: true,
    },
  });

  if (!inventory) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    ...formatInventory(inventory),
    product: inventory.product,
  };
};

const updateInventory = async (productId, physicalQuantity) => {
  const inventory = await prisma.inventory.findUnique({
    where: {
      productId,
    },
  });

  if (!inventory) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    throw error;
  }

  // ----------------------------------------------------------
  // Do not allow physical quantity below reserved quantity
  // ----------------------------------------------------------

  if (physicalQuantity < inventory.reservedQuantity) {
    const error = new Error(
      `Physical quantity cannot be less than reserved quantity (${inventory.reservedQuantity})`
    );

    error.statusCode = 400;
    throw error;
  }

  const updatedInventory = await prisma.inventory.update({
    where: {
      productId,
    },

    data: {
      physicalQuantity,
    },

    include: {
      product: true,
    },
  });

  return {
    ...formatInventory(updatedInventory),
    product: updatedInventory.product,
  };
};

module.exports = {
  getInventory,
  getInventoryByProductId,
  updateInventory,
};