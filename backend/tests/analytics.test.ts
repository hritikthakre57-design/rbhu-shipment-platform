import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app";

let auth: { Authorization: string };

beforeAll(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "Admin@123" });
  auth = { Authorization: `Bearer ${res.body.token}` };
});

afterEach(() => vi.restoreAllMocks());

describe("analytics", () => {
  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/analytics/analyze");
    expect(res.status).toBe(401);
  });

  it("rejects a request without a file", async () => {
    const res = await request(app).post("/api/analytics/analyze").set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("A CSV file is required");
  });

  it("rejects a non-CSV file", async () => {
    const res = await request(app)
      .post("/api/analytics/analyze")
      .set(auth)
      .attach("file", Buffer.from("hello"), "sales.txt");
    expect(res.status).toBe(400);
  });

  it("returns the analytics service response", async () => {
    const body = { summary: { rowCount: 1 }, charts: {}, warnings: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 })
    );

    const res = await request(app)
      .post("/api/analytics/analyze")
      .set(auth)
      .attach("file", Buffer.from("salesperson,revenue,region\nA,1,West\n"), "sales.csv");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(body);
  });

  it("passes a Flask 400 message through", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "MISSING_COLUMNS", message: "Required columns are missing" } }),
        { status: 400 }
      )
    );

    const res = await request(app)
      .post("/api/analytics/analyze")
      .set(auth)
      .attach("file", Buffer.from("salesperson\nA\n"), "sales.csv");

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Required columns are missing");
  });

  it("maps an unreachable Flask service to 502", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connect failed"));

    const res = await request(app)
      .post("/api/analytics/analyze")
      .set(auth)
      .attach("file", Buffer.from("salesperson,revenue,region\nA,1,West\n"), "sales.csv");

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("ANALYTICS_UNAVAILABLE");
  });
});
