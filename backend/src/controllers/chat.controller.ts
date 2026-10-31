import type { Request, Response } from "express";
import { chatService } from "../services/chat.service";

export const chatController = {
  async sendMessage(req: Request, res: Response) {
    res.json(await chatService.sendMessage(req.body, req.user!.id));
  },

  async history(req: Request, res: Response) {
    res.json(await chatService.history(String(req.params.conversationId), req.user!.id));
  },
};
