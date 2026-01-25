import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { LocalAuthProvider } from './providers/local-auth.provider';
import { RefreshTokenService } from './refresh-token.service';
import { UserEntity } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginHistoryEntity } from './entities/login-history.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly localAuthProvider: LocalAuthProvider,
    private readonly refreshTokenService: RefreshTokenService,
    @InjectRepository(LoginHistoryEntity)
    private readonly loginHistoryRepo: Repository<LoginHistoryEntity>,
  ) {}

  validateJwt(token: string | undefined): boolean {
    if (!token) return false;
    try {
      // Remove 'Bearer ' if present
      const cleanToken = token.replace('Bearer ', '');
      const secret = this.configService.get<string>('NEST_JWT_SECRET') || 'default_secret'; // Get secret from ConfigService
      this.jwtService.verify(cleanToken, { secret }); // Pass secret to verify method
      return true;
    } catch (e) {
      return false;
    }
  }

  validateHmac(signature: string | undefined, body: any): boolean {
    if (!signature) return false;
    const secret = process.env.HMAC_SHARED_SECRET;
    if (!secret) {
        Logger.error('HMAC_SHARED_SECRET is not defined');
        return false;
    }
    
    // Normalize body: if object, stringify. If raw buffer, use as is.
    // If usage context implies rawBody, we need consistent serialization.
    // Usually Odoo sends consistent JSON. 
    // Wait, simple HMAC usually relies on consistent string representation.
    // Let's assume standard JSON.stringify for object.
    let payload = '';
    if (typeof body === 'string') {
        payload = body;
    } else if (Buffer.isBuffer(body)) {
        payload = body.toString('utf8');
    } else {
        payload = JSON.stringify(body);
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const calculatedSignature = hmac.digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );
    } catch (e) {
        Logger.error('HMAC Validation Error', e);
        return false;
    }
  }

  async login(credentials: any, ip: string, userAgent: string) {
    // Determine provider. For now, hardcode Local.
    const user = await this.localAuthProvider.authenticate(credentials);
    
    // Log history
    const history = this.loginHistoryRepo.create({
      username: credentials.username,
      ipAddress: ip,
      userAgent: userAgent,
      status: user ? 'success' : 'failed',
      userId: user ? user.id : undefined,
    });
    await this.loginHistoryRepo.save(history);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive');
    }
    if (user.isLocked) {
      throw new ForbiddenException('User is locked');
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    return this.refreshTokenService.revokeRefreshToken(refreshToken);
  }

  async refresh(refreshToken: string) {
    const user = await this.refreshTokenService.validateRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    
    // Revoke old token? 
    // Usually standard practice is to revoke the used refresh token and issue a new one (Rotation).
    await this.refreshLogout(refreshToken);
    
    return this.generateTokens(user);
  }

  private async refreshLogout(refreshToken: string) {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
  }

  private async generateTokens(user: UserEntity) {
    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.roleCode 
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15d' }),
      this.refreshTokenService.createRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.roleCode,
      },
    };
  }
}
