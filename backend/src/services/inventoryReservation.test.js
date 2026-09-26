import { describe, it, expect } from "vitest";

const prisma = require("../config/prisma");

const {
  updateSalesOrderStatus,
} = require("./salesOrder.service");

describe("Inventory Reservation Concurrency", () => {
  it(
    "should prevent concurrent reservations from exceeding available stock",
    async () => {
      let product = null;
      let quotationA = null;
      let quotationB = null;
      let orderA = null;
      let orderB = null;

      try {
        const timestamp = Date.now();

        // ============================================================
        // 1. CREATE TEMPORARY PRODUCT
        // ============================================================

        product = await prisma.product.create({
          data: {
            productCode: `TEST-CON-${timestamp}`,
            productName: "Concurrency Test Product",
            category: "TEST",
            unit: "Piece",
            basePrice: 100,
          },
        });

        // ============================================================
        // 2. CREATE INVENTORY
        //
        // Physical = 100
        // Reserved = 0
        // Available = 100
        // ============================================================

        await prisma.inventory.create({
          data: {
            productId: product.id,
            physicalQuantity: 100,
            reservedQuantity: 0,
          },
        });

        // ============================================================
        // 3. CREATE QUOTATION A
        //
        // Order A will require 80 units.
        // ============================================================

        quotationA = await prisma.quotation.create({
          data: {
            quotationNumber: `TEST-CON-QA-${timestamp}`,
            enquiryId: 1,
            customerId: 1,
            validUntil: new Date("2026-12-31"),
            status: "ACCEPTED",
            grandTotal: 8000,

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 80,
                  unitPrice: 100,
                  discountPercent: 0,
                  gstPercent: 0,
                  lineAmount: 8000,
                },
              ],
            },
          },
        });

        // ============================================================
        // 4. CREATE QUOTATION B
        //
        // Order B will require 50 units.
        // ============================================================

        quotationB = await prisma.quotation.create({
          data: {
            quotationNumber: `TEST-CON-QB-${timestamp}`,
            enquiryId: 1,
            customerId: 1,
            validUntil: new Date("2026-12-31"),
            status: "ACCEPTED",
            grandTotal: 5000,

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 50,
                  unitPrice: 100,
                  discountPercent: 0,
                  gstPercent: 0,
                  lineAmount: 5000,
                },
              ],
            },
          },
        });

        // ============================================================
        // 5. CREATE SALES ORDER A
        //
        // Requires 80 units.
        //
        // IMPORTANT:
        // SalesOrder requires a quotation relation.
        // ============================================================

        orderA = await prisma.salesOrder.create({
          data: {
            orderNumber: `TEST-CON-A-${timestamp}`,

            quotation: {
              connect: {
                id: quotationA.id,
              },
            },

            customer: {
              connect: {
                id: 1,
              },
            },

            orderDate: new Date(),
            totalAmount: 8000,
            status: "PENDING",

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 80,
                },
              ],
            },
          },
        });

        // ============================================================
        // 6. CREATE SALES ORDER B
        //
        // Requires 50 units.
        // ============================================================

        orderB = await prisma.salesOrder.create({
          data: {
            orderNumber: `TEST-CON-B-${timestamp}`,

            quotation: {
              connect: {
                id: quotationB.id,
              },
            },

            customer: {
              connect: {
                id: 1,
              },
            },

            orderDate: new Date(),
            totalAmount: 5000,
            status: "PENDING",

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 50,
                },
              ],
            },
          },
        });

        // ============================================================
        // 7. RUN BOTH CONFIRMATIONS SIMULTANEOUSLY
        //
        // Available stock = 100
        //
        // Request A -> 80
        // Request B -> 50
        //
        // Both MUST NOT succeed.
        // ============================================================

        const results = await Promise.allSettled([
          updateSalesOrderStatus(orderA.id, "CONFIRMED"),
          updateSalesOrderStatus(orderB.id, "CONFIRMED"),
        ]);

        // ============================================================
        // 8. EXACTLY ONE REQUEST MUST SUCCEED
        // ============================================================

        const successfulTransactions = results.filter(
          (result) => result.status === "fulfilled"
        );

        const failedTransactions = results.filter(
          (result) => result.status === "rejected"
        );

        expect(successfulTransactions.length).toBe(1);

        expect(failedTransactions.length).toBe(1);

        // ============================================================
        // 9. CHECK FINAL INVENTORY
        // ============================================================

        const finalInventory = await prisma.inventory.findUnique({
          where: {
            productId: product.id,
          },
        });

        expect(finalInventory).not.toBeNull();

        // Either 80 or 50 can win.
        //
        // What must NOT happen:
        // reservedQuantity = 130
        //
        // The concurrency requirement is that both
        // reservations cannot succeed.

        expect([80, 50]).toContain(
          finalInventory.reservedQuantity
        );

        // Physical stock must never change during reservation.

        expect(finalInventory.physicalQuantity).toBe(100);

        const availableQuantity =
          finalInventory.physicalQuantity -
          finalInventory.reservedQuantity;

        expect([20, 50]).toContain(availableQuantity);

        // ============================================================
        // 10. CHECK SALES ORDER STATUSES
        // ============================================================

        const finalOrderA = await prisma.salesOrder.findUnique({
          where: {
            id: orderA.id,
          },
        });

        const finalOrderB = await prisma.salesOrder.findUnique({
          where: {
            id: orderB.id,
          },
        });

        const confirmedOrders = [
          finalOrderA,
          finalOrderB,
        ].filter(
          (order) => order.status === "CONFIRMED"
        );

        const pendingOrders = [
          finalOrderA,
          finalOrderB,
        ].filter(
          (order) => order.status === "PENDING"
        );

        // Exactly one order must be confirmed.

        expect(confirmedOrders.length).toBe(1);

        // Exactly one order must remain pending.

        expect(pendingOrders.length).toBe(1);
      } finally {
        // ============================================================
        // 11. CLEAN UP SALES ORDER ITEMS
        // ============================================================

        const orderIds = [
          orderA?.id,
          orderB?.id,
        ].filter(Boolean);

        if (orderIds.length > 0) {
          await prisma.salesOrderItem.deleteMany({
            where: {
              salesOrderId: {
                in: orderIds,
              },
            },
          });

          // ==========================================================
          // 12. CLEAN UP SALES ORDERS
          // ==========================================================

          await prisma.salesOrder.deleteMany({
            where: {
              id: {
                in: orderIds,
              },
            },
          });
        }

        // ============================================================
        // 13. CLEAN UP QUOTATION ITEMS
        // ============================================================

        const quotationIds = [
          quotationA?.id,
          quotationB?.id,
        ].filter(Boolean);

        if (quotationIds.length > 0) {
          await prisma.quotationItem.deleteMany({
            where: {
              quotationId: {
                in: quotationIds,
              },
            },
          });

          // ==========================================================
          // 14. CLEAN UP QUOTATIONS
          // ==========================================================

          await prisma.quotation.deleteMany({
            where: {
              id: {
                in: quotationIds,
              },
            },
          });
        }

        // ============================================================
        // 15. CLEAN UP INVENTORY
        // ============================================================

        if (product) {
          await prisma.inventory.deleteMany({
            where: {
              productId: product.id,
            },
          });

          // ==========================================================
          // 16. CLEAN UP PRODUCT
          // ==========================================================

          await prisma.product.deleteMany({
            where: {
              id: product.id,
            },
          });
        }
      }
    },
    30000
  );
});