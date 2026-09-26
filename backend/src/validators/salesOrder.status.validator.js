const { z } = require("zod");

const updateSalesOrderStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"], {
    error: "Status must be CONFIRMED or CANCELLED",
  }),
});

module.exports = {
  updateSalesOrderStatusSchema,
};