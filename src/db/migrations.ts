import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export default schemaMigrations({
  migrations: [
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'visitas_domiciliares',
          columns: [
            { name: 'profissional_id', type: 'number', isIndexed: true },
            { name: 'paciente_nome',   type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 4, // <-- NOVA VERSÃO
      steps: [
        addColumns({
          table: 'domicilios',
          columns: [
            { name: 'logradouro_nome', type: 'string', isOptional: true },
            { name: 'municipio',       type: 'string', isOptional: true },
            { name: 'unidade_nome',    type: 'string', isOptional: true },
            { name: 'cnes',            type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({ table: 'domicilios', columns: [{ name: 'dados', type: 'string', isOptional: true }] }),
        addColumns({ table: 'visitas_domiciliares', columns: [{ name: 'dados', type: 'string', isOptional: true }] }),
        addColumns({ table: 'atividades_coletivas', columns: [{ name: 'dados', type: 'string', isOptional: true }] }),
        addColumns({ table: 'atendimentos_individuais', columns: [{ name: 'dados', type: 'string', isOptional: true }] }),
        addColumns({ table: 'atendimentos_domiciliares', columns: [{ name: 'dados', type: 'string', isOptional: true }] }),
        createTable({
          name: 'avaliacoes_elegibilidade',
          columns: [
            { name: 'guid', type: 'string', isIndexed: true }, { name: 'int_id', type: 'number', isOptional: true },
            { name: 'sync_status', type: 'string' }, { name: 'data', type: 'string' }, { name: 'paciente_nome', type: 'string' },
            { name: 'status', type: 'string' }, { name: 'dados', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' }, { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'marcadores_consumo',
          columns: [
            { name: 'guid', type: 'string', isIndexed: true }, { name: 'int_id', type: 'number', isOptional: true },
            { name: 'sync_status', type: 'string' }, { name: 'data', type: 'string' }, { name: 'paciente_nome', type: 'string' },
            { name: 'status', type: 'string' }, { name: 'dados', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' }, { name: 'updated_at', type: 'number' },
          ]
        }),
        createTable({
          name: 'vacinas',
          columns: [
            { name: 'guid', type: 'string', isIndexed: true }, { name: 'int_id', type: 'number', isOptional: true },
            { name: 'sync_status', type: 'string' }, { name: 'data', type: 'string' }, { name: 'paciente_nome', type: 'string' },
            { name: 'status', type: 'string' }, { name: 'dados', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' }, { name: 'updated_at', type: 'number' },
          ]
        }),
      ]
    },
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'pessoas',
          columns: [
            // ── Identificação ────────────────────────────────────────────
            { name: 'nome_social',          type: 'string',  isOptional: true },
            { name: 'informa_nome_social',  type: 'boolean' },
            { name: 'rg',                   type: 'string',  isOptional: true },

            // ── Localização ──────────────────────────────────────────────
            { name: 'fora_area',            type: 'boolean' },

            // ── Filiação ─────────────────────────────────────────────────
            { name: 'mae_desconhecida',     type: 'boolean' },
            { name: 'pai_desconhecido',     type: 'boolean' },

            // ── Dados pessoais ───────────────────────────────────────────
            { name: 'raca_cor',             type: 'number',  isOptional: true },
            { name: 'nis_pis_pasep',        type: 'string',  isOptional: true },
            { name: 'etnia',                type: 'string',  isOptional: true },

            // ── Responsável familiar ─────────────────────────────────────
            { name: 'responsavel_familia',    type: 'string',  isOptional: true },
            { name: 'responsavel_cartao_sus', type: 'string',  isOptional: true },
            { name: 'responsavel_id',         type: 'number',  isOptional: true },
            { name: 'parentesco',             type: 'number',  isOptional: true },

            // ── Nacionalidade ────────────────────────────────────────────
            { name: 'nacionalidade',        type: 'string',  isOptional: true },
            { name: 'pais_origem',          type: 'number',  isOptional: true },

            // ── Telefone ────────────────────────────────────────────────
            { name: 'ddd_cel',              type: 'number',  isOptional: true },
            { name: 'celular',              type: 'string',  isOptional: true },

            // ── Benefícios ───────────────────────────────────────────────
            { name: 'usuario_bolsa_familia', type: 'boolean' },
            { name: 'usuario_bpc',           type: 'boolean' },
            { name: 'flutuante',             type: 'boolean' },

            // ── Sociodemográficos ────────────────────────────────────────
            { name: 'freq_escola',           type: 'string',  isOptional: true },
            { name: 'cbo_id',                type: 'string',  isOptional: true },
            { name: 'escolaridade',          type: 'string',  isOptional: true },
            { name: 'analfabeto',            type: 'boolean' },
            { name: 'situacao_trabalho',     type: 'number',  isOptional: true },

            // ── Crianças 0-9 anos ────────────────────────────────────────
            { name: 'resp_crianca_adulto',      type: 'boolean' },
            { name: 'resp_crianca_outra',       type: 'boolean' },
            { name: 'resp_crianca_adolescente', type: 'boolean' },
            { name: 'resp_crianca_sozinha',     type: 'boolean' },
            { name: 'resp_crianca_creche',      type: 'boolean' },
            { name: 'resp_crianca_outro',       type: 'boolean' },

            // ── Comunidade ───────────────────────────────────────────────
            { name: 'freq_curandeiro',     type: 'string',  isOptional: true },
            { name: 'grupo_comunitario',   type: 'string',  isOptional: true },
            { name: 'membro_comunid_trad', type: 'string',  isOptional: true },
            { name: 'povo_comunidade',     type: 'number',  isOptional: true },

            // ── Orientação / gênero ──────────────────────────────────────
            { name: 'informa_orient_sexual', type: 'string',  isOptional: true },
            { name: 'orientacao_sexual',     type: 'number',  isOptional: true },
            { name: 'informa_ident_genero',  type: 'string',  isOptional: true },
            { name: 'ident_genero',          type: 'number',  isOptional: true },

            // ── Deficiências ─────────────────────────────────────────────
            { name: 'deficiencia',            type: 'string',  isOptional: true },
            { name: 'deficiencia_auditiva',   type: 'boolean' },
            { name: 'deficiencia_visual',     type: 'boolean' },
            { name: 'deficiencia_fisica',     type: 'boolean' },
            { name: 'deficiencia_intelec',    type: 'boolean' },
            { name: 'deficiencia_outra',      type: 'boolean' },
            { name: 'autismo',                type: 'boolean' },
            { name: 'autismo_niveis',         type: 'number',  isOptional: true },
            { name: 'mobilidade_reduzida',    type: 'string',  isOptional: true },
            { name: 'doador_sangue',          type: 'string',  isOptional: true },

            // ── Saída do cadastro ────────────────────────────────────────
            { name: 'saida_mudanca',     type: 'boolean' },
            { name: 'saida_obito',       type: 'boolean' },
            { name: 'inativo',           type: 'number',  isOptional: true },
            { name: 'data_inativacao',   type: 'string',  isOptional: true },
            { name: 'saida_obito_data',  type: 'string',  isOptional: true },
            { name: 'saida_numero_do',   type: 'string',  isOptional: true },
            { name: 'obito_local',       type: 'number',  isOptional: true },

            // ── Condições de saúde ───────────────────────────────────────
            { name: 'maternidade_ref',        type: 'string',  isOptional: true },
            { name: 'peso',                   type: 'number',  isOptional: true },
            { name: 'fumante',                type: 'string',  isOptional: true },
            { name: 'hipertensao_risco',      type: 'number',  isOptional: true },
            { name: 'diabetes_risco',         type: 'number',  isOptional: true },
            { name: 'insulino_dependente',    type: 'string',  isOptional: true },
            { name: 'tipo_diabetes',          type: 'number',  isOptional: true },
            { name: 'dific_cicatrizacao',     type: 'string',  isOptional: true },
            { name: 'hanseniase',             type: 'string',  isOptional: true },
            { name: 'tuberculose',            type: 'string',  isOptional: true },
            { name: 'cancer',                 type: 'string',  isOptional: true },
            { name: 'cancer_mes',             type: 'number',  isOptional: true },
            { name: 'cancer_ano',             type: 'number',  isOptional: true },
            { name: 'avc_derrame',            type: 'string',  isOptional: true },
            { name: 'internacao',             type: 'string',  isOptional: true },
            { name: 'internacao_causa',       type: 'string',  isOptional: true },
            { name: 'colesterol_alto',        type: 'string',  isOptional: true },
            { name: 'infarto',                type: 'string',  isOptional: true },
            { name: 'doenca_cardiaca',        type: 'string',  isOptional: true },
            { name: 'doenca_cardiaca_insuf',  type: 'boolean' },
            { name: 'doenca_cardiaca_outro',  type: 'boolean' },
            { name: 'doenca_cardiaca_nsabe',  type: 'boolean' },
            { name: 'doenca_coracao_familia', type: 'string',  isOptional: true },
            { name: 'trat_psiquiatra',        type: 'string',  isOptional: true },
            { name: 'doenca_rins',            type: 'string',  isOptional: true },
            { name: 'doenca_rins_insulf',     type: 'boolean' },
            { name: 'doenca_rins_outro',      type: 'boolean' },
            { name: 'doenca_rins_nsabe',      type: 'boolean' },
            { name: 'doenca_resp',            type: 'string',  isOptional: true },
            { name: 'doenca_resp_asma',       type: 'boolean' },
            { name: 'doenca_resp_dpoc',       type: 'boolean' },
            { name: 'doenca_resp_outro',      type: 'boolean' },
            { name: 'doenca_resp_nsabe',      type: 'boolean' },
            { name: 'dependente_alcool',      type: 'string',  isOptional: true },
            { name: 'dependente_droga',       type: 'string',  isOptional: true },
            { name: 'outras_praticas',        type: 'string',  isOptional: true },
            { name: 'plantas_medicinais',     type: 'string',  isOptional: true },
            { name: 'plantas_medicinais_desc',type: 'string',  isOptional: true },
            { name: 'outras_cond_saude1',     type: 'string',  isOptional: true },
            { name: 'outras_cond_saude2',     type: 'string',  isOptional: true },
            { name: 'outras_cond_saude3',     type: 'string',  isOptional: true },
            { name: 'sofreu_queda',           type: 'string',  isOptional: true },

            // ── TRIA ─────────────────────────────────────────────────────
            { name: 'tria_alimento_acabou',   type: 'string',  isOptional: true },
            { name: 'tria_comeu_alimento',    type: 'string',  isOptional: true },

            // ── Situação de rua ──────────────────────────────────────────
            { name: 'situacao_rua',            type: 'string',  isOptional: true },
            { name: 'acomp_outra_instit',      type: 'string',  isOptional: true },
            { name: 'acomp_outra_inst_desc',   type: 'string',  isOptional: true },
            { name: 'tempo_situacao_rua',      type: 'number',  isOptional: true },
            { name: 'recebe_beneficio',        type: 'string',  isOptional: true },
            { name: 'visita_familiar_freq',    type: 'string',  isOptional: true },
            { name: 'referencia_familiar',     type: 'string',  isOptional: true },
            { name: 'grau_parentesco_desc',    type: 'string',  isOptional: true },
            { name: 'alimenta',                type: 'number',  isOptional: true },
            { name: 'alimenta_rest_popular',   type: 'boolean' },
            { name: 'alimenta_doac_restaur',   type: 'boolean' },
            { name: 'alimenta_outro',          type: 'boolean' },
            { name: 'alimenta_doac_religioso', type: 'boolean' },
            { name: 'alimenta_doac_popular',   type: 'boolean' },
            { name: 'hig_pessoal',             type: 'string',  isOptional: true },
            { name: 'hig_banho',               type: 'boolean' },
            { name: 'hig_sanit',               type: 'boolean' },
            { name: 'hig_bucal',               type: 'boolean' },
            { name: 'hig_outro',               type: 'boolean' },

            // ── Outros ───────────────────────────────────────────────────
            { name: 'convenio',     type: 'string',  isOptional: true },
            { name: 'termo_recusa', type: 'boolean' },
            { name: 'observacao',   type: 'string',  isOptional: true },
          ]
        })
      ]
    }
  ]
});