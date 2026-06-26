import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DomicilioHandler {
  private readonly logger = new Logger(DomicilioHandler.name);

  public dataSource!: DataSource;

  async upsert(guid: string, dados: any, dataSource: DataSource): Promise<number> {
    const cleanGuid = guid.trim();

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

    const sn = (v: any): string | null => {
      if (v === null || v === undefined || v === '') return null;
      return v === true || v === 'S' || v === 's' || v === 1 || v === '1' ? 'S' : 'N';
    };

    const dateOrNull = (v: any): string | null => {
      if (!v || v === '0000-00-00' || v === '1900-01-01') return null;
      return String(v).substring(0, 10);
    };

    const fmt = (v: any, max?: number): string | null => {
      if (!v) return null;
      const s = String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      return max ? s.substring(0, max) : s;
    };

    const checkFk = async (table: string, pk: string, val: any) => {
      if (val === null || val === undefined) return null;
      try {
        const res = await dataSource.query(`SELECT ${pk} FROM ${table} WHERE ${pk} = $1 LIMIT 1`, [val]);
        if (res.length > 0) {
          return val;
        }
        this.logger.warn(`[checkFk] Chave estrangeira não encontrada para ${table}.${pk} = ${val}. Retornando nulo.`);
        return null;
      } catch (e: any) {
        this.logger.error(`[checkFk] Erro ao verificar FK para ${table}.${pk} = ${val}: ${e.message}`);
        return null;
      }
    };

    const payload = {
      data: dateOrNull(dados.SDDomicilioData),
      dtAtualizacao: dateOrNull(dados.SDDomicilioDtUltimaAtualizacaoGer),
      hrAtualizacao: dados.SDDomicilioHrUltimaAtualizacaoGer || null,
      situacao: str(dados.SDDomicilioSituacao),

      unidadeId: await checkFk('sdunidade', 'sdunidadeid', num(dados.SDDomicilioUnidadeId)),
      profId: await checkFk('sdprofissional', 'sdprofissionalid', num(dados.SDDomicilioProfissionalId)),
      profCboId: await checkFk('sdsuscbo', 'sdsuscboid', str(dados.SDDomicilioProfCBOId, 6)),
      equipeId: await checkFk('sdequipemedica', 'sdequipemedicaid', num(dados.SDDomicilioEquipeId)),
      microarea: str(dados.SDDomicilioProfMicroarea, 2),
      foraArea: sn(dados.SDDomicilioForaArea),

      logradouroId: num(dados.SDDomicilioDNELogradouroId),
      logradouroCepId: num(dados.SDDomicilioDNELogradouroCepId),
      municipioId: num(dados.SDDomicilioMunicipioId),
      enderecoNum: str(dados.SDDomicilioEnderecoNum, 10),
      semNumero: sn(dados.SDDomicilioSemNumero),
      enderecoCompl: str(dados.SDDomicilioEnderecoCompl, 256),
      pontoReferencia: fmt(dados.SDDomicilioPontoReferencia, 40),
      quarteirao: fmt(dados.SDDomicilioQuarteirao, 40),
      latitude: str(dados.SDDomicilioEnderecoLatitude ?? dados.SDDomicilioLatitude, 40),
      longitude: str(dados.SDDomicilioEnderecoLongitude ?? dados.SDDomicilioLongitude, 40),

      tipoImovel: num(dados.SDDomicilioTipoImovel),

      dddFoneResid: num(dados.SDDomicilioDDDFoneResid) ?? num(dados.SDDomicilioDDDFoneResi),
      foneResid: str(dados.SDDomicilioFoneResid, 10),
      dddFoneRef: num(dados.SDDomicilioDDDFoneRef),
      foneRef: str(dados.SDDomicilioFoneRef, 10),

      sitMoradiaId: num(dados.SDDomicilioSitMoradiaId),
      localizacao: str(dados.SDDomicilioLocalizacao),
      tipoDomId: num(dados.SDDomicilioTipoDomId),
      moradores: num(dados.SDDomicilioMoradores),
      comodos: num(dados.SDDomicilioComodos),
      areaRuralId: num(dados.SDDomicilioAreaRuralId),
      tipoAcessoId: num(dados.SDDomicilioTipoAcessoId),
      materialId: num(dados.SDDomicilioMaterialId),
      energiaEletrica: str(dados.SDDomicilioEnergiaEletrica),
      origemEnergiaId: num(dados.SDDomicilioOrigemEnergiaId),
      abastAguaId: num(dados.SDDomicilioAbastAguaId),
      tratAguaId: num(dados.SDDomicilioTratAguaId),
      escoamentoId: num(dados.SDDomicilioEscoamentoId),
      destLixoId: num(dados.SDDomicilioDestLixoId),

      possuiAnimais: str(dados.SDDomicilioPossuiAnimais),
      animalGato: sn(dados.SDDomicilioAnimalGato),
      animalCachorro: sn(dados.SDDomicilioAnimalCachorro),
      animalPassaro: sn(dados.SDDomicilioAnimalPassaro),
      animalMacaco: sn(dados.SDDomicilioAnimalMacaco),
      animalGalinha: sn(dados.SDDomicilioAnimalGalinha),
      animalPorco: sn(dados.SDDomicilioAnimalPorco),
      animalRepteis: sn(dados.SDDomicilioAnimalRepteis),
      animalOutros: sn(dados.SDDomicilioAnimalOutros),
      animaisQtde: num(dados.SDDomicilioAnimaisQtde),

      instituicaoId: num(dados.SDDomicilioInstituicaoId),
      institOutroProf: str(dados.SDDomicilioInstitOutroProf),

      riscoManual: str(dados.SDDomicilioRiscoFamiliarManual),
      termoRecusa: sn(dados.SDDomicilioTermoRecusa),
      observacao: str(dados.SDDomicilioObservacao, 1024),
    };

    const syncPacientes = async (
      domicilioId: number,
      familias: any[],
      rendaFamiliar: string | null,
      prontuario: string | null,
      resideMes: string | null,
      resideAno: string | null,
      qtdMembros: number | null
    ) => {
      if (!familias || familias.length === 0) return;

      await dataSource.query(
        `UPDATE sddomiciliopacientes SET sddomiciliopacientesativo = 'N' WHERE sddomicilioid = $1`,
        [domicilioId]
      );

      const rendaFamiliarNum = num(rendaFamiliar);
      const prontuarioNum = num(prontuario);
      const resideMesNum = num(resideMes);
      const resideAnoNum = num(resideAno);

      for (const membro of familias) {
        const usuarioId = Number(membro.id);
        if (!usuarioId) continue;

        const ehResp = membro.ehResponsavel ? 'S' : 'N';
        const numMembros = qtdMembros || familias.length;

        const rel = await dataSource.query(
          `SELECT 1 FROM sddomiciliopacientes WHERE sddomicilioid = $1 AND sddomiciliousuarioid = $2`,
          [domicilioId, usuarioId]
        );

        if (rel.length > 0) {
          await dataSource.query(
            `UPDATE sddomiciliopacientes SET
               sddomiciliopacientesativo = 'S',
               sddomiciliopacientesrf = $3,
               sddomiciliopacientespront = $4,
               sddomiciliopacientesrendafam = $5,
               sddomiciliopacientesmembros = $6,
               sddomiciliopacientesresidemes = $7,
               sddomiciliopacientesresideano = $8
             WHERE sddomicilioid = $1 AND sddomiciliousuarioid = $2`,
            [domicilioId, usuarioId, ehResp, prontuarioNum, rendaFamiliarNum, numMembros, resideMesNum, resideAnoNum]
          );
        } else {
          const seqRes = await dataSource.query(
            `SELECT COALESCE(MAX(sddomiciliopacientesseq), 0) + 1 AS next_seq
               FROM sddomiciliopacientes
              WHERE sddomicilioid = $1`,
            [domicilioId]
          );

          const nextSeq = seqRes[0].next_seq;

          await dataSource.query(
            `INSERT INTO sddomiciliopacientes (
               sddomicilioid, sddomiciliopacientesseq, sddomiciliousuarioid,
               sddomiciliopacientesativo, sddomiciliopacientesrf,
               sddomiciliopacientespront, sddomiciliopacientesrendafam,
               sddomiciliopacientesmembros, sddomiciliopacientesresidemes,
               sddomiciliopacientesresideano
             ) VALUES ($1, $2, $3, 'S', $4, $5, $6, $7, $8, $9)`,
            [domicilioId, nextSeq, usuarioId, ehResp, prontuarioNum, rendaFamiliarNum, numMembros, resideMesNum, resideAnoNum]
          );
        }

        if (membro.ehResponsavel) {
          await dataSource.query(
            `UPDATE sdpessoa
                SET sdpessoaresponsavelfamilia = 'S',
                    sdpessoaresponsavelid = $1
              WHERE sdpessoaid = $1`,
            [usuarioId]
          );
        } else {
          const resp = familias.find((f: any) => f.ehResponsavel);
          if (resp) {
            await dataSource.query(
              `UPDATE sdpessoa
                  SET sdpessoaresponsavelfamilia = 'N',
                      sdpessoaresponsavelid = $1
                WHERE sdpessoaid = $2`,
              [Number(resp.id), usuarioId]
            );
          }
        }
      }
    };

    const existing = await dataSource.query(
      `SELECT *
         FROM sddomicilio
        WHERE sddomicilioguid = $1`,
      [cleanGuid]
    );

    if (existing.length > 0) {
      const old = existing[0];
      const domId = old.sddomicilioid;

      const merged = {
        data: payload.data ?? old.sddomiciliodata,
        dtAtualizacao: payload.dtAtualizacao ?? old.sddomiciliodtultimaatualizacaoger,
        hrAtualizacao: payload.hrAtualizacao ?? old.sddomiciliohrultimaatualizacaoger,
        situacao: payload.situacao ?? old.sddomiciliosituacao,

        unidadeId: payload.unidadeId ?? old.sddomiciliounidadeid,
        profId: payload.profId ?? old.sddomicilioprofissionalid,
        profCboId: payload.profCboId ?? old.sddomicilioprofcboid,
        equipeId: payload.equipeId ?? old.sddomicilioequipeid,
        microarea: payload.microarea ?? old.sddomicilioprofmicroarea,
        foraArea: payload.foraArea ?? old.sddomicilioforaarea,

        municipioId: payload.municipioId ?? old.sddomiciliomunicipioid,
        logradouroId: payload.logradouroId ?? old.sddomiciliodnelogradouroid,
        logradouroCepId: payload.logradouroCepId ?? old.sddomiciliodnelogradourocepid,
        bairroId: old.sddomiciliobairroid,
        enderecoNum: payload.enderecoNum ?? old.sddomicilioendereconum,
        semNumero: payload.semNumero ?? old.sddomiciliosemnumero,
        enderecoCompl: payload.enderecoCompl ?? old.sddomicilioenderecocompl,
        pontoReferencia: payload.pontoReferencia ?? old.sddomiciliopontoreferencia,
        quarteirao: payload.quarteirao ?? old.sddomicilioquarteirao,
        latitude: payload.latitude ?? old.sddomicilioenderecolatitude,
        longitude: payload.longitude ?? old.sddomicilioenderecolongitude,

        tipoImovel: payload.tipoImovel ?? old.sddomiciliotipoimovel,

        dddFoneResid: payload.dddFoneResid ?? old.sddomiciliodddfoneresid,
        foneResid: payload.foneResid ?? old.sddomiciliofoneresid,
        dddFoneRef: payload.dddFoneRef ?? old.sddomiciliodddfoneref,
        foneRef: payload.foneRef ?? old.sddomiciliofoneref,

        sitMoradiaId: payload.sitMoradiaId ?? old.sddomiciliositmoradiaid,
        localizacao: payload.localizacao ?? old.sddomiciliolocalizacao,
        tipoDomId: payload.tipoDomId ?? old.sddomiciliotipodomid,
        moradores: payload.moradores ?? old.sddomiciliomoradores,
        comodos: payload.comodos ?? old.sddomiciliocomodos,
        areaRuralId: payload.areaRuralId ?? old.sddomicilioarearuralid,
        tipoAcessoId: payload.tipoAcessoId ?? old.sddomiciliotipoacessoid,
        materialId: payload.materialId ?? old.sddomiciliomaterialid,
        energiaEletrica: payload.energiaEletrica ?? old.sddomicilioenergiaeletrica,
        origemEnergiaId: payload.origemEnergiaId ?? old.sddomicilioorigemenergiaid,
        abastAguaId: payload.abastAguaId ?? old.sddomicilioabastaguaid,
        tratAguaId: payload.tratAguaId ?? old.sddomiciliotrataguaid,
        escoamentoId: payload.escoamentoId ?? old.sddomicilioescoamentoid,
        destLixoId: payload.destLixoId ?? old.sddomiciliodestlixoid,

        possuiAnimais: payload.possuiAnimais ?? old.sddomiciliopossuianimais,
        animalGato: payload.animalGato ?? old.sddomicilioanimalgato,
        animalCachorro: payload.animalCachorro ?? old.sddomicilioanimalcachorro,
        animalPassaro: payload.animalPassaro ?? old.sddomicilioanimalpassaro,
        animalMacaco: payload.animalMacaco ?? old.sddomicilioanimalmacaco,
        animalGalinha: payload.animalGalinha ?? old.sddomicilioanimalgalinha,
        animalPorco: payload.animalPorco ?? old.sddomicilioanimalporco,
        animalRepteis: payload.animalRepteis ?? old.sddomicilioanimalrepteis,
        animalOutros: payload.animalOutros ?? old.sddomicilioanimaloutros,
        animaisQtde: payload.animaisQtde ?? old.sddomicilioanimaisqtde,

        instituicaoId: payload.instituicaoId ?? old.sddomicilioinstituicaoid,
        institOutroProf: payload.institOutroProf ?? old.sddomicilioinstitoutroprof,

        riscoManual: payload.riscoManual ?? old.sddomicilioriscofamiliarmanual,
        termoRecusa: payload.termoRecusa ?? old.sddomiciliotermorecusa,
        observacao: payload.observacao ?? old.sddomicilioobservacao,
      };

      await dataSource.query(
        `UPDATE sddomicilio SET
           sddomiciliodata = $2,
           sddomiciliodtultimaatualizacaoger = $3,
           sddomiciliohrultimaatualizacaoger = $4,
           sddomiciliosituacao = $5,
           sddomiciliounidadeid = $6,
           sddomicilioprofissionalid = $7,
           sddomicilioprofcboid = $8,
           sddomicilioequipeid = $9,
           sddomicilioprofmicroarea = $10,
           sddomicilioforaarea = $11,
           sddomiciliomunicipioid = $12,
           sddomiciliodnelogradouroid = $13,
           sddomiciliodnelogradourocepid = $14,
           sddomiciliobairroid = $15,
           sddomicilioendereconum = $16,
           sddomiciliosemnumero = $17,
           sddomicilioenderecocompl = $18,
           sddomiciliopontoreferencia = $19,
           sddomicilioquarteirao = $20,
           sddomicilioenderecolatitude = $21,
           sddomicilioenderecolongitude = $22,
           sddomiciliotipoimovel = $23,
           sddomiciliodddfoneresid = $24,
           sddomiciliofoneresid = $25,
           sddomiciliodddfoneref = $26,
           sddomiciliofoneref = $27,
           sddomiciliositmoradiaid = $28,
           sddomiciliolocalizacao = $29,
           sddomiciliotipodomid = $30,
           sddomiciliomoradores = $31,
           sddomiciliocomodos = $32,
           sddomicilioarearuralid = $33,
           sddomiciliotipoacessoid = $34,
           sddomiciliomaterialid = $35,
           sddomicilioenergiaeletrica = $36,
           sddomicilioorigemenergiaid = $37,
           sddomicilioabastaguaid = $38,
           sddomiciliotrataguaid = $39,
           sddomicilioescoamentoid = $40,
           sddomiciliodestlixoid = $41,
           sddomiciliopossuianimais = $42,
           sddomicilioanimalgato = $43,
           sddomicilioanimalcachorro = $44,
           sddomicilioanimalpassaro = $45,
           sddomicilioanimalmacaco = $46,
           sddomicilioanimalgalinha = $47,
           sddomicilioanimalporco = $48,
           sddomicilioanimalrepteis = $49,
           sddomicilioanimaloutros = $50,
           sddomicilioanimaisqtde = $51,
           sddomicilioinstituicaoid = $52,
           sddomicilioinstitoutroprof = $53,
           sddomicilioriscofamiliarmanual = $54,
           sddomiciliotermorecusa = $55,
           sddomicilioobservacao = $56,
           sddomicilioregistromobile = 'S'
         WHERE sddomicilioid = $1`,
        [
          domId,
          merged.data, merged.dtAtualizacao, merged.hrAtualizacao, merged.situacao,
          merged.unidadeId, merged.profId, merged.profCboId, merged.equipeId,
          merged.microarea, merged.foraArea,
          merged.municipioId, merged.logradouroId, merged.logradouroCepId, merged.bairroId,
          merged.enderecoNum, merged.semNumero, merged.enderecoCompl,
          merged.pontoReferencia, merged.quarteirao,
          merged.latitude, merged.longitude,
          merged.tipoImovel,
          merged.dddFoneResid, merged.foneResid, merged.dddFoneRef, merged.foneRef,
          merged.sitMoradiaId, merged.localizacao, merged.tipoDomId,
          merged.moradores, merged.comodos, merged.areaRuralId, merged.tipoAcessoId,
          merged.materialId, merged.energiaEletrica, merged.origemEnergiaId,
          merged.abastAguaId, merged.tratAguaId, merged.escoamentoId, merged.destLixoId,
          merged.possuiAnimais,
          merged.animalGato, merged.animalCachorro, merged.animalPassaro, merged.animalMacaco,
          merged.animalGalinha, merged.animalPorco, merged.animalRepteis, merged.animalOutros,
          merged.animaisQtde,
          merged.instituicaoId, merged.institOutroProf,
          merged.riscoManual, merged.termoRecusa, merged.observacao,
        ]
      );

      await syncPacientes(
        domId,
        dados.Familias,
        str(dados.RendaFamiliar),
        str(dados.ProntuarioFamiliar),
        str(dados.ResideDesdeMes),
        str(dados.ResideDesdeAno),
        num(dados.SDDomicilioMoradores)
      );

      return domId;
    }

    const situacao = payload.situacao ?? 'S';

    const result = await dataSource.query(
      `INSERT INTO sddomicilio (
         sddomicilioguid,
         sddomiciliodata, sddomiciliodtultimaatualizacaoger, sddomiciliohrultimaatualizacaoger, sddomiciliosituacao,
         sddomiciliounidadeid, sddomicilioprofissionalid, sddomicilioprofcboid, sddomicilioequipeid,
         sddomicilioprofmicroarea, sddomicilioforaarea,
         sddomiciliomunicipioid, sddomiciliodnelogradouroid, sddomiciliodnelogradourocepid, sddomiciliobairroid,
         sddomicilioendereconum, sddomiciliosemnumero, sddomicilioenderecocompl,
         sddomiciliopontoreferencia, sddomicilioquarteirao,
         sddomicilioenderecolatitude, sddomicilioenderecolongitude,
         sddomiciliotipoimovel,
         sddomiciliodddfoneresid, sddomiciliofoneresid, sddomiciliodddfoneref, sddomiciliofoneref,
         sddomiciliositmoradiaid, sddomiciliolocalizacao, sddomiciliotipodomid,
         sddomiciliomoradores, sddomiciliocomodos, sddomicilioarearuralid, sddomiciliotipoacessoid,
         sddomiciliomaterialid, sddomicilioenergiaeletrica, sddomicilioorigemenergiaid,
         sddomicilioabastaguaid, sddomiciliotrataguaid, sddomicilioescoamentoid, sddomiciliodestlixoid,
         sddomiciliopossuianimais,
         sddomicilioanimalgato, sddomicilioanimalcachorro, sddomicilioanimalpassaro, sddomicilioanimalmacaco,
         sddomicilioanimalgalinha, sddomicilioanimalporco, sddomicilioanimalrepteis, sddomicilioanimaloutros,
         sddomicilioanimaisqtde,
         sddomicilioinstituicaoid, sddomicilioinstitoutroprof,
         sddomicilioriscofamiliarmanual, sddomiciliotermorecusa, sddomicilioobservacao,
         sddomicilioregistromobile
       ) VALUES (
         $1,
         $2,$3,$4,$5,
         $6,$7,$8,$9,
         $10,$11,
         $12,$13,$14,$15,
         $16,$17,$18,
         $19,$20,
         $21,$22,
         $23,
         $24,$25,$26,$27,
         $28,$29,$30,
         $31,$32,$33,$34,
         $35,$36,$37,
         $38,$39,$40,$41,
         $42,
         $43,$44,$45,$46,
         $47,$48,$49,$50,
         $51,
         $52,$53,
         $54,$55,$56,
         'S'
       )
       RETURNING sddomicilioid`,
      [
        cleanGuid,
        payload.data, payload.dtAtualizacao, payload.hrAtualizacao, situacao,
        payload.unidadeId, payload.profId, payload.profCboId, payload.equipeId,
        payload.microarea, payload.foraArea,
        payload.municipioId, payload.logradouroId, payload.logradouroCepId, null,
        payload.enderecoNum, payload.semNumero, payload.enderecoCompl,
        payload.pontoReferencia, payload.quarteirao,
        payload.latitude, payload.longitude,
        payload.tipoImovel,
        payload.dddFoneResid, payload.foneResid, payload.dddFoneRef, payload.foneRef,
        payload.sitMoradiaId, payload.localizacao, payload.tipoDomId,
        payload.moradores, payload.comodos, payload.areaRuralId, payload.tipoAcessoId,
        payload.materialId, payload.energiaEletrica, payload.origemEnergiaId,
        payload.abastAguaId, payload.tratAguaId, payload.escoamentoId, payload.destLixoId,
        payload.possuiAnimais,
        payload.animalGato, payload.animalCachorro, payload.animalPassaro, payload.animalMacaco,
        payload.animalGalinha, payload.animalPorco, payload.animalRepteis, payload.animalOutros,
        payload.animaisQtde,
        payload.instituicaoId, payload.institOutroProf,
        payload.riscoManual, payload.termoRecusa, payload.observacao,
      ]
    );

    const domId = result[0].sddomicilioid;

    await syncPacientes(
      domId,
      dados.Familias,
      str(dados.RendaFamiliar),
      str(dados.ProntuarioFamiliar),
      str(dados.ResideDesdeMes),
      str(dados.ResideDesdeAno),
      num(dados.SDDomicilioMoradores)
    );

    return domId;
  }
}