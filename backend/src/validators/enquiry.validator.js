const { z } = require("zod");

const enquiryItemSchema = z.object({
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
});

const createEnquirySchema = z
  .object({
    customerId: z
      .number({
        error: "Customer ID must be a number",
      })
      .int("Customer ID must be an integer")
      .positive("Customer ID must be positive"),

    enquiryDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Enquiry date must be in YYYY-MM-DD format"
      ),

    requiredDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "Required date must be in YYYY-MM-DD format"
      ),

    notes: z
      .string()
      .trim()
      .max(1000, "Notes must not exceed 1000 characters")
      .optional(),

    items: z
      .array(enquiryItemSchema)
      .min(1, "At least one product is required"),
  })
  .refine(
    (data) => data.requiredDate >= data.enquiryDate,
    {
      message: "Required date cannot be before enquiry date",
      path: ["requiredDate"],
    }
  );

module.exports = {
  createEnquirySchema,
};