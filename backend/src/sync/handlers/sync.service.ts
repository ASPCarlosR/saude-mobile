import { Get, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SyncPayloadDto } from './sync.dto';
import { TenantService } from '../../tenant/tenant.service';
import { PessoaHandler } from './pessoa.handler';
import { VisitaHandler } from './visita.handler';
import { DomicilioHandler } from './domicilio.handler';
import { TransporteHandler } from './transporte.handler';
import { AtendimentoDomiciliarHandler } from './atendimento-domiciliar.handler';
import { AtividadeColetivaHandler } from './atividade-coletiva.handler';
import { ElegibilidadeHandler } from './elegibilidade.handler';
import { ConsumoAlimentarHandler } from './consumo-alimentar.handler';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly pessoaHandler: PessoaHandler,
    private readonly visitaHandler: VisitaHandler,
    private readonly domicilioHandler: DomicilioHandler,
    private readonly atendimentoDomiciliarHandler: AtendimentoDomiciliarHandler,
    private readonly atividadeColetivaHandler: AtividadeColetivaHandler,
    private readonly elegibilidadeHandler: ElegibilidadeHandler,
    private readonly consumoAlimentarHandler: ConsumoAlimentarHandler,
    private readonly transporteHandler: TransporteHandler
  ) { }

  private async getDb(municipioSlug: string): Promise<DataSource> {
    const db = await this.tenantService.getConexao(municipioSlug);
    return db;
  }

  async processar(payload: SyncPayloadDto, usuarioId: number, slug: string) {
    const db = await this.tenantService.getConexao(slug);

    this.logger.log(
      `[SYNC] Iniciando processamento. municipio=${slug}, usuarioId=${usuarioId}, database=${(db.options as any)?.database ?? 'N/A'}`
    );

    const usuarioExiste = await db.query(
      `SELECT 1
         FROM usuario
        WHERE usuarioid = $1
        LIMIT 1`,
      [usuarioId]
    );

    if (usuarioExiste.length === 0) {
      this.logger.error(`[SYNC] Usuário ${usuarioId} não existe no banco do município ${slug}.`);
      return { status: 'E', mensagem: 'Usuário não autorizado para este município.' };
    }

    const sessaoResult = await db.query(
      `INSERT INTO mbsincronizacao (
         mbsincronizacaoinicio,
         mbsincronizacaostatus,
         mbsincronizacaoaspusuariologinid
       )
       VALUES (NOW(), 'P', $1)
       RETURNING mbsincronizacaoid`,
      [usuarioId]
    );

    const sessaoId = sessaoResult[0].mbsincronizacaoid;
    const resultados = [];

    const ordemTabelas = [2, 3, 8, 4, 5, 6, 7, 9, 15];
    const registrosOrdenados = payload.registros.sort(
      (a, b) => ordemTabelas.indexOf(a.tabelasincro) - ordemTabelas.indexOf(b.tabelasincro)
    );

    for (const reg of registrosOrdenados) {
      let intId = null;
      let statusReg = 'S';
      let erroMsg = null;

      try {
        if (payload.origem === 'M') {
          switch (reg.tabelasincro) {
            case 2:
              intId = await this.pessoaHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 3:
              intId = await this.domicilioHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 4:
              intId = await this.atendimentoDomiciliarHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 5:
              intId = await this.atividadeColetivaHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 6:
              intId = await this.elegibilidadeHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 7:
              intId = await this.consumoAlimentarHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 8:
              intId = await this.visitaHandler.upsert(reg.guid, reg.dados, db);
              break;
            case 9:
              this.logger.warn(`[SYNC] Atendimento Individual pendente.`);
              statusReg = 'P';
              intId = 0;
              break;
            case 15:
              this.logger.warn(`[SYNC] Vacinacao pendente.`);
              statusReg = 'P';
              intId = 0;
              break;
            default:
              throw new Error(`Handler para tabela ${reg.tabelasincro} nao implementado.`);
          }
        }
      } catch (error: any) {
        this.logger.error(
          `[SYNC] Erro GUID ${reg.guid} no município ${slug}: ${error.message}`,
          error?.stack
        );
        statusReg = 'E';
        erroMsg = error.message;
      }

      await db.query(
        `INSERT INTO mbsincronizacaoregistros (
           mbsincronizacaoid,
           mbsincronizacaoregistrochavemobile,
           mbsincronizacaoregistrotabelasincro,
           mbsincronizacaoregistrochaveweb,
           mbsincronizacaoregistrostatus
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sessaoId,
          reg.guid.substring(0, 20),
          reg.tabelasincro,
          intId ? intId.toString() : null,
          statusReg,
        ]
      );

      resultados.push({
        guid: reg.guid,
        status: statusReg,
        intId,
        erro: erroMsg,
      });
    }

    await db.query(
      `UPDATE mbsincronizacao
          SET mbsincronizacaofim = NOW(),
              mbsincronizacaostatus = 'S'
        WHERE mbsincronizacaoid = $1`,
      [sessaoId]
    );

    return { status: 'S', sessaoId, registros: resultados };
  }

  async buscarPessoas(usuarioId: number, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(
      `
      SELECT p.*,
             p.sdpessoaid as "intId",
             COALESCE(p.sdpessoaprenome, p.sdpessoanom) as "nome",
             COALESCE(dom.endereco, '') as "endereco",
             COALESCE(dom.numero, '') as "numero",
             COALESCE(dom.bairro, '') as "bairro",
             COALESCE(dom.micro_area, p.sdpessoaprofmicroarea, '') as "microArea",
             u.sdusuarioconvenio as "convenio"
        FROM sdpessoa p
   LEFT JOIN sdusuario u
          ON u.sdusuarioid = p.sdpessoaid
   LEFT JOIN LATERAL (
          SELECT COALESCE(l.sdlogradourocepdnenomeconcatenado, d.sddomicilioenderecocompl, '') AS endereco,
                 COALESCE(d.sddomicilioendereconum, '') AS numero,
                 COALESCE(b.sdbairrodnenome, '') AS bairro,
                 COALESCE(d.sddomicilioprofmicroarea, '') AS micro_area
            FROM sddomiciliopacientes dp
            JOIN sddomicilio d
              ON d.sddomicilioid = dp.sddomicilioid
       LEFT JOIN sdlogradourocepdne l
              ON l.sdlogradourocepdneid = d.sddomiciliodnelogradourocepid
       LEFT JOIN sdbairrodne b
              ON b.sdbairrodneid = l.sdlogradourocepdnebairroid
           WHERE dp.sddomiciliousuarioid = p.sdpessoaid
             AND (dp.sddomiciliopacientesativo = 'S' OR dp.sddomiciliopacientesativo IS NULL)
             AND COALESCE(dp.sddomiciliopacientemudou, 'N') <> 'S'
           ORDER BY dp.sddomiciliopacientesdatainclusao DESC NULLS LAST
           LIMIT 1
        ) dom ON TRUE
       WHERE p.sdpessoainativo = 0
         AND p.sdpessoaprofissionalid = $1
       ORDER BY COALESCE(p.sdpessoaprenome, p.sdpessoanom), p.sdpessoaid
      `,
      [usuarioId]
    );

    return { status: 'S', dados };
  }

  async buscarDomicilios(usuarioId: number, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(
      `
      SELECT d.*,
             json_build_object(
               'moradores', COALESCE((
                 SELECT json_agg(json_build_object(
                   'id', p.sdpessoaid,
                   'nome', COALESCE(p.sdpessoaprenome, p.sdpessoanom),
                   'cns', p.sdpessoacns,
                   'cpf', p.sdpessoacpf,
                   'dtnasc', p.sdpessoadtnasc,
                   'ehResponsavel', (dp.sddomiciliopacientesrf = 'S')
                 ) ORDER BY COALESCE(p.sdpessoaprenome, p.sdpessoanom))
                   FROM sddomiciliopacientes dp
                   JOIN sdpessoa p
                     ON p.sdpessoaid = dp.sddomiciliousuarioid
                  WHERE dp.sddomicilioid = d.sddomicilioid
                    AND dp.sddomiciliopacientesativo = 'S'
                    AND p.sdpessoaprofissionalid = $1
               ), '[]'::json),
               'microArea', d.sddomicilioprofmicroarea,
               'sitMoradia', d.sddomiciliositmoradiaid,
               'localizacao', d.sddomiciliolocalizacao,
               'tipoDomicilio', d.sddomiciliotipodomid,
               'comodos', d.sddomiciliocomodos,
               'energiaEletrica', d.sddomicilioenergiaeletrica,
               'endereco', COALESCE(l.sdlogradourocepdnenomeconcatenado, d.sddomicilioenderecocompl, ''),
               'numero', COALESCE(d.sddomicilioendereconum, ''),
               'bairro', COALESCE(b.sdbairrodnenome, ''),
               'municipioNome', COALESCE(m.sdmunicipiodesc, ''),
               'unidadeNome', COALESCE(u.sdunidadenom, ''),
               'cnes', COALESCE(u.sdunidadecnes, ''),
               'profissionalNome', COALESCE(prof.sdprofissionalnom, ''),
               'equipeNome', COALESCE(eq.sdequipedescricao, ''),
               'equipeIne', COALESCE(eq.sdequipemedicacodigocnes, '')
             )::text as "dados"
        FROM sddomicilio d
        LEFT JOIN sdlogradourocepdne l
               ON l.sdlogradourocepdneid = d.sddomiciliodnelogradourocepid
        LEFT JOIN sdbairrodne b
               ON b.sdbairrodneid = l.sdlogradourocepdnebairroid
        LEFT JOIN sdunidade u
               ON u.sdunidadeid = d.sddomiciliounidadeid
        LEFT JOIN sdmunicipio m
               ON m.sdmunicipioid = d.sddomiciliomunicipioid
        LEFT JOIN sdprofissional prof
               ON prof.sdprofissionalid = d.sddomicilioprofissionalid
        LEFT JOIN sdequipemedica eq
               ON eq.sdequipemedicaid = d.sddomicilioequipeid
       WHERE d.sddomicilioprofissionalid = $1
       ORDER BY d.sddomicilioid DESC
      `,
      [usuarioId]
    );

    return { status: 'S', dados };
  }

  async buscarViagens(usuarioId: number, filtros: any, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(`
      SELECT v.sdviagemid AS id,
             v.sdviagemdata AS data,
             v.sdviagemsequencia AS codigo,
             r.sdrotadescricao AS destino,
             ve.sdveiculodesc AS veiculo,
             CASE WHEN v.sdviagemstatus = 'A' THEN 'agendada' ELSE 'concluida' END AS status,
             (
               SELECT json_agg(json_build_object(
                 'id', p.sdpessoaid,
                 'nome', p.sdpessoaprenome,
                 'presente', NOT vp.sdviagempacientefaltou
               ))
                 FROM sdviagempaciente vp
                 JOIN sdpessoa p
                   ON p.sdpessoaid = vp.sdusuarioid
                WHERE vp.sdviagemid = v.sdviagemid
             ) AS pacientes
        FROM sdviagem v
        JOIN sdrota r
          ON r.sdrotaid = v.sdrotaid
        LEFT JOIN sdveiculos ve
          ON ve.sdveiculoid = v.sdveiculoid
       WHERE v.sdviagemdata >= CURRENT_DATE
       ORDER BY v.sdviagemdata DESC
    `);

    return { status: 'S', dados };
  }

  async atualizarViagem(viagemId: number, dados: any, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);
    return this.transporteHandler.atualizarViagem(viagemId, dados, db);
  }

  async buscarPacientesAutocomplete(termo: string, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);
    const parametroLike = `${termo}%`;
    const termoNumerico = termo.replace(/\D/g, '');
    const parametroCpfCns = termoNumerico ? `${termoNumerico}%` : null;
    const parametroId = /^\d+$/.test(termo) ? parseInt(termo, 10) : null;

    const dados = await db.query(
      `SELECT sdpessoaid AS id,
              COALESCE(sdpessoaprenome, sdpessoanom) AS nome,
              sdpessoacns AS cns,
              sdpessoadtnasc AS dtnasc
         FROM sdpessoa
        WHERE (
          sdpessoanom ILIKE $1
          OR sdpessoaprenome ILIKE $1
          OR ($2::varchar IS NOT NULL AND (sdpessoacpf LIKE $2 OR sdpessoacns LIKE $2))
          OR ($3::int IS NOT NULL AND sdpessoaid = $3)
        )
          AND sdpessoainativo = 0
        LIMIT 20`,
      [parametroLike, parametroCpfCns, parametroId]
    );

    return { status: 'S', dados };
  }

  async buscarFamiliaPorPessoaId(pessoaId: number, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(
      `WITH DomicilioEncontrado AS (
         SELECT dp.sddomicilioid
           FROM sddomiciliopacientes dp
          WHERE dp.sddomiciliousuarioid = $1
            AND (dp.sddomiciliopacientesativo = 'S' OR dp.sddomiciliopacientesativo IS NULL)
          LIMIT 1
       )
       SELECT p.sdpessoaid AS id,
              p.sdpessoaguid AS guid,
              COALESCE(p.sdpessoaprenome, p.sdpessoanom) AS nome,
              p.sdpessoacns AS cns,
              p.sdpessoadtnasc AS dtnasc,
              dom.sddomicilioprofmicroarea AS microarea
         FROM sddomiciliopacientes dp
         JOIN DomicilioEncontrado de
           ON dp.sddomicilioid = de.sddomicilioid
         JOIN sdpessoa p
           ON dp.sddomiciliousuarioid = p.sdpessoaid
         JOIN sddomicilio dom
           ON dp.sddomicilioid = dom.sddomicilioid
        WHERE (dp.sddomiciliopacientesativo = 'S' OR dp.sddomiciliopacientesativo IS NULL)`,
      [pessoaId]
    );

    return { status: 'S', dados };
  }

  private normalizarSN(valor: any): string {
    return String(valor ?? '').trim().toUpperCase();
  }

  private mapIndicadorId(nome: string, detalhe: string) {
    const n = String(nome ?? '').trim().toUpperCase();
    const d = String(detalhe ?? '').trim().toUpperCase();

    if (n === 'DESENVOLVIMENTO INFANTIL') return 'desenvolvimento-infantil';
    if (n === 'GESTANTE E PUÉRPERA' && d.includes('3 VISITAS')) return 'gestante-3-visitas';
    if (n === 'GESTANTE E PUÉRPERA' && d.includes('1 VISITA')) return 'gestante-puerperio-1-visita';
    if (n === 'PESSOA COM DIABETES') return 'diabetes';
    if (n === 'PESSOA COM HIPERTENSÃO' || n === 'PESSOA COM HIPERTENSAO') return 'hipertensao';
    if (n === 'PESSOA IDOSA') return 'idoso';

    return null;
  }

  private getNecessario(nome: string, detalhe: string) {
    const n = String(nome ?? '').trim().toUpperCase();
    const d = String(detalhe ?? '').trim().toUpperCase();

    if (n === 'DESENVOLVIMENTO INFANTIL') return 2;
    if (n === 'GESTANTE E PUÉRPERA' && d.includes('3 VISITAS')) return 3;
    if (n === 'GESTANTE E PUÉRPERA' && d.includes('1 VISITA')) return 1;
    if (n === 'PESSOA COM DIABETES') return 2;
    if (n === 'PESSOA COM HIPERTENSÃO' || n === 'PESSOA COM HIPERTENSAO') return 2;
    if (n === 'PESSOA IDOSA') return 2;

    return 0;
  }

  private montarFalta(
    indicadorId: string,
    realizado: number,
    necessario: number,
    flag2?: string | null,
    flag3?: string | null
  ) {
    if (indicadorId === 'desenvolvimento-infantil') {
      const falta30 = this.normalizarSN(flag2) !== 'S';
      const falta6m = this.normalizarSN(flag3) !== 'S';

      if (falta30 && falta6m) return 'Falta visita até 30 dias e visita entre 31 dias e 6 meses';
      if (falta30) return 'Falta visita até 30 dias';
      if (falta6m) return 'Falta visita entre 31 dias e 6 meses';
      return 'Pendência no desenvolvimento infantil';
    }

    const faltam = Math.max(necessario - (realizado || 0), 0);

    switch (indicadorId) {
      case 'gestante-3-visitas':
        return faltam === 1
          ? 'Falta 1 visita domiciliar na gestação'
          : `Faltam ${faltam} visitas domiciliares na gestação`;

      case 'gestante-puerperio-1-visita':
        return faltam === 1
          ? 'Falta 1 visita domiciliar no puerpério'
          : `Faltam ${faltam} visitas domiciliares no puerpério`;

      case 'diabetes':
        return faltam === 1
          ? 'Falta 1 visita domiciliar de diabetes'
          : `Faltam ${faltam} visitas domiciliares de diabetes`;

      case 'hipertensao':
        return faltam === 1
          ? 'Falta 1 visita domiciliar de hipertensão'
          : `Faltam ${faltam} visitas domiciliares de hipertensão`;

      case 'idoso':
        return faltam === 1
          ? 'Falta 1 visita domiciliar para pessoa idosa'
          : `Faltam ${faltam} visitas domiciliares para pessoa idosa`;

      default:
        return 'Pendência no indicador';
    }
  }

  private async getQuadrimestreAtual(db: DataSource) {
    const quadrimestreAtual = await db.query(
      `
      SELECT
        sdindicdimtempoid,
        sdindicdimtempodatainicialquad::date AS data_inicial,
        sdindicdimtempodatafinalquad::date   AS data_final
      FROM sdindicdimtempo
      WHERE CURRENT_DATE BETWEEN sdindicdimtempodatainicialquad::date
                            AND sdindicdimtempodatafinalquad::date
      ORDER BY sdindicdimtempoid DESC
      LIMIT 1
      `
    );

    if (!quadrimestreAtual?.length) {
      return null;
    }

    return quadrimestreAtual[0];
  }

  private async getProfissionalContexto(db: DataSource, profissionalId: number) {
    const profissionalRows = await db.query(
      `
      SELECT
        p.sdpessoaid,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom) AS sdpessoanome,
        p.sdpessoaequipeid,
        p.sdpessoaunidadeid,
        p.sdpessoaprofmicroarea
      FROM sdpessoa p
      WHERE p.sdpessoaid = $1
      LIMIT 1
      `,
      [profissionalId]
    );

    if (!profissionalRows?.length) {
      return null;
    }

    return profissionalRows[0];
  }

  private montarPacienteBase(
    row: any,
    indicadorNome: string,
    indicadorDetalhe: string,
    realizado: number,
    necessario: number,
    extras?: {
      flag2?: string | null;
      flag3?: string | null;
      observacao?: string | null;
    }
  ) {
    const indicadorId = this.mapIndicadorId(indicadorNome, indicadorDetalhe);
    if (!indicadorId) return null;

    return {
      pessoaId: Number(row.pessoa_id),
      nome: row.nome,
      cpf: row.cpf ?? '',
      dataNascimento: row.data_nascimento,
      idade: null,
      indicadorId,
      indicadorNome,
      indicadorDetalhe,
      status: 'N',
      realizado,
      necessario,
      falta: this.montarFalta(
        indicadorId,
        realizado,
        necessario,
        extras?.flag2,
        extras?.flag3
      ),
      observacao: extras?.observacao ?? null,
      flag2: extras?.flag2 ?? null,
      flag3: extras?.flag3 ?? null,
    };
  }

  private async buscarPendenciasIdoso(
    db: DataSource,
    profissionalId: number,
    dataInicial: string,
    dataFinal: string
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND DATE_PART('year', AGE(CURRENT_DATE, p.sdpessoadtnasc)) >= 60
          AND COALESCE(
      p.sdpessoadtultimaatualizacaogerindiv,
      p.sdpessoadtultimaatualizacaoger,
      p.sdpessoadtultimaatualizacao
      
    ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_validas AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS realizado
        FROM sdvisitadomiciliar v
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliardata BETWEEN $2::date AND $3::date
          AND v.sdvisitadomiciliarpessoaidosa = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.*,
        COALESCE(vv.realizado, 0) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_validas vv
        ON vv.pessoa_id = pb.pessoa_id
      WHERE COALESCE(vv.realizado, 0) < 2
      ORDER BY pb.nome
      `,
      [profissionalId, dataInicial, dataFinal]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'PESSOA IDOSA',
          'Pessoa idosa com 2 visitas domiciliares no quadrimestre',
          Number(row.realizado ?? 0),
          2
        )
      )
      .filter(Boolean);
  }

  private async buscarPendenciasHipertensao(
    db: DataSource,
    profissionalId: number,
    dataInicial: string,
    dataFinal: string
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND p.sdpessoahipertensaoarterial = 'S'
          AND COALESCE(
                p.sdpessoadtultimaatualizacaogerindiv,
                p.sdpessoadtultimaatualizacaoger,
                p.sdpessoadtultimaatualizacao
                
              ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_validas AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS realizado
        FROM sdvisitadomiciliar v
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliardata BETWEEN $2::date AND $3::date
          AND v.sdvisitadomiciliarhipertensao = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.*,
        COALESCE(vv.realizado, 0) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_validas vv
        ON vv.pessoa_id = pb.pessoa_id
      WHERE COALESCE(vv.realizado, 0) < 2
      ORDER BY pb.nome
      `,
      [profissionalId, dataInicial, dataFinal]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'PESSOA COM HIPERTENSÃO',
          'Pessoa com hipertensão com 2 visitas domiciliares no quadrimestre',
          Number(row.realizado ?? 0),
          2
        )
      )
      .filter(Boolean);
  }

  private async buscarPendenciasDiabetes(
    db: DataSource,
    profissionalId: number,
    dataInicial: string,
    dataFinal: string
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND p.sdpessoadiabetes = 'S'
          AND COALESCE(
                p.sdpessoadtultimaatualizacaogerindiv,
                p.sdpessoadtultimaatualizacaoger,
                p.sdpessoadtultimaatualizacao
                
              ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_validas AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS realizado
        FROM sdvisitadomiciliar v
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliardata BETWEEN $2::date AND $3::date
          AND v.sdvisitadomiciliardiabetes = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.*,
        COALESCE(vv.realizado, 0) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_validas vv
        ON vv.pessoa_id = pb.pessoa_id
      WHERE COALESCE(vv.realizado, 0) < 2
      ORDER BY pb.nome
      `,
      [profissionalId, dataInicial, dataFinal]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'PESSOA COM DIABETES',
          'Pessoa com diabetes com 2 visitas domiciliares no quadrimestre',
          Number(row.realizado ?? 0),
          2
        )
      )
      .filter(Boolean);
  }

  private async buscarPendenciasGestante3Visitas(
    db: DataSource,
    profissionalId: number,
    dataInicial: string,
    dataFinal: string
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND p.sdpessoagestante = 'S'
          AND COALESCE(p.sdpessoagestantegestacaofinalizada, 'N') <> 'S'
          AND COALESCE(
                p.sdpessoadtultimaatualizacaogerindiv,
               p.sdpessoadtultimaatualizacaoger,
                p.sdpessoadtultimaatualizacao
                
              ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_validas AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS realizado
        FROM sdvisitadomiciliar v
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliardata BETWEEN $2::date AND $3::date
          AND v.sdvisitadomiciliargestante = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.*,
        COALESCE(vv.realizado, 0) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_validas vv
        ON vv.pessoa_id = pb.pessoa_id
      WHERE COALESCE(vv.realizado, 0) < 3
      ORDER BY pb.nome
      `,
      [profissionalId, dataInicial, dataFinal]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'GESTANTE E PUÉRPERA',
          'Gestante com 3 visitas domiciliares no quadrimestre',
          Number(row.realizado ?? 0),
          3
        )
      )
      .filter(Boolean);
  }

  private async buscarPendenciasPuerperio(
    db: DataSource,
    profissionalId: number,
    dataInicial: string,
    dataFinal: string
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND p.sdpessoagestantedataparto IS NOT NULL
          AND p.sdpessoagestantedataparto BETWEEN (CURRENT_DATE - INTERVAL '45 days')::date AND CURRENT_DATE
          AND COALESCE(
                p.sdpessoadtultimaatualizacaogerindiv,
                p.sdpessoadtultimaatualizacaoger,
                p.sdpessoadtultimaatualizacao
               
              ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_validas AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS realizado
        FROM sdvisitadomiciliar v
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliardata BETWEEN $2::date AND $3::date
          AND v.sdvisitadomiciliarpuerpera = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.*,
        COALESCE(vv.realizado, 0) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_validas vv
        ON vv.pessoa_id = pb.pessoa_id
      WHERE COALESCE(vv.realizado, 0) < 1
      ORDER BY pb.nome
      `,
      [profissionalId, dataInicial, dataFinal]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'GESTANTE E PUÉRPERA',
          'Puérpera com 1 visita domiciliar',
          Number(row.realizado ?? 0),
          1
        )
      )
      .filter(Boolean);
  }

  private async buscarPendenciasDesenvolvimentoInfantil(
    db: DataSource,
    profissionalId: number
  ) {
    const rows = await db.query(
      `
      WITH pessoas_base AS (
        SELECT
          p.sdpessoaid AS pessoa_id,
          COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome,
          COALESCE(p.sdpessoacpf, '') AS cpf,
          p.sdpessoadtnasc::date AS data_nascimento,
          (CURRENT_DATE - p.sdpessoadtnasc::date) AS idade_dias
        FROM sdpessoa p
        WHERE p.sdpessoainativo = 0
          AND p.sdpessoapaciente = 'S'
          AND p.sdpessoaprofissionalid = $1
          AND p.sdpessoadtnasc >= (CURRENT_DATE - INTERVAL '6 months')::date
          AND COALESCE(
                p.sdpessoadtultimaatualizacaogerindiv,
                p.sdpessoadtultimaatualizacaoger,
                p.sdpessoadtultimaatualizacao
                
              ) >= (CURRENT_DATE - INTERVAL '2 years')::date
      ),
      visitas_30_dias AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS qtde
        FROM sdvisitadomiciliar v
        JOIN sdpessoa p
          ON p.sdpessoaid = v.sdvisitadomiciliarusuarioid
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliarcrianca = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
          AND v.sdvisitadomiciliardata BETWEEN p.sdpessoadtnasc::date AND (p.sdpessoadtnasc::date + INTERVAL '30 days')::date
        GROUP BY v.sdvisitadomiciliarusuarioid
      ),
      visitas_6_meses AS (
        SELECT
          v.sdvisitadomiciliarusuarioid AS pessoa_id,
          COUNT(DISTINCT v.sdvisitadomiciliarid) AS qtde
        FROM sdvisitadomiciliar v
        JOIN sdpessoa p
          ON p.sdpessoaid = v.sdvisitadomiciliarusuarioid
        WHERE v.sdvisitadomiciliarusuarioid IS NOT NULL
          AND v.sdvisitadomiciliarprofid = $1
          AND v.sdvisitadomiciliarcrianca = 'S'
          AND COALESCE(v.sdvisitadomiciliardesfecho, 0) <> 2
          AND v.sdvisitadomiciliardata > (p.sdpessoadtnasc::date + INTERVAL '30 days')::date
          AND v.sdvisitadomiciliardata <= (p.sdpessoadtnasc::date + INTERVAL '6 months')::date
        GROUP BY v.sdvisitadomiciliarusuarioid
      )
      SELECT
        pb.pessoa_id,
        pb.nome,
        pb.cpf,
        pb.data_nascimento,
        CASE WHEN COALESCE(v30.qtde, 0) > 0 THEN 'S' ELSE 'N' END AS flag2,
        CASE WHEN COALESCE(v6.qtde, 0) > 0 THEN 'S' ELSE 'N' END AS flag3,
        (CASE WHEN COALESCE(v30.qtde, 0) > 0 THEN 1 ELSE 0 END
         + CASE WHEN COALESCE(v6.qtde, 0) > 0 THEN 1 ELSE 0 END) AS realizado
      FROM pessoas_base pb
      LEFT JOIN visitas_30_dias v30
        ON v30.pessoa_id = pb.pessoa_id
      LEFT JOIN visitas_6_meses v6
        ON v6.pessoa_id = pb.pessoa_id
      WHERE
        (
          pb.idade_dias <= 30
          AND COALESCE(v30.qtde, 0) = 0
        )
        OR
        (
          pb.idade_dias > 30
          AND pb.idade_dias <= 183
          AND (COALESCE(v30.qtde, 0) = 0 OR COALESCE(v6.qtde, 0) = 0)
        )
      ORDER BY pb.nome
      `,
      [profissionalId]
    );

    return rows
      .map((row: any) =>
        this.montarPacienteBase(
          row,
          'DESENVOLVIMENTO INFANTIL',
          'Visitas até 30 dias e entre 31 dias e 6 meses',
          Number(row.realizado ?? 0),
          2,
          {
            flag2: row.flag2,
            flag3: row.flag3,
          }
        )
      )
      .filter(Boolean);
  }

  async listarIndicadoresApsPendentes(profissionalId: number, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const quadRows = await db.query(
      `
    SELECT
      sdindicdimtempoid,
      sdindicdimtempodatainicialquad::date AS dt_ini,
      sdindicdimtempodatafinalquad::date   AS dt_fim
    FROM sdindicdimtempo
    WHERE CURRENT_DATE BETWEEN sdindicdimtempodatainicialquad::date
                           AND sdindicdimtempodatafinalquad::date
    ORDER BY sdindicdimtempoid DESC
    LIMIT 1
    `
    );

    if (!quadRows?.length) {
      return { status: 'E', message: 'Quadrimestre atual não encontrado.' };
    }

    const quad = quadRows[0];
    const dtFim: string = quad.dt_fim;
    const dtIni: string = quad.dt_ini;

    const profRows = await db.query(
      `
    SELECT
      p.sdpessoaid,
      COALESCE(p.sdpessoaprenome, p.sdpessoanom) AS nome,
      p.sdpessoaequipeid AS equipeid
    FROM sdpessoa p
    WHERE p.sdpessoaid = $1
    LIMIT 1
    `,
      [profissionalId]
    );

    if (!profRows?.length) {
      return { status: 'E', message: 'Profissional não encontrado.' };
    }

    const prof = profRows[0];
    const equipeId: number = Number(prof.equipeid);

    const params2 = [equipeId, dtFim];
    const params3 = [equipeId, dtFim, dtIni];

    const idosoQuery = `
    WITH pessoas_base AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoanom,
        p.sdpessoaprenome,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg
        ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND p.sdpessoaequipeid = $1
        AND COALESCE(dp.sddomiciliopacientemudou, 'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca, 'N') <> 'S'
    ),
    idosos AS (
      SELECT *
      FROM pessoas_base pb
      WHERE pb.dtnasc <= ($3::date - INTERVAL '60 years')
    ),
    visitas_idoso AS (
      SELECT
        v.sdvisitadomiciliarusuarioid AS pessoaid,
        COUNT(*)::int AS qtd_visitas,
        MIN(v.sdvisitadomiciliardata::date) AS primeira_visita,
        MAX(v.sdvisitadomiciliardata::date) AS ultima_visita,
        (MAX(v.sdvisitadomiciliardata::date) - MIN(v.sdvisitadomiciliardata::date)) AS gap_dias
      FROM idosos i
      JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = i.sdpessoaid
      JOIN sdunidade u
        ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
       AND u.sdparamunidintegraesus = 'S'
      WHERE v.sdvisitadomiciliarcboprofid IN ('515105','322255')
        AND v.sdvisitadomiciliardesfecho = 1
        AND v.sdvisitadomiciliardata::date BETWEEN ($2::date - INTERVAL '1 year') AND $2::date
      GROUP BY v.sdvisitadomiciliarusuarioid
    ),
    tipo_equipe AS (
      SELECT sdequipemedicatipoid AS tipo
      FROM sdequipemedica
      WHERE sdequipemedicaid = $1
    ),
    atendidos AS (
      SELECT vi.pessoaid
      FROM visitas_idoso vi
      JOIN tipo_equipe te ON 1 = 1
      WHERE te.tipo = '70'
        AND vi.qtd_visitas >= 2
        AND vi.gap_dias >= 30

      UNION

      SELECT i.sdpessoaid
      FROM idosos i
      JOIN tipo_equipe te ON 1 = 1
      WHERE te.tipo = '76'
    ),
   visitas_all AS (
  SELECT
    i.sdpessoaid,
    COUNT(*)::int AS total_visitas_12m
  FROM idosos i
  JOIN sdvisitadomiciliar v
    ON v.sdvisitadomiciliarusuarioid = i.sdpessoaid
  JOIN sdequipemedica ev
    ON ev.sdequipemedicaid = v.sdvisitadomiciliarequipeid
   AND ev.sdequipemedicaid = $1
   AND ev.sdequipemedicatipoid IN ('70','76')
  JOIN sdunidade u
    ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
   AND u.sdparamunidintegraesus = 'S'
  WHERE v.sdvisitadomiciliarcboprofid IN ('322255','515105')
    AND v.sdvisitadomiciliardesfecho = 1
    AND v.sdvisitadomiciliardata::date BETWEEN ($2::date - INTERVAL '1 year') AND $2::date
  GROUP BY i.sdpessoaid
)
    SELECT
      i.sdpessoaid AS pessoa_id,
      i.nome_exib AS nome,
      i.cpf,
      i.dtnasc AS data_nascimento,
      CASE
        WHEN COALESCE(vi.qtd_visitas, 0) >= 2 AND COALESCE(vi.gap_dias, 0) < 30 THEN 0
        ELSE COALESCE(va.total_visitas_12m, 0)
      END AS realizado,
      COALESCE(va.total_visitas_12m, 0) AS realizado_total,
      2 AS necessario,
      CASE
        WHEN COALESCE(vi.qtd_visitas, 0) >= 2 AND COALESCE(vi.gap_dias, 0) < 30 THEN 'GAP_INVALIDO'
        ELSE NULL
      END AS flag2,
      NULL::text AS flag3,
      CASE
        WHEN COALESCE(vi.qtd_visitas, 0) >= 2 AND COALESCE(vi.gap_dias, 0) < 30
          THEN 'Possui ' || COALESCE(va.total_visitas_12m, 0) || ' visitas, mas sem intervalo mínimo de 30 dias entre elas'
        ELSE NULL
      END AS observacao,
      'PESSOA IDOSA' AS indicador_nome,
      '2 Visitas últimos 12 meses' AS indicador_detalhe
    FROM idosos i
    LEFT JOIN visitas_all va
      ON va.sdpessoaid = i.sdpessoaid
    LEFT JOIN visitas_idoso vi
      ON vi.pessoaid = i.sdpessoaid
    WHERE i.sdpessoaid NOT IN (SELECT pessoaid FROM atendidos)
  `;

    const diabetesQuery = `
    WITH pessoas_candidatas AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoaequipeid  AS equipeid,
        p.sdpessoaunidadeid AS unidadeid,
        p.sdpessoadiabetes,
        p.sdpessoadtultimaatualizacaoger::date AS dt_ult_atualiza,
        p.sdpessoadtcadastro::date             AS dt_cadastro,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND COALESCE(dp.sddomiciliopacientemudou,'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca,'N') <> 'S'
        AND p.sdpessoaequipeid = $1
    ),
    pessoas_diabetes AS (
      SELECT DISTINCT
        c.*
      FROM pessoas_candidatas c
      LEFT JOIN sdpessoaproblemas pr
        ON pr.sdpessoaid = c.sdpessoaid
      WHERE c.sdpessoadiabetes = 'S'
         OR pr.sdpessoaproblemascidid IN (
           'E100','E101','E102','E103','E104','E105','E106','E107','E108','E109',
           'E110','E111','E112','E113','E114','E115','E116','E117','E118','E119',
           'E140','E141','E142','E143','E144','E145','E146','E147','E148','E149',
           'E11','E14','E10'
         )
    ),
    pessoas_diabetes_quad AS (
      SELECT
        d.sdindicdimtempoid,
        d.dt_ini,
        d.dt_fim,
        p.equipeid,
        p.unidadeid,
        p.sdpessoaid,
        p.sdpessoadiabetes,
        p.nome_exib,
        p.cpf,
        p.dtnasc
      FROM (
        SELECT
          sdindicdimtempoid,
          sdindicdimtempodatainicialquad::date AS dt_ini,
          sdindicdimtempodatafinalquad::date   AS dt_fim
        FROM sdindicdimtempo
        WHERE sdindicdimtempodatafinalquad::date = $2::date
      ) d
      JOIN pessoas_diabetes p
        ON (
             p.dt_ult_atualiza IS NOT NULL
             AND p.dt_ult_atualiza BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim
           )
        OR (
             p.dt_cadastro IS NOT NULL
             AND p.dt_cadastro BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim
           )
    ),
    visitas_diab AS (
      SELECT
        pdq.sdindicdimtempoid,
        pdq.equipeid,
        pdq.sdpessoaid,
        COUNT(*)::int AS qtd_visitas,
        MIN(v.sdvisitadomiciliardata::date) AS primeira_visita,
        MAX(v.sdvisitadomiciliardata::date) AS ultima_visita,
        (MAX(v.sdvisitadomiciliardata::date) - MIN(v.sdvisitadomiciliardata::date)) AS gap_dias
      FROM pessoas_diabetes_quad pdq
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = pdq.equipeid
       AND em.sdequipemedicatipoid = '70'
      JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = pdq.sdpessoaid
      JOIN sdunidade u
        ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
       AND u.sdparamunidintegraesus = 'S'
      WHERE v.sdvisitadomiciliarcboprofid IN ('322255','515105')
        AND v.sdvisitadomiciliardesfecho = 1
        AND v.sdvisitadomiciliardiabetes = 'S'
        AND v.sdvisitadomiciliardata::date BETWEEN (pdq.dt_fim - INTERVAL '1 year') AND pdq.dt_fim
      GROUP BY pdq.sdindicdimtempoid, pdq.equipeid, pdq.sdpessoaid
    ),
    atendidos AS (
      SELECT sdpessoaid
      FROM visitas_diab
      WHERE qtd_visitas >= 2
        AND gap_dias >= 30

      UNION

      SELECT pdq.sdpessoaid
      FROM pessoas_diabetes_quad pdq
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = pdq.equipeid
       AND em.sdequipemedicatipoid = '76'
    ),
    visitas_all AS (
      SELECT
        pdq.sdpessoaid,
        COUNT(*)::int AS total_visitas_12m
      FROM pessoas_diabetes_quad pdq
      JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = pdq.sdpessoaid
      JOIN sdequipemedica ev
        ON ev.sdequipemedicaid = v.sdvisitadomiciliarequipeid
       AND ev.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade u
        ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
       AND u.sdparamunidintegraesus = 'S'
      WHERE v.sdvisitadomiciliarcboprofid IN ('322255','515105')
        AND v.sdvisitadomiciliardiabetes = 'S'
        AND v.sdvisitadomiciliardata::date BETWEEN (pdq.dt_fim - INTERVAL '1 year') AND pdq.dt_fim
      GROUP BY pdq.sdpessoaid
    )
    SELECT
      pdq.sdpessoaid AS pessoa_id,
      pdq.nome_exib AS nome,
      pdq.cpf,
      pdq.dtnasc AS data_nascimento,
      CASE
        WHEN COALESCE(vd.qtd_visitas, 0) >= 2 AND COALESCE(vd.gap_dias, 0) < 30 THEN 0
        ELSE COALESCE(va.total_visitas_12m, 0)
      END AS realizado,
      COALESCE(va.total_visitas_12m, 0) AS realizado_total,
      2 AS necessario,
      CASE
        WHEN COALESCE(vd.qtd_visitas, 0) >= 2 AND COALESCE(vd.gap_dias, 0) < 30 THEN 'GAP_INVALIDO'
        ELSE 'S'
      END AS flag2,
      CASE
        WHEN (
          SELECT c.sdpessoaproblemascartaosituacao
          FROM sdpessoaproblemascartao c
          WHERE c.sdpessoaid = pdq.sdpessoaid
          ORDER BY c.sdpessoaproblemascartaodata DESC
          LIMIT 1
        ) = 'A' THEN 'S'
        WHEN pdq.sdpessoadiabetes = 'S' THEN 'S'
        ELSE 'N'
      END AS flag3,
      CASE
        WHEN COALESCE(vd.qtd_visitas, 0) >= 2 AND COALESCE(vd.gap_dias, 0) < 30
          THEN 'Possui ' || COALESCE(va.total_visitas_12m, 0) || ' visitas, mas sem intervalo mínimo de 30 dias entre elas'
        ELSE NULL
      END AS observacao,
      'PESSOA COM DIABETES' AS indicador_nome,
      '2 Visitas últimos 12 meses' AS indicador_detalhe
    FROM pessoas_diabetes_quad pdq
    LEFT JOIN visitas_all va
      ON va.sdpessoaid = pdq.sdpessoaid
    LEFT JOIN visitas_diab vd
      ON vd.sdpessoaid = pdq.sdpessoaid
    WHERE pdq.sdpessoaid NOT IN (SELECT sdpessoaid FROM atendidos)
  `;

    const hipertensaoQuery = `
    WITH pessoas_candidatas AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoaequipeid  AS equipeid,
        p.sdpessoaunidadeid AS unidadeid,
        p.sdpessoahipertensaoarterial,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND COALESCE(dp.sddomiciliopacientemudou,'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca,'N') <> 'S'
        AND p.sdpessoaequipeid = $1
    ),
    elegiveis AS (
      SELECT DISTINCT
        c.*
      FROM pessoas_candidatas c
      LEFT JOIN sdpessoaproblemas pr
        ON pr.sdpessoaid = c.sdpessoaid
      WHERE c.sdpessoahipertensaoarterial = 'S'
         OR pr.sdpessoaproblemascidid IN (
           'I10','I11','I110','I119','I12','I120','I129',
           'I13','I130','I131','I132','I139',
           'I15','I150','I151','I152','I158','I159',
           'O10','O100','O101','O102','O103','O104','O109','O11'
         )
    ),
    dim_tmp AS (
      SELECT
        sdindicdimtempoid,
        sdindicdimtempodatafinalquad::date AS dt_fim
      FROM sdindicdimtempo
      WHERE sdindicdimtempodatafinalquad::date = $2::date
    ),
    visitas_hiper AS (
      SELECT
        t.sdindicdimtempoid,
        e.equipeid,
        e.sdpessoaid,
        COUNT(*)::int AS qtd_visitas,
        MIN(v.sdvisitadomiciliardata::date) AS primeira_visita,
        MAX(v.sdvisitadomiciliardata::date) AS ultima_visita,
        (MAX(v.sdvisitadomiciliardata::date) - MIN(v.sdvisitadomiciliardata::date)) AS gap_dias
      FROM elegiveis e
      JOIN dim_tmp t ON TRUE
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = e.equipeid
       AND em.sdequipemedicatipoid = '70'
      JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = e.sdpessoaid
      JOIN sdunidade u
        ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
       AND u.sdparamunidintegraesus = 'S'
      WHERE v.sdvisitadomiciliarcboprofid IN ('322255','515105')
        AND v.sdvisitadomiciliarhipertensao = 'S'
        AND v.sdvisitadomiciliardesfecho = 1
        AND v.sdvisitadomiciliardata::date BETWEEN (t.dt_fim - INTERVAL '1 year') AND t.dt_fim
      GROUP BY t.sdindicdimtempoid, e.equipeid, e.sdpessoaid
    ),
    atendidos AS (
      SELECT sdpessoaid
      FROM visitas_hiper
      WHERE qtd_visitas >= 2
        AND gap_dias >= 30

      UNION

      SELECT e.sdpessoaid
      FROM elegiveis e
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = e.equipeid
       AND em.sdequipemedicatipoid = '76'
    ),
    visitas_all AS (
      SELECT
        e.sdpessoaid,
        COUNT(*)::int AS total_visitas_12m
      FROM elegiveis e
      JOIN dim_tmp t ON TRUE
      JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = e.sdpessoaid
      JOIN sdequipemedica ev
        ON ev.sdequipemedicaid = v.sdvisitadomiciliarequipeid
       AND ev.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade u
        ON u.sdunidadeid = v.sdvisitadomiciliarunidadeid
       AND u.sdparamunidintegraesus = 'S'
      WHERE v.sdvisitadomiciliarcboprofid IN ('322255','515105')
        AND v.sdvisitadomiciliarhipertensao = 'S'
        AND v.sdvisitadomiciliardata::date BETWEEN (t.dt_fim - INTERVAL '1 year') AND t.dt_fim
      GROUP BY e.sdpessoaid
    )
    SELECT
      e.sdpessoaid AS pessoa_id,
      e.nome_exib AS nome,
      e.cpf,
      e.dtnasc AS data_nascimento,
      CASE
        WHEN COALESCE(vh.qtd_visitas, 0) >= 2 AND COALESCE(vh.gap_dias, 0) < 30 THEN 0
        ELSE COALESCE(va.total_visitas_12m, 0)
      END AS realizado,
      COALESCE(va.total_visitas_12m, 0) AS realizado_total,
      2 AS necessario,
      CASE
        WHEN COALESCE(vh.qtd_visitas, 0) >= 2 AND COALESCE(vh.gap_dias, 0) < 30 THEN 'GAP_INVALIDO'
        ELSE 'S'
      END AS flag2,
      CASE
        WHEN (
          SELECT c.sdpessoaproblemascartaosituacao
          FROM sdpessoaproblemascartao c
          WHERE c.sdpessoaid = e.sdpessoaid
          ORDER BY c.sdpessoaproblemascartaodata DESC
          LIMIT 1
        ) = 'A' THEN 'S'
        WHEN e.sdpessoahipertensaoarterial = 'S' THEN 'S'
        ELSE 'N'
      END AS flag3,
      CASE
        WHEN COALESCE(vh.qtd_visitas, 0) >= 2 AND COALESCE(vh.gap_dias, 0) < 30
          THEN 'Possui ' || COALESCE(va.total_visitas_12m, 0) || ' visitas, mas sem intervalo mínimo de 30 dias entre elas'
        ELSE NULL
      END AS observacao,
      'PESSOA COM HIPERTENSÃO' AS indicador_nome,
      '2 Visitas últimos 12 meses' AS indicador_detalhe
    FROM elegiveis e
    LEFT JOIN visitas_all va
      ON va.sdpessoaid = e.sdpessoaid
    LEFT JOIN visitas_hiper vh
      ON vh.sdpessoaid = e.sdpessoaid
    WHERE e.sdpessoaid NOT IN (SELECT sdpessoaid FROM atendidos)
  `;

    const gestante3Query = `
    WITH pessoas_candidatas AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoaequipeid  AS equipeid,
        p.sdpessoaunidadeid AS unidadeid,
        p.sdpessoadtultimaatualizacaoger::date AS dt_ult_atualiza,
        p.sdpessoadtcadastro::date             AS dt_cadastro,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND COALESCE(dp.sddomiciliopacientemudou,'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca,'N') <> 'S'
        AND p.sdpessoaequipeid = $1
    ),
    gestantes_base AS (
      SELECT
        c.sdpessoaid AS paciente_id,
        c.equipeid,
        c.unidadeid,
        g.sdgestacaodum::date AS dt_ini_gest,
        (g.sdgestacaodum + INTERVAL '295 days')::date AS dt_ini_puerp,
        (g.sdgestacaodum + INTERVAL '337 days')::date AS dt_fim_puerp,
        c.dt_ult_atualiza,
        c.dt_cadastro,
        c.nome_exib,
        c.cpf,
        c.dtnasc
      FROM sdgestacao g
      JOIN pessoas_candidatas c
        ON c.sdpessoaid = g.sdgestacaopessoaid
    ),
    gestantes_quad AS (
      SELECT
        d.sdindicdimtempoid,
        d.dt_ini,
        d.dt_fim,
        g.equipeid,
        g.unidadeid,
        g.paciente_id,
        g.dt_ini_gest,
        g.dt_ini_puerp,
        g.dt_fim_puerp,
        g.nome_exib,
        g.cpf,
        g.dtnasc
      FROM (
        SELECT
          sdindicdimtempoid,
          sdindicdimtempodatainicialquad::date AS dt_ini,
          sdindicdimtempodatafinalquad::date   AS dt_fim
        FROM sdindicdimtempo
        WHERE sdindicdimtempodatafinalquad::date = $2::date
          AND sdindicdimtempodatainicialquad::date = $3::date
      ) d
      JOIN gestantes_base g
        ON g.dt_fim_puerp BETWEEN d.dt_ini AND d.dt_fim
       AND (
            (g.dt_ult_atualiza IS NOT NULL AND g.dt_ult_atualiza BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim)
         OR (g.dt_cadastro IS NOT NULL AND g.dt_cadastro BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim)
       )
    ),
    tmp_finalizacoes AS (
      SELECT DISTINCT paciente_id
      FROM (
        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdatendimentoindiv c
          ON c.sdatendimentoindivusuarioid = g.paciente_id
         AND c.sdatendimentoindivdata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        WHERE c.sdatendimentoindivcidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR c.sdatendimentoindivcid2id IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR c.sdatendimentoindivciap1id IN ('W82','W83')
           OR c.sdatendimentoindivciap2id IN ('W82','W83')

        UNION ALL

        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdatendsoapdigitacao a
          ON a.sdatendsoapdigitacaodata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        JOIN sdatendimentosoap e
          ON e.sdatendimentosoapunidid   = a.sdatendimentosoapunidid
         AND e.sdatendimentosoapid       = a.sdatendimentosoapid
         AND e.sdatendimentosoappessoaid = g.paciente_id
        JOIN sdatendsoapdigcondicao pr
          ON pr.sdatendimentosoapid      = a.sdatendimentosoapid
         AND pr.sdatendimentosoapunidid  = a.sdatendimentosoapunidid
         AND pr.sdatendsoapdigitacaoid   = a.sdatendsoapdigitacaoid
        WHERE pr.sdatendsoapdigcondicaocidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR pr.sdatendsoapdigcondicaociapid IN ('W82','W83')

        UNION ALL

        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdprocedimentosrealizados a
          ON a.sdprocedimentosrealizadosdata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        JOIN sdatendimento e
          ON e.sdunidadeid = a.sdunidadeid
         AND e.sdatendimentoid = a.sdatendimentoid
         AND e.sdusuarioid = g.paciente_id
        LEFT JOIN sdprocedimentosrealizadoscid b
          ON b.sdunidadeid = a.sdunidadeid
         AND b.sdatendimentoid = a.sdatendimentoid
        WHERE (b.sdprocrealizadossuscidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR a.sdprocrealizadosciap1 IN ('W82','W83')
           OR a.sdprocrealizadosciap2 IN ('W82','W83'))
          AND e.sdconsultarealizada = 'S'
      ) x
    ),
    tmp_elegiveis AS (
      SELECT DISTINCT
        gq.sdindicdimtempoid,
        gq.equipeid AS equipe_id,
        gq.paciente_id,
        gq.dt_ini_gest,
        (gq.dt_ini_gest + INTERVAL '294 days')::date AS dt_42s,
        gq.nome_exib,
        gq.cpf,
        gq.dtnasc
      FROM gestantes_quad gq
      LEFT JOIN tmp_finalizacoes fin
        ON fin.paciente_id = gq.paciente_id
      WHERE fin.paciente_id IS NULL
    ),
    visitas_agg AS (
      SELECT
        e.sdindicdimtempoid,
        e.equipe_id,
        e.paciente_id AS pessoa_id,
        COUNT(*) FILTER (
          WHERE em.sdequipemedicatipoid = '76'
             OR (
               em.sdequipemedicatipoid = '70'
               AND a.sdvisitadomiciliarid IS NOT NULL
               AND a.sdvisitadomiciliardata::date BETWEEN e.dt_ini_gest AND e.dt_42s
               AND a.sdvisitadomiciliarcboprofid IN ('322255','515105')
               AND a.sdvisitadomiciliardesfecho = 1
               AND a.sdvisitadomiciliargestante = 'S'
             )
        ) AS qtde_visitas
      FROM tmp_elegiveis e
      LEFT JOIN sdvisitadomiciliar a
        ON a.sdvisitadomiciliarusuarioid = e.paciente_id
       AND a.sdvisitadomiciliardesfecho = 1
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = e.equipe_id
       AND em.sdequipemedicatipoid IN ('70','76')
      GROUP BY 1,2,3
    ),
    atendidos AS (
      SELECT v.sdindicdimtempoid, v.equipe_id, v.pessoa_id
      FROM visitas_agg v
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = v.equipe_id
      WHERE v.qtde_visitas >= 3
         OR em.sdequipemedicatipoid = '76'
    )
    SELECT
      e.paciente_id AS pessoa_id,
      e.nome_exib AS nome,
      e.cpf,
      e.dtnasc AS data_nascimento,
      COALESCE(v.qtde_visitas, 0) AS realizado,
      COALESCE(v.qtde_visitas, 0) AS realizado_total,
      3 AS necessario,
      NULL::text AS flag2,
      NULL::text AS flag3,
      NULL::text AS observacao,
      'GESTANTE E PUÉRPERA' AS indicador_nome,
      '3 Visitas domiciliares.' AS indicador_detalhe
    FROM tmp_elegiveis e
    LEFT JOIN visitas_agg v
      ON v.sdindicdimtempoid = e.sdindicdimtempoid
     AND v.equipe_id = e.equipe_id
     AND v.pessoa_id = e.paciente_id
    LEFT JOIN atendidos a
      ON a.sdindicdimtempoid = e.sdindicdimtempoid
     AND a.equipe_id = e.equipe_id
     AND a.pessoa_id = e.paciente_id
    WHERE a.pessoa_id IS NULL
  `;

    const gestantePuerperioQuery = `
    WITH pessoas_candidatas AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoaequipeid  AS equipeid,
        p.sdpessoaunidadeid AS unidadeid,
        p.sdpessoadtultimaatualizacaoger::date AS dt_ult_atualiza,
        p.sdpessoadtcadastro::date             AS dt_cadastro,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND COALESCE(dp.sddomiciliopacientemudou,'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca,'N') <> 'S'
        AND p.sdpessoaequipeid = $1
    ),
    gestantes_base AS (
      SELECT
        c.sdpessoaid AS paciente_id,
        c.equipeid,
        c.unidadeid,
        g.sdgestacaodum::date AS dt_ini_gest,
        (g.sdgestacaodum + INTERVAL '295 days')::date AS dt_ini_puerp,
        (g.sdgestacaodum + INTERVAL '337 days')::date AS dt_fim_puerp,
        c.dt_ult_atualiza,
        c.dt_cadastro,
        c.nome_exib,
        c.cpf,
        c.dtnasc
      FROM sdgestacao g
      JOIN pessoas_candidatas c
        ON c.sdpessoaid = g.sdgestacaopessoaid
    ),
    gestantes_quad AS (
      SELECT
        d.sdindicdimtempoid,
        d.dt_ini,
        d.dt_fim,
        g.equipeid,
        g.unidadeid,
        g.paciente_id,
        g.dt_ini_gest,
        g.dt_ini_puerp,
        g.dt_fim_puerp,
        g.nome_exib,
        g.cpf,
        g.dtnasc
      FROM (
        SELECT
          sdindicdimtempoid,
          sdindicdimtempodatainicialquad::date AS dt_ini,
          sdindicdimtempodatafinalquad::date   AS dt_fim
        FROM sdindicdimtempo
        WHERE sdindicdimtempodatafinalquad::date = $2::date
          AND sdindicdimtempodatainicialquad::date = $3::date
      ) d
      JOIN gestantes_base g
        ON g.dt_fim_puerp BETWEEN d.dt_ini AND d.dt_fim
       AND (
            (g.dt_ult_atualiza IS NOT NULL AND g.dt_ult_atualiza BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim)
         OR (g.dt_cadastro IS NOT NULL AND g.dt_cadastro BETWEEN d.dt_fim - INTERVAL '2 years' AND d.dt_fim)
       )
    ),
    tmp_finalizacoes AS (
      SELECT DISTINCT paciente_id
      FROM (
        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdatendimentoindiv c
          ON c.sdatendimentoindivusuarioid = g.paciente_id
         AND c.sdatendimentoindivdata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        WHERE c.sdatendimentoindivcidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR c.sdatendimentoindivcid2id IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR c.sdatendimentoindivciap1id IN ('W82','W83')
           OR c.sdatendimentoindivciap2id IN ('W82','W83')

        UNION ALL

        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdatendsoapdigitacao a
          ON a.sdatendsoapdigitacaodata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        JOIN sdatendimentosoap e
          ON e.sdatendimentosoapunidid   = a.sdatendimentosoapunidid
         AND e.sdatendimentosoapid       = a.sdatendimentosoapid
         AND e.sdatendimentosoappessoaid = g.paciente_id
        JOIN sdatendsoapdigcondicao pr
          ON pr.sdatendimentosoapid      = a.sdatendimentosoapid
         AND pr.sdatendimentosoapunidid  = a.sdatendimentosoapunidid
         AND pr.sdatendsoapdigitacaoid   = a.sdatendsoapdigitacaoid
        WHERE pr.sdatendsoapdigcondicaocidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR pr.sdatendsoapdigcondicaociapid IN ('W82','W83')

        UNION ALL

        SELECT g.paciente_id
        FROM gestantes_base g
        JOIN sdprocedimentosrealizados a
          ON a.sdprocedimentosrealizadosdata::date BETWEEN g.dt_ini_gest AND (g.dt_ini_gest + INTERVAL '294 days')::date
        JOIN sdatendimento e
          ON e.sdunidadeid = a.sdunidadeid
         AND e.sdatendimentoid = a.sdatendimentoid
         AND e.sdusuarioid = g.paciente_id
        LEFT JOIN sdprocedimentosrealizadoscid b
          ON b.sdunidadeid = a.sdunidadeid
         AND b.sdatendimentoid = a.sdatendimentoid
        WHERE b.sdprocrealizadossuscidid IN ('O02','O021','O03','O04','O05','O06','Z303')
           OR a.sdprocrealizadosciap1 IN ('W82','W83')
           OR a.sdprocrealizadosciap2 IN ('W82','W83')
      ) x
    ),
    tmp_elegiveis AS (
      SELECT DISTINCT
        gq.sdindicdimtempoid,
        gq.equipeid AS equipe_pessoa_id,
        gq.paciente_id,
        gq.dt_ini_gest,
        gq.dt_ini_puerp,
        gq.dt_fim_puerp,
        gq.nome_exib,
        gq.cpf,
        gq.dtnasc
      FROM gestantes_quad gq
      LEFT JOIN tmp_finalizacoes fin
        ON fin.paciente_id = gq.paciente_id
      WHERE fin.paciente_id IS NULL
    ),
    visitas_agg AS (
      SELECT
        e.sdindicdimtempoid,
        e.equipe_pessoa_id,
        e.paciente_id AS pessoa_id,
        COUNT(*) FILTER (
          WHERE em.sdequipemedicatipoid = '76'
             OR (
               em.sdequipemedicatipoid = '70'
               AND a.sdvisitadomiciliarid IS NOT NULL
               AND a.sdvisitadomiciliardata::date BETWEEN e.dt_ini_gest AND e.dt_fim_puerp
               AND a.sdvisitadomiciliarcboprofid IN ('322255','515105')
               AND a.sdvisitadomiciliardesfecho = 1
               AND a.sdvisitadomiciliarpuerpera = 'S'
             )
        ) AS qtde_visitas
      FROM tmp_elegiveis e
      LEFT JOIN sdvisitadomiciliar a
        ON a.sdvisitadomiciliarusuarioid = e.paciente_id
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = e.equipe_pessoa_id
       AND em.sdequipemedicatipoid IN ('70','76')
      WHERE a.sdvisitadomiciliardesfecho = 1
      GROUP BY 1,2,3
    ),
    atendidos AS (
      SELECT v.sdindicdimtempoid, v.equipe_pessoa_id, v.pessoa_id
      FROM visitas_agg v
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = v.equipe_pessoa_id
      WHERE v.qtde_visitas >= 1
         OR em.sdequipemedicatipoid = '76'
    )
    SELECT
      e.paciente_id AS pessoa_id,
      e.nome_exib AS nome,
      e.cpf,
      e.dtnasc AS data_nascimento,
      COALESCE(v.qtde_visitas, 0) AS realizado,
      COALESCE(v.qtde_visitas, 0) AS realizado_total,
      1 AS necessario,
      NULL::text AS flag2,
      NULL::text AS flag3,
      NULL::text AS observacao,
      'GESTANTE E PUÉRPERA' AS indicador_nome,
      '1 Visita domiciliar.' AS indicador_detalhe
    FROM tmp_elegiveis e
    LEFT JOIN visitas_agg v
      ON v.sdindicdimtempoid = e.sdindicdimtempoid
     AND v.equipe_pessoa_id = e.equipe_pessoa_id
     AND v.pessoa_id = e.paciente_id
    LEFT JOIN atendidos a
      ON a.sdindicdimtempoid = e.sdindicdimtempoid
     AND a.equipe_pessoa_id = e.equipe_pessoa_id
     AND a.pessoa_id = e.paciente_id
    WHERE a.pessoa_id IS NULL
  `;

    const desenvInfantilQuery = `
    WITH pessoas_candidatas AS (
      SELECT DISTINCT
        p.sdpessoaid,
        p.sdpessoaequipeid  AS equipeid,
        p.sdpessoaunidadeid AS unidadeid,
        p.sdpessoadtultimaatualizacaoger::date AS dt_ult_atualiza,
        p.sdpessoadtcadastro::date             AS dt_cadastro,
        COALESCE(p.sdpessoaprenome, p.sdpessoanom, 'Sem nome') AS nome_exib,
        COALESCE(p.sdpessoacpf, '') AS cpf,
        p.sdpessoadtnasc::date AS dtnasc
      FROM sdpessoa p
      JOIN sdparametrogeral pg ON pg.sdparammunicipioid = p.sdpessoaendmunic
      JOIN sdequipemedica eq
        ON eq.sdequipemedicaid = p.sdpessoaequipeid
       AND eq.sdequipemedicatipoid IN ('70','76')
      JOIN sdunidade us
        ON us.sdunidadeid = p.sdpessoaunidadeid
       AND us.sdparamunidintegraesus = 'S'
      LEFT JOIN LATERAL (
        SELECT dp.*
        FROM sddomiciliopacientes dp
        WHERE dp.sddomiciliousuarioid = p.sdpessoaid
        ORDER BY dp.sddomiciliopacientesdatainclusao DESC
        LIMIT 1
      ) dp ON TRUE
      WHERE p.sdpessoainativo = 0
        AND COALESCE(dp.sddomiciliopacientemudou,'N') <> 'S'
        AND COALESCE(p.sdpessoasaidacadastromudanca,'N') <> 'S'
        AND p.sdpessoaequipeid = $1
    ),
    pessoas_base AS (
      SELECT DISTINCT
        c.sdpessoaid,
        c.equipeid,
        c.unidadeid,
        c.nome_exib,
        c.cpf,
        c.dtnasc,
        c.dt_ult_atualiza,
        c.dt_cadastro
      FROM pessoas_candidatas c
    ),
    pessoas_quad AS (
      SELECT
        t.sdindicdimtempoid,
        t.dt_ini,
        t.dt_fim,
        p.equipeid,
        p.unidadeid,
        p.sdpessoaid
      FROM (
        SELECT
          sdindicdimtempoid,
          sdindicdimtempodatainicialquad::date AS dt_ini,
          sdindicdimtempodatafinalquad::date   AS dt_fim
        FROM sdindicdimtempo
        WHERE sdindicdimtempodatafinalquad::date = $2::date
          AND sdindicdimtempodatainicialquad::date = $3::date
      ) t
      JOIN pessoas_base p
        ON (
             p.dt_ult_atualiza IS NOT NULL
             AND p.dt_ult_atualiza BETWEEN t.dt_fim - INTERVAL '2 years' AND t.dt_fim
           )
        OR (
             p.dt_cadastro IS NOT NULL
             AND p.dt_cadastro BETWEEN t.dt_fim - INTERVAL '2 years' AND t.dt_fim
           )
    ),
    elegiveis_dim_tmp AS (
      SELECT
        q.sdindicdimtempoid,
        q.dt_ini,
        q.dt_fim,
        q.sdpessoaid AS paciente_id,
        q.equipeid   AS equipe_pessoa_id,
        p.dtnasc     AS pessoa_dt_nasc,
        p.nome_exib,
        p.cpf
      FROM pessoas_quad q
      JOIN pessoas_base p
        ON p.sdpessoaid = q.sdpessoaid
      WHERE p.dtnasc + INTERVAL '2 years' BETWEEN q.dt_ini AND q.dt_fim
    ),
    tmp_parciais AS (
      SELECT
        el.sdindicdimtempoid,
        el.equipe_pessoa_id,
        el.paciente_id,
        MAX(el.nome_exib) AS nome_exib,
        MAX(el.cpf) AS cpf,
        MAX(el.pessoa_dt_nasc) AS pessoa_dt_nasc,
        COUNT(*) FILTER (
          WHERE v.sdvisitadomiciliardata::date
            BETWEEN el.pessoa_dt_nasc AND el.pessoa_dt_nasc + INTERVAL '30 days'
        ) AS cons_30dias,
        COUNT(*) FILTER (
          WHERE v.sdvisitadomiciliardata::date >  el.pessoa_dt_nasc + INTERVAL '30 days'
            AND v.sdvisitadomiciliardata::date <= el.pessoa_dt_nasc + INTERVAL '6 months'
        ) AS cons_6meses,
        MAX(CASE WHEN em.sdequipemedicatipoid = '76' THEN 1 ELSE 0 END) AS equipe_76
      FROM elegiveis_dim_tmp el
      JOIN sdequipemedica em
        ON em.sdequipemedicaid = el.equipe_pessoa_id
       AND em.sdequipemedicatipoid IN ('70','76')
      LEFT JOIN sdvisitadomiciliar v
        ON v.sdvisitadomiciliarusuarioid = el.paciente_id
       AND v.sdvisitadomiciliardesfecho = 1
       AND v.sdvisitadomiciliarcboprofid IN ('515105','322255')
       AND v.sdvisitadomiciliardata::date BETWEEN el.pessoa_dt_nasc AND el.pessoa_dt_nasc + INTERVAL '6 months'
       AND (v.sdvisitadomiciliarcrianca = 'S' OR v.sdvisitadomiciliarrecemnasc = 'S')
       AND EXISTS (
         SELECT 1
         FROM sdequipemedica ev
         WHERE ev.sdequipemedicaid = v.sdvisitadomiciliarequipeid
           AND ev.sdequipemedicatipoid IN ('70','76')
       )
       AND EXISTS (
         SELECT 1
         FROM sdunidade u
         WHERE u.sdunidadeid = v.sdvisitadomiciliarunidadeid
           AND u.sdparamunidintegraesus = 'S'
       )
      WHERE em.sdequipemedicatipoid = '76'
         OR (em.sdequipemedicatipoid = '70' AND v.sdvisitadomiciliarusuarioid IS NOT NULL)
      GROUP BY 1,2,3
    ),
    tmp_eventos AS (
      SELECT
        p.sdindicdimtempoid,
        p.equipe_pessoa_id,
        p.paciente_id,
        p.cons_30dias,
        p.cons_6meses,
        p.equipe_76
      FROM tmp_parciais p
      WHERE (p.cons_30dias >= 1 AND p.cons_6meses >= 1)
         OR p.equipe_76 >= 1
    )
    SELECT
      e.paciente_id AS pessoa_id,
      COALESCE(p.nome_exib, e.nome_exib) AS nome,
      COALESCE(p.cpf, e.cpf) AS cpf,
      COALESCE(p.pessoa_dt_nasc, e.pessoa_dt_nasc) AS data_nascimento,
      COALESCE(p.cons_30dias, 0) + COALESCE(p.cons_6meses, 0) AS realizado,
      COALESCE(p.cons_30dias, 0) + COALESCE(p.cons_6meses, 0) AS realizado_total,
      2 AS necessario,
      CASE WHEN COALESCE(p.cons_30dias,0) > 0 THEN 'S' ELSE 'N' END AS flag2,
      CASE WHEN COALESCE(p.cons_6meses,0) > 0 THEN 'S' ELSE 'N' END AS flag3,
      NULL::text AS observacao,
      'DESENVOLVIMENTO INFANTIL' AS indicador_nome,
      '2 Visitas até 6 meses de vida' AS indicador_detalhe
    FROM elegiveis_dim_tmp e
    LEFT JOIN tmp_eventos ev
      ON ev.sdindicdimtempoid = e.sdindicdimtempoid
     AND ev.equipe_pessoa_id = e.equipe_pessoa_id
     AND ev.paciente_id = e.paciente_id
    LEFT JOIN tmp_parciais p
      ON p.sdindicdimtempoid = e.sdindicdimtempoid
     AND p.equipe_pessoa_id = e.equipe_pessoa_id
     AND p.paciente_id = e.paciente_id
    WHERE ev.paciente_id IS NULL
  `;

    const [
      rowsIdoso,
      rowsDiabetes,
      rowsHiper,
      rowsGest3,
      rowsGestPuerp,
      rowsDesenv,
    ] = await Promise.all([
      db.query(idosoQuery, params3),
      db.query(diabetesQuery, params2),
      db.query(hipertensaoQuery, params2),
      db.query(gestante3Query, params3),
      db.query(gestantePuerperioQuery, params3),
      db.query(desenvInfantilQuery, params3),
    ]);

    const mapIndicadorId = (nome: string, detalhe: string) => {
      const n = String(nome ?? '').trim().toUpperCase();
      const d = String(detalhe ?? '').trim().toUpperCase();

      if (n === 'DESENVOLVIMENTO INFANTIL') return 'desenvolvimento-infantil';
      if (n === 'GESTANTE E PUÉRPERA' && d.includes('3 VISITAS')) return 'gestante-3-visitas';
      if (n === 'GESTANTE E PUÉRPERA' && d.includes('1 VISITA')) return 'gestante-puerperio-1-visita';
      if (n === 'PESSOA COM DIABETES') return 'diabetes';
      if (n === 'PESSOA COM HIPERTENSÃO' || n === 'PESSOA COM HIPERTENSAO') return 'hipertensao';
      if (n === 'PESSOA IDOSA') return 'idoso';
      return null;
    };

    const montarFalta = (
      indicadorId: string,
      realizado: number,
      necessario: number,
      flag2?: string | null,
      flag3?: string | null,
      observacao?: string | null,
      realizadoTotal?: number | null
    ) => {
      if (flag2 === 'GAP_INVALIDO') {
        return `Possui ${realizadoTotal ?? 0} visitas registradas, mas sem intervalo mínimo de 30 dias entre elas`;
      }

      if (indicadorId === 'desenvolvimento-infantil') {
        const falta30 = flag2 !== 'S';
        const falta6m = flag3 !== 'S';

        if (falta30 && falta6m) return 'Falta visita até 30 dias e visita até 6 meses';
        if (falta30) return 'Falta visita até 30 dias';
        if (falta6m) return 'Falta visita entre 30 dias e 6 meses';
        return observacao || 'Pendência no desenvolvimento infantil';
      }

      const faltam = Math.max(necessario - (realizado || 0), 0);

      switch (indicadorId) {
        case 'gestante-3-visitas':
          return faltam === 1
            ? 'Falta 1 visita domiciliar na gestação'
            : `Faltam ${faltam} visitas domiciliares na gestação`;

        case 'gestante-puerperio-1-visita':
          return faltam === 1
            ? 'Falta 1 visita domiciliar no puerpério'
            : `Faltam ${faltam} visitas domiciliares no puerpério`;

        case 'diabetes':
          return faltam === 1
            ? 'Falta 1 visita domiciliar de diabetes'
            : `Faltam ${faltam} visitas domiciliares de diabetes`;

        case 'hipertensao':
          return faltam === 1
            ? 'Falta 1 visita domiciliar de hipertensão'
            : `Faltam ${faltam} visitas domiciliares de hipertensão`;

        case 'idoso':
          return faltam === 1
            ? 'Falta 1 visita domiciliar para pessoa idosa'
            : `Faltam ${faltam} visitas domiciliares para pessoa idosa`;

        default:
          return observacao || 'Pendência no indicador';
      }
    };

    const todosRows = [
      ...rowsIdoso,
      ...rowsDiabetes,
      ...rowsHiper,
      ...rowsGest3,
      ...rowsGestPuerp,
      ...rowsDesenv,
    ];

    const gruposMap = new Map<
      string,
      { id: string; titulo: string; descricao: string; pacientes: any[] }
    >();

    for (const row of todosRows) {
      const indicadorId = mapIndicadorId(row.indicador_nome, row.indicador_detalhe);
      if (!indicadorId) continue;

      const realizado = Number(row.realizado ?? 0);
      const realizadoTotal = Number(row.realizado_total ?? row.realizado ?? 0);
      const necessario = Number(row.necessario ?? 0);

      const paciente = {
        pessoaId: Number(row.pessoa_id),
        nome: row.nome,
        cpf: row.cpf,
        dataNascimento: row.data_nascimento,
        idade: null,
        indicadorId,
        indicadorNome: row.indicador_nome,
        indicadorDetalhe: row.indicador_detalhe,
        status: 'N',
        realizado,
        realizadoTotal,
        necessario,
        falta: montarFalta(
          indicadorId,
          realizado,
          necessario,
          row.flag2,
          row.flag3,
          row.observacao,
          realizadoTotal
        ),
        observacao: row.observacao ?? null,
        flag2: row.flag2 ?? null,
        flag3: row.flag3 ?? null,
      };

      if (!gruposMap.has(indicadorId)) {
        gruposMap.set(indicadorId, {
          id: indicadorId,
          titulo: row.indicador_nome,
          descricao: row.indicador_detalhe,
          pacientes: [],
        });
      }

      gruposMap.get(indicadorId)!.pacientes.push(paciente);
    }

    const dados = Array.from(gruposMap.values());

    const formatarData = (d: any) => {
      if (!d) return '';

      const valor = String(d).slice(0, 10); // pega yyyy-mm-dd com segurança
      const [ano, mes, dia] = valor.split('-');

      if (!ano || !mes || !dia) return '';

      return `${dia}/${mes}/${ano}`;
    };

    return {
      status: 'S',
      quadrimestre: {
        id: Number(quad.sdindicdimtempoid),
        dataInicial: quad.dt_ini,
        dataFinal: quad.dt_fim,
        descricao: `${formatarData(quad.dt_ini)} a ${formatarData(quad.dt_fim)}`,
      },
      profissional: {
        id: String(prof.sdpessoaid),
        nome: prof.nome,
      },
      totalPendentes: dados.reduce((acc, g) => acc + g.pacientes.length, 0),
      dados,
    };
  }

  async buscarEnderecosDne(termo: string, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(
      `SELECT c.sdlogradourodneid AS "dneId",
              c.sdlogradourocepdneid AS "cepDneId",
              c.sdlogradourocepdnenomeconcatenado AS "nomeConcatenado",
              c.sdlogradourocepdnecep AS "cep",
              b.sdbairrodnenome AS "bairro"
         FROM public.sdlogradourocepdne c
         LEFT JOIN public.sdbairrodne b
           ON b.sdbairrodneid = c.sdlogradourocepdnebairroid
        WHERE c.sdlogradourocepdnenomeconcatenado ILIKE $1
           OR c.sdlogradourocepdnenomeconcatenadosemacento ILIKE $1
        LIMIT 20`,
      [`%${termo}%`]
    );

    return { status: 'S', dados };
  }

  async buscarMunicipiosAutocomplete(termo: string, municipioSlug: string) {
    const db = await this.getDb(municipioSlug);
    const dados = await db.query(
      `SELECT sdmunicipioid AS id, sdmunicipiodesc AS nome
         FROM sdmunicipio
        WHERE sdmunicipiodes ILIKE $1
        ORDER BY sdmunicipiodesc ASC
        LIMIT 20`,
      [`%${termo}%`]
    );
    return { status: 'S', dados };
  }

  async listarMunicipiosGeral(termo: string, municipioSlug: string) {
    const dados = await this.tenantService.listarAtivos();
    return { status: 'S', dados };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AGENDAMENTO — Vagas disponíveis
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Retorna a lista de profissionais que possuem agendas ativas,
   * usada para popular o filtro de profissional na tela de agendamento.
   */
  async buscarProfissionaisAgenda(municipioSlug: string) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(`
      SELECT DISTINCT
        p.sdprofissionalid  AS id,
        p.sdprofissionalnom AS nome,
        COALESCE(se.sdservicoespecdes, '') AS especialidade
      FROM sdagenda a
      JOIN sdprofissional p
        ON p.sdprofissionalid = a.sdprofissionalid
      LEFT JOIN sdservicoespec se
        ON se.sdservicoespecid = a.sdprofissionalservicoespecid
      WHERE COALESCE(a.sdagendabloqueada, 'N') <> 'S'
        AND (a.sdagendavalfinal IS NULL OR a.sdagendavalfinal >= CURRENT_DATE)
      ORDER BY p.sdprofissionalnom
    `);

    return { status: 'S', dados };
  }

  /**
   * Retorna as vagas disponíveis para uma data e, opcionalmente, um profissional.
   *
   * Uma vaga é considerada disponível quando:
   *   • existe em sdagendaitem com sdagendastatus = 1 (ativo)
   *   • a agenda pai não está bloqueada
   *   • NÃO existe um sdagendamentoitem vinculado a um agendamento
   *     com situação diferente de 'C' (cancelado)
   *
   * Retorna agrupado por profissional, com a lista de horários livres
   * e o total de vagas disponíveis.
   */
  async buscarVagasDisponiveis(
    data: string,
    profissionalId: number | null,
    municipioSlug: string
  ) {
    const db = await this.getDb(municipioSlug);

    const dados = await db.query(
      `
      SELECT
        p.sdprofissionalid                                                      AS profissional_id,
        p.sdprofissionalnom                                                     AS profissional,
        COALESCE(se.sdservicoespecdes, '')                                     AS especialidade,
        COUNT(*)::int                                                           AS total_vagas,
        json_agg(
          to_char(ai.sdagendaitemhoraini, 'HH24:MI')
          ORDER BY ai.sdagendaitemhoraini
        )                                                                       AS horarios
      FROM sdagendaitem ai
      JOIN sdagenda a
        ON a.sdagendaid       = ai.sdagendaid
       AND a.sdagendaunidadeid = ai.sdagendaunidadeid
      LEFT JOIN sdprofissional p
        ON p.sdprofissionalid = a.sdprofissionalid
      LEFT JOIN sdservicoespec se
        ON se.sdservicoespecid = a.sdprofissionalservicoespecid
      WHERE ai.sdagendaitemdata         = $1::date
        
        AND COALESCE(a.sdagendabloqueada, 'N') <> 'S'
      
        AND NOT EXISTS (
          SELECT 1
          FROM sdagendamentoitem ami
          JOIN sdagendamento ag
            ON ag.sdagendamentoid       = ami.sdagendamentoid
           AND ag.sdagendamentounidsolic = ami.sdagendamentounidsolic
          WHERE ami.sdagendaid          = ai.sdagendaid
            AND ami.sdagendaunidadeid   = ai.sdagendaunidadeid
            AND ami.sdagendaitemdata    = ai.sdagendaitemdata
            AND ami.sdagendaitemhoraini = ai.sdagendaitemhoraini
            AND ag.sdagendamentosituacao NOT IN ('C')
        )
      GROUP BY
        p.sdprofissionalid,
        p.sdprofissionalnom,
        se.sdservicoespecdes
      ORDER BY p.sdprofissionalnom
      `,
      [data]
    );

    return { status: 'S', dados };
  }

}