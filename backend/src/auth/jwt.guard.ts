import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core'; // ADICIONADO
import { IS_PUBLIC_KEY } from './constants'; // O decorator que criamos

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector, // INJETADO
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Verifica se a rota ou a classe tem o decorator @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // LIBERA O ACESSO SEM TOKEN
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       // Aqui ele vai disparar o log de undefined se alguém tentar acessar
       // uma rota PROTEGIDA (tipo buscar paciente) sem token.
       return false; 
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}