import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  login(dto: LoginDto) {
    const email = this.config.get<string>('ADMIN_PANEL_EMAIL');
    const senha = this.config.get<string>('ADMIN_PANEL_PASSWORD');

    if (dto.email !== email || dto.senha !== senha) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const user = { email: dto.email, nome: 'Administrador' };

    return {
      accessToken: this.jwtService.sign({ sub: dto.email, role: 'admin' }),
      user,
    };
  }

  me(payload?: { sub?: string; role?: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return {
      user: {
        email: payload.sub,
        nome: 'Administrador',
        role: payload.role ?? 'admin',
      },
    };
  }
}
