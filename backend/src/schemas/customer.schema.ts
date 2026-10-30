
import { z } from "zod";

export const customerStatusEnum = z.enum(["Active", "Inactive"]);

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(100),
  email: z.string().trim().toLowerCase().email("invalid email"),
  company: z.string().trim().min(1, "company is required").max(100),
  status: customerStatusEnum.default("Active"),
});

export const updateCustomerSchema = createCustomerSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "at least one field is required",
  });

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;