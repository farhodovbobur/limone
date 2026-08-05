import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  IsNull,
  JoinColumn,
  ManyToOne,
  MoreThan,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export const liveSession = () => ({
  revokedAt: IsNull(),
  expiresAt: MoreThan(new Date()),
});

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Index()
  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by', type: 'int', nullable: true })
  replacedById!: number | null;

  @ManyToOne(() => RefreshToken, { nullable: true })
  @JoinColumn({ name: 'replaced_by' })
  replacedBy!: RefreshToken | null;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  browser!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  os!: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 10, nullable: true })
  deviceType!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  location!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
