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
import { Currency } from '../../shared/enums/currency.enum';
import { User } from '../../users/entities/user.entity';

@Index('IDX_price_variant_date', ['variantId', 'date', 'id'])
@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'variant_id', type: 'int' })
  variantId!: number;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: Currency;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true })
  rate!: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  cost!: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  price!: string;

  /** Cache: `price − cost`. */
  @Column({
    name: 'markup_fixed',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  markupFixed!: string | null;

  @Column({ name: 'markup_percent', type: 'numeric', nullable: true })
  markupPercent!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
