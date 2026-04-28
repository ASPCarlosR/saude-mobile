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

function Secao({ titulo, children, cor = '#0A4F6E', abertaInicial = true }: any) {
  const [aberta, setAberta] = useState(abertaInicial);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={styles.secao}>
      <TouchableOpacity
        style={[styles.secaoHeader, { borderLeftColor: cor, backgroundColor: theme.cardSecondary }]}
        onPress={() => setAberta(!aberta)}
        activeOpacity={0.8}
      >
        <Text style={styles.secaoTitulo}>{titulo}</Text>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
      </TouchableOpacity>
      {aberta && <View style={styles.secaoBody}>{children}</View>}
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

export default function VisitaDomiciliarScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768 && width > height;
  const signatureRef = useRef<SignatureViewRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { moradoresParam, microAreaParam } = useLocalSearchParams<{
    moradoresParam?: string;
    microAreaParam?: string;
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

  const [assinaturaDesenhada, setAssinaturaDesenhada] = useState(false);

  const upd = (campo: Partial<FormVisita>) => setForm((p) => ({ ...p, ...campo }));

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

  const selecionarPaciente = (p: any) => {
    if (moradores.some((m) => m.id === String(p.id))) {
      Alert.alert('Aviso', 'Morador já selecionado.');
      return;
    }

    const novoMorador: EstadoMorador = {
      id: String(p.id),
      guid: p.guid || '',
      nome: p.nome,
      cns: p.cns || p.cpf,
      idade: calcularIdadeTexto(p.dtnasc || p.dtNasc || p.dataNascimento),
      condicoes: calcularCondicoesMorador(p),
    };

    setMoradores((prev) => [...prev, novoMorador]);
    setBuscaPaciente('');
    setPacientesEncontrados([]);

    if (p.microArea) {
      upd({ microArea: String(p.microArea) });
    }
  };

  const formatarDataParaBanco = (dataBR: string) => {
    const partes = dataBR.split('/');
    return partes.length === 3
      ? `${partes[2]}-${partes[1]}-${partes[0]}`
      : new Date().toISOString().split('T')[0];
  };

  const getCondicoesEfetivas = (m?: EstadoMorador): Record<CampoCondicaoVisita, boolean> => {
    const cond = (m?.condicoes || {}) as Partial<Record<CampoCondicaoVisita, boolean>>;

    return {
      gestante: form.gestante || !!cond.gestante,
      puerpera: form.puerpera || !!cond.puerpera,
      recemNasc: form.recemNasc || !!cond.recemNasc,
      crianca: form.crianca || !!cond.crianca,
      desnutricao: form.desnutricao || !!cond.desnutricao,
      reabilitacao: form.reabilitacao || !!cond.reabilitacao,
      hipertensao: form.hipertensao || !!cond.hipertensao,
      diabetes: form.diabetes || !!cond.diabetes,
      asma: form.asma || !!cond.asma,
      dpoc: form.dpoc || !!cond.dpoc,
      cancer: form.cancer || !!cond.cancer,
      cronicas: form.cronicas || !!cond.cronicas,
      hanseniase: form.hanseniase || !!cond.hanseniase,
      tuberculose: form.tuberculose || !!cond.tuberculose,
      sintResp: form.sintResp || !!cond.sintResp,
      tabagista: form.tabagista || !!cond.tabagista,
      acamados: form.acamados || !!cond.acamados,
      vulnerSocial: form.vulnerSocial || !!cond.vulnerSocial,
      acomBolsaFam: form.acomBolsaFam || !!cond.acomBolsaFam,
      saudeMental: form.saudeMental || !!cond.saudeMental,
      usuarAlcool: form.usuarAlcool || !!cond.usuarAlcool,
      outrasDrogas: form.outrasDrogas || !!cond.outrasDrogas,
      pessoaIdosa: form.pessoaIdosa || !!cond.pessoaIdosa,
    };
  };

  const alturaDigitada = parseFloat(form.altura.replace(',', '.')) || 0;
  const alturaParaEnviar = alturaDigitada > 10 ? alturaDigitada / 100 : alturaDigitada;

  const salvarVisitas = async (assinatura?: string) => {
    const microAreaFinal = form.microArea || String(profissional?.microArea || '');

    if (!microAreaFinal) {
      return Alert.alert('Erro', 'Informe a microárea.');
    }

    setSalvando(true);

    try {
      const { v4: uuidv4 } = await import('uuid');
      const dataSql = formatarDataParaBanco(form.data);

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
            SDVisitaDomiciliarLatitude: null,
            SDVisitaDomiciliarLongitude: null,
            SDVisitaDomiciliarAssinaturaPaciente: assinatura || '',

            SDVisitaDomiciliarProfId: profissional?.id || null,
            SDVisitaDomiciliarUnidadeId: profissional?.unidadeId || null,
            SDVisitaDomiciliarEquipeId: profissional?.equipeId || null,
            SDVisitaDomiciliarCBOProfId: profissional?.cboCodigo || null,
          });
        };

        if (moradores.length > 0) {
          moradores.forEach((m) => {
            operacoes.push(visitaCollection.prepareCreate((r: any) => preencherFicha(r, m)));
          });
        } else {
          operacoes.push(visitaCollection.prepareCreate((r: any) => preencherFicha(r)));
        }

        await database.batch(...operacoes);
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

              <Secao titulo="Acompanhamento / Saúde" cor="#D97706" abertaInicial={false}>
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

              <Secao titulo="Sinais Vitais e Antropometria" cor="#E11D48">
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

              <Secao titulo="Observações e Assinatura" cor="#059669">
                <Input
                  label="Notas"
                  value={form.obs}
                  onChange={(v: any) => upd({ obs: v })}
                  linhas={4}
                  placeholder="Observações da visita..."
                />

                <Text style={styles.campoLabel}>Assinatura</Text>
                <View
                  style={styles.signatureBox}
                  onTouchStart={() => setScrollHabilitado(false)}
                  onTouchEnd={() => setScrollHabilitado(true)}
                >
                  <SignatureScreen
                    ref={signatureRef}
                    onBegin={() => setAssinaturaDesenhada(true)}
                    onOK={(img) => salvarVisitas(img)}
                    onEmpty={() => salvarVisitas('')}
                    onClear={() => setAssinaturaDesenhada(false)}
                    webStyle={signatureStyle}
                  />
                </View>
              </Secao>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnConfirmar} onPress={() => setModalDesfecho(true)} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>FINALIZAR VISITA</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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

    footer: {
      padding: 16,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    btnConfirmar: { backgroundColor: theme.primary, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
    btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },

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