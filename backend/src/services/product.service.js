const prisma = require("../config/prisma");

const getProducts = async () => {
  return prisma.product.findMany({
    orderBy: {
      productCode: "asc",
    },

    include: {
      inventory: true,
    },
  });
};

const getProductById = async (productId) => {
  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },

    include: {
      inventory: true,
    },
  });

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  return product;
};

module.exports = {
  getProducts,
  getProductById,
};