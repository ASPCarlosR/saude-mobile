import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TenantEntity } from './tenant.entity';
import { normalizarPermissoesTenant as normalizeTenantPermissions} from './tenant-permissions';

@Injectable()
export class TenantService implements OnModuleDestroy {
  private connections = new Map<string, DataSource>();

  constructor(
    @InjectRepository(TenantEntity, 'central')
    private readonly tenantRepo: Repository<TenantEntity>,
  ) {}

  async listarAtivos(): Promise<{ id: number; nome: string; slug: string }[]> {
    const municipios = await this.tenantRepo.find({
      where: { ativo: true },
      select: { id: true, nome: true, slug: true },
      order: { nome: 'ASC' },
    });

    return municipios;
  }

  async buscarPorSlug(slug: string): Promise<TenantEntity> {
    const municipio = await this.tenantRepo.findOne({
      where: { slug, ativo: true },
    });

    if (!municipio) {
      throw new NotFoundException(`Municipio "${slug}" nao encontrado ou inativo.`);
    }

    return municipio;
  }

  async buscarConfigPublicaPorSlug(slug: string) {
    const municipio = await this.buscarPorSlug(slug);

    return {
      id: municipio.id,
      nome: municipio.nome,
      slug: municipio.slug,
      ativo: municipio.ativo,
      app_port: municipio.app_port,
      api_base_url: municipio.api_base_url,
      permissoes: normalizeTenantPermissions(municipio.permissoes),
    };
  }

  async getConexao(slug: string): Promise<DataSource> {
    const existingConnection = this.connections.get(slug);

    if (existingConnection?.isInitialized) {
      return existingConnection;
    }

    const config = await this.buscarPorSlug(slug);

    if (!config.db_host || !config.db_name || !config.db_user || !config.db_pass) {
      throw new NotFoundException(
        `O municipio "${slug}" nao possui configuracao completa de conexao com banco.`,
      );
    }

    const dataSource = new DataSource({
      type: 'postgres',
      host: config.db_host,
      port: config.db_port ?? 5432,
      username: config.db_user,
      password: config.db_pass,
      database: config.db_name,
      synchronize: false,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    });

    await dataSource.initialize();
    this.connections.set(slug, dataSource);

    return dataSource;
  }

  async limparConexao(slug: string): Promise<void> {
    const conn = this.connections.get(slug);

    if (conn?.isInitialized) {
      await conn.destroy();
    }

    this.connections.delete(slug);
  }

  async onModuleDestroy() {
    for (const [slug, conn] of this.connections.entries()) {
      if (conn.isInitialized) {
        await conn.destroy();
        console.log(`Conexao encerrada: ${slug}`);
      }
    }

    this.connections.clear();
  }
}
