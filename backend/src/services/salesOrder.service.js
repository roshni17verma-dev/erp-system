const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

const {
  reserveInventoryForSalesOrder,
} = require("./inventoryReservation.service");

// ============================================================
// GENERATE SALES ORDER NUMBER
// ============================================================

const generateSalesOrderNumber = async (tx) => {
  const latestSalesOrder = await tx.salesOrder.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const nextId = (latestSalesOrder?.id || 0) + 1;

  return `SO-${String(nextId).padStart(5, "0")}`;
};

// ============================================================
// CONVERT ACCEPTED QUOTATION TO SALES ORDER
// ============================================================

const convertQuotationToSalesOrder = async (quotationId) => {
  return prisma
    .$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: {
          id: quotationId,
        },

        include: {
          customer: true,
          enquiry: true,

          items: {
            include: {
              product: true,
            },
          },

          salesOrder: true,
        },
      });

      if (!quotation) {
        const error = new Error("Quotation not found");
        error.statusCode = 404;
        throw error;
      }

      // Only ACCEPTED quotations can become Sales Orders
      if (quotation.status !== "ACCEPTED") {
        const error = new Error(
          `Only ACCEPTED quotations can be converted to a Sales Order. Current status: ${quotation.status}`
        );

        error.statusCode = 400;
        throw error;
      }

      // Prevent duplicate Sales Orders
      if (quotation.salesOrder) {
        const error = new Error(
          `Sales Order already exists for quotation ${quotation.quotationNumber}`
        );

        error.statusCode = 409;
        throw error;
      }

      const orderNumber = await generateSalesOrderNumber(tx);

      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          orderDate: new Date(),
          totalAmount: quotation.grandTotal,
          status: "PENDING",

          items: {
            create: quotation.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },

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
      });

      return salesOrder;
    })
    .catch((error) => {
      if (error.code === "P2002") {
        const duplicateError = new Error(
          "This quotation has already been converted into a Sales Order"
        );

        duplicateError.statusCode = 409;

        throw duplicateError;
      }

      throw error;
    });
};

// ============================================================
// GET ALL SALES ORDERS
// ============================================================

const getSalesOrders = async () => {
  return prisma.salesOrder.findMany({
    orderBy: {
      createdAt: "desc",
    },

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

      dispatches: true,
    },
  });
};

// ============================================================
// GET SALES ORDER BY ID
// ============================================================

const getSalesOrderById = async (salesOrderId) => {
  const salesOrder = await prisma.salesOrder.findUnique({
    where: {
      id: salesOrderId,
    },

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

      dispatches: true,
    },
  });

  if (!salesOrder) {
    const error = new Error("Sales Order not found");
    error.statusCode = 404;
    throw error;
  }

  return salesOrder;
};

// ============================================================
// UPDATE SALES ORDER STATUS
// ============================================================

const updateSalesOrderStatus = async (
  salesOrderId,
  newStatus
) => {
  // ----------------------------------------------------------
  // Retry serializable transactions if PostgreSQL detects
  // a concurrent transaction conflict.
  // ----------------------------------------------------------

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // ----------------------------------------------------
          // 1. Find Sales Order
          // ----------------------------------------------------

          const salesOrder =
            await tx.salesOrder.findUnique({
              where: {
                id: salesOrderId,
              },
            });

          if (!salesOrder) {
            const error = new Error(
              "Sales Order not found"
            );

            error.statusCode = 404;
            throw error;
          }

          // ----------------------------------------------------
          // 2. Validate status transition
          // ----------------------------------------------------

          const allowedTransitions = {
            PENDING: ["CONFIRMED", "CANCELLED"],
            CONFIRMED: ["CANCELLED"],
            DISPATCHED: [],
            CANCELLED: [],
          };

          const allowedNextStatuses =
            allowedTransitions[salesOrder.status] || [];

          if (!allowedNextStatuses.includes(newStatus)) {
            const error = new Error(
              `Invalid Sales Order status transition: ${salesOrder.status} → ${newStatus}`
            );

            error.statusCode = 400;
            throw error;
          }

          // ----------------------------------------------------
          // 3. Reserve inventory before confirmation
          // ----------------------------------------------------

          if (newStatus === "CONFIRMED") {
            await reserveInventoryForSalesOrder(
              tx,
              salesOrderId
            );
          }

          // ----------------------------------------------------
          // 4. Update Sales Order status
          // ----------------------------------------------------

          const updatedSalesOrder =
            await tx.salesOrder.update({
              where: {
                id: salesOrderId,
              },

              data: {
                status: newStatus,
              },

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

                dispatches: true,
              },
            });

          return updatedSalesOrder;
        },

        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      // --------------------------------------------------------
      // PostgreSQL serialization conflict
      // Prisma error code: P2034
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

      throw error;
    }
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  convertQuotationToSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrderStatus,
};