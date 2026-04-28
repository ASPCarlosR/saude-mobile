-- ============================================================
-- MIGRAÇÃO FINAL — App e-SUS Mobile
-- Zero impacto no sistema Genexus existente
-- Apenas adições (ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- 1. Controle de sync mobile nas tabelas principais
-- ---------------------------------------------------
ALTER TABLE sdpessoa
  ADD COLUMN IF NOT EXISTS sdpessoa_app_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdpessoa_app_device_id   VARCHAR(64);

ALTER TABLE sddomicilio
  ADD COLUMN IF NOT EXISTS sddomicilio_app_synced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sddomicilio_app_device_id  VARCHAR(64);

ALTER TABLE sdvisitadomiciliar
  ADD COLUMN IF NOT EXISTS sdvisita_app_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdvisita_app_device_id   VARCHAR(64);

ALTER TABLE sdatendimentoindiv
  ADD COLUMN IF NOT EXISTS sdatendindiv_app_synced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdatendindiv_app_device_id  VARCHAR(64);

ALTER TABLE sdatendodont
  ADD COLUMN IF NOT EXISTS sdatendodont_app_synced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdatendodont_app_device_id  VARCHAR(64);

ALTER TABLE sdatividadecoletiva
  ADD COLUMN IF NOT EXISTS sdativcolet_app_synced_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdativcolet_app_device_id  VARCHAR(64);


-- 2. Campos novos em mbsincronizacao
--    (identificam sessões vindas do novo app)
-- ---------------------------------------------------
ALTER TABLE mbsincronizacao
  ADD COLUMN IF NOT EXISTS mbsincronizacao_device_id  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS mbsincronizacao_app_versao VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mbsincronizacao_origem     BPCHAR(1) DEFAULT 'W';
  -- W = Web/Genexus (existente), M = Mobile novo app


-- 3. Campos novos em mbsincronizacaoregistros
--    (payload JSON e GUID para o novo app)
--    O campo CSV original (mbsincronizacaoregistrodados) é mantido intocado
-- ---------------------------------------------------
ALTER TABLE mbsincronizacaoregistros
  ADD COLUMN IF NOT EXISTS mbsincronizacaoregistros_json  JSONB,
  ADD COLUMN IF NOT EXISTS mbsincronizacaoregistro_guid   VARCHAR(44);

CREATE INDEX IF NOT EXISTS idx_sincreg_guid
  ON mbsincronizacaoregistros (mbsincronizacaoregistro_guid)
  WHERE mbsincronizacaoregistro_guid IS NOT NULL;


-- 4. Tabela de dispositivos registrados
--    (nova, completamente invisível ao Genexus)
-- ---------------------------------------------------
CREATE TABLE IF NOT EXISTS sd_app_device (
  device_id             VARCHAR(64)   PRIMARY KEY,
  profissional_id       INT4          NOT NULL
                        REFERENCES sdprofissional(sdprofissionalid),
  nome_dispositivo      VARCHAR(100),
  sistema_operacional   VARCHAR(20),
  versao_app            VARCHAR(20),
  ultimo_sync_at        TIMESTAMPTZ,
  ativo                 BOOLEAN       DEFAULT true,
  created_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_device_prof
  ON sd_app_device (profissional_id);


-- 5. Índices de performance para queries do app
-- ---------------------------------------------------

-- Busca de carteira do profissional por microárea (tela de indicadores)
CREATE INDEX IF NOT EXISTS idx_sdpessoa_microarea_unid
  ON sdpessoa (sdpessoaprofmicroarea, sdpessoaunidadeid)
  WHERE sdpessoaprofmicroarea IS NOT NULL;

-- Busca de condições de saúde por profissional (indicadores APS)
CREATE INDEX IF NOT EXISTS idx_sdpessoa_indicadores
  ON sdpessoa (
    sdpessoaprofissionalid,
    sdpessoahipertensaoarterial,
    sdpessoadiabetes,
    sdpessoagestante
  )
  WHERE sdpessoainativo = 0;

-- Busca de visitas por profissional e data (indicadores + listagem)
CREATE INDEX IF NOT EXISTS idx_visita_profdata
  ON sdvisitadomiciliar (
    sdvisitadomiciliarprofid,
    sdvisitadomiciliardata
  );

-- Busca de pessoas por GUID (resolução offline→online)
CREATE INDEX IF NOT EXISTS idx_sdpessoa_guid_app
  ON sdpessoa (sdpessoaguid)
  WHERE sdpessoaguid IS NOT NULL;

-- Busca de visitas por GUID do usuário (cálculo de indicadores)
CREATE INDEX IF NOT EXISTS idx_visita_usuarioguid
  ON sdvisitadomiciliar (sdvisitadomiciliarguid)
  WHERE sdvisitadomiciliarguid IS NOT NULL;


-- ============================================================
-- QUERY DE VALIDAÇÃO — rode após a migração para confirmar
-- ============================================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%_app_synced_at'
    OR column_name LIKE 'mbsincronizacao_%'
    OR column_name LIKE 'mbsincronizacaoregistros_%'
    OR table_name = 'sd_app_device'
  )
ORDER BY table_name, column_name;
