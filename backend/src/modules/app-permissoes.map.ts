export type AppModuloPermissao =
  | 'cadastro_individual'
  | 'cadastro_domiciliar'
  | 'visita_domiciliar'
  | 'atendimento_domiciliar'
  | 'atividade_coletiva'
  | 'avaliacao_elegibilidade'
  | 'marcador_consumo_alimentar'
  | 'transporte'
  | 'agendamento';

export type AppPermissaoPrograma = {
  aspmenuid: number;
  aspmenuprogramaid: number;
};

export const APP_PERMISSOES_MAP: Record<
  AppModuloPermissao,
  {
    label: string;
    programas: AppPermissaoPrograma[];
  }
> = {
  cadastro_individual: {
    label: 'Cadastro Individual',
    programas: [
      { aspmenuid: 110091, aspmenuprogramaid: 1 },
      { aspmenuid: 110091, aspmenuprogramaid: 2 },
      { aspmenuid: 110091, aspmenuprogramaid: 3 },
    ],
  },

  cadastro_domiciliar: {
    label: 'Cadastro Domiciliar',
    programas: [
      { aspmenuid: 110381, aspmenuprogramaid: 1 },
      { aspmenuid: 110381, aspmenuprogramaid: 2 },
      { aspmenuid: 110381, aspmenuprogramaid: 3 },
    ],
  },

  visita_domiciliar: {
    label: 'Visita Domiciliar',
    programas: [
      { aspmenuid: 110395, aspmenuprogramaid: 1 },
      { aspmenuid: 110395, aspmenuprogramaid: 2 },
    ],
  },

  atendimento_domiciliar: {
    label: 'Atendimento Domiciliar',
    programas: [
      { aspmenuid: 110444, aspmenuprogramaid: 1 },
      { aspmenuid: 110444, aspmenuprogramaid: 2 },
    ],
  },

  atividade_coletiva: {
    label: 'Atividade Coletiva',
    programas: [
      { aspmenuid: 110396, aspmenuprogramaid: 1 },
      { aspmenuid: 110396, aspmenuprogramaid: 2 },
      { aspmenuid: 110396, aspmenuprogramaid: 3 },
      { aspmenuid: 110396, aspmenuprogramaid: 4 },
      { aspmenuid: 110465, aspmenuprogramaid: 1 },
      { aspmenuid: 110465, aspmenuprogramaid: 2 },
      { aspmenuid: 110465, aspmenuprogramaid: 3 },
      { aspmenuid: 110465, aspmenuprogramaid: 4 },
    ],
  },

  avaliacao_elegibilidade: {
    label: 'Avaliação de Elegibilidade',
    programas: [
      { aspmenuid: 110441, aspmenuprogramaid: 1 },
      { aspmenuid: 110441, aspmenuprogramaid: 2 },
    ],
  },

  marcador_consumo_alimentar: {
    label: 'Marcador de Consumo Alimentar',
    programas: [
      { aspmenuid: 110440, aspmenuprogramaid: 1 },
      { aspmenuid: 110440, aspmenuprogramaid: 3 },
    ],
  },

  transporte: {
    label: 'Transporte / Viagem',
    programas: [
      { aspmenuid: 110204, aspmenuprogramaid: 1 },
      { aspmenuid: 110204, aspmenuprogramaid: 2 },
      { aspmenuid: 110204, aspmenuprogramaid: 3 },
      { aspmenuid: 110204, aspmenuprogramaid: 4 },
      { aspmenuid: 110204, aspmenuprogramaid: 5 },
      { aspmenuid: 110204, aspmenuprogramaid: 11 },
      { aspmenuid: 110204, aspmenuprogramaid: 12 },
    ],
  },

  agendamento: {
    label: 'Agenda',
    programas: [
      { aspmenuid: 110146, aspmenuprogramaid: 1 },
      { aspmenuid: 110146, aspmenuprogramaid: 3 },
      { aspmenuid: 110146, aspmenuprogramaid: 4 },
    ],
  },
};