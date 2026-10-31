import { Router } from "express";
import { chatController } from "../controllers/chat.controller";
import { validateBody } from "../middleware/validate";
import { chatMessageSchema } from "../schemas/chat.schema";

export const chatRoutes = Router();

chatRoutes.post("/", validateBody(chatMessageSchema), chatController.sendMessage);
chatRoutes.get("/:conversationId", chatController.history);
