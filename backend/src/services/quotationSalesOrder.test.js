import { describe, it, expect } from "vitest";

const prisma = require("../config/prisma");

const {
  createQuotation,
} = require("./quotation.service");

const {
  convertQuotationToSalesOrder,
} = require("./salesOrder.service");

describe("Quotation and Sales Order Mandatory Tests", () => {
  // ============================================================
  // TEST 1
  // Quotation total must be calculated correctly on backend
  // ============================================================

  it("should calculate quotation grand total correctly", async () => {
    let quotation = null;
    let enquiry = null;
    let product = null;
    let customer = null;

    try {
      const timestamp = Date.now();

      // ----------------------------------------------------------
      // 1. Create customer
      // ----------------------------------------------------------

      customer = await prisma.customer.create({
        data: {
          companyName: `TEST-TOTAL-COMPANY-${timestamp}`,
          contactPerson: "Test Customer",
          mobile: `9${String(timestamp).slice(-9)}`,
          email: `test-total-${timestamp}@example.com`,
          city: "Mumbai",
        },
      });

      // ----------------------------------------------------------
      // 2. Create product
      // ----------------------------------------------------------

      product = await prisma.product.create({
        data: {
          productCode: `TEST-TOTAL-${timestamp}`,
          productName: "Quotation Total Test Product",
          category: "TEST",
          unit: "Piece",
          basePrice: 100,
        },
      });

      // ----------------------------------------------------------
      // 3. Create NEW enquiry
      // ----------------------------------------------------------

      enquiry = await prisma.enquiry.create({
        data: {
          enquiryNumber: `TEST-TOTAL-ENQ-${timestamp}`,
          customerId: customer.id,
          enquiryDate: new Date(),
          requiredDate: new Date("2026-12-31"),
          status: "NEW",
          notes: "Quotation total test",

          items: {
            create: [
              {
                productId: product.id,
                quantity: 10,
              },
            ],
          },
        },
      });

      // ----------------------------------------------------------
      // 4. Create quotation
      //
      // Quantity = 10
      // Unit price = 100
      // Base = 1000
      //
      // Discount = 10%
      // Discount amount = 100
      //
      // After discount = 900
      //
      // GST = 18%
      // GST amount = 162
      //
      // Expected total = 1062
      // ----------------------------------------------------------

      quotation = await createQuotation({
        enquiryId: enquiry.id,
        validUntil: "2026-12-31",

        items: [
          {
            productId: product.id,
            quantity: 10,
            unitPrice: 100,
            discountPercent: 10,
            gstPercent: 18,
          },
        ],
      });

      expect(quotation).not.toBeNull();

      expect(quotation.status).toBe("DRAFT");

      // Prisma Decimal -> JavaScript Number
      expect(Number(quotation.grandTotal)).toBe(1062);

      expect(quotation.items).toHaveLength(1);

      // Prisma Decimal -> JavaScript Number
      expect(Number(quotation.items[0].lineAmount)).toBe(1062);
    } finally {
      // ----------------------------------------------------------
      // Cleanup quotation
      // ----------------------------------------------------------

      if (quotation) {
        await prisma.quotationItem.deleteMany({
          where: {
            quotationId: quotation.id,
          },
        });

        await prisma.quotation.delete({
          where: {
            id: quotation.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup enquiry
      // ----------------------------------------------------------

      if (enquiry) {
        await prisma.enquiryItem.deleteMany({
          where: {
            enquiryId: enquiry.id,
          },
        });

        await prisma.enquiry.delete({
          where: {
            id: enquiry.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup product
      // ----------------------------------------------------------

      if (product) {
        await prisma.product.delete({
          where: {
            id: product.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup customer
      // ----------------------------------------------------------

      if (customer) {
        await prisma.customer.delete({
          where: {
            id: customer.id,
          },
        });
      }
    }
  }, 30000);

  // ============================================================
  // TEST 2
  // Draft quotation cannot create Sales Order
  // ============================================================

  it("should reject conversion of a DRAFT quotation", async () => {
    let quotation = null;
    let product = null;
    let enquiry = null;
    let customer = null;

    try {
      const timestamp = Date.now();

      // ----------------------------------------------------------
      // 1. Create customer
      // ----------------------------------------------------------

      customer = await prisma.customer.create({
        data: {
          companyName: `TEST-DRAFT-COMPANY-${timestamp}`,
          contactPerson: "Draft Test",
          mobile: `8${String(timestamp).slice(-9)}`,
          email: `draft-${timestamp}@example.com`,
          city: "Mumbai",
        },
      });

      // ----------------------------------------------------------
      // 2. Create product
      // ----------------------------------------------------------

      product = await prisma.product.create({
        data: {
          productCode: `TEST-DRAFT-${timestamp}`,
          productName: "Draft Conversion Product",
          category: "TEST",
          unit: "Piece",
          basePrice: 100,
        },
      });

      // ----------------------------------------------------------
      // 3. Create NEW enquiry
      // ----------------------------------------------------------

      enquiry = await prisma.enquiry.create({
        data: {
          enquiryNumber: `TEST-DRAFT-ENQ-${timestamp}`,
          customerId: customer.id,
          enquiryDate: new Date(),
          requiredDate: new Date("2026-12-31"),
          status: "NEW",
          notes: "Draft quotation conversion test",

          items: {
            create: [
              {
                productId: product.id,
                quantity: 5,
              },
            ],
          },
        },
      });

      // ----------------------------------------------------------
      // 4. Create quotation
      // ----------------------------------------------------------

      quotation = await createQuotation({
        enquiryId: enquiry.id,
        validUntil: "2026-12-31",

        items: [
          {
            productId: product.id,
            quantity: 5,
            unitPrice: 100,
            discountPercent: 0,
            gstPercent: 0,
          },
        ],
      });

      expect(quotation.status).toBe("DRAFT");

      // ----------------------------------------------------------
      // 5. Attempt conversion
      // ----------------------------------------------------------

      await expect(
        convertQuotationToSalesOrder(quotation.id)
      ).rejects.toThrow(
        "Only ACCEPTED quotations can be converted to a Sales Order"
      );
    } finally {
      // ----------------------------------------------------------
      // Cleanup quotation
      // ----------------------------------------------------------

      if (quotation) {
        await prisma.quotationItem.deleteMany({
          where: {
            quotationId: quotation.id,
          },
        });

        await prisma.quotation.delete({
          where: {
            id: quotation.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup enquiry
      // ----------------------------------------------------------

      if (enquiry) {
        await prisma.enquiryItem.deleteMany({
          where: {
            enquiryId: enquiry.id,
          },
        });

        await prisma.enquiry.delete({
          where: {
            id: enquiry.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup product
      // ----------------------------------------------------------

      if (product) {
        await prisma.product.delete({
          where: {
            id: product.id,
          },
        });
      }

      // ----------------------------------------------------------
      // Cleanup customer
      // ----------------------------------------------------------

      if (customer) {
        await prisma.customer.delete({
          where: {
            id: customer.id,
          },
        });
      }
    }
  }, 30000);

  // ============================================================
  // TEST 3
  // Same quotation cannot create duplicate Sales Orders
  // ============================================================

  it(
    "should prevent duplicate Sales Orders for the same quotation",
    async () => {
      let quotation = null;
      let salesOrder = null;
      let product = null;
      let enquiry = null;
      let customer = null;

      try {
        const timestamp = Date.now();

        // --------------------------------------------------------
        // 1. Create customer
        // --------------------------------------------------------

        customer = await prisma.customer.create({
          data: {
            companyName: `TEST-DUPLICATE-COMPANY-${timestamp}`,
            contactPerson: "Duplicate Test",
            mobile: `7${String(timestamp).slice(-9)}`,
            email: `duplicate-${timestamp}@example.com`,
            city: "Mumbai",
          },
        });

        // --------------------------------------------------------
        // 2. Create product
        // --------------------------------------------------------

        product = await prisma.product.create({
          data: {
            productCode: `TEST-DUPLICATE-${timestamp}`,
            productName: "Duplicate Order Test Product",
            category: "TEST",
            unit: "Piece",
            basePrice: 100,
          },
        });

        // --------------------------------------------------------
        // 3. Create NEW enquiry
        // --------------------------------------------------------

        enquiry = await prisma.enquiry.create({
          data: {
            enquiryNumber: `TEST-DUPLICATE-ENQ-${timestamp}`,
            customerId: customer.id,
            enquiryDate: new Date(),
            requiredDate: new Date("2026-12-31"),
            status: "NEW",
            notes: "Duplicate Sales Order test",

            items: {
              create: [
                {
                  productId: product.id,
                  quantity: 5,
                },
              ],
            },
          },
        });

        // --------------------------------------------------------
        // 4. Create quotation
        // --------------------------------------------------------

        quotation = await createQuotation({
          enquiryId: enquiry.id,
          validUntil: "2026-12-31",

          items: [
            {
              productId: product.id,
              quantity: 5,
              unitPrice: 100,
              discountPercent: 0,
              gstPercent: 0,
            },
          ],
        });

        // --------------------------------------------------------
        // 5. Set quotation to ACCEPTED
        //
        // This test focuses specifically on Sales Order
        // conversion and duplicate prevention.
        // --------------------------------------------------------

        await prisma.quotation.update({
          where: {
            id: quotation.id,
          },
          data: {
            status: "ACCEPTED",
          },
        });

        // --------------------------------------------------------
        // 6. First conversion MUST succeed
        // --------------------------------------------------------

        salesOrder = await convertQuotationToSalesOrder(
          quotation.id
        );

        expect(salesOrder).not.toBeNull();

        expect(salesOrder.status).toBe("PENDING");

        expect(salesOrder.quotationId).toBe(quotation.id);

        // --------------------------------------------------------
        // 7. Second conversion MUST fail
        // --------------------------------------------------------

        await expect(
          convertQuotationToSalesOrder(quotation.id)
        ).rejects.toThrow(
          "Sales Order already exists for quotation"
        );
      } finally {
        // --------------------------------------------------------
        // Cleanup Sales Order Items
        // --------------------------------------------------------

        if (salesOrder) {
          await prisma.salesOrderItem.deleteMany({
            where: {
              salesOrderId: salesOrder.id,
            },
          });

          await prisma.salesOrder.delete({
            where: {
              id: salesOrder.id,
            },
          });
        }

        // --------------------------------------------------------
        // Cleanup quotation items
        // --------------------------------------------------------

        if (quotation) {
          await prisma.quotationItem.deleteMany({
            where: {
              quotationId: quotation.id,
            },
          });

          await prisma.quotation.delete({
            where: {
              id: quotation.id,
            },
          });
        }

        // --------------------------------------------------------
        // Cleanup enquiry items
        // --------------------------------------------------------

        if (enquiry) {
          await prisma.enquiryItem.deleteMany({
            where: {
              enquiryId: enquiry.id,
            },
          });

          await prisma.enquiry.delete({
            where: {
              id: enquiry.id,
            },
          });
        }

        // --------------------------------------------------------
        // Cleanup product
        // --------------------------------------------------------

        if (product) {
          await prisma.product.delete({
            where: {
              id: product.id,
            },
          });
        }

        // --------------------------------------------------------
        // Cleanup customer
        // --------------------------------------------------------

        if (customer) {
          await prisma.customer.delete({
            where: {
              id: customer.id,
            },
          });
        }
      }
    },
    30000
  );
});