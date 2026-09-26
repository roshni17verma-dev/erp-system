import { describe, it, expect } from "vitest";

const prisma = require("../config/prisma");

const {
  createDispatch,
} = require("./dispatch.service");

describe("Dispatch Edge Cases", () => {
  // ============================================================
  // TEST 1
  // Dispatch quantity greater than reserved quantity
  // ============================================================

  it(
    "should reject dispatch when quantity exceeds reserved inventory",
    async () => {
      let product = null;
      let quotation = null;
      let salesOrder = null;

      try {
        const timestamp = Date.now();

        // ========================================================
        // 1. CREATE TEMPORARY PRODUCT
        // ========================================================

        product = await prisma.product.create({
          data: {
            productCode: `TEST-DISPATCH-${timestamp}`,
            productName: "Dispatch Edge Test Product",
            category: "TEST",
            unit: "Piece",
            basePrice: 100,
          },
        });

        // ========================================================
        // 2. CREATE INVENTORY
        // ========================================================

        await prisma.inventory.create({
          data: {
            productId: product.id,
            physicalQuantity: 100,
            reservedQuantity: 2,
          },
        });

        // ========================================================
        // 3. CREATE ACCEPTED QUOTATION
        // ========================================================

        quotation = await prisma.quotation.create({
          data: {
            quotationNumber: `TEST-DISPATCH-Q-${timestamp}`,
            enquiryId: 1,
            customerId: 1,
            validUntil: new Date("2026-12-31"),
            status: "ACCEPTED",
            grandTotal: 300,

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 3,
                  unitPrice: 100,
                  discountPercent: 0,
                  gstPercent: 0,
                  lineAmount: 300,
                },
              ],
            },
          },
        });

        // ========================================================
        // 4. CREATE CONFIRMED SALES ORDER
        // ========================================================

        salesOrder = await prisma.salesOrder.create({
          data: {
            orderNumber: `TEST-DISPATCH-SO-${timestamp}`,

            quotation: {
              connect: {
                id: quotation.id,
              },
            },

            customer: {
              connect: {
                id: 1,
              },
            },

            orderDate: new Date(),
            totalAmount: 300,
            status: "CONFIRMED",

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 3,
                },
              ],
            },
          },
        });

        // ========================================================
        // 5. ATTEMPT TO DISPATCH 3
        //
        // Reserved = 2
        // Dispatch = 3
        //
        // MUST FAIL.
        // ========================================================

        await expect(
          createDispatch(salesOrder.id, {
            dispatchDate: "2026-09-27",
            vehicleNumber: "TEST-OVER",
            driverName: "Test Driver",

            items: [
              {
                productId: product.id,
                quantity: 3,
              },
            ],
          })
        ).rejects.toThrow(
          `Cannot dispatch 3 units of product ID ${product.id}. Reserved quantity is only 2`
        );

        // ========================================================
        // 6. VERIFY INVENTORY WAS NOT CHANGED
        // ========================================================

        const finalInventory =
          await prisma.inventory.findUnique({
            where: {
              productId: product.id,
            },
          });

        expect(finalInventory).not.toBeNull();

        expect(finalInventory.physicalQuantity).toBe(100);

        expect(finalInventory.reservedQuantity).toBe(2);

        // ========================================================
        // 7. VERIFY NO DISPATCH WAS CREATED
        // ========================================================

        const dispatches =
          await prisma.dispatch.findMany({
            where: {
              salesOrderId: salesOrder.id,
            },
          });

        expect(dispatches.length).toBe(0);
      } finally {
        // ========================================================
        // CLEANUP SALES ORDER ITEMS
        // ========================================================

        if (salesOrder) {
          await prisma.salesOrderItem.deleteMany({
            where: {
              salesOrderId: salesOrder.id,
            },
          });

          // ======================================================
          // CLEANUP SALES ORDER
          // ======================================================

          await prisma.salesOrder.delete({
            where: {
              id: salesOrder.id,
            },
          });
        }

        // ========================================================
        // CLEANUP QUOTATION ITEMS
        // ========================================================

        if (quotation) {
          await prisma.quotationItem.deleteMany({
            where: {
              quotationId: quotation.id,
            },
          });

          // ======================================================
          // CLEANUP QUOTATION
          // ======================================================

          await prisma.quotation.delete({
            where: {
              id: quotation.id,
            },
          });
        }

        // ========================================================
        // CLEANUP INVENTORY
        // ========================================================

        if (product) {
          await prisma.inventory.deleteMany({
            where: {
              productId: product.id,
            },
          });

          // ======================================================
          // CLEANUP PRODUCT
          // ======================================================

          await prisma.product.delete({
            where: {
              id: product.id,
            },
          });
        }
      }
    },
    30000
  );

  // ============================================================
  // TEST 2
  // Cancelled Sales Order cannot be dispatched
  // ============================================================

  it(
    "should reject dispatch for a cancelled Sales Order",
    async () => {
      let product = null;
      let quotation = null;
      let salesOrder = null;

      try {
        const timestamp = Date.now();

        // ========================================================
        // 1. CREATE TEMPORARY PRODUCT
        // ========================================================

        product = await prisma.product.create({
          data: {
            productCode: `TEST-CANCEL-${timestamp}`,
            productName: "Cancelled Dispatch Test Product",
            category: "TEST",
            unit: "Piece",
            basePrice: 100,
          },
        });

        // ========================================================
        // 2. CREATE INVENTORY
        // ========================================================

        await prisma.inventory.create({
          data: {
            productId: product.id,
            physicalQuantity: 100,
            reservedQuantity: 10,
          },
        });

        // ========================================================
        // 3. CREATE ACCEPTED QUOTATION
        // ========================================================

        quotation = await prisma.quotation.create({
          data: {
            quotationNumber: `TEST-CANCEL-Q-${timestamp}`,
            enquiryId: 1,
            customerId: 1,
            validUntil: new Date("2026-12-31"),
            status: "ACCEPTED",
            grandTotal: 100,

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 1,
                  unitPrice: 100,
                  discountPercent: 0,
                  gstPercent: 0,
                  lineAmount: 100,
                },
              ],
            },
          },
        });

        // ========================================================
        // 4. CREATE CANCELLED SALES ORDER
        // ========================================================

        salesOrder = await prisma.salesOrder.create({
          data: {
            orderNumber: `TEST-CANCEL-SO-${timestamp}`,

            quotation: {
              connect: {
                id: quotation.id,
              },
            },

            customer: {
              connect: {
                id: 1,
              },
            },

            orderDate: new Date(),
            totalAmount: 100,
            status: "CANCELLED",

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 1,
                },
              ],
            },
          },
        });

        // ========================================================
        // 5. ATTEMPT DISPATCH
        // ========================================================

        await expect(
          createDispatch(salesOrder.id, {
            dispatchDate: "2026-09-27",
            vehicleNumber: "TEST-CANCEL",
            driverName: "Test Driver",

            items: [
              {
                productId: product.id,
                quantity: 1,
              },
            ],
          })
        ).rejects.toThrow(
          "Cancelled Sales Orders cannot be dispatched"
        );

        // ========================================================
        // 6. VERIFY INVENTORY WAS NOT CHANGED
        // ========================================================

        const finalInventory =
          await prisma.inventory.findUnique({
            where: {
              productId: product.id,
            },
          });

        expect(finalInventory).not.toBeNull();

        expect(finalInventory.physicalQuantity).toBe(100);

        expect(finalInventory.reservedQuantity).toBe(10);

        // ========================================================
        // 7. VERIFY NO DISPATCH WAS CREATED
        // ========================================================

        const dispatches =
          await prisma.dispatch.findMany({
            where: {
              salesOrderId: salesOrder.id,
            },
          });

        expect(dispatches.length).toBe(0);
      } finally {
        // ========================================================
        // CLEANUP SALES ORDER ITEMS
        // ========================================================

        if (salesOrder) {
          await prisma.salesOrderItem.deleteMany({
            where: {
              salesOrderId: salesOrder.id,
            },
          });

          // ======================================================
          // CLEANUP SALES ORDER
          // ======================================================

          await prisma.salesOrder.delete({
            where: {
              id: salesOrder.id,
            },
          });
        }

        // ========================================================
        // CLEANUP QUOTATION ITEMS
        // ========================================================

        if (quotation) {
          await prisma.quotationItem.deleteMany({
            where: {
              quotationId: quotation.id,
            },
          });

          // ======================================================
          // CLEANUP QUOTATION
          // ======================================================

          await prisma.quotation.delete({
            where: {
              id: quotation.id,
            },
          });
        }

        // ========================================================
        // CLEANUP INVENTORY
        // ========================================================

        if (product) {
          await prisma.inventory.deleteMany({
            where: {
              productId: product.id,
            },
          });

          // ======================================================
          // CLEANUP PRODUCT
          // ======================================================

          await prisma.product.delete({
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