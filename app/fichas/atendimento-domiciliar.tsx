import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator, useWindowDimensions,
  useColorScheme
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/index';
import { database } from '../../src/db/index';
import { gerarGUID } from '../../src/utils/conversoes';
import { Colors } from './colors';
import { API_BASE_URL } from '../../src/config';
import { api } from '../../src/services/api';

// ---- Interfaces e Estado Inicial ----
interface FormAtendDom {
  data: string; hora: string; turno: 'M' | 'T' | 'N';
  localAtendimento: string; modalidade: string; tipoAtendimento: string;
  pacienteId: string; pacienteNome: string; cns: string; cpf: string; 
  prontuario: string; dtNasc: string; sexo: string;
  endereco: string; numero: string; complemento: string; telefone: string; celular: string;
  condAcamado: boolean; condDomiciliado: boolean; condUlceras: boolean; condNutricional: boolean;
  condSNG: boolean; condSNE: boolean; condGastrostomia: boolean; condColostomia: boolean;
  condCistostomia: boolean; condSVD: boolean; condPreOp: boolean; condPosOp: boolean;
  condOrtese: boolean; condReabilitacao: boolean; condOncologico: boolean; condNaoOncologico: boolean;
  condOxigenio: boolean; condTraqueo: boolean; condAspirador: boolean; condCPAP: boolean;
  condBIPAP: boolean; condDialise: boolean; condParacentese: boolean; condParenteral: boolean;
  procAlternativa: boolean; procAntibiotico: boolean; procNeuro: boolean; procRespiratorio: boolean;
  procObito: boolean; procMultDefic: boolean; procCatetAlivio: boolean; procCatetDemora: boolean;
  procExameLab: boolean; procEstomas: boolean; procCuidTraqueo: boolean; procEnema: boolean;
  procOxigenio: boolean; procPontos: boolean; procSondGastr: boolean; procReidraOral: boolean;
  procReidraParen: boolean; procFono: boolean; procTrauma: boolean; procTratReab: boolean;
  cid: string; cidSituacao: string; cidProblemaConhecido: string; cidData: string;
  ciap: string; procedimentoSigtap: string;
  altaAdmin: boolean; altaClinica: boolean; obito: boolean; permanencia: boolean;
  encamBasica: boolean; encamUrgencia: boolean; encamInternacao: boolean;
  observacao: string;
}

const FORM_INICIAL: FormAtendDom = {
  data: new Date().toLocaleDateString('pt-BR'), hora: new Date().toLocaleTimeString('pt-BR').slice(0, 5), turno: 'M',
  localAtendimento: '4', modalidade: '', tipoAtendimento: '', 
  pacienteId: '', pacienteNome: '', cns: '', cpf: '', prontuario: '', dtNasc: '', sexo: 'M', endereco: '', numero: '', complemento: '', telefone: '', celular: '',
  condAcamado: false, condDomiciliado: false, condUlceras: false, condNutricional: false, condSNG: false, condSNE: false, condGastrostomia: false, condColostomia: false, condCistostomia: false, condSVD: false, condPreOp: false, condPosOp: false, condOrtese: false, condReabilitacao: false, condOncologico: false, condNaoOncologico: false, condOxigenio: false, condTraqueo: false, condAspirador: false, condCPAP: false, condBIPAP: false, condDialise: false, condParacentese: false, condParenteral: false,
  procAlternativa: false, procAntibiotico: false, procNeuro: false, procRespiratorio: false, procObito: false, procMultDefic: false, procCatetAlivio: false, procCatetDemora: false, procExameLab: false, procEstomas: false, procCuidTraqueo: false, procEnema: false, procOxigenio: false, procPontos: false, procSondGastr: false, procReidraOral: false, procReidraParen: false, procFono: false, procTrauma: false, procTratReab: false,
  cid: '', cidSituacao: '', cidProblemaConhecido: '', cidData: '', ciap: '', procedimentoSigtap: '',
  altaAdmin: false, altaClinica: false, obito: false, permanencia: false, encamBasica: false, encamUrgencia: false, encamInternacao: false, observacao: ''
};

const OPTS = {
  locais: [ {v:'1',l:'UBS'}, {v:'2',l:'UNIDADE MOVEL'}, {v:'3',l:'RUA'}, {v:'4',l:'DOMICILIO'}, {v:'5',l:'ESCOLA/CRECHE'}, {v:'6',l:'OUTROS'}, {v:'7',l:'POLO(ACADEMIA DA SAÚDE)'}, {v:'8',l:'INSTITUIÇÃO/ABRIGO'}, {v:'9',l:'UNIDADE PRISIONAL'}, {v:'10',l:'UNIDADE SOCIOEDUCATIVA'}, {v:'11',l:'HOSPITAL'}, {v:'12',l:'UPA'}, {v:'13',l:'CACON/UNACON'}, {v:'16',l:'UBSI'} ],
  modalidadeAD: [ {v:'1',l:'AD1'}, {v:'2',l:'AD2'}, {v:'3',l:'AD3'} ],
  tipoAtend: [ {v:'7',l:'Atendimento programado'}, {v:'8',l:'Atendimento não programado'}, {v:'9',l:'Visita domiciliar pós-óbito'} ],
  cidSituacao: [ {v:'1',l:'Suspeita'}, {v:'2',l:'Confirmado'} ],
  problemaConhecido: [ {v:'SIM',l:'Sim'}, {v:'NAO',l:'Não'}, {v:'DESCONHECIDO',l:'Desconhecido'} ]
};

function Secao({ titulo, children, cor = '#0EA5E9', abertaInicial = true }: any) {
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
      {readonly ? <Text style={[styles.readonlyVal, half && { marginTop: 0 }]}>{value || '—'}</Text> :
      <TextInput style={[styles.input, readonly && styles.inputReadonly, linhas > 1 && { height: 80, textAlignVertical: 'top' }, { color: theme.text }]} value={value} onChangeText={onChange} keyboardType={numeric ? 'numeric' : 'default'} placeholder={placeholder} placeholderTextColor={theme.textMuted} editable={!readonly} multiline={linhas > 1} numberOfLines={linhas} />}
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

function RadioGroup({ label, value, onChange, opcoes }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <View style={styles.inputWrap}>
      {label && <Text style={styles.campoLabel}>{label}</Text>}
      <View style={styles.radioGroup}>
        {opcoes.map((o: any) => (
          <TouchableOpacity key={o.v} style={[styles.radioBtn, value === o.v && styles.radioBtnOn]} onPress={() => onChange(o.v)}>
            <Text style={[styles.radioTxt, value === o.v && styles.radioTxtOn]}>{o.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function AtendimentoDomiciliarScreen() {
  const { width, height } = useWindowDimensions();
  const isTabletHorizontal = width >= 768 && width > height;
  
  // CORREÇÃO: Consumindo profissional, unidade e equipe
  const { profissional, unidade, equipe } = useAuthStore();
  
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [form, setForm] = useState<FormAtendDom>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);

  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);

  const [modalSelect, setModalSelect] = useState<{ visible: boolean, titulo: string, opcoes: any[], campo: string }>({
    visible: false, titulo: '', opcoes: [], campo: ''
  });

  const upd = (campo: Partial<FormAtendDom>) => setForm(p => ({ ...p, ...campo }));
  const abrirSelect = (titulo: string, opcoes: any[], campo: keyof FormAtendDom) => setModalSelect({ visible: true, titulo, opcoes, campo });

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (buscaPaciente.trim().length < 3) {
        setPacientesEncontrados([]);
        return;
      }
      if (form.pacienteNome === buscaPaciente) return;
      setBuscandoPacientes(true);
      try {
        const result = await api.get('/api/sync/pacientes', { termo: buscaPaciente });
        setPacientesEncontrados(
          result.status === 'S' && result.dados?.length > 0 ? result.dados : []
        );
      } catch {
        console.warn('Erro ao buscar pacientes');
      } finally {
        setBuscandoPacientes(false);
      }
    }, 700);
    return () => clearTimeout(delayDebounceFn);
  }, [buscaPaciente, form.pacienteNome]);

  const selecionarPaciente = (p: any) => {
    upd({
      pacienteId: p.id.toString(),
      pacienteNome: p.nome,
      cns: p.cns || p.cpf || '',
      dtNasc: p.dtnasc || ''
    });
    setBuscaPaciente(''); 
    setPacientesEncontrados([]);
  };

  const salvar = async () => {
    const isPosObito = form.tipoAtendimento === '9';

    if (!isPosObito && !form.modalidade) { Alert.alert('Inconsistência e-SUS', 'Modalidade AD (1, 2 ou 3) é obrigatória.'); return; }
    if (isPosObito && form.modalidade) { Alert.alert('Inconsistência e-SUS', 'Modalidade AD não pode ser preenchida para visita pós-óbito.'); return; }
    if (!form.cid) { Alert.alert('Inconsistência e-SUS', 'CID-10 Principal é obrigatório.'); return; }

    setSalvando(true);
    try {
      const dadosParaSalvar = { ...form };
      
      if (isPosObito) {
        dadosParaSalvar.modalidade = '';
        dadosParaSalvar.condAcamado = false; dadosParaSalvar.condDomiciliado = false;
        dadosParaSalvar.condUlceras = false; dadosParaSalvar.condNutricional = false;
        dadosParaSalvar.condSNG = false; dadosParaSalvar.condSNE = false;
        dadosParaSalvar.condGastrostomia = false; dadosParaSalvar.condColostomia = false;
        dadosParaSalvar.condCistostomia = false; dadosParaSalvar.condSVD = false;
        dadosParaSalvar.condPreOp = false; dadosParaSalvar.condPosOp = false;
        dadosParaSalvar.condOrtese = false; dadosParaSalvar.condReabilitacao = false;
        dadosParaSalvar.condOncologico = false; dadosParaSalvar.condNaoOncologico = false;
        dadosParaSalvar.condOxigenio = false; dadosParaSalvar.condTraqueo = false;
        dadosParaSalvar.condAspirador = false; dadosParaSalvar.condCPAP = false;
        dadosParaSalvar.condBIPAP = false; dadosParaSalvar.condDialise = false;
        dadosParaSalvar.condParacentese = false; dadosParaSalvar.condParenteral = false;
        
        dadosParaSalvar.procAlternativa = false; dadosParaSalvar.procAntibiotico = false;
        dadosParaSalvar.procNeuro = false; dadosParaSalvar.procRespiratorio = false;
        dadosParaSalvar.procObito = false; dadosParaSalvar.procMultDefic = false;
        dadosParaSalvar.procCatetAlivio = false; dadosParaSalvar.procCatetDemora = false;
        dadosParaSalvar.procExameLab = false; dadosParaSalvar.procEstomas = false;
        dadosParaSalvar.procCuidTraqueo = false; dadosParaSalvar.procEnema = false;
        dadosParaSalvar.procOxigenio = false; dadosParaSalvar.procPontos = false;
        dadosParaSalvar.procSondGastr = false; dadosParaSalvar.procReidraOral = false;
        dadosParaSalvar.procReidraParen = false; dadosParaSalvar.procFono = false;
        dadosParaSalvar.procTrauma = false; dadosParaSalvar.procTratReab = false;
        dadosParaSalvar.procedimentoSigtap = '';
      }

      await database.write(async () => {
        const col = database.collections.get('atendimentos_domiciliares');
        await col.create((r: any) => {
          r.guid = gerarGUID();
          r.syncStatus = 'pending';
          r.data = dadosParaSalvar.data;
          r.pacienteNome = dadosParaSalvar.pacienteNome;
          r.modalidade = OPTS.modalidadeAD.find(o => o.v === dadosParaSalvar.modalidade)?.l || dadosParaSalvar.modalidade;
          r.status = 'F';
          try { r.dados = JSON.stringify(dadosParaSalvar); } catch(e){}
        });
      });
      Alert.alert('Sucesso', 'Atendimento Domiciliar salvo e pronto para envio!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Erro', `Não foi possível salvar: ${e.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#0A4F6E" /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Atendimento Domiciliar</Text>
        <View style={styles.badgeTablet}><Text style={styles.badgeText}>{isTabletHorizontal ? 'MODO TABLET' : 'MOBILE'}</Text></View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={isTabletHorizontal ? styles.tabletWrapper : styles.mobileWrapper}>

          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Identificação do Atendimento">
              <View style={styles.row}>
                <Input label="Data" value={form.data} readonly half />
                <Input label="Hora" value={form.hora} readonly half />
                <View style={[styles.inputWrap, { flex: 1 }]}><Text style={styles.campoLabel}>Turno</Text>
                  <View style={styles.row}>
                    {['M','T','N'].map(t => (
                      <TouchableOpacity key={t} style={[styles.turnoBtn, form.turno === t && styles.turnoBtnOn]} onPress={() => upd({ turno: t as any })}>
                        <Text style={[styles.turnoTxt, form.turno === t && styles.turnoTxtOn]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              
              {/* CORREÇÃO: Lendo dinamicamente da Store */}
              <View style={styles.row}>
                <Input label="CNES" value={profissional?.cnes || unidade?.cnes} readonly half />
                <Input label="Unidade" value={unidade?.nome} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Profissional" value={profissional?.nome} readonly half />
                <Input label="CBO" value={profissional?.cboCodigo || "NÃO INFORMADO"} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Equipe" value={`Equipe ${equipe?.nome || ''}`} readonly half />
                <Input label="INE" value={equipe?.ine} readonly half />
              </View>
              
              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Local de Atendimento</Text>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Local', OPTS.locais, 'localAtendimento')}>
                  <Text style={styles.selectTxt}>{OPTS.locais.find(t => t.v === form.localAtendimento)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.divisor} />
              <RadioGroup label="Modalidade AD" value={form.modalidade} onChange={(v:any)=>upd({modalidade:v})} opcoes={OPTS.modalidadeAD} />
              <RadioGroup label="Tipo de Atendimento" value={form.tipoAtendimento} onChange={(v:any)=>upd({tipoAtendimento:v})} opcoes={OPTS.tipoAtend} />
            </Secao>

            <Secao titulo="Dados do Cidadão" cor="#0891B2">
              <View style={{ zIndex: 10 }}>
                <Text style={styles.campoLabel}>Buscar Cidadão</Text>
                <View style={styles.searchBox}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TextInput 
                      style={[styles.input, { flex: 1, color: theme.text }]} 
                      placeholder="Digite Nome, CPF ou CNS..." 
                      placeholderTextColor={theme.textMuted}
                      value={buscaPaciente}
                      onChangeText={setBuscaPaciente}
                    />
                    {buscandoPacientes && <ActivityIndicator color={theme.info} style={{ marginLeft: -30, marginRight: 10 }} />}
                  </View>
                </View>
                
                {pacientesEncontrados.length > 0 && (
                  <View style={styles.autocompleteContainer}>
                    {pacientesEncontrados.map((p, idx) => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={[styles.autocompleteItem, idx > 0 && styles.autocompleteItemBorder, { backgroundColor: theme.cardSecondary }]} 
                        onPress={() => selecionarPaciente(p)}
                      >
                        <Text style={styles.autocompleteNome}>{p.nome}</Text>
                        {p.cns ? <Text style={styles.autocompleteDesc}>CNS/CPF: {p.cns}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {form.pacienteId ? (
                <View style={styles.cardMini}>
                  <View style={styles.cardMiniAvatar}>
                    <Ionicons name="person" size={16} color={theme.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMiniTit}>{form.pacienteNome}</Text>
                    <Text style={styles.cardMiniDesc}>
                      {form.cns ? `CNS/CPF: ${form.cns}` : 'Sem documento'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => upd({ pacienteId: '', pacienteNome: '', cns: '', dtNasc: '' })}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              ) : null}
              
              <View style={[styles.row, { marginTop: 12 }]}>
                <Input label="CNS / CPF" value={form.cns} readonly half />
                <Input label="Data Nasc." value={form.dtNasc} readonly half />
              </View>
            </Secao>

            <Secao titulo="Condições Avaliadas" cor="#10B981" abertaInicial={false}>
              <View style={styles.checkGrid}>
                <CheckItem label="Acamado" width="48%" value={form.condAcamado} onChange={(v:any)=>upd({condAcamado:v})} />
                <CheckItem label="Domiciliado" width="48%" value={form.condDomiciliado} onChange={(v:any)=>upd({condDomiciliado:v})} />
                <CheckItem label="Úlceras / Feridas" width="48%" value={form.condUlceras} onChange={(v:any)=>upd({condUlceras:v})} />
                <CheckItem label="Acomp. Nutricional" width="48%" value={form.condNutricional} onChange={(v:any)=>upd({condNutricional:v})} />
                <CheckItem label="Uso Sonda SNG" width="48%" value={form.condSNG} onChange={(v:any)=>upd({condSNG:v})} />
                <CheckItem label="Uso Sonda SNE" width="48%" value={form.condSNE} onChange={(v:any)=>upd({condSNE:v})} />
                <CheckItem label="Gastrostomia" width="48%" value={form.condGastrostomia} onChange={(v:any)=>upd({condGastrostomia:v})} />
                <CheckItem label="Colostomia" width="48%" value={form.condColostomia} onChange={(v:any)=>upd({condColostomia:v})} />
                <CheckItem label="Cistostomia" width="48%" value={form.condCistostomia} onChange={(v:any)=>upd({condCistostomia:v})} />
                <CheckItem label="Uso de SVD" width="48%" value={form.condSVD} onChange={(v:any)=>upd({condSVD:v})} />
                <CheckItem label="Pré-operatório" width="48%" value={form.condPreOp} onChange={(v:any)=>upd({condPreOp:v})} />
                <CheckItem label="Pós-operatório" width="48%" value={form.condPosOp} onChange={(v:any)=>upd({condPosOp:v})} />
                <CheckItem label="Adaptação Órtese" width="48%" value={form.condOrtese} onChange={(v:any)=>upd({condOrtese:v})} />
                <CheckItem label="Reabilitação Dom." width="48%" value={form.condReabilitacao} onChange={(v:any)=>upd({condReabilitacao:v})} />
                <CheckItem label="Cuid. Oncológicos" width="48%" value={form.condOncologico} onChange={(v:any)=>upd({condOncologico:v})} />
                <CheckItem label="Cuid. Não Oncológicos" width="48%" value={form.condNaoOncologico} onChange={(v:any)=>upd({condNaoOncologico:v})} />
                <CheckItem label="Oxigenoterapia" width="48%" value={form.condOxigenio} onChange={(v:any)=>upd({condOxigenio:v})} />
                <CheckItem label="Uso Traqueostomia" width="48%" value={form.condTraqueo} onChange={(v:any)=>upd({condTraqueo:v})} />
                <CheckItem label="Aspirador Vias Aéreas" width="48%" value={form.condAspirador} onChange={(v:any)=>upd({condAspirador:v})} />
                <CheckItem label="Suporte CPAP" width="48%" value={form.condCPAP} onChange={(v:any)=>upd({condCPAP:v})} />
                <CheckItem label="Suporte BiPAP" width="48%" value={form.condBIPAP} onChange={(v:any)=>upd({condBIPAP:v})} />
                <CheckItem label="Diálise Peritoneal" width="48%" value={form.condDialise} onChange={(v:any)=>upd({condDialise:v})} />
                <CheckItem label="Paracentese" width="48%" value={form.condParacentese} onChange={(v:any)=>upd({condParacentese:v})} />
                <CheckItem label="Med. Parenteral" width="48%" value={form.condParenteral} onChange={(v:any)=>upd({condParenteral:v})} />
              </View>
            </Secao>

          </View>

          <View style={isTabletHorizontal ? styles.column : null}>
            
            <Secao titulo="Diagnóstico / CID / CIAP" cor="#D97706">
              <Input label="CID-10" value={form.cid} onChange={(v:any)=>upd({cid:v})} placeholder="Buscar CID..." />
              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={styles.campoLabel}>Situação</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Situação', OPTS.cidSituacao, 'cidSituacao')}>
                    <Text style={styles.selectTxt}>{OPTS.cidSituacao.find(t => t.v === form.cidSituacao)?.l || '...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={styles.campoLabel}>Conhecido?</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Conhecido', OPTS.problemaConhecido, 'cidProblemaConhecido')}>
                    <Text style={styles.selectTxt}>{OPTS.problemaConhecido.find(t => t.v === form.cidProblemaConhecido)?.l || '...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
              <Input label="CIAP2" value={form.ciap} onChange={(v:any)=>upd({ciap:v})} placeholder="Buscar CIAP2..." />
            </Secao>

            <Secao titulo="Procedimentos" cor="#7C3AED" abertaInicial={false}>
              <Input label="Buscar Procedimento (SIGTAP)" value={form.procedimentoSigtap} onChange={(v:any)=>upd({procedimentoSigtap:v})} placeholder="Digite o código ou nome..." />
              
              <View style={styles.divisor} />
              <Text style={styles.campoLabel}>Outros Procedimentos Comuns</Text>
              <View style={styles.checkGrid}>
                <CheckItem label="Comunicação Alternativa" width="100%" value={form.procAlternativa} onChange={(v:any)=>upd({procAlternativa:v})} />
                <CheckItem label="Antibioticoterapia Parenteral" width="100%" value={form.procAntibiotico} onChange={(v:any)=>upd({procAntibiotico:v})} />
                <CheckItem label="Reab. Neuropsicomotora" width="100%" value={form.procNeuro} onChange={(v:any)=>upd({procNeuro:v})} />
                <CheckItem label="Fisioterapia Respiratória" width="100%" value={form.procRespiratorio} onChange={(v:any)=>upd({procRespiratorio:v})} />
                <CheckItem label="Atestar Óbito" width="100%" value={form.procObito} onChange={(v:any)=>upd({procObito:v})} />
                <CheckItem label="Múltiplas Deficiências" width="100%" value={form.procMultDefic} onChange={(v:any)=>upd({procMultDefic:v})} />
                <CheckItem label="Cateterismo de Alívio" width="100%" value={form.procCatetAlivio} onChange={(v:any)=>upd({procCatetAlivio:v})} />
                <CheckItem label="Cateterismo de Demora" width="100%" value={form.procCatetDemora} onChange={(v:any)=>upd({procCatetDemora:v})} />
                <CheckItem label="Coleta Exame Laboratorial" width="100%" value={form.procExameLab} onChange={(v:any)=>upd({procExameLab:v})} />
                <CheckItem label="Cuidados com Estomas" width="100%" value={form.procEstomas} onChange={(v:any)=>upd({procEstomas:v})} />
                <CheckItem label="Cuidados Traqueostomia" width="100%" value={form.procCuidTraqueo} onChange={(v:any)=>upd({procCuidTraqueo:v})} />
                <CheckItem label="Enema" width="100%" value={form.procEnema} onChange={(v:any)=>upd({procEnema:v})} />
                <CheckItem label="Retirada de Pontos" width="100%" value={form.procPontos} onChange={(v:any)=>upd({procPontos:v})} />
                <CheckItem label="Sondagem Gástrica" width="100%" value={form.procSondGastr} onChange={(v:any)=>upd({procSondGastr:v})} />
                <CheckItem label="Reidratação Oral" width="100%" value={form.procReidraOral} onChange={(v:any)=>upd({procReidraOral:v})} />
                <CheckItem label="Reidratação Parenteral" width="100%" value={form.procReidraParen} onChange={(v:any)=>upd({procReidraParen:v})} />
                <CheckItem label="Fonoaudiologia" width="100%" value={form.procFono} onChange={(v:any)=>upd({procFono:v})} />
                <CheckItem label="Trat. Traumatismos" width="100%" value={form.procTrauma} onChange={(v:any)=>upd({procTrauma:v})} />
                <CheckItem label="Trat. em Reabilitação" width="100%" value={form.procTratReab} onChange={(v:any)=>upd({procTratReab:v})} />
              </View>
            </Secao>

            <Secao titulo="Conduta / Desfecho" cor="#EC4899">
              <View style={styles.checkGrid}>
                <CheckItem label="Permanência" width="48%" value={form.permanencia} onChange={(v:any)=>upd({permanencia:v})} />
                <CheckItem label="Alta Administrativa" width="48%" value={form.altaAdmin} onChange={(v:any)=>upd({altaAdmin:v})} />
                <CheckItem label="Alta Clínica" width="48%" value={form.altaClinica} onChange={(v:any)=>upd({altaClinica:v})} />
                <CheckItem label="Óbito" width="48%" value={form.obito} onChange={(v:any)=>upd({obito:v})} />
              </View>
              <View style={styles.divisor} />
              <Text style={styles.campoLabel}>Encaminhamentos</Text>
              <View style={styles.checkGrid}>
                <CheckItem label="Atenção Básica" width="48%" value={form.encamBasica} onChange={(v:any)=>upd({encamBasica:v})} />
                <CheckItem label="Serviço de Urgência" width="48%" value={form.encamUrgencia} onChange={(v:any)=>upd({encamUrgencia:v})} />
                <CheckItem label="Internação Hospitalar" width="100%" value={form.encamInternacao} onChange={(v:any)=>upd({encamInternacao:v})} />
              </View>
            </Secao>

            <Secao titulo="Observações" cor="#6366F1">
              <Input label="Anotações do Atendimento" value={form.observacao} onChange={(v:any)=>upd({observacao:v})} linhas={4} placeholder="Evolução, prescrições gerais..." />
            </Secao>

          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, isTabletHorizontal && styles.footerTablet]}>
        <TouchableOpacity style={[styles.btnConfirmar, isTabletHorizontal && { width: 400 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>FINALIZAR ATENDIMENTO</Text>}
        </TouchableOpacity>
      </View>

      {/* MODAL GENÉRICO DE SELEÇÃO */}
      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '70%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>
            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity key={t.v} style={[styles.modalListBtn, form[modalSelect.campo as keyof FormAtendDom] === t.v && styles.modalListBtnOn]} onPress={() => { upd({ [modalSelect.campo]: t.v }); setModalSelect({ ...modalSelect, visible: false }); }}>
                  <Text style={[styles.modalListTxt, form[modalSelect.campo as keyof FormAtendDom] === t.v && styles.modalListTxtOn]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect({ ...modalSelect, visible: false })}><Text style={[styles.modalCloseTxt, {color: theme.danger}]}>CANCELAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, backgroundColor: theme.background },
  backBtn: { padding: 4, marginRight: 8 },
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
  radioGroup: { gap: 8, marginTop: 6 },
  radioBtn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  radioBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  radioTxt: { fontWeight: '700', color: theme.textSecondary, fontSize: 13 },
  radioTxtOn: { color: '#fff' },
  turnoBtn: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: theme.background, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  turnoBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  turnoTxt: { fontWeight: '700', color: theme.textMuted, fontSize: 12 },
  turnoTxtOn: { color: '#fff' },
  selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: theme.cardSecondary, marginTop: 4 },
  selectTxt: { fontSize: 14, color: theme.text, flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  btnSearch: { backgroundColor: theme.primary, width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },
  autocompleteContainer: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, marginTop: 8, overflow: 'hidden',  shadowOpacity: 0.2, shadowRadius: 4, zIndex: 100 },
  autocompleteItem: { paddingVertical: 13, paddingHorizontal: 14, backgroundColor: theme.card },
  autocompleteItemBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  autocompleteNome: { fontSize: 14, fontWeight: '700', color: theme.text },
  autocompleteDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 },
  cardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardSecondary, padding: 12, borderRadius: 16, marginTop: 8, gap: 10, borderWidth: 1, borderColor: theme.border },
  cardMiniAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.infoBg, alignItems: 'center', justifyContent: 'center' },
  cardMiniTit: { fontSize: 13, fontWeight: '800', color: theme.text },
  cardMiniDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 },

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