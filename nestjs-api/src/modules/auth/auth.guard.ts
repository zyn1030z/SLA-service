import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";

export const IS_PUBLIC_KEY = "isPublic";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authz: string | undefined = request.headers["authorization"];
    const signature: string | undefined = request.headers["x-signature"];

    if (this.authService.validateJwt(authz)) return true;
    if (
      this.authService.validateHmac(signature, request.rawBody ?? request.body)
    )
      return true;

    return false;
  }
}
