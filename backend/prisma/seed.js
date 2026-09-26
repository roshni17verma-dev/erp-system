const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seed...");

  // ============================================================
  // USERS
  // ============================================================

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const salesPassword = await bcrypt.hash("Sales@123", 10);

  const admin = await prisma.user.upsert({
    where: {
      email: "admin@erp.com",
    },
    update: {},
    create: {
      name: "ERP Admin",
      email: "admin@erp.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const salesUser = await prisma.user.upsert({
    where: {
      email: "sales@erp.com",
    },
    update: {},
    create: {
      name: "Sales User",
      email: "sales@erp.com",
      passwordHash: salesPassword,
      role: "SALES_USER",
    },
  });

  console.log(`Created/verified users: ${admin.email}, ${salesUser.email}`);

  // ============================================================
  // PRODUCTS
  // ============================================================

  const products = [
    {
      productCode: "IND-BRG-001",
      productName: "Industrial Ball Bearing",
      category: "Bearings",
      unit: "Piece",
      basePrice: 1250.00,
      physicalQuantity: 100,
    },
    {
      productCode: "IND-MTR-001",
      productName: "Three Phase Induction Motor",
      category: "Motors",
      unit: "Piece",
      basePrice: 18500.00,
      physicalQuantity: 50,
    },
    {
      productCode: "IND-PMP-001",
      productName: "Centrifugal Water Pump",
      category: "Pumps",
      unit: "Piece",
      basePrice: 12400.00,
      physicalQuantity: 40,
    },
    {
      productCode: "IND-VLV-001",
      productName: "Industrial Gate Valve",
      category: "Valves",
      unit: "Piece",
      basePrice: 4500.00,
      physicalQuantity: 75,
    },
    {
      productCode: "IND-PLC-001",
      productName: "Industrial PLC Controller",
      category: "Automation",
      unit: "Piece",
      basePrice: 32000.00,
      physicalQuantity: 20,
    },
    {
      productCode: "IND-CBL-001",
      productName: "Industrial Power Cable",
      category: "Electrical",
      unit: "Meter",
      basePrice: 185.00,
      physicalQuantity: 1000,
    },
  ];

  for (const productData of products) {
    const { physicalQuantity, ...productFields } = productData;

    const product = await prisma.product.upsert({
      where: {
        productCode: productData.productCode,
      },
      update: {},
      create: productFields,
    });

    await prisma.inventory.upsert({
      where: {
        productId: product.id,
      },
      update: {},
      create: {
        productId: product.id,
        physicalQuantity,
        reservedQuantity: 0,
      },
    });

    console.log(
      `Product ready: ${product.productCode} - ${product.productName}`
    );
  }

  // ============================================================
  // CUSTOMERS
  // ============================================================

  const customers = [
    {
      companyName: "Apex Engineering Solutions",
      contactPerson: "Rahul Mehta",
      mobile: "9876543210",
      email: "rahul@apexengineering.com",
      city: "Mumbai",
    },
    {
      companyName: "Vertex Industrial Systems",
      contactPerson: "Priya Shah",
      mobile: "9820123456",
      email: "priya@vertexindustrial.com",
      city: "Pune",
    },
    {
      companyName: "Prime Manufacturing Pvt Ltd",
      contactPerson: "Amit Patil",
      mobile: "9819234567",
      email: "amit@primemanufacturing.com",
      city: "Nashik",
    },
  ];

  for (const customerData of customers) {
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email: customerData.email,
      },
    });

    if (!existingCustomer) {
      await prisma.customer.create({
        data: customerData,
      });
    }

    console.log(`Customer ready: ${customerData.companyName}`);
  }

  console.log("\nDatabase seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });