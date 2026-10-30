import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { loginSchema } from "../schemas/auth.schema";

export const authRoutes = Router();

authRoutes.post("/login", validateBody(loginSchema), authController.login);