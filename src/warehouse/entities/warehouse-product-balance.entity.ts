import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from '../../catalog/entities/product-variant.entity';

@Index('UQ_balance_variant', ['variantId'], { unique: true })
@Entity('warehouse_product_balances')
export class WarehouseProductBalance {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'variant_id', type: 'int' })
  variantId!: number;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ type: 'int' })
  qty!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
