import { UserEntity } from '../../users/entities/user.entity';

export interface AuthProvider {
  authenticate(credentials: any): Promise<UserEntity | null>;
}
