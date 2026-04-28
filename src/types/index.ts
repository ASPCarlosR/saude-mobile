// ============================================================
// TIPOS GLOBAIS — App e-SUS Mobile
// ============================================================

export type SN = 'S' | 'N' | ' ';
export type Turno = 'M' | 'T' | 'N';
export type Sexo = 'M' | 'F';

// Profissional logado (vem do JWT)
export interface Profissional {
  id: number;
  nome: string;
  cns: string;
  unidadeId: number;
  cboCodigo: string;
  equipeId: number;
  ine: string;
  microArea: string;
}
// Payload de sessão de sync — espelho de mbsincronizacao
export interface SessaoSync {
  id?: number;
  inicio: string;         // ISO timestamp
  fim?: string;
  usuarioLoginId: number; // usuarioid do profissional
  status: 'P' | 'S' | 'E'; // Pendente / Sucesso / Erro
  deviceId: string;
  appVersao: string;
  origem: 'M';            // sempre M para novo app
  registros: RegistroSync[];
}

// Payload de um registro individual — espelho de mbsincronizacaoregistros
export interface RegistroSync {
  chaveMobile: string;           // seq local (string do int)
  tabelaSincro: TabelaSincro;
  registroGuid: string;          // UUID do registro
  dados: VisitaPayload | PessoaPayload | DomicilioPayload |
         AtendIndivPayload | AtendOdontoPayload | AtividadePayload;
}

// Resposta do servidor após sync
export interface RespostaSync {
  sessaoId: number;
  status: 'S' | 'E';
  registros: RespostaRegistro[];
}

export interface RespostaRegistro {
  guid: string;
  intId: number | null;
  status: 'S' | 'E';
  erro?: string;
}

// Códigos de tabela (mbsincronizacaoregistrotabelasincro)
export enum TabelaSincro {
  PESSOA         = 2,
  DOMICILIO      = 3,
  ATEND_INDIV    = 4,
  ATEND_ODONTO   = 5,
  ATIV_COLETIVA  = 6,
  VISITA         = 8,
  VACINA         = 14,
}

// ---- PAYLOADS (espelham os campos JSON do Genexus) ----------

export interface VisitaPayload {
  SDVisitaDomiciliarGUID: string;
  SDVisitaDomiciliarUnidadeId: number;
  SDVisitaDomiciliarProfId: number;
  SDVisitaDomiciliarProfGUID: string;
  SDVisitaDomiciliarCBOProfId: string;
  SDVisitaDomiciliarEquipeId: number;
  SDVisitaDomiciliarTurno: Turno;
  SDVisitaDomiciliarData: string;       // YYYY-MM-DD
  SDVisitaDomiciliarHora: string;       // ISO timestamp
  SDVisitaDomiciliarUsuarioId: number;
  SDVisitaDomiciliarUsuarioGUID: string;
  SDVisitaDomiciliarVisitaCompar: SN;
  SDVisitaDomiciliarCadAtualiz: SN;
  SDVisitaDomiciliarPeriodica: SN;
  SDVisitaDomiciliarConsulta: SN;
  SDVisitaDomiciliarExame: SN;
  SDVisitaDomiciliarVacina: SN;
  SDVisitaDomiciliarGestante: SN;
  SDVisitaDomiciliarPuerpera: SN;
  SDVisitaDomiciliarRecemNasc: SN;
  SDVisitaDomiciliarCrianca: SN;
  SDVisitaDomiciliarDesnutricao: SN;
  SDVisitaDomiciliarReabilitacao: SN;
  SDVisitaDomiciliarHipertensao: SN;
  SDVisitaDomiciliarDiabetes: SN;
  SDVisitaDomiciliarAsma: SN;
  SDVisitaDomiciliarDPOC: SN;
  SDVisitaDomiciliarCancer: SN;
  SDVisitaDomiciliarCronicas: SN;
  SDVisitaDomiciliarHanseniase: SN;
  SDVisitaDomiciliarTuberculose: SN;
  SDVisitaDomiciliarSintResp: SN;
  SDVisitaDomiciliarTabagista: SN;
  SDVisitaDomiciliarAcamados: SN;
  SDVisitaDomiciliarVulnerSocial: SN;
  SDVisitaDomiciliarAcomBolsaFam: SN;
  SDVisitaDomiciliarSaudeMental: SN;
  SDVisitaDomiciliarUsuarAlcool: SN;
  SDVisitaDomiciliarOutrasDrogas: SN;
  SDVisitaDomiciliarEgressoInt: SN;
  SDVisitaDomiciliarControleAmb: SN;
  SDVisitaDomiciliarConviteAtiv: SN;
  SDVisitaDomiciliarOrientacao: SN;
  SDVisitaDomiciliarOutros: SN;
  SDVisitaDomiciliarDesfecho: 1 | 2 | 3;
  SDVisitaDomiciliarObs: string;
  SDVisitaDomiciliarMicroarea: string;
  SDVisitaDomiciliarForaArea: SN;
  SDVisitaDomiciliarTipoImovel: number;
  SDVisitaDomiciliarAcaoEduc: SN;
  SDVisitaDomiciliarImovelFoco: SN;
  SDVisitaDomiciliarAcaoMec: SN;
  SDVisitaDomiciliarTratFocal: SN;
  SDVisitaDomiciliarPeso: number;
  SDVisitaDomiciliarAltura: number;
  SDVisitaDomiciliarLatitude?: string;
  SDVisitaDomiciliarLongitude?: string;
  SDVisitaDomiciliarAssinaturaPaciente?: string; // base64 PNG
}

export interface PessoaPayload {
  SDPessoaGUID: string;
  SDPessoaNom: string;
  SDPessoaCPF: string;
  SDPessoaCNS: string;
  SDPessoaDtNasc: string;
  SDPessoaSexo: Sexo;
  SDRacaCorId: string;
  SDPessoaMae: string;
  SDPessoaPai: string;
  SDPessoaMaeDesconhecida: SN;
  SDPessoaPaiDesconhecido: SN;
  SDPessoaCel: string;
  SDPessoaDDDCel: number;
  SDPessoaEmail: string;
  SDPessoaNisPisPasep: string;
  SDPessoaHipertensaoArterial: SN;
  SDPessoaDiabetes: SN;
  SDPessoaFumante: SN;
  SDPessoaAcamado: SN;
  SDPessoaDomiciliado: SN;
  SDPessoaHanseniase: SN;
  SDPessoaTuberculose: SN;
  SDPessoaDoencaResp: SN;
  SDPessoaTratPsiquiatra: SN;
  SDPessoaDependenteAlcool: SN;
  SDPessoaDependenteDroga: SN;
  SDPessoaCancer: SN;
  SDPessoaInternacao: SN;
  SDPessoaPlantasMedicinais: SN;
  SDPessoaOutrasPraticas: SN;
  SDEscolaridadeId: string;
  SDPessoaSituacaoTrabalho: number;
  SDPessoaFreqEscola: SN;
  SDPessoaDeficiencia: SN;
  SDPessoaMembroComunidTrad: SN;
  SDPessoaGrupoComunitario: SN;
  SDPessoaInforomaOrientSexual: SN;
  SDPessoaInformaIdentGenero: SN;
  SDPessoaFreqCurandeiro: SN;
  SDPessoaSituacaoRua: SN;
  SDPessoaTermoRecusa: SN;
  SDPessoaResponsavelFamilia: SN;
  SDPessoaProfMicroArea: string;
  SDPessoaForaArea: SN;
  SDPessoaUnidadeId: number;
  SDPessoaProfissionalId: number;
  SDPessoaSuscCBOId: string;
  SDPessoaTriaAlimentoAcabou: SN;
  SDPessoaTriaComeualimento: SN;
}

export interface DomicilioPayload {
  SDDomicilioGUID: string;
  SDDomicilioUnidadeId: number;
  SDDomicilioProfissionalId: number;
  SDDomicilioProfMicroArea: string;
  SDDomicilioTipoLogradouroId: number;
  SDDomicilioLogradouroId: number;
  SDDomicilioEnderecoNum: string;
  SDDomicilioSemNumero: SN;
  SDDomicilioEnderecoCompl: string;
  SDDomicilioBairroId: number;
  SDDomicilioMunicipioId: number;
  SDDomicilioCEP: string;
  SDDomicilioTelefone: string;
  SDDomicilioLocalizacao: string;
  SDDomicilioNuComodos: number;
  SDDomicilioNuMoradores: number;
  SDDomicilioSitMoradiaId: number;
  SDDomicilioEnergiaEletrica: SN;
  SDDomicilioOrigemEnergiaId: number;
  SDDomicilioTipoImovel: number;
  SDDomicilioTipoEndereco: number;
  SDDomicilioPossuiAnimais: SN;
  SDDomicilioTermoRecusa: SN;
  SDDomicilioLatitude: string;
  SDDomicilioLongitude: string;
  SDDomicilioForaArea: SN;
}

export interface AtendIndivPayload {
  SDAtendimentoIndivGUID: string;
  SDAtendimentoIndivUnidId: number;
  SDAtendimentoIndivProf1Id: number;
  SDAtendIndivProfCBO1Id: string;
  SDAtendimentoIndivData: string;
  SDAtendimentoIndivTurno: Turno;
  SDAtendimentoIndivUsuarioId: number;
  SDAtendIndivLocalAtendId: number;
  SDAtendimentoIndivTipoAtend: number;
  SDAtendimentoIndivCIAP1Id: string;
  SDAtendimentoIndivCIAP2Id: string;
  SDAtendimentoIndivCIDId: string;
  SDAtendimentoIndivHora: string;
  SDAtendimentoIndivDtHoraFinaliz: string;
  SDAtendIndivConsAgendada: SN;
  SDAtendIndivAltaEpisodio: SN;
  SDAtendIndivEncamServEspec: SN;
  SDAtendIndivEncamCaps: SN;
  SDAtendIndivEncamInternacao: SN;
  SDAtendIndivEncamUrgencia: SN;
  SDAtendIndivAtendUrgencia: SN;
  SDAtendIndivConsultaDia: SN;
  SDAtendIndivEscutaInicial: SN;
  SDAtendIndivAgendada: SN;
  SDAtendIndagendadaProg: SN;
}

export interface AtendOdontoPayload {
  SDAtendOdontGUID: string;
  SDAtendOdontUnidId: number;
  SDAtendOdontProf1Id: number;
  SDAtendOdontCBO1Id: string;
  SDAtendOdontData: string;
  SDAtendOdontTurno: Turno;
  SDAtendOdontUsuarioId: number;
  SDAtendOdontTipoConsulta: number;
  SDAtendOdontTipoAtend: number;
  SDAtendOdontGestante: SN;
  SDAtendOdontNecEsp: SN;
  SDAtendOdontLocalId: number;
  SDAtendOdontHora: string;
  SDAtendOdontDtHoraFinaliz: string;
}

export interface AtividadePayload {
  SDAtividadeColetivaGUID: string;
  SDAtividadeColetivaUnidId: number;
  SDAtivColResponsavelId: number;
  SDAtivColCBOResponsavelId: string;
  SDAtividadeColetivaData: string;
  SDAtividadeColetivaTurno: Turno;
  SDAtividadeColetivaAtividade: number;
  SDAtivColetivaNumPart: number;
  SDAtividadeColetivaPSESaude: SN;
  SDAtividadeColetivaPSEEduc: SN;
  SDAtividadeColetivaHoraIn: string;
  SDAtividadeColetivaHoraFin: string;
}
