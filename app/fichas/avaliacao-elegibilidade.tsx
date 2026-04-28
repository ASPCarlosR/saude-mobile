import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, useWindowDimensions, useColorScheme
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
import { calcularIdadeTexto } from '../../src/utils/condicoesMorador';

// ---- Interfaces e Estado Inicial ----
interface FormElegibilidade {
  data: string; turno: 'M' | 'T' | 'N'; origem: string; 
  condAcamado: boolean; condAdapOrtese: boolean; condDomiciliado: boolean;
  condReabDom: boolean; condUlceras: boolean; condCuidOnco: boolean;
  condCuidNOnco: boolean; condSondaSNG: boolean; condOxigenio: boolean;
  condSondaSNE: boolean; condTraqueo: boolean; condGastro: boolean;
  condAspirador: boolean; condColostomia: boolean; condCpap: boolean;
  condCistostomia: boolean; condBipap: boolean; condSondaSVD: boolean;
  condDialise: boolean; condPreOp: boolean; condPosOp: boolean;
  condParacentese: boolean; condMedParenteral: boolean;
  cidPrincipal: string; cidSec1: string; cidSec2: string;
  conclusao: string; concElegivel: string;
  concInelegivelInstClinica: boolean; concInelegivelNecProp: boolean;
  concInelegivelAusCuidador: boolean; concInelegivelCondSociais: boolean; concInelegivelOutro: boolean;
  pacienteId: string; pacienteNome: string; pacienteCns: string; cuidador: string;
}

const FORM_INICIAL: FormElegibilidade = {
  data: new Date().toLocaleDateString('pt-BR'), turno: 'M', origem: '',
  condAcamado: false, condAdapOrtese: false, condDomiciliado: false, condReabDom: false, condUlceras: false, condCuidOnco: false, condCuidNOnco: false, condSondaSNG: false, condOxigenio: false, condSondaSNE: false, condTraqueo: false, condGastro: false, condAspirador: false, condColostomia: false, condCpap: false, condCistostomia: false, condBipap: false, condSondaSVD: false, condDialise: false, condPreOp: false, condPosOp: false, condParacentese: false, condMedParenteral: false,
  cidPrincipal: '', cidSec1: '', cidSec2: '',
  conclusao: '', concElegivel: '', concInelegivelInstClinica: false, concInelegivelNecProp: false, concInelegivelAusCuidador: false, concInelegivelCondSociais: false, concInelegivelOutro: false,
  pacienteId: '', pacienteNome: '', pacienteCns: '', cuidador: ''
};

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

function Input({ label, value, onChange, numeric, half, readonly, placeholder }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <View style={[styles.inputWrap, half && { flex: 1 }]}>
      <Text style={styles.campoLabel}>{label}</Text>
      {readonly ? <Text style={[styles.readonlyVal, half && { marginTop: 0 }]}>{value || '—'}</Text> :
      <TextInput style={[styles.input, { color: theme.text }]} placeholderTextColor={theme.textMuted} value={value} onChangeText={onChange} keyboardType={numeric ? 'numeric' : 'default'} placeholder={placeholder} editable={!readonly} />}
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
          <TouchableOpacity key={o.k} style={[styles.radioBtn, value === o.k && styles.radioBtnOn]} onPress={() => onChange(o.k)}>
            <Text style={[styles.radioTxt, value === o.k && styles.radioTxtOn]}>{o.l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function AvaliacaoElegibilidadeScreen() {
  const { width, height } = useWindowDimensions();
  const isTabletHorizontal = width >= 768 && width > height;
  
  // CORREÇÃO: Puxar todos os dados da Store
  const { profissional, unidade, equipe } = useAuthStore();
  
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  
  const [form, setForm] = useState<FormElegibilidade>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);

  const upd = (campo: Partial<FormElegibilidade>) => setForm(p => ({ ...p, ...campo }));

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (buscaPaciente.trim().length < 3) {
        setPacientesEncontrados([]);
        return;
      }
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
  }, [buscaPaciente]);


  const selecionarPaciente = (p: any) => {
    upd({ pacienteId: p.id.toString(), pacienteNome: p.nome, pacienteCns: p.cns || p.cpf });
    setBuscaPaciente('');
    setPacientesEncontrados([]);
  };

  const salvar = async () => {
    if (form.conclusao === '4') {
      const temMotivo = form.concInelegivelInstClinica || form.concInelegivelNecProp || form.concInelegivelAusCuidador || form.concInelegivelCondSociais || form.concInelegivelOutro;
      if (!temMotivo) { Alert.alert('Inconsistência e-SUS', 'Informe o motivo da inelegibilidade.'); return; }
    } else if (['1','2','3'].includes(form.conclusao)) {
      if (!form.concElegivel) { Alert.alert('Inconsistência e-SUS', 'Informe o destino (Elegível).'); return; }
      if (!form.cidPrincipal) { Alert.alert('Inconsistência e-SUS', 'CID-10 Principal é obrigatório para admitidos.'); return; }
    }

    setSalvando(true);
    try {
      await database.write(async () => {
        const col = database.collections.get('avaliacoes_elegibilidade');
        await col.create((r: any) => {
          r.guid = gerarGUID();
          r.syncStatus = 'pending';
          r.data = form.data;
          r.pacienteNome = form.pacienteNome;
          r.status = 'F';
          try { r.dados = JSON.stringify(form); } catch(e){}
        });
      });
      Alert.alert('Sucesso', 'Avaliação de Elegibilidade salva!', [{ text: 'OK', onPress: () => router.back() }]);
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
        <Text style={styles.headerTitulo}>Avaliação de Elegibilidade</Text>
        <View style={styles.badgeTablet}><Text style={styles.badgeText}>{isTabletHorizontal ? 'MODO TABLET' : 'MOBILE'}</Text></View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={isTabletHorizontal ? styles.tabletWrapper : styles.mobileWrapper}>

          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Identificação">
              <View style={styles.row}>
                <Input label="Data" value={form.data} readonly half />
                <View style={[styles.inputWrap, { flex: 1 }]}><Text style={styles.campoLabel}>Turno</Text>
                  <View style={styles.row}>
                    {['M','T','N'].map(t => (
                      <TouchableOpacity key={t} style={[styles.radioBtn, {flex: 1}, form.turno === t && styles.radioBtnOn]} onPress={() => upd({ turno: t as any })}>
                        <Text style={[styles.radioTxt, form.turno === t && styles.radioTxtOn]}>{t === 'M' ? 'Manhã' : t === 'T' ? 'Tarde' : 'Noite'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              
              {/* CORREÇÃO: Componente limpo exibindo os dados da Store */}
              <View style={styles.row}>
                <Input label="CNES" value={unidade?.cnes || profissional?.cnes} readonly half />
                <Input label="Unidade" value={unidade?.nome} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Profissional Solicitante" value={profissional?.nome} readonly half />
                <Input label="Equipe" value={`Equipe ${equipe?.nome || ''} ${equipe?.ine || ''}`} readonly half />
              </View>
            </Secao>

            <Secao titulo="Cidadão e Cuidador" cor="#0891B2">
              <Text style={styles.campoLabel}>Buscar Cidadão</Text>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}>
                  <TextInput style={[styles.input, { color: theme.text }]} placeholder="Digite Nome, CPF ou CNS..." placeholderTextColor={theme.textMuted} value={buscaPaciente} onChangeText={setBuscaPaciente} />
                </View>
                <TouchableOpacity style={styles.btnSearch} disabled={true}>
                  {buscandoPacientes ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
                </TouchableOpacity>
              </View>
              
              {pacientesEncontrados.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  {pacientesEncontrados.map((p, idx) => (
                    <TouchableOpacity key={p.id} style={[styles.autocompleteItem, idx > 0 && styles.autocompleteItemBorder, { backgroundColor: theme.cardSecondary }]} onPress={() => selecionarPaciente(p)}>
                      <Text style={styles.autocompleteNome}>{p.nome}</Text>
                      <Text style={styles.autocompleteDesc}>{p.cns ? `CNS: ${p.cns} • ` : ''}{calcularIdadeTexto(p.dtnasc)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {form.pacienteId ? (
                <View style={styles.cardMini}>
                  <View style={styles.cardMiniAvatar}><Ionicons name="person" size={16} color={theme.info} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMiniTit}>{form.pacienteNome}</Text>
                    <Text style={styles.cardMiniDesc}>{form.pacienteCns ? `CNS/CPF: ${form.pacienteCns}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => upd({ pacienteId: '', pacienteNome: '', pacienteCns: '' })}><Ionicons name="trash-outline" size={20} color={theme.danger} /></TouchableOpacity>
                </View>
              ) : null}
              
              <View style={styles.divisor} />
              <RadioGroup label="Cuidador" value={form.cuidador} onChange={(v:any)=>upd({cuidador:v})} opcoes={[
                {k:'1', l:'Não possui'}, {k:'2', l:'Cônjuge'}, {k:'3', l:'Filho(a)'}, {k:'4', l:'Pai/Mãe'}, {k:'5', l:'Avô/Avó'}, {k:'8', l:'Outro'}
              ]} />
            </Secao>

            <Secao titulo="Procedência" cor="#D97706">
              <RadioGroup value={form.origem} onChange={(v:any)=>upd({origem:v})} opcoes={[
                {k:'1', l:'Atenção Básica'}, {k:'11', l:'Internação hospitalar'}, {k:'12', l:'Urgência e emergência'}, {k:'13', l:'CACON/UNACON'}, {k:'6', l:'Outros'}
              ]} />
            </Secao>
            
            <Secao titulo="CIDs" cor="#EC4899">
              <Input label="CID Principal" value={form.cidPrincipal} onChange={(v:any)=>upd({cidPrincipal:v})} placeholder="Ex: I10" />
              <View style={styles.row}>
                <Input label="CID Secundário 1" value={form.cidSec1} onChange={(v:any)=>upd({cidSec1:v})} half placeholder="Ex: E11" />
                <Input label="CID Secundário 2" value={form.cidSec2} onChange={(v:any)=>upd({cidSec2:v})} half />
              </View>
            </Secao>
          </View>

          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Condições Avaliadas" cor="#10B981">
              <View style={styles.checkGrid}>
                <CheckItem label="Acamado" width="48%" value={form.condAcamado} onChange={(v:any)=>upd({condAcamado:v})} />
                <CheckItem label="Domiciliado" width="48%" value={form.condDomiciliado} onChange={(v:any)=>upd({condDomiciliado:v})} />
                <CheckItem label="Úlceras / Feridas" width="48%" value={form.condUlceras} onChange={(v:any)=>upd({condUlceras:v})} />
                <CheckItem label="Acompanhamento nutricional" width="48%" value={form.condAdapOrtese} onChange={(v:any)=>upd({condAdapOrtese:v})} />
                <CheckItem label="Uso Sonda SNG" width="48%" value={form.condSondaSNG} onChange={(v:any)=>upd({condSondaSNG:v})} />
                <CheckItem label="Uso Sonda SNE" width="48%" value={form.condSondaSNE} onChange={(v:any)=>upd({condSondaSNE:v})} />
                <CheckItem label="Uso Sonda SVD" width="48%" value={form.condSondaSVD} onChange={(v:any)=>upd({condSondaSVD:v})} />
                <CheckItem label="Gastrostomia" width="48%" value={form.condGastro} onChange={(v:any)=>upd({condGastro:v})} />
                <CheckItem label="Colostomia" width="48%" value={form.condColostomia} onChange={(v:any)=>upd({condColostomia:v})} />
                <CheckItem label="Cistostomia" width="48%" value={form.condCistostomia} onChange={(v:any)=>upd({condCistostomia:v})} />
                <CheckItem label="Traqueostomia" width="48%" value={form.condTraqueo} onChange={(v:any)=>upd({condTraqueo:v})} />
                <CheckItem label="Aspirador de vias" width="48%" value={form.condAspirador} onChange={(v:any)=>upd({condAspirador:v})} />
                <CheckItem label="Oxigenoterapia" width="48%" value={form.condOxigenio} onChange={(v:any)=>upd({condOxigenio:v})} />
                <CheckItem label="Suporte CPAP" width="48%" value={form.condCpap} onChange={(v:any)=>upd({condCpap:v})} />
                <CheckItem label="Suporte BiPAP" width="48%" value={form.condBipap} onChange={(v:any)=>upd({condBipap:v})} />
                <CheckItem label="Diálise" width="48%" value={form.condDialise} onChange={(v:any)=>upd({condDialise:v})} />
                <CheckItem label="Paracentese" width="48%" value={form.condParacentese} onChange={(v:any)=>upd({condParacentese:v})} />
                <CheckItem label="Medicação parenteral" width="48%" value={form.condMedParenteral} onChange={(v:any)=>upd({condMedParenteral:v})} />
                <CheckItem label="Cuidados oncológicos" width="100%" value={form.condCuidOnco} onChange={(v:any)=>upd({condCuidOnco:v})} />
                <CheckItem label="Cuidados não oncológicos" width="100%" value={form.condCuidNOnco} onChange={(v:any)=>upd({condCuidNOnco:v})} />
              </View>
            </Secao>

            <Secao titulo="Conclusão e Destino" cor="#7C3AED">
              <RadioGroup label="Conclusão" value={form.conclusao} onChange={(v:any)=>upd({conclusao:v, concElegivel:'', concInelegivelInstClinica:false, concInelegivelAusCuidador:false})} opcoes={[
                {k:'1', l:'AD1'}, {k:'2', l:'AD2'}, {k:'3', l:'AD3'}, {k:'4', l:'Inelegível'}
              ]} />
              
              {['1','2','3'].includes(form.conclusao) && (
                <View style={{ marginTop: 8 }}>
                  <RadioGroup label="Destino (Elegível)" value={form.concElegivel} onChange={(v:any)=>upd({concElegivel:v})} opcoes={[
                    {k:'1', l:'Admissão na própria EMAD'}, {k:'2', l:'Encaminhado p/ outra EMAD'}, {k:'3', l:'Atenção Básica (AD1)'}, {k:'4', l:'Outro'}
                  ]} />
                </View>
              )}

              {form.conclusao === '4' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.campoLabel}>Motivos de Inelegibilidade</Text>
                  <View style={styles.checkGrid}>
                    <CheckItem label="Instabilidade clínica" width="100%" value={form.concInelegivelInstClinica} onChange={(v:any)=>upd({concInelegivelInstClinica:v})} />
                    <CheckItem label="Necessidade propedêutica urg." width="100%" value={form.concInelegivelNecProp} onChange={(v:any)=>upd({concInelegivelNecProp:v})} />
                    <CheckItem label="Ausência de cuidador" width="100%" value={form.concInelegivelAusCuidador} onChange={(v:any)=>upd({concInelegivelAusCuidador:v})} />
                    <CheckItem label="Condições sociais impeditivas" width="100%" value={form.concInelegivelCondSociais} onChange={(v:any)=>upd({concInelegivelCondSociais:v})} />
                    <CheckItem label="Outro motivo" width="100%" value={form.concInelegivelOutro} onChange={(v:any)=>upd({concInelegivelOutro:v})} />
                  </View>
                </View>
              )}
            </Secao>

          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, isTabletHorizontal && styles.footerTablet]}>
        <TouchableOpacity style={[styles.btnConfirmar, isTabletHorizontal && { width: 400 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>SALVAR AVALIAÇÃO</Text>}
        </TouchableOpacity>
      </View>
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
  campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
  divisor: { height: 1, backgroundColor: theme.border, marginVertical: 10 },
  radioGroup: { gap: 8, marginTop: 6 },
  radioBtn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  radioBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  radioTxt: { fontWeight: '700', color: theme.textSecondary, fontSize: 13 },
  radioTxtOn: { color: '#fff' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  btnSearch: { backgroundColor: theme.primary, width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
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
});