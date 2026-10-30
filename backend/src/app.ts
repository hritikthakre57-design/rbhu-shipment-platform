import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export const app = express();

// openapi.yaml sits next to package.json; npm scripts run from backend/
const openApiDoc = parse(
  fs.readFileSync(path.resolve(process.cwd(), "openapi.yaml"), "utf8")
);

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "shipment-api" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);