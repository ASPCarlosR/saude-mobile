import { Controller, Get, Post, Body, Req, Query, UseGuards, Param, Headers } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncPayloadDto } from './sync.dto';
import { TransporteHandler } from './transporte.handler';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@Controller('api/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) { }

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async sincronizarOffline(
    @Body() payload: SyncPayloadDto,
    @Req() req: any,
    @Headers('x-municipio-slug') slug: string
  ) {
    const usuarioId = req.user?.sub;
    return this.syncService.processar(payload, usuarioId, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pessoas')
  async buscarPessoas(
    @Req() req: any,
    @Headers('x-municipio-slug') slug: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('equipeId') equipeId?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('microArea') microArea?: string,
  ) {
    const usuarioId = req.user?.sub;

    return this.syncService.buscarPessoas(usuarioId, slug, {
      profissionalId: profissionalId ? Number(profissionalId) : 0,
      equipeId: equipeId ? Number(equipeId) : 0,
      unidadeId: unidadeId ? Number(unidadeId) : 0,
      microArea: microArea || '',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('parametros-gerais')
  async obterParametrosGerais(
    @Headers('x-municipio-slug') slug: string,
  ) {
    return this.syncService.obterParametrosGerais(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('domicilios')
  async buscarDomicilios(
    @Req() req: any,
    @Headers('x-municipio-slug') slug: string,
    @Query('profissionalId') profissionalId?: string,
    @Query('equipeId') equipeId?: string,
    @Query('unidadeId') unidadeId?: string,
    @Query('microArea') microArea?: string,
  ) {
    const usuarioId = req.user?.sub;

    return this.syncService.buscarDomicilios(usuarioId, slug, {
      profissionalId: profissionalId ? Number(profissionalId) : 0,
      equipeId: equipeId ? Number(equipeId) : 0,
      unidadeId: unidadeId ? Number(unidadeId) : 0,
      microArea: microArea || '',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('pacientes')
  async buscarPacientesAutocomplete(
    @Query('termo') termo: string,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.buscarPacientesAutocomplete(termo, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('familia')
  async buscarFamilia(
    @Query('pessoaId') pessoaId: number,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.buscarFamiliaPorPessoaId(pessoaId, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('enderecos')
  async buscarEnderecosDne(
    @Query('termo') termo: string,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.buscarEnderecosDne(termo, slug);
  }

  @Get('municipios')
  async buscarMunicipios(
    @Query('termo') termo: string,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.listarMunicipiosGeral(termo, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('municipiosCadastros')
  async buscarMunicipiosAutocomplete(
    @Query('termo') termo: string,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.buscarMunicipiosAutocomplete(termo, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('indicadores-aps-pendentes')
  async listarIndicadoresApsPendentes(
    @Query('profissionalId') profissionalId: string,
    @Headers('x-municipio-slug') slug: string,
  ) {
    return this.syncService.listarIndicadoresApsPendentes(
      Number(profissionalId),
      slug,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('agendamento/profissionais')
  async buscarProfissionaisAgenda(
    @Headers('x-municipio-slug') slug: string,
  ) {
    return this.syncService.buscarProfissionaisAgenda(slug);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agendamento/vagas')
  async buscarVagasDisponiveis(
    @Headers('x-municipio-slug') slug: string,
    @Query('data') data: string,
    @Query('profissionalId') profissionalId?: string,
  ) {
    return this.syncService.buscarVagasDisponiveis(
      data,
      profissionalId ? Number(profissionalId) : null,
      slug,
    );
  }
}

@Controller('transporte')
export class TransporteController {
  constructor(
    private readonly syncService: SyncService,
    private readonly transporteHandler: TransporteHandler,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('viagens')
  async buscarViagens(
    @Req() req: any,
    @Query() filtros: any,
    @Headers('x-municipio-slug') slug: string
  ) {
    const usuarioId = req.user?.sub;
    return this.syncService.buscarViagens(usuarioId, filtros, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('viagem/:id/atualizar')
  async atualizarViagem(
    @Param('id') id: string,
    @Body() dados: any,
    @Headers('x-municipio-slug') slug: string
  ) {
    return this.syncService.atualizarViagem(Number(id), dados, slug);
  }
}