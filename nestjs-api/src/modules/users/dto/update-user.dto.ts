import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  fullName?: string;

  @ApiProperty({ required: false })
  roleCode?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;

  @ApiProperty({ required: false })
  password?: string;
}
