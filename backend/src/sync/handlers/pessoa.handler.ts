import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PessoaHandler {
  async upsert(guid: string, dados: any, dataSource: DataSource): Promise<number> {
    const cleanGuid = guid.trim();

    if (!dataSource) {
      throw new Error('DataSource não informado no PessoaHandler.');
    }

    const fmt = (str: any): string | null => {
      if (str === null || str === undefined || str === '') return null;
      return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    };

    const str = (val: any, max?: number): string | null => {
      if (val === null || val === undefined || val === '') return null;
      const s = String(val).trim();
      return max ? s.substring(0, max) : s;
    };

    const num = (val: any): number | null => {
      if (val === null || val === undefined || val === '' || val === 0 || val === '0') return null;
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const bool = (val: any): string | null => {
      if (val === null || val === undefined || val === '') return null;
      return val === true || val === 'S' || val === 's' || val === 1 || val === '1' ? 'S' : 'N';
    };

    const dateOrNull = (val: any): string | null => {
      if (!val || val === '0000-00-00' || val === '1900-01-01') return null;
      return String(val).substring(0, 10);
    };

    const tsOrNull = (val: any): string | null => {
      if (!val) return null;
      return String(val);
    };

    const payload = {
      prenome: fmt(dados.SDPessoaPrenome) || fmt(dados.SDPessoaNom),
      nomeCompleto: fmt(dados.SDPessoaNom) || fmt(dados.SDPessoaPrenome),
      informaNomeSocial: bool(dados.SDPessoaInformaNomeSocial),
      cpf: dados.SDPessoaCPF ? String(dados.SDPessoaCPF).replace(/\D/g, '').substring(0, 11) || null : null,
      cns: dados.SDPessoaCNS ? String(dados.SDPessoaCNS).replace(/\D/g, '').substring(0, 15) || null : null,
      rg: str(dados.SDPessoaIdentidade, 15),
      dtNasc: dateOrNull(dados.SDPessoaDtNasc),
      sexo: str(dados.SDPessoaSexo),
      dtCadastro: dateOrNull(dados.SDPessoaDtCadastro),
      dtAtualizacao: dateOrNull(dados.SDPessoaDtUltimaAtualizacaoGerIndiv),
      hrAtualizacao: tsOrNull(dados.SDPessoaHrUltimaAtualizacaoGerIndiv),

      unidadeId: num(dados.SDPessoaUnidadeId),
      profId: num(dados.SDPessoaProfissionalId),
      microarea: str(dados.SDPessoaMicroarea || dados.SDPessoaProfMicroarea, 2),
      foraArea: bool(dados.SDPessoaForaArea),

      mae: fmt(dados.SDPessoaMae),
      maeDesconhecida: bool(dados.SDPessoaMaeDesconhecida),
      pai: fmt(dados.SDPessoaPai),
      paiDesconhecido: bool(dados.SDPessoaPaiDesconhecido),

      estadoCivilId: str(dados.SDEstadoCivilId),
      racaCorId: num(dados.SDRacaCorId),
      nisPisPasep: str(dados.SDPessoaNisPisPasep, 11),
      etniaId: str(dados.SDEtniaId),

      planoSaudePriv: str(dados.SDPessoaPlanoSaudePriv, 1),

      responsavelFamilia: str(dados.SDPessoaResponsavelFamilia),
      responsavelId: num(dados.SDPessoaResponsavelId),
      parentesco: num(dados.SDPessoaParentesco),

      nacionalidade: str(dados.SDPessoaNacionalidade),
      paisOrigem: num(dados.SDPessoaPaisOrigem),
      dddCel: num(dados.SDPessoaDDDCel),
      cel: str(dados.SDPessoaCel, 10),

      usuarioBolsaFamilia: bool(dados.SDPessoaUsuarioBolsaFamilia),
      usuarioBPC: bool(dados.SDPessoaUsuarioBPC),
      flutuante: bool(dados.SDPessoaFlutuante),

      freqEscola: str(dados.SDPessoaFreqEscola),
      cboId: str(dados.SDPessoaSusCboId),
      escolaridadeId: str(dados.SDEscolaridadeId),
      analfabeto: bool(dados.SDPessoaAnalfabeto),
      situacaoTrabalho: num(dados.SDPessoaSituacaoTrabalho),

      respCriancaAdulto: bool(dados.SDPessoaRespCriancaAdulto),
      respCriancaOutraCrianc: bool(dados.SDPessoaRespCriancaOutraCrianc),
      respCriancaAdolescente: bool(dados.SDPessoaRespCriancaAdolescente),
      respCriancaSozinha: bool(dados.SDPessoaRespCriancaSozinha),
      respCriancaCreche: bool(dados.SDPessoaRespCriancaCreche),
      respCriancaOutro: bool(dados.SDPessoaRespCriancaOutro),

      freqCurandeiro: str(dados.SDPessoaFreqCurandeiro),
      grupoComunitario: str(dados.SDPessoaGrupoComunitario),
      membroComunidTrad: str(dados.SDPessoaMembroComunidTrad),
      povoComunidade: num(dados.SDPovoComunidadeESUSCod),

      informaOrientSexual: str(dados.SDPessoaInforomaOrientSexual),
      orientacaoSexual: num(dados.SDPessoaOrientacaoSexual),
      informaIdentGenero: str(dados.SDPessoaInformaIdentGenero),
      identGenero: num(dados.SDPessoaIdentGenero),

      deficiencia: str(dados.SDPessoaDeficiencia),
      defAuditiva: bool(dados.SDPessoaDeficienciaAuditiva),
      defVisual: bool(dados.SDPessoaDeficienciaVisual),
      defFisica: bool(dados.SDPessoaDeficienciaFisica),
      defIntelec: bool(dados.SDPessoaDeficienciaIntelec),
      defOutra: bool(dados.SDPessoaDeficienciaOutra),
      autismo: bool(dados.SDPessoaAutismo),
      autismoNiveis: num(dados.SDPessoaAutismoNiveis),
      mobilidadeReduzida: str(dados.SDPessoaMobilidadeReduzida),
      doadorSangue: str(dados.SDPessoaDoadorSangue),

      saidaMudanca: bool(dados.SDPessoaSaidaCadastroMudanca),
      saidaObito: bool(dados.SDPessoaSaidaCadastroObito),
      inativo: dados.SDPessoaInativo === 1 || dados.SDPessoaInativo === true ? 1 : null,
      dataInativacao: dateOrNull(dados.SDPessoaDataInativacao),
      saidaObitoData: dateOrNull(dados.SDPessoaSaidaObitoData),
      saidaNumeroDO: str(dados.SDPessoaSaidaNumeroDO, 9),

      gestante: bool(dados.SDPessoaGestante),
      maternidadeRef: str(dados.SDPessoaMaternidadeRefDesc, 255),
      peso: num(dados.SDPessoaPeso),
      fumante: str(dados.SDPessoaFumante),
      hipertensao: bool(dados.SDPessoaHipertensaoArterial),
      hipertensaoRisco: num(dados.SDPessoaHipertensaoRisco),
      diabetes: bool(dados.SDPessoaDiabetes),
      diabetesRisco: num(dados.SDPessoaDiabetesRisco),
      insulinoDependente: str(dados.SDPessoaInsulinoDependente),
      tipoDiabetes: num(dados.SDPessoaTipoDiabetes),
      acamado: bool(dados.SDPessoaAcamado),
      domiciliado: bool(dados.SDPessoadomiciliado),
      dificCicatrizacao: str(dados.SDPessoaDificuldadeCicatrizacao),
      hanseniase: str(dados.SDPessoaHanseniase),
      tuberculose: str(dados.SDPessoaTuberculose),
      cancer: str(dados.SDPessoaCancer),
      cancerMes: num(dados.SDPessoaCancerMes),
      cancerAno: num(dados.SDPessoaCancerAno),
      avcDerrame: str(dados.SDPessoaAvcDerrame),
      internacao: str(dados.SDPessoaInternacao),
      internacaoCausa: str(dados.SDPessoaInternacaoCausa, 255),
      colesterolAlto: str(dados.SDPessoaColesterolAlto),
      infarto: str(dados.SDPessoaInfarto),
      doencaCardiaca: str(dados.SDPessoaDoencaCardiaca),
      doencaCardiacaInsuf: bool(dados.SDPessoaDoencaCardiacaInsuf),
      doencaCardiacaOutro: bool(dados.SDPessoaDoencaCardiacaOutro),
      doencaCardiacaNSabe: bool(dados.SDPessoaDoencaCardiacaNSabe),
      doencaCoracaoFamilia: str(dados.SDPessoaDoencaCoracaoFamilia),
      tratPsiquiatra: str(dados.SDPessoaTratPsiquiatra),
      doencaRins: str(dados.SDPessoaDoencaRins),
      doencaRinsInsulf: bool(dados.SDPessoaDoencaRinsInsulf),
      doencaRinsOutro: bool(dados.SDPessoaDoencaRinsOutro),
      doencaRinsNSabe: bool(dados.SDPessoaDoencaRinsNSabe),
      doencaResp: str(dados.SDPessoaDoencaResp),
      doencaRespAsma: bool(dados.SDPessoaDoencaRespAsma),
      doencaRespDPOC: bool(dados.SDPessoaDoencaRespDPOC),
      doencaRespOutro: bool(dados.SDPessoaDoencaRespOutro),
      doencaRespNSabe: bool(dados.SDPessoaDoencaRespNSabe),
      dependenteAlcool: str(dados.SDPessoaDependenteAlcool),
      dependenteDroga: str(dados.SDPessoaDependenteDroga),
      outrasPraticas: str(dados.SDPessoaOutrasPraticas),
      plantasMedicinais: str(dados.SDPessoaPlantasMedicinais),
      plantasMedicinaisDesc: str(dados.SDPessoaPlantasMedicinaisDesc, 255),
      outrasCondSaude1: str(dados.SDPessoaOutrasCondSaude1, 255),
      outrasCondSaude2: str(dados.SDPessoaOutrasCondSaude2, 255),
      outrasCondSaude3: str(dados.SDPessoaOutrasCondSaude3, 255),
      sofreuQueda: str(dados.SDPessoaSofreuQueda),

      triaAlimentoAcabou: str(dados.SDPessoaTriaAlimentoAcabou),
      triaComeuAlimento: str(dados.SDPessoaTriaComeuAlimento),

      situacaoRua: str(dados.SDPessoaSituacaoRua),
      acompOutraInstit: str(dados.SDPessoaAcompOutraInstit),
      acompOutraInstDesc: str(dados.SDPessoaAcompOutraInstDesc, 255),
      tempoSituacaoRua: num(dados.SDPessoaTempoSituacaoRua),
      recebeBeneficio: str(dados.SDPessoaRecebeBeneficio),
      visitaFamiliarFreq: str(dados.SDPessoaVisitaFamiliarFreq),
      referenciaFamiliar: str(dados.SDPessoaReferenciaFamiliar),
      grauParentescoDesc: str(dados.SDPessoaGrauParentescoDesc, 255),
      alimenta: num(dados.SDPessoaAlimenta),
      alimentaRestPopular: bool(dados.SDPessoaAlimentaRestPopular),
      alimentaDoacRestaur: bool(dados.SDPessoaAlimentaDoacRestaur),
      alimentaOutro: bool(dados.SDPessoaAlimentaOutro),
      alimentaDoacRelig: bool(dados.SDPessoaAlimentaDoacReligioso),
      alimentaDoacPopular: bool(dados.SDPessoaAlimentaDoacPopular),
      higPessoal: str(dados.SDPessoaHigPessoal),
      higBanho: bool(dados.SDPessoaHigPessoalBanho),
      higSanit: bool(dados.SDPessoaHigPessoalSanit),
      higBucal: bool(dados.SDPessoaHigPessoalBucal),
      higOutro: bool(dados.SDPessoaHigPessoalOutro),

      termoRecusa: bool(dados.SDPessoaTermoRecusa),
      observacao: str(dados.SDPessoaObservacao, 5000),
    };

    const syncUsuarioConvenio = async (pessoaId: number, convenioAtual: string | null) => {
      const convenio = convenioAtual ?? 'N';

      const usuarioExistente = await dataSource.query(
        `SELECT sdusuarioid, sdusuarioconvenio
           FROM sdusuario
          WHERE sdusuarioid = $1`,
        [pessoaId]
      );

      if (usuarioExistente.length > 0) {
        await dataSource.query(
          `UPDATE sdusuario
              SET sdusuarioconvenio = $2
            WHERE sdusuarioid = $1`,
          [pessoaId, convenio]
        );
        return;
      }

      await dataSource.query(
        `INSERT INTO sdusuario (
           sdusuarioid,
           sdusuarioconvenio
         ) VALUES ($1, $2)`,
        [pessoaId, convenio]
      );
    };

    const existing = await dataSource.query(
      `SELECT *
         FROM sdpessoa
        WHERE sdpessoaguid = $1`,
      [cleanGuid]
    );

    if (existing.length > 0) {
      const old = existing[0];
      const pessoaId = old.sdpessoaid;

      const merged = {
        prenome: payload.prenome ?? old.sdpessoaprenome,
        nomeCompleto: payload.nomeCompleto ?? old.sdpessoanom,
        informaNomeSocial: payload.informaNomeSocial ?? old.sdpessoainformanomesocial,
        cpf: payload.cpf ?? old.sdpessoacpf,
        cns: payload.cns ?? old.sdpessoacns,
        rg: payload.rg ?? old.sdpessoaidentidade,
        dtNasc: payload.dtNasc ?? old.sdpessoadtnasc,
        sexo: payload.sexo ?? old.sdpessoasexo,
        dtCadastro: payload.dtCadastro ?? old.sdpessoadtcadastro,
        dtAtualizacao: payload.dtAtualizacao ?? old.sdpessoadtultimaatualizacaogerindiv,
        hrAtualizacao: payload.hrAtualizacao ?? old.sdpessoahrultimaatualizacaogerindiv,

        unidadeId: payload.unidadeId ?? old.sdpessoaunidadeid,
        profId: payload.profId ?? old.sdpessoaprofissionalid,
        microarea: payload.microarea ?? old.sdpessoaprofmicroarea,
        foraArea: payload.foraArea ?? old.sdpessoaforaarea,

        mae: payload.mae ?? old.sdpessoamae,
        maeDesconhecida: payload.maeDesconhecida ?? old.sdpessoamaedesconhecida,
        pai: payload.pai ?? old.sdpessoapai,
        paiDesconhecido: payload.paiDesconhecido ?? old.sdpessoapaidesconhecido,

        estadoCivilId: payload.estadoCivilId ?? old.sdestadocivilid,
        racaCorId: payload.racaCorId ?? old.sdracacorid,
        nisPisPasep: payload.nisPisPasep ?? old.sdpessoanispispasep,
        etniaId: payload.etniaId ?? old.sdetniaid,

        planoSaudePriv: payload.planoSaudePriv,

        responsavelFamilia: payload.responsavelFamilia ?? old.sdpessoaresponsavelfamilia,
        responsavelId: payload.responsavelId ?? old.sdpessoaresponsavelid,
        parentesco: payload.parentesco ?? old.sdpessoaparentesco,

        nacionalidade: payload.nacionalidade ?? old.sdpessoanacionalidade,
        paisOrigem: payload.paisOrigem ?? old.sdpessoapaisorigem,
        dddCel: payload.dddCel ?? old.sdpessoadddcel,
        cel: payload.cel ?? old.sdpessoacel,

        usuarioBolsaFamilia: payload.usuarioBolsaFamilia ?? old.sdpessoausuariobolsafamilia,
        usuarioBPC: payload.usuarioBPC ?? old.sdpessoausuariobpc,
        flutuante: payload.flutuante ?? old.sdpessoaflutuante,

        freqEscola: payload.freqEscola ?? old.sdpessoafreqescola,
        cboId: payload.cboId ?? old.sdpessoasuscboid,
        escolaridadeId: payload.escolaridadeId ?? old.sdescolaridadeid,
        analfabeto: payload.analfabeto ?? old.sdpessoaanalfabeto,
        situacaoTrabalho: payload.situacaoTrabalho ?? old.sdpessoasituacaotrabalho,

        respCriancaAdulto: payload.respCriancaAdulto ?? old.sdpessoarespcriancaadulto,
        respCriancaOutraCrianc: payload.respCriancaOutraCrianc ?? old.sdpessoarespcriancaoutracrianc,
        respCriancaAdolescente: payload.respCriancaAdolescente ?? old.sdpessoarespcriancaadolescente,
        respCriancaSozinha: payload.respCriancaSozinha ?? old.sdpessoarespcriancasozinha,
        respCriancaCreche: payload.respCriancaCreche ?? old.sdpessoarespcriancacreche,
        respCriancaOutro: payload.respCriancaOutro ?? old.sdpessoarespcriancaoutro,

        freqCurandeiro: payload.freqCurandeiro ?? old.sdpessoafreqcurandeiro,
        grupoComunitario: payload.grupoComunitario ?? old.sdpessoagrupocomunitario,
        membroComunidTrad: payload.membroComunidTrad ?? old.sdpessoamembrocomunidtrad,
        povoComunidade: payload.povoComunidade ?? old.sdpessoapovocomucod,

        informaOrientSexual: payload.informaOrientSexual ?? old.sdpessoainforomaorientsexual,
        orientacaoSexual: payload.orientacaoSexual ?? old.sdpessoaorientacaosexual,
        informaIdentGenero: payload.informaIdentGenero ?? old.sdpessoainformaidentgenero,
        identGenero: payload.identGenero ?? old.sdpessoaidentgenero,

        deficiencia: payload.deficiencia ?? old.sdpessoadeficiencia,
        defAuditiva: payload.defAuditiva ?? old.sdpessoadeficienciaauditiva,
        defVisual: payload.defVisual ?? old.sdpessoadeficienciavisual,
        defFisica: payload.defFisica ?? old.sdpessoadeficienciafisica,
        defIntelec: payload.defIntelec ?? old.sdpessoadeficienciaintelec,
        defOutra: payload.defOutra ?? old.sdpessoadeficienciaoutra,
        autismo: payload.autismo ?? old.sdpessoaautismo,
        autismoNiveis: payload.autismoNiveis ?? old.sdpessoaautismoniveis,
        mobilidadeReduzida: payload.mobilidadeReduzida ?? old.sdpessoamobilidadereduzida,
        doadorSangue: payload.doadorSangue ?? old.sdpessoadoadorsangue,

        saidaMudanca: payload.saidaMudanca ?? old.sdpessoasaidacadastromudanca,
        saidaObito: payload.saidaObito ?? old.sdpessoasaidacadastroobito,
        inativo: payload.inativo ?? old.sdpessoainativo,
        dataInativacao: payload.dataInativacao ?? old.sdpessoadatainativacao,
        saidaObitoData: payload.saidaObitoData ?? old.sdpessoasaidaobitodata,
        saidaNumeroDO: payload.saidaNumeroDO ?? old.sdpessoasaidanumerodo,

        gestante: payload.gestante ?? old.sdpessoagestante,
        maternidadeRef: payload.maternidadeRef ?? old.sdpessoamaternidaderefdesc,
        peso: payload.peso ?? old.sdpessoapeso,
        fumante: payload.fumante ?? old.sdpessoafumante,
        hipertensao: payload.hipertensao ?? old.sdpessoahipertensaoarterial,
        hipertensaoRisco: payload.hipertensaoRisco ?? old.sdpessoahipertensaorisco,
        diabetes: payload.diabetes ?? old.sdpessoadiabetes,
        diabetesRisco: payload.diabetesRisco ?? old.sdpessoadiabetesrisco,
        insulinoDependente: payload.insulinoDependente ?? old.sdpessoainsulinodependente,
        tipoDiabetes: payload.tipoDiabetes ?? old.sdpessoatipodiabetes,
        acamado: payload.acamado ?? old.sdpessoaacamado,
        domiciliado: payload.domiciliado ?? old.sdpessoadomiciliado,
        dificCicatrizacao: payload.dificCicatrizacao ?? old.sdpessoadificuldadecicatrizacao,
        hanseniase: payload.hanseniase ?? old.sdpessoahanseniase,
        tuberculose: payload.tuberculose ?? old.sdpessoatuberculose,
        cancer: payload.cancer ?? old.sdpessoacancer,
        cancerMes: payload.cancerMes ?? old.sdpessoacancermes,
        cancerAno: payload.cancerAno ?? old.sdpessoacancerano,
        avcDerrame: payload.avcDerrame ?? old.sdpessoaavcderrame,
        internacao: payload.internacao ?? old.sdpessoainternacao,
        internacaoCausa: payload.internacaoCausa ?? old.sdpessoainternacaocausa,
        colesterolAlto: payload.colesterolAlto ?? old.sdpessoacolesterolalto,
        infarto: payload.infarto ?? old.sdpessoainfarto,
        doencaCardiaca: payload.doencaCardiaca ?? old.sdpessoadoencacardiaca,
        doencaCardiacaInsuf: payload.doencaCardiacaInsuf ?? old.sdpessoadoencacardiacainsuf,
        doencaCardiacaOutro: payload.doencaCardiacaOutro ?? old.sdpessoadoencacardiacaoutro,
        doencaCardiacaNSabe: payload.doencaCardiacaNSabe ?? old.sdpessoadoencacardiacansabe,
        doencaCoracaoFamilia: payload.doencaCoracaoFamilia ?? old.sdpessoadoencacoracaofamilia,
        tratPsiquiatra: payload.tratPsiquiatra ?? old.sdpessoatratpsiquiatra,
        doencaRins: payload.doencaRins ?? old.sdpessoadoencarins,
        doencaRinsInsulf: payload.doencaRinsInsulf ?? old.sdpessoadoencarinsinsulf,
        doencaRinsOutro: payload.doencaRinsOutro ?? old.sdpessoadoencarinsoutro,
        doencaRinsNSabe: payload.doencaRinsNSabe ?? old.sdpessoadoencarinsnsabe,
        doencaResp: payload.doencaResp ?? old.sdpessoadoencaresp,
        doencaRespAsma: payload.doencaRespAsma ?? old.sdpessoadoencarespasma,
        doencaRespDPOC: payload.doencaRespDPOC ?? old.sdpessoadoencarespdpoc,
        doencaRespOutro: payload.doencaRespOutro ?? old.sdpessoadoencarespoutro,
        doencaRespNSabe: payload.doencaRespNSabe ?? old.sdpessoadoencarespnsabe,
        dependenteAlcool: payload.dependenteAlcool ?? old.sdpessoadependentealcool,
        dependenteDroga: payload.dependenteDroga ?? old.sdpessoadependentedroga,
        outrasPraticas: payload.outrasPraticas ?? old.sdpessoaoutraspraticas,
        plantasMedicinais: payload.plantasMedicinais ?? old.sdpessoaplantasmedicinais,
        plantasMedicinaisDesc: payload.plantasMedicinaisDesc ?? old.sdpessoaplantasmedicinaisdesc,
        outrasCondSaude1: payload.outrasCondSaude1 ?? old.sdpessoaoutrascondsaude1,
        outrasCondSaude2: payload.outrasCondSaude2 ?? old.sdpessoaoutrascondsaude2,
        outrasCondSaude3: payload.outrasCondSaude3 ?? old.sdpessoaoutrascondsaude3,
        sofreuQueda: payload.sofreuQueda ?? old.sdpessoasofreuqueda,

        triaAlimentoAcabou: payload.triaAlimentoAcabou ?? old.sdpessoatriaalimentoacabou,
        triaComeuAlimento: payload.triaComeuAlimento ?? old.sdpessoatriacomeualimento,

        situacaoRua: payload.situacaoRua ?? old.sdpessoasituacaorua,
        acompOutraInstit: payload.acompOutraInstit ?? old.sdpessoaacompoutrainstit,
        acompOutraInstDesc: payload.acompOutraInstDesc ?? old.sdpessoaacompoutrainstdesc,
        tempoSituacaoRua: payload.tempoSituacaoRua ?? old.sdpessoatemposituacaorua,
        recebeBeneficio: payload.recebeBeneficio ?? old.sdpessoarecebebeneficio,
        visitaFamiliarFreq: payload.visitaFamiliarFreq ?? old.sdpessoavisitafamiliarfreq,
        referenciaFamiliar: payload.referenciaFamiliar ?? old.sdpessoareferenciafamiliar,
        grauParentescoDesc: payload.grauParentescoDesc ?? old.sdpessoagrauparentescodesc,
        alimenta: payload.alimenta ?? old.sdpessoaalimenta,
        alimentaRestPopular: payload.alimentaRestPopular ?? old.sdpessoaalimentarestpopular,
        alimentaDoacRestaur: payload.alimentaDoacRestaur ?? old.sdpessoaalimentadoacrestaur,
        alimentaOutro: payload.alimentaOutro ?? old.sdpessoaalimentaoutro,
        alimentaDoacRelig: payload.alimentaDoacRelig ?? old.sdpessoaalimentadoacreligioso,
        alimentaDoacPopular: payload.alimentaDoacPopular ?? old.sdpessoaalimentadoacpopular,
        higPessoal: payload.higPessoal ?? old.sdpessoahigpessoal,
        higBanho: payload.higBanho ?? old.sdpessoahigpessoalbanho,
        higSanit: payload.higSanit ?? old.sdpessoahigpessoalsanit,
        higBucal: payload.higBucal ?? old.sdpessoahigpessoalbucal,
        higOutro: payload.higOutro ?? old.sdpessoahigpessoaloutro,

        termoRecusa: payload.termoRecusa ?? old.sdpessoatermorecusa,
        observacao: payload.observacao ?? old.sdpessoaobservacao,
      };

      await dataSource.query(
        `UPDATE sdpessoa SET
           sdpessoaprenome = $2, sdpessoanom = $3, sdpessoainformanomesocial = $4,
           sdpessoacpf = $5, sdpessoacns = $6, sdpessoaidentidade = $7,
           sdpessoadtnasc = $8, sdpessoasexo = $9, sdpessoadtcadastro = $10,
           sdpessoadtultimaatualizacaogerindiv = $11, sdpessoahrultimaatualizacaogerindiv = $12,
           sdpessoaunidadeid = $13, sdpessoaprofissionalid = $14, sdpessoaprofmicroarea = $15,
           sdpessoaforaarea = $16, sdpessoamae = $17, sdpessoamaedesconhecida = $18,
           sdpessoapai = $19, sdpessoapaidesconhecido = $20, sdestadocivilid = $21,
           sdracacorid = $22, sdpessoanispispasep = $23, sdetniaid = $24,
           sdpessoaresponsavelfamilia = $25, sdpessoaresponsavelid = $26, sdpessoaparentesco = $27,
           sdpessoanacionalidade = $28, sdpessoapaisorigem = $29, sdpessoadddcel = $30,
           sdpessoacel = $31, sdpessoausuariobolsafamilia = $32, sdpessoausuariobpc = $33,
           sdpessoaflutuante = $34, sdpessoafreqescola = $35, sdpessoasuscboid = $36,
           sdescolaridadeid = $37, sdpessoaanalfabeto = $38, sdpessoasituacaotrabalho = $39,
           sdpessoarespcriancaadulto = $40, sdpessoarespcriancaoutracrianc = $41,
           sdpessoarespcriancaadolescente = $42, sdpessoarespcriancasozinha = $43,
           sdpessoarespcriancacreche = $44, sdpessoarespcriancaoutro = $45,
           sdpessoafreqcurandeiro = $46, sdpessoagrupocomunitario = $47, sdpessoamembrocomunidtrad = $48,
           sdpessoapovocomucod = $49, sdpessoainforomaorientsexual = $50, sdpessoaorientacaosexual = $51,
           sdpessoainformaidentgenero = $52, sdpessoaidentgenero = $53, sdpessoadeficiencia = $54,
           sdpessoadeficienciaauditiva = $55, sdpessoadeficienciavisual = $56, sdpessoadeficienciafisica = $57,
           sdpessoadeficienciaintelec = $58, sdpessoadeficienciaoutra = $59, sdpessoaautismo = $60,
           sdpessoaautismoniveis = $61, sdpessoamobilidadereduzida = $62, sdpessoadoadorsangue = $63,
           sdpessoasaidacadastromudanca = $64, sdpessoasaidacadastroobito = $65, sdpessoainativo = $66,
           sdpessoadatainativacao = $67, sdpessoasaidaobitodata = $68, sdpessoasaidanumerodo = $69,
           sdpessoagestante = $70, sdpessoamaternidaderefdesc = $71, sdpessoapeso = $72,
           sdpessoafumante = $73, sdpessoahipertensaoarterial = $74, sdpessoahipertensaorisco = $75,
           sdpessoadiabetes = $76, sdpessoadiabetesrisco = $77, sdpessoainsulinodependente = $78,
           sdpessoatipodiabetes = $79, sdpessoaacamado = $80, sdpessoadomiciliado = $81,
           sdpessoadificuldadecicatrizacao = $82, sdpessoahanseniase = $83, sdpessoatuberculose = $84,
           sdpessoacancer = $85, sdpessoacancermes = $86, sdpessoacancerano = $87,
           sdpessoaavcderrame = $88, sdpessoainternacao = $89, sdpessoainternacaocausa = $90,
           sdpessoacolesterolalto = $91, sdpessoainfarto = $92, sdpessoadoencacardiaca = $93,
           sdpessoadoencacardiacainsuf = $94, sdpessoadoencacardiacaoutro = $95, sdpessoadoencacardiacansabe = $96,
           sdpessoadoencacoracaofamilia = $97, sdpessoatratpsiquiatra = $98, sdpessoadoencarins = $99,
           sdpessoadoencarinsinsulf = $100, sdpessoadoencarinsoutro = $101, sdpessoadoencarinsnsabe = $102,
           sdpessoadoencaresp = $103, sdpessoadoencarespasma = $104, sdpessoadoencarespdpoc = $105,
           sdpessoadoencarespoutro = $106, sdpessoadoencarespnsabe = $107, sdpessoadependentealcool = $108,
           sdpessoadependentedroga = $109, sdpessoaoutraspraticas = $110, sdpessoaplantasmedicinais = $111,
           sdpessoaplantasmedicinaisdesc = $112, sdpessoaoutrascondsaude1 = $113, sdpessoaoutrascondsaude2 = $114,
           sdpessoaoutrascondsaude3 = $115, sdpessoasofreuqueda = $116, sdpessoatriaalimentoacabou = $117,
           sdpessoatriacomeualimento = $118, sdpessoasituacaorua = $119, sdpessoaacompoutrainstit = $120,
           sdpessoaacompoutrainstdesc = $121, sdpessoatemposituacaorua = $122, sdpessoarecebebeneficio = $123,
           sdpessoavisitafamiliarfreq = $124, sdpessoareferenciafamiliar = $125, sdpessoagrauparentescodesc = $126,
           sdpessoaalimenta = $127, sdpessoaalimentarestpopular = $128, sdpessoaalimentadoacrestaur = $129,
           sdpessoaalimentaoutro = $130, sdpessoaalimentadoacreligioso = $131, sdpessoaalimentadoacpopular = $132,
           sdpessoahigpessoal = $133, sdpessoahigpessoalbanho = $134, sdpessoahigpessoalsanit = $135,
           sdpessoahigpessoalbucal = $136, sdpessoahigpessoaloutro = $137, sdpessoatermorecusa = $138,
           sdpessoaobservacao = $139, sdpessoaf = $140,
           sdpessoaregistromobile = 'I',
           sdpessoaenviadoesus = 'N'
         WHERE sdpessoaid = $1`,
        [
          pessoaId,
          merged.prenome, merged.nomeCompleto, merged.informaNomeSocial,
          merged.cpf, merged.cns, merged.rg, merged.dtNasc, merged.sexo,
          merged.dtCadastro, merged.dtAtualizacao, merged.hrAtualizacao,
          merged.unidadeId, merged.profId, merged.microarea, merged.foraArea,
          merged.mae, merged.maeDesconhecida, merged.pai, merged.paiDesconhecido,
          merged.estadoCivilId, merged.racaCorId, merged.nisPisPasep, merged.etniaId,
          merged.responsavelFamilia, merged.responsavelId, merged.parentesco,
          merged.nacionalidade, merged.paisOrigem, merged.dddCel, merged.cel,
          merged.usuarioBolsaFamilia, merged.usuarioBPC, merged.flutuante,
          merged.freqEscola, merged.cboId, merged.escolaridadeId, merged.analfabeto, merged.situacaoTrabalho,
          merged.respCriancaAdulto, merged.respCriancaOutraCrianc, merged.respCriancaAdolescente,
          merged.respCriancaSozinha, merged.respCriancaCreche, merged.respCriancaOutro,
          merged.freqCurandeiro, merged.grupoComunitario, merged.membroComunidTrad, merged.povoComunidade,
          merged.informaOrientSexual, merged.orientacaoSexual, merged.informaIdentGenero, merged.identGenero,
          merged.deficiencia, merged.defAuditiva, merged.defVisual, merged.defFisica,
          merged.defIntelec, merged.defOutra, merged.autismo, merged.autismoNiveis,
          merged.mobilidadeReduzida, merged.doadorSangue, merged.saidaMudanca,
          merged.saidaObito, merged.inativo, merged.dataInativacao, merged.saidaObitoData,
          merged.saidaNumeroDO, merged.gestante, merged.maternidadeRef, merged.peso, merged.fumante,
          merged.hipertensao, merged.hipertensaoRisco, merged.diabetes, merged.diabetesRisco,
          merged.insulinoDependente, merged.tipoDiabetes, merged.acamado, merged.domiciliado,
          merged.dificCicatrizacao, merged.hanseniase, merged.tuberculose, merged.cancer,
          merged.cancerMes, merged.cancerAno, merged.avcDerrame, merged.internacao,
          merged.internacaoCausa, merged.colesterolAlto, merged.infarto, merged.doencaCardiaca,
          merged.doencaCardiacaInsuf, merged.doencaCardiacaOutro, merged.doencaCardiacaNSabe,
          merged.doencaCoracaoFamilia, merged.tratPsiquiatra, merged.doencaRins, merged.doencaRinsInsulf,
          merged.doencaRinsOutro, merged.doencaRinsNSabe, merged.doencaResp, merged.doencaRespAsma,
          merged.doencaRespDPOC, merged.doencaRespOutro, merged.doencaRespNSabe, merged.dependenteAlcool,
          merged.dependenteDroga, merged.outrasPraticas, merged.plantasMedicinais, merged.plantasMedicinaisDesc,
          merged.outrasCondSaude1, merged.outrasCondSaude2, merged.outrasCondSaude3, merged.sofreuQueda,
          merged.triaAlimentoAcabou, merged.triaComeuAlimento, merged.situacaoRua, merged.acompOutraInstit,
          merged.acompOutraInstDesc, merged.tempoSituacaoRua, merged.recebeBeneficio, merged.visitaFamiliarFreq,
          merged.referenciaFamiliar, merged.grauParentescoDesc, merged.alimenta, merged.alimentaRestPopular,
          merged.alimentaDoacRestaur, merged.alimentaOutro, merged.alimentaDoacRelig,
          merged.alimentaDoacPopular, merged.higPessoal, merged.higBanho, merged.higSanit,
          merged.higBucal, merged.higOutro, merged.termoRecusa, merged.observacao,
          merged.nomeCompleto
        ]
      );

      await syncUsuarioConvenio(pessoaId, payload.planoSaudePriv);
      return pessoaId;
    }

    const prenome = payload.prenome || 'NOME NAO INFORMADO';
    const nomeCompleto = payload.nomeCompleto || prenome;
    const sexo = payload.sexo || 'M';
    const dtNasc = payload.dtNasc || '1900-01-01';
    const informaNomeSocial = payload.informaNomeSocial || 'N';
    const nacionalidade = payload.nacionalidade || '1';
    const planoSaudePriv = payload.planoSaudePriv || 'N';

    const result = await dataSource.query(
      `INSERT INTO sdpessoa (
         sdpessoaguid, sdpessoaprenome, sdpessoanom, sdpessoainformanomesocial,
         sdpessoacpf, sdpessoacns, sdpessoaidentidade, sdpessoadtnasc, sdpessoasexo,
         sdpessoadtcadastro, sdpessoadtultimaatualizacaogerindiv, sdpessoahrultimaatualizacaogerindiv,
         sdpessoaunidadeid, sdpessoaprofissionalid, sdpessoaprofmicroarea, sdpessoaforaarea,
         sdpessoamae, sdpessoamaedesconhecida, sdpessoapai, sdpessoapaidesconhecido,
         sdestadocivilid, sdracacorid, sdpessoanispispasep, sdetniaid,
         sdpessoaresponsavelfamilia, sdpessoaresponsavelid, sdpessoaparentesco,
         sdpessoanacionalidade, sdpessoapaisorigem, sdpessoadddcel, sdpessoacel,
         sdpessoausuariobolsafamilia, sdpessoausuariobpc, sdpessoaflutuante,
         sdpessoafreqescola, sdpessoasuscboid, sdescolaridadeid, sdpessoaanalfabeto, sdpessoasituacaotrabalho,
         sdpessoarespcriancaadulto, sdpessoarespcriancaoutracrianc, sdpessoarespcriancaadolescente,
         sdpessoarespcriancasozinha, sdpessoarespcriancacreche, sdpessoarespcriancaoutro,
         sdpessoafreqcurandeiro, sdpessoagrupocomunitario, sdpessoamembrocomunidtrad, sdpessoapovocomucod,
         sdpessoainforomaorientsexual, sdpessoaorientacaosexual, sdpessoainformaidentgenero, sdpessoaidentgenero,
         sdpessoadeficiencia, sdpessoadeficienciaauditiva, sdpessoadeficienciavisual, sdpessoadeficienciafisica,
         sdpessoadeficienciaintelec, sdpessoadeficienciaoutra, sdpessoaautismo, sdpessoaautismoniveis,
         sdpessoamobilidadereduzida, sdpessoadoadorsangue, sdpessoasaidacadastromudanca,
         sdpessoasaidacadastroobito, sdpessoainativo, sdpessoadatainativacao, sdpessoasaidaobitodata,
         sdpessoasaidanumerodo, sdpessoagestante, sdpessoamaternidaderefdesc, sdpessoapeso, sdpessoafumante,
         sdpessoahipertensaoarterial, sdpessoahipertensaorisco, sdpessoadiabetes, sdpessoadiabetesrisco,
         sdpessoainsulinodependente, sdpessoatipodiabetes, sdpessoaacamado, sdpessoadomiciliado,
         sdpessoadificuldadecicatrizacao, sdpessoahanseniase, sdpessoatuberculose, sdpessoacancer,
         sdpessoacancermes, sdpessoacancerano, sdpessoaavcderrame, sdpessoainternacao,
         sdpessoainternacaocausa, sdpessoacolesterolalto, sdpessoainfarto, sdpessoadoencacardiaca,
         sdpessoadoencacardiacainsuf, sdpessoadoencacardiacaoutro, sdpessoadoencacardiacansabe,
         sdpessoadoencacoracaofamilia, sdpessoatratpsiquiatra, sdpessoadoencarins, sdpessoadoencarinsinsulf,
         sdpessoadoencarinsoutro, sdpessoadoencarinsnsabe, sdpessoadoencaresp, sdpessoadoencarespasma,
         sdpessoadoencarespdpoc, sdpessoadoencarespoutro, sdpessoadoencarespnsabe, sdpessoadependentealcool,
         sdpessoadependentedroga, sdpessoaoutraspraticas, sdpessoaplantasmedicinais, sdpessoaplantasmedicinaisdesc,
         sdpessoaoutrascondsaude1, sdpessoaoutrascondsaude2, sdpessoaoutrascondsaude3, sdpessoasofreuqueda,
         sdpessoatriaalimentoacabou, sdpessoatriacomeualimento, sdpessoasituacaorua, sdpessoaacompoutrainstit,
         sdpessoaacompoutrainstdesc, sdpessoatemposituacaorua, sdpessoarecebebeneficio, sdpessoavisitafamiliarfreq,
         sdpessoareferenciafamiliar, sdpessoagrauparentescodesc, sdpessoaalimenta, sdpessoaalimentarestpopular,
         sdpessoaalimentadoacrestaur, sdpessoaalimentaoutro, sdpessoaalimentadoacreligioso, sdpessoaalimentadoacpopular,
         sdpessoahigpessoal, sdpessoahigpessoalbanho, sdpessoahigpessoalsanit, sdpessoahigpessoalbucal, sdpessoahigpessoaloutro,
         sdpessoatermorecusa, sdpessoaobservacao, sdpessoaf, sdpessoahiperdia, sdpessoaexportadohiperdia,
         sdpessoapaciente, sdpessoaaposentado, sdpessoaregistromobile, sdpessoaenviadoesus
       ) VALUES (
         $1, $2,$3,$4, $5,$6,$7, $8,$9, $10,$11,$12, $13,$14, $15,$16, $17,$18,$19,$20,
         $21,$22,$23,$24, $25,$26,$27, $28,$29, $30,$31, $32,$33,$34, $35,$36,$37,$38,$39,
         $40,$41,$42,$43,$44,$45, $46,$47,$48,$49, $50,$51,$52,$53, $54,$55,$56,$57,$58,$59,$60,$61,$62,$63,
         $64,$65,$66,$67,$68,$69, $70,$71,$72,$73,$74,$75,$76,$77,$78,$79, $80,$81,$82,$83,$84,
         $85,$86,$87,$88,$89,$90,$91,$92, $93,$94,$95,$96,$97,$98, $99,$100,$101,$102,
         $103,$104,$105,$106,$107, $108,$109,$110,$111,$112, $113,$114,$115,$116, $117,$118,
         $119,$120,$121,$122,$123,$124,$125,$126, $127,$128,$129,$130,$131,$132, $133,$134,$135,$136,$137,
         $138,$139, $140,$141,'N','N','S',0, 'I', 'N'
       )
       RETURNING sdpessoaid`,
      [
        cleanGuid, prenome, nomeCompleto, informaNomeSocial, payload.cpf, payload.cns, payload.rg, dtNasc, sexo,
        payload.dtCadastro, payload.dtAtualizacao, payload.hrAtualizacao, payload.unidadeId, payload.profId, payload.microarea, payload.foraArea,
        payload.mae, payload.maeDesconhecida, payload.pai, payload.paiDesconhecido, payload.estadoCivilId, payload.racaCorId, payload.nisPisPasep,
        payload.etniaId, payload.responsavelFamilia, payload.responsavelId, payload.parentesco, nacionalidade, payload.paisOrigem,
        payload.dddCel, payload.cel, payload.usuarioBolsaFamilia, payload.usuarioBPC, payload.flutuante, payload.freqEscola, payload.cboId,
        payload.escolaridadeId, payload.analfabeto, payload.situacaoTrabalho, payload.respCriancaAdulto, payload.respCriancaOutraCrianc,
        payload.respCriancaAdolescente, payload.respCriancaSozinha, payload.respCriancaCreche, payload.respCriancaOutro,
        payload.freqCurandeiro, payload.grupoComunitario, payload.membroComunidTrad, payload.povoComunidade, payload.informaOrientSexual,
        payload.orientacaoSexual, payload.informaIdentGenero, payload.identGenero, payload.deficiencia, payload.defAuditiva, payload.defVisual,
        payload.defFisica, payload.defIntelec, payload.defOutra, payload.autismo, payload.autismoNiveis, payload.mobilidadeReduzida, payload.doadorSangue,
        payload.saidaMudanca, payload.saidaObito, payload.inativo, payload.dataInativacao, payload.saidaObitoData, payload.saidaNumeroDO,
        payload.gestante, payload.maternidadeRef, payload.peso, payload.fumante, payload.hipertensao, payload.hipertensaoRisco, payload.diabetes,
        payload.diabetesRisco, payload.insulinoDependente, payload.tipoDiabetes, payload.acamado, payload.domiciliado, payload.dificCicatrizacao,
        payload.hanseniase, payload.tuberculose, payload.cancer, payload.cancerMes, payload.cancerAno, payload.avcDerrame, payload.internacao,
        payload.internacaoCausa, payload.colesterolAlto, payload.infarto, payload.doencaCardiaca, payload.doencaCardiacaInsuf,
        payload.doencaCardiacaOutro, payload.doencaCardiacaNSabe, payload.doencaCoracaoFamilia, payload.tratPsiquiatra,
        payload.doencaRins, payload.doencaRinsInsulf, payload.doencaRinsOutro, payload.doencaRinsNSabe, payload.doencaResp,
        payload.doencaRespAsma, payload.doencaRespDPOC, payload.doencaRespOutro, payload.doencaRespNSabe, payload.dependenteAlcool,
        payload.dependenteDroga, payload.outrasPraticas, payload.plantasMedicinais, payload.plantasMedicinaisDesc,
        payload.outrasCondSaude1, payload.outrasCondSaude2, payload.outrasCondSaude3, payload.sofreuQueda, payload.triaAlimentoAcabou,
        payload.triaComeuAlimento, payload.situacaoRua, payload.acompOutraInstit, payload.acompOutraInstDesc, payload.tempoSituacaoRua,
        payload.recebeBeneficio, payload.visitaFamiliarFreq, payload.referenciaFamiliar, payload.grauParentescoDesc, payload.alimenta,
        payload.alimentaRestPopular, payload.alimentaDoacRestaur, payload.alimentaOutro, payload.alimentaDoacRelig,
        payload.alimentaDoacPopular, payload.higPessoal, payload.higBanho, payload.higSanit, payload.higBucal, payload.higOutro, payload.termoRecusa,
        payload.observacao, nomeCompleto
      ]
    );

    const pessoaId = result[0].sdpessoaid;
    await syncUsuarioConvenio(pessoaId, planoSaudePriv);

    return pessoaId;
  }
}