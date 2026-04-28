// sync.module.ts
import { Module } from '@nestjs/common';
import { SyncController, TransporteController } from './sync.controller';
import { SyncService } from './sync.service';
import { TenantModule } from '../../tenant/tenant.module'; // Importe o módulo do TenantService
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'
// IMPORTANTE: Importar TODOS os handlers
import { PessoaHandler } from './pessoa.handler';
import { VisitaHandler } from './visita.handler';
import { DomicilioHandler } from './domicilio.handler';
import { AtendimentoDomiciliarHandler } from './atendimento-domiciliar.handler';
import { AtividadeColetivaHandler } from './atividade-coletiva.handler';
import { ElegibilidadeHandler } from './elegibilidade.handler';
import { ConsumoAlimentarHandler } from './consumo-alimentar.handler';
import { TransporteHandler } from './transporte.handler';
import { JwtAuthGuard } from '../../auth/jwt.guard'; // Importe o JwtAuthGuard para proteger as rotas

@Module({
  imports: [
    TenantModule,
    ConfigModule, // Garante acesso ao .env
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Busca a chave 'JWT_SECRET' direto do seu arquivo .env
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '365d' },
      }),
    }),
  ],
  controllers: [SyncController, TransporteController],
  providers: [
    SyncService,
    JwtAuthGuard,
    PessoaHandler, // <--- ADICIONE ESTE
    VisitaHandler, // <--- ADICIONE ESTE
    DomicilioHandler,
    AtendimentoDomiciliarHandler,
    AtividadeColetivaHandler,
    ElegibilidadeHandler,
    ConsumoAlimentarHandler,
    TransporteHandler,
  ],
})
export class SyncModule { }