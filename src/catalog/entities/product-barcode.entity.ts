import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProductVariant } from './product-variant.entity';

export enum BarcodeType {
  /** Born with the variant, printed on our own labels. Never client-supplied. */
  INTERNAL = 'INTERNAL',
  /** A real GTIN — validated (13 digits, check digit) when entered. */
  EAN13 = 'EAN13',
  /** Whatever a supplier printed; arbitrary, learned at goods-in. */
  SUPPLIER = 'SUPPLIER',
}

@Index('UQ_barcode_internal_per_variant', ['variantId'], {
  unique: true,
  where: `"type" = 'INTERNAL'`,
})
@Entity('product_barcodes')
export class ProductBarcode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'variant_id', type: 'int' })
  variantId!: number;

  @ManyToOne(() => ProductVariant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'variant_id' })
  variant!: ProductVariant;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: BarcodeType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
