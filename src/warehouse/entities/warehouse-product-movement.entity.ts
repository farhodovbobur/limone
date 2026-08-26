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
import { WarehouseProductDocument } from './warehouse-product-document.entity';

@Index('IDX_movement_variant', ['variantId', 'id'])
@Index('IDX_movement_document', ['documentId'])
@Entity('warehouse_product_movements')
export class WarehouseProductMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'document_id', type: 'int' })
  documentId!: number;

  @ManyToOne(() => WarehouseProductDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_id' })
  document!: WarehouseProductDocument;

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
