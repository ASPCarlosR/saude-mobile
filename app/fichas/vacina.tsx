import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator, useWindowDimensions,
  useColorScheme
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/index';
import { database } from '../../src/db/index';
import { gerarGUID } from '../../src/utils/conversoes';
import { Colors } from '../fichas/colors'; 

interface FormVacina {
  dataAplicacao: string; turno: 'M' | 'T' | 'N';
  localAtendimento: string; setorVacinacao: string; profissionalAplicador: string;
  pacienteId: string; pacienteNome: string; condicaoMaternal: string;
  vacina: string; dose: string; estrategia: string; grupoAtendimento: string; quantidade: string;
  fabricante: string; lote: string;
  viaAdministracao: string; localAplicacao: string;
  cid: string; profissionalPrescritor: string; cboPrescritor: string;
}

const FORM_INICIAL: FormVacina = {
  dataAplicacao: new Date().toLocaleDateString('pt-BR'), turno: 'M',
  localAtendimento: '1', setorVacinacao: '1', profissionalAplicador: '',
  pacienteId: '', pacienteNome: '', condicaoMaternal: '1',
  vacina: '', dose: '', estrategia: 'R', grupoAtendimento: '', quantidade: '1', 
  fabricante: '', lote: '', viaAdministracao: '', localAplicacao: '',
  cid: '', profissionalPrescritor: '', cboPrescritor: ''
};

const OPTS = {
  localAtend: [{v:'1',l:'UBS'}, {v:'2',l:'Unidade Móvel'}, {v:'3',l:'Rua'}, {v:'4',l:'Domicílio'}, {v:'5',l:'Escola/Creche'}],
  setores: [{v:'1',l:'Sala de Vacina'}, {v:'2',l:'Campanha Externa'}, {v:'3',l:'Maternidade'}],
  condMaternal: [{v:'1',l:'Nenhuma'}, {v:'2',l:'Gestante'}, {v:'3',l:'Puérpera'}],
  estrategia: [{v:'R',l:'Rotina'}, {v:'C',l:'Campanha'}, {v:'I',l:'Imuno (CRIE)'}],
  vacinas: [ 
    {v:'11287', l:'BCG'}, {v:'16251', l:'COLERA ORAL'}, {v:'18577', l:'COVID-19 MODERNA'}, 
    {v:'16206', l:'DTPA/HIB/POLIO INATIVA'}, {v:'11285', l:'DTP-TRIPLICE BACTERIANA'}, 
    {v:'16203', l:'DUPLA ADULTO'}, {v:'16194', l:'FEBRE AMARELA'}, {v:'16189', l:'HEPATITE B'}
  ],
  doses: [{v:'1',l:'1ª Dose'}, {v:'2',l:'2ª Dose'}, {v:'8',l:'Dose Única'}, {v:'38',l:'Reforço'}],
  grupos: [{v:'71',l:'População Geral'}, {v:'58',l:'Profissionais de Saúde'}, {v:'20',l:'Diabetes Mellitus'}],
  vias: [{v:'26',l:'Intramuscular'}, {v:'50',l:'Subcutânea'}, {v:'43',l:'Oral'}, {v:'21',l:'Intradérmica'}],
  locais: [{v:'30',l:'Músculo Deltoide Direito'}, {v:'31',l:'Músculo Deltoide Esquerdo'}, {v:'34',l:'Vasto Lateral da Coxa Dir.'}]
};  

function Secao({ titulo, children, cor, temErro = false }: any) {
  const [aberta, setAberta] = useState(true);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  const corBorda = cor || theme.primary;

  return (
    <View style={styles.secao}>
      <TouchableOpacity style={[styles.secaoHeader, { borderLeftColor: corBorda }, temErro ? styles.secaoHeaderErro : null]} onPress={() => setAberta(!aberta)} activeOpacity={0.7}>
        <Text style={[styles.secaoTitulo, temErro && styles.textoErro]}>{titulo}</Text>
        <Ionicons name={aberta ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
      </TouchableOpacity>
      {aberta && <View style={styles.secaoBody}>{children}</View>}
    </View>
  );
}

export default function VacinaScreen() {
  const { width, height } = useWindowDimensions();
  const isTabletHorizontal = width >= 768 && width > height;
  const params = useLocalSearchParams();
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const { profissional } = useAuthStore();
  const [form, setForm] = useState<FormVacina>(FORM_INICIAL);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const [modalSelect, setModalSelect] = useState<{ visible: boolean, titulo: string, opcoes: any[], campo: keyof FormVacina | '' }>({
    visible: false, titulo: '', opcoes: [], campo: ''
  });

  useEffect(() => {
    if (params.vacinaId) {
      upd({ 
        vacina: params.vacinaId as string,
        fabricante: (params.fabricante as string) || '', lote: (params.lote as string) || '',
        viaAdministracao: (params.viaAdministracao as string) || '',
        localAtendimento: (params.localAtendimento as string) || '1',
        setorVacinacao: (params.setorVacinacao as string) || '1',
        estrategia: (params.estrategia as string) || 'R',
        profissionalAplicador: (params.profissionalAplicador as string) || profissional?.nome || ''
      });
    } else if (profissional?.nome) {
      upd({ profissionalAplicador: profissional.nome });
    }
  }, [params.vacinaId, profissional]);

  const upd = (campo: Partial<FormVacina>) => {
    setForm(p => ({ ...p, ...campo }));
    const chaves = Object.keys(campo);
    if (chaves.length > 0 && erros[chaves[0]]) {
      setErros(e => { const ne = { ...e }; delete ne[chaves[0]]; return ne; });
    }
  };

  const abrirSelect = (titulo: string, opcoes: any[], campo: keyof FormVacina) => setModalSelect({ visible: true, titulo, opcoes, campo });

  const simularBuscaPaciente = () => { upd({ pacienteId: '136440', pacienteNome: 'FRANCISCO FERNANDES DE SOUZA' }); };

  const salvar = async () => {
    const novosErros: Record<string, string> = {};
    if (!form.pacienteId) novosErros.pacienteId = 'Selecione um paciente';
    if (!form.profissionalAplicador) novosErros.profissionalAplicador = 'Profissional obrigatório';
    if (!form.vacina) novosErros.vacina = 'Vacina é obrigatória';
    if (!form.dose) novosErros.dose = 'Dose é obrigatória';
    if (!form.lote) novosErros.lote = 'Lote é obrigatório';
    if (!form.fabricante) novosErros.fabricante = 'Fabricante é obrigatório';
    if (!form.viaAdministracao) novosErros.viaAdministracao = 'Via é obrigatória';
    if (!form.localAplicacao) novosErros.localAplicacao = 'Local é obrigatório';

    if (Object.keys(novosErros).length > 0) { setErros(novosErros); Alert.alert('Inconsistências', 'Preencha todos os campos obrigatórios.'); return; }

    setSalvando(true);
    try {
      await database.write(async () => {
        const col = database.collections.get('vacinas');
        await col.create((r: any) => {
          r.guid = gerarGUID(); r.syncStatus = 'pending'; r.data = form.dataAplicacao;
          r.pacienteNome = form.pacienteNome;
          r.vacinaNome = OPTS.vacinas.find(t => t.v === form.vacina)?.l || form.vacina;
          r.status = 'F';
          try { r.dados = JSON.stringify(form); } catch(e){}
        });
      });
      Alert.alert('Sucesso', 'Vacina registrada e pronta para envio ao RNDS!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Erro', `Não foi possível salvar: ${e.message}`); } finally { setSalvando(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.primary} /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Registro de Vacinação</Text>
        <View style={styles.badgeTablet}><Text style={styles.badgeText}>{isTabletHorizontal ? 'MODO TABLET' : 'MODO MOBILE'}</Text></View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={isTabletHorizontal ? styles.tabletWrapper : styles.mobileWrapper}>
          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Dados do Atendimento" temErro={!!erros.profissionalAplicador}>
              <View style={styles.inputWrap}>
                <Text style={[styles.campoLabel, !!erros.profissionalAplicador && styles.textoErro]}>Profissional Aplicador *</Text>
                <TextInput style={[styles.input, !!erros.profissionalAplicador && styles.inputErro]} value={form.profissionalAplicador} onChangeText={v => upd({profissionalAplicador: v})} placeholderTextColor={theme.textMuted} />
              </View>
              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1 }]}><Text style={styles.campoLabel}>Local de Atendimento *</Text><TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Local', OPTS.localAtend, 'localAtendimento')}><Text style={styles.selectTxt} numberOfLines={1}>{OPTS.localAtend.find(t => t.v === form.localAtendimento)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
                <View style={[styles.inputWrap, { flex: 1 }]}><Text style={styles.campoLabel}>Setor</Text><TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Setor', OPTS.setores, 'setorVacinacao')}><Text style={styles.selectTxt} numberOfLines={1}>{OPTS.setores.find(t => t.v === form.setorVacinacao)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
              </View>
            </Secao>

            <Secao titulo="Dados do Cidadão" cor="#0891B2" temErro={!!erros.pacienteId}>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.campoLabel, !!erros.pacienteId && styles.textoErro]}>Cidadão (CPF/CNS ou Nome) *</Text>
                  <View style={styles.fakeInput}><Text style={form.pacienteNome ? styles.txtFilled : styles.txtEmpty}>{form.pacienteNome || 'Toque na lupa para buscar...'}</Text></View>
                </View>
                <TouchableOpacity style={styles.btnSearch} onPress={simularBuscaPaciente}><Ionicons name="search" size={20} color="#fff" /></TouchableOpacity>
              </View>
              {erros.pacienteId && <Text style={styles.erroTxt}>{erros.pacienteId}</Text>}
            </Secao>
          </View>

          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Imunobiológico (Vacina)" cor="#D97706" temErro={!!erros.vacina || !!erros.dose}>
              <View style={styles.inputWrap}>
                <Text style={[styles.campoLabel, !!erros.vacina && styles.textoErro]}>Vacina Aplicada *</Text>
                <TouchableOpacity style={[styles.selectBtn, !!erros.vacina && styles.inputErro]} onPress={() => abrirSelect('Vacina', OPTS.vacinas, 'vacina')}><Text style={styles.selectTxt}>{OPTS.vacinas.find(t => t.v === form.vacina)?.l || 'Selecione a vacina...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1 }]}><Text style={[styles.campoLabel, !!erros.dose && styles.textoErro]}>Dose *</Text><TouchableOpacity style={[styles.selectBtn, !!erros.dose && styles.inputErro]} onPress={() => abrirSelect('Dose', OPTS.doses, 'dose')}><Text style={styles.selectTxt}>{OPTS.doses.find(t => t.v === form.dose)?.l || '...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
              </View>
            </Secao>
            <Secao titulo="Dados do Produto" cor="#7C3AED" temErro={!!erros.lote || !!erros.fabricante}>
              <View style={styles.inputWrap}><Text style={[styles.campoLabel, !!erros.fabricante && styles.textoErro]}>Laboratório Fabricante *</Text><TextInput style={[styles.input, !!erros.fabricante && styles.inputErro]} value={form.fabricante} onChangeText={v => upd({fabricante: v})} autoCapitalize="characters" placeholderTextColor={theme.textMuted} /></View>
              <View style={styles.inputWrap}><Text style={[styles.campoLabel, !!erros.lote && styles.textoErro]}>Lote do Frasco *</Text><TextInput style={[styles.input, !!erros.lote && styles.inputErro]} value={form.lote} onChangeText={v => upd({lote: v})} autoCapitalize="characters" placeholderTextColor={theme.textMuted} /></View>
            </Secao>
            <Secao titulo="Administração" cor="#EC4899" temErro={!!erros.viaAdministracao || !!erros.localAplicacao}>
              <View style={styles.inputWrap}><Text style={[styles.campoLabel, !!erros.viaAdministracao && styles.textoErro]}>Via de Administração *</Text><TouchableOpacity style={[styles.selectBtn, !!erros.viaAdministracao && styles.inputErro]} onPress={() => abrirSelect('Via', OPTS.vias, 'viaAdministracao')}><Text style={styles.selectTxt}>{OPTS.vias.find(t => t.v === form.viaAdministracao)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
              <View style={styles.inputWrap}><Text style={[styles.campoLabel, !!erros.localAplicacao && styles.textoErro]}>Local da Aplicação *</Text><TouchableOpacity style={[styles.selectBtn, !!erros.localAplicacao && styles.inputErro]} onPress={() => abrirSelect('Local', OPTS.locais, 'localAplicacao')}><Text style={styles.selectTxt}>{OPTS.locais.find(t => t.v === form.localAplicacao)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
            </Secao>
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, isTabletHorizontal && styles.footerTablet]}>
        <TouchableOpacity style={[styles.btnConfirmar, isTabletHorizontal && { width: 400 }]} onPress={salvar} disabled={salvando}>{salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>REGISTRAR APLICAÇÃO</Text>}</TouchableOpacity>
      </View>

      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '70%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>
            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity key={t.v} style={[styles.modalListBtn, form[modalSelect.campo as keyof FormVacina] === t.v && styles.modalListBtnOn]} onPress={() => { upd({ [modalSelect.campo]: t.v }); setModalSelect({ ...modalSelect, visible: false }); }}>
                  <Text style={[styles.modalListTxt, form[modalSelect.campo as keyof FormVacina] === t.v && styles.modalListTxtOn]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect({ ...modalSelect, visible: false })}><Text style={styles.modalCloseTxt}>CANCELAR</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.headerBackground || theme.card, borderBottomWidth: 1, borderBottomColor: theme.border }, backBtn: { padding: 4, marginRight: 8 }, headerTitulo: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' }, badgeTablet: { backgroundColor: theme.successBg || '#DEF7EC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }, badgeText: { fontSize: 10, fontWeight: '700', color: theme.success || '#03543F' },
  infoBar: { flexDirection: 'row', backgroundColor: theme.infoBg || '#E1EFFE', margin: 12, padding: 12, borderRadius: 8, gap: 8, alignItems: 'center' }, infoBarTxt: { flex: 1, color: theme.infoText || '#1E429F', fontSize: 12, fontWeight: '500' }, tabletWrapper: { flexDirection: 'row', gap: 16, paddingHorizontal: 16 }, mobileWrapper: { flexDirection: 'column' }, column: { flex: 1 }, scroll: { flex: 1 },
  secao: { backgroundColor: theme.card, marginBottom: 12, marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', elevation: 2, borderWidth: 1, borderColor: theme.border }, secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: theme.cardSecondary, borderLeftWidth: 6 }, secaoHeaderErro: { backgroundColor: theme.dangerBg || '#FEF2F2' }, secaoTitulo: { fontSize: 13, fontWeight: '700', color: theme.text }, secaoBody: { padding: 16, gap: 12 }, row: { flexDirection: 'row', gap: 10 },
  inputWrap: { marginBottom: 4 }, input: { borderWidth: 1, borderColor: theme.borderInput || theme.border, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: theme.card, color: theme.text }, inputErro: { borderColor: theme.danger, backgroundColor: theme.dangerBg || '#FEF2F2' }, textoErro: { color: theme.danger }, erroTxt: { color: theme.danger, fontSize: 11, marginTop: 2, fontWeight: '500' },
  campoLabel: { fontSize: 12, fontWeight: '600', color: theme.textMuted, marginBottom: 4 }, selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput || theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card }, selectTxt: { fontSize: 14, color: theme.text, flex: 1 }, crieBox: { marginTop: 8, padding: 12, backgroundColor: theme.infoBg || '#E1EFFE', borderRadius: 8, borderWidth: 1, borderColor: theme.info || '#A4CAFE', gap: 6 }, crieTitulo: { fontSize: 12, fontWeight: '700', color: theme.info || '#1E429F', marginBottom: 4, textTransform: 'uppercase' }, searchBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, fakeInput: { borderWidth: 1, borderColor: theme.borderInput || theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.card, flex: 1 }, txtEmpty: { color: theme.textMuted, fontSize: 14 }, txtFilled: { color: theme.text, fontSize: 14, fontWeight: '600' }, btnSearch: { backgroundColor: theme.primary, width: 46, height: 46, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, footer: { padding: 16, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border }, footerTablet: { alignItems: 'center' }, btnConfirmar: { backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center' }, btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16 }, modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }, modalCard: { backgroundColor: theme.card, padding: 24, borderRadius: 20, width: '80%', maxWidth: 400 }, modalTitulo: { fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' }, modalListBtn: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.background }, modalListBtnOn: { backgroundColor: theme.infoBg || `${theme.primary}15` }, modalListTxt: { fontSize: 14, color: theme.text }, modalListTxtOn: { color: theme.primary, fontWeight: '700' }, modalCloseBtn: { marginTop: 16, padding: 12, alignItems: 'center' }, modalCloseTxt: { color: theme.danger, fontWeight: '700' }
});