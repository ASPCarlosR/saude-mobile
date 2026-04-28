import { Permissoes } from './types';

export const PERMISSION_DEFINITIONS = [
  { key: 'inicio', label: 'Inicio', description: 'Tela inicial e painel principal' },
  { key: 'sincronizacao', label: 'Sincronizacao', description: 'Envio e recebimento de dados' },
  { key: 'visita_domiciliar', label: 'Visita Domiciliar', description: 'Registro de visitas do ACS' },
  { key: 'cadastro_individual', label: 'Cadastro Individual', description: 'Cadastro e atualizacao de cidadaos' },
  { key: 'cadastro_domiciliar', label: 'Cadastro Domiciliar', description: 'Cadastro de domicilios e familias' },
  { key: 'atendimento_domiciliar', label: 'Atendimento Domiciliar', description: 'Atendimento em domicilio AD1, AD2 e AD3' },
  { key: 'atividade_coletiva', label: 'Atividade Coletiva', description: 'Grupos e acoes educativas' },
  { key: 'vacinacao', label: 'Vacinacao', description: 'Campanhas e registros de vacina' },
  { key: 'avaliacao_elegibilidade', label: 'Avaliacao de Elegibilidade', description: 'Elegibilidade para atencao domiciliar' },
  { key: 'marcador_consumo_alimentar', label: 'Marcador de Consumo Alimentar', description: 'Avaliacao alimentar e marcadores' },
  { key: 'transporte', label: 'Transporte', description: 'Viagens, pacientes e deslocamentos' },
  { key: 'agendamento', label: 'Agendamento', description: 'Consulta de vagas e agenda' },
  { key: 'indicadores', label: 'Indicadores APS', description: 'Indicadores e metas do territorio' },
  { key: 'relatorios', label: 'Relatorios', description: 'Consultas gerenciais e consolidacao' },
  { key: 'exportacao', label: 'Exportacao', description: 'Exportacao de dados e relatórios' },
  { key: 'atendimento_individual', label: 'Atendimento Individual', description: 'Fluxos de atendimento individual' },
  { key: 'painel_admin', label: 'Painel Admin', description: 'Acesso ao painel administrativo' },
] as const;

const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  inicio: ['inicio'],
  sincronizacao: ['sincronizacao', 'sync'],
  visita_domiciliar: ['visita_domiciliar', 'visita'],
  cadastro_individual: ['cadastro_individual', 'cadastroIndividual'],
  cadastro_domiciliar: ['cadastro_domiciliar', 'cadastroDomiciliar'],
  atendimento_domiciliar: ['atendimento_domiciliar'],
  atividade_coletiva: ['atividade_coletiva', 'atividadeColetiva'],
  vacinacao: ['vacinacao'],
  avaliacao_elegibilidade: ['avaliacao_elegibilidade'],
  marcador_consumo_alimentar: ['marcador_consumo_alimentar', 'marcadoresConsumo'],
  transporte: ['transporte'],
  agendamento: ['agendamento'],
  indicadores: ['indicadores'],
  relatorios: ['relatorios'],
  exportacao: ['exportacao', 'exportar'],
  atendimento_individual: ['atendimento_individual'],
  painel_admin: ['painel_admin', 'painelAdmin'],
};

export function buildDefaultPermissions(): Permissoes {
  return {
    inicio: true,
    sincronizacao: true,
    visita_domiciliar: true,
    cadastro_individual: true,
    cadastro_domiciliar: true,
    atendimento_domiciliar: true,
    atividade_coletiva: false,
    vacinacao: false,
    avaliacao_elegibilidade: false,
    marcador_consumo_alimentar: false,
    transporte: false,
    agendamento: false,
    indicadores: false,
    relatorios: false,
    exportacao: false,
    atendimento_individual: false,
    painel_admin: true,
  };
}

export function normalizePermissions(input?: Permissoes | null): Permissoes {
  const normalized = buildDefaultPermissions();

  for (const definition of PERMISSION_DEFINITIONS) {
    normalized[definition.key] = LEGACY_PERMISSION_ALIASES[definition.key].some(
      (alias) => Boolean(input?.[alias]),
    );
  }

  return normalized;
}
