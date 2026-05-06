import 'react-native-get-random-values';
import React, { useState, useRef, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import * as Location from 'expo-location';

import { useAuthStore } from '../../src/store/index';
import { database, visitaCollection, pessoaCollection } from '../../src/db/index';
import { calcularIdadeTexto, calcularCondicoesMorador, type CondicoesMorador } from '../../src/utils/condicoesMorador';
import { Colors } from './colors';
import { API_BASE_URL } from '@/config';

// ---- Interfaces ----
interface FormVisita {
  data: string;
  hora: string;
  turno: 'M' | 'T' | 'N';
  tipoImovel: number;
  microArea: string;
  foraArea: boolean;
  visitaCompartilhada: boolean;

  cadAtualiz: boolean;
  periodica: boolean;

  consulta: boolean;
  exame: boolean;
  vacina: boolean;
  ativBolsaFam: boolean;

  gestante: boolean;
  puerpera: boolean;
  recemNasc: boolean;
  crianca: boolean;
  desnutricao: boolean;
  reabilitacao: boolean;
  hipertensao: boolean;
  diabetes: boolean;
  asma: boolean;
  dpoc: boolean;
  cancer: boolean;
  cronicas: boolean;
  hanseniase: boolean;
  tuberculose: boolean;
  sintResp: boolean;
  tabagista: boolean;
  acamados: boolean;
  vulnerSocial: boolean;
  acomBolsaFam: boolean;
  saudeMental: boolean;
  usuarAlcool: boolean;
  outrasDrogas: boolean;
  pessoaIdosa: boolean;

  acaoEduc: boolean;
  imovelFoco: boolean;
  acaoMec: boolean;
  tratFocal: boolean;

  egressoInt: boolean;
  conviteAtiv: boolean;
  orientacao: boolean;
  outros: boolean;

  peso: string;
  altura: string;
  temperatura: string;
  pressaoSistolica: string;
  pressaoDiastolica: string;
  glicemia: string;
  tipoGlicemia: '0' | '1' | '2' | '3';

  gestanteDum: string;
  gravidezPlanejada: boolean;
  qtdGestacoes: string;
  idadeGestacional: string;
  qtdCesarias: string;
  qtdPartosNormais: string;
  gestasPrevia: string;
  qtdAbortos: string;
  partos: string;

  obs: string;
  assinaturaBase64?: string;
}

interface EstadoMorador {
  id: string;
  guid: string;
  nome: string;
  cns?: string;
  idade: string;
  condicoes: CondicoesMorador;
}

interface MoradorRecebidoParam {
  id: string;
  guid?: string;
  nome: string;
  cns?: string;
  cpf?: string;
  dataNascimento?: string;
  dtnasc?: string;
  dtNasc?: string;
  ehResponsavel?: boolean;
}

type SimNao = 'S' | 'N';
type ClassificacaoEvfam = 'B' | 'M' | 'A';

interface FormEvfam {
  realizado: boolean;
  pessoaId: string;
  suspeitaViolencia: SimNao;
  motivo: string;
  dificFinanc: SimNao;
  faltaDinheiro: SimNao;
  dificAlimento: SimNao;
  medicamento: SimNao;
  variosMedic: SimNao;
  cuidadoContinuo: SimNao;
  dificAtividade: SimNao;
  ajudaSaude: SimNao;
  maeAusente: SimNao;
  paiAusente: SimNao;
  abandonoFamilia: SimNao;
  pessoaViolenta: SimNao;
  vitimaViolencia: SimNao;
  violencia: SimNao;
  pontuacao: number;
  classificacao: ClassificacaoEvfam;
}

const EVFAM_INICIAL: FormEvfam = {
  realizado: false,
  pessoaId: '',
  suspeitaViolencia: 'N',
  motivo: '1',
  dificFinanc: 'N',
  faltaDinheiro: 'N',
  dificAlimento: 'N',
  medicamento: 'N',
  variosMedic: 'N',
  cuidadoContinuo: 'N',
  dificAtividade: 'N',
  ajudaSaude: 'N',
  maeAusente: 'N',
  paiAusente: 'N',
  abandonoFamilia: 'N',
  pessoaViolenta: 'N',
  vitimaViolencia: 'N',
  violencia: 'N',
  pontuacao: 0,
  classificacao: 'B',
};

const CAMPOS_PONTUACAO_EVFAM: (keyof FormEvfam)[] = [
  'suspeitaViolencia',
  'dificFinanc',
  'faltaDinheiro',
  'dificAlimento',
  'medicamento',
  'variosMedic',
  'cuidadoContinuo',
  'dificAtividade',
  'ajudaSaude',
  'maeAusente',
  'paiAusente',
  'abandonoFamilia',
  'pessoaViolenta',
  'vitimaViolencia',
  'violencia',
];

const LABELS_EVFAM: Record<string, string> = {
  suspeitaViolencia: 'Suspeita de violência',
  dificFinanc: 'Dificuldade financeira',
  faltaDinheiro: 'Falta dinheiro para necessidades básicas',
  dificAlimento: 'Dificuldade de acesso a alimento',
  medicamento: 'Dificuldade com medicamentos',
  variosMedic: 'Uso de vários medicamentos',
  cuidadoContinuo: 'Precisa de cuidado contínuo',
  dificAtividade: 'Dificuldade nas atividades diárias',
  ajudaSaude: 'Necessita de ajuda para cuidado em saúde',
  maeAusente: 'Mãe ausente',
  paiAusente: 'Pai ausente',
  abandonoFamilia: 'Abandono familiar',
  pessoaViolenta: 'Pessoa violenta no domicílio',
  vitimaViolencia: 'Vítima de violência',
  violencia: 'Violência confirmada/relatada',
};

function calcularPontuacaoEvfam(evfam: FormEvfam) {
  return CAMPOS_PONTUACAO_EVFAM.reduce((total, campo) => {
    return total + (evfam[campo] === 'S' ? 1 : 0);
  }, 0);
}

function calcularClassificacaoEvfam(pontuacao: number): ClassificacaoEvfam {
  if (pontuacao >= 8) return 'A';
  if (pontuacao >= 4) return 'M';
  return 'B';
}

function textoClassificacaoEvfam(classificacao: ClassificacaoEvfam) {
  if (classificacao === 'A') return 'Alta vulnerabilidade';
  if (classificacao === 'M') return 'Média vulnerabilidade';
  return 'Baixa vulnerabilidade';
}

type CampoCondicaoVisita =
  | 'gestante'
  | 'puerpera'
  | 'recemNasc'
  | 'crianca'
  | 'desnutricao'
  | 'reabilitacao'
  | 'hipertensao'
  | 'diabetes'
  | 'asma'
  | 'dpoc'
  | 'cancer'
  | 'cronicas'
  | 'hanseniase'
  | 'tuberculose'
  | 'sintResp'
  | 'tabagista'
  | 'acamados'
  | 'vulnerSocial'
  | 'acomBolsaFam'
  | 'saudeMental'
  | 'usuarAlcool'
  | 'outrasDrogas'
  | 'pessoaIdosa';

const CAMPOS_CONDICAO_VISITA: CampoCondicaoVisita[] = [
  'gestante',
  'puerpera',
  'recemNasc',
  'crianca',
  'desnutricao',
  'reabilitacao',
  'hipertensao',
  'diabetes',
  'asma',
  'dpoc',
  'cancer',
  'cronicas',
  'hanseniase',
  'tuberculose',
  'sintResp',
  'tabagista',
  'acamados',
  'vulnerSocial',
  'acomBolsaFam',
  'saudeMental',
  'usuarAlcool',
  'outrasDrogas',
  'pessoaIdosa',
];

function condicoesParaForm(condicoes?: Partial<Record<CampoCondicaoVisita, boolean>>): Record<CampoCondicaoVisita, boolean> {
  return CAMPOS_CONDICAO_VISITA.reduce((acc, campo) => {
    acc[campo] = !!condicoes?.[campo];
    return acc;
  }, {} as Record<CampoCondicaoVisita, boolean>);
}

function montarDadosParaCalculoCondicoes(pessoa: any = {}, fallback: any = {}) {
  const dataNascimento =
    pessoa?.dtNasc ||
    pessoa?.dtnasc ||
    pessoa?.dataNascimento ||
    pessoa?.sdpessoadtnasc ||
    fallback?.dtNasc ||
    fallback?.dtnasc ||
    fallback?.dataNascimento ||
    '';

  const sexo = pessoa?.sexo || pessoa?.sdpessoasexo || fallback?.sexo || '';

  const sn = (...valores: any[]) => {
    for (const valor of valores) {
      if (valor === true) return 'S';
      if (valor === false) return 'N';
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        return String(valor).trim().toUpperCase();
      }
    }
    return 'N';
  };

  return {
    dtnasc: dataNascimento,
    dtNasc: dataNascimento,
    sdpessoadtnasc: dataNascimento,
    sexo,
    sdpessoasexo: sexo,

    gestante: sn(pessoa?.gestante, pessoa?.sdpessoagestante, fallback?.gestante),
    sdpessoagestante: sn(pessoa?.gestante, pessoa?.sdpessoagestante, fallback?.gestante),

    hipertensaoarterial: sn(pessoa?.hipertensao, pessoa?.hipertensaoarterial, pessoa?.sdpessoahipertensaoarterial, fallback?.hipertensao),
    sdpessoahipertensaoarterial: sn(pessoa?.hipertensao, pessoa?.hipertensaoarterial, pessoa?.sdpessoahipertensaoarterial, fallback?.hipertensao),

    diabetes: sn(pessoa?.diabetes, pessoa?.sdpessoadiabetes, fallback?.diabetes),
    sdpessoadiabetes: sn(pessoa?.diabetes, pessoa?.sdpessoadiabetes, fallback?.diabetes),

    fumante: sn(pessoa?.fumante, pessoa?.sdpessoafumante, fallback?.fumante),
    sdpessoafumante: sn(pessoa?.fumante, pessoa?.sdpessoafumante, fallback?.fumante),

    acamado: sn(pessoa?.acamado, pessoa?.acamados, pessoa?.sdpessoaacamado, fallback?.acamado),
    sdpessoaacamado: sn(pessoa?.acamado, pessoa?.acamados, pessoa?.sdpessoaacamado, fallback?.acamado),

    domiciliado: sn(pessoa?.domiciliado, pessoa?.sdpessoadomiciliado, fallback?.domiciliado),
    sdpessoadomiciliado: sn(pessoa?.domiciliado, pessoa?.sdpessoadomiciliado, fallback?.domiciliado),

    dependentealcool: sn(pessoa?.dependenteAlcool, pessoa?.dependentealcool, pessoa?.sdpessoadependentealcool, fallback?.dependenteAlcool),
    sdpessoadependentealcool: sn(pessoa?.dependenteAlcool, pessoa?.dependentealcool, pessoa?.sdpessoadependentealcool, fallback?.dependenteAlcool),

    dependentedroga: sn(pessoa?.dependenteDroga, pessoa?.dependentedroga, pessoa?.sdpessoadependentedroga, fallback?.dependenteDroga),
    sdpessoadependentedroga: sn(pessoa?.dependenteDroga, pessoa?.dependentedroga, pessoa?.sdpessoadependentedroga, fallback?.dependenteDroga),

    hanseniase: sn(pessoa?.hanseniase, pessoa?.sdpessoahanseniase, fallback?.hanseniase),
    sdpessoahanseniase: sn(pessoa?.hanseniase, pessoa?.sdpessoahanseniase, fallback?.hanseniase),

    tuberculose: sn(pessoa?.tuberculose, pessoa?.sdpessoatuberculose, fallback?.tuberculose),
    sdpessoatuberculose: sn(pessoa?.tuberculose, pessoa?.sdpessoatuberculose, fallback?.tuberculose),

    cancer: sn(pessoa?.cancer, pessoa?.sdpessoacancer, fallback?.cancer),
    sdpessoacancer: sn(pessoa?.cancer, pessoa?.sdpessoacancer, fallback?.cancer),

    tratpsiquiatra: sn(pessoa?.tratPsiquiatra, pessoa?.tratpsiquiatra, pessoa?.sdpessoadeficienciamental, fallback?.tratPsiquiatra),
    sdpessoadeficienciamental: sn(pessoa?.tratPsiquiatra, pessoa?.tratpsiquiatra, pessoa?.sdpessoadeficienciamental, fallback?.tratPsiquiatra),

    deficiencia: sn(pessoa?.deficiencia, pessoa?.sdpessoadeficiencia, fallback?.deficiencia),
    sdpessoadeficiencia: sn(pessoa?.deficiencia, pessoa?.sdpessoadeficiencia, fallback?.deficiencia),

    usuariobolsafamilia: sn(pessoa?.recebeBeneficio, pessoa?.usuariobolsafamilia, pessoa?.sdpessoarecebebeneficio, fallback?.recebeBeneficio),
    sdpessoarecebebeneficio: sn(pessoa?.recebeBeneficio, pessoa?.usuariobolsafamilia, pessoa?.sdpessoarecebebeneficio, fallback?.recebeBeneficio),

    avcderrame: sn(pessoa?.avcDerrame, pessoa?.avcderrame, pessoa?.sdpessoaavcderrame, fallback?.avcDerrame),
    infarto: sn(pessoa?.infarto, pessoa?.sdpessoinfarto, fallback?.infarto),
    doencacardiaca: sn(pessoa?.doencaCardiaca, pessoa?.doencacardiaca, pessoa?.sdpessoadoencacardiaca, fallback?.doencaCardiaca),
    doencarios: sn(pessoa?.doencaRins, pessoa?.doencarios, pessoa?.sdpessoadoencarenal, fallback?.doencaRins),
    internacao: sn(pessoa?.internacao, pessoa?.sdpessoadinternacao, fallback?.internacao),

    doencaresp: sn(pessoa?.doencaResp, pessoa?.doencaresp, pessoa?.sdpessoadoencarespiratoria, fallback?.doencaResp),
    doencarespasma: sn(pessoa?.asma, pessoa?.doencarespasma, pessoa?.sdpessoadoencarespasma, fallback?.asma),
    doencarespdpoc: sn(pessoa?.dpoc, pessoa?.doencarespdpoc, pessoa?.sdpessoadoencarespdpoc, fallback?.dpoc),
  };
}

const FORM_INICIAL: FormVisita = {
  data: new Date().toLocaleDateString('pt-BR'),
  hora: new Date().toLocaleTimeString('pt-BR').slice(0, 5),
  turno: 'M',
  tipoImovel: 1,
  microArea: '',
  foraArea: false,
  visitaCompartilhada: false,

  cadAtualiz: false,
  periodica: false,

  consulta: false,
  exame: false,
  vacina: false,
  ativBolsaFam: false,

  gestante: false,
  puerpera: false,
  recemNasc: false,
  crianca: false,
  desnutricao: false,
  reabilitacao: false,
  hipertensao: false,
  diabetes: false,
  asma: false,
  dpoc: false,
  cancer: false,
  cronicas: false,
  hanseniase: false,
  tuberculose: false,
  sintResp: false,
  tabagista: false,
  acamados: false,
  vulnerSocial: false,
  acomBolsaFam: false,
  saudeMental: false,
  usuarAlcool: false,
  outrasDrogas: false,
  pessoaIdosa: false,

  acaoEduc: false,
  imovelFoco: false,
  acaoMec: false,
  tratFocal: false,

  egressoInt: false,
  conviteAtiv: false,
  orientacao: false,
  outros: false,

  peso: '',
  altura: '',
  temperatura: '',
  pressaoSistolica: '',
  pressaoDiastolica: '',
  glicemia: '',
  tipoGlicemia: '3',

  gestanteDum: '',
  gravidezPlanejada: false,
  qtdGestacoes: '',
  idadeGestacional: '',
  qtdCesarias: '',
  qtdPartosNormais: '',
  gestasPrevia: '',
  qtdAbortos: '',
  partos: '',

  obs: '',
};

const TIPO_IMOVEL_OPTS = [
  { v: 1, l: 'Domicílio' },
  { v: 2, l: 'Comércio' },
  { v: 3, l: 'Terreno baldio' },
  { v: 4, l: 'Ponto Estratégico' },
  { v: 99, l: 'Outros' },
];

const TIPO_GLICEMIA_OPTS = [
  { v: '0', l: 'Jejum' },
  { v: '1', l: 'Pós-prandial' },
  { v: '2', l: 'Casual' },
  { v: '3', l: 'Não informado' },
];

function Secao({
  titulo,
  children,
  cor = '#0A4F6E',
  abertaInicial = true,
  manterMontado = false,
  onAntesFechar,
}: any) {
  const [aberta, setAberta] = useState(abertaInicial);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const alternarSecao = () => {
    if (aberta && typeof onAntesFechar === 'function') {
      onAntesFechar();
    }

    setAberta((valorAtual:any) => !valorAtual);
  };

  return (
    <View style={styles.secao}>
      <TouchableOpacity
        style={[styles.secaoHeader, { borderLeftColor: cor, backgroundColor: theme.cardSecondary }]}
        onPress={alternarSecao}
        activeOpacity={0.8}
      >
        <Text style={styles.secaoTitulo}>{titulo}</Text>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
      </TouchableOpacity>

      {(aberta || manterMontado) && (
        <View
          pointerEvents={aberta ? 'auto' : 'none'}
          style={[styles.secaoBody, !aberta && manterMontado && styles.secaoBodyOculta]}
        >
          {children}
        </View>
      )}
    </View>
  );
}

function Input({ label, value, onChange, numeric, half, readonly, placeholder, linhas = 1 }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={[styles.inputWrap, half && { flex: 1 }]}>
      <Text style={styles.campoLabel}>{label}</Text>
      {readonly ? (
        <Text style={styles.readonlyVal}>{value || '—'}</Text>
      ) : (
        <TextInput
          style={[
            styles.input,
            { color: theme.text },
            linhas > 1 && { height: 90, textAlignVertical: 'top' },
          ]}
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          multiline={linhas > 1}
          numberOfLines={linhas}
        />
      )}
    </View>
  );
}

function CheckItem({ label, value, onChange, width = '100%' }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <TouchableOpacity style={[styles.checkItem, { width }]} onPress={() => onChange(!value)} activeOpacity={0.8}>
      <View style={[styles.checkbox, value && styles.checkboxOn]}>
        {value && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function RadioPillGroup({ label, value, onChange, opcoes }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={styles.radioGroup}>
        {opcoes.map((o: any) => (
          <TouchableOpacity
            key={o.v}
            style={[styles.radioBtn, value === o.v && styles.radioBtnOn]}
            onPress={() => onChange(o.v)}
          >
            <Text style={[styles.radioTxt, value === o.v && styles.radioTxtOn]}>{o.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function EvfamModal({
  visivel,
  moradores,
  valor,
  onSalvar,
  onFechar,
}: {
  visivel: boolean;
  moradores: EstadoMorador[];
  valor: FormEvfam;
  onSalvar: (evfam: FormEvfam) => void;
  onFechar: () => void;
}) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  const [rascunho, setRascunho] = useState<FormEvfam>(valor);

  useEffect(() => {
    const pessoaPadrao = valor.pessoaId || moradores[0]?.id || '';
    setRascunho({ ...EVFAM_INICIAL, ...valor, pessoaId: pessoaPadrao });
  }, [visivel, valor, moradores]);

  const alterarCampo = (campo: keyof FormEvfam, novoValor: any) => {
    setRascunho((prev) => {
      const atualizado = { ...prev, [campo]: novoValor };
      const pontuacao = calcularPontuacaoEvfam(atualizado);
      return {
        ...atualizado,
        pontuacao,
        classificacao: calcularClassificacaoEvfam(pontuacao),
      };
    });
  };

  const salvar = () => {
    if (moradores.length > 0 && !rascunho.pessoaId) {
      Alert.alert('Atenção', 'Selecione a pessoa de referência do EVFAM.');
      return;
    }

    const pontuacao = calcularPontuacaoEvfam(rascunho);
    onSalvar({
      ...rascunho,
      realizado: true,
      pontuacao,
      classificacao: calcularClassificacaoEvfam(pontuacao),
    });
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onFechar}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCardEvfam}>
          <View style={styles.modalHeaderEvfam}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTituloEvfam}>EVFAM</Text>
              <Text style={styles.modalSubtituloEvfam}>Escala de Vulnerabilidade Familiar</Text>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={onFechar}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {moradores.length > 0 && (
              <View style={styles.evfamBloco}>
                <Text style={styles.campoLabel}>Pessoa de referência</Text>
                {moradores.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.evfamPessoaItem, rascunho.pessoaId === m.id && styles.evfamPessoaItemOn]}
                    onPress={() => alterarCampo('pessoaId', m.id)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={rascunho.pessoaId === m.id ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={rascunho.pessoaId === m.id ? theme.primary : theme.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.evfamPessoaNome}>{m.nome}</Text>
                      <Text style={styles.evfamPessoaDesc}>{m.idade || 'Sem idade informada'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.evfamResumo}>
              <Text style={styles.evfamResumoTitulo}>Pontuação: {rascunho.pontuacao}</Text>
              <Text style={styles.evfamResumoDesc}>{textoClassificacaoEvfam(rascunho.classificacao)}</Text>
            </View>

            <View style={styles.row}>
              <Input
                label="Motivo"
                value={rascunho.motivo}
                onChange={(v: any) => alterarCampo('motivo', v.replace(/[^0-9]/g, ''))}
                half
                numeric
                placeholder="1"
              />
              <Input
                label="Classificação"
                value={`${rascunho.classificacao} - ${textoClassificacaoEvfam(rascunho.classificacao)}`}
                readonly
                half
              />
            </View>

            <Text style={styles.evfamGrupoTitulo}>Questionário</Text>

            {CAMPOS_PONTUACAO_EVFAM.map((campo) => (
              <View key={String(campo)} style={styles.evfamPergunta}>
                <Text style={styles.evfamPerguntaTexto}>{LABELS_EVFAM[String(campo)]}</Text>
                <View style={styles.evfamOpcaoRow}>
                  <TouchableOpacity
                    style={[styles.evfamOpcao, rascunho[campo] === 'S' && styles.evfamOpcaoSim]}
                    onPress={() => alterarCampo(campo, 'S')}
                  >
                    <Text style={[styles.evfamOpcaoTexto, rascunho[campo] === 'S' && styles.evfamOpcaoTextoOn]}>Sim</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.evfamOpcao, rascunho[campo] === 'N' && styles.evfamOpcaoNao]}
                    onPress={() => alterarCampo(campo, 'N')}
                  >
                    <Text style={[styles.evfamOpcaoTexto, rascunho[campo] === 'N' && styles.evfamOpcaoTextoOn]}>Não</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.evfamFooter}>
            <TouchableOpacity style={styles.btnCancelarEvfam} onPress={onFechar}>
              <Text style={styles.btnCancelarEvfamTxt}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSalvarEvfam} onPress={salvar}>
              <Text style={styles.btnSalvarEvfamTxt}>Salvar EVFAM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function VisitaDomiciliarScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768 && width > height;
  const signatureRef = useRef<SignatureViewRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalizandoAssinaturaRef = useRef(false);

  const { moradoresParam, microAreaParam, domicilioIdParam } = useLocalSearchParams<{
    moradoresParam?: string;
    microAreaParam?: string;
    domicilioIdParam?: string;
  }>();

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const { profissional, unidade, equipe } = useAuthStore();

  const [form, setForm] = useState<FormVisita>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [scrollHabilitado, setScrollHabilitado] = useState(true);

  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);
  const [moradores, setMoradores] = useState<EstadoMorador[]>([]);
  const [desfechos, setDesfechos] = useState<Record<string, number>>({});
  const [modalDesfecho, setModalDesfecho] = useState(false);
  const [modalEvfam, setModalEvfam] = useState(false);
  const [evfamHabilitado, setEvfamHabilitado] = useState(false);
  const [evfam, setEvfam] = useState<FormEvfam>(EVFAM_INICIAL);

  const [assinaturaDesenhada, setAssinaturaDesenhada] = useState(false);

  const upd = (campo: Partial<FormVisita>) => setForm((p) => ({ ...p, ...campo }));

  const habilitarScrollAssinatura = () => {
    if (scrollResetTimeoutRef.current) {
      clearTimeout(scrollResetTimeoutRef.current);
      scrollResetTimeoutRef.current = null;
    }

    setScrollHabilitado(true);
  };

  const desabilitarScrollAssinatura = () => {
    if (scrollResetTimeoutRef.current) {
      clearTimeout(scrollResetTimeoutRef.current);
    }

    setScrollHabilitado(false);

    // Segurança: se o componente de assinatura perder algum evento de fim do toque,
    // a tela não fica travada sem rolagem.
    scrollResetTimeoutRef.current = setTimeout(() => {
      setScrollHabilitado(true);
      scrollResetTimeoutRef.current = null;
    }, 1200);
  };

  const salvarAssinaturaNoFormulario = (assinatura?: string) => {
    const assinaturaFinal = assinatura || '';

    setForm((prev) => ({
      ...prev,
      assinaturaBase64: assinaturaFinal || prev.assinaturaBase64 || '',
    }));

    if (assinaturaFinal) {
      setAssinaturaDesenhada(true);
    }
  };

  const handleAssinaturaOK = (img: string) => {
    habilitarScrollAssinatura();
    console.log('[VISITA][ASSINATURA] Assinatura capturada:', { possuiImagem: !!img, tamanho: img?.length || 0 });
    salvarAssinaturaNoFormulario(img);

    if (finalizandoAssinaturaRef.current) {
      finalizandoAssinaturaRef.current = false;
      salvarVisitas(img || form.assinaturaBase64 || '');
    }
  };

  const handleAssinaturaVazia = () => {
    habilitarScrollAssinatura();

    if (finalizandoAssinaturaRef.current) {
      finalizandoAssinaturaRef.current = false;
      salvarVisitas(form.assinaturaBase64 || '');
    }
  };

  const limparAssinatura = () => {
    habilitarScrollAssinatura();
    setAssinaturaDesenhada(false);
    setForm((prev) => ({ ...prev, assinaturaBase64: '' }));
  };

  const limparAssinaturaPeloUsuario = () => {
    habilitarScrollAssinatura();
    finalizandoAssinaturaRef.current = false;
    setAssinaturaDesenhada(false);
    setForm((prev) => ({ ...prev, assinaturaBase64: '' }));
    signatureRef.current?.clearSignature?.();
    console.log('[VISITA][ASSINATURA] Assinatura limpa pelo usuário');
  };

  useEffect(() => {
    const microAreaVindaDoDomicilio =
      typeof microAreaParam === 'string' ? microAreaParam : '';

    setForm((prev) => ({
      ...prev,
      microArea:
        microAreaVindaDoDomicilio ||
        prev.microArea ||
        String(profissional?.microArea || ''),
    }));
  }, [microAreaParam, profissional?.microArea]);

  useEffect(() => {
    return () => {
      if (scrollResetTimeoutRef.current) {
        clearTimeout(scrollResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function carregarParametroEvfam() {
      const auth: any = useAuthStore.getState();

      const parametroLocal =
        auth?.parametros?.riscoFamiliar ||
        auth?.parametros?.SDPARAMETROPSFRISCOFAMILIAR ||
        auth?.tenantConfig?.parametros?.riscoFamiliar ||
        auth?.tenantConfig?.parametros?.SDPARAMETROPSFRISCOFAMILIAR ||
        auth?.config?.SDPARAMETROPSFRISCOFAMILIAR ||
        null;

      if (parametroLocal) {
        setEvfamHabilitado(String(parametroLocal).trim().toUpperCase() === 'P');
        return;
      }

      const token = auth?.token || auth?.accessToken || auth?.userToken || '';
      const municipioSlug =
        auth?.municipioSlug ||
        auth?.municipio?.slug ||
        auth?.tenant?.slug ||
        auth?.user?.municipioSlug ||
        '';

      if (!token || !municipioSlug) {
        setEvfamHabilitado(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/sync/parametros-gerais`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-municipio-slug': municipioSlug,
          },
        });

        const result = await response.json();
        const parametroRemoto =
          result?.dados?.SDPARAMETROPSFRISCOFAMILIAR ||
          result?.dados?.sdparametropsfriscofamiliar ||
          result?.parametros?.riscoFamiliar ||
          result?.riscoFamiliar ||
          null;

        setEvfamHabilitado(String(parametroRemoto || '').trim().toUpperCase() === 'P');
      } catch (error) {
        console.log('[VISITA][EVFAM] Não foi possível carregar parâmetro:', error);
        setEvfamHabilitado(false);
      }
    }

    carregarParametroEvfam();
  }, []);

  useEffect(() => {
    async function carregarMoradoresDoDomicilio() {
      if (!moradoresParam || typeof moradoresParam !== 'string') {
        return;
      }

      try {
        const moradoresRecebidos = JSON.parse(moradoresParam) as MoradorRecebidoParam[];

        if (!Array.isArray(moradoresRecebidos) || moradoresRecebidos.length === 0) {
          return;
        }

        const moradoresConvertidos: EstadoMorador[] = [];

        for (const m of moradoresRecebidos) {
          const idStr = String(m.id);
          let pessoaLocal: any = null;

          try {
            const encontrados = await pessoaCollection
              .query(Q.where('int_id', Number(idStr)))
              .fetch();

            if (encontrados.length > 0) {
              pessoaLocal = encontrados[0];
            }
          } catch (e) {
            console.log('[VISITA DEBUG] erro ao buscar pessoa local:', e);
          }

          const dataNascimento =
            pessoaLocal?.dtNasc ||
            m.dataNascimento ||
            m.dtnasc ||
            m.dtNasc ||
            '';

          const dadosParaCalculo = pessoaLocal
            ? {
                dtnasc: pessoaLocal.dtNasc || '',
                sexo: pessoaLocal.sexo || '',

                gestante: pessoaLocal.gestante ? 'S' : 'N',
                hipertensaoarterial: pessoaLocal.hipertensao ? 'S' : 'N',
                diabetes: pessoaLocal.diabetes ? 'S' : 'N',
                fumante: pessoaLocal.fumante || 'N',
                acamado: pessoaLocal.acamado ? 'S' : 'N',
                domiciliado: pessoaLocal.domiciliado ? 'S' : 'N',
                dependentealcool: pessoaLocal.dependenteAlcool || 'N',
                dependentedroga: pessoaLocal.dependenteDroga || 'N',
                hanseniase: pessoaLocal.hanseniase || 'N',
                tuberculose: pessoaLocal.tuberculose || 'N',
                cancer: pessoaLocal.cancer || 'N',
                tratpsiquiatra: pessoaLocal.tratPsiquiatra || 'N',
                deficiencia: pessoaLocal.deficiencia || 'N',
                usuariobolsafamilia: pessoaLocal.recebeBeneficio || 'N',

                avcderrame: pessoaLocal.avcDerrame || 'N',
                infarto: pessoaLocal.infarto || 'N',
                doencacardiaca: pessoaLocal.doencaCardiaca || 'N',
                doencarios: pessoaLocal.doencaRins || 'N',
                internacao: pessoaLocal.internacao || 'N',

                doencaresp: pessoaLocal.doencaResp || 'N',
                doencarespasma: 'N',
                doencarespdpoc: 'N',
              }
            : {
                dtnasc: dataNascimento,
                sexo: '',
                gestante: 'N',
                hipertensaoarterial: 'N',
                diabetes: 'N',
                fumante: 'N',
                acamado: 'N',
                domiciliado: 'N',
                dependentealcool: 'N',
                dependentedroga: 'N',
                hanseniase: 'N',
                tuberculose: 'N',
                cancer: 'N',
                tratpsiquiatra: 'N',
                deficiencia: 'N',
                usuariobolsafamilia: 'N',
                avcderrame: 'N',
                infarto: 'N',
                doencacardiaca: 'N',
                doencarios: 'N',
                internacao: 'N',
                doencaresp: 'N',
                doencarespasma: 'N',
                doencarespdpoc: 'N',
              };

          moradoresConvertidos.push({
            id: idStr,
            guid: m.guid || '',
            nome: pessoaLocal?.nome || m.nome || 'Sem nome',
            cns: pessoaLocal?.cns || m.cns || m.cpf || '',
            idade: calcularIdadeTexto(dataNascimento),
            condicoes: calcularCondicoesMorador(dadosParaCalculo as any),
          });
        }

        setMoradores(moradoresConvertidos);
      } catch (error) {
        console.log('[VISITA DEBUG] erro ao ler moradoresParam:', error);
      }
    }

    carregarMoradoresDoDomicilio();
  }, [moradoresParam]);

  useEffect(() => {
    const deveMostrarCondicoes = moradores.length === 1;

    if (deveMostrarCondicoes) {
      const condicoesDoMorador = condicoesParaForm(moradores[0]?.condicoes);

      setForm((prev) => ({
        ...prev,
        ...condicoesDoMorador,
      }));

      console.log('[VISITA DEBUG] Condições aplicadas no formulário:', {
        morador: moradores[0]?.nome,
        condicoes: condicoesDoMorador,
      });

      return;
    }

    setForm((prev) => {
      const condicoesZeradas = condicoesParaForm({});
      const temCondicaoMarcada = CAMPOS_CONDICAO_VISITA.some((campo) => !!prev[campo]);

      if (!temCondicaoMarcada) {
        return prev;
      }

      return {
        ...prev,
        ...condicoesZeradas,
      };
    });
    setEvfam((prev) => {
      if (prev.pessoaId || moradores.length === 0) {
        return prev;
      }

      return { ...prev, pessoaId: moradores[0].id };
    });
  }, [moradores]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const termo = buscaPaciente.trim();

    if (termo.length < 3) {
      setBuscandoPacientes(false);
      setPacientesEncontrados([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const auth: any = useAuthStore.getState();

      const token =
        auth?.token ||
        auth?.accessToken ||
        auth?.userToken ||
        '';

      const municipioSlug =
        auth?.municipioSlug ||
        auth?.municipio?.slug ||
        auth?.tenant?.slug ||
        auth?.user?.municipioSlug ||
        '';

      setBuscandoPacientes(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/sync/pacientes?termo=${encodeURIComponent(termo)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              'x-municipio-slug': municipioSlug,
            },
          }
        );

        const result = await response.json();

        console.log('[VISITA DEBUG] retorno:', JSON.stringify(result));

        if (result?.status === 'S' && Array.isArray(result?.dados)) {
          setPacientesEncontrados(result.dados);
        } else {
          setPacientesEncontrados([]);
        }
      } catch (e: any) {
        console.log('[VISITA DEBUG] erro:', e);
        setPacientesEncontrados([]);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [buscaPaciente]);

  const selecionarPaciente = async (p: any) => {
    if (moradores.some((m) => m.id === String(p.id))) {
      Alert.alert('Aviso', 'Morador já selecionado.');
      return;
    }

    let pessoaLocal: any = null;

    try {
      const encontrados = await pessoaCollection
        .query(Q.where('int_id', Number(p.id)))
        .fetch();

      if (encontrados.length > 0) {
        pessoaLocal = encontrados[0];
      }
    } catch (e) {
      console.log('[VISITA DEBUG] erro ao buscar pessoa local selecionada:', e);
    }

    const dadosParaCalculo = montarDadosParaCalculoCondicoes(pessoaLocal || p, p);

    const novoMorador: EstadoMorador = {
      id: String(p.id),
      guid: pessoaLocal?.guid || p.guid || '',
      nome: pessoaLocal?.nome || p.nome,
      cns: pessoaLocal?.cns || p.cns || p.cpf,
      idade: calcularIdadeTexto(
        pessoaLocal?.dtNasc ||
        p.dtnasc ||
        p.dtNasc ||
        p.dataNascimento
      ),
      condicoes: calcularCondicoesMorador(dadosParaCalculo as any),
    };

    console.log('[VISITA DEBUG] Morador selecionado com condições:', {
      id: novoMorador.id,
      nome: novoMorador.nome,
      condicoes: novoMorador.condicoes,
      encontrouPessoaLocal: !!pessoaLocal,
    });

    setMoradores((prev) => [...prev, novoMorador]);
    setBuscaPaciente('');
    setPacientesEncontrados([]);

    if (p.microArea || pessoaLocal?.microArea) {
      upd({ microArea: String(p.microArea || pessoaLocal?.microArea) });
    }
  };

  const formatarDataParaBanco = (dataBR: string) => {
    const partes = dataBR.split('/');
    return partes.length === 3
      ? `${partes[2]}-${partes[1]}-${partes[0]}`
      : new Date().toISOString().split('T')[0];
  };

  const getCondicoesDoForm = (): Record<CampoCondicaoVisita, boolean> => {
    return CAMPOS_CONDICAO_VISITA.reduce((acc, campo) => {
      acc[campo] = !!form[campo];
      return acc;
    }, {} as Record<CampoCondicaoVisita, boolean>);
  };

  const getCondicoesEfetivas = (m?: EstadoMorador): Record<CampoCondicaoVisita, boolean> => {
    const condicoesDoMorador = condicoesParaForm(m?.condicoes);

    if (m && moradores.length > 1) {
      return condicoesDoMorador;
    }

    return getCondicoesDoForm();
  };

  const alturaDigitada = parseFloat(form.altura.replace(',', '.')) || 0;
  const alturaParaEnviar = alturaDigitada > 10 ? alturaDigitada / 100 : alturaDigitada;

  const obterCoordenadasVisita = async (): Promise<{ latitude: string; longitude: string }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('[VISITA][LOCALIZACAO] Permissão negada pelo usuário.');
        return { latitude: '', longitude: '' };
      }

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = String(posicao.coords.latitude);
      const longitude = String(posicao.coords.longitude);

      console.log('[VISITA][LOCALIZACAO] Coordenadas capturadas:', {
        latitude,
        longitude,
      });

      return { latitude, longitude };
    } catch (error) {
      console.log('[VISITA][LOCALIZACAO] Erro ao capturar localização:', error);
      return { latitude: '', longitude: '' };
    }
  };

  const salvarVisitas = async (assinatura?: string) => {
    const microAreaFinal = form.microArea || String(profissional?.microArea || '');

    if (!microAreaFinal) {
      return Alert.alert('Erro', 'Informe a microárea.');
    }

    setSalvando(true);

    try {
      const { v4: uuidv4 } = await import('uuid');
      const dataSql = formatarDataParaBanco(form.data);
      const coordenadas = await obterCoordenadasVisita();

      await database.write(async () => {
        const operacoes: any[] = [];

        const preencherFicha = (r: any, m?: EstadoMorador) => {
          const condicoesEfetivas = getCondicoesEfetivas(m);

          r.guid = uuidv4();
          r.syncStatus = 'pending';
          r.data = dataSql;
          r.hora = form.hora;
          r.turno = form.turno;
          r.microArea = microAreaFinal;
          r.tipoImovel = form.tipoImovel;
          r.pessoaGuid = m ? m.guid : '';
          r.pacienteNome = m ? m.nome : 'Sem identificação';
          r.desfecho = m ? desfechos[m.id] || 1 : 3;
          r.assinaturaBase64 = assinatura || '';
          r.profissionalId = profissional?.id;
          r.latitude = coordenadas.latitude;
          r.longitude = coordenadas.longitude;

          const camposSn = [
            'foraArea', 'visitaCompartilhada', 'cadAtualiz', 'periodica',
            'consulta', 'exame', 'vacina', 'ativBolsaFam',
            'gestante', 'puerpera', 'recemNasc', 'crianca', 'desnutricao',
            'reabilitacao', 'hipertensao', 'diabetes', 'asma', 'dpoc',
            'cancer', 'cronicas', 'hanseniase', 'tuberculose', 'sintResp',
            'tabagista', 'acamados', 'vulnerSocial', 'acomBolsaFam',
            'saudeMental', 'usuarAlcool', 'outrasDrogas', 'pessoaIdosa',
            'acaoEduc', 'imovelFoco', 'acaoMec', 'tratFocal',
            'egressoInt', 'conviteAtiv', 'orientacao', 'outros',
            'gravidezPlanejada',
          ];

          const camposCondicao = new Set<CampoCondicaoVisita>([
            'gestante',
            'puerpera',
            'recemNasc',
            'crianca',
            'desnutricao',
            'reabilitacao',
            'hipertensao',
            'diabetes',
            'asma',
            'dpoc',
            'cancer',
            'cronicas',
            'hanseniase',
            'tuberculose',
            'sintResp',
            'tabagista',
            'acamados',
            'vulnerSocial',
            'acomBolsaFam',
            'saudeMental',
            'usuarAlcool',
            'outrasDrogas',
            'pessoaIdosa',
          ]);

          camposSn.forEach((f) => {
            if (camposCondicao.has(f as CampoCondicaoVisita)) {
              r[f] = condicoesEfetivas[f as CampoCondicaoVisita];
            } else {
              r[f] = form[f as keyof FormVisita];
            }
          });

          r.peso = parseFloat(form.peso.replace(',', '.')) || 0;
          r.altura = alturaParaEnviar;
          r.temperatura = parseFloat(form.temperatura.replace(',', '.')) || 0;
          r.pressaoSistolica = parseInt(form.pressaoSistolica) || 0;
          r.pressaoDiastolica = parseInt(form.pressaoDiastolica) || 0;
          r.glicemia = parseInt(form.glicemia) || 0;
          r.tipoGlicemia = form.tipoGlicemia;

          r.gestanteDum = form.gestanteDum;
          r.qtdGestacoes = parseInt(form.qtdGestacoes) || 0;
          r.idadeGestacional = parseInt(form.idadeGestacional) || 0;
          r.qtdCesarias = parseInt(form.qtdCesarias) || 0;
          r.qtdPartosNormais = parseInt(form.qtdPartosNormais) || 0;
          r.gestasPrevia = parseInt(form.gestasPrevia) || 0;
          r.qtdAbortos = parseInt(form.qtdAbortos) || 0;
          r.partos = parseInt(form.partos) || 0;
          r.obs = form.obs;

          const deveEnviarEvfamNestaFicha =
            evfamHabilitado &&
            evfam.realizado &&
            (!m || !evfam.pessoaId || String(evfam.pessoaId) === String(m.id));

          const evfamParaEnviar = deveEnviarEvfamNestaFicha
            ? {
                realizado: true,
                sddomicilioid: Number(domicilioIdParam || 0) || null,
                pessoaId: Number(evfam.pessoaId || m?.id || 0) || null,
                data: dataSql,
                suspeitaViolencia: evfam.suspeitaViolencia,
                motivo: Number(evfam.motivo || 1) || 1,
                dificFinanc: evfam.dificFinanc,
                faltaDinheiro: evfam.faltaDinheiro,
                dificAlimento: evfam.dificAlimento,
                medicamento: evfam.medicamento,
                variosMedic: evfam.variosMedic,
                cuidadoContinuo: evfam.cuidadoContinuo,
                dificAtividade: evfam.dificAtividade,
                ajudaSaude: evfam.ajudaSaude,
                maeAusente: evfam.maeAusente,
                paiAusente: evfam.paiAusente,
                abandonoFamilia: evfam.abandonoFamilia,
                pessoaViolenta: evfam.pessoaViolenta,
                vitimaViolencia: evfam.vitimaViolencia,
                violencia: evfam.violencia,
                pontuacao: evfam.pontuacao,
                classificacao: evfam.classificacao,
              }
            : null;

          r.dados = JSON.stringify({
            SDVisitaDomiciliarGUID: r.guid,
            SDVisitaDomiciliarUsuarioGUID: m ? m.guid : null,
            SDVisitaDomiciliarUsuarioId: m?.id ?? null,

            SDVisitaDomiciliarData: dataSql,
            SDVisitaDomiciliarHora: form.hora,
            SDVisitaDomiciliarTurno: form.turno,
            SDVisitaDomiciliarTipoImovel: form.tipoImovel,
            SDVisitaDomiciliarMicroarea: microAreaFinal,
            SDVisitaDomiciliarForaArea: form.foraArea,
            SDVisitaDomiciliarVisitaCompar: form.visitaCompartilhada,

            SDVisitaDomiciliarCadAtualiz: form.cadAtualiz,
            SDVisitaDomiciliarPeriodica: form.periodica,

            SDVisitaDomiciliarConsulta: form.consulta,
            SDVisitaDomiciliarExame: form.exame,
            SDVisitaDomiciliarVacina: form.vacina,
            SDVisitaDomiciliarAtivBolsaFam: form.ativBolsaFam,

            SDVisitaDomiciliarGestante: condicoesEfetivas.gestante,
            SDVisitaDomiciliarPuerpera: condicoesEfetivas.puerpera,
            SDVisitaDomiciliarRecemNasc: condicoesEfetivas.recemNasc,
            SDVisitaDomiciliarCrianca: condicoesEfetivas.crianca,
            SDVisitaDomiciliarDesnutricao: condicoesEfetivas.desnutricao,
            SDVisitaDomiciliarReabilitacao: condicoesEfetivas.reabilitacao,
            SDVisitaDomiciliarHipertensao: condicoesEfetivas.hipertensao,
            SDVisitaDomiciliarDiabetes: condicoesEfetivas.diabetes,
            SDVisitaDomiciliarAsma: condicoesEfetivas.asma,
            SDVisitaDomiciliarDPOC: condicoesEfetivas.dpoc,
            SDVisitaDomiciliarCancer: condicoesEfetivas.cancer,
            SDVisitaDomiciliarCronicas: condicoesEfetivas.cronicas,
            SDVisitaDomiciliarHanseniase: condicoesEfetivas.hanseniase,
            SDVisitaDomiciliarTuberculose: condicoesEfetivas.tuberculose,
            SDVisitaDomiciliarSintResp: condicoesEfetivas.sintResp,
            SDVisitaDomiciliarTabagista: condicoesEfetivas.tabagista,
            SDVisitaDomiciliarAcamados: condicoesEfetivas.acamados,
            SDVisitaDomiciliarVulnerSocial: condicoesEfetivas.vulnerSocial,
            SDVisitaDomiciliarAcomBolsaFam: condicoesEfetivas.acomBolsaFam,
            SDVisitaDomiciliarSaudeMental: condicoesEfetivas.saudeMental,
            SDVisitaDomiciliarUsuarAlcool: condicoesEfetivas.usuarAlcool,
            SDVisitaDomiciliarOutrasDrogas: condicoesEfetivas.outrasDrogas,
            SDVisitaDomiciliarPessoaIdosa: condicoesEfetivas.pessoaIdosa,

            SDVisitaDomiciliarAcaoEduc: form.acaoEduc,
            SDVisitaDomiciliarImovelFoco: form.imovelFoco,
            SDVisitaDomiciliarAcaoMec: form.acaoMec,
            SDVisitaDomiciliarTratFocal: form.tratFocal,

            SDVisitaDomiciliarEgressoInt: form.egressoInt,
            SDVisitaDomiciliarConviteAtiv: form.conviteAtiv,
            SDVisitaDomiciliarOrientacao: form.orientacao,
            SDVisitaDomiciliarOutros: form.outros,

            SDVisitaDomiciliarPeso: parseFloat(form.peso.replace(',', '.')) || 0,
            SDVisitaDomiciliarAltura: alturaParaEnviar || 0,
            SDVisitaDomiciliarTemperatura: parseFloat(form.temperatura.replace(',', '.')) || 0,
            SDVisitaDomiciliarPressaoSistolica: parseInt(form.pressaoSistolica) || 0,
            SDVisitaDomiciliarPressaoDiastolica: parseInt(form.pressaoDiastolica) || 0,
            SDVisitaDomiciliarGlicemia: parseInt(form.glicemia) || 0,
            SDVisitaDomiciliarTipoGlicemia: form.tipoGlicemia,

            SDVisitaDomiciliarGestanteDum: form.gestanteDum,
            SDVisitaDomiciliarGravidezPlanejada: form.gravidezPlanejada,
            SDVisitaDomiciliarQtdGestacoes: parseInt(form.qtdGestacoes) || 0,
            SDVisitaDomiciliarsdIdadeGestacional: parseInt(form.idadeGestacional) || 0,
            SDVisitaDomiciliarQtdCesarias: parseInt(form.qtdCesarias) || 0,
            SDVisitaDomiciliarQtdPartosNomais: parseInt(form.qtdPartosNormais) || 0,
            SDVisitaDomiciliarGestasPrevia: parseInt(form.gestasPrevia) || 0,
            SDVisitaDomiciliarQtdAbortos: parseInt(form.qtdAbortos) || 0,
            SDVisitaDomiciliarPartos: parseInt(form.partos) || 0,

            SDVisitaDomiciliarDesfecho: m ? desfechos[m.id] || 1 : 3,
            SDVisitaDomiciliarObs: form.obs,
            SDVisitaDomiciliarLatitude: coordenadas.latitude,
            SDVisitaDomiciliarLongitude: coordenadas.longitude,
            SDVisitaDomiciliarAssinaturaPaciente: assinatura || '',

            SDVisitaDomiciliarProfId: profissional?.id || null,
            SDVisitaDomiciliarUnidadeId: profissional?.unidadeId || null,
            SDVisitaDomiciliarEquipeId: profissional?.equipeId || null,
            SDVisitaDomiciliarCBOProfId: profissional?.cboCodigo || null,

            SDVulnerabilidadeFamiliar: evfamParaEnviar,
          });
        };

        if (moradores.length > 0) {
          moradores.forEach((m) => {
            operacoes.push(visitaCollection.prepareCreate((r: any) => preencherFicha(r, m)));
          });
        } else {
          operacoes.push(visitaCollection.prepareCreate((r: any) => preencherFicha(r)));
        }

        await database.batch(operacoes);
      });

      Alert.alert('Sucesso', 'Visitas salvas!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarSalvar = async () => {
    setModalDesfecho(false);

    finalizandoAssinaturaRef.current = true;

    // Se o usuário já assinou e a assinatura foi preservada no form, usa ela.
    // Caso contrário, tenta ler o canvas atual.
    if (form.assinaturaBase64) {
      finalizandoAssinaturaRef.current = false;
      salvarVisitas(form.assinaturaBase64);
      return;
    }

    signatureRef.current?.readSignature();
  };

  const renderMoradorCondicoes = (m: EstadoMorador) => {
    const ativas = Object.entries(m.condicoes || {})
      .filter(([, valor]) => !!valor)
      .map(([chave]) => chave);

    if (ativas.length === 0) {
      return null;
    }

    return (
      <Text style={styles.cardMiniDesc} numberOfLines={2}>
        {ativas.join(' • ')}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={10}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Visita Domiciliar</Text>
          <View style={styles.badgeTablet}>
            <Text style={styles.badgeText}>{isTablet ? 'MODO TABLET' : 'MOBILE'}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 40 }}
          scrollEnabled={scrollHabilitado}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={isTablet ? styles.tabletWrapper : styles.mobileWrapper}>
            <View style={isTablet ? styles.column : undefined}>
              <Secao titulo="Identificação / Local">
                <View style={styles.row}>
                  <Input label="Data" value={form.data} onChange={(v: any) => upd({ data: v })} half />
                  <Input label="Hora" value={form.hora} onChange={(v: any) => upd({ hora: v })} half />
                </View>

                <View style={styles.row}>
                  <Input
                    label="Microárea"
                    value={form.microArea || String(profissional?.microArea || '')}
                    onChange={(v: any) => upd({ microArea: v })}
                    half
                    numeric
                  />
                  <Input label="Profissional" value={profissional?.nome || ''} readonly half />
                </View>

                <View style={styles.row}>
                  <Input label="Unidade" value={unidade?.nome || ''} readonly half />
                  <Input label="Equipe" value={equipe?.nome || ''} readonly half />
                </View>

                <RadioPillGroup
                  label="Turno"
                  value={form.turno}
                  onChange={(v: any) => upd({ turno: v })}
                  opcoes={[
                    { v: 'M', l: 'Manhã' },
                    { v: 'T', l: 'Tarde' },
                    { v: 'N', l: 'Noite' },
                  ]}
                />

                <RadioPillGroup
                  label="Tipo do Imóvel"
                  value={form.tipoImovel}
                  onChange={(v: any) => upd({ tipoImovel: v })}
                  opcoes={TIPO_IMOVEL_OPTS}
                />

                <View style={styles.checkGrid}>
                  <CheckItem
                    label="Fora de Área"
                    width="48%"
                    value={form.foraArea}
                    onChange={(v: any) => upd({ foraArea: v })}
                  />
                  <CheckItem
                    label="Visita Compartilhada"
                    width="48%"
                    value={form.visitaCompartilhada}
                    onChange={(v: any) => upd({ visitaCompartilhada: v })}
                  />
                </View>
              </Secao>

              <Secao titulo="Moradores" cor="#0891B2">
                <Text style={styles.campoLabel}>Buscar por nome, CPF ou CNS</Text>
                <View style={styles.searchBox}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: theme.text }]}
                    value={buscaPaciente}
                    onChangeText={setBuscaPaciente}
                    placeholder="Nome, CPF ou CNS..."
                    placeholderTextColor={theme.textMuted}
                  />
                  {buscandoPacientes && <ActivityIndicator color={theme.primary} style={{ marginLeft: 10 }} />}
                </View>

                {pacientesEncontrados.length > 0 && (
                  <ScrollView
                    style={styles.resultadosBuscaBox}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {pacientesEncontrados.map((p) => (
                      <TouchableOpacity key={String(p.id)} style={styles.itemBusca} onPress={() => selecionarPaciente(p)}>
                        <Text style={styles.itemBuscaNome}>{p.nome}</Text>
                        <Text style={styles.itemBuscaDesc}>
                          {p.cpf || p.cns || 'Sem documento'} • {p.dtNasc || p.dtnasc || 'Sem data nasc.'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {moradores.map((m) => (
                  <View key={m.id} style={styles.cardMini}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardMiniTit}>{m.nome}</Text>
                      <Text style={styles.cardMiniDesc}>{m.idade}</Text>
                      {renderMoradorCondicoes(m)}
                    </View>
                    <TouchableOpacity onPress={() => setMoradores(moradores.filter((x) => x.id !== m.id))}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </Secao>

              <Secao titulo="Motivo da Visita" cor="#7C3AED">
                <View style={styles.checkGrid}>
                  <CheckItem label="Cadastramento / Atualização" width="48%" value={form.cadAtualiz} onChange={(v: any) => upd({ cadAtualiz: v })} />
                  <CheckItem label="Visita Periódica" width="48%" value={form.periodica} onChange={(v: any) => upd({ periodica: v })} />
                </View>

                <Text style={styles.subTitulo}>Busca Ativa</Text>
                <View style={styles.checkGrid}>
                  <CheckItem label="Consulta" width="48%" value={form.consulta} onChange={(v: any) => upd({ consulta: v })} />
                  <CheckItem label="Exame" width="48%" value={form.exame} onChange={(v: any) => upd({ exame: v })} />
                  <CheckItem label="Vacina" width="48%" value={form.vacina} onChange={(v: any) => upd({ vacina: v })} />
                  <CheckItem label="Ativ. Bolsa Família" width="48%" value={form.ativBolsaFam} onChange={(v: any) => upd({ ativBolsaFam: v })} />
                </View>
              </Secao>

              {moradores.length === 1 && (
                <Secao titulo="Acompanhamento / Saúde" cor="#D97706" abertaInicial>
                  <View style={styles.checkGrid}>
                  <CheckItem label="Gestante" width="48%" value={form.gestante} onChange={(v: any) => upd({ gestante: v })} />
                  <CheckItem label="Puérpera" width="48%" value={form.puerpera} onChange={(v: any) => upd({ puerpera: v })} />
                  <CheckItem label="Recém-nascido" width="48%" value={form.recemNasc} onChange={(v: any) => upd({ recemNasc: v })} />
                  <CheckItem label="Criança" width="48%" value={form.crianca} onChange={(v: any) => upd({ crianca: v })} />
                  <CheckItem label="Desnutrição" width="48%" value={form.desnutricao} onChange={(v: any) => upd({ desnutricao: v })} />
                  <CheckItem label="Reabilitação" width="48%" value={form.reabilitacao} onChange={(v: any) => upd({ reabilitacao: v })} />
                  <CheckItem label="Hipertensão" width="48%" value={form.hipertensao} onChange={(v: any) => upd({ hipertensao: v })} />
                  <CheckItem label="Diabetes" width="48%" value={form.diabetes} onChange={(v: any) => upd({ diabetes: v })} />
                  <CheckItem label="Asma" width="48%" value={form.asma} onChange={(v: any) => upd({ asma: v })} />
                  <CheckItem label="DPOC" width="48%" value={form.dpoc} onChange={(v: any) => upd({ dpoc: v })} />
                  <CheckItem label="Câncer" width="48%" value={form.cancer} onChange={(v: any) => upd({ cancer: v })} />
                  <CheckItem label="Outras crônicas" width="48%" value={form.cronicas} onChange={(v: any) => upd({ cronicas: v })} />
                  <CheckItem label="Hanseníase" width="48%" value={form.hanseniase} onChange={(v: any) => upd({ hanseniase: v })} />
                  <CheckItem label="Tuberculose" width="48%" value={form.tuberculose} onChange={(v: any) => upd({ tuberculose: v })} />
                  <CheckItem label="Sint. respiratório" width="48%" value={form.sintResp} onChange={(v: any) => upd({ sintResp: v })} />
                  <CheckItem label="Tabagista" width="48%" value={form.tabagista} onChange={(v: any) => upd({ tabagista: v })} />
                  <CheckItem label="Acamado" width="48%" value={form.acamados} onChange={(v: any) => upd({ acamados: v })} />
                  <CheckItem label="Vulnerabilidade social" width="48%" value={form.vulnerSocial} onChange={(v: any) => upd({ vulnerSocial: v })} />
                  <CheckItem label="Acomp. Bolsa Família" width="48%" value={form.acomBolsaFam} onChange={(v: any) => upd({ acomBolsaFam: v })} />
                  <CheckItem label="Saúde mental" width="48%" value={form.saudeMental} onChange={(v: any) => upd({ saudeMental: v })} />
                  <CheckItem label="Usuário álcool" width="48%" value={form.usuarAlcool} onChange={(v: any) => upd({ usuarAlcool: v })} />
                  <CheckItem label="Outras drogas" width="48%" value={form.outrasDrogas} onChange={(v: any) => upd({ outrasDrogas: v })} />
                    <CheckItem label="Pessoa idosa" width="48%" value={form.pessoaIdosa} onChange={(v: any) => upd({ pessoaIdosa: v })} />
                  </View>
                </Secao>
              )}
            </View>

            <View style={isTablet ? styles.column : undefined}>
              <Secao titulo="Controle Ambiental / Vetorial" cor="#10B981" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Ação educativa" width="48%" value={form.acaoEduc} onChange={(v: any) => upd({ acaoEduc: v })} />
                  <CheckItem label="Imóvel com foco" width="48%" value={form.imovelFoco} onChange={(v: any) => upd({ imovelFoco: v })} />
                  <CheckItem label="Ação mecânica" width="48%" value={form.acaoMec} onChange={(v: any) => upd({ acaoMec: v })} />
                  <CheckItem label="Tratamento focal" width="48%" value={form.tratFocal} onChange={(v: any) => upd({ tratFocal: v })} />
                </View>
              </Secao>

              <Secao titulo="Egresso / Outros" cor="#6366F1" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Egresso de internação" width="48%" value={form.egressoInt} onChange={(v: any) => upd({ egressoInt: v })} />
                  <CheckItem label="Convite para atividade" width="48%" value={form.conviteAtiv} onChange={(v: any) => upd({ conviteAtiv: v })} />
                  <CheckItem label="Orientação" width="48%" value={form.orientacao} onChange={(v: any) => upd({ orientacao: v })} />
                  <CheckItem label="Outros" width="48%" value={form.outros} onChange={(v: any) => upd({ outros: v })} />
                </View>
              </Secao>

              <Secao  titulo="Sinais Vitais e Antropometria" cor="#E11D48" abertaInicial={false}>
                <View style={styles.row}>
                  <Input label="Peso (kg)" value={form.peso} onChange={(v: any) => upd({ peso: v })} half numeric />
                  <Input label="Altura (cm)" value={form.altura} onChange={(v: any) => upd({ altura: v })} half numeric />
                </View>
                <View style={styles.row}>
                  <Input label="PA Sistólica" value={form.pressaoSistolica} onChange={(v: any) => upd({ pressaoSistolica: v })} half numeric />
                  <Input label="PA Diastólica" value={form.pressaoDiastolica} onChange={(v: any) => upd({ pressaoDiastolica: v })} half numeric />
                </View>
                <View style={styles.row}>
                  <Input label="Glicemia" value={form.glicemia} onChange={(v: any) => upd({ glicemia: v })} half numeric />
                  <Input label="Temperatura" value={form.temperatura} onChange={(v: any) => upd({ temperatura: v })} half numeric />
                </View>

                <RadioPillGroup
                  label="Tipo de Glicemia"
                  value={form.tipoGlicemia}
                  onChange={(v: any) => upd({ tipoGlicemia: v })}
                  opcoes={TIPO_GLICEMIA_OPTS}
                />
              </Secao>

              {form.gestante && (
                <Secao titulo="Dados Gestacionais" cor="#DB2777">
                  <Input
                    label="DUM"
                    value={form.gestanteDum}
                    onChange={(v: any) => upd({ gestanteDum: v })}
                    placeholder="DD/MM/AAAA"
                  />

                  <View style={styles.row}>
                    <Input label="Idade gestacional" value={form.idadeGestacional} onChange={(v: any) => upd({ idadeGestacional: v })} half numeric />
                    <Input label="Qtd. gestações" value={form.qtdGestacoes} onChange={(v: any) => upd({ qtdGestacoes: v })} half numeric />
                  </View>

                  <View style={styles.row}>
                    <Input label="Qtd. cesáreas" value={form.qtdCesarias} onChange={(v: any) => upd({ qtdCesarias: v })} half numeric />
                    <Input label="Qtd. partos normais" value={form.qtdPartosNormais} onChange={(v: any) => upd({ qtdPartosNormais: v })} half numeric />
                  </View>

                  <View style={styles.row}>
                    <Input label="Gestas prévias" value={form.gestasPrevia} onChange={(v: any) => upd({ gestasPrevia: v })} half numeric />
                    <Input label="Qtd. abortos" value={form.qtdAbortos} onChange={(v: any) => upd({ qtdAbortos: v })} half numeric />
                  </View>

                  <Input label="Partos" value={form.partos} onChange={(v: any) => upd({ partos: v })} numeric />

                  <CheckItem
                    label="Gravidez planejada"
                    width="100%"
                    value={form.gravidezPlanejada}
                    onChange={(v: any) => upd({ gravidezPlanejada: v })}
                  />
                </Secao>
              )}

              <Secao
                titulo="Observações e Assinatura"
                cor="#059669"
                manterMontado
                onAntesFechar={() => {
                  if (assinaturaDesenhada || form.assinaturaBase64) {
                    signatureRef.current?.readSignature();
                  }
                }}
              >
                <Input
                  label="Notas"
                  value={form.obs}
                  onChange={(v: any) => upd({ obs: v })}
                  linhas={4}
                  placeholder="Observações da visita..."
                />

                <Text style={styles.campoLabel}>Assinatura</Text>
                <View style={styles.signatureBox}>
                  <SignatureScreen
                    ref={signatureRef}
                    dataURL={form.assinaturaBase64 || undefined}
                    onBegin={() => {
                      setAssinaturaDesenhada(true);
                      desabilitarScrollAssinatura();
                    }}
                    onEnd={() => {
                      habilitarScrollAssinatura();
                      setTimeout(() => signatureRef.current?.readSignature(), 80);
                    }}
                    onOK={handleAssinaturaOK}
                    onEmpty={handleAssinaturaVazia}
                    onClear={limparAssinatura}
                    webStyle={signatureStyle}
                  />
                </View>

                {(!!form.assinaturaBase64 || assinaturaDesenhada) && (
                  <View style={styles.assinaturaAcoes}>
                    {!!form.assinaturaBase64 && (
                      <Text style={styles.assinaturaStatus}>Assinatura capturada e preservada.</Text>
                    )}

                    <TouchableOpacity
                      style={styles.botaoLimparAssinatura}
                      onPress={limparAssinaturaPeloUsuario}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.textoBotaoLimparAssinatura}>Limpar assinatura</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Secao>
            </View>
          </View>
        </ScrollView>

        {evfamHabilitado && (
          <TouchableOpacity
            style={[styles.fabEvfam, evfam.realizado && styles.fabEvfamPreenchido]}
            onPress={() => setModalEvfam(true)}
            activeOpacity={0.9}
          >
            <Ionicons name={evfam.realizado ? 'shield-checkmark' : 'shield-outline'} size={22} color="#fff" />
            <Text style={styles.fabEvfamTexto}>{evfam.realizado ? `EVFAM ${evfam.pontuacao}` : 'EVFAM'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnConfirmar} onPress={() => setModalDesfecho(true)} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>FINALIZAR VISITA</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <EvfamModal
        visivel={modalEvfam}
        moradores={moradores}
        valor={evfam}
        onFechar={() => setModalEvfam(false)}
        onSalvar={(novoEvfam) => {
          setEvfam(novoEvfam);
          setModalEvfam(false);
        }}
      />

      <Modal visible={modalDesfecho} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Desfecho das Visitas</Text>

            <ScrollView>
              {moradores.length === 0 ? (
                <Text style={styles.mutedTxt}>Nenhum morador selecionado. A visita será salva sem identificação.</Text>
              ) : (
                moradores.map((m) => (
                  <View key={m.id} style={styles.desfechoCard}>
                    <Text style={styles.desfechoNome}>{m.nome}</Text>
                    <View style={styles.desfechoRow}>
                      {[1, 2, 3].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.radioBtn, styles.desfechoBtn, desfechos[m.id] === v && styles.radioBtnOn]}
                          onPress={() => setDesfechos({ ...desfechos, [m.id]: v })}
                        >
                          <Text style={[styles.radioTxt, desfechos[m.id] === v && styles.radioTxtOn]}>
                            {v === 1 ? 'Realizada' : v === 2 ? 'Recusada' : 'Ausente'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.btnConfirmar, { marginTop: 10 }]}
              onPress={confirmarSalvar}
            >
              <Text style={styles.btnConfirmarTxt}>CONFIRMAR E SALVAR NO BANCO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const signatureStyle = `
  .m-signature-pad--footer { display: none; }
  .m-signature-pad { box-shadow: none; border: none; }
  body, html {
    width: 100%;
    height: 200px;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`;

const getStyles = (theme: any) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, backgroundColor: theme.background },
    headerBack: { paddingRight: 8 },
    headerTitulo: { flex: 1, fontSize: 22, fontWeight: '800', color: theme.text, textAlign: 'center' },
    badgeTablet: { backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: '800', color: theme.info },

    assinaturaStatus: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      color: '#059669',
    },
    assinaturaAcoes: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    botaoLimparAssinatura: {
      paddingVertical: 9,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#DC2626',
      backgroundColor: '#FFF5F5',
    },
    textoBotaoLimparAssinatura: {
      color: '#DC2626',
      fontWeight: '800',
      fontSize: 12,
    },
    scroll: { flex: 1 },
    tabletWrapper: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 8,
      paddingBottom: 12,
    },
    mobileWrapper: {
      flexDirection: 'column',
      paddingBottom: 12,
    },
    column: { flex: 1 },

    secao: { backgroundColor: theme.card, marginTop: 14, marginHorizontal: 8, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
    secaoHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      borderLeftWidth: 6,
      backgroundColor: theme.cardSecondary,
    },
    secaoTitulo: { fontSize: 14, fontWeight: '800', color: theme.text },
    secaoBody: { padding: 18, gap: 14 },
    secaoBodyOculta: {
      position: 'absolute',
      left: -10000,
      top: 0,
      width: '100%',
      opacity: 0,
    },

    row: {
      flexDirection: 'row',
      gap: 10,
    },

    inputWrap: { marginBottom: 6 },
    campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, backgroundColor: theme.cardSecondary, color: theme.text },
    readonlyVal: { backgroundColor: theme.cardSecondary, padding: 14, borderRadius: 14, color: theme.textMuted, borderWidth: 1, borderColor: theme.border, marginTop: 4 },

    radioGroup: { gap: 8, marginTop: 6 },
    radioBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioBtnOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    radioTxt: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    radioTxtOn: {
      color: '#fff',
    },

    checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
    checkboxOn: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },

    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    resultadosBuscaBox: { maxHeight: 220, borderWidth: 1, borderColor: theme.border, borderRadius: 16, marginTop: 8, overflow: 'hidden', backgroundColor: theme.card },
    itemBusca: { paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: theme.border },
    itemBuscaNome: { fontSize: 14, fontWeight: '700', color: theme.text },
    itemBuscaDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 },

    cardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardSecondary, padding: 12, borderRadius: 16, marginTop: 8, gap: 10, borderWidth: 1, borderColor: theme.border },
    cardMiniTit: { fontSize: 13, fontWeight: '800', color: theme.text },
    cardMiniDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 },

    subTitulo: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    mutedTxt: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', lineHeight: 18 },

    signatureBox: { height: 200, borderWidth: 1, borderColor: theme.border, borderRadius: 16, overflow: 'hidden', marginTop: 8, backgroundColor: '#fff' },

    fabEvfam: {
      position: 'absolute',
      right: 18,
      bottom: 92,
      backgroundColor: '#2563EB',
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 20,
    },
    fabEvfamPreenchido: {
      backgroundColor: '#059669',
    },
    fabEvfamTexto: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.2,
    },

    footer: {
      padding: 16,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    btnConfirmar: { backgroundColor: theme.primary, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
    btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },

    modalCardEvfam: {
      backgroundColor: theme.card,
      padding: 18,
      borderRadius: 22,
      width: '100%',
      maxHeight: '88%',
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalHeaderEvfam: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    modalTituloEvfam: {
      fontSize: 20,
      fontWeight: '900',
      color: theme.text,
    },
    modalSubtituloEvfam: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
      fontWeight: '700',
    },
    modalCloseBtn: {
      width: 38,
      height: 38,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    evfamBloco: {
      marginBottom: 12,
      gap: 8,
    },
    evfamPessoaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSecondary,
    },
    evfamPessoaItemOn: {
      borderColor: theme.primary,
      backgroundColor: theme.infoBg,
    },
    evfamPessoaNome: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.text,
    },
    evfamPessoaDesc: {
      fontSize: 11,
      color: theme.textMuted,
      marginTop: 2,
    },
    evfamResumo: {
      padding: 14,
      borderRadius: 18,
      backgroundColor: theme.infoBg,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 12,
    },
    evfamResumoTitulo: {
      color: theme.primary,
      fontWeight: '900',
      fontSize: 16,
    },
    evfamResumoDesc: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
    },
    evfamGrupoTitulo: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.text,
      marginTop: 4,
      marginBottom: 8,
    },
    evfamPergunta: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    evfamPerguntaTexto: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      lineHeight: 18,
    },
    evfamOpcaoRow: {
      flexDirection: 'row',
      gap: 8,
    },
    evfamOpcao: {
      flex: 1,
      minHeight: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSecondary,
    },
    evfamOpcaoSim: {
      backgroundColor: '#DC2626',
      borderColor: '#DC2626',
    },
    evfamOpcaoNao: {
      backgroundColor: '#059669',
      borderColor: '#059669',
    },
    evfamOpcaoTexto: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '900',
    },
    evfamOpcaoTextoOn: {
      color: '#fff',
    },
    evfamFooter: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    btnCancelarEvfam: {
      flex: 1,
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSecondary,
    },
    btnCancelarEvfamTxt: {
      color: theme.textSecondary,
      fontWeight: '900',
      fontSize: 13,
    },
    btnSalvarEvfam: {
      flex: 1.4,
      minHeight: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    btnSalvarEvfamTxt: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 13,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    modalCard: {
      backgroundColor: theme.card,
      padding: 20,
      borderRadius: 15,
      width: '100%',
      maxHeight: '80%',
    },
    modalTitulo: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 15,
      color: theme.text,
    },
    desfechoCard: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    desfechoNome: {
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    desfechoRow: {
      flexDirection: 'row',
      gap: 8,
    },
    desfechoBtn: {
      flex: 1,
      minHeight: 42,
    },
  });