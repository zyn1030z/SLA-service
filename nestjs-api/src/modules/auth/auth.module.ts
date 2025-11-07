import { Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";

@Module({
  providers: [
    AuthService,
    Reflector,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
