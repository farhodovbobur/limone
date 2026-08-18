import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RateSource {
  MANUAL = 'MANUAL',
  CBU = 'CBU',
}

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date', unique: true })
  date!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  rate!: string;

  @Column({ type: 'varchar', length: 10, default: RateSource.MANUAL })
  source!: RateSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
