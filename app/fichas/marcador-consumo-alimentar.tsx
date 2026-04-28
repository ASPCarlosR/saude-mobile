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
import { calcularIdadeTexto } from '../../src/utils/condicoesMorador';

function calcularIdadeEmMeses(dataNascIso: string) {
  if (!dataNascIso) return 999;
  const nasc = new Date(dataNascIso);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + (hoje.getMonth() - nasc.getMonth());
  if (hoje.getDate() < nasc.getDate()) meses--;
  return meses;
}

function Secao({ titulo, children, cor = '#10B981', abertaInicial = true }: any) {
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

function RadioSimNaoSabe({ label, value, onChange }: any) {
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <View style={[styles.inputWrap, { marginBottom: 12 }]}>
      <Text style={[styles.campoLabel, { color: theme.text, marginBottom: 8 }]}>{label}</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity style={[styles.radioBtn, {flex:1}, value === '1' && styles.radioBtnOn]} onPress={() => onChange('1')}>
          <Text style={[styles.radioTxt, value === '1' && styles.radioTxtOn]}>Sim</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioBtn, {flex:1}, value === '2' && styles.radioBtnOn]} onPress={() => onChange('2')}>
          <Text style={[styles.radioTxt, value === '2' && styles.radioTxtOn]}>Não</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.radioBtn, {flex:1}, value === '3' && styles.radioBtnOn]} onPress={() => onChange('3')}>
          <Text style={[styles.radioTxt, value === '3' && styles.radioTxtOn]}>Não Sabe</Text>
        </TouchableOpacity>
      </View>
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

export default function MarcadorConsumoAlimentarScreen() {
  const { width, height } = useWindowDimensions();
  const isTabletHorizontal = width >= 768 && width > height;

  const { profissional, unidade, equipe } = useAuthStore();

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  const [salvando, setSalvando] = useState(false);
  const [data] = useState(new Date().toLocaleDateString('pt-BR'));
  const [paciente, setPaciente] = useState({ id: '', nome: '', cns: '' });

  const [faixaEtaria, setFaixaEtaria] = useState<'6m' | '23m' | 'maior2'>('maior2');
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [refeicoes, setRefeicoes] = useState<Record<string, boolean>>({});

  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);

  const resp = (chave: string, valor: string) => setRespostas(p => ({ ...p, [chave]: valor }));
  const ref = (chave: string, valor: boolean) => setRefeicoes(p => ({ ...p, [chave]: valor }));

  async function buscarPacientes(termo: string, exibirAlertas = false) {
    const termoLimpo = termo.trim();

    if (termoLimpo.length < 3) {
      setPacientesEncontrados([]);
      if (exibirAlertas) {
        Alert.alert('Atenção', 'Digite pelo menos 3 caracteres para buscar.');
      }
      return;
    }

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
        `${API_BASE_URL}/api/sync/pacientes?termo=${encodeURIComponent(termoLimpo)}`,
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

      if (result.status === 'S' && Array.isArray(result.dados)) {
        setPacientesEncontrados(result.dados);
      } else {
        setPacientesEncontrados([]);
      }
    } catch (error) {
      console.warn('Erro ao buscar pacientes:', error);
      setPacientesEncontrados([]);
      if (exibirAlertas) {
        Alert.alert('Erro', 'Não foi possível buscar os pacientes.');
      }
    } finally {
      setBuscandoPacientes(false);
    }
  }

  function realizarBuscaPacientesManual() {
    buscarPacientes(buscaPaciente, true);
  }

  useEffect(() => {
    const termo = buscaPaciente.trim();

    if (termo.length === 0) {
      setPacientesEncontrados([]);
      return;
    }

    const timer = setTimeout(() => {
      buscarPacientes(termo, false);
    }, 700);

    return () => clearTimeout(timer);
  }, [buscaPaciente]);

  const selecionarPaciente = (p: any) => {
    setPaciente({ id: p.id.toString(), nome: p.nome, cns: p.cns || p.cpf || '' });
    setBuscaPaciente('');
    setPacientesEncontrados([]);

    const meses = calcularIdadeEmMeses(p.dtnasc);
    if (meses < 6) setFaixaEtaria('6m');
    else if (meses < 24) setFaixaEtaria('23m');
    else setFaixaEtaria('maior2');
  };

  const salvar = async () => {
    if (faixaEtaria === '23m') {
      if (respostas.m23_fruta === '1' && !respostas.m23_frutaVez) {
        Alert.alert('Inconsistência e-SUS', 'É obrigatório informar quantas vezes consumiu fruta.'); return;
      }
      if (respostas.m23_sal === '1' && (!respostas.m23_salVez || !respostas.m23_ofer)) {
        Alert.alert('Inconsistência e-SUS', 'É obrigatório informar a frequência de comida de sal e como foi oferecida.'); return;
      }
    }

    setSalvando(true);
    try {
      await database.write(async () => {
        const col = database.collections.get('marcadores_consumo');
        await col.create((r: any) => {
          r.guid = gerarGUID();
          r.syncStatus = 'pending';
          r.data = data;
          r.pacienteNome = paciente.nome;
          r.status = 'F';
          try { r.dados = JSON.stringify({ data, pacienteId: paciente.id, pacienteNome: paciente.nome, faixaEtaria, respostas, refeicoes }); } catch(e){}
        });
      });
      Alert.alert('Sucesso', 'Marcador de Consumo Alimentar salvo!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Erro', `Não foi possível salvar: ${e.message}`); } finally { setSalvando(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#10B981" /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Consumo Alimentar</Text>
        <View style={styles.badgeTablet}><Text style={styles.badgeText}>{isTabletHorizontal ? 'MODO TABLET' : 'MOBILE'}</Text></View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={isTabletHorizontal ? styles.tabletWrapper : styles.mobileWrapper}>

          <View style={isTabletHorizontal ? styles.column : null}>
            <Secao titulo="Identificação">
              <View style={styles.row}>
                <Input label="Data" value={data} readonly half />
                <Input label="Unidade" value={unidade?.nome} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Profissional" value={profissional?.nome} readonly half />
                <Input label="Equipe" value={`Equipe ${equipe?.nome || ''}`} readonly half />
              </View>

              <Text style={styles.campoLabel}>Buscar Cidadão</Text>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Digite Nome, CPF ou CNS..."
                    placeholderTextColor={theme.textMuted}
                    value={buscaPaciente}
                    onChangeText={setBuscaPaciente}
                    onSubmitEditing={realizarBuscaPacientesManual}
                  />
                </View>
                <TouchableOpacity style={styles.btnSearch} onPress={realizarBuscaPacientesManual} disabled={buscandoPacientes}>
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

              {paciente.id ? (
                <View style={styles.cardMini}>
                  <View style={styles.cardMiniAvatar}><Ionicons name="person" size={16} color={theme.info} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardMiniTit}>{paciente.nome}</Text>
                    <Text style={styles.cardMiniDesc}>{paciente.cns ? `CNS/CPF: ${paciente.cns}` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPaciente({ id: '', nome: '', cns: '' })}><Ionicons name="trash-outline" size={20} color={theme.danger} /></TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.divisor} />
              <Text style={[styles.campoLabel, {color: theme.success}]}>Selecione a faixa etária para avaliação:</Text>
              {paciente.id && <Text style={styles.mutedTxt}>Preenchido automaticamente com base na idade.</Text>}
              <View style={styles.faixaGroup}>
                {[ {k:'6m', l:'Menor de 6 meses'}, {k:'23m', l:'De 6 a 23 meses'}, {k:'maior2', l:'2 anos ou mais / Adultos'} ].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.faixaBtn, faixaEtaria === o.k && styles.faixaBtnOn, paciente.id ? {opacity: 0.7} : {}]} onPress={() => { if (!paciente.id) setFaixaEtaria(o.k as any); }}>
                    <Text style={[styles.faixaTxt, faixaEtaria === o.k && styles.faixaTxtOn]}>{o.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Secao>
          </View>

          <View style={isTabletHorizontal ? styles.column : null}>
            {faixaEtaria === '6m' && (
              <Secao titulo="Crianças Menores de 6 Meses" cor="#F59E0B">
                <Text style={styles.mutedTxt}>Ontem a criança consumiu:</Text>
                <RadioSimNaoSabe label="Leite do peito?" value={respostas.m6_peito} onChange={(v:any) => resp('m6_peito', v)} />
                <RadioSimNaoSabe label="Água ou Chá?" value={respostas.m6_agua} onChange={(v:any) => resp('m6_agua', v)} />
                <RadioSimNaoSabe label="Fórmula Infantil?" value={respostas.m6_formula} onChange={(v:any) => resp('m6_formula', v)} />
                <RadioSimNaoSabe label="Leite de Vaca?" value={respostas.m6_vaca} onChange={(v:any) => resp('m6_vaca', v)} />
                <RadioSimNaoSabe label="Suco de Fruta?" value={respostas.m6_suco} onChange={(v:any) => resp('m6_suco', v)} />
                <RadioSimNaoSabe label="Fruta?" value={respostas.m6_fruta} onChange={(v:any) => resp('m6_fruta', v)} />
                <RadioSimNaoSabe label="Comida de sal (sopa/papa)?" value={respostas.m6_sal} onChange={(v:any) => resp('m6_sal', v)} />
              </Secao>
            )}

            {faixaEtaria === '23m' && (
              <Secao titulo="Crianças de 6 a 23 Meses" cor="#F59E0B">
                <Text style={styles.mutedTxt}>Ontem a criança consumiu:</Text>
                <RadioSimNaoSabe label="Leite do peito?" value={respostas.m23_peito} onChange={(v:any) => resp('m23_peito', v)} />
                <RadioSimNaoSabe label="Fruta inteira ou amassada?" value={respostas.m23_fruta} onChange={(v:any) => resp('m23_fruta', v)} />
                {respostas.m23_fruta === '1' && (
                  <View style={{ marginLeft: 16 }}>
                    <RadioSimNaoSabe label="Quantas vezes (Fruta)?" value={respostas.m23_frutaVez} onChange={(v:any) => resp('m23_frutaVez', v)} />
                  </View>
                )}
                <RadioSimNaoSabe label="Comida de sal (sopa/papa)?" value={respostas.m23_sal} onChange={(v:any) => resp('m23_sal', v)} />
                {respostas.m23_sal === '1' && (
                  <View style={{ marginLeft: 16 }}>
                    <RadioSimNaoSabe label="Quantas vezes (Sal)?" value={respostas.m23_salVez} onChange={(v:any) => resp('m23_salVez', v)} />
                    <RadioSimNaoSabe label="Como foi oferecida?" value={respostas.m23_ofer} onChange={(v:any) => resp('m23_ofer', v)} />
                  </View>
                )}
                <RadioSimNaoSabe label="Legumes ou vegetais escuros?" value={respostas.m23_legumes} onChange={(v:any) => resp('m23_legumes', v)} />
                <RadioSimNaoSabe label="Carne ou ovo?" value={respostas.m23_carne} onChange={(v:any) => resp('m23_carne', v)} />
                <RadioSimNaoSabe label="Feijão?" value={respostas.m23_feijao} onChange={(v:any) => resp('m23_feijao', v)} />
                <View style={styles.divisor} />
                <Text style={styles.mutedTxt}>Alimentos ultraprocessados consumidos ontem:</Text>
                <RadioSimNaoSabe label="Hambúrguer e/ou embutidos?" value={respostas.m23_emb} onChange={(v:any) => resp('m23_emb', v)} />
                <RadioSimNaoSabe label="Bebidas adoçadas?" value={respostas.m23_refri} onChange={(v:any) => resp('m23_refri', v)} />
                <RadioSimNaoSabe label="Doces ou guloseimas?" value={respostas.m23_doce} onChange={(v:any) => resp('m23_doce', v)} />
              </Secao>
            )}

            {faixaEtaria === 'maior2' && (
              <Secao titulo="Cidadãos com 2 anos ou mais" cor="#F59E0B">
                <RadioSimNaoSabe label="Realiza refeições assistindo TV/celular?" value={respostas.m2_tv} onChange={(v:any) => resp('m2_tv', v)} />
                <View style={styles.divisor} />
                <Text style={[styles.campoLabel, { color: theme.text }]}>Quais refeições você faz ao longo do dia?</Text>
                <View style={[styles.checkGrid, { marginBottom: 12 }]}>
                  <CheckItem label="Café da Manhã" width="48%" value={refeicoes.cafe} onChange={(v:any) => ref('cafe', v)} />
                  <CheckItem label="Lanche da Manhã" width="48%" value={refeicoes.lancheM} onChange={(v:any) => ref('lancheM', v)} />
                  <CheckItem label="Almoço" width="48%" value={refeicoes.almoco} onChange={(v:any) => ref('almoco', v)} />
                  <CheckItem label="Lanche da Tarde" width="48%" value={refeicoes.lancheT} onChange={(v:any) => ref('lancheT', v)} />
                  <CheckItem label="Jantar" width="48%" value={refeicoes.jantar} onChange={(v:any) => ref('jantar', v)} />
                  <CheckItem label="Ceia" width="48%" value={refeicoes.ceia} onChange={(v:any) => ref('ceia', v)} />
                </View>
                <View style={styles.divisor} />
                <Text style={styles.mutedTxt}>Ontem você consumiu:</Text>
                <RadioSimNaoSabe label="Feijão?" value={respostas.m2_feijao} onChange={(v:any) => resp('m2_feijao', v)} />
                <RadioSimNaoSabe label="Frutas frescas?" value={respostas.m2_frutas} onChange={(v:any) => resp('m2_frutas', v)} />
                <RadioSimNaoSabe label="Verduras e legumes?" value={respostas.m2_verduras} onChange={(v:any) => resp('m2_verduras', v)} />
                <RadioSimNaoSabe label="Embutidos?" value={respostas.m2_emb} onChange={(v:any) => resp('m2_emb', v)} />
                <RadioSimNaoSabe label="Bebidas adoçadas?" value={respostas.m2_refri} onChange={(v:any) => resp('m2_refri', v)} />
                <RadioSimNaoSabe label="Macarrão instantâneo?" value={respostas.m2_mac} onChange={(v:any) => resp('m2_mac', v)} />
              </Secao>
            )}
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, isTabletHorizontal && styles.footerTablet]}>
        <TouchableOpacity style={[styles.btnConfirmar, isTabletHorizontal && { width: 400 }]} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>SALVAR AVALIAÇÃO ALIMENTAR</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, backgroundColor: theme.background },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitulo: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.success, textAlign: 'center' },
  badgeTablet: { backgroundColor: theme.infoBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: '700', color: theme.success },
  tabletWrapper: { flexDirection: 'row', gap: 14, paddingHorizontal: 10, paddingBottom: 12 },
  mobileWrapper: { flexDirection: 'column', paddingBottom: 12 },
  column: { flex: 1 },
  scroll: { flex: 1 },
  secao: { backgroundColor: theme.card, marginTop: 14, marginHorizontal: 8, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderLeftWidth: 6, backgroundColor: theme.cardSecondary },
  secaoTitulo: { fontSize: 14, fontWeight: '800', color: theme.text },
  secaoBody: { padding: 18, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  inputWrap: { marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, backgroundColor: theme.cardSecondary, color: theme.text },
  readonlyVal: { backgroundColor: theme.cardSecondary, padding: 14, borderRadius: 14, color: theme.textMuted, borderWidth: 1, borderColor: theme.border, marginTop: 4 },
  campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 },
  divisor: { height: 1, backgroundColor: theme.border, marginVertical: 10 },
  mutedTxt: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', lineHeight: 18 },
  radioGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  radioBtn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.border },
  radioBtnOn: { backgroundColor: theme.success, borderColor: theme.success },
  radioTxt: { fontWeight: '700', color: theme.textMuted, fontSize: 12 },
  radioTxtOn: { color: '#fff' },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card },
  checkboxOn: { backgroundColor: theme.success, borderColor: theme.success },
  checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },
  faixaGroup: { gap: 8 },
  faixaBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: theme.borderInput, backgroundColor: theme.cardSecondary },
  faixaBtnOn: { backgroundColor: theme.successBg, borderColor: theme.success },
  faixaTxt: { fontSize: 14, fontWeight: '600', color: theme.textMuted },
  faixaTxtOn: { color: theme.success },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  btnSearch: { backgroundColor: theme.primary, width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 },
  autocompleteContainer: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, marginTop: 8, overflow: 'hidden', shadowOpacity: 0.1, shadowRadius: 4},
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