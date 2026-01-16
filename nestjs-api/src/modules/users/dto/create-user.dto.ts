import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  password?: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  roleCode: string;

  @ApiProperty({ required: false, default: true })
  isActive?: boolean;
}
