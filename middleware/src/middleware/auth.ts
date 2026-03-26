import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { User } from "../../../backend/src/entities/User";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name: string;
    is_super_admin?: boolean;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";

/**
 * Auth middleware — JWT Bearer token only
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unsupported auth scheme. Use Bearer token." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      full_name: string;
      is_super_admin?: boolean;
    };

    // Verify user still exists in database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: decoded.id });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_super_admin: decoded.is_super_admin || false,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token expired" });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      full_name: string;
      is_super_admin?: boolean;
    };

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: decoded.id });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_super_admin: decoded.is_super_admin || false,
      };
    }
  } catch {
    // Silently ignore token errors for optional auth
  }

  next();
}
