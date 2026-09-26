const prisma = require("../config/prisma");

const roundMoney = (value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const generateQuotationNumber = async (tx) => {
  const latestQuotation = await tx.quotation.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const nextId = (latestQuotation?.id || 0) + 1;

  return `QUO-${String(nextId).padStart(5, "0")}`;
};

const createQuotation = async (quotationData) => {
  return prisma.$transaction(async (tx) => {
    // ----------------------------------------------------------
    // 1. Find enquiry
    // ----------------------------------------------------------

    const enquiry = await tx.enquiry.findUnique({
      where: {
        id: quotationData.enquiryId,
      },

      include: {
        customer: true,
        items: true,
      },
    });

    if (!enquiry) {
      const error = new Error("Enquiry not found");
      error.statusCode = 404;
      throw error;
    }

    // ----------------------------------------------------------
    // 2. Enquiry must be NEW
    // ----------------------------------------------------------

    if (enquiry.status !== "NEW") {
      const error = new Error(
        "A quotation can only be created for an enquiry with NEW status"
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------------------------
    // 3. Prevent duplicate products
    // ----------------------------------------------------------

    const productIds = quotationData.items.map((item) => item.productId);

    const uniqueProductIds = new Set(productIds);

    if (uniqueProductIds.size !== productIds.length) {
      const error = new Error(
        "The same product cannot be added more than once to a quotation"
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------------------------
    // 4. Verify products exist
    // ----------------------------------------------------------

    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },

      select: {
        id: true,
      },
    });

    const existingProductIds = new Set(
      products.map((product) => product.id)
    );

    const missingProductIds = productIds.filter(
      (productId) => !existingProductIds.has(productId)
    );

    if (missingProductIds.length > 0) {
      const error = new Error(
        `Product(s) not found: ${missingProductIds.join(", ")}`
      );

      error.statusCode = 404;
      throw error;
    }

    // ----------------------------------------------------------
    // 5. Calculate quotation amounts on backend
    // ----------------------------------------------------------

    let grandTotal = 0;

    const calculatedItems = quotationData.items.map((item) => {
      const baseAmount = roundMoney(
        item.quantity * item.unitPrice
      );

      const discountAmount = roundMoney(
        (baseAmount * item.discountPercent) / 100
      );

      const amountAfterDiscount = roundMoney(
        baseAmount - discountAmount
      );

      const gstAmount = roundMoney(
        (amountAfterDiscount * item.gstPercent) / 100
      );

      const lineAmount = roundMoney(
        amountAfterDiscount + gstAmount
      );

      grandTotal = roundMoney(grandTotal + lineAmount);

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        gstPercent: item.gstPercent,
        lineAmount,
      };
    });

    // ----------------------------------------------------------
    // 6. Generate quotation number
    // ----------------------------------------------------------

    const quotationNumber = await generateQuotationNumber(tx);

    // ----------------------------------------------------------
    // 7. Create quotation + items atomically
    // ----------------------------------------------------------

    const quotation = await tx.quotation.create({
      data: {
        quotationNumber,
        enquiryId: enquiry.id,
        customerId: enquiry.customerId,
        validUntil: new Date(
          `${quotationData.validUntil}T00:00:00.000Z`
        ),
        status: "DRAFT",
        grandTotal,

        items: {
          create: calculatedItems,
        },
      },

      include: {
        customer: true,
        enquiry: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return quotation;
  });
};

const getQuotations = async () => {
  return prisma.quotation.findMany({
    orderBy: {
      createdAt: "desc",
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
};

const getQuotationById = async (quotationId) => {
  const quotation = await prisma.quotation.findUnique({
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

  return quotation;
};

// ============================================================
// UPDATE QUOTATION STATUS
// ============================================================

const updateQuotationStatus = async (quotationId, newStatus) => {
  return prisma.$transaction(async (tx) => {
    // ----------------------------------------------------------
    // 1. Find quotation
    // ----------------------------------------------------------

    const quotation = await tx.quotation.findUnique({
      where: {
        id: quotationId,
      },

      include: {
        enquiry: true,
      },
    });

    if (!quotation) {
      const error = new Error("Quotation not found");
      error.statusCode = 404;
      throw error;
    }

    // ----------------------------------------------------------
    // 2. Validate status transition
    // ----------------------------------------------------------

    const currentStatus = quotation.status;

    const allowedTransitions = {
      DRAFT: ["SENT"],
      SENT: ["ACCEPTED", "REJECTED"],
      ACCEPTED: [],
      REJECTED: [],
    };

    const allowedNextStatuses = allowedTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(newStatus)) {
      const error = new Error(
        `Invalid quotation status transition: ${currentStatus} → ${newStatus}`
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------------------------
    // 3. Update quotation status
    // ----------------------------------------------------------

    const updatedQuotation = await tx.quotation.update({
      where: {
        id: quotationId,
      },

      data: {
        status: newStatus,
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

    // ----------------------------------------------------------
    // 4. Update related enquiry status
    // ----------------------------------------------------------

    let enquiryStatus = null;

    if (newStatus === "SENT") {
      enquiryStatus = "QUOTED";
    }

    if (newStatus === "ACCEPTED") {
      enquiryStatus = "WON";
    }

    if (newStatus === "REJECTED") {
      enquiryStatus = "LOST";
    }

    if (enquiryStatus) {
      await tx.enquiry.update({
        where: {
          id: quotation.enquiryId,
        },

        data: {
          status: enquiryStatus,
        },
      });
    }

    return updatedQuotation;
  });
};

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotationStatus,
};