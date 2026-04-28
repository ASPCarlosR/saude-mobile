import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class VisitaHandler {
  private readonly logger = new Logger(VisitaHandler.name);

  public dataSource!: DataSource;

  // ── Diretório onde o Genexus armazena os arquivos de assinatura ───────────
  // Ajuste este caminho para o mesmo volume/diretório que o Genexus usa.
  // Normalmente fica em: C:\Inetpub\wwwroot\saude.projeto.smart\private\  (Windows)
  // ou /var/www/saude.projeto.smart/private/ (Linux)
  private readonly ASSINATURA_DIR = process.env.GENEXUS_FILES_DIR
    ?? path.join(process.cwd(), 'genexus-files', 'assinaturas');

  async upsert(guid: string, dados: any, dataSource: DataSource): Promise<number> {
    const cleanGuid = guid.trim();

    // ── Helpers ────────────────────────────────────────────────────────────
    const str = (v: any, max?: number): string | null => {
      if (v === null || v === undefined || v === '') return null;
      const s = String(v).trim();
      return max ? s.substring(0, max) : s;
    };
    const num = (v: any): number | null => {
      if (v === null || v === undefined || v === '' || v === 0 || v === '0') return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };
    const sn = (v: any): string =>
      (v === true || v === 'S' || v === 's' || v === 1 || v === '1') ? 'S' : 'N';
    const dateOrNull = (v: any): string | null => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      return String(v).substring(0, 10);
    };
    const dec = (v: any): number | null => {
      if (v === null || v === undefined || v === '' || v === '0' || v === '0,000') return null;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) || n === 0 ? null : n;
    };

    // ── Resolver FK com fallback (evita erro de FK em ambiente de teste) ────
    const checkFk = async (table: string, pk: string, val: any) => {
      if (val === null || val === undefined) return null;
      try {
        const res = await dataSource.query(
          `SELECT ${pk} FROM ${table} WHERE ${pk} = $1 LIMIT 1`, [val]
        );
        if (res.length > 0) return val;
        const fallback = await dataSource.query(`SELECT ${pk} FROM ${table} LIMIT 1`);
        return fallback.length > 0 ? fallback[0][pk] : null;
      } catch {
        return null;
      }
    };

    // ── Resolver usuarioId a partir do GUID ou ID do paciente ──────────────
    let usuarioId: number | null = null;
    const identificadorPaciente = dados.SDVisitaDomiciliarUsuarioGUID ? String(dados.SDVisitaDomiciliarUsuarioGUID).trim() : '';

    if (identificadorPaciente) {
      let r: any[] = [];
      // Se o identificador for apenas números, significa que o App mandou o ID ao invés do GUID (devido ao fallback offline)
      if (/^\d+$/.test(identificadorPaciente)) {
        r = await dataSource.query(`SELECT sdpessoaid FROM sdpessoa WHERE sdpessoaid = $1`, [parseInt(identificadorPaciente, 10)]);
      } else {
        // Caso contrário, busca pelo GUID
        r = await dataSource.query(`SELECT sdpessoaid FROM sdpessoa WHERE sdpessoaguid = $1`, [identificadorPaciente]);
      }

      if (r.length === 0) {
        throw new Error(
          `Paciente com identificador ${identificadorPaciente} não encontrado no banco. ` +
          `Sincronize o cadastro individual primeiro.`
        );
      }
      usuarioId = r[0].sdpessoaid;
    } else if (dados.SDVisitaDomiciliarUsuarioId) {
      usuarioId = num(dados.SDVisitaDomiciliarUsuarioId);
    }

    // ── Cabeçalho ──────────────────────────────────────────────────────────
    const data = dateOrNull(dados.SDVisitaDomiciliarData);
    let hora = str(dados.SDVisitaDomiciliarHora);
    const turno = str(dados.SDVisitaDomiciliarTurno) ?? 'T';
    const tipoImovel = num(dados.SDVisitaDomiciliarTipoImovel) ?? 1;

    if (!data) {
      this.logger.error(
        `[VisitaHandler] GUID ${cleanGuid} sem SDVisitaDomiciliarData. Payload: ${JSON.stringify(dados)}`
      );
      throw new Error('SDVisitaDomiciliarData não foi enviada.');
    }

    if (!dados.SDVisitaDomiciliarUnidadeId) {
      this.logger.error(
        `[VisitaHandler] GUID ${cleanGuid} sem SDVisitaDomiciliarUnidadeId. Payload: ${JSON.stringify(dados)}`
      );
      throw new Error('SDVisitaDomiciliarUnidadeId não foi enviada.');
    }

    // Formata hora para timestamp Postgres
    if (hora && /^\d{2}:\d{2}$/.test(hora)) {
      hora = `1970-01-01 ${hora}:00`;
    }

    // ── Profissional / equipe / unidade (com FK check) ─────────────────────
    const unidadeId = await checkFk('sdunidade', 'sdunidadeid', num(dados.SDVisitaDomiciliarUnidadeId));
    const profId = await checkFk('sdprofissional', 'sdprofissionalid', num(dados.SDVisitaDomiciliarProfId));
    const equipeId = await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.SDVisitaDomiciliarEquipeId));
    const profCboId = str(dados.SDVisitaDomiciliarCBOProfId, 6);

    // ── Microárea ──────────────────────────────────────────────────────────
    const microarea = str(dados.SDVisitaDomiciliarMicroarea, 2);
    const foraArea = sn(dados.SDVisitaDomiciliarForaArea);
    const visitaCompar = sn(dados.SDVisitaDomiciliarVisitaCompar);

    // ── Motivo da visita ───────────────────────────────────────────────────
    const cadAtualiz = sn(dados.SDVisitaDomiciliarCadAtualiz);
    const periodica = sn(dados.SDVisitaDomiciliarPeriodica);

    // ── Busca ativa ────────────────────────────────────────────────────────
    const consulta = sn(dados.SDVisitaDomiciliarConsulta);
    const exame = sn(dados.SDVisitaDomiciliarExame);
    const vacina = sn(dados.SDVisitaDomiciliarVacina);
    const ativBolsaFam = sn(dados.SDVisitaDomiciliarAtivBolsaFam);

    // ── Acompanhamento ─────────────────────────────────────────────────────
    const puerpera = sn(dados.SDVisitaDomiciliarPuerpera);
    const recemNasc = sn(dados.SDVisitaDomiciliarRecemNasc);
    const crianca = sn(dados.SDVisitaDomiciliarCrianca);
    const desnutricao = sn(dados.SDVisitaDomiciliarDesnutricao);
    const reabilitacao = sn(dados.SDVisitaDomiciliarReabilitacao);
    const hipertensao = sn(dados.SDVisitaDomiciliarHipertensao);
    const diabetes = sn(dados.SDVisitaDomiciliarDiabetes);
    const asma = sn(dados.SDVisitaDomiciliarAsma);
    const dpoc = sn(dados.SDVisitaDomiciliarDPOC);
    const cancer = sn(dados.SDVisitaDomiciliarCancer);
    const cronicas = sn(dados.SDVisitaDomiciliarCronicas);
    const hanseniase = sn(dados.SDVisitaDomiciliarHanseniase);
    const tuberculose = sn(dados.SDVisitaDomiciliarTuberculose);
    const sintResp = sn(dados.SDVisitaDomiciliarSintResp);
    const tabagista = sn(dados.SDVisitaDomiciliarTabagista);
    const acamados = sn(dados.SDVisitaDomiciliarAcamados);
    const vulnerSocial = sn(dados.SDVisitaDomiciliarVulnerSocial);
    const acomBolsaFam = sn(dados.SDVisitaDomiciliarAcomBolsaFam);
    const saudeMental = sn(dados.SDVisitaDomiciliarSaudeMental);
    const usuarAlcool = sn(dados.SDVisitaDomiciliarUsuarAlcool);
    const outrasDrogas = sn(dados.SDVisitaDomiciliarOutrasDrogas);
    const gestante = sn(dados.SDVisitaDomiciliarGestante);
    const pessoaIdosa = sn(dados.SDVisitaDomiciliarPessoaIdosa);

    // ── Dados gestacionais ─────────────────────────────────────────────────
    const gestanteDum = dateOrNull(dados.SDVisitaDomiciliarGestanteDum);
    const gravidezPlanej = sn(dados.SDVisitaDomiciliarGravidezPlanejada);
    const qtdGestacoes = num(dados.SDVisitaDomiciliarQtdGestacoes);
    const idadeGestacional = num(dados.SDVisitaDomiciliarsdIdadeGestacional);
    const qtdCesarias = num(dados.SDVisitaDomiciliarQtdCesarias);
    const qtdPartosNormais = num(dados.SDVisitaDomiciliarQtdPartosNomais);
    const gestasPrevia = num(dados.SDVisitaDomiciliarGestasPrevia);
    const qtdAbortos = num(dados.SDVisitaDomiciliarQtdAbortos);
    const partos = num(dados.SDVisitaDomiciliarPartos);

    // ── Controle ambiental/vetorial ────────────────────────────────────────
    const acaoEduc = sn(dados.SDVisitaDomiciliarAcaoEduc);
    const imovelFoco = sn(dados.SDVisitaDomiciliarImovelFoco);
    const acaoMec = sn(dados.SDVisitaDomiciliarAcaoMec);
    const tratFocal = sn(dados.SDVisitaDomiciliarTratFocal);

    // ── Egresso / outros ───────────────────────────────────────────────────
    const egressoInt = sn(dados.SDVisitaDomiciliarEgressoInt);
    const conviteAtiv = sn(dados.SDVisitaDomiciliarConviteAtiv);
    const orientacao = sn(dados.SDVisitaDomiciliarOrientacao);
    const outros = sn(dados.SDVisitaDomiciliarOutros);

    // ── Antropometria / sinais vitais / glicemia ───────────────────────────
    const peso = dec(dados.SDVisitaDomiciliarPeso);
    const altura = dec(dados.SDVisitaDomiciliarAltura);
    const temperatura = dec(dados.SDVisitaDomiciliarTemperatura);
    const pressaoSistolica = num(dados.SDVisitaDomiciliarPressaoSistolica);
    const pressaoDiastolica = num(dados.SDVisitaDomiciliarPressaoDiastolica);
    const glicemia = num(dados.SDVisitaDomiciliarGlicemia);
    const tipoGlicemia = str(dados.SDVisitaDomiciliarTipoGlicemia,1);

    // ── Desfecho e observação ──────────────────────────────────────────────
    const desfecho = num(dados.SDVisitaDomiciliarDesfecho) ?? 1;
    const obs = str(dados.SDVisitaDomiciliarObs, 50000);
    const latitude = str(dados.SDVisitaDomiciliarLatitude, 40);
    const longitude = str(dados.SDVisitaDomiciliarLongitude, 40);

    // ── ASSINATURA ─────────────────────────────────────────────────────────
    // O Genexus usa um sistema de arquivos próprio.
    // O campo bytea (sdvisitadomiciliarassinaturapaciente) armazena o binário.
    // O campo _gxi (varchar) armazena o ponteiro interno no formato:
    //   "gxdbfile:<tabela>;<campo>;<pk>"  ← formato interno do GX
    // O botão "Assinatura do Paciente" na tela web exibe via endpoint especial.
    //
    // ESTRATÉGIA CORRETA:
    // 1. Salvar o PNG em disco num diretório acessível ao Genexus
    // 2. Gravar o binário no campo bytea
    // 3. Gravar o caminho relativo no campo _gxi no formato correto
    let assinaturaBuffer: Buffer | null = null;
    let assinaturaGxi = '';

    if (dados.SDVisitaDomiciliarAssinaturaPaciente) {
      try {
        const base64Raw = String(dados.SDVisitaDomiciliarAssinaturaPaciente);
        const base64Data = base64Raw.replace(/^data:image\/\w+;base64,/, '');
        assinaturaBuffer = Buffer.from(base64Data, 'base64');

        // Garante que o diretório existe
        if (!fs.existsSync(this.ASSINATURA_DIR)) {
          fs.mkdirSync(this.ASSINATURA_DIR, { recursive: true });
        }

        // Nome de arquivo único baseado no GUID
        const nomeArquivo = `assinatura_${cleanGuid}.png`;
        const caminhoCompleto = path.join(this.ASSINATURA_DIR, nomeArquivo);
        fs.writeFileSync(caminhoCompleto, assinaturaBuffer);

        // O Genexus exige o prefixo "gxdbfile:" no campo _gxi para ler
        // corretamente o binário salvo na coluna bytea principal.
        assinaturaGxi = `gxdbfile:${nomeArquivo}`;

        this.logger.log(`[Assinatura] Salva em: ${caminhoCompleto}`);
      } catch (err: any) {
        this.logger.error(`[Assinatura] Erro ao salvar arquivo: ${err.message}`);
        // Não falha a visita por erro de assinatura
        assinaturaBuffer = null;
        assinaturaGxi = '';
      }
    }

    // ── Verificar existência ───────────────────────────────────────────────
    const existing = await dataSource.query(
      `SELECT sdvisitadomiciliarid FROM sdvisitadomiciliar WHERE sdvisitadomiciliarguid = $1`,
      [cleanGuid]
    );

    const params = [
      data, hora, turno, tipoImovel,
      profId, profCboId, equipeId,
      microarea, foraArea, visitaCompar,
      usuarioId, unidadeId,
      cadAtualiz, periodica,
      consulta, exame, vacina, ativBolsaFam,
      puerpera, recemNasc, crianca, desnutricao, reabilitacao,
      hipertensao, diabetes, asma, dpoc, cancer,
      cronicas, hanseniase, tuberculose, sintResp, tabagista,
      acamados, vulnerSocial, acomBolsaFam, saudeMental,
      usuarAlcool, outrasDrogas, gestante, pessoaIdosa,
      gestanteDum, gravidezPlanej,
      qtdGestacoes, idadeGestacional, qtdCesarias,
      qtdPartosNormais, gestasPrevia, qtdAbortos, partos,
      acaoEduc, imovelFoco, acaoMec, tratFocal,
      egressoInt, conviteAtiv, orientacao, outros,
      peso, altura, temperatura,
      pressaoSistolica, pressaoDiastolica,
      glicemia, tipoGlicemia,
      desfecho, obs,
      assinaturaBuffer, assinaturaGxi,
      latitude, longitude
    ];

    if (existing.length > 0) {
      const visitaId = existing[0].sdvisitadomiciliarid;

      await dataSource.query(
        `UPDATE sdvisitadomiciliar SET
          sdvisitadomiciliardata               = $2,
          sdvisitadomiciliarhora               = $3,
          sdvisitadomiciliarturno              = $4,
          sdvisitadomiciliartipoimovel         = $5,
          sdvisitadomiciliarprofid             = $6,
          sdvisitadomiciliarcboprofid          = $7,
          sdvisitadomiciliarequipeid           = $8,
          sdvisitadomiciliarmicroarea          = $9,
          sdvisitadomiciliarforaarea           = $10,
          sdvisitadomiciliarvisitacompar       = $11,
          sdvisitadomiciliarusuarioid          = $12,
          sdvisitadomiciliarunidadeid          = $13,
          sdvisitadomiciliarcadatualiz         = $14,
          sdvisitadomiciliarperiodica          = $15,
          sdvisitadomiciliarconsulta           = $16,
          sdvisitadomiciliarexame              = $17,
          sdvisitadomiciliarvacina             = $18,
          sdvisitadomiciliarativbolsafam       = $19,
          sdvisitadomiciliarpuerpera           = $20,
          sdvisitadomiciliarrecemnasc          = $21,
          sdvisitadomiciliarcrianca            = $22,
          sdvisitadomiciliardesnutricao        = $23,
          sdvisitadomiciliarreabilitacao       = $24,
          sdvisitadomiciliarhipertensao        = $25,
          sdvisitadomiciliardiabetes           = $26,
          sdvisitadomiciliarasma               = $27,
          sdvisitadomiciliardpoc               = $28,
          sdvisitadomiciliarcancer             = $29,
          sdvisitadomiciliarcronicas           = $30,
          sdvisitadomiciliarhanseniase         = $31,
          sdvisitadomiciliartuberculose        = $32,
          sdvisitadomiciliarsintresp           = $33,
          sdvisitadomiciliartabagista          = $34,
          sdvisitadomiciliaracamados           = $35,
          sdvisitadomiciliarvulnersocial       = $36,
          sdvisitadomiciliaracombolsafam       = $37,
          sdvisitadomiciliarsaudemental        = $38,
          sdvisitadomiciliarusuaralcool        = $39,
          sdvisitadomiciliaroutrasdrogas       = $40,
          sdvisitadomiciliargestante           = $41,
          sdvisitadomiciliarpessoaidosa        = $42,
          sdvisitadomiciliargestantedum        = $43,
          sdvisitadomiciliargravidezplanejada  = $44,
          sdvisitadomiciliarqtdgestacoes       = $45,
          sdvisitadomiciliarsdidadegestacional = $46,
          sdvisitadomiciliarqtdcesarias        = $47,
          sdvisitadomiciliarqtdpartosnomais    = $48,
          sdvisitadomiciliargestasprevia       = $49,
          sdvisitadomiciliarqtdabortos         = $50,
          sdvisitadomiciliarpartos             = $51,
          sdvisitadomiciliaracaoeduc           = $52,
          sdvisitadomiciliarimovelfoco         = $53,
          sdvisitadomiciliaracaomec            = $54,
          sdvisitadomiciliartratfocal          = $55,
          sdvisitadomiciliaregressoint         = $56,
          sdvisitadomiciliarconviteativ        = $57,
          sdvisitadomiciliarorientacao         = $58,
          sdvisitadomiciliaroutros             = $59,
          sdvisitadomiciliarpeso               = $60,
          sdvisitadomiciliaraltura             = $61,
          sdvisitadomiciliartemperatura        = $62,
          sdvisitadomiciliarpressaosistolica   = $63,
          sdvisitadomiciliarpressaodiastolica  = $64,
          sdvisitadomiciliarglicemia           = $65,
          sdvisitadomiciliartipoglicemia       = $66,
          sdvisitadomiciliardesfecho           = $67,
          sdvisitadomiciliarobs                = $68,
          sdvisitadomiciliarassinaturapaciente     = $69,
          sdvisitadomiciliarassinaturapaciente_gxi = $70,
          sdvisitadomiciliarlatitude           = $71,
          sdvisitadomiciliarlongitude          = $72,
          sdvisitadomiciliarregistromobile     = 'I',
          sdvisitadomiciliarenviadoesus        = 'N',
          sdvisitadomiciliartipooriesus       = 'G'
          
        WHERE sdvisitadomiciliarid = $1`,
        [visitaId, ...params]
      );
      return visitaId;

    } else {
      const result = await dataSource.query(
        `INSERT INTO sdvisitadomiciliar (
          sdvisitadomiciliarguid,
          sdvisitadomiciliardata, sdvisitadomiciliarhora, sdvisitadomiciliarturno, sdvisitadomiciliartipoimovel,
          sdvisitadomiciliarprofid, sdvisitadomiciliarcboprofid, sdvisitadomiciliarequipeid,
          sdvisitadomiciliarmicroarea, sdvisitadomiciliarforaarea, sdvisitadomiciliarvisitacompar,
          sdvisitadomiciliarusuarioid, sdvisitadomiciliarunidadeid,
          sdvisitadomiciliarcadatualiz, sdvisitadomiciliarperiodica,
          sdvisitadomiciliarconsulta, sdvisitadomiciliarexame, sdvisitadomiciliarvacina, sdvisitadomiciliarativbolsafam,
          sdvisitadomiciliarpuerpera, sdvisitadomiciliarrecemnasc, sdvisitadomiciliarcrianca, sdvisitadomiciliardesnutricao, sdvisitadomiciliarreabilitacao,
          sdvisitadomiciliarhipertensao, sdvisitadomiciliardiabetes, sdvisitadomiciliarasma, sdvisitadomiciliardpoc, sdvisitadomiciliarcancer,
          sdvisitadomiciliarcronicas, sdvisitadomiciliarhanseniase, sdvisitadomiciliartuberculose, sdvisitadomiciliarsintresp, sdvisitadomiciliartabagista,
          sdvisitadomiciliaracamados, sdvisitadomiciliarvulnersocial, sdvisitadomiciliaracombolsafam, sdvisitadomiciliarsaudemental,
          sdvisitadomiciliarusuaralcool, sdvisitadomiciliaroutrasdrogas, sdvisitadomiciliargestante, sdvisitadomiciliarpessoaidosa,
          sdvisitadomiciliargestantedum, sdvisitadomiciliargravidezplanejada,
          sdvisitadomiciliarqtdgestacoes, sdvisitadomiciliarsdidadegestacional, sdvisitadomiciliarqtdcesarias,
          sdvisitadomiciliarqtdpartosnomais, sdvisitadomiciliargestasprevia, sdvisitadomiciliarqtdabortos, sdvisitadomiciliarpartos,
          sdvisitadomiciliaracaoeduc, sdvisitadomiciliarimovelfoco, sdvisitadomiciliaracaomec, sdvisitadomiciliartratfocal,
          sdvisitadomiciliaregressoint, sdvisitadomiciliarconviteativ, sdvisitadomiciliarorientacao, sdvisitadomiciliaroutros,
          sdvisitadomiciliarpeso, sdvisitadomiciliaraltura, sdvisitadomiciliartemperatura,
          sdvisitadomiciliarpressaosistolica, sdvisitadomiciliarpressaodiastolica,
          sdvisitadomiciliarglicemia, sdvisitadomiciliartipoglicemia,
          sdvisitadomiciliardesfecho, sdvisitadomiciliarobs,
          sdvisitadomiciliarassinaturapaciente, sdvisitadomiciliarassinaturapaciente_gxi,
          sdvisitadomiciliarlatitude, sdvisitadomiciliarlongitude,
          sdvisitadomiciliarregistromobile, sdvisitadomiciliarenviadoesus, sdvisitadomiciliartipooriesus
        ) VALUES (
          $1,
          $2,$3,$4,$5,
          $6,$7,$8,$9,
          $10,$11,
          $12,$13,
          $14,$15,
          $16,$17,$18,$19,
          $20,$21,$22,$23,$24,
          $25,$26,$27,$28,$29,
          $30,$31,$32,$33,$34,
          $35,$36,$37,$38,
          $39,$40,$41,$42,
          $43,$44,
          $45,$46,$47,
          $48,$49,$50,$51,
          $52,$53,$54,$55,
          $56,$57,$58,$59,
          $60,$61,$62,
          $63,$64,
          $65,$66,
          $67,$68,
          $69,$70,
          $71,$72,
          'I', 'N', 'G'
        )
        RETURNING sdvisitadomiciliarid`,
        [cleanGuid, ...params]
      );
      return result[0].sdvisitadomiciliarid;
    }
  }
}