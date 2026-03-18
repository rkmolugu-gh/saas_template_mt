import { Request } from "express";

/**
 * Get route parameter as string
 */
export function getParam(req: Request, name: string): string {
  const param = req.params[name];
  return Array.isArray(param) ? param[0] : param || "";
}

/**
 * Get route parameter as string or throw if missing
 */
export function getParamOrFail(req: Request, name: string): string {
  const param = getParam(req, name);
  if (!param) {
    throw new Error(`Parameter '${name}' is required`);
  }
  return param;
}
