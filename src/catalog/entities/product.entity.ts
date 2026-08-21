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
import type { Translations } from '../../shared/i18n/locales';
import { Brand } from './brand.entity';
import { ProductCategory } from './product-category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 150, unique: true })
  name!: string;

  /**
   * Display names by locale, `uz` included. `name` above is the key; this is
   * what a screen shows. See shared/i18n/locales.ts.
   */
  @Column({ type: 'jsonb', default: {} })
  translations!: Translations;

  @Column({ type: 'varchar', length: 30, unique: true, nullable: true })
  code!: string | null;

  @Index()
  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null;

  @ManyToOne(() => ProductCategory, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory | null;

  @Index()
  @Column({ name: 'brand_id', type: 'int', nullable: true })
  brandId!: number | null;

  @ManyToOne(() => Brand, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
