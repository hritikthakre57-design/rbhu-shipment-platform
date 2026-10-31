import { ShipmentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { CreateShipmentInput } from "../schemas/shipment.schema";

const withCustomer = {
  customer: { select: { id: true, name: true, company: true } },
};

export const shipmentRepository = {
  findAll(status?: ShipmentStatus) {
    return prisma.shipment.findMany({
      where: status ? { status } : {},
      include: withCustomer,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.shipment.findUnique({ where: { id }, include: withCustomer });
  },

  findByTrackingNumber(trackingNumber: string) {
    return prisma.shipment.findUnique({ where: { trackingNumber }, include: withCustomer });
  },

  create(data: CreateShipmentInput, userId: string) {
    return prisma.shipment.create({
      data: { ...data, createdBy: userId, updatedBy: userId },
      include: withCustomer,
    });
  },

  updateStatus(id: string, status: ShipmentStatus, userId: string) {
    return prisma.shipment.update({
      where: { id },
      data: { status, updatedBy: userId },
      include: withCustomer,
    });
  },

  countAll() {
    return prisma.shipment.count();
  },

  countByStatus() {
    return prisma.shipment.groupBy({ by: ["status"], _count: { _all: true } });
  },
};
