const prisma = require("../config/prisma");

const generateEnquiryNumber = async (tx) => {
  const latestEnquiry = await tx.enquiry.findFirst({
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });

  const nextId = (latestEnquiry?.id || 0) + 1;

  return `ENQ-${String(nextId).padStart(5, "0")}`;
};

const createEnquiry = async (enquiryData, userId) => {
  return prisma.$transaction(async (tx) => {
    // ----------------------------------------------------------
    // 1. Verify customer exists
    // ----------------------------------------------------------

    const customer = await tx.customer.findUnique({
      where: {
        id: enquiryData.customerId,
      },
    });

    if (!customer) {
      const error = new Error("Customer not found");
      error.statusCode = 404;
      throw error;
    }

    // ----------------------------------------------------------
    // 2. Prevent duplicate products in one enquiry
    // ----------------------------------------------------------

    const productIds = enquiryData.items.map((item) => item.productId);

    const uniqueProductIds = new Set(productIds);

    if (uniqueProductIds.size !== productIds.length) {
      const error = new Error(
        "The same product cannot be added more than once to an enquiry"
      );

      error.statusCode = 400;
      throw error;
    }

    // ----------------------------------------------------------
    // 3. Verify all products exist
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

    const existingProductIds = new Set(products.map((product) => product.id));

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
    // 4. Generate enquiry number
    // ----------------------------------------------------------

    const enquiryNumber = await generateEnquiryNumber(tx);

    // ----------------------------------------------------------
    // 5. Create enquiry + enquiry items atomically
    // ----------------------------------------------------------

    const enquiry = await tx.enquiry.create({
      data: {
        enquiryNumber,
        customerId: enquiryData.customerId,
        enquiryDate: new Date(`${enquiryData.enquiryDate}T00:00:00.000Z`),
        requiredDate: new Date(`${enquiryData.requiredDate}T00:00:00.000Z`),
        notes: enquiryData.notes || null,

        // Status intentionally starts as NEW.
        status: "NEW",

        items: {
          create: enquiryData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },

      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return enquiry;
  });
};

const getEnquiries = async () => {
  return prisma.enquiry.findMany({
    orderBy: {
      createdAt: "desc",
    },

    include: {
      customer: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

const getEnquiryById = async (enquiryId) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: {
      id: enquiryId,
    },

    include: {
      customer: true,

      items: {
        include: {
          product: true,
        },
      },

      quotations: true,
    },
  });

  if (!enquiry) {
    const error = new Error("Enquiry not found");
    error.statusCode = 404;
    throw error;
  }

  return enquiry;
};

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
};