const { z } = require("zod");

const updateInventorySchema = z.object({
  physicalQuantity: z
    .number({
      error: "Physical quantity must be a number",
    })
    .int("Physical quantity must be an integer")
    .nonnegative("Physical quantity cannot be negative"),
});

module.exports = {
  updateInventorySchema,
};