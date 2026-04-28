import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './constants'; // ADICIONADO

class LoginDto {
  municipio: string = ''; 
  login: string = '';
  senha: string = '';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public() // EXCELÊNCIA: Permite que essa rota seja acessada sem token
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.municipio, body.login, body.senha);
  }
}