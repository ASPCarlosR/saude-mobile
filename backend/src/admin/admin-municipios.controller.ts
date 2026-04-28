import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminMunicipiosService } from './admin-municipios.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin/municipios')
export class AdminMunicipiosController {
  constructor(private readonly service: AdminMunicipiosService) {}

  @Get()
  listarTodos() {
    return this.service.listarTodos();
  }

  @Get(':id')
  buscarUm(@Param('id') id: string) {
    return this.service.buscarUm(Number(id));
  }

  @Post()
  criar(@Body() body: any) {
    return this.service.criar(body);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() body: any) {
    return this.service.atualizar(Number(id), body);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.service.remover(Number(id));
  }
}