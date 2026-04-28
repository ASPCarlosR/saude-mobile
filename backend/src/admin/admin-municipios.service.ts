import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../tenant/tenant.entity';
import { TenantService } from '../tenant/tenant.service';
import { normalizeTenantPermissions } from '../tenant/tenant-permissions';

@Injectable()
export class AdminMunicipiosService {
  constructor(
    @InjectRepository(TenantEntity, 'central')
    private readonly repo: Repository<TenantEntity>,
    private readonly tenantService: TenantService,
  ) {}

  listarTodos() {
    return this.repo.find({
      order: { nome: 'ASC' },
    });
  }

  async buscarUm(id: number) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    return municipio;
  }

  async criar(data: Partial<TenantEntity>) {
    const municipio = this.repo.create({
      nome: data.nome,
      slug: data.slug,
      db_host: data.db_host,
      db_port: data.db_port ?? 5432,
      db_name: data.db_name,
      db_user: data.db_user,
      db_pass: data.db_pass,
      app_port: data.app_port ?? 5434,
      ativo: data.ativo ?? true,
      api_base_url: data.api_base_url ?? null,
      permissoes: normalizeTenantPermissions(data.permissoes),
    });

    return this.repo.save(municipio);
  }

  async atualizar(id: number, data: Partial<TenantEntity>) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    Object.assign(municipio, {
      ...(data.nome !== undefined ? { nome: data.nome } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.db_host !== undefined ? { db_host: data.db_host } : {}),
      ...(data.db_port !== undefined ? { db_port: data.db_port } : {}),
      ...(data.db_name !== undefined ? { db_name: data.db_name } : {}),
      ...(data.db_user !== undefined ? { db_user: data.db_user } : {}),
      ...(data.db_pass !== undefined ? { db_pass: data.db_pass } : {}),
      ...(data.app_port !== undefined ? { app_port: data.app_port } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      ...(data.api_base_url !== undefined ? { api_base_url: data.api_base_url } : {}),
      ...(data.permissoes !== undefined
        ? { permissoes: normalizeTenantPermissions(data.permissoes) }
        : {}),
    });

    const salvo = await this.repo.save(municipio);

    await this.tenantService.limparConexao(salvo.slug);

    return salvo;
  }

  async remover(id: number) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    await this.tenantService.limparConexao(municipio.slug);
    await this.repo.delete(id);

    return { mensagem: 'Municipio removido com sucesso.' };
  }
}
