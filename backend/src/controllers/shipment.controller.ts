import type { Request, Response } from "express";
import { z } from "zod";
import { shipmentService } from "../services/shipment.service";
import { shipmentStatusEnum } from "../schemas/shipment.schema";

const listQuery = z.object({ status: shipmentStatusEnum.optional() });

export const shipmentController = {
  async list(req: Request, res: Response) {
    const { status } = listQuery.parse(req.query);
    res.json(await shipmentService.list(status));
  },

  async get(req: Request, res: Response) {
    res.json(await shipmentService.get(String(req.params.id)));
  },

  async create(req: Request, res: Response) {
    const created = await shipmentService.create(req.body, req.user!.id);
    res.status(201).json(created);
  },

  async updateStatus(req: Request, res: Response) {
    const updated = await shipmentService.updateStatus(
      String(req.params.id),
      req.body.status,
      req.user!.id
    );
    res.json(updated);
  },

  async dashboard(_req: Request, res: Response) {
    res.json(await shipmentService.dashboardStats());
  },
};