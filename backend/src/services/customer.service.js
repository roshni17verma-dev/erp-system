const prisma = require("../config/prisma");

const createCustomer = async (customerData) => {
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        {
          email: customerData.email,
        },
        {
          mobile: customerData.mobile,
        },
      ],
    },
  });

  if (existingCustomer) {
    const duplicateField =
      existingCustomer.email === customerData.email
        ? "email"
        : "mobile number";

    const error = new Error(
      `A customer with this ${duplicateField} already exists`
    );

    error.statusCode = 409;

    throw error;
  }

  return prisma.customer.create({
    data: customerData,
  });
};

const getCustomers = async () => {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getCustomerById = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    const error = new Error("Customer not found");

    error.statusCode = 404;

    throw error;
  }

  return customer;
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
};