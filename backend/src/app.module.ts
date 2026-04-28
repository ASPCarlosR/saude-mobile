import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SyncModule } from './sync/handlers/sync.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantEntity } from './tenant/tenant.entity';



@Module({
  imports: [
    // 1º: Carrega o .env REAL antes de tudo
    ConfigModule.forRoot({
      isGlobal: true,
      // Adicionamos o '.env' sem o '.example' para o NestJS ler sua chave real
      envFilePath: [
        '.env', 
        'backend/.env', 
        'backend/src/.env', 
        '.env.example'
      ], 
    }),

    // 2º: Conecta ao banco central usando os dados do seu .env
    TypeOrmModule.forRootAsync({
      name: 'central',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('CENTRAL_DB_HOST');
        const pass = configService.get<string>('CENTRAL_DB_PASS');

        // Se o .env for carregado corretamente, esse erro não aparece mais
        if (!host || !pass) {
          throw new Error(
            '\n\n🛑 FALTA DE CONFIGURAÇÃO NO .env 🛑\n' +
            'Verifique se o arquivo ".env" está na pasta correta!'
          );
        }

        return {
          type: 'postgres',
          host,
          port: parseInt(configService.get<string>('CENTRAL_DB_PORT') || '5434', 10),
          username: configService.get<string>('CENTRAL_DB_USER'),
          password: pass,
          database: configService.get<string>('CENTRAL_DB_NAME'), // 'municipios'
          entities: [TenantEntity],
          synchronize: true, // Mantém true enquanto estivermos em dev
        };
      },
    }),

    TenantModule,
    AuthModule,
    SyncModule,
    
  ],
})
export class AppModule { }