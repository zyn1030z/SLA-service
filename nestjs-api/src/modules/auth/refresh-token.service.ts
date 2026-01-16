import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class RefreshTokenService {
  private readonly EXPIRATION_DAYS = 7;

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
  ) {}

  async createRefreshToken(user: UserEntity): Promise<string> {
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(randomSecret, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.EXPIRATION_DAYS);

    const tokenEntity = this.refreshTokenRepository.create({
      user,
      tokenHash,
      expiresAt,
    });

    const savedToken = await this.refreshTokenRepository.save(tokenEntity);
    
    // Return opaque token: id + . + secret
    return `${savedToken.id}.${randomSecret}`;
  }

  async validateRefreshToken(token: string): Promise<UserEntity | null> {
    const [id, secret] = token.split('.');
    if (!id || !secret) return null;

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!tokenEntity || tokenEntity.isRevoked) return null;
    if (tokenEntity.expiresAt < new Date()) return null;

    const isMatch = await bcrypt.compare(secret, tokenEntity.tokenHash);
    if (!isMatch) return null;

    return tokenEntity.user;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const [id] = token.split('.');
    if (!id) return;
    await this.refreshTokenRepository.update(id, { isRevoked: true });
  }
  
  async revokeUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
  }
}
