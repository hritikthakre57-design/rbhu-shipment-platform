import { Router } from "express";
import { customerController } from "../controllers/customer.controller";
import { validateBody } from "../middleware/validate";
import { createCustomerSchema, updateCustomerSchema } from "../schemas/customer.schema";

export const customerRoutes = Router();

customerRoutes.get("/", customerController.list);
customerRoutes.get("/:id", customerController.get);
customerRoutes.post("/", validateBody(createCustomerSchema), customerController.create);
customerRoutes.patch("/:id", validateBody(updateCustomerSchema), customerController.update);
customerRoutes.delete("/:id", customerController.remove);