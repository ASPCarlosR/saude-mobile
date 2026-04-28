import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SaveMunicipioDto, UpdateMunicipioDto } from './dto';
import { JwtGuard } from './jwt.guard';
import { AdminMunicipiosService } from './admin-municipios.service';

@UseGuards(JwtGuard)
@Controller('admin/municipios')
export class AdminMunicipiosController {
  constructor(private readonly service: AdminMunicipiosService) {}

  @Get()
  findAll() {
    return this.service.listarTodos();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarUm(id);
  }

  @Post()
  create(@Body() dto: SaveMunicipioDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMunicipioDto,
  ) {
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remover(id);
  }
}
