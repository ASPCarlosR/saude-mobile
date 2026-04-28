import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ElegibilidadeHandler {
  private readonly logger = new Logger(ElegibilidadeHandler.name);

  public dataSource!: DataSource;

  async upsert(guid: string, dados: any, dataSource: DataSource): Promise<number>{
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
    const sn = (v: any): string => (v === true || v === 'S' || v === 's' || v === 1 || v === '1') ? 'S' : 'N';
    const dateOrNull = (v: any): string | null => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      if (String(v).includes('/')) return String(v).split('/').reverse().join('-');
      return String(v).substring(0, 10);
    };

    this.logger.log(`[Elegibilidade] Sync do GUID: ${cleanGuid}`);

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

    // ── Mapeamento ─────────────────────────────────────────────────────────

    // Data / Origem
    const data        = dateOrNull(dados.data);
    const turno       = str(dados.turno) || 'M';
    const origem      = num(dados.origem);

    // Profissional / Equipe
    const unidadeId   = await checkFk('sdunidade', 'sdunidadeid', num(dados.unidadeId));
    const profId      = await checkFk('sdprofissional', 'sdprofissionalid', num(dados.profissionalId));
    const cboId       = str(dados.cboCodigo, 6);
    const equipeId    = await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.equipeId));

    // Paciente & Cuidador
    const usuarioId   = await checkFk('sdusuario', 'sdusuarioid', num(dados.pacienteId));
    const cuidadorId  = num(dados.cuidador);

    // CIDs
    const cid1 = str(dados.cidPrincipal, 5);
    const cid2 = str(dados.cidSec1, 5);
    const cid3 = str(dados.cidSec2, 5);

    // Conclusão e Desfechos
    const conclusao     = num(dados.conclusao);
    const concElegivel  = num(dados.concElegivel);

    const cInstClinica  = sn(dados.concInelegivelInstClinica);
    const cNecProp      = sn(dados.concInelegivelNecProp);
    const cAusCuidador  = sn(dados.concInelegivelAusCuidador);
    const cCondSociais  = sn(dados.concInelegivelCondSociais);
    const cOutroMotivo  = sn(dados.concInelegivelOutro);

    // Condições Avaliadas
    const cAcamado      = sn(dados.condAcamado);
    const cDomiciliado  = sn(dados.condDomiciliado);
    const cUlceras      = sn(dados.condUlceras);
    const cAcompNutri   = sn(dados.condAdapOrtese); // Frontend manda Acomp. Nutri em condAdapOrtese
    const cSNG          = sn(dados.condSondaSNG);
    const cSNE          = sn(dados.condSondaSNE);
    const cGastro       = sn(dados.condGastro);
    const cColostomia   = sn(dados.condColostomia);
    const cCistostomia  = sn(dados.condCistostomia);
    const cSVD          = sn(dados.condSondaSVD);
    const cPreOp        = sn(dados.condPreOp);
    const cPosOp        = sn(dados.condPosOp);
    const cAdapOrtese   = 'N'; 
    const cReabDom      = sn(dados.condReabDom);
    const cOnco         = sn(dados.condCuidOnco);
    const cNOnco        = sn(dados.condCuidNOnco);
    const cOxigenio     = sn(dados.condOxigenio);
    const cTraqueo      = sn(dados.condTraqueo);
    const cAspirador    = sn(dados.condAspirador);
    const cCpap         = sn(dados.condCpap);
    const cBipap        = sn(dados.condBipap);
    const cDialise      = sn(dados.condDialise);
    const cParacentese  = sn(dados.condParacentese);
    const cParenteral   = sn(dados.condMedParenteral);

    const existing = await dataSource.query(
      `SELECT sdavaelegibilidadeid FROM sdavaelegibilidade WHERE sdavaeleguid = $1`,
      [cleanGuid]
    );

    const params = [
      data, turno, origem,                                                           // $2, $3, $4
      unidadeId, profId, cboId, equipeId,                                            // $5, $6, $7, $8
      usuarioId, cuidadorId,                                                         // $9, $10
      cid1, cid2, cid3,                                                              // $11, $12, $13
      conclusao, concElegivel,                                                       // $14, $15
      cInstClinica, cNecProp, cAusCuidador, cCondSociais, cOutroMotivo,              // $16, $17, $18, $19, $20
      cAcamado, cDomiciliado, cUlceras, cAcompNutri,                                 // $21, $22, $23, $24
      cSNG, cSNE, cGastro, cColostomia, cCistostomia, cSVD,                          // $25, $26, $27, $28, $29, $30
      cPreOp, cPosOp, cAdapOrtese, cReabDom, cOnco, cNOnco,                          // $31, $32, $33, $34, $35, $36
      cOxigenio, cTraqueo, cAspirador, cCpap, cBipap,                                // $37, $38, $39, $40, $41
      cDialise, cParacentese, cParenteral                                            // $42, $43, $44
    ];

    if (existing.length > 0) {
      const id = existing[0].sdavaelegibilidadeid;
      await dataSource.query(
        `UPDATE sdavaelegibilidade SET
          sdavaelegibilidadedata = $2, sdavaelegibilidadeturno = $3, sdavaeleorigem = $4,
          sdavaeleunidid = $5, sdavaeleprofid = $6, sdavaelegibilidadecboid = $7, sdavaeleequipeid = $8,
          sdavaeleusuarioid = $9, sdavaelecuidador = $10,
          sdavaelecidprincipal = $11, sdavaelecidsec1 = $12, sdavaelecidsec2 = $13,
          sdavaeleconclusao = $14, sdavaeleconcelegivel = $15,
          sdavaeleinstclinica = $16, sdavaelenecprop = $17, sdavaeleauscuidador = $18, sdavaelecondsociais = $19, sdavaeleoutromotivo = $20,
          sdavaelecondavaacamado = $21, sdavaeledomiciliado = $22, sdavaeleulceras = $23, sdavaeleacompanhamento = $24,
          sdavaeleusosondasng = $25, sdavaeleusosondasne = $26, sdavaeleusogastronomia = $27, sdavaeleusocolostomia = $28,
          sdavaeleusocistostomia = $29, sdavaeleusosondasvd = $30, sdavaeleacomppreoperatorio = $31, sdavaeleacompposoperatorio = $32,
          sdavaeleadaporteseprotese = $33, sdavaelereabilitacaodom = $34, sdavaelecuidadosoncologico = $35, sdavaelecuidadosnoncologico = $36,
          sdavaeleoxigenoterapia = $37, sdavaeleusotraqueostomia = $38, sdavaeleusoaspirador = $39, sdavaelesuportecpap = $40,
          sdavaelesuportebipap = $41, sdavaeledialise = $42, sdavaeleparacentese = $43, sdavaelemedparenteral = $44,
          sdavaeleenviadoesus = 'N'
        WHERE sdavaelegibilidadeid = $1`,
        [id, ...params]
      );
      return id;
    } else {
      const res = await dataSource.query(
        `INSERT INTO sdavaelegibilidade (
          sdavaeleguid,
          sdavaelegibilidadedata, sdavaelegibilidadeturno, sdavaeleorigem,
          sdavaeleunidid, sdavaeleprofid, sdavaelegibilidadecboid, sdavaeleequipeid,
          sdavaeleusuarioid, sdavaelecuidador,
          sdavaelecidprincipal, sdavaelecidsec1, sdavaelecidsec2,
          sdavaeleconclusao, sdavaeleconcelegivel,
          sdavaeleinstclinica, sdavaelenecprop, sdavaeleauscuidador, sdavaelecondsociais, sdavaeleoutromotivo,
          sdavaelecondavaacamado, sdavaeledomiciliado, sdavaeleulceras, sdavaeleacompanhamento,
          sdavaeleusosondasng, sdavaeleusosondasne, sdavaeleusogastronomia, sdavaeleusocolostomia,
          sdavaeleusocistostomia, sdavaeleusosondasvd, sdavaeleacomppreoperatorio, sdavaeleacompposoperatorio,
          sdavaeleadaporteseprotese, sdavaelereabilitacaodom, sdavaelecuidadosoncologico, sdavaelecuidadosnoncologico,
          sdavaeleoxigenoterapia, sdavaeleusotraqueostomia, sdavaeleusoaspirador, sdavaelesuportecpap,
          sdavaelesuportebipap, sdavaeledialise, sdavaeleparacentese, sdavaelemedparenteral,
          sdavaeleenviadoesus, sdavaelegibilidadehora
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, 'N', NOW()
        ) RETURNING sdavaelegibilidadeid`,
        [cleanGuid, ...params]
      );
      return res[0].sdavaelegibilidadeid;
    }
  }
}