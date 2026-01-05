import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export const REQUIRES_TOKEN_KEY = "requiresToken";

@Injectable()
export class TokenGuard implements CanActivate {
  private readonly validToken: string;

  constructor(private reflector: Reflector) {
    // Lấy token từ environment variable, mặc định là "sla-record-api-token-2024"
    this.validToken =
      process.env.RECORD_API_TOKEN || "sla-record-api-token-2024";
  }

  canActivate(context: ExecutionContext): boolean {
    // Kiểm tra xem endpoint có yêu cầu token không
    const requiresToken = this.reflector.getAllAndOverride<boolean>(
      REQUIRES_TOKEN_KEY,
      [context.getHandler(), context.getClass()]
    );

    // Nếu không yêu cầu token, cho phép truy cập
    if (!requiresToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers["x-api-token"] || request.headers["api-token"];

    if (!token) {
      throw new UnauthorizedException(
        "API token is required. Please provide token in 'x-api-token' or 'api-token' header."
      );
    }

    if (token !== this.validToken) {
      throw new UnauthorizedException("Invalid API token.");
    }

    return true;
  }
}

