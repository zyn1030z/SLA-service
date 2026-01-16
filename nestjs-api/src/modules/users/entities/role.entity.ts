import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('roles')
export class RoleEntity {
  @PrimaryColumn()
  code: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: [] })
  permissions: string[];
}
