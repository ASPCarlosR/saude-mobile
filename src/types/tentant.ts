export interface TenantResumo {
  id: number;
  nome: string;
  slug: string;
}

export interface TenantPermissoes {
  inicio?: boolean;
  sincronizacao?: boolean;
  sync?: boolean;
  relatorios?: boolean;
  exportacao?: boolean;
  exportar?: boolean;
  visita_domiciliar?: boolean;
  visita?: boolean;
  cadastro_individual?: boolean;
  cadastroIndividual?: boolean;
  cadastro_domiciliar?: boolean;
  cadastroDomiciliar?: boolean;
  atendimento_domiciliar?: boolean;
  atividade_coletiva?: boolean;
  atividadeColetiva?: boolean;
  vacinacao?: boolean;
  avaliacao_elegibilidade?: boolean;
  marcador_consumo_alimentar?: boolean;
  marcadoresConsumo?: boolean;
  transporte?: boolean;
  agendamento?: boolean;
  indicadores?: boolean;
  atendimento_individual?: boolean;
  painel_admin?: boolean;
  painelAdmin?: boolean;
  [key: string]: boolean | undefined;
}

export interface TenantConfigPublica {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
  app_port: number;
  api_base_url: string | null;
  permissoes: TenantPermissoes;
}
