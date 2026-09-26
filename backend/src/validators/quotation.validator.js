const { z } = require("zod");

const quotationItemSchema = z.object({
  productId: z
    .number({
      error: "Product ID must be a number",
    })
    .int("Product ID must be an integer")
    .positive("Product ID must be positive"),

  quantity: z
    .number({
      error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),

  unitPrice: z
    .number({
      error: "Unit price must be a number",
    })
    .nonnegative("Unit price cannot be negative"),

  discountPercent: z
    .number({
      error: "Discount percentage must be a number",
    })
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100"),

  gstPercent: z
    .number({
      error: "GST percentage must be a number",
    })
    .min(0, "GST cannot be negative")
    .max(100, "GST cannot exceed 100"),
});

const createQuotationSchema = z.object({
  enquiryId: z
    .number({
      error: "Enquiry ID must be a number",
    })
    .int("Enquiry ID must be an integer")
    .positive("Enquiry ID must be positive"),

  validUntil: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Valid until date must be in YYYY-MM-DD format"
    ),

  items: z
    .array(quotationItemSchema)
    .min(1, "At least one quotation item is required"),
});

module.exports = {
  createQuotationSchema,
};