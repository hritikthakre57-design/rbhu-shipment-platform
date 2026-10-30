import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("auth", () => {
  it("logs in with valid credentials and returns a token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "Admin@123" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("admin@example.com");
  });

  it("rejects a wrong password with 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a protected route without a token with 401", async () => {
    const res = await request(app).get("/api/customers");

    expect(res.status).toBe(401);
  });

  it("rejects an empty login body with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});