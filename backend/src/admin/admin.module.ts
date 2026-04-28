import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '../tenant/tenant.entity';
import { AdminMunicipiosController } from './admin-municipios.controller';
import { AdminMunicipiosService } from './admin-municipios.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity], 'central')],
  controllers: [AdminMunicipiosController],
  providers: [AdminMunicipiosService],
})
export class AdminModule {}
