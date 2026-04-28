import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ConsumoAlimentarHandler {
  private readonly logger = new Logger(ConsumoAlimentarHandler.name);

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
      const n = Number(v);
      return isNaN(n) ? null : n;
    };
    const sn = (v: any): string => (v === true || v === 'S' || v === 's' || v === 1 || v === '1') ? 'S' : 'N';
    const dateOrNull = (v: any): string | null => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      if (String(v).includes('/')) return String(v).split('/').reverse().join('-');
      return String(v).substring(0, 10);
    };

    this.logger.log(`[Consumo Alimentar] Sync do GUID: ${cleanGuid}`);

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
    const data = dateOrNull(dados.data || dados.SDMarcConsAlimentarData);
    
    const unidadeId = await checkFk('sdunidade', 'sdunidadeid', num(dados.unidadeId || dados.SDMarcConsAlimenUnidId));
    const profId    = await checkFk('sdprofissional', 'sdprofissionalid', num(dados.profissionalId || dados.SDMarcConsAlimenProfId));
    const cboId     = str(dados.cboCodigo || dados.SDMarcConsAlimentarCBOId, 6);
    const equipeId  = await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.equipeId || dados.SDMarcConsEquipeId));
    const usuarioId = await checkFk('sdusuario', 'sdusuarioid', num(dados.pacienteId || dados.SDMarcConsAlimenUsuarioId));
    const localId   = num(dados.localAtendimento || dados.SDMarcConsAlimenLocalId);

    // Estruturas aninhadas ou diretas do payload
    const r = dados.respostas || dados;
    const ref = dados.refeicoes || dados;

    const vNum = (val: any): number => {
      const n = Number(val);
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(n) ? n : 0;
    };
    
    // < 6 meses
    const m6_peito     = vNum(r.m6_peito || r.SDMarcConsAlimenLeitePeito6);
    const m6_mingau    = vNum(r.m6_mingau || r.SDMarcConsAlimenMingau);
    const m6_agua      = vNum(r.m6_agua || r.SDMarcConsAlimenAguaCha);
    const m6_leiteVaca = vNum(r.m6_vaca || r.SDMarcConsAlimenLeiteVaca);
    const m6_formula   = vNum(r.m6_formula || r.SDMarcConsAlimenFormInfantil);
    const m6_suco      = vNum(r.m6_suco || r.SDMarcConsAlimenSucoFruta);
    const m6_fruta     = vNum(r.m6_fruta || r.SDMarcConsAlimenFruta);
    const m6_sal       = vNum(r.m6_sal || r.SDMarcConsAlimenComidaSal);
    const m6_outros    = vNum(r.m6_outros || r.SDMarcConsAlimenOutrosAlim);

    // 6 a 23 meses
    const m23_peito     = vNum(r.m23_peito || r.SDMarcConsAlimenLeitePeito23);
    const m23_fruta     = vNum(r.m23_fruta || r.SDMarcConsAlimenFrutaInt);
    const m23_frutaVez  = vNum(r.m23_frutaVez || r.SDMarcConsAlimenFrutaIntVez);
    const m23_sal       = vNum(r.m23_sal || r.SDMarcConsAlimenComidaSal23);
    const m23_salVez    = vNum(r.m23_salVez || r.SDMarcConsAlimenComidaSalVez);
    const m23_ofer      = vNum(r.m23_ofer || r.SDMarcConsAlimenComidaOfer);
    const m23_outroLeit = vNum(r.m23_outroLeite || r.SDMarcConsAlimenOutroLeite);
    const m23_mingLeit  = vNum(r.m23_mingauLeite || r.SDMarcConsAlimenMingauLeite);
    const m23_iogurte   = vNum(r.m23_iogurte || r.SDMarcConsAlimenIogurte);
    const m23_vegetal   = vNum(r.m23_vegetal || r.SDMarcConsAlimenVegetal);
    const m23_legumes   = vNum(r.m23_legumes || r.SDMarcConsAlimenLegumes);
    const m23_verdura   = vNum(r.m23_verdura || r.SDMarcConsAlimenVerdura);
    const m23_carne     = vNum(r.m23_carne || r.SDMarcConsAlimenCarne);
    const m23_figado    = vNum(r.m23_figado || r.SDMarcConsAlimenFigado);
    const m23_feijao    = vNum(r.m23_feijao || r.SDMarcConsAlimenFeijao);
    const m23_arroz     = vNum(r.m23_arroz || r.SDMarcConsAlimenArroz);
    const m23_emb       = vNum(r.m23_emb || r.SDMarcConsAlimenHamb);
    const m23_refri     = vNum(r.m23_refri || r.SDMarcConsAlimenBebidas);
    const m23_mac       = vNum(r.m23_mac || r.SDMarcConsAlimenMacarrao);
    const m23_doce      = vNum(r.m23_doce || r.SDMarcConsAlimenBiscoitos);

    // >= 2 anos
    const m2_tv         = vNum(r.m2_tv || r.SDMarcConsAlimenRefTV);
    const ref_cafe      = sn(ref.cafe || ref.SDMarcConsAliRefDiaCafe);
    const ref_lancheM   = sn(ref.lancheM || ref.SDMarcConsAliRefDiaLanManha);
    const ref_almoco    = sn(ref.almoco || ref.SDMarcConsAliRefDiaAlmoco);
    const ref_lancheT   = sn(ref.lancheT || ref.SDMarcConsAliRefDiaLanTarde);
    const ref_jantar    = sn(ref.jantar || ref.SDMarcConsAliRefDiaJantar);
    const ref_ceia      = sn(ref.ceia || ref.SDMarcConsAliRefDiaCeia);

    const m2_feijao     = vNum(r.m2_feijao || r.SDMarcConsAlimenConFeijao);
    const m2_frutas     = vNum(r.m2_frutas || r.SDMarcConsAlimenFrutFresca);
    const m2_verduras   = vNum(r.m2_verduras || r.SDMarcConsAlimenVerduras);
    const m2_emb        = vNum(r.m2_emb || r.SDMarcConsAlimenHambOnt);
    const m2_refri      = vNum(r.m2_refri || r.SDMarcConsAlimenBebidaOnt);
    const m2_mac        = vNum(r.m2_mac || r.SDMarcConsAlimenMacOnt);
    const m2_bisc       = vNum(r.m2_bisc || r.SDMarcConsAlimenBiscOnt);

    const existing = await dataSource.query(
      `SELECT sdmarcconsalimentarid FROM sdmarcconsalimentar WHERE sdmarcconsalimentarguid = $1`,
      [cleanGuid]
    );

    const params = [
      data, unidadeId, profId, cboId, equipeId, usuarioId, localId,
      m6_peito, m6_mingau, m6_agua, m6_leiteVaca, m6_formula, m6_suco, m6_fruta, m6_sal, m6_outros,
      m23_peito, m23_fruta, m23_frutaVez, m23_sal, m23_salVez, m23_ofer, m23_outroLeit, m23_mingLeit,
      m23_iogurte, m23_vegetal, m23_legumes, m23_verdura, m23_carne, m23_figado, m23_feijao, m23_arroz,
      m23_emb, m23_refri, m23_mac, m23_doce,
      m2_tv, ref_cafe, ref_lancheM, ref_almoco, ref_lancheT, ref_jantar, ref_ceia,
      m2_feijao, m2_frutas, m2_verduras, m2_emb, m2_refri, m2_mac, m2_bisc
    ];

    if (existing.length > 0) {
      const id = existing[0].sdmarcconsalimentarid;
      await dataSource.query(
        `UPDATE sdmarcconsalimentar SET
          sdmarcconsalimentardata = $2, sdmarcconsalimenunidid = $3, sdmarcconsalimenprofid = $4,
          sdmarcconsalimentarcboid = $5, sdmarcconsequipeid = $6, sdmarcconsalimenusuarioid = $7, sdmarcconsalimenlocalid = $8,
          sdmarcconsalimenleitepeito6 = $9, sdmarcconsalimenmingau = $10, sdmarcconsalimenaguacha = $11, sdmarcconsalimenleitevaca = $12,
          sdmarcconsalimenforminfantil = $13, sdmarcconsalimensucofruta = $14, sdmarcconsalimenfruta = $15, sdmarcconsalimencomidasal = $16, sdmarcconsalimenoutrosalim = $17,
          sdmarcconsalimenleitepeito23 = $18, sdmarcconsalimenfrutaint = $19, sdmarcconsalimenfrutaintvez = $20, sdmarcconsalimencomidasal23 = $21,
          sdmarcconsalimencomidasalvez = $22, sdmarcconsalimencomidaofer = $23, sdmarcconsalimenoutroleite = $24, sdmarcconsalimenmingauleite = $25,
          sdmarcconsalimeniogurte = $26, sdmarcconsalimenvegetal = $27, sdmarcconsalimenlegumes = $28, sdmarcconsalimenverdura = $29,
          sdmarcconsalimencarne = $30, sdmarcconsalimenfigado = $31, sdmarcconsalimenfeijao = $32, sdmarcconsalimenarroz = $33,
          sdmarcconsalimenhamb = $34, sdmarcconsalimenbebidas = $35, sdmarcconsalimenmacarrao = $36, sdmarcconsalimenbiscoitos = $37,
          sdmarcconsalimenreftv = $38, sdmarcconsalirefdiacafe = $39, sdmarcconsalirefdialanmanha = $40, sdmarcconsalirefdiaalmoco = $41,
          sdmarcconsalirefdialantarde = $42, sdmarcconsalirefdiajantar = $43, sdmarcconsalirefdiaceia = $44,
          sdmarcconsalimenconfeijao = $45, sdmarcconsalimenfrutfresca = $46, sdmarcconsalimenverduras = $47, sdmarcconsalimenhambont = $48,
          sdmarcconsalimenbebidaont = $49, sdmarcconsalimenmacont = $50, sdmarcconsalimenbiscont = $51,
          sdmarcconsalimentarenviadoesus = 'N'
        WHERE sdmarcconsalimentarid = $1`,
        [id, ...params]
      );
      return id;
    } else {
      const res = await dataSource.query(
        `INSERT INTO sdmarcconsalimentar (
          sdmarcconsalimentarguid, sdmarcconsalimentardata, sdmarcconsalimenunidid, sdmarcconsalimenprofid,
          sdmarcconsalimentarcboid, sdmarcconsequipeid, sdmarcconsalimenusuarioid, sdmarcconsalimenlocalid,
          sdmarcconsalimenleitepeito6, sdmarcconsalimenmingau, sdmarcconsalimenaguacha, sdmarcconsalimenleitevaca,
          sdmarcconsalimenforminfantil, sdmarcconsalimensucofruta, sdmarcconsalimenfruta, sdmarcconsalimencomidasal, sdmarcconsalimenoutrosalim,
          sdmarcconsalimenleitepeito23, sdmarcconsalimenfrutaint, sdmarcconsalimenfrutaintvez, sdmarcconsalimencomidasal23,
          sdmarcconsalimencomidasalvez, sdmarcconsalimencomidaofer, sdmarcconsalimenoutroleite, sdmarcconsalimenmingauleite,
          sdmarcconsalimeniogurte, sdmarcconsalimenvegetal, sdmarcconsalimenlegumes, sdmarcconsalimenverdura,
          sdmarcconsalimencarne, sdmarcconsalimenfigado, sdmarcconsalimenfeijao, sdmarcconsalimenarroz,
          sdmarcconsalimenhamb, sdmarcconsalimenbebidas, sdmarcconsalimenmacarrao, sdmarcconsalimenbiscoitos,
          sdmarcconsalimenreftv, sdmarcconsalirefdiacafe, sdmarcconsalirefdialanmanha, sdmarcconsalirefdiaalmoco,
          sdmarcconsalirefdialantarde, sdmarcconsalirefdiajantar, sdmarcconsalirefdiaceia,
          sdmarcconsalimenconfeijao, sdmarcconsalimenfrutfresca, sdmarcconsalimenverduras, sdmarcconsalimenhambont,
          sdmarcconsalimenbebidaont, sdmarcconsalimenmacont, sdmarcconsalimenbiscont,
          sdmarcconsalimentarenviadoesus, sdmarcconsalimentarhora
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, $30, $31, $32, $33,
          $34, $35, $36, $37, $38, $39, $40, $41,
          $42, $43, $44, $45, $46, $47, $48,
          $49, $50, $51, 'N', NOW()
        ) RETURNING sdmarcconsalimentarid`,
        [cleanGuid, ...params]
      );
      return res[0].sdmarcconsalimentarid;
    }
  }
}