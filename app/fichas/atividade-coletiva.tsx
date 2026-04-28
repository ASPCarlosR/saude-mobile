import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator, useWindowDimensions,
  useColorScheme, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/index';
import { database } from '../../src/db/index';
import { gerarGUID } from '../../src/utils/conversoes';
import { Colors } from './colors';
import { api } from '../../src/services/api';

// ---- Interfaces ----
interface Profissional { id: string; nome: string; cbo: string; }
interface Participante { id: string; nome: string; cns: string; peso: string; altura: string; paSist: string; paDias: string; }

interface FormAtividadeColetiva {
  data: string; turno: 'M' | 'T' | 'N';
  cnes: string; unidade: string; inep: string; local: string;
  pseEducacao: boolean; pseSaude: boolean;
  numParticipantes: string; numAvaliacoesAlteradas: string;
  atividadeId: string; procedimentoSigtap: string;
  temaAdmin: boolean; temaProcesso: boolean; temaDiag: boolean; temaPlan: boolean; temaDisc: boolean; temaEduc: boolean; temaOutrosReuniao: boolean;
  pubComunidade: boolean; pubCri03: boolean; pubCri45: boolean; pubCri611: boolean; pubAdolescente: boolean; pubMulher: boolean; pubGestante: boolean; pubHomem: boolean; pubFamilia: boolean; pubIdoso: boolean; pubCronico: boolean; pubTabaco: boolean; pubAlcool: boolean; pubDrogas: boolean; pubMental: boolean; pubEducacao: boolean; pubOutros: boolean;
  tsAedes: boolean; tsAgravos: boolean; tsAlimentacao: boolean; tsAutocuidado: boolean; tsCidadania: boolean; tsDependencia: boolean; tsEnvelhecimento: boolean; tsPlantas: boolean; tsViolencia: boolean; tsAmbiental: boolean; tsBucal: boolean; tsTrabalhador: boolean; tsMental: boolean; tsSexual: boolean; tsSemanaEscola: boolean; tsAmamentacao: boolean; tsAlimentacaoComp: boolean; tsOutros: boolean;
  psAntropometria: boolean; psFluor: boolean; psLinguagem: boolean; psEscovacao: boolean; psCorporais: boolean; psPnct1: boolean; psPnct2: boolean; psPnct3: boolean; psPnct4: boolean; psAuditiva: boolean; psOcular: boolean; psVacinal: boolean; psOutras: boolean; psOutroProcedimento: boolean;
  observacao: string;
}

const FORM_INICIAL: FormAtividadeColetiva = {
  data: new Date().toLocaleDateString('pt-BR'), turno: 'M',
  cnes: '', unidade: 'UBS GRUPO ASSESSOR', inep: '', local: '', pseEducacao: false, pseSaude: false,
  numParticipantes: '', numAvaliacoesAlteradas: '', atividadeId: '0', procedimentoSigtap: '',
  temaAdmin: false, temaProcesso: false, temaDiag: false, temaPlan: false, temaDisc: false, temaEduc: false, temaOutrosReuniao: false,
  pubComunidade: false, pubCri03: false, pubCri45: false, pubCri611: false, pubAdolescente: false, pubMulher: false, pubGestante: false, pubHomem: false, pubFamilia: false, pubIdoso: false, pubCronico: false, pubTabaco: false, pubAlcool: false, pubDrogas: false, pubMental: false, pubEducacao: false, pubOutros: false,
  tsAedes: false, tsAgravos: false, tsAlimentacao: false, tsAutocuidado: false, tsCidadania: false, tsDependencia: false, tsEnvelhecimento: false, tsPlantas: false, tsViolencia: false, tsAmbiental: false, tsBucal: false, tsTrabalhador: false, tsMental: false, tsSexual: false, tsSemanaEscola: false, tsAmamentacao: false, tsAlimentacaoComp: false, tsOutros: false,
  psAntropometria: false, psFluor: false, psLinguagem: false, psEscovacao: false, psCorporais: false, psPnct1: false, psPnct2: false, psPnct3: false, psPnct4: false, psAuditiva: false, psOcular: false, psVacinal: false, psOutras: false, psOutroProcedimento: false,
  observacao: ''
};

// ---- Dicionários de Opções ----
const OPTS = {
  atividade: [
    {v:'0', l:'(Nenhum)'}, {v:'1', l:'01 - Reunião de equipe'}, {v:'2', l:'02 - Reunião com outras equipes'}, {v:'3', l:'03 - Reunião intersetorial / Conselho'},
    {v:'4', l:'04 - Educação em saúde'}, {v:'5', l:'05 - Atendimento em grupo'}, {v:'6', l:'06 - Avaliação / Procedimento coletivo'}, {v:'7', l:'07 - Mobilização social'}
  ],
  sigtap: [
    {v:'', l:'(Nenhum)'}, {v:'0102020078', l:'ATIV. SAÚDE DO TRABALHADOR'}, {v:'0101010010', l:'ATIV. EDUCATIVA ATENÇÃO BÁSICA'}, {v:'0101020031', l:'ESCOVAÇÃO DENTAL SUPERVISIONADA'}, {v:'0101010036', l:'PRÁTICA CORPORAL EM GRUPO'}
  ]
};

// ---- Componentes Auxiliares ----
function Secao({ titulo, children, cor = '#0A4F6E', abertaInicial = true }: any) {
  const [aberta, setAberta] = useState(abertaInicial);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <View style={styles.secao}>
      <TouchableOpacity style={[styles.secaoHeader, { borderLeftColor: cor, backgroundColor: theme.cardSecondary }]} onPress={() => setAberta(!aberta)} activeOpacity={0.7}>
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
      {readonly ? 
        <Text style={[styles.readonlyVal, half && { marginTop: 0 }]}>{value || '—'}</Text>
      :
      <TextInput
        style={[styles.input, readonly && styles.inputReadonly, linhas > 1 && { height: 80, textAlignVertical: 'top' }, { color: theme.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        editable={!readonly}
        multiline={linhas > 1}
        numberOfLines={linhas}
      />
      }
    </View>
  );
}

function CheckItem({ label, value, onChange, width = '100%' }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <TouchableOpacity style={[styles.checkItem, { width }]} onPress={() => onChange(!value)} activeOpacity={0.7}>
      <View style={[styles.checkbox, value && styles.checkboxOn]}>
        {value && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---- Tela Principal ----
export default function AtividadeColetivaScreen() {
  const { width, height } = useWindowDimensions();
  const isTabletHorizontal = width >= 768 && width > height;

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const { profissional } = useAuthStore();
  const [form, setForm] = useState<FormAtividadeColetiva>({ ...FORM_INICIAL, cnes: profissional?.cnes || '' });
  const [salvando, setSalvando] = useState(false);

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);

  const [novoProf, setNovoProf] = useState('');
  const [novoPartPeso, setNovoPartPeso] = useState('');
  
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<any>(null);

  const [modalSelect, setModalSelect] = useState<{ visible: boolean, titulo: string, opcoes: any[], campo: keyof FormAtividadeColetiva | '' }>({
    visible: false, titulo: '', opcoes: [], campo: ''
  });

  const upd = (campo: Partial<FormAtividadeColetiva>) => setForm(p => ({ ...p, ...campo }));
  const abrirSelect = (titulo: string, opcoes: any[], campo: keyof FormAtividadeColetiva) => setModalSelect({ visible: true, titulo, opcoes, campo });

  const isReuniao = ['1', '2', '3'].includes(form.atividadeId);
  const isAtividadeSaude = ['4', '5', '6', '7'].includes(form.atividadeId);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (buscaPaciente.trim().length < 3) {
        setPacientesEncontrados([]);
        return;
      }

      setBuscandoPacientes(true);
      try {
        const result = await api.get('/api/sync/pacientes', { termo: buscaPaciente });
        
        if (result.status === 'S' && result.dados) {
          setPacientesEncontrados(result.dados);
        } else {
          setPacientesEncontrados([]);
        }
      } catch (error) {
        console.warn('[Debounce] Erro na busca segura de pacientes');
        setPacientesEncontrados([]);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 700);

    return () => clearTimeout(delayDebounceFn);
  }, [buscaPaciente]);

  const selecionarPaciente = (p: any) => {
    setPacienteSelecionado(p);
    setBuscaPaciente(p.nome);
    setPacientesEncontrados([]);
  };

  const addProfissional = () => {
    if (!novoProf) return;
    setProfissionais([...profissionais, { id: Date.now().toString(), nome: novoProf, cbo: 'MÉDICO' }]);
    setNovoProf('');
  };

  const addParticipante = () => {
    if (!pacienteSelecionado) {
      Alert.alert('Atenção', 'Selecione um paciente na lista primeiro.');
      return;
    }

    if (participantes.some(p => p.id === pacienteSelecionado.id.toString())) {
      Alert.alert('Atenção', 'Esse participante já foi inserido.');
      return;
    }
    
    setParticipantes([...participantes, { 
      id: pacienteSelecionado.id.toString(),
      nome: pacienteSelecionado.nome,
      cns: pacienteSelecionado.cns || pacienteSelecionado.cpf || '',
      peso: novoPartPeso,
      altura: '',
      paSist: '',
      paDias: ''
    }]);
    
    setBuscaPaciente('');
    setNovoPartPeso('');
    setPacienteSelecionado(null);
    setPacientesEncontrados([]);
  };

  const salvar = async () => {
    const formFinal = { ...form };
    let profissionaisFinais = [...profissionais];
    
    if (formFinal.atividadeId === '0' || !formFinal.atividadeId) {
      Alert.alert('Inconsistência e-SUS', 'Selecione o tipo de atividade primeiro.');
      return;
    }

    if (isReuniao) {
      const temTemaReuniao = formFinal.temaAdmin || formFinal.temaProcesso || formFinal.temaDiag || formFinal.temaPlan || formFinal.temaDisc || formFinal.temaEduc || formFinal.temaOutrosReuniao;
      if (!temTemaReuniao) {
        Alert.alert('Inconsistência e-SUS', 'Para reuniões, é obrigatório informar pelo menos um Tema para Reunião.');
        return;
      }
      
      formFinal.pubComunidade = false; formFinal.pubCri03 = false; formFinal.pubCri45 = false; formFinal.pubCri611 = false; formFinal.pubAdolescente = false; formFinal.pubMulher = false; formFinal.pubGestante = false; formFinal.pubHomem = false; formFinal.pubFamilia = false; formFinal.pubIdoso = false; formFinal.pubCronico = false; formFinal.pubTabaco = false; formFinal.pubAlcool = false; formFinal.pubDrogas = false; formFinal.pubMental = false; formFinal.pubEducacao = false; formFinal.pubOutros = false;
      formFinal.tsAedes = false; formFinal.tsAgravos = false; formFinal.tsAlimentacao = false; formFinal.tsAutocuidado = false; formFinal.tsCidadania = false; formFinal.tsDependencia = false; formFinal.tsEnvelhecimento = false; formFinal.tsPlantas = false; formFinal.tsViolencia = false; formFinal.tsAmbiental = false; formFinal.tsBucal = false; formFinal.tsTrabalhador = false; formFinal.tsMental = false; formFinal.tsSexual = false; formFinal.tsSemanaEscola = false; formFinal.tsAmamentacao = false; formFinal.tsAlimentacaoComp = false; formFinal.tsOutros = false;
      formFinal.psAntropometria = false; formFinal.psFluor = false; formFinal.psLinguagem = false; formFinal.psEscovacao = false; formFinal.psCorporais = false; formFinal.psPnct1 = false; formFinal.psPnct2 = false; formFinal.psPnct3 = false; formFinal.psPnct4 = false; formFinal.psAuditiva = false; formFinal.psOcular = false; formFinal.psVacinal = false; formFinal.psOutras = false; formFinal.psOutroProcedimento = false;
      formFinal.numAvaliacoesAlteradas = '';
    } else if (isAtividadeSaude) {
      const temPublico = formFinal.pubComunidade || formFinal.pubCri03 || formFinal.pubCri45 || formFinal.pubCri611 || formFinal.pubAdolescente || formFinal.pubMulher || formFinal.pubGestante || formFinal.pubHomem || formFinal.pubFamilia || formFinal.pubIdoso || formFinal.pubCronico || formFinal.pubTabaco || formFinal.pubAlcool || formFinal.pubDrogas || formFinal.pubMental || formFinal.pubEducacao || formFinal.pubOutros;
      if (!temPublico) {
        Alert.alert('Inconsistência e-SUS', 'O Público Alvo é obrigatório para esta atividade.');
        return;
      }

      if (formFinal.atividadeId === '4') {
        const temTemaSaude = formFinal.tsAedes || formFinal.tsAgravos || formFinal.tsAlimentacao || formFinal.tsAutocuidado || formFinal.tsCidadania || formFinal.tsDependencia || formFinal.tsEnvelhecimento || formFinal.tsPlantas || formFinal.tsViolencia || formFinal.tsAmbiental || formFinal.tsBucal || formFinal.tsTrabalhador || formFinal.tsMental || formFinal.tsSexual || formFinal.tsSemanaEscola || formFinal.tsAmamentacao || formFinal.tsAlimentacaoComp || formFinal.tsOutros;
        if (!temTemaSaude) { Alert.alert('Inconsistência e-SUS', 'Educação em Saúde exige pelo menos um Tema para Saúde.'); return; }
      }

      if (['5', '6', '7'].includes(formFinal.atividadeId)) {
        const temPratica = formFinal.psAntropometria || formFinal.psFluor || formFinal.psLinguagem || formFinal.psEscovacao || formFinal.psCorporais || formFinal.psPnct1 || formFinal.psPnct2 || formFinal.psPnct3 || formFinal.psPnct4 || formFinal.psAuditiva || formFinal.psOcular || formFinal.psVacinal || formFinal.psOutras || formFinal.psOutroProcedimento;
        if (!temPratica) { Alert.alert('Inconsistência e-SUS', 'Avaliação ou Mobilização exigem pelo menos uma Prática em Saúde.'); return; }
      }

      formFinal.temaAdmin = false; formFinal.temaProcesso = false; formFinal.temaDiag = false; formFinal.temaPlan = false; formFinal.temaDisc = false; formFinal.temaEduc = false; formFinal.temaOutrosReuniao = false;
      
      if (formFinal.pseEducacao && !formFinal.pseSaude) {
        if (['1', '2', '3', '5'].includes(formFinal.atividadeId)) {
          Alert.alert('Inconsistência e-SUS', 'O Tipo de Atividade selecionado é incompatível com PSE Educação sem vínculo com Saúde.');
          return;
        }
        profissionaisFinais = [];
        formFinal.temaAdmin = false; formFinal.temaProcesso = false; formFinal.temaDiag = false; formFinal.temaPlan = false; formFinal.temaDisc = false; formFinal.temaEduc = false; formFinal.temaOutrosReuniao = false;
        formFinal.psFluor = false; formFinal.psLinguagem = false; formFinal.psEscovacao = false;
        formFinal.psAuditiva = false; formFinal.psOcular = false;
      }
    }

    setSalvando(true);
  
    try {
      await database.write(async () => {
        const col = database.collections.get('atividades_coletivas');
        await col.create((r: any) => {
          r.guid = gerarGUID();
          r.syncStatus = 'pending';
          r.data = formFinal.data;
          r.local = formFinal.local;
          r.turno = formFinal.turno;
          r.status = 'F';

          try {
            r.dados = JSON.stringify({
              ...formFinal,
              profissionais: profissionaisFinais,
              participantes,
            });
          } catch (err) {
            console.error('Erro ao serializar dados:', err);
          }
        });
      });

      Alert.alert(
        'Sucesso',
        'Atividade Coletiva salva e pronta para envio!',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (e: any) {
      Alert.alert('Erro', `Não foi possível salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const listaPacientesAberta = pacientesEncontrados.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Atividade Coletiva</Text>
          <View style={styles.badgeTablet}>
            <Text style={styles.badgeText}>{isTabletHorizontal ? 'MODO TABLET' : 'MODO MOBILE'}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: 140 }}
          scrollEnabled={!listaPacientesAberta}
        >
          <View style={isTabletHorizontal ? styles.tabletWrapper : styles.mobileWrapper}>

            <View style={isTabletHorizontal ? styles.column : null}>
              
              <Secao titulo="Data / Local">
                <View style={styles.row}>
                  <Input label="Data" value={form.data} readonly half />
                  <View style={[styles.inputWrap, { flex: 1 }]}>
                    <Text style={styles.campoLabel}>Turno</Text>
                    <View style={[styles.radioGroup, { marginTop: 4 }]}>
                      <TouchableOpacity style={[styles.turnoBtn, form.turno === 'M' && styles.turnoBtnOn]} onPress={() => upd({ turno: 'M' })}>
                        <Text style={[styles.turnoTxt, form.turno === 'M' && styles.turnoTxtOn]}>Manhã</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.turnoBtn, form.turno === 'T' && styles.turnoBtnOn]} onPress={() => upd({ turno: 'T' })}>
                        <Text style={[styles.turnoTxt, form.turno === 'T' && styles.turnoTxtOn]}>Tarde</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.turnoBtn, form.turno === 'N' && styles.turnoBtnOn]} onPress={() => upd({ turno: 'N' })}>
                        <Text style={[styles.turnoTxt, form.turno === 'N' && styles.turnoTxtOn]}>Noite</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <Input label="Unidade" value={form.unidade} readonly />
                
                <View style={styles.row}>
                  <Input label="INEP (Escola/Creche)" value={form.inep} onChange={(v:any)=>upd({inep:v})} numeric half />
                  <Input label="Local da Atividade" value={form.local} onChange={(v:any)=>upd({local:v})} half placeholder="Ex: Praça Central" />
                </View>
                
                <Text style={[styles.campoLabel, { marginTop: 8 }]}>Programa Saúde na Escola (PSE)</Text>
                <View style={styles.row}>
                  <CheckItem label="Educação" value={form.pseEducacao} onChange={(v:any)=>upd({pseEducacao:v})} width="48%" />
                  <CheckItem label="Saúde" value={form.pseSaude} onChange={(v:any)=>upd({pseSaude:v})} width="48%" />
                </View>
              </Secao>

              <Secao titulo="Profissionais Participantes" cor="#0891B2">
                <View style={styles.addBox}>
                  <View style={{ flex: 1 }}>
                    <Input label="Buscar Profissional" value={novoProf} onChange={setNovoProf} placeholder="Digite o nome ou CBO..." />
                  </View>
                  <TouchableOpacity style={[styles.btnAdd, {backgroundColor: theme.info}]} onPress={addProfissional}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {profissionais.map(p => (
                  <View key={p.id} style={styles.cardMini}>
                    <View style={styles.cardMiniAvatar}>
                      <Ionicons name="person" size={16} color={theme.info} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardMiniTit}>{p.nome}</Text>
                      <Text style={styles.cardMiniDesc}>{p.cbo}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setProfissionais(profissionais.filter(i => i.id !== p.id))}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {profissionais.length === 0 && <Text style={styles.mutedTxt}>Nenhum profissional inserido além do responsável.</Text>}
              </Secao>

              <Secao titulo="Cidadãos Participantes" cor="#D97706" abertaInicial={false}>
                <Text style={styles.mutedTxt}>Informe os cidadãos apenas se a atividade for "Atendimento em Grupo" ou "Avaliação/Procedimento".</Text>
                
                <View style={[styles.addBoxParticipante, { marginTop: 12 }]}>
                  <View style={styles.buscaPacienteWrap}>
                    <Text style={styles.campoLabel}>Cidadão (Nome / CNS)</Text>

                    <View style={styles.buscaInputRow}>
                      <TextInput
                        style={[styles.input, styles.buscaPacienteInput, { color: theme.text }]}
                        value={buscaPaciente}
                        onChangeText={setBuscaPaciente}
                        placeholder="Buscar..."
                        placeholderTextColor={theme.textMuted}
                      />
                      {buscandoPacientes && (
                        <ActivityIndicator color={theme.info} style={styles.buscaLoading} />
                      )}
                    </View>

                    {listaPacientesAberta && (
                      <View style={styles.autocompleteContainer}>
                        <ScrollView
                          nestedScrollEnabled
                          keyboardShouldPersistTaps="always"
                          showsVerticalScrollIndicator
                          style={styles.autocompleteScroll}
                        >
                          {pacientesEncontrados.map((p, idx) => (
                            <TouchableOpacity
                              key={p.id}
                              style={[
                                styles.autocompleteItem,
                                idx > 0 && styles.autocompleteItemBorder,
                                { backgroundColor: theme.cardSecondary }
                              ]}
                              onPress={() => selecionarPaciente(p)}
                            >
                              <Text style={styles.autocompleteNome}>
                                {p.nome}
                              </Text>
                              {!!(p.cns || p.cpf) && (
                                <Text style={styles.autocompleteDesc} numberOfLines={1}>
                                  CNS/CPF: {p.cns || p.cpf}
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.pesoWrap}>
                    <Input
                      label="Peso (kg)"
                      value={novoPartPeso}
                      onChange={setNovoPartPeso}
                      numeric
                    />
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.btnAdd, styles.btnInserirParticipante, { backgroundColor: theme.info }]}
                    onPress={addParticipante}
                  >
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>INSERIR PARTICIPANTE</Text>
                  </TouchableOpacity>
                </View>

                {participantes.map(p => (
                  <View key={p.id} style={[styles.cardMini, { borderColor: theme.warning }]}>
                    <View style={styles.cardMiniAvatar}>
                      <Ionicons name="person" size={16} color={theme.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardMiniTit}>{p.nome}</Text>
                      <Text style={styles.cardMiniDesc}>
                        {p.cns ? `CNS: ${p.cns} ` : ''}
                        {p.peso ? `• Peso: ${p.peso} kg` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setParticipantes(participantes.filter(i => i.id !== p.id))}>
                      <Ionicons name="trash-outline" size={20} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {participantes.length === 0 && <Text style={[styles.mutedTxt, {marginTop: 8}]}>Nenhum participante inserido.</Text>}
              </Secao>
              
            </View>

            <View style={isTabletHorizontal ? styles.column : null}>
              
              <Secao titulo="Classificação da Atividade" cor="#7C3AED">
                <View style={styles.inputWrap}>
                  <Text style={styles.campoLabel}>Tipo de Atividade</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Atividade', OPTS.atividade, 'atividadeId')}>
                    <Text style={styles.selectTxt}>{OPTS.atividade.find(t => t.v === form.atividadeId)?.l || 'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.campoLabel}>Procedimento SIGTAP</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('SIGTAP', OPTS.sigtap, 'procedimentoSigtap')}>
                    <Text style={styles.selectTxt} numberOfLines={1}>{OPTS.sigtap.find(t => t.v === form.procedimentoSigtap)?.l || '(Nenhum)'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <Input label="Nº Participantes" value={form.numParticipantes} onChange={(v:any)=>upd({numParticipantes:v})} numeric half />
                  <Input label="Nº Aval. Alteradas" value={form.numAvaliacoesAlteradas} onChange={(v:any)=>upd({numAvaliacoesAlteradas:v})} numeric half />
                </View>
              </Secao>

              {isAtividadeSaude && (
              <Secao titulo="Público Alvo" cor="#10B981" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Comunidade" width="48%" value={form.pubComunidade} onChange={(v:any)=>upd({pubComunidade:v})} />
                  <CheckItem label="Crianças 0 a 3 anos" width="48%" value={form.pubCri03} onChange={(v:any)=>upd({pubCri03:v})} />
                  <CheckItem label="Crianças 4 a 5 anos" width="48%" value={form.pubCri45} onChange={(v:any)=>upd({pubCri45:v})} />
                  <CheckItem label="Crianças 6 a 11 anos" width="48%" value={form.pubCri611} onChange={(v:any)=>upd({pubCri611:v})} />
                  <CheckItem label="Adolescente" width="48%" value={form.pubAdolescente} onChange={(v:any)=>upd({pubAdolescente:v})} />
                  <CheckItem label="Mulher" width="48%" value={form.pubMulher} onChange={(v:any)=>upd({pubMulher:v})} />
                  <CheckItem label="Gestante" width="48%" value={form.pubGestante} onChange={(v:any)=>upd({pubGestante:v})} />
                  <CheckItem label="Homem" width="48%" value={form.pubHomem} onChange={(v:any)=>upd({pubHomem:v})} />
                  <CheckItem label="Idoso" width="48%" value={form.pubIdoso} onChange={(v:any)=>upd({pubIdoso:v})} />
                  <CheckItem label="Doenças Crônicas" width="48%" value={form.pubCronico} onChange={(v:any)=>upd({pubCronico:v})} />
                  <CheckItem label="Usuário de tabaco" width="48%" value={form.pubTabaco} onChange={(v:any)=>upd({pubTabaco:v})} />
                  <CheckItem label="Usuário de álcool" width="48%" value={form.pubAlcool} onChange={(v:any)=>upd({pubAlcool:v})} />
                  <CheckItem label="Usuário de drogas" width="48%" value={form.pubDrogas} onChange={(v:any)=>upd({pubDrogas:v})} />
                  <CheckItem label="Transtorno mental" width="48%" value={form.pubMental} onChange={(v:any)=>upd({pubMental:v})} />
                  <CheckItem label="Prof. de Educação" width="48%" value={form.pubEducacao} onChange={(v:any)=>upd({pubEducacao:v})} />
                  <CheckItem label="Outros" width="48%" value={form.pubOutros} onChange={(v:any)=>upd({pubOutros:v})} />
                </View>
              </Secao>
              )}

              {isReuniao && (
              <Secao titulo="Temas para Reunião" cor="#6366F1" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Administrativas / Func." width="100%" value={form.temaAdmin} onChange={(v:any)=>upd({temaAdmin:v})} />
                  <CheckItem label="Processos de trabalho" width="100%" value={form.temaProcesso} onChange={(v:any)=>upd({temaProcesso:v})} />
                  <CheckItem label="Diag/Monit. do território" width="100%" value={form.temaDiag} onChange={(v:any)=>upd({temaDiag:v})} />
                  <CheckItem label="Planejamento equipe" width="100%" value={form.temaPlan} onChange={(v:any)=>upd({temaPlan:v})} />
                  <CheckItem label="Discussão de caso (PTS)" width="100%" value={form.temaDisc} onChange={(v:any)=>upd({temaDisc:v})} />
                  <CheckItem label="Educação permanente" width="100%" value={form.temaEduc} onChange={(v:any)=>upd({temaEduc:v})} />
                  <CheckItem label="Outros" width="100%" value={form.temaOutrosReuniao} onChange={(v:any)=>upd({temaOutrosReuniao:v})} />
                </View>
              </Secao>
              )}

              {isAtividadeSaude && (
              <Secao titulo="Temas para Saúde" cor="#EC4899" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Combate ao Aedes" width="48%" value={form.tsAedes} onChange={(v:any)=>upd({tsAedes:v})} />
                  <CheckItem label="Agravos negligenciados" width="48%" value={form.tsAgravos} onChange={(v:any)=>upd({tsAgravos:v})} />
                  <CheckItem label="Alimentação saudável" width="48%" value={form.tsAlimentacao} onChange={(v:any)=>upd({tsAlimentacao:v})} />
                  <CheckItem label="Autocuidado crônicas" width="48%" value={form.tsAutocuidado} onChange={(v:any)=>upd({tsAutocuidado:v})} />
                  <CheckItem label="Dependência química" width="48%" value={form.tsDependencia} onChange={(v:any)=>upd({tsDependencia:v})} />
                  <CheckItem label="Envelhecimento" width="48%" value={form.tsEnvelhecimento} onChange={(v:any)=>upd({tsEnvelhecimento:v})} />
                  <CheckItem label="Plantas medicinais" width="48%" value={form.tsPlantas} onChange={(v:any)=>upd({tsPlantas:v})} />
                  <CheckItem label="Prevenção violência" width="48%" value={form.tsViolencia} onChange={(v:any)=>upd({tsViolencia:v})} />
                  <CheckItem label="Saúde ambiental" width="48%" value={form.tsAmbiental} onChange={(v:any)=>upd({tsAmbiental:v})} />
                  <CheckItem label="Saúde bucal" width="48%" value={form.tsBucal} onChange={(v:any)=>upd({tsBucal:v})} />
                  <CheckItem label="Saúde mental" width="48%" value={form.tsMental} onChange={(v:any)=>upd({tsMental:v})} />
                  <CheckItem label="Semana saúde na escola" width="48%" value={form.tsSemanaEscola} onChange={(v:any)=>upd({tsSemanaEscola:v})} />
                  <CheckItem label="Amamentação" width="48%" value={form.tsAmamentacao} onChange={(v:any)=>upd({tsAmamentacao:v})} />
                  <CheckItem label="Alimentação complemen." width="48%" value={form.tsAlimentacaoComp} onChange={(v:any)=>upd({tsAlimentacaoComp:v})} />
                  <CheckItem label="Outros" width="48%" value={form.tsOutros} onChange={(v:any)=>upd({tsOutros:v})} />
                </View>
              </Secao>
              )}

              {isAtividadeSaude && (
              <Secao titulo="Práticas em Saúde" cor="#F59E0B" abertaInicial={false}>
                <View style={styles.checkGrid}>
                  <CheckItem label="Antropometria" width="48%" value={form.psAntropometria} onChange={(v:any)=>upd({psAntropometria:v})} />
                  <CheckItem label="Aplicação Flúor" width="48%" value={form.psFluor} onChange={(v:any)=>upd({psFluor:v})} />
                  <CheckItem label="Escovação dental" width="48%" value={form.psEscovacao} onChange={(v:any)=>upd({psEscovacao:v})} />
                  <CheckItem label="Práticas corporais" width="48%" value={form.psCorporais} onChange={(v:any)=>upd({psCorporais:v})} />
                  <CheckItem label="PNCT Sessão 1" width="48%" value={form.psPnct1} onChange={(v:any)=>upd({psPnct1:v})} />
                  <CheckItem label="PNCT Sessão 2" width="48%" value={form.psPnct2} onChange={(v:any)=>upd({psPnct2:v})} />
                  <CheckItem label="Saúde ocular" width="48%" value={form.psOcular} onChange={(v:any)=>upd({psOcular:v})} />
                  <CheckItem label="Verificação vacinal" width="48%" value={form.psVacinal} onChange={(v:any)=>upd({psVacinal:v})} />
                  <CheckItem label="Outro procedimento" width="48%" value={form.psOutroProcedimento} onChange={(v:any)=>upd({psOutroProcedimento:v})} />
                </View>
              </Secao>
              )}

              <Secao titulo="Finalização" cor="#3B82F6">
                <Input label="Observações da Atividade" value={form.observacao} onChange={(v:any)=>upd({observacao:v})} linhas={4} placeholder="Anotações gerais..." />
              </Secao>

            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, isTabletHorizontal && styles.footerTablet]}>
          <TouchableOpacity style={[styles.btnConfirmar, isTabletHorizontal && { width: 400 }]} onPress={salvar} disabled={salvando}>
            {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>FINALIZAR ATIVIDADE</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '80%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>
            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity
                  key={t.v}
                  style={[styles.modalListBtn, form[modalSelect.campo as keyof FormAtividadeColetiva] === t.v && styles.modalListBtnOn]}
                  onPress={() => { upd({ [modalSelect.campo]: t.v }); setModalSelect({ ...modalSelect, visible: false }); }}
                >
                  <Text style={[styles.modalListTxt, form[modalSelect.campo as keyof FormAtividadeColetiva] === t.v && styles.modalListTxtOn]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect({ ...modalSelect, visible: false })}>
              <Text style={styles.modalCloseTxt}>CANCELAR</Text>
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
  inputReadonly: { backgroundColor: theme.cardSecondary, color: theme.textMuted, borderColor: theme.border },
  campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
  divisor: { height: 1, backgroundColor: theme.border, marginVertical: 10 },
  mutedTxt: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', lineHeight: 18 },

  turnoBtn: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  turnoBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  turnoTxt: { fontWeight: '700', color: theme.textMuted, fontSize: 12 },
  turnoTxtOn: { color: '#fff' },

  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: theme.cardSecondary, marginTop: 4 },
  selectTxt: { fontSize: 14, color: theme.text, flex: 1 },
  
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },

  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },

  addBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: theme.cardSecondary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  addBoxParticipante: {
    backgroundColor: theme.cardSecondary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },

  btnAdd: { backgroundColor: '#0284C7', paddingHorizontal: 16, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnInserirParticipante: {
    width: '100%',
    marginTop: 8,
  },

  cardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginTop: 8, gap: 12 },
  cardMiniAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
  cardMiniTit: { fontSize: 14, fontWeight: '700', color: theme.text },
  cardMiniDesc: { fontSize: 12, color: theme.textMuted },

  buscaPacienteWrap: {
    width: '100%',
  },
  buscaInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buscaPacienteInput: {
    flex: 1,
    paddingRight: 40,
  },
  buscaLoading: {
    position: 'absolute',
    right: 12,
  },
  pesoWrap: {
    width: '100%',
    marginTop: 12,
  },

  autocompleteContainer: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, marginTop: 8, overflow: 'hidden' },
  autocompleteScroll: {
    maxHeight: 220,
  },
  autocompleteItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.cardSecondary,
  },
  autocompleteItemBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  autocompleteNome: { fontSize: 14, fontWeight: '700', color: theme.text },
  autocompleteDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 },

  footer: { padding: 18, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border },
  footerTablet: { alignItems: 'center' },
  btnConfirmar: { backgroundColor: theme.primary, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 },
  btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(5,20,36,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { backgroundColor: theme.card, padding: 24, borderRadius: 20, width: '80%', maxWidth: 400 },
  modalTitulo: { fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 4 },
  modalListBtn: { paddingVertical: 16, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalListBtnOn: { backgroundColor: theme.infoBg },
  modalListTxt: { fontSize: 14, color: theme.textSecondary },
  modalListTxtOn: { color: theme.primary, fontWeight: '700' },
  modalCloseBtn: { marginTop: 16, padding: 14, alignItems: 'center', backgroundColor: theme.background, borderRadius: 14 },
  modalCloseTxt: { color: theme.danger, fontWeight: '700' }
});