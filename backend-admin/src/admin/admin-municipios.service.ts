import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { EncryptionService } from '../common/encryption.service';
import { TenantEntity } from '../tenants/entities/tenant.entity';
import { SaveMunicipioDto, UpdateMunicipioDto } from './dto';

@Injectable()
export class AdminMunicipiosService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
    private readonly encryption: EncryptionService,
  ) {}

  async listarTodos() {
    const itens = await this.repo.find({ order: { nome: 'ASC' } });
    return itens.map((item) => this.toListResponse(item));
  }

  async buscarUm(id: number) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    return this.toDetailResponse(municipio);
  }

  async criar(data: SaveMunicipioDto) {
    await this.ensureSlugAvailable(data.slug);

    const municipio = this.repo.create({
      nome: data.nome.trim(),
      slug: this.normalizeSlug(data.slug),
      db_host: this.normalizeNullableString(data.db_host),
      db_port: data.db_port ?? 5432,
      db_name: this.normalizeNullableString(data.db_name),
      db_user: this.normalizeNullableString(data.db_user),
      db_pass: this.normalizePassword(data.db_pass),
      app_port: data.app_port ?? 5434,
      ativo: data.ativo ?? true,
      api_base_url: this.normalizeNullableString(data.api_base_url),
      permissoes: data.permissoes ?? {},
    });

    const saved = await this.saveMunicipio(municipio);
    return this.buscarUm(saved.id);
  }

  async atualizar(id: number, data: UpdateMunicipioDto) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    if (typeof data.slug === 'string') {
      const normalizedSlug = this.normalizeSlug(data.slug);
      if (normalizedSlug !== municipio.slug) {
        await this.ensureSlugAvailable(normalizedSlug, id);
        municipio.slug = normalizedSlug;
      }
    }

    if (typeof data.nome === 'string') municipio.nome = data.nome.trim();
    if (data.db_host !== undefined) municipio.db_host = this.normalizeNullableString(data.db_host);
    if (data.db_port !== undefined) municipio.db_port = data.db_port;
    if (data.db_name !== undefined) municipio.db_name = this.normalizeNullableString(data.db_name);
    if (data.db_user !== undefined) municipio.db_user = this.normalizeNullableString(data.db_user);
    if (data.app_port !== undefined) municipio.app_port = data.app_port;
    if (data.ativo !== undefined) municipio.ativo = data.ativo;
    if (data.api_base_url !== undefined) {
      municipio.api_base_url = this.normalizeNullableString(data.api_base_url);
    }
    if (data.permissoes !== undefined) municipio.permissoes = data.permissoes;
    if (typeof data.db_pass === 'string' && data.db_pass.trim() !== '') {
      municipio.db_pass = this.encryption.encrypt(data.db_pass.trim());
    }

    await this.saveMunicipio(municipio);
    return this.buscarUm(id);
  }

  async remover(id: number) {
    const municipio = await this.repo.findOne({ where: { id } });

    if (!municipio) {
      throw new NotFoundException('Municipio nao encontrado.');
    }

    await this.repo.delete(id);
    return { mensagem: 'Municipio removido com sucesso.' };
  }

  private toListResponse(municipio: TenantEntity) {
    return {
      id: municipio.id,
      nome: municipio.nome,
      slug: municipio.slug,
      ativo: municipio.ativo,
      app_port: municipio.app_port,
      api_base_url: municipio.api_base_url,
      permissoes: municipio.permissoes ?? {},
      created_at: municipio.created_at,
      updated_at: municipio.updated_at,
    };
  }

  private toDetailResponse(municipio: TenantEntity) {
    return {
      ...this.toListResponse(municipio),
      db_host: municipio.db_host,
      db_port: municipio.db_port,
      db_name: municipio.db_name,
      db_user: municipio.db_user,
    };
  }

  private normalizeSlug(slug: string) {
    return String(slug).trim().toLowerCase();
  }

  private normalizeNullableString(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
  }

  private normalizePassword(value?: string | null) {
    const normalized = this.normalizeNullableString(value);
    return normalized ? this.encryption.encrypt(normalized) : null;
  }

  private async ensureSlugAvailable(slug: string, currentId?: number) {
    const existing = await this.repo.findOne({
      where: { slug: this.normalizeSlug(slug) },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Ja existe um municipio com este slug.');
    }
  }

  private async saveMunicipio(municipio: TenantEntity) {
    try {
      return await this.repo.save(municipio);
    } catch (error) {
      const driverCode = (error as { driverError?: { code?: string } })?.driverError?.code;

      if (error instanceof QueryFailedError && driverCode === '23505') {
        throw new ConflictException('Ja existe um municipio com este slug.');
      }

      throw error;
    }
  }
}
