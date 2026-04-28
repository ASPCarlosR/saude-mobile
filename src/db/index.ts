import { Database, Model, SyncStatus } from '@nozbe/watermelondb';
import { field, text, relation } from '@nozbe/watermelondb/decorators';
import schema from './schema';
import migrations from './migrations';
import { NativeModules } from 'react-native';

import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

// ── Adapter: detecta Expo Go vs Dev Build ────────────────────────────────────
let adapter: any;

if (NativeModules.DatabaseBridge) {
  // Módulo nativo encontrado (Dev Build / EAS)
  adapter = new SQLiteAdapter({
    schema,
    migrations,
    onSetUpError: (error: any) => {
      console.error('[WatermelonDB] Erro ao inicializar SQLite:', error);
    },
  });
  console.log('[WatermelonDB] ✓ SQLiteAdapter (Dev Build)');

} else {
  // Fallback: LokiJS não precisa de módulo nativo (Expo Go)
  adapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    onSetUpError: (error: any) => {
      console.error('[WatermelonDB] Erro ao inicializar LokiJS:', error);
    },
  });
  console.warn(
    '[WatermelonDB] ⚠ LokiJSAdapter (Expo Go detectado).\n' +
    'Dados NÃO persistem entre sessões neste modo.\n' +
    'Para persistência real: npx expo prebuild && npx expo run:android'
  );
}

// ── Models ────────────────────────────────────────────────────────────────────

// ... (Mantenha todos os seus outros Models intactos aqui: Pessoa, Domicilio, VisitaDomiciliar, etc) ...
export class Pessoa extends Model {
  static table = 'pessoas';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('nome') nome!: string;
  @text('nome_social') nomeSocial!: string;
  @field('informa_nome_social') informaNomeSocial!: boolean;
  @text('dt_nasc') dtNasc!: string;
  @text('sexo') sexo!: string;
  @text('cpf') cpf!: string;
  @text('cns') cns!: string;
  @text('rg') rg!: string;
  @text('data_cadastro') dataCadastro!: string;
  @text('data_atualizacao') dataAtualizacao!: string;
  @text('micro_area') microArea!: string;
  @field('fora_area') foraArea!: boolean;
  @text('nome_mae') nomeMae!: string;
  @field('mae_desconhecida') maeDesconhecida!: boolean;
  @text('nome_pai') nomePai!: string;
  @field('pai_desconhecido') paiDesconhecido!: boolean;
  @text('estado_civil') estadoCivil!: string;
  @field('raca_cor') racaCor!: number;
  @text('nis_pis_pasep') nisPisPasep!: string;
  @text('etnia') etnia!: string;
  @text('responsavel_familia') responsavelFamilia!: string;
  @text('responsavel_cartao_sus') responsavelCarataoSUS!: string;
  @field('responsavel_id') responsavelId!: number;
  @field('parentesco') parentesco!: number;
  @text('nacionalidade') nacionalidade!: string;
  @field('pais_origem') paisOrigem!: number;
  @field('ddd_cel') dddCel!: number;
  @text('celular') celular!: string;
  @field('usuario_bolsa_familia') usuarioBolsaFamilia!: boolean;
  @field('usuario_bpc') usuarioBPC!: boolean;
  @field('flutuante') flutuante!: boolean;
  @text('freq_escola') freqEscola!: string;
  @text('cbo_id') cboId!: string;
  @text('escolaridade') escolaridade!: string;
  @field('analfabeto') analfabeto!: boolean;
  @field('situacao_trabalho') situacaoTrabalho!: number;
  @field('resp_crianca_adulto') respCriancaAdulto!: boolean;
  @field('resp_crianca_outra') respCriancaOutra!: boolean;
  @field('resp_crianca_adolescente') respCriancaAdolescente!: boolean;
  @field('resp_crianca_sozinha') respCriancaSozinha!: boolean;
  @field('resp_crianca_creche') respCriancaCreche!: boolean;
  @field('resp_crianca_outro') respCriancaOutro!: boolean;
  @text('freq_curandeiro') freqCurandeiro!: string;
  @text('grupo_comunitario') grupoComunitario!: string;
  @text('membro_comunid_trad') membroComunidTrad!: string;
  @field('povo_comunidade') povoComunidade!: number;
  @text('informa_orient_sexual') informaOrientSexual!: string;
  @field('orientacao_sexual') orientacaoSexual!: number;
  @text('informa_ident_genero') informaIdentGenero!: string;
  @field('ident_genero') identGenero!: number;
  @text('deficiencia') deficiencia!: string;
  @field('deficiencia_auditiva') deficienciaAuditiva!: boolean;
  @field('deficiencia_visual') deficienciaVisual!: boolean;
  @field('deficiencia_fisica') deficienciaFisica!: boolean;
  @field('deficiencia_intelec') deficienciaIntelec!: boolean;
  @field('deficiencia_outra') deficienciaOutra!: boolean;
  @field('autismo') autismo!: boolean;
  @field('autismo_niveis') autismoNiveis!: number;
  @text('mobilidade_reduzida') mobilidadeReduzida!: string;
  @text('doador_sangue') doadorSangue!: string;
  @field('saida_mudanca') saidaMudanca!: boolean;
  @field('saida_obito') saidaObito!: boolean;
  @field('inativo') inativo!: number;
  @text('data_inativacao') dataInativacao!: string;
  @text('saida_obito_data') saidaObitoData!: string;
  @text('saida_numero_do') saidaNumeroDO!: string;
  @field('obito_local') obitoLocal!: number;
  @field('gestante') gestante!: boolean;
  @text('maternidade_ref') maternidadeRef!: string;
  @field('peso') peso!: number;
  @text('fumante') fumante!: string;
  @field('hipertensao') hipertensao!: boolean;
  @field('hipertensao_risco') hipertensaoRisco!: number;
  @field('diabetes') diabetes!: boolean;
  @field('diabetes_risco') diabetesRisco!: number;
  @text('insulino_dependente') insulinoDependente!: string;
  @field('tipo_diabetes') tipoDiabetes!: number;
  @field('acamado') acamado!: boolean;
  @field('domiciliado') domiciliado!: boolean;
  @text('dific_cicatrizacao') dificCicatrizacao!: string;
  @text('hanseniase') hanseniase!: string;
  @text('tuberculose') tuberculose!: string;
  @text('cancer') cancer!: string;
  @field('cancer_mes') cancerMes!: number;
  @field('cancer_ano') cancerAno!: number;
  @text('avc_derrame') avcDerrame!: string;
  @text('internacao') internacao!: string;
  @text('internacao_causa') internacaoCausa!: string;
  @text('colesterol_alto') colesterolAlto!: string;
  @text('infarto') infarto!: string;
  @text('doenca_cardiaca') doencaCardiaca!: string;
  @field('doenca_cardiaca_insuf') doencaCardiacaInsuf!: boolean;
  @field('doenca_cardiaca_outro') doencaCardiacaOutro!: boolean;
  @field('doenca_cardiaca_nsabe') doencaCardiacaNSabe!: boolean;
  @text('doenca_coracao_familia') doencaCoracaoFamilia!: string;
  @text('trat_psiquiatra') tratPsiquiatra!: string;
  @text('doenca_rins') doencaRins!: string;
  @field('doenca_rins_insulf') doencaRinsInsulf!: boolean;
  @field('doenca_rins_outro') doencaRinsOutro!: boolean;
  @field('doenca_rins_nsabe') doencaRinsNSabe!: boolean;
  @text('doenca_resp') doencaResp!: string;
  @field('doenca_resp_asma') doencaRespAsma!: boolean;
  @field('doenca_resp_dpoc') doencaRespDPOC!: boolean;
  @field('doenca_resp_outro') doencaRespOutro!: boolean;
  @field('doenca_resp_nsabe') doencaRespNSabe!: boolean;
  @text('dependente_alcool') dependenteAlcool!: string;
  @text('dependente_droga') dependenteDroga!: string;
  @text('outras_praticas') outrasPraticas!: string;
  @text('plantas_medicinais') plantasMedicinais!: string;
  @text('plantas_medicinais_desc') plantasMedicinaisDesc!: string;
  @text('outras_cond_saude1') outrasCondSaude1!: string;
  @text('outras_cond_saude2') outrasCondSaude2!: string;
  @text('outras_cond_saude3') outrasCondSaude3!: string;
  @text('sofreu_queda') sofreuQueda!: string;
  @text('tria_alimento_acabou') triaAlimentoAcabou!: string;
  @text('tria_comeu_alimento') triaComeuAlimento!: string;
  @text('situacao_rua') situacaoRua!: string;
  @text('acomp_outra_instit') acompOutraInstit!: string;
  @text('acomp_outra_inst_desc') acompOutraInstDesc!: string;
  @field('tempo_situacao_rua') tempoSituacaoRua!: number;
  @text('recebe_beneficio') recebeBeneficio!: string;
  @text('visita_familiar_freq') visitaFamiliarFreq!: string;
  @text('referencia_familiar') referenciaFamiliar!: string;
  @text('grau_parentesco_desc') grauParentescoDesc!: string;
  @field('alimenta') alimenta!: number;
  @field('alimenta_rest_popular') alimentaRestPopular!: boolean;
  @field('alimenta_doac_restaur') alimentaDoacRestaur!: boolean;
  @field('alimenta_outro') alimentaOutro!: boolean;
  @field('alimenta_doac_religioso') alimentaDoacReligioso!: boolean;
  @field('alimenta_doac_popular') alimentaDoacPopular!: boolean;
  @text('hig_pessoal') higPessoal!: string;
  @field('hig_banho') higBanho!: boolean;
  @field('hig_sanit') higSanit!: boolean;
  @field('hig_bucal') higBucal!: boolean;
  @field('hig_outro') higOutro!: boolean;
  @text('convenio') convenio!: string;
  @field('termo_recusa') termoRecusa!: boolean;
  @text('observacao') observacao!: string;
}

export class Domicilio extends Model {
  static table = 'domicilios';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data_cadastro') dataCadastro!: string;
  @text('data_atualizacao') dataAtualizacao!: string;
  @text('situacao') situacao!: string;
  @text('micro_area') microArea!: string;
  @field('fora_area') foraArea!: boolean;
  @text('latitude') latitude!: string;
  @text('longitude') longitude!: string;
  @text('municipio') municipio!: string;
  @text('logradouro_nome') endereco!: string;
  @text('numero') numero!: string;
  @field('sem_numero') semNumero!: boolean;
  @text('complemento') complemento!: string;
  @text('ponto_referencia') pontoReferencia!: string;
  @text('quarteirao') quarteirao!: string;
  @field('tipo_imovel') tipoImovel!: number;
  @field('ddd_resid') dddResid!: number;
  @text('fone_resid') foneResid!: string;
  @field('ddd_contato') dddContato!: number;
  @text('fone_contato') foneContato!: string;
  @field('situacao_moradia') sitMoradia!: number;
  @field('localizacao') localizacao!: number;
  @field('tipo_domicilio') tipoDomicilio!: number;
  @field('moradores') moradores!: number;
  @field('comodos') comodos!: number;
  @field('area_rural') areaRural!: number;
  @field('tipo_acesso') tipoAcesso!: number;
  @field('material_paredes') materialParedes!: number;
  @text('energia_eletrica') energiaEletrica!: string;
  @field('abastecimento_agua') abastecimentoAgua!: number;
  @field('agua_consumo') aguaConsumo!: number;
  @field('escoamento') escoamento!: number;
  @field('destino_lixo') destinoLixo!: number;
  @text('possui_animais') possuiAnimais!: string;
  @field('animal_gato') animalGato!: boolean;
  @field('animal_cachorro') animalCachorro!: boolean;
  @field('animal_passaro') animalPassaro!: boolean;
  @field('animal_macaco') animalMacaco!: boolean;
  @field('animal_galinha') animalGalinha!: boolean;
  @field('animal_porco') animalPorco!: boolean;
  @field('animal_repteis') animalRepteis!: boolean;
  @field('animal_outros') animalOutros!: boolean;
  @field('animais_qtde') animaisQtde!: number;
  @text('instituicao_nome') instituicaoNome!: string;
  @text('instit_outro_prof') institOutroProf!: string;
  @text('risco_familiar') riscoFamiliar!: string;
  @field('termo_recusa') termoRecusa!: boolean;
  @text('observacao') observacao!: string;
  @text('dados') dados!: string;
  @text('profissional_nome') profissionalNome!: string;

  // Campos de vínculo (conforme schema)
  @text('unidade_nome') unidadeNome!: string;
  @text('unidade_cnes') cnes!: string;
  @field('unidade_id') unidadeId!: number;
  @field('equipe_id') equipeId!: number;
  @text('equipe_nome') equipeNome!: string;
  @field('profissional_id') profissionalId!: number;

}

export class VisitaDomiciliar extends Model {
  static table = 'visitas_domiciliares';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('hora') hora!: string;
  @text('turno') turno!: string;
  @text('micro_area') microArea!: string;
  @field('desfecho') desfecho!: number;
  @field('peso') peso!: number;
  @field('altura') altura!: number;
  @field('consulta') consulta!: boolean;
  @field('cad_atualiz') cadAtualiz!: boolean;
  @field('vacina') vacina!: boolean;
  @field('gestante') gestante!: boolean;
  @text('latitude') latitude!: string;
  @text('longitude') longitude!: string;
  @text('assinatura_base64') assinaturaBase64!: string;
  @text('pessoa_guid') pessoaGuid!: string;
  @relation('pessoas', 'pessoa_guid') pessoa!: any;
  @text('dados') dados!: string;
}

export class AtividadeColetiva extends Model {
  static table = 'atividades_coletivas';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('local') local!: string;
  @text('turno') turno!: string;
  @field('num_participantes') numParticipantes!: number;
  @field('atividade_tipo') atividadeTipo!: number;
  @text('dados') dados!: string;
}

export class AtendimentoIndividual extends Model {
  static table = 'atendimentos_individuais';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('paciente_nome') pacienteNome!: string;
  @text('profissional_nome') profissionalNome!: string;
  @text('status') status!: string;
  @text('dados') dados!: string;
}

export class AtendimentoDomiciliar extends Model {
  static table = 'atendimentos_domiciliares';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('paciente_nome') pacienteNome!: string;
  @text('modalidade') modalidade!: string;
  @text('status') status!: string;
  @text('dados') dados!: string;
}

export class AvaliacaoElegibilidade extends Model {
  static table = 'avaliacoes_elegibilidade';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('paciente_nome') pacienteNome!: string;
  @text('status') status!: string;
  @text('dados') dados!: string;
}

export class MarcadorConsumo extends Model {
  static table = 'marcadores_consumo';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('paciente_nome') pacienteNome!: string;
  @text('status') status!: string;
  @text('dados') dados!: string;
}

export class Vacina extends Model {
  static table = 'vacinas';
  @text('guid') guid!: string;
  @field('int_id') intId!: number;
  @text('sync_status') syncStatus!: SyncStatus;
  @text('data') data!: string;
  @text('paciente_nome') pacienteNome!: string;
  @text('status') status!: string;
  @text('dados') dados!: string;
}

// === NOVO MODEL DA VIAGEM ===
export class Viagem extends Model {
  static table = 'viagens';

  @field('viagem_id') viagem_id!: number;
  @text('data') data!: string;
  @text('codigo') codigo!: string;
  @text('destino') destino!: string;
  @text('veiculo') veiculo!: string;
  @text('motorista') motorista!: string;
  @text('status') status!: string;
  @text('observacao') observacao!: string;
  @text('pacientes') pacientes!: string;
  @text('sync_status') sync_status!: SyncStatus;
}


// ── Instância do banco ────────────────────────────────────────────────────────
export const database = new Database({
  adapter,
  modelClasses: [
    Pessoa,
    Domicilio,
    VisitaDomiciliar,
    AtividadeColetiva,
    AtendimentoIndividual,
    AtendimentoDomiciliar,
    AvaliacaoElegibilidade,
    MarcadorConsumo,
    Vacina,
    Viagem, // <--- ADICIONADO AQUI
  ],
});

// ── Collections ───────────────────────────────────────────────────────────────
export const pessoaCollection = database.get<Pessoa>('pessoas');
export const domicilioCollection = database.get<Domicilio>('domicilios');
export const visitaCollection = database.get<VisitaDomiciliar>('visitas_domiciliares');
export const atividadeCollection = database.get<AtividadeColetiva>('atividades_coletivas');
export const atendimentoIndivCollection = database.get<AtendimentoIndividual>('atendimentos_individuais');
export const atendimentoDomCollection = database.get<AtendimentoDomiciliar>('atendimentos_domiciliares');
export const elegibilidadeCollection = database.get<AvaliacaoElegibilidade>('avaliacoes_elegibilidade');
export const consumoAlimentarCollection = database.get<MarcadorConsumo>('marcadores_consumo');
export const vacinaCollection = database.get<Vacina>('vacinas');
export const viagemCollection = database.get<Viagem>('viagens'); // <--- ADICIONADO AQUI