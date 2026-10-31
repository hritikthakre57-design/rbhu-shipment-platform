import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { analyticsController } from "../controllers/analytics.controller";
import { AppError, BadRequestError } from "../lib/errors";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      callback(new BadRequestError("Only .csv files are accepted"));
      return;
    }
    callback(null, true);
  },
});

function uploadCsv(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      next(new AppError(413, "CSV file must be 5 MB or smaller", "FILE_TOO_LARGE"));
      return;
    }
    next(error);
  });
}

export const analyticsRoutes = Router();
analyticsRoutes.post("/analyze", uploadCsv, analyticsController.analyze);
