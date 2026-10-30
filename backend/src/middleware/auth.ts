
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }

  req.user = {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
  };
  next();
}