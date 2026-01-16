import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.userRepository.findOne({
      where: [{ username: createUserDto.username }, { email: createUserDto.email }],
    });
    if (existing) {
      throw new BadRequestException('Username or email already exists');
    }

    const user = this.userRepository.create(createUserDto);
    if (createUserDto.password) {
      user.passwordHash = await bcrypt.hash(createUserDto.password, 10);
    }
    user.authSource = 'local'; // Default to local for admin creation
    
    return this.userRepository.save(user);
  }

  async findAll(): Promise<UserEntity[]> {
    return this.userRepository.find({ relations: ['role'] });
  }

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['role']
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ 
      where: { username },
      relations: ['role']
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete updateUserDto.password; // Don't assign plain text if logic changes
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    // Soft delete via UpdateDate or specific logic if needed, but entity doesn't have deletedAt.
    // Requirement said "Soft delete user (không xóa cứng)"
    // I should add `is_active = false` instead of delete, or add deletedAt column.
    // The UserEntity has `isActive`. I will set isActive = false.
    user.isActive = false;
    await this.userRepository.save(user);
  }

  async lock(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    user.isLocked = true;
    return this.userRepository.save(user);
  }

  async unlock(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    user.isLocked = false;
    return this.userRepository.save(user);
  }
}
