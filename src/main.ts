import { NestFactory } from '@nestjs/core';
import { AppModule } from '../backend/src/app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Permite que o app mobile (Expo) consiga fazer as requisições
  
  // Aumenta o limite do tamanho do payload para suportar as assinaturas em Base64
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  await app.listen(3000, '0.0.0.0');
  console.log('Backend de Sincronização do e-SUS rodando na porta 3000');
}
bootstrap();