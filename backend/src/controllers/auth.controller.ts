import type { Request, Response } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    res.json(await authService.login(email, password));
  },
};