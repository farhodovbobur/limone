import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100, nullable: true })
  lastName!: string | null;

  // select: false — never loaded (or serialized) unless explicitly requested at login
  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 150, unique: true, nullable: true })
  email!: string | null;

  @Column({ name: 'role_id', type: 'int' })
  roleId!: number;

  @ManyToOne(() => Role, {
    onDelete: 'NO ACTION',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
