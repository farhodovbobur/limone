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
import { User } from '../../users/entities/user.entity';

export enum DocumentType {
  /** "What was in the room on day one" — the only way stock exists before production. */
  OPENING = 'OPENING',
  ISSUE = 'ISSUE',
  /**
   * The correction a physical count produces: the shelf says one thing, the
   * ledger another, and this is the row that reconciles them.
   */
  ADJUSTMENT = 'ADJUSTMENT',
  /** The exact negation of another document — how a mistake is corrected (D3). */
  REVERSAL = 'REVERSAL',
}

@Entity('warehouse_product_documents')
export class WarehouseProductDocument {
  @PrimaryGeneratedColumn()
  id!: number;

  /** `ISS-2026-000123`. Generated from `document_counters`, never from MAX()+1. */
  @Column({ type: 'varchar', length: 30, unique: true })
  number!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: DocumentType;

  @Column({ type: 'date' })
  date!: string;

  @Column({
    name: 'client_ref',
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: true,
  })
  clientRef!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Index('UQ_document_reverses', ['reversesDocumentId'], {
    unique: true,
    where: '"reverses_document_id" IS NOT NULL',
  })
  @Column({ name: 'reverses_document_id', type: 'int', nullable: true })
  reversesDocumentId!: number | null;

  @ManyToOne(() => WarehouseProductDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reverses_document_id' })
  reverses!: WarehouseProductDocument | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
