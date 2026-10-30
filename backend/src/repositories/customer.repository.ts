import { CustomerStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { CreateCustomerInput, UpdateCustomerInput } from "../schemas/customer.schema";

export const customerRepository = {
  findAll(status?: CustomerStatus) {
    return prisma.customer.findMany({
      where: { deletedAt: null, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.customer.findFirst({ where: { id, deletedAt: null } });
  },

  // Deliberately includes soft-deleted rows: email is unique in the DB,
  // so the service needs to see them to return a clean 409 instead of a crash.
  findByEmail(email: string) {
    return prisma.customer.findUnique({ where: { email } });
  },

  create(data: CreateCustomerInput, userId: string) {
    return prisma.customer.create({
      data: { ...data, createdBy: userId, updatedBy: userId },
    });
  },

  update(id: string, data: UpdateCustomerInput, userId: string) {
    return prisma.customer.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
  },

  softDelete(id: string, userId: string) {
    return prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: userId },
    });
  },

  countActive() {
    return prisma.customer.count({ where: { deletedAt: null } });
  },
};