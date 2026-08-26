import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('document_counters')
export class DocumentCounter {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  scope!: string;

  @Column({ type: 'bigint' })
  current!: string;
}
