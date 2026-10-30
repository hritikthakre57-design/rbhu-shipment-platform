import type { Request, Response } from "express";
import { z } from "zod";
import { customerService } from "../services/customer.service";
import { customerStatusEnum } from "../schemas/customer.schema";

const listQuery = z.object({ status: customerStatusEnum.optional() });

export const customerController = {
  async list(req: Request, res: Response) {
    const { status } = listQuery.parse(req.query);
    res.json(await customerService.list(status));
  },

  async get(req: Request, res: Response) {
    res.json(await customerService.get(String(req.params.id)));
  },

  async create(req: Request, res: Response) {
    const created = await customerService.create(req.body, req.user!.id);
    res.status(201).json(created);
  },

  async update(req: Request, res: Response) {
    res.json(await customerService.update(String(req.params.id), req.body, req.user!.id));
  },

  async remove(req: Request, res: Response) {
    await customerService.remove(String(req.params.id), req.user!.id);
    res.status(204).send();
  },
};