const { z } = require("zod");

const createCustomerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(150, "Company name must not exceed 150 characters"),

  contactPerson: z
    .string()
    .trim()
    .min(2, "Contact person must be at least 2 characters")
    .max(100, "Contact person must not exceed 100 characters"),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must contain exactly 10 digits"),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address"),

  city: z
    .string()
    .trim()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must not exceed 100 characters"),
});

module.exports = {
  createCustomerSchema,
};