import { limparGUID, TURNO_PARA_ESUS, boolParaSN, dateParaTimestampMs } from '@utils/conversoes';
import type { VisitaPayload } from '@types/index';

interface EnvelopeConfig {
  uuid: string;
  tipoDado: number;
  codIbge: string;
  cnes: string;
  numLote: number;
  uuidInstalacao: string;
  cpfOuCnpj: string;
  nomeOuRazaoSocial: string;
  fone: string;
  email: string;
}

// ---- Envelope padrão e-SUS --------------------------------
function gerarEnvelope(cfg: EnvelopeConfig, conteudo: string): string {
  const remetente = `
    <ns2:remetente xmlns="">
      <contraChave>SOFTWARE DE TECEIROS</contraChave>
      <uuidInstalacao>${cfg.uuidInstalacao}</uuidInstalacao>
      <cpfOuCnpj>${cfg.cpfOuCnpj}</cpfOuCnpj>
      <nomeOuRazaoSocial>${cfg.nomeOuRazaoSocial}</nomeOuRazaoSocial>
      <fone>${cfg.fone}</fone>
      <email>${cfg.email}</email>
    </ns2:remetente>`;

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<ns3:dadoTransporteTransportXml
  xmlns:ns2="http://esus.ufsc.br/dadoinstalacao"
  xmlns:ns3="http://esus.ufsc.br/dadotransporte"
  xmlns:ns4="http://esus.ufsc.br/fichavisitadomiciliarmaster">
  <uuidDadoSerializado xmlns="">${limparGUID(cfg.uuid)}</uuidDadoSerializado>
  <tipoDadoSerializado xmlns="">${cfg.tipoDado}</tipoDadoSerializado>
  <codIbge xmlns="">${cfg.codIbge}</codIbge>
  <cnesDadoSerializado xmlns="">${cfg.cnes}</cnesDadoSerializado>
  <numLote xmlns="">${cfg.numLote}</numLote>
  ${conteudo}
  ${remetente}
  ${remetente.replace('remetente', 'originadora')}
  <versao major="7" minor="3" revision="7"/>
</ns3:dadoTransporteTransportXml>`;
}

// ---- Visita Domiciliar (tipo 8) ---------------------------
export interface VisitaXMLInput {
  uuidFicha: string;          // uuid da ficha master
  profissionalCNS: string;
  cboCodigo: string;
  cnes: string;
  ine: string;
  dataAtendimento: string;    // YYYY-MM-DD
  codigoIbge: string;
  visitas: VisitaPayload[];   // um por morador
  // Envelope
  numLote: number;
  uuidInstalacao: string;
  cpfOuCnpj: string;
  nomeOuRazaoSocial: string;
  fone: string;
  email: string;
}

export function gerarXMLVisitaDomiciliar(input: VisitaXMLInput): string {
  const dataAtendMs = dateParaTimestampMs(input.dataAtendimento);

  const visitasXML = input.visitas.map(v => {
    const dtNascMs = v.SDVisitaDomiciliarUsuarioId
      ? '' // virá do banco pelo usuarioGuid
      : '0';

    return `
      <visitasDomiciliares>
        <turno>${TURNO_PARA_ESUS[v.SDVisitaDomiciliarTurno]}</turno>
        <numProntuario>${v.SDVisitaDomiciliarUsuarioId}</numProntuario>
        <sexo>1</sexo>
        <statusVisitaCompartilhadaOutroProfissional>${
          v.SDVisitaDomiciliarVisitaCompar === 'S' ? 'true' : 'false'
        }</statusVisitaCompartilhadaOutroProfissional>
        ${gerarMotivosXML(v)}
        <desfecho>${v.SDVisitaDomiciliarDesfecho}</desfecho>
        <microArea>${v.SDVisitaDomiciliarMicroarea}</microArea>
        <stForaArea>${v.SDVisitaDomiciliarForaArea === 'S' ? 'true' : 'false'}</stForaArea>
        <tipoDeImovel>${v.SDVisitaDomiciliarTipoImovel}</tipoDeImovel>
        <latitude>${v.SDVisitaDomiciliarLatitude ?? '0.00000'}</latitude>
        <longitude>${v.SDVisitaDomiciliarLongitude ?? '0.00000'}</longitude>
      </visitasDomiciliares>`;
  }).join('');

  const conteudo = `
  <ns4:fichaVisitaDomiciliarMasterTransport xmlns="">
    <uuidFicha>${limparGUID(input.uuidFicha)}</uuidFicha>
    <tpCdsOrigem>3</tpCdsOrigem>
    <headerTransport>
      <profissionalCNS>${input.profissionalCNS}</profissionalCNS>
      <cboCodigo_2002>${input.cboCodigo}</cboCodigo_2002>
      <cnes>${input.cnes}</cnes>
      <ine>${input.ine}</ine>
      <dataAtendimento>${dataAtendMs}</dataAtendimento>
      <codigoIbgeMunicipio>${input.codigoIbge}</codigoIbgeMunicipio>
    </headerTransport>
    ${visitasXML}
  </ns4:fichaVisitaDomiciliarMasterTransport>`;

  return gerarEnvelope({
    uuid:               input.uuidFicha,
    tipoDado:           8,
    codIbge:            input.codigoIbge,
    cnes:               input.cnes,
    numLote:            input.numLote,
    uuidInstalacao:     input.uuidInstalacao,
    cpfOuCnpj:          input.cpfOuCnpj,
    nomeOuRazaoSocial:  input.nomeOuRazaoSocial,
    fone:               input.fone,
    email:              input.email,
  }, conteudo);
}

// ---- Mapeamento motivos → tags XML e-SUS ------------------
// Códigos conforme dicionário de dados THDS e-SUS CDS
const MOTIVOS_ESUS: Array<{ campo: keyof VisitaPayload; codigo: number }> = [
  { campo: 'SDVisitaDomiciliarCadAtualiz',   codigo: 4  },
  { campo: 'SDVisitaDomiciliarPeriodica',    codigo: 5  },
  { campo: 'SDVisitaDomiciliarConsulta',     codigo: 6  },
  { campo: 'SDVisitaDomiciliarExame',        codigo: 7  },
  { campo: 'SDVisitaDomiciliarVacina',       codigo: 8  },
  { campo: 'SDVisitaDomiciliarPuerpera',     codigo: 11 },
  { campo: 'SDVisitaDomiciliarGestante',     codigo: 12 },
  { campo: 'SDVisitaDomiciliarRecemNasc',    codigo: 13 },
  { campo: 'SDVisitaDomiciliarCrianca',      codigo: 14 },
  { campo: 'SDVisitaDomiciliarDesnutricao',  codigo: 15 },
  { campo: 'SDVisitaDomiciliarReabilitacao', codigo: 16 },
  { campo: 'SDVisitaDomiciliarHipertensao',  codigo: 17 },
  { campo: 'SDVisitaDomiciliarDiabetes',     codigo: 18 },
  { campo: 'SDVisitaDomiciliarAsma',         codigo: 19 },
  { campo: 'SDVisitaDomiciliarDPOC',         codigo: 20 },
  { campo: 'SDVisitaDomiciliarCancer',       codigo: 21 },
  { campo: 'SDVisitaDomiciliarCronicas',     codigo: 22 },
  { campo: 'SDVisitaDomiciliarHanseniase',   codigo: 23 },
  { campo: 'SDVisitaDomiciliarTuberculose',  codigo: 24 },
  { campo: 'SDVisitaDomiciliarTabagista',    codigo: 25 },
  { campo: 'SDVisitaDomiciliarAcamados',     codigo: 26 },
  { campo: 'SDVisitaDomiciliarVulnerSocial', codigo: 27 },
  { campo: 'SDVisitaDomiciliarAcomBolsaFam', codigo: 28 },
  { campo: 'SDVisitaDomiciliarSaudeMental',  codigo: 29 },
  { campo: 'SDVisitaDomiciliarUsuarAlcool',  codigo: 30 },
  { campo: 'SDVisitaDomiciliarOutrasDrogas', codigo: 31 },
  { campo: 'SDVisitaDomiciliarEgressoInt',   codigo: 32 },
  { campo: 'SDVisitaDomiciliarControleAmb',  codigo: 10 },
  { campo: 'SDVisitaDomiciliarConviteAtiv',  codigo: 33 },
  { campo: 'SDVisitaDomiciliarOrientacao',   codigo: 22 },
  { campo: 'SDVisitaDomiciliarOutros',       codigo: 34 },
  { campo: 'SDVisitaDomiciliarAcaoEduc',     codigo: 35 },
  { campo: 'SDVisitaDomiciliarImovelFoco',   codigo: 36 },
  { campo: 'SDVisitaDomiciliarAcaoMec',      codigo: 37 },
  { campo: 'SDVisitaDomiciliarTratFocal',    codigo: 38 },
];

function gerarMotivosXML(v: VisitaPayload): string {
  return MOTIVOS_ESUS
    .filter(m => (v[m.campo] as string)?.trim() === 'S')
    .map(m => `<motivosVisita xmlns="">${m.codigo}</motivosVisita>`)
    .join('\n        ');
}
