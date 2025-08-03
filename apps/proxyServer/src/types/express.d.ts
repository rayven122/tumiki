import type { VerifyJwtResult } from "express-oauth2-jwt-bearer";

declare module "express-serve-static-core" {
  interface Request {
    auth?: VerifyJwtResult;
  }
}
