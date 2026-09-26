const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

// ============================================================
// GENERATE DISPATCH NUMBER
// ============================================================

const generateDispatchNumber = async (tx) => {
  const latestDispatch = await tx.dispatch.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const nextId = (latestDispatch?.id || 0) + 1;

  return `DIS-${String(nextId).padStart(5, "0")}`;
};

// ============================================================
// CREATE DISPATCH
// ============================================================

const createDispatch = async (salesOrderId, dispatchData) => {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------------
          // 1. Find Sales Order
          // ----------------------------------------------------

          const salesOrder = await tx.salesOrder.findUnique({
            where: {
              id: salesOrderId,
            },

            include: {
              items: true,
              dispatches: {
                include: {
                  items: true,
                },
              },
            },
          });

          if (!salesOrder) {
            const error = new Error("Sales Order not found");
            error.statusCode = 404;
            throw error;
          }

          // ----------------------------------------------------
          // 2. Sales Order must be CONFIRMED
          // ----------------------------------------------------

          if (salesOrder.status !== "CONFIRMED") {
            if (salesOrder.status === "CANCELLED") {
              const error = new Error(
                "Cancelled Sales Orders cannot be dispatched"
              );

              error.statusCode = 400;
              throw error;
            }

            if (salesOrder.status === "DISPATCHED") {
              const error = new Error(
                "Sales Order has already been dispatched"
              );

              error.statusCode = 409;
              throw error;
            }

            const error = new Error(
              `Only CONFIRMED Sales Orders can be dispatched. Current status: ${salesOrder.status}`
            );

            error.statusCode = 400;
            throw error;
          }

          // ----------------------------------------------------
          // 3. Prevent duplicate dispatch
          // ----------------------------------------------------

          if (salesOrder.dispatches.length > 0) {
            const error = new Error(
              "A dispatch already exists for this Sales Order"
            );

            error.statusCode = 409;
            throw error;
          }

          // ----------------------------------------------------
          // 4. Validate dispatch items
          // ----------------------------------------------------

          if (
            !Array.isArray(dispatchData.items) ||
            dispatchData.items.length === 0
          ) {
            const error = new Error(
              "At least one dispatch item is required"
            );

            error.statusCode = 400;
            throw error;
          }

          // ----------------------------------------------------
          // 5. Prevent duplicate products in dispatch request
          // ----------------------------------------------------

          const productIds = dispatchData.items.map(
            (item) => item.productId
          );

          const uniqueProductIds = new Set(productIds);

          if (uniqueProductIds.size !== productIds.length) {
            const error = new Error(
              "The same product cannot be added more than once to a dispatch"
            );

            error.statusCode = 400;
            throw error;
          }

          // ----------------------------------------------------
          // 6. Validate every dispatch item against the order
          // ----------------------------------------------------

          for (const dispatchItem of dispatchData.items) {
            const orderItem = salesOrder.items.find(
              (item) =>
                item.productId === dispatchItem.productId
            );

            if (!orderItem) {
              const error = new Error(
                `Product ID ${dispatchItem.productId} does not belong to Sales Order ${salesOrder.orderNumber}`
              );

              error.statusCode = 400;
              throw error;
            }

            if (
              !Number.isInteger(dispatchItem.quantity) ||
              dispatchItem.quantity <= 0
            ) {
              const error = new Error(
                `Dispatch quantity for product ID ${dispatchItem.productId} must be a positive integer`
              );

              error.statusCode = 400;
              throw error;
            }

            if (
              dispatchItem.quantity !== orderItem.quantity
            ) {
              const error = new Error(
                `Dispatch quantity for product ID ${dispatchItem.productId} must equal the Sales Order quantity of ${orderItem.quantity}`
              );

              error.statusCode = 400;
              throw error;
            }
          }

          // ----------------------------------------------------
          // 7. Ensure all Sales Order products are dispatched
          // ----------------------------------------------------

          if (
            dispatchData.items.length !==
            salesOrder.items.length
          ) {
            const error = new Error(
              "Dispatch must include all Sales Order products"
            );

            error.statusCode = 400;
            throw error;
          }

          // ----------------------------------------------------
          // 8. Generate dispatch number
          // ----------------------------------------------------

          const dispatchNumber =
            await generateDispatchNumber(tx);

          // ----------------------------------------------------
          // 9. Check inventory and update stock
          // ----------------------------------------------------

          for (const dispatchItem of dispatchData.items) {
            const inventory =
              await tx.inventory.findUnique({
                where: {
                  productId: dispatchItem.productId,
                },
              });

            if (!inventory) {
              const error = new Error(
                `Inventory record not found for product ID ${dispatchItem.productId}`
              );

              error.statusCode = 404;
              throw error;
            }

            // ------------------------------------------------
            // Dispatch cannot exceed reserved quantity
            // ------------------------------------------------

            if (
              dispatchItem.quantity >
              inventory.reservedQuantity
            ) {
              const error = new Error(
                `Cannot dispatch ${dispatchItem.quantity} units of product ID ${dispatchItem.productId}. Reserved quantity is only ${inventory.reservedQuantity}`
              );

              error.statusCode = 400;
              throw error;
            }

            // ------------------------------------------------
            // Physical quantity must also be sufficient
            // ------------------------------------------------

            if (
              dispatchItem.quantity >
              inventory.physicalQuantity
            ) {
              const error = new Error(
                `Cannot dispatch ${dispatchItem.quantity} units of product ID ${dispatchItem.productId}. Physical quantity is only ${inventory.physicalQuantity}`
              );

              error.statusCode = 400;
              throw error;
            }

            // ------------------------------------------------
            // Decrease physical AND reserved quantity
            // ------------------------------------------------

            await tx.inventory.update({
              where: {
                id: inventory.id,
              },

              data: {
                physicalQuantity: {
                  decrement: dispatchItem.quantity,
                },

                reservedQuantity: {
                  decrement: dispatchItem.quantity,
                },
              },
            });
          }

          // ----------------------------------------------------
          // 10. Create Dispatch
          // ----------------------------------------------------

          const dispatch = await tx.dispatch.create({
            data: {
              dispatchNumber,
              salesOrderId,
              dispatchDate: new Date(
                `${dispatchData.dispatchDate}T00:00:00.000Z`
              ),
              vehicleNumber: dispatchData.vehicleNumber,
              driverName: dispatchData.driverName,

              items: {
                create: dispatchData.items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                })),
              },
            },

            include: {
              salesOrder: {
                include: {
                  customer: true,
                  quotation: {
                    include: {
                      enquiry: true,
                    },
                  },
                  items: {
                    include: {
                      product: true,
                    },
                  },
                },
              },

              items: {
                include: {
                  product: true,
                },
              },
            },
          });

          // ----------------------------------------------------
          // 11. Mark Sales Order as DISPATCHED
          // ----------------------------------------------------

          await tx.salesOrder.update({
            where: {
              id: salesOrderId,
            },

            data: {
              status: "DISPATCHED",
            },
          });

          return dispatch;
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      // --------------------------------------------------------
      // PostgreSQL serialization conflict
      // --------------------------------------------------------

      if (
        error.code === "P2034" &&
        attempt < maxRetries
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * attempt)
        );

        continue;
      }

      // --------------------------------------------------------
      // Duplicate dispatch number
      // --------------------------------------------------------

      if (error.code === "P2002") {
        const duplicateError = new Error(
          "A dispatch with this number already exists"
        );

        duplicateError.statusCode = 409;

        throw duplicateError;
      }

      throw error;
    }
  }
};

// ============================================================
// GET ALL DISPATCHES
// ============================================================

const getDispatches = async () => {
  return prisma.dispatch.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      salesOrder: {
        include: {
          customer: true,

          quotation: {
            include: {
              enquiry: true,
            },
          },
        },
      },

      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

// ============================================================
// GET DISPATCH BY ID
// ============================================================

const getDispatchById = async (dispatchId) => {
  const dispatch = await prisma.dispatch.findUnique({
    where: {
      id: dispatchId,
    },

    include: {
      salesOrder: {
        include: {
          customer: true,

          quotation: {
            include: {
              enquiry: true,
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      },

      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!dispatch) {
    const error = new Error("Dispatch not found");
    error.statusCode = 404;
    throw error;
  }

  return dispatch;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createDispatch,
  getDispatches,
  getDispatchById,
};