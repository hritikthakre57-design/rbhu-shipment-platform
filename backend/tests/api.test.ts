import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app";

let auth: { Authorization: string };
const unique = Date.now();

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "Admin@123" });
  auth = { Authorization: `Bearer ${res.body.token}` };
});

describe("customers", () => {
  it("rejects invalid input with 400 and field details", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set(auth)
      .send({ name: "", email: "not-an-email", company: "X" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/api/customers")
      .set(auth)
      .send({ name: "Dup", email: "asha@acme.com", company: "Acme" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("soft deletes: customer disappears from list and by-id, returns 404", async () => {
    const created = await request(app)
      .post("/api/customers")
      .set(auth)
      .send({ name: "Test Del", email: `del-${unique}@example.com`, company: "TestCo" });
    expect(created.status).toBe(201);
    const id = created.body.id;

    const del = await request(app).delete(`/api/customers/${id}`).set(auth);
    expect(del.status).toBe(204);

    const list = await request(app).get("/api/customers").set(auth);
    expect(list.body.some((c: { id: string }) => c.id === id)).toBe(false);

    const one = await request(app).get(`/api/customers/${id}`).set(auth);
    expect(one.status).toBe(404);
  });
});

describe("shipments", () => {
  it("creates a shipment, changes status, then blocks invalid transitions", async () => {
    const customers = await request(app).get("/api/customers").set(auth);
    const customerId = customers.body[0].id;

    const created = await request(app)
      .post("/api/shipments")
      .set(auth)
      .send({
        trackingNumber: `TST-${unique}`,
        customerId,
        origin: "Mumbai",
        destination: "Pune",
      });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("Created");
    const id = created.body.id;

    const moved = await request(app)
      .patch(`/api/shipments/${id}/status`)
      .set(auth)
      .send({ status: "InTransit" });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe("InTransit");

    const same = await request(app)
      .patch(`/api/shipments/${id}/status`)
      .set(auth)
      .send({ status: "InTransit" });
    expect(same.status).toBe(400);

    const bad = await request(app)
      .patch(`/api/shipments/${id}/status`)
      .set(auth)
      .send({ status: "Flying" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");

    await request(app).patch(`/api/shipments/${id}/status`).set(auth).send({ status: "Delivered" });
    const final = await request(app)
      .patch(`/api/shipments/${id}/status`)
      .set(auth)
      .send({ status: "Cancelled" });
    expect(final.status).toBe(400);
  });

  it("rejects a duplicate tracking number with 409", async () => {
    const customers = await request(app).get("/api/customers").set(auth);
    const res = await request(app)
      .post("/api/shipments")
      .set(auth)
      .send({
        trackingNumber: "TRK-1001",
        customerId: customers.body[0].id,
        origin: "A",
        destination: "B",
      });
    expect(res.status).toBe(409);
  });
});