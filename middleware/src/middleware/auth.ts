import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { AppDataSource } from "../data-source";
import { User } from "../../../backend/src/entities/User";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";

/**
 * Parse users.txt for basic auth fallback
 */
function getUsersFromFile(): Array<{ email: string; password_hash: string; full_name: string; role: string }> {
  const filePath = path.join(__dirname, "../../../backend/users.txt");
  if (!fs.existsSync(filePath)) return [];

  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [email, password_hash, full_name, role] = line.split("|");
      return { email: email.trim(), password_hash: password_hash.trim(), full_name: full_name.trim(), role: role.trim() };
    });
}

/**
 * Auth middleware — supports both Basic and Bearer JWT
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  try {
    if (authHeader.startsWith("Bearer ")) {
      // JWT token
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; full_name: string };
      req.user = decoded;
      next();
    } else if (authHeader.startsWith("Basic ")) {
      // Basic auth
      const base64 = authHeader.slice(6);
      const [email, password] = Buffer.from(base64, "base64").toString("utf-8").split(":");

      // Try DB first
      const userRepo = AppDataSource.getRepository(User);
      let dbUser = await userRepo.findOneBy({ email });

      if (dbUser && (await bcrypt.compare(password, dbUser.password_hash))) {
        req.user = { id: dbUser.id, email: dbUser.email, full_name: dbUser.full_name };
        next();
        return;
      }

      // Fallback to users.txt
      const fileUsers = getUsersFromFile();
      const fileUser = fileUsers.find((u) => u.email === email);
      if (fileUser && (await bcrypt.compare(password, fileUser.password_hash))) {
        req.user = { id: "file-user-" + email, email: fileUser.email, full_name: fileUser.full_name };
        next();
        return;
      }

      res.status(401).json({ error: "Invalid credentials" });
    } else {
      res.status(401).json({ error: "Unsupported auth scheme" });
    }
  } catch (err) {
    res.status(401).json({ error: "Authentication failed" });
  }
}
