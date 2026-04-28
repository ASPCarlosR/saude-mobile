import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'municipios' })
export class TenantEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nome', type: 'varchar', length: 100 })
  nome!: string;

  @Column({ name: 'slug', type: 'varchar', length: 50, unique: true })
  slug!: string;

  @Column({ name: 'db_host', type: 'varchar', length: 200, nullable: true })
  db_host!: string | null;

  @Column({ name: 'db_port', type: 'int', nullable: true, default: 5432 })
  db_port!: number | null;

  @Column({ name: 'db_name', type: 'varchar', length: 100, nullable: true })
  db_name!: string | null;

  @Column({ name: 'db_user', type: 'varchar', length: 100, nullable: true })
  db_user!: string | null;

  @Column({ name: 'db_pass', type: 'varchar', length: 255, nullable: true })
  db_pass!: string | null;

  @Column({ name: 'app_port', type: 'int', default: 5434 })
  app_port!: number;

  @Column({ name: 'ativo', type: 'boolean', default: true })
  ativo!: boolean;

  @Column({ name: 'api_base_url', type: 'varchar', length: 255, nullable: true })
  api_base_url!: string | null;

  @Column({ name: 'permissoes', type: 'jsonb', default: {} })
  permissoes!: Record<string, boolean>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at!: Date;
}