const reserveInventoryForSalesOrder = async (tx, salesOrderId) => {
  // ----------------------------------------------------------
  // 1. Get Sales Order with its items
  // ----------------------------------------------------------

  const salesOrder = await tx.salesOrder.findUnique({
    where: {
      id: salesOrderId,
    },

    include: {
      items: true,
    },
  });

  if (!salesOrder) {
    const error = new Error("Sales Order not found");
    error.statusCode = 404;
    throw error;
  }

  // ----------------------------------------------------------
  // 2. Check and reserve inventory for every item
  // ----------------------------------------------------------

  for (const orderItem of salesOrder.items) {
    const inventory = await tx.inventory.findUnique({
      where: {
        productId: orderItem.productId,
      },
    });

    if (!inventory) {
      const error = new Error(
        `Inventory record not found for product ID ${orderItem.productId}`
      );

      error.statusCode = 404;
      throw error;
    }

    const physicalQuantity = inventory.physicalQuantity;
    const reservedQuantity = inventory.reservedQuantity;

    const availableQuantity =
      physicalQuantity - reservedQuantity;

    // --------------------------------------------------------
    // 3. Check available inventory
    // --------------------------------------------------------

    if (availableQuantity < orderItem.quantity) {
      const error = new Error(
        `Insufficient inventory for product ID ${orderItem.productId}. ` +
          `Available: ${availableQuantity}, ` +
          `Required: ${orderItem.quantity}`
      );

      error.statusCode = 400;
      throw error;
    }

    // --------------------------------------------------------
    // 4. Reserve inventory
    // --------------------------------------------------------

    await tx.inventory.update({
      where: {
        id: inventory.id,
      },

      data: {
        reservedQuantity: {
          increment: orderItem.quantity,
        },
      },
    });
  }

  return true;
};

module.exports = {
  reserveInventoryForSalesOrder,
};