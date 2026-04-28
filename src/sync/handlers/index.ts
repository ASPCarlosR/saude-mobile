import { Q } from '@nozbe/watermelondb';
import { database, pessoaCollection, visitaCollection, domicilioCollection } from '../../db/index';
import { useAuthStore } from '../../store/index';
import { snParaBool } from '../../utils/conversoes';
import { resolveTenantUrl } from '../../config';

/**
 * Função de auxílio para chamadas fetch com limite de tempo (timeout)
 */
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 15000): Promise<Response> {
  console.log(`[SYNC] Conectando ao host: ${url}`);
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: O servidor demorou a responder. Host: ${url}`)), timeoutMs)
    )
  ]);
}

export async function sincronizar() {
  // 1. Obtemos os dados do estado global (Zustand)
  const { profissional, token, tenantUrl, municipioSlug } = useAuthStore.getState();
  const tenantBaseUrl = resolveTenantUrl(tenantUrl);

  // =========================================================================
  // VALIDAÇÕES INICIAIS / DIAGNÓSTICO
  // =========================================================================
  if (!profissional) {
    throw new Error('Usuário não autenticado para sincronizar.');
  }

  if (!token || !String(token).trim()) {
    throw new Error('Token não configurado. Faça login novamente.');
  }

  if (!tenantUrl || !String(tenantUrl).trim()) {
    throw new Error('Município não configurado. Por favor, selecione seu município nas configurações.');
  }

  if (!municipioSlug || !String(municipioSlug).trim()) {
    throw new Error('Slug do município não configurado. Por favor, selecione seu município nas configurações.');
  }

  if (!tenantBaseUrl || !String(tenantBaseUrl).trim()) {
    throw new Error('URL base do tenant inválida. Verifique a configuração do município.');
  }

  console.log('[SYNC][AUTH] Estado atual antes da sincronização:', {
    tenantUrl,
    tenantBaseUrl,
    municipioSlug,
    profissionalId: profissional?.id,
    unidadeId: profissional?.unidadeId,
    equipeId: profissional?.equipeId,
    cboCodigo: profissional?.cboCodigo,
    tokenExiste: !!token,
    tokenPreview: typeof token === 'string' ? `${token.slice(0, 20)}...` : '(token não string)'
  });

  // Header padrão com o JWT do servidor específico da prefeitura
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-municipio-slug': municipioSlug
  };

  console.log('[SYNC][HEADERS] Headers preparados:', {
    authorizationPrefix: headers.Authorization.slice(0, 30) + '...',
    municipioSlug: headers['x-municipio-slug']
  });

  // =========================================================================
  // 1. DOWN-SYNC: Puxar dados do Servidor (S35/S36...) -> App Local
  // =========================================================================

  // 1.1 Sincronização de Pessoas
  try {
    const urlPessoas = `${tenantBaseUrl}/api/sync/pessoas`;
    console.log('[SYNC][PESSOAS] Iniciando DOWN-SYNC:', urlPessoas);

    const responsePessoas = await fetchWithTimeout(urlPessoas, { headers });

    if (!responsePessoas.ok) {
      const errorBody = await responsePessoas.text();
      console.error('[SYNC][PESSOAS] ERRO DETALHADO DO BACKEND:', {
        status: responsePessoas.status,
        statusText: responsePessoas.statusText,
        body: errorBody,
        url: urlPessoas,
        municipioSlug,
        profissionalId: profissional?.id
      });

      if (responsePessoas.status === 401) {
        throw new Error('Servidor respondeu com 401 (token inválido ou expirado). Faça login novamente.');
      }

      if (responsePessoas.status === 403) {
        throw new Error(
          'Servidor respondeu com 403 (acesso negado). Verifique se o token, o município selecionado e o perfil escolhido pertencem ao mesmo tenant.'
        );
      }

      throw new Error(`Servidor respondeu com erro ${responsePessoas.status}`);
    }

    const resultPessoas = await responsePessoas.json();

    if (resultPessoas.status === 'S' && resultPessoas.dados) {
      const pessoasLocais = await pessoaCollection.query().fetch();
      const pessoasLocaisMap = new Map(pessoasLocais.map(p => [p.guid, p]));
      const operacoes = [] as any[];

      for (const row of resultPessoas.dados) {
        const guid = row.sdpessoaguid?.trim();
        if (!guid) continue;

        const dataAtu = row.sdpessoadtultimaatualizacaogerindiv
          ? row.sdpessoadtultimaatualizacaogerindiv.substring(0, 10)
          : '';

        const horaAtu = row.sdpessoahrultimaatualizacaogerindiv
          ? new Date(row.sdpessoahrultimaatualizacaogerindiv).toLocaleTimeString('pt-BR').slice(0, 5)
          : '';

        const dtAtuMontada = dataAtu
          ? `${dataAtu.split('-').reverse().join('/')} ${horaAtu}`.trim()
          : '';

        const preencherCampos = (reg: any) => {
          reg.intId = row.sdpessoaid;
          reg.syncStatus = 'synced';

          // Identificação Básica
          reg.nome = row.sdpessoaprenome || row.sdpessoanom || '';
          reg.nomeSocial = row.sdpessoanom || '';
          reg.informaNomeSocial = snParaBool(row.sdpessoainformanomesocial);
          reg.cpf = row.sdpessoacpf || '';
          reg.cns = row.sdpessoacns || '';
          reg.rg = row.sdpessoaidentidade || '';
          reg.dtNasc = row.sdpessoadtnasc || '';
          reg.sexo = row.sdpessoasexo || 'M';
          reg.racaCor = parseInt(row.sdracacorid) || null;
          reg.etnia = row.sdetniaid || '';

          // Localização e Datas
          reg.microArea = row.sdpessoaprofmicroarea || '';
          reg.foraArea = snParaBool(row.sdpessoaforaarea);
          reg.dataCadastro = row.sdpessoadtcadastro?.substring(0, 10);
          reg.dataAtualizacao = row.sdpessoadtultimaatualizacaogerindiv;
          reg.dataAtualizacaoDescricao = dtAtuMontada;

          // Filiação
          reg.nomeMae = row.sdpessoamae || '';
          reg.maeDesconhecida = snParaBool(row.sdpessoamaedesconhecida);
          reg.nomePai = row.sdpessoapai || '';
          reg.paiDesconhecido = snParaBool(row.sdpessoapaidesconhecido);

          // Sociodemográfico
          reg.nacionalidade = row.sdpessoanacionalidade || '1';
          reg.paisOrigem = parseInt(row.sdpessoapaisorigem) || null;
          reg.estadoCivil = row.sdestadocivilid || '';
          reg.celular = row.sdpessoacel || '';
          reg.freqEscola = row.sdpessoafreqescola || '';
          reg.cboId = row.sdpessoasuscboid || '';
          reg.escolaridade = row.sdescolaridadeid || '';
          reg.situacaoTrabalho = parseInt(row.sdpessoasituacaotrabalho) || null;

          // Condições de Saúde
          reg.gestante = snParaBool(row.sdpessoagestante);
          reg.hipertensao = snParaBool(row.sdpessoahipertensaoarterial);
          reg.diabetes = snParaBool(row.sdpessoadiabetes);
          reg.acamado = snParaBool(row.sdpessoaacamado);
          reg.domiciliado = snParaBool(row.sdpessoadomiciliado);
          reg.fumante = row.sdpessoafumante || 'N';
          reg.dependenteAlcool = row.sdpessoadependentealcool || 'N';
          reg.dependenteDroga = row.sdpessoadependentedroga || 'N';
          reg.hanseniase = row.sdpessoahanseniase || 'N';
          reg.tuberculose = row.sdpessoatuberculose || 'N';
          reg.cancer = row.sdpessoacancer || 'N';
          reg.tratPsiquiatra = row.sdpessoadeficienciamental || 'N';
          reg.avcDerrame = row.sdpessoaavcderrame || 'N';
          reg.doencaRins = row.sdpessoadoencarenal || 'N';
          reg.doencaCardiaca = row.sdpessoadoencacardiaca || 'N';
          reg.doencaResp = row.sdpessoadoencarespiratoria || 'N';
          reg.sofreuQueda = row.sdpessoquedas || 'N';
          reg.outrasCondicoes = row.sdpessoaoutrascondicoes || '';
          reg.plantasMedicinais = row.sdpessoaplantasmedicinais || 'N';
          reg.doadorSangue = row.sdpessoadoadoresangue || 'N';
          reg.mobilidadeReduzida = row.sdpessoamobilidadereduzida || 'N';
          reg.grauParentescoDesc = row.sdpessoagrauparentescodesc || '';
          reg.internacao = row.sdpessoadinternacao || 'N';
          reg.doencaCoracaoFamilia = row.sdpessoadoencacoracaofamiliar || 'N';
          reg.peso = row.sdpessoapeso || '';
          reg.infarto = row.sdpessoinfarto || 'N';
          reg.freqCurandeiro = row.sdpessoafreqcurandeiro || 'N';
          reg.grupoComunitario = row.sdpessoagrupocomunitario || 'N';
          reg.planoSaudePrivado = row.sdpessoaplanoSaudePriv || 'N';

          // Deficiências
          reg.deficiencia = row.sdpessoadeficiencia || 'N';
          reg.deficienciaAuditiva = snParaBool(row.sdpessoadeficienciaauditiva);
          reg.deficienciaVisual = snParaBool(row.sdpessoadeficienciavisual);
          reg.deficienciaFisica = snParaBool(row.sdpessoadeficienciafisica);
          reg.deficienciaIntelec = snParaBool(row.sdpessoadeficienciaintelec);
          reg.autismo = snParaBool(row.sdpessoaautismo);

          // Situação de Rua
          reg.situacaoRua = row.sdpessoasituacaorua || 'N';
          reg.recebeBeneficio = row.sdpessoarecebebeneficio || 'N';
          reg.referenciaFamiliar = row.sdpessoareferenciafamiliar || 'N';
          reg.termoRecusa = snParaBool(row.sdpessoatermorecusa);

          reg.dados = JSON.stringify(row);
        };

        const pessoaExistente = pessoasLocaisMap.get(guid);
        if (pessoaExistente) {
          if ((pessoaExistente as any).syncStatus !== 'pending') {
            operacoes.push(pessoaExistente.prepareUpdate(preencherCampos));
          }
        } else {
          operacoes.push(pessoaCollection.prepareCreate((reg: any) => {
            reg.guid = guid;
            preencherCampos(reg);
          }));
        }
      }

      if (operacoes.length > 0) {
        await database.write(async () => {
          await database.batch(...operacoes);
        });
      }
    }
  } catch (err) {
    console.error('Erro no DOWN-SYNC Pessoas:', err);
  }

  // 1.2 DOWN-SYNC Domicílios
  try {
    const urlDom = `${tenantBaseUrl}/api/sync/domicilios`;
    console.log('[SYNC][DOMICILIOS] Iniciando DOWN-SYNC:', urlDom);

    const responseDom = await fetchWithTimeout(urlDom, { headers });

    if (!responseDom.ok) {
      const errorBody = await responseDom.text();
      console.error('[SYNC][DOMICILIOS] ERRO DETALHADO DO BACKEND:', {
        status: responseDom.status,
        statusText: responseDom.statusText,
        body: errorBody,
        url: urlDom,
        municipioSlug,
        profissionalId: profissional?.id
      });
      throw new Error(`Servidor respondeu com erro ${responseDom.status}`);
    }

    const resultDom = await responseDom.json();

    if (resultDom.status === 'S' && resultDom.dados) {
      const domsLocais = await domicilioCollection.query().fetch();
      const domsLocaisMap = new Map(domsLocais.map(d => [d.guid, d]));
      const operacoesDom = [] as any[];

      for (const row of resultDom.dados) {
        const guid = row.sddomicilioguid?.trim();
        if (!guid) continue;

        const preencherDom = (reg: any) => {
          reg.intId = row.sddomicilioid;
          reg.syncStatus = 'synced';
          reg.dataCadastro = row.sddomiciliodata ? row.sddomiciliodata.substring(0, 10) : '';
          reg.endereco = row.logradouro_nome || row.sddomicilioenderecocompl || '';
          reg.logradouroNome = row.logradouro_nome || '';
          reg.municipio = String(row.sddomiciliomunicipioid);
          reg.numero = row.sddomicilioendereconum || '';
          reg.microArea = row.sddomicilioprofmicroarea || '';
          reg.tipoImovel = parseInt(row.sddomiciliotipoimovel) || 1;

          reg.sitMoradia = parseInt(row.sddomiciliositmoradiaid) || 0;
          reg.localizacao = parseInt(row.sddomiciliolocalizacao) || 0;
          reg.tipoDomicilio = parseInt(row.sddomiciliotipodomid) || 0;
          reg.moradores = parseInt(row.sddomiciliomoradores) || 0;
          reg.comodos = parseInt(row.sddomiciliocomodos) || 0;
          reg.areaRural = parseInt(row.sddomicilioarearuralid) || 0;
          reg.tipoAcesso = parseInt(row.sddomiciliotipoacessoid) || 0;
          reg.materialParedes = parseInt(row.sddomiciliomaterialid) || 0;
          reg.abastecimentoAgua = parseInt(row.sddomicilioabastaguaid) || 0;
          reg.aguaConsumo = parseInt(row.sddomiciliotrataguaid) || 0;
          reg.escoamento = parseInt(row.sddomicilioescoamentoid) || 0;
          reg.destinoLixo = parseInt(row.sddomiciliodestlixoid) || 0;
          reg.energiaEletrica = row.sddomicilioenergiaeletrica || '';
          reg.quarteirao = row.sddomicilioquarteirao || '';
          reg.pontoReferencia = row.sddomiciliopontoreferencia || '';
          reg.possuiAnimais = row.sddomiciliopossuianimais || '';
          reg.animalGato = snParaBool(row.sddomicilioanimalgato);
          reg.animalCachorro = snParaBool(row.sddomicilioanimalcachorro);
          reg.animalPassaro = snParaBool(row.sddomicilioanimalpassaro);
          reg.animalMacaco = snParaBool(row.sddomicilioanimalmacaco);
          reg.animalGalinha = snParaBool(row.sddomicilioanimalgalinha);
          reg.animalPorco = snParaBool(row.sddomicilioanimalporco);
          reg.animalRepteis = snParaBool(row.sddomicilioanimalrepteis);
          reg.animalOutros = snParaBool(row.sddomicilioanimaloutros);
          reg.animaisQtde = parseInt(row.sddomicilioanimaisqtde) || 0;
          reg.instituicaoNome = row.sddomicilioinstituicaonome || '';
          reg.institOutroProf = row.sddomicilioinstituicaoutroprof || '';
          reg.riscoFamiliar = row.sddomicilioriskofamiliar || '';
          reg.termoRecusa = snParaBool(row.sddomiciliotermorecusa);
          reg.observacao = row.sddomicilioobservacao || '';
          reg.complemento = row.sddomicilioenderecocompl || '';
          reg.foraArea = snParaBool(row.sddomicilioforaarea);
          reg.unidadeId = parseInt(row.sddomiciliounidadeid) || 0;
          reg.profissionalId = parseInt(row.sddomicilioprofissionalid) || 0;
          reg.equipeId = parseInt(row.sddomicilioequipeid) || 0;
          reg.dddResid = parseInt(row.sddomiciliodddfoneresid) || 0;
          reg.foneResid = row.sddomiciliofoneresid || '';
          reg.dddContato = parseInt(row.sddomiciliodddfoneref) || 0;
          reg.foneContato = row.sddomiciliofoneref || '';

          let extraObj: any = {};
          try {
            extraObj = typeof row.dados === 'string' ? JSON.parse(row.dados) : (row.dados || {});
          } catch (e) {}

          reg.cnes = String(row.cnes || extraObj.cnes || '');
          reg.unidadeNome = row.unidade_nome || extraObj.unidadeNome || '';
          reg.profissionalNome = extraObj.profissionalNome || '';
          reg.equipeNome = extraObj.equipeNome || '';

          reg.dados = typeof row.dados === 'string' ? row.dados : JSON.stringify(row.dados);
        };

        const domExistente = domsLocaisMap.get(guid);
        if (domExistente) {
          if ((domExistente as any).syncStatus !== 'pending') {
            operacoesDom.push(domExistente.prepareUpdate(preencherDom));
          }
        } else {
          operacoesDom.push(domicilioCollection.prepareCreate((reg: any) => {
            reg.guid = guid;
            preencherDom(reg);
          }));
        }
      }

      if (operacoesDom.length > 0) {
        await database.write(async () => {
          await database.batch(...operacoesDom);
        });
      }
    }
  } catch (err) {
    console.error('Erro no DOWN-SYNC Domicilios:', err);
  }

  // 1.3 DOWN-SYNC Viagens (Transporte Sanitário)
  try {
    const urlViagens = `${tenantBaseUrl}/transporte/viagens`;
    console.log('[SYNC][VIAGENS] Iniciando DOWN-SYNC:', urlViagens);

    const responseViagens = await fetchWithTimeout(urlViagens, { headers });

    if (!responseViagens.ok) {
      const errorBody = await responseViagens.text();
      console.error('[SYNC][VIAGENS] ERRO DETALHADO DO BACKEND:', {
        status: responseViagens.status,
        statusText: responseViagens.statusText,
        body: errorBody,
        url: urlViagens,
        municipioSlug,
        profissionalId: profissional?.id
      });
      throw new Error(`Servidor respondeu com erro ${responseViagens.status}`);
    }

    const resultViagens = await responseViagens.json();

    if (resultViagens.status === 'S' && resultViagens.dados) {
      const viagensCollection = database.collections.get('viagens');
      const viagensLocais = await viagensCollection.query().fetch();
      const viagensLocaisMap = new Map(viagensLocais.map((v: any) => [v.viagem_id, v]));
      const operacoesViagem = [] as any[];

      for (const vData of resultViagens.dados) {
        const preencherViagem = (reg: any) => {
          reg.viagem_id = vData.id;
          reg.data = vData.data;
          reg.codigo = vData.codigo;
          reg.destino = vData.destino;
          reg.veiculo = vData.veiculo || '';
          reg.motorista = vData.motorista || '';
          reg.status = vData.status;

          if (reg.sync_status !== 'pending') {
            reg.observacao = vData.observacao || '';
            reg.pacientes = JSON.stringify(vData.pacientes || []);
            reg.sync_status = 'synced';
          }
        };

        const viagemExistente = viagensLocaisMap.get(vData.id);
        if (viagemExistente) {
          operacoesViagem.push(viagemExistente.prepareUpdate(preencherViagem));
        } else {
          operacoesViagem.push(viagensCollection.prepareCreate(preencherViagem));
        }
      }

      if (operacoesViagem.length > 0) {
        await database.write(async () => {
          await database.batch(...operacoesViagem);
        });
      }
    }
  } catch (err) {
    console.error('Erro no DOWN-SYNC Viagens:', err);
  }

  // =========================================================================
  // 2. UP-SYNC: Enviar dados pendentes do Celular -> Servidor Local (Tenants)
  // =========================================================================

  // 2.1 UP-SYNC Viagens
  try {
    const viagensPendentes = await database.collections.get('viagens').query(Q.where('sync_status', 'pending')).fetch();

    for (const vLocal of viagensPendentes) {
      try {
        const pacientesArr = JSON.parse((vLocal as any).pacientes || '[]');
        const payloadViagem = {
          observacao: (vLocal as any).observacao,
          pacientes: pacientesArr.map((p: any) => ({
            usuarioId: p.id,
            faltou: p.presente === false,
            observacao: p.observacaoPaciente
          }))
        };

        const resViagem = await fetchWithTimeout(
          `${tenantBaseUrl}/transporte/viagem/${(vLocal as any).viagem_id}/atualizar`,
          { method: 'POST', headers, body: JSON.stringify(payloadViagem) }
        );

        if (resViagem.ok) {
          await database.write(async () => {
            await vLocal.update((r: any) => {
              r.sync_status = 'synced';
            });
          });
        } else {
          const errorBody = await resViagem.text();
          console.error(`[SYNC][VIAGENS] Erro ao enviar viagem ${(vLocal as any).viagem_id}:`, {
            status: resViagem.status,
            body: errorBody
          });
        }
      } catch (errViagem) {
        console.error(`Erro ao enviar viagem ${(vLocal as any).viagem_id}`, errViagem);
      }
    }
  } catch (err) {
    console.error('Erro no UP-SYNC Viagens:', err);
  }

  // 2.2 UP-SYNC Fichas
  const registrosSync: any[] = [];
  const indiceRegistrosSync = new Map<string, number>();

  const adicionarRegistroSync = (registro: any) => {
    const chave = `${registro.tabelasincro}:${registro.guid}`;
    const idxExistente = indiceRegistrosSync.get(chave);

    if (idxExistente === undefined) {
      indiceRegistrosSync.set(chave, registrosSync.length);
      registrosSync.push(registro);
      return;
    }

    const atual = registrosSync[idxExistente];
    const atualTam = JSON.stringify(atual?.dados || {}).length;
    const novoTam = JSON.stringify(registro?.dados || {}).length;

    if (novoTam >= atualTam) {
      registrosSync[idxExistente] = registro;
    }
  };

  const pessoasPendentes = await pessoaCollection.query(Q.where('sync_status', Q.notEq('synced'))).fetch();
  const domiciliosPendentes = await domicilioCollection.query(Q.where('sync_status', Q.notEq('synced'))).fetch();
  const visitasPendentes = await visitaCollection.query(Q.where('sync_status', Q.notEq('synced'))).fetch();

  console.log('[SYNC][VISITA] Pendentes encontrados:', visitasPendentes.length);

  const visitasUnicas = new Map<string, any>();

  for (const v of visitasPendentes as any[]) {
    if (!v.guid) continue;

    const existente = visitasUnicas.get(v.guid);

    if (!existente) {
      visitasUnicas.set(v.guid, v);
      continue;
    }

    const existenteTemDados = !!existente.dados;
    const atualTemDados = !!v.dados;

    if (!existenteTemDados && atualTemDados) {
      visitasUnicas.set(v.guid, v);
    }
  }

  for (const v of visitasUnicas.values()) {
    let dadosForm: any = {};

    try {
      dadosForm =
        typeof v.dados === 'string'
          ? JSON.parse(v.dados)
          : (v.dados || {});
    } catch (e) {
      console.log('[SYNC][VISITA] Erro ao fazer parse de v.dados:', e);
      dadosForm = {};
    }

    const payloadVisita = {
      ...dadosForm,

      SDVisitaDomiciliarGUID: v.guid,
      SDVisitaDomiciliarUsuarioGUID:
        dadosForm.SDVisitaDomiciliarUsuarioGUID ||
        (v as any)?._raw?.pessoa_guid ||
        null,
      SDVisitaDomiciliarUsuarioId:
        dadosForm.SDVisitaDomiciliarUsuarioId || null,

      SDVisitaDomiciliarData: v.data,
      SDVisitaDomiciliarHora: v.hora,
      SDVisitaDomiciliarTurno: v.turno,
      SDVisitaDomiciliarTipoImovel:
        dadosForm.SDVisitaDomiciliarTipoImovel ?? 1,
      SDVisitaDomiciliarMicroarea: v.microArea,
      SDVisitaDomiciliarForaArea:
        dadosForm.SDVisitaDomiciliarForaArea ?? false,
      SDVisitaDomiciliarVisitaCompar:
        dadosForm.SDVisitaDomiciliarVisitaCompar ?? false,

      SDVisitaDomiciliarCadAtualiz:
        dadosForm.SDVisitaDomiciliarCadAtualiz ?? v.cadAtualiz ?? false,
      SDVisitaDomiciliarPeriodica:
        dadosForm.SDVisitaDomiciliarPeriodica ?? false,

      SDVisitaDomiciliarConsulta:
        dadosForm.SDVisitaDomiciliarConsulta ?? v.consulta ?? false,
      SDVisitaDomiciliarExame:
        dadosForm.SDVisitaDomiciliarExame ?? false,
      SDVisitaDomiciliarVacina:
        dadosForm.SDVisitaDomiciliarVacina ?? v.vacina ?? false,
      SDVisitaDomiciliarAtivBolsaFam:
        dadosForm.SDVisitaDomiciliarAtivBolsaFam ?? false,

      SDVisitaDomiciliarGestante:
        dadosForm.SDVisitaDomiciliarGestante ?? v.gestante ?? false,
      SDVisitaDomiciliarPuerpera:
        dadosForm.SDVisitaDomiciliarPuerpera ?? false,
      SDVisitaDomiciliarRecemNasc:
        dadosForm.SDVisitaDomiciliarRecemNasc ?? false,
      SDVisitaDomiciliarCrianca:
        dadosForm.SDVisitaDomiciliarCrianca ?? false,
      SDVisitaDomiciliarDesnutricao:
        dadosForm.SDVisitaDomiciliarDesnutricao ?? false,
      SDVisitaDomiciliarReabilitacao:
        dadosForm.SDVisitaDomiciliarReabilitacao ?? false,
      SDVisitaDomiciliarHipertensao:
        dadosForm.SDVisitaDomiciliarHipertensao ?? false,
      SDVisitaDomiciliarDiabetes:
        dadosForm.SDVisitaDomiciliarDiabetes ?? false,
      SDVisitaDomiciliarAsma:
        dadosForm.SDVisitaDomiciliarAsma ?? false,
      SDVisitaDomiciliarDPOC:
        dadosForm.SDVisitaDomiciliarDPOC ?? false,
      SDVisitaDomiciliarCancer:
        dadosForm.SDVisitaDomiciliarCancer ?? false,
      SDVisitaDomiciliarCronicas:
        dadosForm.SDVisitaDomiciliarCronicas ?? false,
      SDVisitaDomiciliarHanseniase:
        dadosForm.SDVisitaDomiciliarHanseniase ?? false,
      SDVisitaDomiciliarTuberculose:
        dadosForm.SDVisitaDomiciliarTuberculose ?? false,
      SDVisitaDomiciliarSintResp:
        dadosForm.SDVisitaDomiciliarSintResp ?? false,
      SDVisitaDomiciliarTabagista:
        dadosForm.SDVisitaDomiciliarTabagista ?? false,
      SDVisitaDomiciliarAcamados:
        dadosForm.SDVisitaDomiciliarAcamados ?? false,
      SDVisitaDomiciliarVulnerSocial:
        dadosForm.SDVisitaDomiciliarVulnerSocial ?? false,
      SDVisitaDomiciliarAcomBolsaFam:
        dadosForm.SDVisitaDomiciliarAcomBolsaFam ?? false,
      SDVisitaDomiciliarSaudeMental:
        dadosForm.SDVisitaDomiciliarSaudeMental ?? false,
      SDVisitaDomiciliarUsuarAlcool:
        dadosForm.SDVisitaDomiciliarUsuarAlcool ?? false,
      SDVisitaDomiciliarOutrasDrogas:
        dadosForm.SDVisitaDomiciliarOutrasDrogas ?? false,
      SDVisitaDomiciliarPessoaIdosa:
        dadosForm.SDVisitaDomiciliarPessoaIdosa ?? false,

      SDVisitaDomiciliarAcaoEduc:
        dadosForm.SDVisitaDomiciliarAcaoEduc ?? false,
      SDVisitaDomiciliarImovelFoco:
        dadosForm.SDVisitaDomiciliarImovelFoco ?? false,
      SDVisitaDomiciliarAcaoMec:
        dadosForm.SDVisitaDomiciliarAcaoMec ?? false,
      SDVisitaDomiciliarTratFocal:
        dadosForm.SDVisitaDomiciliarTratFocal ?? false,

      SDVisitaDomiciliarEgressoInt:
        dadosForm.SDVisitaDomiciliarEgressoInt ?? false,
      SDVisitaDomiciliarConviteAtiv:
        dadosForm.SDVisitaDomiciliarConviteAtiv ?? false,
      SDVisitaDomiciliarOrientacao:
        dadosForm.SDVisitaDomiciliarOrientacao ?? false,
      SDVisitaDomiciliarOutros:
        dadosForm.SDVisitaDomiciliarOutros ?? false,

      SDVisitaDomiciliarPeso:
        dadosForm.SDVisitaDomiciliarPeso ?? v.peso ?? 0,
      SDVisitaDomiciliarAltura:
        dadosForm.SDVisitaDomiciliarAltura ?? v.altura ?? 0,
      SDVisitaDomiciliarTemperatura:
        dadosForm.SDVisitaDomiciliarTemperatura ?? 0,
      SDVisitaDomiciliarPressaoSistolica:
        dadosForm.SDVisitaDomiciliarPressaoSistolica ?? 0,
      SDVisitaDomiciliarPressaoDiastolica:
        dadosForm.SDVisitaDomiciliarPressaoDiastolica ?? 0,
      SDVisitaDomiciliarGlicemia:
        dadosForm.SDVisitaDomiciliarGlicemia ?? 0,
      SDVisitaDomiciliarTipoGlicemia:
        dadosForm.SDVisitaDomiciliarTipoGlicemia || '',

      SDVisitaDomiciliarGestanteDum:
        dadosForm.SDVisitaDomiciliarGestanteDum || '',
      SDVisitaDomiciliarGravidezPlanejada:
        dadosForm.SDVisitaDomiciliarGravidezPlanejada ?? false,
      SDVisitaDomiciliarQtdGestacoes:
        dadosForm.SDVisitaDomiciliarQtdGestacoes ?? 0,
      SDVisitaDomiciliarsdIdadeGestacional:
        dadosForm.SDVisitaDomiciliarsdIdadeGestacional ?? 0,
      SDVisitaDomiciliarQtdCesarias:
        dadosForm.SDVisitaDomiciliarQtdCesarias ?? 0,
      SDVisitaDomiciliarQtdPartosNomais:
        dadosForm.SDVisitaDomiciliarQtdPartosNomais ?? 0,
      SDVisitaDomiciliarGestasPrevia:
        dadosForm.SDVisitaDomiciliarGestasPrevia ?? 0,
      SDVisitaDomiciliarQtdAbortos:
        dadosForm.SDVisitaDomiciliarQtdAbortos ?? 0,
      SDVisitaDomiciliarPartos:
        dadosForm.SDVisitaDomiciliarPartos ?? 0,

      SDVisitaDomiciliarDesfecho: v.desfecho ?? 1,
      SDVisitaDomiciliarObs:
        dadosForm.SDVisitaDomiciliarObs || '',
      SDVisitaDomiciliarLatitude: v.latitude,
      SDVisitaDomiciliarLongitude: v.longitude,
      SDVisitaDomiciliarAssinaturaPaciente:
        v.assinaturaBase64 || '',

      SDVisitaDomiciliarProfId: profissional.id,
      SDVisitaDomiciliarUnidadeId: profissional.unidadeId,
      SDVisitaDomiciliarEquipeId: profissional.equipeId,
      SDVisitaDomiciliarCBOProfId: profissional.cboCodigo,
    };

    console.log('[SYNC][VISITA] Payload montado:', JSON.stringify(payloadVisita));

    adicionarRegistroSync({
      guid: v.guid,
      tabelasincro: 8,
      dados: payloadVisita,
    });
  }

  for (const p of pessoasPendentes) {
    adicionarRegistroSync({ guid: p.guid, tabelasincro: 2, dados: { SDPessoaGUID: p.guid } });
  }

  for (const d of domiciliosPendentes) {
    adicionarRegistroSync({ guid: d.guid, tabelasincro: 3, dados: { SDDomicilioGUID: d.guid } });
  }

  for (const v of visitasPendentes as any[]) {
    let dadosForm: any = {};

    try {
      dadosForm = typeof v.dados === 'string' ? JSON.parse(v.dados) : (v.dados || {});
    } catch (e) {
      console.log('[SYNC][VISITA] Erro ao fazer parse de v.dados:', e);
      dadosForm = {};
    }

    adicionarRegistroSync({
      guid: v.guid,
      tabelasincro: 8,
      dados: {
        ...dadosForm,

        SDVisitaDomiciliarGUID: v.guid,

        SDVisitaDomiciliarData: v.data,
        SDVisitaDomiciliarHora: v.hora,
        SDVisitaDomiciliarTurno: v.turno,
        SDVisitaDomiciliarMicroarea: v.microArea,
        SDVisitaDomiciliarDesfecho: v.desfecho,
        SDVisitaDomiciliarPeso: v.peso,
        SDVisitaDomiciliarAltura: v.altura,
        SDVisitaDomiciliarConsulta: v.consulta,
        SDVisitaDomiciliarCadAtualiz: v.cadAtualiz,
        SDVisitaDomiciliarVacina: v.vacina,
        SDVisitaDomiciliarGestante: v.gestante,
        SDVisitaDomiciliarLatitude: v.latitude,
        SDVisitaDomiciliarLongitude: v.longitude,
        SDVisitaDomiciliarAssinaturaPaciente: v.assinaturaBase64 ? '[Preenchida]' : '',

        SDVisitaDomiciliarProfId: profissional.id,
        SDVisitaDomiciliarUnidadeId: profissional.unidadeId,
        SDVisitaDomiciliarEquipeId: profissional.equipeId,
        SDVisitaDomiciliarCBOProfId: profissional.cboCodigo,
      }
    });
  }

  const varrerTabela = async (colName: string, tabelaIdSincro: number) => {
    try {
      const pendentes = await database.collections.get(colName).query(Q.where('sync_status', Q.notEq('synced'))).fetch();

      for (const reg of pendentes) {
        let dadosForm = {};
        try {
          dadosForm = typeof (reg as any).dados === 'string'
            ? JSON.parse((reg as any).dados)
            : ((reg as any).dados || (reg as any)._raw);
        } catch (e) {
          dadosForm = (reg as any)._raw;
        }

        adicionarRegistroSync({
          guid: (reg as any).guid,
          tabelasincro: tabelaIdSincro,
          dados: {
            ...dadosForm,
            profissionalId: profissional.id,
            unidadeId: profissional.unidadeId,
            equipeId: profissional.equipeId,
            cboCodigo: profissional.cboCodigo
          }
        });
      }
    } catch (e) {}
  };

  await varrerTabela('atendimentos_domiciliares', 4);
  await varrerTabela('atividades_coletivas', 5);
  await varrerTabela('avaliacoes_elegibilidade', 6);
  await varrerTabela('marcadores_consumo', 7);
  await varrerTabela('atendimentos_individuais', 9);
  await varrerTabela('vacinas', 15);

  if (registrosSync.length === 0) {
    return { mensagem: 'Dados recebidos com sucesso! Seu celular já estava atualizado.' };
  }

  const bodySync = {
    deviceId: (profissional as any).deviceId,
    origem: 'M',
    registros: registrosSync
  };



  const response = await fetchWithTimeout(`${tenantBaseUrl}/api/sync`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bodySync)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[SYNC][POST /api/sync] ERRO DETALHADO DO BACKEND:', {
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      tenantBaseUrl,
      municipioSlug,
      profissionalId: profissional?.id
    });

    if (response.status === 401) {
      throw new Error('Token inválido ou expirado. Faça login novamente.');
    }

    if (response.status === 403) {
      throw new Error('Acesso negado pelo backend. Verifique se token, município e perfil pertencem ao mesmo tenant.');
    }

    throw new Error(`Servidor respondeu com erro ${response.status}`);
  }

  const resultado = await response.json();

  let qtdSucesso = 0;
  const msgsErro: string[] = [];

  await database.write(async () => {
    for (const res of resultado.registros) {
      if (res.status === 'S') {
        qtdSucesso++;

        const colNames = [
          'pessoas',
          'visitas_domiciliares',
          'domicilios',
          'atendimentos_domiciliares',
          'atividades_coletivas',
          'avaliacoes_elegibilidade',
          'marcadores_consumo',
          'vacinas',
          'atendimentos_individuais'
        ];

        for (const colName of colNames) {
          try {
            const records = await database.collections.get(colName).query(Q.where('guid', res.guid)).fetch() as any[];
            if (records.length > 0) {
              await records[0].update((r: any) => {
                r.intId = res.intId;
                r.syncStatus = 'synced';
              });
              break;
            }
          } catch (e) {}
        }
      } else {
        msgsErro.push(res.erro || 'Erro na gravação remota.');
      }
    }
  });

  if (msgsErro.length > 0) {
    throw new Error(`O servidor recusou alguns registros:\n${msgsErro[0]}`);
  }

  return { mensagem: `${qtdSucesso} registro(s) sincronizado(s) com o servidor ${tenantBaseUrl}!` };
}