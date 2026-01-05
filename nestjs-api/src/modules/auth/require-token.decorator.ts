import { SetMetadata } from "@nestjs/common";
import { REQUIRES_TOKEN_KEY } from "./token.guard";

/**
 * Decorator để yêu cầu token xác thực cho endpoint
 * Token phải được gửi trong header 'x-api-token' hoặc 'api-token'
 */
export const RequireToken = () => SetMetadata(REQUIRES_TOKEN_KEY, true);

