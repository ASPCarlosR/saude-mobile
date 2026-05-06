import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantService } from '../tenant/tenant.service';
import { normalizeTenantPermissions } from '../tenant/tenant-permissions';

@Injectable()
export class AuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  async login(municipioSlug: string, login: string, senha: string) {
    const conexao = await this.tenantService.getConexao(municipioSlug);

    const usuarios = await conexao.query(
      `SELECT usuarioid AS id, usuariologin AS username
       FROM usuario
       WHERE usuariologin = $1 AND lower(usuariosenha) = md5($2)`,
      [login, senha],
    );

    if (!usuarios || usuarios.length === 0) {
      throw new UnauthorizedException('Usuario ou senha invalidos.');
    }

    const usuario = usuarios[0];

    const perfis = await conexao.query(
      `SELECT
        p.sdprofissionalid AS id,
        p.sdprofissionalnom AS nome,
        p.sdprofissionalcns AS cns,
        u.sdunidadecnes AS cnes,
        c.sdunidadeid AS "unidadeId",
        u.sdunidadenom AS "unidadeNome",
        c.sdsuscboid AS "cboCodigo",
        SS.sdsuscbodescricao as "cboDescricao",
        ee.sdequipemedicaid AS "equipeId",
        ee.sdequipemedicacodigocnes AS "ine",
        s.sdagentesmicroarea AS "microArea"
      FROM sdprofissional p
      INNER JOIN SDPROFISSIONALCBO C ON C.SDPROFISSIONALID = P.SDPROFISSIONALID
      INNER JOIN sdunidade u ON u.sdunidadeid = c.sdunidadeid
      INNER JOIN sdequipemedicaagentes s on s.sdagentesid = p.sdprofissionalid
      LEFT JOIN SDEQUIPEMEDICA EE on EE.SDEQUIPEMEDICAID = S.sdequipemedicaid
      inner join SDSUSCBO SS on SS.SDSUSCBOID = C.sdsuscboid
      WHERE p.sdprofissionalloginid = $1`,
      [usuario.id],
    );

    if (!perfis || perfis.length === 0) {
      throw new UnauthorizedException('Nenhum vinculo profissional encontrado para este usuario.');
    }

    const municipio = await this.tenantService.buscarPorSlug(municipioSlug);

    const payload = {
      sub: usuario.id,
      username: usuario.username,
      municipio: municipioSlug,
      permissoes: normalizeTenantPermissions(municipio.permissoes),
    };

    return {
      access_token: this.jwtService.sign(payload),
      perfis,
    };
  }
}
