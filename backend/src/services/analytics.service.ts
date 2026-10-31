import { AppError, BadRequestError } from "../lib/errors";
import { env } from "../config/env";

interface AnalyticsUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

type AnalyticsResponse = Record<string, unknown>;

const unavailable = () =>
  new AppError(502, "Analytics service is unavailable", "ANALYTICS_UNAVAILABLE");

export const analyticsService = {
  async analyze(file: AnalyticsUpload): Promise<AnalyticsResponse> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "text/csv" }),
      file.originalname
    );

    let response: Response;
    try {
      response = await fetch(`${env.ANALYTICS_URL}/analyze`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw unavailable();
    }

    const body = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string }; [key: string]: unknown }
      | null;

    if (response.status === 400) {
      throw new BadRequestError(body?.error?.message ?? "Analytics request was rejected");
    }
    if (response.status === 413) {
      throw new AppError(
        413,
        body?.error?.message ?? "CSV file must be 5 MB or smaller",
        body?.error?.code ?? "FILE_TOO_LARGE"
      );
    }
    if (!response.ok || !body) throw unavailable();

    return body;
  },
};
