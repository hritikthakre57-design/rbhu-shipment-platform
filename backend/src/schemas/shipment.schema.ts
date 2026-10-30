import { z } from "zod";

export const shipmentStatusEnum = z.enum([
  "Created",
  "InTransit",
  "Delivered",
  "Cancelled",
]);

export const createShipmentSchema = z.object({
  trackingNumber: z.string().trim().min(3, "trackingNumber is required").max(50),
  customerId: z.string().uuid("customerId must be a valid UUID"),
  origin: z.string().trim().min(1, "origin is required").max(100),
  destination: z.string().trim().min(1, "destination is required").max(100),
});

export const updateShipmentStatusSchema = z.object({
  status: shipmentStatusEnum,
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;