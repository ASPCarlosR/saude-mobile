import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/index';
import { validarCPF, validarCNS } from '../../src/utils/validacoesEsus';
import { database, pessoaCollection } from '../../src/db/index';
import { gerarGUID, dataAtualDDMMYYYY, dataHoraAtual } from '../../src/utils/conversoes';
import { Colors } from './colors';
import { resolveTenantUrl } from '../../src/config';

interface MunicipioOption {
  id: number;
  nome: string;
}

interface FormCadIndividual {
  data: string; dataAtualizacao: string;
  cns: string; cpf: string; rg: string; nis: string;
  nome: string; usaNomeSocial: boolean; nomeSocial: string;
  dtNasc: string; sexo: 'M' | 'F' | ''; racaCor: string; etnia: string;
  microArea: string; foraArea: boolean;
  municNasc: string; municNascDesc: string; municNascId: number | null;
  maeDesconhecida: boolean; nomeMae: string; paiDesconhecido: boolean; nomePai: string;
  nacionalidade: string; paisOrigem: string;
  dtNaturalizacao: string; portariaNaturalizacao: string; dtEntradaBrasil: string;
  celular: string;
  parentesco: string; estadoCivil: string; ocupacao: string;
  freqEscola: 'S' | 'N' | ''; escolaridade: string; situacaoTrabalho: string;
  cuidadorTradicional: 'S' | 'N' | ''; grupoComunitario: 'S' | 'N' | ''; planoSaude: 'S' | 'N' | '';
  povoTradicional: 'S' | 'N' | ''; povoTradicionalQual: string;
  orientacaoSexual: 'S' | 'N' | ''; orientacaoSexualQual: string;
  identidadeGenero: 'S' | 'N' | ''; identidadeGeneroQual: string;
  deficiencia: 'S' | 'N' | ''; mobilidadeReduzida: 'S' | 'N' | ''; doadorSangue: 'S' | 'N' | '';
  defAuditiva: boolean; defVisual: boolean; defFisica: boolean; defIntelectual: boolean; defAutismo: boolean; defOutra: boolean;
  gestante: 'S' | 'N' | ''; peso: string; fumante: 'S' | 'N' | '';
  alcool: 'S' | 'N' | ''; outrasDrogas: 'S' | 'N' | '';
  hipertensao: 'S' | 'N' | ''; diabetes: 'S' | 'N' | '';
  avcDerrame: 'S' | 'N' | ''; infarto: 'S' | 'N' | ''; doencaCardiaca: 'S' | 'N' | '';
  doencaCoracaoFamilia: 'S' | 'N' | ''; sofreuQueda: 'S' | 'N' | '';
  doencaRins: 'S' | 'N' | ''; doencaResp: 'S' | 'N' | ''; email: string;
  hanseniase: 'S' | 'N' | ''; tuberculose: 'S' | 'N' | ''; cancer: 'S' | 'N' | '';
  internacao12m: 'S' | 'N' | ''; probSaudeMental: 'S' | 'N' | '';
  acamado: 'S' | 'N' | ''; domiciliado: 'S' | 'N' | '';
  praticasIntegrativas: 'S' | 'N' | ''; plantasMedicinais: 'S' | 'N' | '';
  triaAlimentoAcabou: 'S' | 'N' | ''; triaComeuAlimento: 'S' | 'N' | '';
  sitRua: 'S' | 'N' | ''; tempoSitRua: string;
  recebeBeneficio: 'S' | 'N' | ''; refFamiliar: 'S' | 'N' | '';
  vezesAlimenta: string; origemAlimento: string; higPessoal: 'S' | 'N' | ''; ocupacaoCboId: string;
  termoRecusa: boolean; observacao: string;
  cnes: string; unidadeNome: string; equipeNome: string; equipeIne: string; profissionalNome: string;
}

const FORM_INICIAL: FormCadIndividual = {
  data: dataAtualDDMMYYYY(), dataAtualizacao: dataHoraAtual(),
  cns: '', cpf: '', rg: '', nis: '',
  nome: '', usaNomeSocial: false, nomeSocial: '',
  dtNasc: '', sexo: '', racaCor: '', etnia: '',
  microArea: '', foraArea: false,
  municNasc: '', municNascDesc: '', municNascId: null,
  maeDesconhecida: false, nomeMae: '',
  paiDesconhecido: false, nomePai: '',
  nacionalidade: '1', paisOrigem: '31',
  dtNaturalizacao: '', portariaNaturalizacao: '', dtEntradaBrasil: '',
  celular: '', email: '',
  parentesco: '', estadoCivil: '', ocupacao: '', freqEscola: '', escolaridade: '',
  situacaoTrabalho: '', cuidadorTradicional: '', grupoComunitario: '', planoSaude: '',
  povoTradicional: 'N', povoTradicionalQual: '',
  orientacaoSexual: 'N', orientacaoSexualQual: '',
  identidadeGenero: 'N', identidadeGeneroQual: '',
  ocupacaoCboId: '',
  deficiencia: 'N', mobilidadeReduzida: '', doadorSangue: '',
  defAuditiva: false, defVisual: false, defFisica: false,
  defIntelectual: false, defAutismo: false, defOutra: false,
  gestante: '', peso: '', fumante: '', alcool: '', outrasDrogas: '',
  hipertensao: '', diabetes: '', avcDerrame: '', infarto: '', doencaCardiaca: '',
  doencaCoracaoFamilia: '', sofreuQueda: '',
  doencaRins: '', doencaResp: '', hanseniase: '', tuberculose: '', cancer: '',
  internacao12m: '', probSaudeMental: '', acamado: '', domiciliado: '',
  praticasIntegrativas: '', plantasMedicinais: '',
  triaAlimentoAcabou: '', triaComeuAlimento: '',
  sitRua: 'N', tempoSitRua: '', recebeBeneficio: '', refFamiliar: '',
  vezesAlimenta: '', origemAlimento: '', higPessoal: '',
  termoRecusa: false, observacao: '',
  cnes: '', unidadeNome: '', equipeNome: '', equipeIne: '', profissionalNome: '',
};

const OPTS = {
  racaCor: [{ v: '1', l: 'Branca' }, { v: '2', l: 'Preta' }, { v: '3', l: 'Amarela' }, { v: '4', l: 'Parda' }, { v: '5', l: 'Indígena' }],
  nacionalidade: [{ v: '1', l: 'Brasileira' }, { v: '2', l: 'Naturalizado' }, { v: '3', l: 'Estrangeiro' }],
  paisOrigem: [{ v: '31', l: 'Brasil' }, { v: '12', l: 'Argentina' }, { v: '13', l: 'Bolívia' }, { v: '60', l: 'Chile' }, { v: '170', l: 'Colômbia' }, { v: '178', l: 'Paraguai' }, { v: '218', l: 'Uruguai' }, { v: '222', l: 'Venezuela' }, { v: '999', l: 'Outro' }],
  estadoCivil: [{ v: '01', l: 'Solteiro(a)' }, { v: '02', l: 'Casado(a) / Convívio' }, { v: '03', l: 'Viúvo(a)' }, { v: '04', l: 'Divorciado(a) / Separado(a)' }, { v: '09', l: 'Outro' }],
  parentesco: [{ v: '137', l: 'Cônjuge/Companheiro(a)' }, { v: '138', l: 'Filho(a)' }, { v: '139', l: 'Enteado(a)' }, { v: '140', l: 'Neto(a)/Bisneto(a)' }, { v: '141', l: 'Pai/Mãe' }, { v: '142', l: 'Sogro(a)' }, { v: '143', l: 'Irmão/Irmã' }, { v: '144', l: 'Genro/Nora' }, { v: '145', l: 'Outro Parente' }, { v: '146', l: 'Não Parente' }],
  escolaridade: [{ v: '01', l: 'Nenhum' }, { v: '02', l: 'Creche' }, { v: '08', l: 'Pré-escola' }, { v: '03', l: 'Ensino fund. 1ª a 4ª' }, { v: '04', l: 'Ensino fund. 5ª a 8ª' }, { v: '10', l: 'Ensino fund. completo' }, { v: '05', l: 'Ensino médio' }, { v: '06', l: 'Superior / Especialização' }, { v: '16', l: 'Alfabetização adultos' }],
  sitTrabalho: [{ v: '66', l: 'Empregador' }, { v: '67', l: 'Assalariado com carteira' }, { v: '68', l: 'Assalariado sem carteira' }, { v: '69', l: 'Autônomo com previdência' }, { v: '70', l: 'Autônomo sem previdência' }, { v: '71', l: 'Aposentado/Pensionista' }, { v: '72', l: 'Desempregado' }, { v: '73', l: 'Não Trabalha' }, { v: '147', l: 'Servidor público / Militar' }, { v: '74', l: 'Outro' }],
  peso: [{ v: '21', l: 'Abaixo do peso' }, { v: '22', l: 'Peso adequado' }, { v: '23', l: 'Acima do peso' }],
  orientacao: [{ v: '148', l: 'Heterossexual' }, { v: '196', l: 'Gay' }, { v: '197', l: 'Lésbica' }, { v: '154', l: 'Bissexual' }, { v: '198', l: 'Assexual' }, { v: '199', l: 'Panssexual' }, { v: '155', l: 'Outro' }],
  genero: [{ v: '200', l: 'Homem cisgênero' }, { v: '201', l: 'Mulher cisgênero' }, { v: '156', l: 'Travesti' }, { v: '149', l: 'Homem transgênero' }, { v: '150', l: 'Mulher transgênero' }, { v: '203', l: 'Não-binário' }, { v: '151', l: 'Outro' }],
  tempoRua: [{ v: '17', l: '< 6 meses' }, { v: '18', l: '6 a 12 meses' }, { v: '19', l: '1 a 5 anos' }, { v: '20', l: '> 5 anos' }],
};

function Secao({ titulo, children, cor = '#0A4F6E', abertaInicial = true, temErro = false }: any) {
  const [aberta, setAberta] = useState(abertaInicial);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={styles.secao}>
      <TouchableOpacity
        style={[
          styles.secaoHeader,
          { borderLeftColor: cor, backgroundColor: temErro ? theme.dangerBg : theme.cardSecondary }
        ]}
        onPress={() => setAberta(!aberta)}
        activeOpacity={0.7}
      >
        <Text style={[styles.secaoTitulo, temErro && { color: theme.danger }]}>{titulo}</Text>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
      </TouchableOpacity>
      {aberta && <View style={styles.secaoBody}>{children}</View>}
    </View>
  );
}

function Input({ label, value, onChange, numeric, half, readonly, placeholder, linhas = 1, erro }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={[styles.inputWrap, half && { flex: 1 }]}>
      <Text style={[styles.campoLabel, erro && { color: theme.danger }]}>{label}</Text>
      {readonly ? (
        <Text style={styles.readonlyVal}>{value || '—'}</Text>
      ) : (
        <TextInput
          style={[
            styles.input,
            linhas > 1 && { height: 80, textAlignVertical: 'top' },
            erro && styles.inputErro,
            { color: theme.text }
          ]}
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholder={placeholder}
          multiline={linhas > 1}
          numberOfLines={linhas}
          placeholderTextColor={theme.textMuted}
        />
      )}
      {erro && <Text style={styles.erroTxt}>{erro}</Text>}
    </View>
  );
}

function CheckItem({ label, value, onChange, width = '100%' }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.checkItem, { width }]}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, value && styles.checkboxOn]}>
        {value && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function RadioSimNao({ label, value, onChange, half, disabled }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  return (
    <View style={[styles.inputWrap, half && { flex: 1 }, disabled && { opacity: 0.5 }]}>
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity
          disabled={disabled}
          style={[styles.radioBtn, value === 'S' && styles.radioBtnOn, { flex: 1 }]}
          onPress={() => onChange('S')}
        >
          <Text style={[styles.radioTxt, value === 'S' && styles.radioTxtOn]}>Sim</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled}
          style={[styles.radioBtn, value === 'N' && styles.radioBtnOn, { flex: 1 }]}
          onPress={() => onChange('N')}
        >
          <Text style={[styles.radioTxt, value === 'N' && styles.radioTxtOn]}>Não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const formatarDataISO = (dataRaw: string | Date | null | undefined): string => {
  if (!dataRaw) return '';
  const str = String(dataRaw);

  if (str.includes('/')) return str;

  if (str.includes('-')) {
    const apenasData = str.split('T')[0];
    const partes = apenasData.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return str;
};

export default function CadastroIndividualScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768 && width > height;
  const { id } = useLocalSearchParams<{ id?: string }>();

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const auth: any = useAuthStore();
  const { profissional, unidade, equipe } = auth;
  const municipioSlug =
    auth?.municipioSlug ||
    auth?.municipio?.slug ||
    auth?.tenant?.slug ||
    auth?.user?.municipioSlug ||
    '';

  const [form, setForm] = useState<FormCadIndividual>(FORM_INICIAL);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const [modalSelect, setModalSelect] = useState<{
    visible: boolean;
    titulo: string;
    opcoes: any[];
    campo: keyof FormCadIndividual | '';
  }>({ visible: false, titulo: '', opcoes: [], campo: '' });

  const [modalMunic, setModalMunic] = useState(false);
  const [buscaMunic, setBuscaMunic] = useState('');
  const [municipiosEncontrados, setMunicipiosEncontrados] = useState<MunicipioOption[]>([]);
  const [carregandoMunic, setCarregandoMunic] = useState(false);

  const debounceBuscaMunic = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) carregarPessoaLocal(id);
  }, [id]);

  useEffect(() => {
    if (modalMunic) {
      setBuscaMunic(form.municNascDesc || '');
    }
  }, [modalMunic, form.municNascDesc]);

  useEffect(() => {
    if (!modalMunic) return;

    if (debounceBuscaMunic.current) {
      clearTimeout(debounceBuscaMunic.current);
    }

    debounceBuscaMunic.current = setTimeout(() => {
      buscarMunicipiosRemoto(buscaMunic);
    }, 400);

    return () => {
      if (debounceBuscaMunic.current) {
        clearTimeout(debounceBuscaMunic.current);
      }
    };
  }, [buscaMunic, modalMunic]);

  async function buscarMunicipiosRemoto(termo: string) {
    const termoLimpo = termo?.trim();

    if (!termoLimpo || termoLimpo.length < 2) {
      setMunicipiosEncontrados([]);
      setCarregandoMunic(false);
      return;
    }

    try {
      setCarregandoMunic(true);

      const auth: any = useAuthStore.getState();

      const municipioSlug =
        auth?.municipioSlug ||
        auth?.municipio?.slug ||
        auth?.tenant?.slug ||
        auth?.user?.municipioSlug ||
        '';

      const token =
        auth?.token ||
        auth?.accessToken ||
        auth?.userToken ||
        '';

      const baseUrl = 'http://172.20.10.2:3000';
      const url = `${baseUrl}/api/sync/municipios?termo=${encodeURIComponent(termoLimpo)}`;

      console.log('[MUNICIPIO AUTOCOMPLETE] URL:', url);
      console.log('[MUNICIPIO AUTOCOMPLETE] slug:', municipioSlug);
      console.log('[MUNICIPIO AUTOCOMPLETE] tem token?', !!token);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-municipio-slug': municipioSlug,
        },
      });

      console.log('[MUNICIPIO AUTOCOMPLETE] STATUS:', response.status);

      const json = await response.json();
      console.log('[MUNICIPIO AUTOCOMPLETE] BODY:', json);

      const dados = Array.isArray(json?.dados) ? json.dados : [];
      setMunicipiosEncontrados(dados);
    } catch (error) {
      console.log('[MUNICIPIO AUTOCOMPLETE] Erro:', error);
      setMunicipiosEncontrados([]);
    } finally {
      setCarregandoMunic(false);
    }
  }

  async function carregarPessoaLocal(pessoaId: string) {
    try {
      const p = await pessoaCollection.find(pessoaId);

      let extras: any = {};
      try {
        if ((p as any).dados) {
          extras =
            typeof (p as any).dados === 'string'
              ? JSON.parse((p as any).dados)
              : (p as any).dados;
        }
      } catch (e) { }

      const municNascIdCarregado =
        (p as any).municNascId ??
        extras.municNascId ??
        null;

      const municNascDescCarregado =
        (p as any).municNascDesc ??
        extras.municNascDesc ??
        (p as any).municNasc ??
        extras.municNasc ??
        '';

      setForm(prev => ({
        ...prev,
        nome: p.nome || '',
        nomeSocial: (p as any).nomeSocial || extras.nomeSocial || '',
        usaNomeSocial: (p as any).informaNomeSocial || false,
        cpf: p.cpf || '',
        cns: p.cns || '',
        rg: (p as any).rg || extras.rg || '',
        nis: (p as any).nisPisPasep || extras.nisPisPasep || '',
        dtNasc: formatarDataISO(p.dtNasc) || '',
        sexo: (p.sexo as any) || '',
        racaCor: (p as any).racaCor ? String((p as any).racaCor) : '',
        etnia: (p as any).etnia || '',
        microArea: p.microArea || '',
        foraArea: p.foraArea || false,

        municNasc: municNascDescCarregado,
        municNascId: municNascIdCarregado,
        municNascDesc: municNascDescCarregado,

        data: formatarDataISO(p.dataCadastro) || dataAtualDDMMYYYY(),
        dataAtualizacao: formatarDataISO(p.dataAtualizacao) || dataHoraAtual(),
        nomeMae: (p as any).nomeMae || extras.nomeMae || '',
        maeDesconhecida: (p as any).maeDesconhecida || false,
        nomePai: (p as any).nomePai || extras.nomePai || '',
        paiDesconhecido: (p as any).paiDesconhecido || false,
        estadoCivil: (p as any).estadoCivil || '',
        nacionalidade: (p as any).nacionalidade || '1',
        dtNaturalizacao: formatarDataISO((p as any).dtNaturalizacao) || '',
        portariaNaturalizacao: (p as any).portariaNaturalizacao || '',
        dtEntradaBrasil: formatarDataISO((p as any).dtEntradaBrasil) || '',
        paisOrigem: (p as any).paisOrigem ? String((p as any).paisOrigem) : '31',
        parentesco: (p as any).parentesco ? String((p as any).parentesco) : '',
        celular: p.celular || '',
        email: (p as any).email || '',
        freqEscola: (p.freqEscola as any) || '',
        escolaridade: (p as any).escolaridade || '',
        situacaoTrabalho: (p as any).situacaoTrabalho ? String((p as any).situacaoTrabalho) : '',
        cuidadorTradicional: (p as any).freqCurandeiro || '',
        grupoComunitario: (p as any).grupoComunitario || '',
        planoSaude: (p as any).convenio || '',
        povoTradicional: (p as any).membroComunidTrad || 'N',
        povoTradicionalQual: (p as any).povoComunidade ? String((p as any).povoComunidade) : '',
        orientacaoSexual: (p as any).informaOrientSexual || 'N',
        orientacaoSexualQual: (p as any).orientacaoSexual ? String((p as any).orientacaoSexual) : '',
        identidadeGenero: (p as any).informaIdentGenero || 'N',
        identidadeGeneroQual: (p as any).identGenero ? String((p as any).identGenero) : '',
        ocupacao: (p as any).cboId || '',
        deficiencia: (p as any).deficiencia || 'N',
        mobilidadeReduzida: (p as any).mobilidadeReduzida || '',
        doadorSangue: (p as any).doadorSangue || '',
        defAuditiva: (p as any).deficienciaAuditiva || false,
        defVisual: (p as any).deficienciaVisual || false,
        defFisica: (p as any).deficienciaFisica || false,
        defIntelectual: (p as any).deficienciaIntelec || false,
        defAutismo: (p as any).autismo || false,
        defOutra: (p as any).deficienciaOutra || false,
        gestante: (p as any).gestante ? 'S' : 'N',
        hipertensao: (p as any).hipertensao ? 'S' : 'N',
        diabetes: (p as any).diabetes ? 'S' : 'N',
        acamado: (p as any).acamado ? 'S' : 'N',
        domiciliado: (p as any).domiciliado ? 'S' : 'N',
        fumante: (p as any).fumante || '',
        alcool: (p as any).dependenteAlcool || '',
        outrasDrogas: (p as any).dependenteDroga || '',
        avcDerrame: (p as any).avcDerrame || '',
        infarto: (p as any).infarto || '',
        doencaCardiaca: (p as any).doencaCardiaca || '',
        doencaCoracaoFamilia: (p as any).doencaCoracaoFamilia || '',
        sofreuQueda: (p as any).sofreuQueda || '',
        doencaRins: (p as any).doencaRins || '',
        doencaResp: (p as any).doencaResp || '',
        hanseniase: (p as any).hanseniase || '',
        tuberculose: (p as any).tuberculose || '',
        cancer: (p as any).cancer || '',
        internacao12m: (p as any).internacao || '',
        probSaudeMental: (p as any).tratPsiquiatra || '',
        praticasIntegrativas: (p as any).outrasPraticas || '',
        plantasMedicinais: (p as any).plantasMedicinais || '',
        triaAlimentoAcabou: (p as any).triaAlimentoAcabou || '',
        triaComeuAlimento: (p as any).triaComeuAlimento || '',
        sitRua: (p as any).situacaoRua || 'N',
        tempoSitRua: (p as any).tempoSituacaoRua ? String((p as any).tempoSituacaoRua) : '',
        vezesAlimenta: (p as any).alimenta ? String((p as any).alimenta) : '',
        origemAlimento: (p as any).origemAlimento || '',
        recebeBeneficio: (p as any).recebeBeneficio || '',
        refFamiliar: (p as any).referenciaFamiliar || '',
        higPessoal: (p as any).higPessoal || '',
        termoRecusa: (p as any).termoRecusa || false,
        observacao: (p as any).observacao || '',
        unidadeNome: (p as any).unidadeNome || extras.unidadeNome || unidade?.nome || '',
        cnes: (p as any).cnes || extras.cnes || profissional?.cnes || unidade?.cnes || '',
        profissionalNome: extras.profissionalNome || profissional?.nome || '',
        equipeNome: extras.equipeNome || equipe?.nome || '',
        equipeIne: extras.equipeIne || equipe?.ine || '',
      }));
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível carregar os dados deste cadastro.');
    }
  }

  const upd = (campo: Partial<FormCadIndividual>) => {
    setForm(prev => {
      const novo = { ...prev, ...campo };

      if ('usaNomeSocial' in campo && !novo.usaNomeSocial) novo.nomeSocial = '';
      if ('maeDesconhecida' in campo && novo.maeDesconhecida) novo.nomeMae = '';
      if ('paiDesconhecido' in campo && novo.paiDesconhecido) novo.nomePai = '';
      if ('sexo' in campo && novo.sexo === 'M') novo.gestante = 'N';

      if ('deficiencia' in campo && novo.deficiencia === 'N') {
        novo.defAuditiva = false;
        novo.defVisual = false;
        novo.defFisica = false;
        novo.defIntelectual = false;
        novo.defAutismo = false;
        novo.defOutra = false;
      }

      if ('sitRua' in campo && novo.sitRua === 'N') {
        novo.tempoSitRua = '';
        novo.recebeBeneficio = '';
        novo.refFamiliar = '';
        novo.vezesAlimenta = '';
        novo.origemAlimento = '';
        novo.higPessoal = '';
      }

      return novo;
    });

    const chave = Object.keys(campo)[0];
    if (chave && erros[chave]) {
      setErros(e => {
        const ne = { ...e };
        delete ne[chave];
        return ne;
      });
    }
  };

  const handleChangeCPF = (v: string) => {
    let l = v.replace(/\D/g, '').substring(0, 11);
    if (l.length > 9) l = l.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    else if (l.length > 6) l = l.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    else if (l.length > 3) l = l.replace(/(\d{3})(\d{3})/, '$1.$2');
    upd({ cpf: l });
  };

  const handleChangeDataNasc = (v: string) => {
    let l = v.replace(/\D/g, '').substring(0, 8);
    if (l.length > 4) l = l.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
    else if (l.length > 2) l = l.replace(/(\d{2})(\d{2})/, '$1/$2');
    upd({ dtNasc: l });
  };

  const abrirSelect = (titulo: string, opcoes: any[], campo: keyof FormCadIndividual) =>
    setModalSelect({ visible: true, titulo, opcoes, campo });

  const toggleTodasCondicoesSaude = (valor: 'S' | 'N') => {
    setForm(prev => ({
      ...prev,
      gestante: prev.sexo === 'M' ? 'N' : valor,
      fumante: valor,
      alcool: valor,
      outrasDrogas: valor,
      hipertensao: valor,
      diabetes: valor,
      avcDerrame: valor,
      infarto: valor,
      doencaCardiaca: valor,
      doencaCoracaoFamilia: valor,
      doencaRins: valor,
      doencaResp: valor,
      hanseniase: valor,
      tuberculose: valor,
      cancer: valor,
      internacao12m: valor,
      probSaudeMental: valor,
      sofreuQueda: valor,
      acamado: valor,
      domiciliado: valor,
      praticasIntegrativas: valor,
      plantasMedicinais: valor,
    }));
    setErros({});
  };

  const salvar = async () => {
    const novosErros: Record<string, string> = {};

    if (!form.nome.trim()) novosErros.nome = 'Nome é obrigatório';
    if (!form.dtNasc) novosErros.dtNasc = 'Data de nascimento é obrigatória';
    if (!form.sexo) novosErros.sexo = 'Sexo é obrigatório';
    if (!form.racaCor) novosErros.racaCor = 'Raça/Cor é obrigatória';
    if (!form.maeDesconhecida && !form.nomeMae.trim()) novosErros.nomeMae = 'Nome da mãe é obrigatório';
    if (!form.paiDesconhecido && !form.nomePai.trim()) novosErros.nomePai = 'Nome do pai é obrigatório';

    if (!form.cns && !form.cpf) {
      novosErros.cns = 'Informe o CNS ou o CPF';
      novosErros.cpf = 'Informe o CNS ou o CPF';
    } else {
      if (form.cpf && !validarCPF(form.cpf)) novosErros.cpf = 'CPF inválido';
      if (form.cns && !validarCNS(form.cns)) novosErros.cns = 'CNS inválido';
    }

    if (form.racaCor === '5' && !form.etnia) novosErros.etnia = 'Etnia é obrigatória para Indígenas';

    if (form.nacionalidade === '1') {
      if (!form.celular) novosErros.celular = 'Celular é obrigatório para Brasileiros';
      if (!form.municNascDesc) novosErros.municNascDesc = 'Município de nascimento é obrigatório';
    } else if (form.nacionalidade === '2') {
      if (!form.dtNaturalizacao) novosErros.dtNaturalizacao = 'Data de naturalização é obrigatória';
      if (!form.portariaNaturalizacao) novosErros.portariaNaturalizacao = 'Portaria é obrigatória';
      if (!form.celular) novosErros.celular = 'Celular é obrigatório para Naturalizados';
    } else if (form.nacionalidade === '3') {
      if (!form.paisOrigem) novosErros.paisOrigem = 'País é obrigatório para Estrangeiros';
      if (!form.dtEntradaBrasil) novosErros.dtEntradaBrasil = 'Data de entrada no Brasil é obrigatória';
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      Alert.alert(
        'Inconsistências (Regras e-SUS)',
        'Verifique os campos em vermelho. As regras do Ministério da Saúde exigem esses dados.'
      );
      return;
    }

    const preencher = (reg: any) => {
      reg.nome = form.nome.trim().toUpperCase();
      reg.nomeSocial = form.usaNomeSocial ? form.nomeSocial.trim().toUpperCase() : '';
      reg.informaNomeSocial = form.usaNomeSocial;
      reg.cpf = form.cpf;
      reg.cns = form.cns;
      reg.rg = form.rg || '';
      reg.nisPisPasep = form.nis || '';
      reg.dtNasc = form.dtNasc;
      reg.sexo = form.sexo;
      reg.racaCor = form.racaCor ? parseInt(form.racaCor) : null;
      reg.etnia = form.etnia || '';
      reg.microArea = form.microArea || '';
      reg.foraArea = form.foraArea;
      reg.dataCadastro = form.data;
      reg.dataAtualizacao = dataHoraAtual();
      reg.nomeMae = form.maeDesconhecida ? '' : form.nomeMae.trim().toUpperCase();
      reg.maeDesconhecida = form.maeDesconhecida;
      reg.nomePai = form.paiDesconhecido ? '' : form.nomePai.trim().toUpperCase();
      reg.paiDesconhecido = form.paiDesconhecido;
      reg.estadoCivil = form.estadoCivil || '';
      reg.nacionalidade = form.nacionalidade || '1';
      reg.paisOrigem = parseInt(form.paisOrigem) || null;

      reg.municNascId = form.municNascId;
      reg.municNascDesc = form.municNascDesc || '';
      reg.municNasc = form.municNascDesc || '';

      if (form.nacionalidade === '1') {
        reg.dtNaturalizacao = null;
        reg.portariaNaturalizacao = '';
        reg.dtEntradaBrasil = null;
      } else if (form.nacionalidade === '2') {
        reg.municNasc = null;
        reg.municNascDesc = '';
        reg.municNascId = null;
        reg.dtEntradaBrasil = null;
        reg.dtNaturalizacao = form.dtNaturalizacao;
        reg.portariaNaturalizacao = form.portariaNaturalizacao;
      } else if (form.nacionalidade === '3') {
        reg.municNasc = null;
        reg.municNascDesc = '';
        reg.municNascId = null;
        reg.dtNaturalizacao = null;
        reg.portariaNaturalizacao = '';
        reg.dtEntradaBrasil = form.dtEntradaBrasil;
      }

      reg.parentesco = form.parentesco ? parseInt(form.parentesco) : null;
      reg.email = form.email || '';
      reg.celular = form.celular || '';
      reg.freqEscola = form.freqEscola || '';
      reg.escolaridade = form.escolaridade || '';
      reg.situacaoTrabalho = form.situacaoTrabalho ? parseInt(form.situacaoTrabalho) : null;
      reg.freqCurandeiro = form.cuidadorTradicional || '';
      reg.grupoComunitario = form.grupoComunitario || '';
      reg.convenio = form.planoSaude || '';
      reg.membroComunidTrad = form.povoTradicional || '';
      reg.povoComunidade = form.povoTradicionalQual ? parseInt(form.povoTradicionalQual) : null;
      reg.informaOrientSexual = form.orientacaoSexual || '';
      reg.orientacaoSexual = form.orientacaoSexualQual ? parseInt(form.orientacaoSexualQual) : null;
      reg.informaIdentGenero = form.identidadeGenero || '';
      reg.identGenero = form.identidadeGeneroQual ? parseInt(form.identidadeGeneroQual) : null;
      reg.deficiencia = form.deficiencia || '';
      reg.mobilidadeReduzida = form.mobilidadeReduzida || '';
      reg.ocupacao = form.ocupacao || '';
      reg.cboId = form.ocupacaoCboId || '';
      reg.doadorSangue = form.doadorSangue || '';
      reg.deficienciaAuditiva = form.defAuditiva;
      reg.deficienciaVisual = form.defVisual;
      reg.deficienciaFisica = form.defFisica;
      reg.deficienciaIntelec = form.defIntelectual;
      reg.autismo = form.defAutismo;
      reg.deficienciaOutra = form.defOutra;
      reg.gestante = form.gestante === 'S';
      reg.hipertensao = form.hipertensao === 'S';
      reg.diabetes = form.diabetes === 'S';
      reg.acamado = form.acamado === 'S';
      reg.domiciliado = form.domiciliado === 'S';
      reg.fumante = form.fumante || '';
      reg.dependenteAlcool = form.alcool || '';
      reg.dependenteDroga = form.outrasDrogas || '';
      reg.avcDerrame = form.avcDerrame || '';
      reg.infarto = form.infarto || '';
      reg.doencaCardiaca = form.doencaCardiaca || '';
      reg.doencaCoracaoFamilia = form.doencaCoracaoFamilia || '';
      reg.sofreuQueda = form.sofreuQueda || '';
      reg.doencaRins = form.doencaRins || '';
      reg.doencaResp = form.doencaResp || '';
      reg.hanseniase = form.hanseniase || '';
      reg.tuberculose = form.tuberculose || '';
      reg.cancer = form.cancer || '';
      reg.internacao = form.internacao12m || '';
      reg.tratPsiquiatra = form.probSaudeMental || '';
      reg.outrasPraticas = form.praticasIntegrativas || '';
      reg.plantasMedicinais = form.plantasMedicinais || '';
      reg.colesterolAlto = '';
      reg.dificCicatrizacao = '';
      reg.triaAlimentoAcabou = form.triaAlimentoAcabou || '';
      reg.triaComeuAlimento = form.triaComeuAlimento || '';
      reg.alimenta = form.vezesAlimenta ? parseInt(form.vezesAlimenta) : null;
      reg.origemAlimento = form.origemAlimento || '';
      reg.situacaoRua = form.sitRua || '';
      reg.tempoSituacaoRua = form.tempoSitRua ? parseInt(form.tempoSitRua) : null;
      reg.recebeBeneficio = form.recebeBeneficio || '';
      reg.referenciaFamiliar = form.refFamiliar || '';
      reg.higPessoal = form.higPessoal || '';
      reg.termoRecusa = form.termoRecusa;
      reg.observacao = form.observacao || '';
      reg.peso = form.peso ? parseInt(form.peso) : null;
      reg.planoSaude = form.planoSaude || '';

      if (form.termoRecusa) {
        reg.gestante = false;
        reg.hipertensao = false;
        reg.diabetes = false;
        reg.acamado = false;
        reg.domiciliado = false;
        reg.fumante = '';
        reg.dependenteAlcool = '';
        reg.dependenteDroga = '';
        reg.avcDerrame = '';
        reg.infarto = '';
        reg.doencaCardiaca = '';
        reg.doencaCoracaoFamilia = '';
        reg.doencaRins = '';
        reg.doencaResp = '';
        reg.hanseniase = '';
        reg.tuberculose = '';
        reg.cancer = '';
        reg.internacao = '';
        reg.tratPsiquiatra = '';
        reg.sofreuQueda = '';
        reg.situacaoRua = 'N';
        reg.tempoSituacaoRua = null;
        reg.recebeBeneficio = '';
        reg.referenciaFamiliar = '';
        reg.higPessoal = '';
        reg.freqEscola = '';
        reg.escolaridade = '';
        reg.situacaoTrabalho = null;
        reg.orientacaoSexual = null;
        reg.identGenero = null;
        reg.deficiencia = 'N';
        reg.deficienciaAuditiva = false;
        reg.deficienciaVisual = false;
        reg.deficienciaFisica = false;
        reg.deficienciaIntelec = false;
        reg.autismo = false;
        reg.deficienciaOutra = false;
      }

      try {
        reg.dados = JSON.stringify(form);
      } catch (e) { }
    };

    setSalvando(true);
    try {
      await database.write(async () => {
        if (id) {
          const p = await pessoaCollection.find(id);
          await p.update(reg => {
            preencher(reg);
            reg.syncStatus = 'pending';
          });
        } else {
          await pessoaCollection.create(reg => {
            reg.guid = gerarGUID();
            reg.syncStatus = 'pending';
            preencher(reg);
          });
        }
      });

      Alert.alert('Sucesso', 'Cadastro individual salvo!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar os dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Cadastro Individual</Text>
        <View style={styles.badgeTablet}>
          <Text style={styles.badgeText}>{isTablet ? 'TABLET' : 'MOBILE'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={isTablet ? styles.tabletWrapper : styles.mobileWrapper}>
          <View style={isTablet ? styles.column : undefined}>
            <Secao titulo="Identificação do Profissional">
              <View style={styles.row}>
                <Input label="Data do Cadastro" value={form.data} onChange={(v: any) => upd({ data: v })} half placeholder="DD/MM/AAAA" />
                <Input label="Última Atualização" value={form.dataAtualizacao} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="CNES" value={form.cnes || unidade?.cnes || profissional?.cnes} readonly half />
                <Input label="Unidade" value={form.unidadeNome || unidade?.nome} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Profissional" value={form.profissionalNome || profissional?.nome} readonly half />
                <Input label="Equipe" value={`${form.equipeNome || equipe?.nome || ''} ${form.equipeIne || ''}`} readonly half />
              </View>
            </Secao>

            <Secao
              titulo="Identificação do Cidadão"
              cor="#0891B2"
              temErro={!!erros.nome || !!erros.cpf || !!erros.cns || !!erros.dtNasc || !!erros.sexo || !!erros.racaCor || !!erros.nomeMae || !!erros.nomePai}
            >
              <View style={styles.row}>
                <Input label="CNS" value={form.cns} onChange={(v: any) => upd({ cns: v })} half erro={erros.cns} />
                <Input label="CPF *" value={form.cpf} onChange={handleChangeCPF} half erro={erros.cpf} placeholder="000.000.000-00" />
              </View>

              <View style={styles.row}>
                <Input label="RG" value={form.rg} onChange={(v: any) => upd({ rg: v })} half />
                <Input label="NIS (PIS/PASEP)" value={form.nis} onChange={(v: any) => upd({ nis: v })} half />
              </View>

              <View style={styles.divisor} />

              <Input label="Nome Completo *" value={form.nome} onChange={(v: any) => upd({ nome: v })} erro={erros.nome} />
              <CheckItem label="Deseja informar nome social?" value={form.usaNomeSocial} onChange={(v: any) => upd({ usaNomeSocial: v })} />
              {form.usaNomeSocial && <Input label="Nome Social" value={form.nomeSocial} onChange={(v: any) => upd({ nomeSocial: v })} />}

              <View style={styles.row}>
                <Input
                  label="Data Nascimento *"
                  value={form.dtNasc}
                  onChange={handleChangeDataNasc}
                  half
                  placeholder="DD/MM/AAAA"
                  erro={erros.dtNasc}
                />
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={[styles.campoLabel, !!erros.sexo && { color: theme.danger }]}>Sexo *</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[styles.radioBtn, form.sexo === 'M' && styles.radioBtnOn, { flex: 1 }]}
                      onPress={() => upd({ sexo: 'M' })}
                    >
                      <Text style={[styles.radioTxt, form.sexo === 'M' && styles.radioTxtOn]}>Masc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioBtn, form.sexo === 'F' && styles.radioBtnOn, { flex: 1 }]}
                      onPress={() => upd({ sexo: 'F' })}
                    >
                      <Text style={[styles.radioTxt, form.sexo === 'F' && styles.radioTxtOn]}>Fem</Text>
                    </TouchableOpacity>
                  </View>
                  {erros.sexo && <Text style={styles.erroTxt}>{erros.sexo}</Text>}
                </View>
              </View>

              <View style={styles.inputWrap}>
                <Text style={[styles.campoLabel, !!erros.racaCor && { color: theme.danger }]}>Raça / Cor *</Text>
                <TouchableOpacity
                  style={[styles.selectBtn, !!erros.racaCor && styles.inputErro]}
                  onPress={() => abrirSelect('Raça / Cor', OPTS.racaCor, 'racaCor')}
                >
                  <Text style={styles.selectTxt}>{OPTS.racaCor.find(t => t.v === form.racaCor)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
                {erros.racaCor && <Text style={styles.erroTxt}>{erros.racaCor}</Text>}
              </View>

              <View style={styles.divisor} />

              <CheckItem label="Mãe Desconhecida" value={form.maeDesconhecida} onChange={(v: any) => upd({ maeDesconhecida: v, nomeMae: '' })} />
              {!form.maeDesconhecida && <Input label="Nome completo da Mãe *" value={form.nomeMae} onChange={(v: any) => upd({ nomeMae: v })} erro={erros.nomeMae} />}

              <CheckItem label="Pai Desconhecido" value={form.paiDesconhecido} onChange={(v: any) => upd({ paiDesconhecido: v, nomePai: '' })} />
              {!form.paiDesconhecido && <Input label="Nome completo do Pai *" value={form.nomePai} onChange={(v: any) => upd({ nomePai: v })} erro={erros.nomePai} />}

              <View style={styles.divisor} />

              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Nacionalidade</Text>
                <View style={styles.radioGroup}>
                  {OPTS.nacionalidade.map(o => (
                    <TouchableOpacity
                      key={o.v}
                      style={[styles.radioBtn, form.nacionalidade === o.v && styles.radioBtnOn, { flex: 1 }]}
                      onPress={() => upd({ nacionalidade: o.v })}
                    >
                      <Text style={[styles.radioTxt, form.nacionalidade === o.v && styles.radioTxtOn]}>{o.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {form.nacionalidade === '1' && (
                <View style={styles.inputWrap}>
                  <Text style={[styles.campoLabel, !!erros.municNascDesc && { color: theme.danger }]}>
                    Município de Nascimento *
                  </Text>
                  <TouchableOpacity
                    style={[styles.selectBtn, !!erros.municNascDesc && styles.inputErro]}
                    onPress={() => setModalMunic(true)}
                  >
                    <Text style={[styles.selectTxt, !form.municNascDesc && { color: theme.textMuted }]}>
                      {form.municNascDesc || 'Digite para buscar...'}
                    </Text>
                    <Ionicons name="search" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                  {erros.municNascDesc && <Text style={styles.erroTxt}>{erros.municNascDesc}</Text>}
                </View>
              )}

              {form.nacionalidade === '2' && (
                <View style={styles.row}>
                  <Input
                    label="Data Naturalização *"
                    value={form.dtNaturalizacao}
                    onChange={(v: any) => upd({ dtNaturalizacao: v })}
                    half
                    placeholder="DD/MM/AAAA"
                    erro={erros.dtNaturalizacao}
                  />
                  <Input
                    label="Portaria *"
                    value={form.portariaNaturalizacao}
                    onChange={(v: any) => upd({ portariaNaturalizacao: v })}
                    half
                    erro={erros.portariaNaturalizacao}
                  />
                </View>
              )}

              {form.nacionalidade === '3' && (
                <View style={styles.row}>
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Text style={[styles.campoLabel, !!erros.paisOrigem && { color: theme.danger }]}>País de Nascimento *</Text>
                    <TouchableOpacity
                      style={[styles.selectBtn, !!erros.paisOrigem && styles.inputErro]}
                      onPress={() => abrirSelect('País de Nascimento', OPTS.paisOrigem, 'paisOrigem')}
                    >
                      <Text style={styles.selectTxt}>{OPTS.paisOrigem.find(t => t.v === form.paisOrigem)?.l || 'Selecione...'}</Text>
                      <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                    {erros.paisOrigem && <Text style={styles.erroTxt}>{erros.paisOrigem}</Text>}
                  </View>
                  <Input
                    label="Data de Entrada (BR) *"
                    value={form.dtEntradaBrasil}
                    onChange={(v: any) => upd({ dtEntradaBrasil: v })}
                    half
                    placeholder="DD/MM/AAAA"
                    erro={erros.dtEntradaBrasil}
                  />
                </View>
              )}

              <View style={styles.divisor} />

              <View style={styles.row}>
                <Input
                  label={form.nacionalidade === '1' || form.nacionalidade === '2' ? 'Celular *' : 'Celular'}
                  value={form.celular}
                  onChange={(v: any) => upd({ celular: v })}
                  numeric
                  half
                  erro={erros.celular}
                />
                <Input label="Microárea" value={form.microArea} onChange={(v: any) => upd({ microArea: v })} half />
              </View>

              <CheckItem label="Fora da área" value={form.foraArea} onChange={(v: any) => upd({ foraArea: v })} />
            </Secao>

            <Secao titulo="Informações Sociodemográficas" cor="#D97706" abertaInicial={true}>
              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Parentesco com o responsável familiar</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Parentesco', OPTS.parentesco, 'parentesco')}>
                  <Text style={styles.selectTxt}>{OPTS.parentesco.find(t => t.v === form.parentesco)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Situação Conjugal</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Situação Conjugal', OPTS.estadoCivil, 'estadoCivil')}>
                  <Text style={styles.selectTxt}>{OPTS.estadoCivil.find(t => t.v === form.estadoCivil)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Input label="Ocupação (CBO)" value={form.ocupacao} onChange={(v: any) => upd({ ocupacao: v })} placeholder="Digite a ocupação..." />
              <RadioSimNao label="Frequenta escola ou creche?" value={form.freqEscola} onChange={(v: any) => upd({ freqEscola: v })} />

              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Qual é o curso mais elevado?</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Escolaridade', OPTS.escolaridade, 'escolaridade')}>
                  <Text style={styles.selectTxt}>{OPTS.escolaridade.find(t => t.v === form.escolaridade)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Situação no mercado de trabalho</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Trabalho', OPTS.sitTrabalho, 'situacaoTrabalho')}>
                  <Text style={styles.selectTxt}>{OPTS.sitTrabalho.find(t => t.v === form.situacaoTrabalho)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.divisor} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Frequenta cuidador tradicional?" value={form.cuidadorTradicional} onChange={(v: any) => upd({ cuidadorTradicional: v })} half={isTablet} />
                <RadioSimNao label="Participa de grupo comunitário?" value={form.grupoComunitario} onChange={(v: any) => upd({ grupoComunitario: v })} half={isTablet} />
              </View>

              <RadioSimNao label="Possui plano de saúde privado?" value={form.planoSaude} onChange={(v: any) => upd({ planoSaude: v })} />

              <View style={styles.divisor} />

              <RadioSimNao label="É membro de povo / comunidade tradicional?" value={form.povoTradicional} onChange={(v: any) => upd({ povoTradicional: v })} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Deseja informar orient. sexual?" value={form.orientacaoSexual} onChange={(v: any) => upd({ orientacaoSexual: v })} half={isTablet} />
                <RadioSimNao label="Deseja informar ident. de gênero?" value={form.identidadeGenero} onChange={(v: any) => upd({ identidadeGenero: v })} half={isTablet} />
              </View>

              {form.orientacaoSexual === 'S' && (
                <View style={styles.inputWrap}>
                  <Text style={styles.campoLabel}>Orientação Sexual</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Orientação Sexual', OPTS.orientacao, 'orientacaoSexualQual')}>
                    <Text style={styles.selectTxt}>{OPTS.orientacao.find(t => t.v === form.orientacaoSexualQual)?.l || 'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {form.identidadeGenero === 'S' && (
                <View style={styles.inputWrap}>
                  <Text style={styles.campoLabel}>Identidade de Gênero</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Identidade de Gênero', OPTS.genero, 'identidadeGeneroQual')}>
                    <Text style={styles.selectTxt}>{OPTS.genero.find(t => t.v === form.identidadeGeneroQual)?.l || 'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </Secao>

            <Secao titulo="Deficiências" cor="#10B981" abertaInicial={false}>
              <RadioSimNao label="Tem alguma deficiência?" value={form.deficiencia} onChange={(v: any) => upd({ deficiencia: v })} />

              {form.deficiencia === 'S' && (
                <View style={styles.checkGrid}>
                  <CheckItem label="Auditiva" width="48%" value={form.defAuditiva} onChange={(v: any) => upd({ defAuditiva: v })} />
                  <CheckItem label="Visual" width="48%" value={form.defVisual} onChange={(v: any) => upd({ defVisual: v })} />
                  <CheckItem label="Física" width="48%" value={form.defFisica} onChange={(v: any) => upd({ defFisica: v })} />
                  <CheckItem label="Intelectual/Cognitiva" width="48%" value={form.defIntelectual} onChange={(v: any) => upd({ defIntelectual: v })} />
                  <CheckItem label="TEA (Autismo)" width="48%" value={form.defAutismo} onChange={(v: any) => upd({ defAutismo: v })} />
                  <CheckItem label="Outra" width="48%" value={form.defOutra} onChange={(v: any) => upd({ defOutra: v })} />
                </View>
              )}

              <View style={styles.divisor} />
              <RadioSimNao label="Possui mobilidade reduzida?" value={form.mobilidadeReduzida} onChange={(v: any) => upd({ mobilidadeReduzida: v })} />
              <RadioSimNao label="É doador de sangue?" value={form.doadorSangue} onChange={(v: any) => upd({ doadorSangue: v })} />
            </Secao>

            <Secao titulo="Triagem para Risco de Insegurança Alimentar (TRIA)" cor="#F59E0B" abertaInicial={false}>
              <RadioSimNao
                label="Nos últimos 3 meses, os alimentos acabaram antes que você tivesse dinheiro para comprar mais comida?"
                value={form.triaAlimentoAcabou}
                onChange={(v: any) => upd({ triaAlimentoAcabou: v })}
              />
              <RadioSimNao
                label="Nos últimos 3 meses, você comeu apenas alguns alimentos que ainda tinha, porque o dinheiro acabou?"
                value={form.triaComeuAlimento}
                onChange={(v: any) => upd({ triaComeuAlimento: v })}
              />
            </Secao>
          </View>

          <View style={isTablet ? styles.column : undefined}>
            <Secao titulo="Condições de Saúde" cor="#EC4899">
              <View style={styles.acaoRapidaContainer}>
                <TouchableOpacity style={styles.btnAcaoRapida} onPress={() => toggleTodasCondicoesSaude('S')}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
                  <Text style={[styles.btnAcaoRapidaTxt, { color: theme.success }]}>Marcar Todos (SIM)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnAcaoRapida} onPress={() => toggleTodasCondicoesSaude('N')}>
                  <Ionicons name="close-circle-outline" size={18} color={theme.danger} />
                  <Text style={[styles.btnAcaoRapidaTxt, { color: theme.danger }]}>Marcar Todos (NÃO)</Text>
                </TouchableOpacity>
              </View>

              <RadioSimNao label="Está gestante?" value={form.gestante} onChange={(v: any) => upd({ gestante: v })} disabled={form.sexo === 'M'} />

              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Sobre seu peso, você se considera?</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Peso', OPTS.peso, 'peso')}>
                  <Text style={styles.selectTxt}>{OPTS.peso.find(t => t.v === form.peso)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.divisor} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Está fumante?" value={form.fumante} onChange={(v: any) => upd({ fumante: v })} half={isTablet} />
                <RadioSimNao label="Faz uso de álcool?" value={form.alcool} onChange={(v: any) => upd({ alcool: v })} half={isTablet} />
              </View>

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Faz uso de outras drogas?" value={form.outrasDrogas} onChange={(v: any) => upd({ outrasDrogas: v })} half={isTablet} />
                <RadioSimNao label="Tem hipertensão arterial?" value={form.hipertensao} onChange={(v: any) => upd({ hipertensao: v })} half={isTablet} />
              </View>

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Tem diabetes?" value={form.diabetes} onChange={(v: any) => upd({ diabetes: v })} half={isTablet} />
                <RadioSimNao label="Teve AVC / Derrame?" value={form.avcDerrame} onChange={(v: any) => upd({ avcDerrame: v })} half={isTablet} />
              </View>

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Teve infarto?" value={form.infarto} onChange={(v: any) => upd({ infarto: v })} half={isTablet} />
                <RadioSimNao label="Tem doença cardíaca?" value={form.doencaCardiaca} onChange={(v: any) => upd({ doencaCardiaca: v })} half={isTablet} />
              </View>

              <RadioSimNao label="Tem doença cardíaca na família?" value={form.doencaCoracaoFamilia} onChange={(v: any) => upd({ doencaCoracaoFamilia: v })} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Problemas nos rins?" value={form.doencaRins} onChange={(v: any) => upd({ doencaRins: v })} half={isTablet} />
                <RadioSimNao label="Doença respiratória?" value={form.doencaResp} onChange={(v: any) => upd({ doencaResp: v })} half={isTablet} />
              </View>

              <View style={styles.divisor} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Está com hanseníase?" value={form.hanseniase} onChange={(v: any) => upd({ hanseniase: v })} half={isTablet} />
                <RadioSimNao label="Está com tuberculose?" value={form.tuberculose} onChange={(v: any) => upd({ tuberculose: v })} half={isTablet} />
              </View>

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Tem ou teve câncer?" value={form.cancer} onChange={(v: any) => upd({ cancer: v })} half={isTablet} />
                <RadioSimNao label="Internação últimos 12m?" value={form.internacao12m} onChange={(v: any) => upd({ internacao12m: v })} half={isTablet} />
              </View>

              <View style={styles.divisor} />

              <RadioSimNao label="Diagnóstico de problema de saúde mental?" value={form.probSaudeMental} onChange={(v: any) => upd({ probSaudeMental: v })} />
              <RadioSimNao label="Sofreu queda?" value={form.sofreuQueda} onChange={(v: any) => upd({ sofreuQueda: v })} />

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Está acamado?" value={form.acamado} onChange={(v: any) => upd({ acamado: v })} half={isTablet} />
                <RadioSimNao label="Está domiciliado?" value={form.domiciliado} onChange={(v: any) => upd({ domiciliado: v })} half={isTablet} />
              </View>

              <View style={isTablet ? styles.row : undefined}>
                <RadioSimNao label="Usa práticas integrativas?" value={form.praticasIntegrativas} onChange={(v: any) => upd({ praticasIntegrativas: v })} half={isTablet} />
                <RadioSimNao label="Usa plantas medicinais?" value={form.plantasMedicinais} onChange={(v: any) => upd({ plantasMedicinais: v })} half={isTablet} />
              </View>
            </Secao>

            <Secao titulo="Cidadão em Situação de Rua" cor="#6366F1" abertaInicial={false}>
              <RadioSimNao label="Está em situação de rua?" value={form.sitRua} onChange={(v: any) => upd({ sitRua: v })} />

              {form.sitRua === 'S' && (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.campoLabel}>Tempo em situação de rua?</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Tempo na Rua', OPTS.tempoRua, 'tempoSitRua')}>
                      <Text style={styles.selectTxt}>{OPTS.tempoRua.find(t => t.v === form.tempoSitRua)?.l || 'Selecione...'}</Text>
                      <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <RadioSimNao label="Recebe algum benefício?" value={form.recebeBeneficio} onChange={(v: any) => upd({ recebeBeneficio: v })} />
                  <RadioSimNao label="Possui referência familiar?" value={form.refFamiliar} onChange={(v: any) => upd({ refFamiliar: v })} />
                  <RadioSimNao label="Tem acesso a higiene pessoal?" value={form.higPessoal} onChange={(v: any) => upd({ higPessoal: v })} />
                </View>
              )}
            </Secao>

            <Secao titulo="Finalização do Cadastro" cor="#3B82F6">
              <CheckItem label="Usuário recusou o cadastro (Termo de Recusa)" value={form.termoRecusa} onChange={(v: any) => upd({ termoRecusa: v })} />
              <View style={{ marginTop: 12 }}>
                <Input label="Observações do Cadastro" value={form.observacao} onChange={(v: any) => upd({ observacao: v })} linhas={4} placeholder="Anotações gerais..." />
              </View>
            </Secao>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, isTablet && styles.footerTablet]}>
        <TouchableOpacity
          style={[styles.btnConfirmar, isTablet && { width: 400 }]}
          onPress={salvar}
          disabled={salvando}
        >
          {salvando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnConfirmarTxt}>SALVAR CADASTRO INDIVIDUAL</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '80%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>

            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity
                  key={t.v}
                  style={[
                    styles.modalListBtn,
                    form[modalSelect.campo as keyof FormCadIndividual] === t.v && styles.modalListBtnOn
                  ]}
                  onPress={() => {
                    upd({ [modalSelect.campo]: t.v } as Partial<FormCadIndividual>);
                    setModalSelect(s => ({ ...s, visible: false }));
                  }}
                >
                  <Text
                    style={[
                      styles.modalListTxt,
                      form[modalSelect.campo as keyof FormCadIndividual] === t.v && styles.modalListTxtOn
                    ]}
                  >
                    {t.l}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect(s => ({ ...s, visible: false }))}>
              <Text style={[styles.modalCloseTxt, { color: theme.danger }]}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalMunic} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '85%' }]}>
            <Text style={styles.modalTitulo}>Município de Nascimento</Text>

            <TextInput
              style={[styles.input, { marginTop: 12, color: theme.text }]}
              value={buscaMunic}
              onChangeText={(texto) => {
                setBuscaMunic(texto);

                if (form.municNascDesc && texto !== form.municNascDesc) {
                  upd({
                    municNascId: null,
                    municNasc: '',
                    municNascDesc: '',
                  });
                }
              }}
              placeholder="Digite o nome do município..."
              autoFocus
              placeholderTextColor={theme.textMuted}
            />

            {carregandoMunic ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color={theme.primary} />
                <Text style={{ marginTop: 8, color: theme.textMuted }}>Buscando municípios...</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 16, flex: 1 }}>
                {municipiosEncontrados.length > 0 ? (
                  municipiosEncontrados.map((item) => (
                    <TouchableOpacity
                      key={`${item.id}`}
                      style={styles.modalListBtn}
                      onPress={() => {
                        upd({
                          municNascId: item.id,
                          municNasc: item.nome,
                          municNascDesc: item.nome,
                        });
                        setBuscaMunic(item.nome);
                        setModalMunic(false);
                        setMunicipiosEncontrados([]);
                      }}
                    >
                      <Text style={styles.modalListTxt}>{item.nome}</Text>
                    </TouchableOpacity>
                  ))
                ) : buscaMunic.trim().length >= 2 ? (
                  <View style={{ paddingVertical: 20 }}>
                    <Text style={{ textAlign: 'center', color: theme.textMuted }}>
                      Nenhum município encontrado.
                    </Text>
                  </View>
                ) : (
                  <View style={{ paddingVertical: 20 }}>
                    <Text style={{ textAlign: 'center', color: theme.textMuted }}>
                      Digite ao menos 2 letras para buscar.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.btnConfirmar, { marginTop: 12 }]}
              onPress={() => {
                if (!form.municNascDesc && buscaMunic.trim()) {
                  upd({
                    municNascId: null,
                    municNasc: buscaMunic.trim(),
                    municNascDesc: buscaMunic.trim(),
                  });
                }
                setModalMunic(false);
                setMunicipiosEncontrados([]);
              }}
            >
              <Text style={styles.btnConfirmarTxt}>CONFIRMAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setModalMunic(false);
                setMunicipiosEncontrados([]);
                setBuscaMunic('');
              }}
            >
              <Text style={[styles.modalCloseTxt, { color: theme.danger }]}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, backgroundColor: theme.background },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.cardSecondary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border },
  headerTitulo: { flex: 1, fontSize: 22, fontWeight: '800', color: theme.text, textAlign: 'center' },
  badgeTablet: { backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '800', color: theme.info },
  tabletWrapper: { flexDirection: 'row', gap: 14, paddingHorizontal: 10, paddingBottom: 12 },
  mobileWrapper: { flexDirection: 'column', paddingBottom: 12 },
  column: { flex: 1 },
  scroll: { flex: 1 },
  secao: { backgroundColor: theme.card, marginTop: 14, marginHorizontal: 8, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderLeftWidth: 6, backgroundColor: theme.cardSecondary },
  secaoTitulo: { fontSize: 14, fontWeight: '800', color: theme.text },
  secaoBody: { padding: 18, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  readonlyVal: { backgroundColor: theme.cardSecondary, padding: 14, borderRadius: 14, color: theme.textMuted, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
  inputWrap: { marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, backgroundColor: theme.cardSecondary, color: theme.text },
  inputErro: {
    borderColor: theme.danger,
    backgroundColor: theme.dangerBg
  },
  erroTxt: {
    color: theme.danger,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500'
  },
  campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
  divisor: { height: 1, backgroundColor: theme.border, marginVertical: 10 },
  radioBtn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  radioBtnOn: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  radioTxt: { fontWeight: '700', color: theme.textSecondary, fontSize: 13 },
  radioTxtOn: {
    color: '#fff'
  },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: theme.cardSecondary, marginTop: 4 },
  selectTxt: { fontSize: 14, color: theme.text, flex: 1 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  checkboxOn: {
    backgroundColor: theme.primary,
    borderColor: theme.primary
  },
  checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },
  footer: { padding: 18, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border },
  footerTablet: { alignItems: 'center' },
  btnConfirmar: { backgroundColor: theme.primary, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
  btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5,20,36,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: theme.card, padding: 24, borderRadius: 26, width: '88%', maxWidth: 440, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 6 },
  modalTitulo: { fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 4 },
  modalListBtn: { paddingVertical: 16, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalListBtnOn: {
    backgroundColor: theme.infoBg
  },
  modalListTxt: {
    fontSize: 14,
    color: theme.textSecondary
  },
  modalListTxtOn: {
    color: theme.primary,
    fontWeight: '700'
  },
  modalCloseBtn: { marginTop: 16, padding: 14, alignItems: 'center', backgroundColor: theme.background, borderRadius: 14 },
  modalCloseTxt: {
    color: theme.danger,
    fontWeight: '700'
  },
  acaoRapidaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.background
  },
  btnAcaoRapida: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: theme.cardSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border
  },
  btnAcaoRapidaTxt: {
    fontSize: 12,
    fontWeight: '700'
  },
});