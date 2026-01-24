import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username must contain only letters, numbers and underscores' })
  username: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(6, 100)
  password?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roleCode: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  isActive?: boolean;
}
