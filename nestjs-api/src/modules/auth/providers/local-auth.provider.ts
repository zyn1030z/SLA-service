import { Injectable } from '@nestjs/common';
import { AuthProvider } from './auth-provider.interface';
import { UsersService } from '../../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class LocalAuthProvider implements AuthProvider {
  constructor(private readonly usersService: UsersService) {}

  async authenticate(credentials: { username: string; password: string }): Promise<UserEntity | null> {
    const user = await this.usersService.findByUsername(credentials.username);
    if (!user || user.authSource !== 'local' || !user.passwordHash) {
      return null;
    }
    const isMatch = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isMatch) {
      return null;
    }
    return user;
  }
}
