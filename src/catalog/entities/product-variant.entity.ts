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
import { Color } from './color.entity';
import { Product } from './product.entity';
import { Size } from './size.entity';

@Index('UQ_variant_one_colour', ['productId', 'sizeId', 'colorId'], {
  unique: true,
  where: '"color2_id" IS NULL',
})
@Index(
  'UQ_variant_two_colours',
  ['productId', 'sizeId', 'colorId', 'color2Id'],
  { unique: true, where: '"color2_id" IS NOT NULL' },
)
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'product_id', type: 'int' })
  productId!: number;

  @ManyToOne(() => Product, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Index()
  @Column({ name: 'size_id', type: 'int' })
  sizeId!: number;

  @ManyToOne(() => Size, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'size_id' })
  size!: Size;

  @Index()
  @Column({ name: 'color_id', type: 'int' })
  colorId!: number;

  @ManyToOne(() => Color, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'color_id' })
  color!: Color;

  @Index()
  @Column({ name: 'color2_id', type: 'int', nullable: true })
  color2Id!: number | null;

  @ManyToOne(() => Color, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'color2_id' })
  color2!: Color | null;

  @Column({ type: 'varchar', length: 60, unique: true })
  sku!: string;

  @Column({ name: 'min_stock', type: 'int', default: 0 })
  minStock!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
