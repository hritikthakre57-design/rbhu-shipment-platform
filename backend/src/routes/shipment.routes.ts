import { Router } from "express";
import { shipmentController } from "../controllers/shipment.controller";
import { validateBody } from "../middleware/validate";
import { createShipmentSchema, updateShipmentStatusSchema } from "../schemas/shipment.schema";

export const shipmentRoutes = Router();

shipmentRoutes.get("/", shipmentController.list);
shipmentRoutes.get("/:id", shipmentController.get);
shipmentRoutes.post("/", validateBody(createShipmentSchema), shipmentController.create);
shipmentRoutes.patch("/:id/status", validateBody(updateShipmentStatusSchema), shipmentController.updateStatus);