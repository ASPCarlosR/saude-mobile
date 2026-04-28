import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 5,
  tables: [
    // ... outras tabelas ...
    tableSchema({
      name: 'visitas_domiciliares',
      columns: [
        { name: 'guid',                type: 'string',  isIndexed: true },
        { name: 'int_id',              type: 'number',  isOptional: true },
        { name: 'pessoa_guid',         type: 'string',  isIndexed: true },
        { name: 'profissional_id',     type: 'number',  isIndexed: true }, // ADICIONADO
        { name: 'paciente_nome',       type: 'string',  isOptional: true }, // ADICIONADO
        { name: 'sync_status',         type: 'string' },
        { name: 'data',                type: 'string' },
        { name: 'hora',                type: 'string',  isOptional: true },
        { name: 'turno',               type: 'string' },
        { name: 'micro_area',          type: 'string' },
        { name: 'desfecho',            type: 'number' },
        { name: 'peso',                type: 'number',  isOptional: true },
        { name: 'altura',              type: 'number',  isOptional: true },
        { name: 'pressao_sistolica',   type: 'number',  isOptional: true },
        { name: 'pressao_diastolica',  type: 'number',  isOptional: true },
        { name: 'glicemia',            type: 'number',  isOptional: true },
        { name: 'cad_atualiz',         type: 'boolean' },
        { name: 'consulta',            type: 'boolean' },
        { name: 'exame',               type: 'boolean' },
        { name: 'vacina',              type: 'boolean' },
        { name: 'gestante',            type: 'boolean' },
        { name: 'latitude',            type: 'string',  isOptional: true },
        { name: 'longitude',           type: 'string',  isOptional: true },
        { name: 'assinatura_base64',   type: 'string',  isOptional: true },
        { name: 'dados',               type: 'string',  isOptional: true },
      { name: 'created_at',          type: 'number' },
      { name: 'updated_at',          type: 'number' },
    ]
  }),
// ← bumpar sempre que alterar colunas

  tableSchema({
    name: 'pessoas',
      columns: [
        // ── Controle ────────────────────────────────────────────────────
        { name: 'guid',            type: 'string',  isIndexed: true },
        { name: 'int_id',          type: 'number',  isOptional: true },
        { name: 'sync_status',     type: 'string' },

        // ── Identificação ────────────────────────────────────────────────
        // CRÍTICO: nome = nome civil completo (sdpessoaprenome na tela web)
        // nome_social = nome social (sdpessoanom, só quando informa_nome_social = true)
        { name: 'nome',            type: 'string' },
        { name: 'nome_social',     type: 'string',  isOptional: true },
        { name: 'informa_nome_social', type: 'boolean' },
        { name: 'dt_nasc',         type: 'string' },
        { name: 'sexo',            type: 'string' },
        { name: 'cpf',             type: 'string',  isOptional: true, isIndexed: true },
        { name: 'cns',             type: 'string',  isOptional: true, isIndexed: true },
        { name: 'rg',              type: 'string',  isOptional: true },

        // ── Datas ────────────────────────────────────────────────────────
        { name: 'data_cadastro',     type: 'string', isOptional: true },
        { name: 'data_atualizacao',  type: 'string', isOptional: true },

        // ── Localização ──────────────────────────────────────────────────
        { name: 'micro_area',      type: 'string',  isOptional: true },
        { name: 'fora_area',       type: 'boolean' },

        // ── Filiação ─────────────────────────────────────────────────────
        { name: 'nome_mae',           type: 'string',  isOptional: true },
        { name: 'mae_desconhecida',   type: 'boolean' },
        { name: 'nome_pai',           type: 'string',  isOptional: true },
        { name: 'pai_desconhecido',   type: 'boolean' },

        // ── Dados pessoais ────────────────────────────────────────────────
        { name: 'estado_civil',    type: 'string',  isOptional: true },
        { name: 'raca_cor',        type: 'number',  isOptional: true },
        { name: 'nis_pis_pasep',   type: 'string',  isOptional: true },
        { name: 'etnia',           type: 'string',  isOptional: true },

        // ── Responsável familiar ──────────────────────────────────────────
        { name: 'responsavel_familia',    type: 'string',  isOptional: true },
        { name: 'responsavel_cartao_sus', type: 'string',  isOptional: true },
        { name: 'responsavel_id',         type: 'number',  isOptional: true },
        { name: 'parentesco',             type: 'number',  isOptional: true },

        // ── Nacionalidade ─────────────────────────────────────────────────
        { name: 'nacionalidade',   type: 'string',  isOptional: true },
        { name: 'pais_origem',     type: 'number',  isOptional: true },

        // ── Telefone ─────────────────────────────────────────────────────
        { name: 'ddd_cel',         type: 'number',  isOptional: true },
        { name: 'celular',         type: 'string',  isOptional: true },

        // ── Benefícios ───────────────────────────────────────────────────
        { name: 'usuario_bolsa_familia', type: 'boolean' },
        { name: 'usuario_bpc',           type: 'boolean' },
        { name: 'flutuante',             type: 'boolean' },

        // ── Sociodemográficos ────────────────────────────────────────────
        { name: 'freq_escola',       type: 'string',  isOptional: true },
        { name: 'cbo_id',            type: 'string',  isOptional: true },
        { name: 'escolaridade',      type: 'string',  isOptional: true },
        { name: 'analfabeto',        type: 'boolean' },
        { name: 'situacao_trabalho', type: 'number',  isOptional: true },

        // ── Crianças 0-9 anos ────────────────────────────────────────────
        { name: 'resp_crianca_adulto',      type: 'boolean' },
        { name: 'resp_crianca_outra',       type: 'boolean' },
        { name: 'resp_crianca_adolescente', type: 'boolean' },
        { name: 'resp_crianca_sozinha',     type: 'boolean' },
        { name: 'resp_crianca_creche',      type: 'boolean' },
        { name: 'resp_crianca_outro',       type: 'boolean' },

        // ── Comunidade / tradição ────────────────────────────────────────
        { name: 'freq_curandeiro',    type: 'string',  isOptional: true },
        { name: 'grupo_comunitario',  type: 'string',  isOptional: true },
        { name: 'membro_comunid_trad',type: 'string',  isOptional: true },
        { name: 'povo_comunidade',    type: 'number',  isOptional: true },

        // ── Orientação sexual / identidade de gênero ─────────────────────
        { name: 'informa_orient_sexual', type: 'string',  isOptional: true },
        { name: 'orientacao_sexual',     type: 'number',  isOptional: true },
        { name: 'informa_ident_genero',  type: 'string',  isOptional: true },
        { name: 'ident_genero',          type: 'number',  isOptional: true },

        // ── Deficiências ─────────────────────────────────────────────────
        { name: 'deficiencia',           type: 'string',  isOptional: true },
        { name: 'deficiencia_auditiva',  type: 'boolean' },
        { name: 'deficiencia_visual',    type: 'boolean' },
        { name: 'deficiencia_fisica',    type: 'boolean' },
        { name: 'deficiencia_intelec',   type: 'boolean' },
        { name: 'deficiencia_outra',     type: 'boolean' },
        { name: 'autismo',               type: 'boolean' },
        { name: 'autismo_niveis',        type: 'number',  isOptional: true },
        { name: 'mobilidade_reduzida',   type: 'string',  isOptional: true },
        { name: 'doador_sangue',         type: 'string',  isOptional: true },

        // ── Saída do cadastro ────────────────────────────────────────────
        { name: 'saida_mudanca',      type: 'boolean' },
        { name: 'saida_obito',        type: 'boolean' },
        { name: 'inativo',            type: 'number',  isOptional: true },
        { name: 'data_inativacao',    type: 'string',  isOptional: true },
        { name: 'saida_obito_data',   type: 'string',  isOptional: true },
        { name: 'saida_numero_do',    type: 'string',  isOptional: true },
        { name: 'obito_local',        type: 'number',  isOptional: true },

        // ── Condições de saúde ────────────────────────────────────────────
        { name: 'gestante',              type: 'boolean' },
        { name: 'maternidade_ref',       type: 'string',  isOptional: true },
        { name: 'peso',                  type: 'number',  isOptional: true }, // 21=abaixo/22=adequado/23=acima
        { name: 'fumante',               type: 'string',  isOptional: true },
        { name: 'hipertensao',           type: 'boolean' },
        { name: 'hipertensao_risco',     type: 'number',  isOptional: true },
        { name: 'diabetes',              type: 'boolean' },
        { name: 'diabetes_risco',        type: 'number',  isOptional: true },
        { name: 'insulino_dependente',   type: 'string',  isOptional: true },
        { name: 'tipo_diabetes',         type: 'number',  isOptional: true },
        { name: 'acamado',               type: 'boolean' },
        { name: 'domiciliado',           type: 'boolean' },
        { name: 'dific_cicatrizacao',    type: 'string',  isOptional: true },
        { name: 'hanseniase',            type: 'string',  isOptional: true },
        { name: 'tuberculose',           type: 'string',  isOptional: true },
        { name: 'cancer',                type: 'string',  isOptional: true },
        { name: 'cancer_mes',            type: 'number',  isOptional: true },
        { name: 'cancer_ano',            type: 'number',  isOptional: true },
        { name: 'avc_derrame',           type: 'string',  isOptional: true },
        { name: 'internacao',            type: 'string',  isOptional: true },
        { name: 'internacao_causa',      type: 'string',  isOptional: true },
        { name: 'colesterol_alto',       type: 'string',  isOptional: true },
        { name: 'infarto',               type: 'string',  isOptional: true },
        { name: 'doenca_cardiaca',       type: 'string',  isOptional: true },
        { name: 'doenca_cardiaca_insuf', type: 'boolean' },
        { name: 'doenca_cardiaca_outro', type: 'boolean' },
        { name: 'doenca_cardiaca_nsabe', type: 'boolean' },
        { name: 'doenca_coracao_familia',type: 'string',  isOptional: true },
        { name: 'trat_psiquiatra',       type: 'string',  isOptional: true },
        { name: 'doenca_rins',           type: 'string',  isOptional: true },
        { name: 'doenca_rins_insulf',    type: 'boolean' },
        { name: 'doenca_rins_outro',     type: 'boolean' },
        { name: 'doenca_rins_nsabe',     type: 'boolean' },
        { name: 'doenca_resp',           type: 'string',  isOptional: true },
        { name: 'doenca_resp_asma',      type: 'boolean' },
        { name: 'doenca_resp_dpoc',      type: 'boolean' },
        { name: 'doenca_resp_outro',     type: 'boolean' },
        { name: 'doenca_resp_nsabe',     type: 'boolean' },
        { name: 'dependente_alcool',     type: 'string',  isOptional: true },
        { name: 'dependente_droga',      type: 'string',  isOptional: true },
        { name: 'outras_praticas',       type: 'string',  isOptional: true },
        { name: 'plantas_medicinais',    type: 'string',  isOptional: true },
        { name: 'plantas_medicinais_desc',type: 'string', isOptional: true },
        { name: 'outras_cond_saude1',    type: 'string',  isOptional: true },
        { name: 'outras_cond_saude2',    type: 'string',  isOptional: true },
        { name: 'outras_cond_saude3',    type: 'string',  isOptional: true },
        { name: 'sofreu_queda',          type: 'string',  isOptional: true },

        // ── Triagem alimentar (TRIA) ──────────────────────────────────────
        { name: 'tria_alimento_acabou',  type: 'string',  isOptional: true },
        { name: 'tria_comeu_alimento',   type: 'string',  isOptional: true },

        // ── Situação de rua ───────────────────────────────────────────────
        { name: 'situacao_rua',           type: 'string',  isOptional: true },
        { name: 'acomp_outra_instit',     type: 'string',  isOptional: true },
        { name: 'acomp_outra_inst_desc',  type: 'string',  isOptional: true },
        { name: 'tempo_situacao_rua',     type: 'number',  isOptional: true },
        { name: 'recebe_beneficio',       type: 'string',  isOptional: true },
        { name: 'visita_familiar_freq',   type: 'string',  isOptional: true },
        { name: 'referencia_familiar',    type: 'string',  isOptional: true },
        { name: 'grau_parentesco_desc',   type: 'string',  isOptional: true },
        { name: 'alimenta',               type: 'number',  isOptional: true },
        { name: 'alimenta_rest_popular',  type: 'boolean' },
        { name: 'alimenta_doac_restaur',  type: 'boolean' },
        { name: 'alimenta_outro',         type: 'boolean' },
        { name: 'alimenta_doac_religioso',type: 'boolean' },
        { name: 'alimenta_doac_popular',  type: 'boolean' },
        { name: 'hig_pessoal',            type: 'string',  isOptional: true },
        { name: 'hig_banho',              type: 'boolean' },
        { name: 'hig_sanit',              type: 'boolean' },
        { name: 'hig_bucal',              type: 'boolean' },
        { name: 'hig_outro',              type: 'boolean' },

        // ── Outros ───────────────────────────────────────────────────────
        { name: 'convenio',       type: 'string',  isOptional: true },
        { name: 'termo_recusa',   type: 'boolean' },
        { name: 'observacao',     type: 'string',  isOptional: true },

        { name: 'created_at',     type: 'number' },
        { name: 'updated_at',     type: 'number' },
      ]
    }),

    // ── Domicílios (sem alterações) ──────────────────────────────────────
    tableSchema({
      name: 'domicilios',
      columns: [
        { name: 'guid',             type: 'string',  isIndexed: true },
        { name: 'int_id',           type: 'number',  isOptional: true },
        { name: 'sync_status',      type: 'string' },
        { name: 'data_cadastro',    type: 'string',  isOptional: true },
        { name: 'data_atualizacao', type: 'string',  isOptional: true },
        { name: 'situacao',         type: 'string',  isOptional: true },
        { name: 'micro_area',       type: 'string',  isOptional: true },
        { name: 'fora_area',        type: 'boolean' },
        { name: 'latitude',         type: 'string',  isOptional: true },
        { name: 'longitude',        type: 'string',  isOptional: true },
        { name: 'municipio',        type: 'string',  isOptional: true },
        { name: 'logradouro_nome',  type: 'string',  isOptional: true },
        { name: 'numero',           type: 'string',  isOptional: true },
        { name: 'sem_numero',       type: 'boolean' },
        { name: 'complemento',      type: 'string',  isOptional: true },
        { name: 'ponto_referencia', type: 'string',  isOptional: true },
        { name: 'quarteirao',       type: 'string',  isOptional: true },
        { name: 'tipo_imovel',      type: 'number',  isOptional: true },
        { name: 'ddd_resid',        type: 'number',  isOptional: true },
        { name: 'fone_resid',       type: 'string',  isOptional: true },
        { name: 'ddd_contato',      type: 'number',  isOptional: true },
        { name: 'fone_contato',     type: 'string',  isOptional: true },
        { name: 'situacao_moradia', type: 'number',  isOptional: true },
        { name: 'localizacao',      type: 'number',  isOptional: true },
        { name: 'tipo_domicilio',   type: 'number',  isOptional: true },
        { name: 'moradores',        type: 'number',  isOptional: true },
        { name: 'comodos',          type: 'number',  isOptional: true },
        { name: 'area_rural',       type: 'number',  isOptional: true },
        { name: 'tipo_acesso',      type: 'number',  isOptional: true },
        { name: 'material_paredes', type: 'number',  isOptional: true },
        { name: 'energia_eletrica', type: 'string',  isOptional: true },
        { name: 'abastecimento_agua', type: 'number', isOptional: true },
        { name: 'agua_consumo',     type: 'number',  isOptional: true },
        { name: 'escoamento',       type: 'number',  isOptional: true },
        { name: 'destino_lixo',     type: 'number',  isOptional: true },
        { name: 'possui_animais',   type: 'string',  isOptional: true },
        { name: 'animal_gato',      type: 'boolean' },
        { name: 'animal_cachorro',  type: 'boolean' },
        { name: 'animal_passaro',   type: 'boolean' },
        { name: 'animal_macaco',    type: 'boolean' },
        { name: 'animal_galinha',   type: 'boolean' },
        { name: 'animal_porco',     type: 'boolean' },
        { name: 'animal_repteis',   type: 'boolean' },
        { name: 'animal_outros',    type: 'boolean' },
        { name: 'animais_qtde',     type: 'number',  isOptional: true },
        { name: 'instituicao_nome', type: 'string',  isOptional: true },
        { name: 'instit_outro_prof',type: 'string',  isOptional: true },
        { name: 'risco_familiar',   type: 'string',  isOptional: true },
        { name: 'termo_recusa',     type: 'boolean' },
        { name: 'observacao',       type: 'string',  isOptional: true },
        { name: 'dados',            type: 'string',  isOptional: true },
        { name: 'created_at',       type: 'number' },
        { name: 'updated_at',       type: 'number' },
        {name:'unidade_nome',       type: 'string',  isOptional: true },
        {name:'unidade_cnes',       type: 'string',  isOptional: true },
        {name:'unidade_id',         type: 'number',  isOptional: true },
        {name:'equipe_id',          type: 'number',  isOptional: true },
        {name:'equipe_nome',        type: 'string',  isOptional: true },
        {name:'profissional_id',    type: 'number',  isOptional: true },
        {name:'profissional_nome',  type: 'string',  isOptional: true },

      ]
    }),

    // ── Visitas domiciliares (sem alterações) ────────────────────────────
    tableSchema({
      name: 'visitas_domiciliares',
      columns: [
        { name: 'guid',               type: 'string',  isIndexed: true },
        { name: 'int_id',             type: 'number',  isOptional: true },
        { name: 'pessoa_guid',        type: 'string',  isIndexed: true },
        { name: 'sync_status',        type: 'string' },
        { name: 'data',               type: 'string' },
        { name: 'hora',               type: 'string',  isOptional: true },
        { name: 'turno',              type: 'string' },
        { name: 'micro_area',         type: 'string' },
        { name: 'desfecho',           type: 'number' },
        { name: 'peso',               type: 'number',  isOptional: true },
        { name: 'altura',             type: 'number',  isOptional: true },
        { name: 'pressao_sistolica',  type: 'number',  isOptional: true },
        { name: 'pressao_diastolica', type: 'number',  isOptional: true },
        { name: 'glicemia',           type: 'number',  isOptional: true },
        { name: 'cad_atualiz',        type: 'boolean' },
        { name: 'consulta',           type: 'boolean' },
        { name: 'exame',              type: 'boolean' },
        { name: 'vacina',             type: 'boolean' },
        { name: 'gestante',           type: 'boolean' },
        { name: 'latitude',           type: 'string',  isOptional: true },
        { name: 'longitude',          type: 'string',  isOptional: true },
        { name: 'assinatura_base64',  type: 'string',  isOptional: true },
        { name: 'dados',              type: 'string',  isOptional: true },
        { name: 'created_at',         type: 'number' },
        { name: 'updated_at',         type: 'number' },
      ]
    }),

    tableSchema({
      name: 'atividades_coletivas',
      columns: [
        { name: 'guid',              type: 'string',  isIndexed: true },
        { name: 'int_id',            type: 'number',  isOptional: true },
        { name: 'sync_status',       type: 'string' },
        { name: 'data',              type: 'string' },
        { name: 'turno',             type: 'string' },
        { name: 'local',             type: 'string' },
        { name: 'num_participantes', type: 'number' },
        { name: 'atividade_tipo',    type: 'number' },
        { name: 'dados',             type: 'string',  isOptional: true },
        { name: 'created_at',        type: 'number' },
        { name: 'updated_at',        type: 'number' },
      ]
    }),

    tableSchema({
      name: 'atendimentos_individuais',
      columns: [
        { name: 'guid',               type: 'string',  isIndexed: true },
        { name: 'int_id',             type: 'number',  isOptional: true },
        { name: 'sync_status',        type: 'string' },
        { name: 'data',               type: 'string' },
        { name: 'paciente_nome',      type: 'string' },
        { name: 'profissional_nome',  type: 'string' },
        { name: 'status',             type: 'string' },
        { name: 'dados',              type: 'string',  isOptional: true },
        { name: 'created_at',         type: 'number' },
        { name: 'updated_at',         type: 'number' },
      ]
    }),

    tableSchema({
      name: 'atendimentos_domiciliares',
      columns: [
        { name: 'guid',              type: 'string',  isIndexed: true },
        { name: 'int_id',            type: 'number',  isOptional: true },
        { name: 'sync_status',       type: 'string' },
        { name: 'data',              type: 'string' },
        { name: 'paciente_nome',     type: 'string' },
        { name: 'modalidade',        type: 'string' },
        { name: 'status',            type: 'string' },
        { name: 'dados',             type: 'string',  isOptional: true },
        { name: 'created_at',        type: 'number' },
        { name: 'updated_at',        type: 'number' },
      ]
    }),
    tableSchema({
      name: 'avaliacoes_elegibilidade',
      columns: [
        { name: 'guid',              type: 'string',  isIndexed: true },
        { name: 'int_id',            type: 'number',  isOptional: true },
        { name: 'sync_status',       type: 'string' },
        { name: 'data',              type: 'string' },
        { name: 'paciente_nome',     type: 'string' },
        { name: 'status',            type: 'string' },
        { name: 'dados',             type: 'string',  isOptional: true },
        { name: 'created_at',        type: 'number' },
        { name: 'updated_at',        type: 'number' },
      ]
    }),
    tableSchema({
      name: 'marcadores_consumo',
      columns: [
        { name: 'guid',              type: 'string',  isIndexed: true },
        { name: 'int_id',            type: 'number',  isOptional: true },
        { name: 'sync_status',       type: 'string' },
        { name: 'data',              type: 'string' },
        { name: 'paciente_nome',     type: 'string' },
        { name: 'status',            type: 'string' },
        { name: 'dados',             type: 'string',  isOptional: true },
        { name: 'created_at',        type: 'number' },
        { name: 'updated_at',        type: 'number' },
      ]
    }),
    tableSchema({
      name: 'vacinas',
      columns: [
        { name: 'guid',              type: 'string',  isIndexed: true },
        { name: 'int_id',            type: 'number',  isOptional: true },
        { name: 'sync_status',       type: 'string' },
        { name: 'data',              type: 'string' },
        { name: 'paciente_nome',     type: 'string' },
        { name: 'status',            type: 'string' },
        { name: 'dados',             type: 'string',  isOptional: true },
        { name: 'created_at',        type: 'number' },
        { name: 'updated_at',        type: 'number' },
      ]
    }),
    tableSchema({
  name: 'viagens',
  columns: [
    { name: 'viagem_id', type: 'number' },
    { name: 'data', type: 'string' },
    { name: 'codigo', type: 'string' },
    { name: 'destino', type: 'string' },
    { name: 'veiculo', type: 'string', isOptional: true },
    { name: 'motorista', type: 'string', isOptional: true },
    { name: 'status', type: 'string' },
    { name: 'observacao', type: 'string', isOptional: true },
    { name: 'pacientes', type: 'string', isOptional: true },
    { name: 'sync_status', type: 'string' },
  ]
})
  ]
});