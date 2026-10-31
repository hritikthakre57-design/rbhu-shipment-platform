import type { Request, Response } from "express";
import { BadRequestError } from "../lib/errors";
import { analyticsService } from "../services/analytics.service";

export const analyticsController = {
  async analyze(req: Request, res: Response) {
    if (!req.file) throw new BadRequestError("A CSV file is required");

    const result = await analyticsService.analyze({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    res.json(result);
  },
};
