import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { shipmentController } from "../controllers/shipment.controller";
import { authRoutes } from "./auth.routes";
import { customerRoutes } from "./customer.routes";
import { shipmentRoutes } from "./shipment.routes";
import { analyticsRoutes } from "./analytics.routes";
import { chatRoutes } from "./chat.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/customers", authenticate, customerRoutes);
apiRouter.use("/shipments", authenticate, shipmentRoutes);
apiRouter.get("/dashboard", authenticate, shipmentController.dashboard);
apiRouter.use("/analytics", authenticate, analyticsRoutes);
apiRouter.use("/chat", authenticate, chatRoutes);
