import { Controller, Get, Param } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('municipios')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  async listar() {
    return this.tenantService.listarAtivos();
  }

  @Get(':slug/config')
  async buscarConfig(@Param('slug') slug: string) {
    return this.tenantService.buscarConfigPublicaPorSlug(slug);
  }
}