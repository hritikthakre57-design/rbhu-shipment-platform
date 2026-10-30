import { CustomerStatus } from "@prisma/client";
import { customerRepository } from "../repositories/customer.repository";
import { ConflictError, NotFoundError } from "../lib/errors";
import type { CreateCustomerInput, UpdateCustomerInput } from "../schemas/customer.schema";

export const customerService = {
  list(status?: CustomerStatus) {
    return customerRepository.findAll(status);
  },

  async get(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw new NotFoundError("Customer");
    return customer;
  },

  async create(input: CreateCustomerInput, userId: string) {
    const existing = await customerRepository.findByEmail(input.email);
    if (existing) throw new ConflictError("Customer with this email already exists");
    return customerRepository.create(input, userId);
  },

  async update(id: string, input: UpdateCustomerInput, userId: string) {
    const current = await this.get(id);
    if (input.email && input.email !== current.email) {
      const taken = await customerRepository.findByEmail(input.email);
      if (taken) throw new ConflictError("Customer with this email already exists");
    }
    return customerRepository.update(id, input, userId);
  },

  async remove(id: string, userId: string) {
    await this.get(id);
    await customerRepository.softDelete(id, userId);
  },
};