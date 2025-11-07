import { Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import crypto from "crypto";

@Injectable()
export class AuthService {
  validateJwt(authorizationHeader?: string): boolean {
    if (!authorizationHeader) return false;
    const parts = authorizationHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return false;
    const token = parts[1];
    const secret = process.env.NEST_JWT_SECRET;
    if (!secret) return false;
    try {
      jwt.verify(token, secret);
      return true;
    } catch {
      return false;
    }
  }

  validateHmac(signatureHeader: string | undefined, body: unknown): boolean {
    if (!signatureHeader) return false;
    const secret = process.env.HMAC_SHARED_SECRET;
    if (!secret) return false;
    const payload =
      typeof body === "string" ? body : JSON.stringify(body ?? {});
    const computed = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(computed)
    );
  }
}
