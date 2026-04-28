import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AtendimentoDomiciliarHandler {
  private readonly logger = new Logger(AtendimentoDomiciliarHandler.name);

  public dataSource!: DataSource;

  async upsert(guid: string, dados: any, dataSource: DataSource): Promise<number> {
    const cleanGuid = guid.trim();
    this.logger.log(`[Atendimento Domiciliar] Sync do GUID: ${cleanGuid}`);

    // ── Helpers ────────────────────────────────────────────────────────────
    const str = (v: any, max?: number) => {
      if (v === null || v === undefined || v === '') return null;
      return max ? String(v).trim().substring(0, max) : String(v).trim();
    };
    const num = (v: any) => {
      if (v === null || v === undefined || v === '' || v === 0 || v === '0') return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };
    const sn = (v: any) => (v === true || v === 'S' || v === 's' || v === 1 || v === '1') ? 'S' : 'N';
    const dateOrNull = (v: any) => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      if (String(v).includes('/')) return String(v).split('/').reverse().join('-');
      return String(v).substring(0, 10);
    };

    const checkFk = async (table: string, pk: string, val: any) => {
      if (val === null || val === undefined) return null;
      try {
        const res = await dataSource.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1 LIMIT 1`, [val]);
        if (res.length > 0) return val;
        const fallback = await dataSource.query(`SELECT ${pk} FROM ${table} LIMIT 1`);
        return fallback.length > 0 ? fallback[0][pk] : null;
      } catch { return null; }
    };

    // ── Mapeamento do Payload ──────────────────────────────────────────────

    const unidadeId = Number(dados.unidadeId) || Number(dados.SDAtendDomUnidadeId) || 0;
    
    const dataAtend        = dateOrNull(dados.data);
    const turno            = str(dados.turno) || 'M';
    const localAtendid     = num(dados.localAtendimento);
    const modalidadead     = num(dados.modalidade);
    const tipoatend        = num(dados.tipoAtendimento);

    const profId           = await checkFk('sdprofissional', 'sdprofissionalid', num(dados.profissionalId));
    const cboId            = str(dados.cboCodigo, 6);
    const equipeId         = await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.equipeId));
    const usuarioId        = await checkFk('sdusuario', 'sdusuarioid', num(dados.pacienteId));

    const cid              = str(dados.cid, 5);
    const ciap             = str(dados.ciap, 4);
    const obs              = str(dados.observacao, 1024);

    // Condições Avaliadas (Mapeado para os nomes exatos do BD)
    const cAcamado      = sn(dados.condAcamado);
    const cDomiciliado  = sn(dados.condDomiciliado);
    const cUlceras      = sn(dados.condUlceras);
    const cNutri        = sn(dados.condNutricional);
    const cSNG          = sn(dados.condSNG);            // sdatenddomnasogastrica
    const cSNE          = sn(dados.condSNE);            // sdatenddomnasoenteral
    const cGastro       = sn(dados.condGastrostomia);
    const cColostomia   = sn(dados.condColostomia);
    const cCistostomia  = sn(dados.condCistostomia);
    const cSVD          = sn(dados.condSVD);            // sdatenddomsondavesical
    const cPreOp        = sn(dados.condPreOp);
    const cPosOp        = sn(dados.condPosOp);
    const cOrtese       = sn(dados.condOrtese);
    const cReab         = sn(dados.condReabilitacao);
    const cOnco         = sn(dados.condOncologico);
    const cNOnco        = sn(dados.condNaoOncologico);
    const cOxigenio     = sn(dados.condOxigenio);       // sdatenddomoxigenoterapia
    const cTraqueo      = sn(dados.condTraqueo);
    const cAspirador    = sn(dados.condAspirador);
    const cCpap         = sn(dados.condCPAP);
    const cBipap        = sn(dados.condBIPAP);
    const cDialise      = sn(dados.condDialise);
    const cParacentese  = sn(dados.condParacentese);
    const cParenteral   = sn(dados.condParenteral);

    // Procedimentos (Mapeado para os nomes exatos do BD)
    const pAlternativa  = sn(dados.procAlternativa);
    const pAntibiotico  = sn(dados.procAntibiotico);
    const pNeuro        = sn(dados.procNeuro);
    const pResp         = sn(dados.procRespiratorio);   // sdatenddomtransrespiratorio
    const pObito        = sn(dados.procObito);          // sdatenddomatestarobito
    const pMultDefic    = sn(dados.procMultDefic);
    const pCatetAlivio  = sn(dados.procCatetAlivio);    // sdatenddomcateterismo
    const pCatetDemora  = sn(dados.procCatetDemora);
    const pExameLab     = sn(dados.procExameLab);
    const pEstomas      = sn(dados.procEstomas);
    const pCuidTraqueo  = sn(dados.procCuidTraqueo);    // sdatenddomcuidadotraqueo
    const pEnema        = sn(dados.procEnema);
    const pOxigenio     = sn(dados.procOxigenio);       // sdatenddomoxigenoterap
    const pPontos       = sn(dados.procPontos);         // sdatenddomretiradapontos
    const pSondGastr    = sn(dados.procSondGastr);      // sdatenddomsondagemgastrica
    const pReidraOral   = sn(dados.procReidraOral);
    const pReidraParen  = sn(dados.procReidraParen);    // sdatenddomreidratparental
    const pFono         = sn(dados.procFono);           // sdatenddomfonoaudiologica
    const pTrauma       = sn(dados.procTrauma);
    const pTratReab     = sn(dados.procTratReab);       // sdatenddomtratreabilitacao

    // Desfechos (Mapeado para os nomes exatos do BD)
    const dPermanencia  = sn(dados.permanencia);
    const dAltaAdmin    = sn(dados.altaAdmin);
    const dAltaClinica  = sn(dados.altaClinica);
    const dObito        = sn(dados.obito);
    const dEncBasica    = sn(dados.encamBasica);        // sdatenddomencamatencaobas
    const dEncUrgencia  = sn(dados.encamUrgencia);
    const dEncInternacao= sn(dados.encamInternacao);

    const baseParams = [
      dataAtend, turno, usuarioId, localAtendid, modalidadead, tipoatend, 
      profId, cboId, equipeId, cid, ciap, obs,
      
      cAcamado, cDomiciliado, cUlceras, cNutri, cSNG, cSNE, cGastro, 
      cColostomia, cCistostomia, cSVD, cPreOp, cPosOp, cOrtese, cReab, 
      cOnco, cNOnco, cOxigenio, cTraqueo, cAspirador, cCpap, cBipap, 
      cDialise, cParacentese, cParenteral,
      
      pAlternativa, pAntibiotico, pNeuro, pResp, pObito, pMultDefic, 
      pCatetAlivio, pCatetDemora, pExameLab, pEstomas, pCuidTraqueo, pEnema, 
      pOxigenio, pPontos, pSondGastr, pReidraOral, pReidraParen, pFono, 
      pTrauma, pTratReab,
      
      dPermanencia, dAltaAdmin, dAltaClinica, dObito, 
      dEncBasica, dEncUrgencia, dEncInternacao
    ];

    // Verifica se já existe
    const existing = await dataSource.query(
      `SELECT sdatendimentodomicid FROM sdatendimentodomiciliar WHERE sdatendimentodomicuuid = $1 AND sdatenddomunidadeid = $2`,
      [cleanGuid, unidadeId]
    );

    if (existing.length > 0) {
      const id = existing[0].sdatendimentodomicid;
      await dataSource.query(
        `UPDATE sdatendimentodomiciliar SET
          sdatenddomdataatend = $3, sdatendimentodomicturno = $4, sdatendimentodomicusuarioid = $5, 
          sdatenddomiclocalatendid = $6, sdatenddommodad = $7, sdatenddomtipoatendimento = $8,
          sdatenddomprofid = $9, sdatenddomprofcboid = $10, sdatenddomequipeid = $11, 
          sdatenddomcidid = $12, sdatenddomciapid = $13, sdatenddomobs = $14,
          
          sdatenddomacamado = $15, sdatenddomdomiciliado = $16, sdatenddomulceras = $17,
          sdatenddomnutricional = $18, sdatenddomnasogastrica = $19, sdatenddomnasoenteral = $20,
          sdatenddomgastrostomia = $21, sdatenddomcolostomia = $22, sdatenddomcistostomia = $23,
          sdatenddomsondavesical = $24, sdatenddompreoperatorio = $25, sdatenddomposoperatorio = $26,
          sdatenddomortese = $27, sdatenddomreabilitacao = $28, sdatenddomoncologicos = $29,
          sdatenddomnaooncologicos = $30, sdatenddomoxigenoterapia = $31, sdatenddomtraqueostomia = $32,
          sdatenddomaspirador = $33, sdatenddomcpap = $34, sdatenddombipap = $35,
          sdatenddomdialise = $36, sdatenddomparacentese = $37, sdatenddomparenteral = $38,
          
          sdatenddomalternativa = $39, sdatenddomantibioticoterapia = $40, sdatenddomneuropsicomotor = $41,
          sdatenddomtransrespiratorio = $42, sdatenddomatestarobito = $43, sdatenddommultdeficiencias = $44,
          sdatenddomcateterismo = $45, sdatenddomcatetdemora = $46, sdatenddomexamelaboratorial = $47,
          sdatenddomestomas = $48, sdatenddomcuidadotraqueo = $49, sdatenddomenema = $50,
          sdatenddomoxigenoterap = $51, sdatenddomretiradapontos = $52, sdatenddomsondagemgastrica = $53,
          sdatenddomreidraoral = $54, sdatenddomreidratparental = $55, sdatenddomfonoaudiologica = $56,
          sdatenddomtraumatismos = $57, sdatenddomtratreabilitacao = $58,
          
          sdatenddomcondutapermanencia = $59, sdatenddomcondutaaltaadm = $60, sdatenddomcondutaaltaclin = $61,
          sdatenddomcondutaobito = $62, sdatenddomencamatencaobas = $63, sdatenddomencamurgencia = $64,
          sdatenddomencaminternacao = $65,

          sdatenddomenviadoesus = 'N'
        WHERE sdatendimentodomicid = $1 AND sdatenddomunidadeid = $2`,
        [id, unidadeId, ...baseParams]
      );
      return id;
    } else {
      // Calcula o MAX id manualmente por conta da PK composta
      const maxRes = await dataSource.query(
        `SELECT COALESCE(MAX(sdatendimentodomicid), 0) + 1 AS new_id FROM sdatendimentodomiciliar WHERE sdatenddomunidadeid = $1`,
        [unidadeId]
      );
      const novoId = maxRes[0].new_id;

      await dataSource.query(
        `INSERT INTO sdatendimentodomiciliar (
          sdatendimentodomicid, sdatenddomunidadeid, sdatendimentodomicuuid,
          sdatenddomdataatend, sdatendimentodomicturno, sdatendimentodomicusuarioid,
          sdatenddomiclocalatendid, sdatenddommodad, sdatenddomtipoatendimento,
          sdatenddomprofid, sdatenddomprofcboid, sdatenddomequipeid,
          sdatenddomcidid, sdatenddomciapid, sdatenddomobs,
          
          sdatenddomacamado, sdatenddomdomiciliado, sdatenddomulceras,
          sdatenddomnutricional, sdatenddomnasogastrica, sdatenddomnasoenteral,
          sdatenddomgastrostomia, sdatenddomcolostomia, sdatenddomcistostomia,
          sdatenddomsondavesical, sdatenddompreoperatorio, sdatenddomposoperatorio,
          sdatenddomortese, sdatenddomreabilitacao, sdatenddomoncologicos,
          sdatenddomnaooncologicos, sdatenddomoxigenoterapia, sdatenddomtraqueostomia,
          sdatenddomaspirador, sdatenddomcpap, sdatenddombipap,
          sdatenddomdialise, sdatenddomparacentese, sdatenddomparenteral,
          
          sdatenddomalternativa, sdatenddomantibioticoterapia, sdatenddomneuropsicomotor,
          sdatenddomtransrespiratorio, sdatenddomatestarobito, sdatenddommultdeficiencias,
          sdatenddomcateterismo, sdatenddomcatetdemora, sdatenddomexamelaboratorial,
          sdatenddomestomas, sdatenddomcuidadotraqueo, sdatenddomenema,
          sdatenddomoxigenoterap, sdatenddomretiradapontos, sdatenddomsondagemgastrica,
          sdatenddomreidraoral, sdatenddomreidratparental, sdatenddomfonoaudiologica,
          sdatenddomtraumatismos, sdatenddomtratreabilitacao,
          
          sdatenddomcondutapermanencia, sdatenddomcondutaaltaadm, sdatenddomcondutaaltaclin,
          sdatenddomcondutaobito, sdatenddomencamatencaobas, sdatenddomencamurgencia,
          sdatenddomencaminternacao,

          sdatenddomenviadoesus, sdatenddomgeradobpa
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39,
          $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54,
          $55, $56, $57, $58, $59,
          $60, $61, $62, $63, $64, $65, $66,
           'N', false
        )`,
        [novoId, unidadeId, cleanGuid, ...baseParams]
      );
      return novoId;
    }
  }
}