import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AtividadeColetivaHandler {
  private readonly logger = new Logger(AtividadeColetivaHandler.name);

  public dataSource!: DataSource;

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
      if (typeof v === 'string' && v.includes(',')) v = v.replace(',', '.'); // Trata peso com vírgula
      const n = Number(v);
      return isNaN(n) ? null : n;
    };
    const sn = (v: any): string => (v === true || v === 'S' || v === 's' || v === 1 || v === '1') ? 'S' : 'N';
    const dateOrNull = (v: any): string | null => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      if (String(v).includes('/')) return String(v).split('/').reverse().join('-');
      return String(v).substring(0, 10);
    };

    this.logger.log(`[Atividade Coletiva] Sync do GUID: ${cleanGuid}`);

    // ── Resolver FK com fallback ───────────────────────────────────────────
    const checkFk = async (table: string, pk: string, val: any) => {
      if (val === null || val === undefined) return null;
      try {
        const res = await dataSource.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1 LIMIT 1`, [val]);
        if (res.length > 0) return val;
        const fallback = await dataSource.query(`SELECT ${pk} FROM ${table} LIMIT 1`);
        return fallback.length > 0 ? fallback[0][pk] : null;
      } catch {
        return null;
      }
    };

    // ── Mapeamento do Payload Frontend -> Variáveis ────────────────────────
    const data        = dateOrNull(dados.data);
    const turno       = str(dados.turno) || 'M';
    const local       = str(dados.local, 250);
    const inep        = num(dados.inep);
    const escolaId    = num(dados.escolaId);
    const localUnidId = num(dados.localUnidadeId);
    const pseEducacao = sn(dados.pseEducacao);
    const pseSaude    = sn(dados.pseSaude);

    const unidadeId   = await checkFk('sdunidade', 'sdunidadeid', num(dados.unidadeId) || num(dados.SDAtividadeColetivaUnidId));
    const profId      = await checkFk('sdprofissional', 'sdprofissionalid', num(dados.profissionalId) || num(dados.SDAtivColResponsavelId));
    const cboId       = str(dados.cboCodigo || dados.SDAtivColResponsavelCboId, 6);
    const equipeId    = await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.equipeId) || num(dados.SDAtividadeColetivaEquipId));

    const atividadeId  = num(dados.atividadeId);
    const procSigtap   = str(dados.procedimentoSigtap, 10);
    const numPartic    = num(dados.numParticipantes);
    const numAvalAlt   = num(dados.numAvaliacoesAlteradas);

    const temAdmin     = sn(dados.temaAdmin);
    const temProcesso  = sn(dados.temaProcesso);
    const temDiag      = sn(dados.temaDiag);
    const temPlan      = sn(dados.temaPlan);
    const temDisc      = sn(dados.temaDisc);
    const temEduc      = sn(dados.temaEduc);
    const temOut       = sn(dados.temaOutrosReuniao);

    const pubComunidade  = sn(dados.pubComunidade);
    const pubCri03       = sn(dados.pubCri03);
    const pubCri45       = sn(dados.pubCri45);
    const pubCri611      = sn(dados.pubCri611);
    const pubAdolescente = sn(dados.pubAdolescente);
    const pubMulher      = sn(dados.pubMulher);
    const pubGestante    = sn(dados.pubGestante);
    const pubHomem       = sn(dados.pubHomem);
    const pubFamilia     = sn(dados.pubFamilia);
    const pubIdoso       = sn(dados.pubIdoso);
    const pubCronico     = sn(dados.pubCronico);
    const pubTabaco      = sn(dados.pubTabaco);
    const pubAlcool      = sn(dados.pubAlcool);
    const pubDrogas      = sn(dados.pubDrogas);
    const pubMental      = sn(dados.pubMental);
    const pubEducacao    = sn(dados.pubEducacao);
    const pubOutros      = sn(dados.pubOutros);

    const tsAedes           = sn(dados.tsAedes);
    const tsAgravos         = sn(dados.tsAgravos);
    const tsAlimentacao     = sn(dados.tsAlimentacao);
    const tsAutocuidado     = sn(dados.tsAutocuidado);
    const tsCidadania       = sn(dados.tsCidadania);
    const tsDependencia     = sn(dados.tsDependencia);
    const tsEnvelhecimento  = sn(dados.tsEnvelhecimento);
    const tsPlantas         = sn(dados.tsPlantas);
    const tsViolencia       = sn(dados.tsViolencia);
    const tsAmbiental       = sn(dados.tsAmbiental);
    const tsBucal           = sn(dados.tsBucal);
    const tsTrabalhador     = sn(dados.tsTrabalhador);
    const tsMental          = sn(dados.tsMental);
    const tsSexual          = sn(dados.tsSexual);
    const tsSemanaEscola    = sn(dados.tsSemanaEscola);
    const tsAmamentacao     = sn(dados.tsAmamentacao);
    const tsAlimentacaoComp = sn(dados.tsAlimentacaoComp);
    const tsOutros          = sn(dados.tsOutros);

    const psAntropometria     = sn(dados.psAntropometria);
    const psFluor             = sn(dados.psFluor);
    const psLinguagem         = sn(dados.psLinguagem);
    const psEscovacao         = sn(dados.psEscovacao);
    const psCorporais         = sn(dados.psCorporais);
    const psPnct1             = sn(dados.psPnct1);
    const psPnct2             = sn(dados.psPnct2);
    const psPnct3             = sn(dados.psPnct3);
    const psPnct4             = sn(dados.psPnct4);
    const psAuditiva          = sn(dados.psAuditiva);
    const psOcular            = sn(dados.psOcular);
    const psVacinal           = sn(dados.psVacinal);
    const psOutras            = sn(dados.psOutras);
    const psOutroProcedimento = sn(dados.psOutroProcedimento);

    const observacao = str(dados.observacao, 1024);
    const status     = str(dados.status, 1) || 'F';

    // Transaction Runner
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.query(
        `SELECT sdatividadecoletivaid FROM sdatividadecoletiva WHERE sdatividadecoletivaguid = $1`,
        [cleanGuid]
      );

      const params = [
        data, turno, local, inep, escolaId, localUnidId, pseEducacao, pseSaude,
        profId, cboId, equipeId, unidadeId, atividadeId, procSigtap, numPartic, numAvalAlt,
        temAdmin, temProcesso, temDiag, temPlan, temDisc, temEduc, temOut,
        pubComunidade, pubCri03, pubCri45, pubCri611, pubAdolescente, pubMulher,
        pubGestante, pubHomem, pubFamilia, pubIdoso, pubCronico, pubTabaco,
        pubAlcool, pubDrogas, pubMental, pubEducacao, pubOutros,
        tsAedes, tsAgravos, tsAlimentacao, tsAutocuidado, tsCidadania, tsDependencia,
        tsEnvelhecimento, tsPlantas, tsViolencia, tsAmbiental, tsBucal, tsTrabalhador,
        tsMental, tsSexual, tsSemanaEscola, tsAmamentacao, tsAlimentacaoComp, tsOutros,
        psAntropometria, psFluor, psLinguagem, psEscovacao, psCorporais,
        psPnct1, psPnct2, psPnct3, psPnct4, psAuditiva, psOcular,
        psVacinal, psOutras, psOutroProcedimento,
        observacao, status
      ];

      let pkAtividade: number;

      // 1. UPDATE ou INSERT tabela principal
      if (existing.length > 0) {
        pkAtividade = existing[0].sdatividadecoletivaid;
        await queryRunner.manager.query(
          `UPDATE sdatividadecoletiva SET
            sdatividadecoletivadata=$2, sdatividadecoletivaturno=$3, sdatividadecoletivalocal=$4,
            sdatividadecoletivainep=$5, sdatividadecoletivaescolaid=$6, sdativcollocalativunidadeid=$7,
            sdatividadecoletivapseeduc=$8, sdatividadecoletivapsesaude=$9,
            sdativcolresponsavelid=$10, sdativcolresponsavelcboid=$11, sdatividadecoletivaequipid=$12, sdatividadecoletivaunidid=$13,
            sdatividadecoletivaatividade=$14, sdatividadecoletivaproced=$15, sdativcoletivanumpart=$16, sdativcoletivanumava=$17,
            sdatividadecoletivatemquest=$18, sdatividadecoletivatemproc=$19, sdatividadecoletivatemdiag=$20, sdatividadecoletivatemplan=$21,
            sdatividadecoletivatemdisc=$22, sdatividadecoletivatemeduc=$23, sdatividadecoletivatemout=$24,
            sdatividadecoletivapubcom=$25, sdatividadecoletivapubcri03=$26, sdatividadecoletivapubcri45=$27, sdatividadecoletivapubcri6=$28,
            sdatividadecoletivapubadol=$29, sdatividadecoletivapubmul=$30, sdatividadecoletivapubgest=$31, sdatividadecoletivapubhom=$32,
            sdatividadecoletivapubfam=$33, sdatividadecoletivapubidos=$34, sdatividadecoletivapubpes=$35, sdatividadecoletivapubtab=$36,
            sdatividadecoletivapubalc=$37, sdatividadecoletivapubdrog=$38, sdatividadecoletivapubtrans=$39, sdatividadecoletivapubprof=$40, sdatividadecoletivapubout=$41,
            sdatividadecoletivaaedes=$42, sdatividadecoletivapratagr=$43, sdatividadecoletivapratalim=$44, sdatividadecoletivaprataut=$45,
            sdatividadecoletivapratcid=$46, sdatividadecoletivapratdep=$47, sdatividadecoletivapratenv=$48, sdatividadecoletivapratplant=$49,
            sdatividadecoletivapratpre=$50, sdatividadecoletivapratamb=$51, sdatividadecoletivapratbuc=$52, sdatividadecoletivapratsau=$53,
            sdatividadecoletivapratmen=$54, sdatividadecoletivapratrep=$55, sdatividadecoletivapratsem=$56, sdatividadecoletivapratama=$57,
            sdatividadecoletivapratalimsau=$58, sdatividadecoletivaoutrotema=$59,
            sdatividadecoletivapratant=$60, sdatividadecoletivapratapli=$61, sdatividadecoletivapratling=$62, sdatividadecoletivapratesc=$63,
            sdatividadecoletivapratfis=$64, sdatividadecoletivapratpnct1=$65, sdatividadecoletivapratpnct2=$66, sdatividadecoletivapratpnct3=$67,
            sdatividadecoletivapratpnct4=$68, sdatividadecoletivaprataud=$69, sdatividadecoletivapratacu=$70, sdatividadecoletivapratverif=$71,
            sdatividadecoletivapratout=$72, sdatividadecoletivaoutroproc=$73,
            sdatividadecoletivaobservacao=$74, sdatividadecoletivastatus=$75,
             sdatividadecoletivaenviadoesus='N', sdativcoletivatipooriesus='G'
          WHERE sdatividadecoletivaid = $1`,
          [pkAtividade, ...params]
        );
      } else {
        const res = await queryRunner.manager.query(
          `INSERT INTO sdatividadecoletiva (
            sdatividadecoletivaguid, sdatividadecoletivadata, sdatividadecoletivaturno, sdatividadecoletivalocal,
            sdatividadecoletivainep, sdatividadecoletivaescolaid, sdativcollocalativunidadeid, sdatividadecoletivapseeduc, sdatividadecoletivapsesaude,
            sdativcolresponsavelid, sdativcolresponsavelcboid, sdatividadecoletivaequipid, sdatividadecoletivaunidid,
            sdatividadecoletivaatividade, sdatividadecoletivaproced, sdativcoletivanumpart, sdativcoletivanumava,
            sdatividadecoletivatemquest, sdatividadecoletivatemproc, sdatividadecoletivatemdiag, sdatividadecoletivatemplan,
            sdatividadecoletivatemdisc, sdatividadecoletivatemeduc, sdatividadecoletivatemout,
            sdatividadecoletivapubcom, sdatividadecoletivapubcri03, sdatividadecoletivapubcri45, sdatividadecoletivapubcri6,
            sdatividadecoletivapubadol, sdatividadecoletivapubmul, sdatividadecoletivapubgest, sdatividadecoletivapubhom,
            sdatividadecoletivapubfam, sdatividadecoletivapubidos, sdatividadecoletivapubpes, sdatividadecoletivapubtab,
            sdatividadecoletivapubalc, sdatividadecoletivapubdrog, sdatividadecoletivapubtrans, sdatividadecoletivapubprof, sdatividadecoletivapubout,
            sdatividadecoletivaaedes, sdatividadecoletivapratagr, sdatividadecoletivapratalim, sdatividadecoletivaprataut,
            sdatividadecoletivapratcid, sdatividadecoletivapratdep, sdatividadecoletivapratenv, sdatividadecoletivapratplant,
            sdatividadecoletivapratpre, sdatividadecoletivapratamb, sdatividadecoletivapratbuc, sdatividadecoletivapratsau,
            sdatividadecoletivapratmen, sdatividadecoletivapratrep, sdatividadecoletivapratsem, sdatividadecoletivapratama,
            sdatividadecoletivapratalimsau, sdatividadecoletivaoutrotema,
            sdatividadecoletivapratant, sdatividadecoletivapratapli, sdatividadecoletivapratling, sdatividadecoletivapratesc,
            sdatividadecoletivapratfis, sdatividadecoletivapratpnct1, sdatividadecoletivapratpnct2, sdatividadecoletivapratpnct3,
            sdatividadecoletivapratpnct4, sdatividadecoletivaprataud, sdatividadecoletivapratacu, sdatividadecoletivapratverif,
            sdatividadecoletivapratout, sdatividadecoletivaoutroproc,
            sdatividadecoletivaobservacao, sdatividadecoletivastatus,
            sdatividadecoletivaenviadoesus, sdativcoletivatipooriesus, sdativcoletivadtimporta
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
            $41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
            $51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
            $61, $62, $63, $64, $65, $66, $67, $68, $69, $70,
            $71, $72, $73, $74, $75,
            'N', 'G', NOW()
          ) RETURNING sdatividadecoletivaid`,
          [cleanGuid, ...params]
        );
        pkAtividade = res[0].sdatividadecoletivaid;
      }

      // 2. GRAVA OS PARTICIPANTES (Cidadãos Avaliados)
      if (dados.participantes && Array.isArray(dados.participantes)) {
        // Limpa os antigos para evitar duplicação ou lixo
        await queryRunner.manager.query(
          `DELETE FROM sdativcoletivaparticipante WHERE sdatividadecoletivaid = $1`,
          [pkAtividade]
        );

        let seq = 1;
        for (const p of dados.participantes) {
          const usuarioId = num(p.id); // O id enviado pelo frontend é o sdpessoaid/sdusuarioid
          if (usuarioId) {
            const peso = num(p.peso);
            const altura = num(p.altura);
            
            await queryRunner.manager.query(
              `INSERT INTO sdativcoletivaparticipante (
                sdatividadecoletivaid, sdativcoletivapartseq, sdativcoletivapartid,
                sdativcoletivapartpeso, sdativcoletivapartalt
              ) VALUES ($1, $2, $3, $4, $5)`,
              [pkAtividade, seq, usuarioId, peso, altura]
            );
            seq++;
          }
        }
      }

      await queryRunner.commitTransaction();
      return pkAtividade;

    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[Atividade Coletiva] Erro Transação: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}