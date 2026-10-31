import { ShipmentStatus } from "@prisma/client";
import { shipmentRepository } from "../repositories/shipment.repository";
import { customerRepository } from "../repositories/customer.repository";
import { appEvents, ShipmentStatusChangedEvent } from "../lib/events";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors";
import type { CreateShipmentInput } from "../schemas/shipment.schema";

const FINAL_STATUSES: ShipmentStatus[] = ["Delivered", "Cancelled"];

export const shipmentService = {
  list(status?: ShipmentStatus) {
    return shipmentRepository.findAll(status);
  },

  async get(id: string) {
    const shipment = await shipmentRepository.findById(id);
    if (!shipment) throw new NotFoundError("Shipment");
    return shipment;
  },

  findByTrackingNumber(trackingNumber: string) {
    return shipmentRepository.findByTrackingNumber(trackingNumber);
  },

  async create(input: CreateShipmentInput, userId: string) {
    const customer = await customerRepository.findById(input.customerId);
    if (!customer) throw new NotFoundError("Customer");

    const existing = await shipmentRepository.findByTrackingNumber(input.trackingNumber);
    if (existing) throw new ConflictError("Tracking number already exists");

    return shipmentRepository.create(input, userId);
  },

  async updateStatus(id: string, status: ShipmentStatus, userId: string) {
    const current = await this.get(id);

    if (current.status === status) {
      throw new BadRequestError(`Shipment is already ${status}`);
    }
    if (FINAL_STATUSES.includes(current.status)) {
      throw new BadRequestError(`A ${current.status} shipment cannot change status`);
    }

    const updated = await shipmentRepository.updateStatus(id, status, userId);

    const event: ShipmentStatusChangedEvent = {
      event: "shipment_status_changed",
      shipmentId: updated.id,
      status: updated.status,
    };
    appEvents.emit("shipment_status_changed", event);

    return updated;
  },

  async dashboardStats() {
    const [totalCustomers, totalShipments, grouped] = await Promise.all([
      customerRepository.countActive(),
      shipmentRepository.countAll(),
      shipmentRepository.countByStatus(),
    ]);

    const byStatus: Record<string, number> = {
      Created: 0,
      InTransit: 0,
      Delivered: 0,
      Cancelled: 0,
    };
    for (const row of grouped) byStatus[row.status] = row._count._all;

    return { totalCustomers, totalShipments, byStatus };
  },
};
