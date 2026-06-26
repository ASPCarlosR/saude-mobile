import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { TenantPermissoes } from '../../../src/types/tentant';

@Entity('municipios')
export class TenantEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nome!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  db_host!: string | null;

  @Column({ type: 'int', default: 5432, nullable: true })
  db_port!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  db_name!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  db_user!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  db_pass!: string | null;

  @Column({ type: 'int', default: 5434 })
  app_port!: number;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  api_base_url!: string | null;

  @Column({ type: 'jsonb', default: {} })
  permissoes!: TenantPermissoes;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
