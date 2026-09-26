const { z } = require("zod");

const updateQuotationStatusSchema = z.object({
  status: z.enum(["SENT", "ACCEPTED", "REJECTED"], {
    error: "Status must be SENT, ACCEPTED, or REJECTED",
  }),
});

module.exports = {
  updateQuotationStatusSchema,
};