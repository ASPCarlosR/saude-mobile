import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TextInput, TouchableOpacity, Modal, Alert, RefreshControl,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatarDataBR, formatarCPF } from '@utils/conversoes';
import { database } from '@db/index'; // Importação do banco de dados local WatermelonDB
import { Colors } from '../fichas/colors'; // Ajuste o caminho se necessário


interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  especialidade: string;
  horarioConsulta: string;
  telefone: string;
  presente: boolean | null; 
  observacaoPaciente?: string;
}

interface Viagem {
  localId: string; // ID interno gerado pelo WatermelonDB (ex: 'v123')
  id: number;      // ID real da viagem vindo do PostgreSQL (sdviagemid)
  data: string;
  codigo: string;
  destino: string;
  veiculo: string;
  motorista: string;
  status: 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';
  observacao: string;
  pacientes: Paciente[];
  syncStatus: string; // 'synced' ou 'pending'
}

const STATUS_INFO = {
  agendada:      { label: 'Agendada',      cor: '#2563EB', bg: '#EFF6FF' },
  em_andamento:  { label: 'Em andamento',  cor: '#D97706', bg: '#FFFBEB' },
  concluida:     { label: 'Concluída',     cor: '#059669', bg: '#F0FDF4' },
  cancelada:     { label: 'Cancelada',     cor: '#DC2626', bg: '#FEF2F2' },
};

export default function TransporteScreen() {
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);

  // Estados para o Modal de Edição Offline
  const [viagemSelecionada, setViagemSelecionada] = useState<Viagem | null>(null);
  const [obsEditada, setObsEditada] = useState('');
  const [pacientesEditados, setPacientesEditados] = useState<Paciente[]>([]);
  const [pacienteExpandidoId, setPacienteExpandidoId] = useState<number | null>(null);

  const carregarLocal = useCallback(async () => {
    setCarregando(true);
    try {
      // Busca TODAS as viagens armazenadas no celular
      const collection = database.collections.get('viagens');
      const registrosLocais = await collection.query().fetch();
      
      const viagensMapeadas: Viagem[] = registrosLocais.map((reg: any) => ({
        localId: reg.id,
        id: reg.viagem_id,
        data: reg.data,
        codigo: reg.codigo,
        destino: reg.destino,
        veiculo: reg.veiculo,
        motorista: reg.motorista,
        status: reg.status,
        observacao: reg.observacao || '',
        pacientes: reg.pacientes ? JSON.parse(reg.pacientes) : [],
        syncStatus: reg.sync_status,
      }));

      // Ordena pelas mais recentes
      viagensMapeadas.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      setViagens(viagensMapeadas);
    } catch (e) {
      console.error("Erro ao carregar viagens locais:", e);
      Alert.alert("Aviso", "Não foi possível carregar as viagens salvas no aparelho. Verifique se o módulo foi sincronizado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { 
    carregarLocal(); 
  }, [carregarLocal]);

  // Função para abrir a Folha de Viagem e preparar os dados para edição
  const abrirModalViagem = (viagem: Viagem) => {
    setViagemSelecionada(viagem);
    setObsEditada(viagem.observacao);
    // Cria uma cópia profunda dos pacientes para podermos editar sem alterar o estado original até salvar
    setPacientesEditados(JSON.parse(JSON.stringify(viagem.pacientes)));
  };

  // Salva as alterações APENAS no banco local e marca para envio futuro
  async function salvarDadosViagemLocal() {
    if (!viagemSelecionada) return;

    try {
      await database.write(async () => {
        const record: any = await database.collections.get('viagens').find(viagemSelecionada.localId);
        await record.update((r: any) => {
          r.observacao = obsEditada;
          r.pacientes = JSON.stringify(pacientesEditados);
          r.sync_status = 'pending'; // Sinaliza para o index.ts que essa viagem precisa ser enviada
        });
      });
      
      Alert.alert("Sucesso", "Viagem salva offline!\nSerá enviada na próxima sincronização.");
      setViagemSelecionada(null);
      setPacienteExpandidoId(null);
      carregarLocal(); // Recarrega a lista para mostrar o novo status
    } catch (e) {
      console.error("Erro ao salvar offline:", e);
      Alert.alert("Erro", "Não foi possível salvar a viagem no aparelho.");
    }
  }

  const handlePresenceUpdate = (pacienteId: number, status: boolean | null) => {
    setPacientesEditados(prev => prev.map(p => 
      p.id === pacienteId ? { ...p, presente: status } : p
    ));
  };

  const handleObsPacienteUpdate = (pacienteId: number, txt: string) => {
    setPacientesEditados(prev => prev.map(p => 
      p.id === pacienteId ? { ...p, observacaoPaciente: txt } : p
    ));
  };

  const viagensFiltradas = viagens.filter(v =>
    v.destino.toLowerCase().includes(busca.toLowerCase()) ||
    v.pacientes.some(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitulo}>Transporte</Text>
          <Text style={styles.headerSub}>{formatarDataBR(new Date())} - Modo Offline</Text>
        </View>
      </View>

      {/* BUSCA RÁPIDA (Local) */}
      <View style={styles.buscaContainerRow}>
        <View style={styles.buscaContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={styles.buscaIcone} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar destino ou passageiro offline..."
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={carregarLocal} colors={["#0A4F6E"]} />
        }
      >
        {viagensFiltradas.length === 0 && !carregando && (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
             <Ionicons name="bus-outline" size={48} color="#CBD5E1" />
             <Text style={{ marginTop: 12, color: '#6B7280', textAlign: 'center' }}>
               Nenhuma viagem encontrada no aparelho. Sincronize na tela inicial.
             </Text>
          </View>
        )}

        {viagensFiltradas.map(viagem => (
          <TouchableOpacity 
            key={viagem.localId} 
            style={styles.card} 
            activeOpacity={0.7}
            onPress={() => abrirModalViagem(viagem)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.statusPill, { backgroundColor: STATUS_INFO[viagem.status]?.bg || '#f3f4f6' }]}>
                  <Text style={[styles.statusTxt, { color: STATUS_INFO[viagem.status]?.cor || '#374151' }]}>
                    {STATUS_INFO[viagem.status]?.label || 'Desconhecido'}
                  </Text>
                </View>
                <Text style={styles.destino}>#{viagem.codigo} - {viagem.destino}</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="car-outline" size={14} color="#6B7280" />
                  <Text style={styles.cardMetaTxt}>{viagem.veiculo || 'Veículo não inf.'}</Text>
                  <Ionicons name="people-outline" size={14} color="#0A4F6E" style={{ marginLeft: 8 }} />
                  <Text style={[styles.cardMetaTxt, { color: '#0A4F6E' }]}>{viagem.pacientes.length} passageiros</Text>
                </View>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                {/* Ícone indicando se a viagem precisa ser enviada para o servidor */}
                {viagem.syncStatus === 'pending' ? (
                  <Ionicons name="cloud-offline-outline" size={20} color="#EA580C" style={{ marginBottom: 4 }} />
                ) : (
                  <Ionicons name="checkmark-done-circle" size={20} color="#10B981" style={{ marginBottom: 4 }} />
                )}
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL DE DETALHES DA VIAGEM */}
      <Modal visible={!!viagemSelecionada} animationType="slide">
        <SafeAreaView style={styles.safe}>
          <View style={styles.headerModal}>
            <TouchableOpacity onPress={() => setViagemSelecionada(null)}>
              <Ionicons name="close" size={28} color="#0A4F6E" />
            </TouchableOpacity>
            <Text style={styles.headerTitulo}>Folha de Viagem</Text>
            <TouchableOpacity onPress={salvarDadosViagemLocal}>
              <Text style={{ color: '#0A4F6E', fontWeight: '700' }}>SALVAR</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            {viagemSelecionada?.syncStatus === 'pending' && (
              <View style={styles.avisoOffline}>
                <Ionicons name="warning-outline" size={16} color="#9A3412" />
                <Text style={styles.avisoOfflineTxt}>Existem edições não sincronizadas nesta viagem.</Text>
              </View>
            )}

            <View style={styles.cardInfo}>
              <Text style={styles.infoLabel}>Destino:</Text>
              <Text style={styles.infoValue}>{viagemSelecionada?.destino}</Text>
              <Text style={styles.infoLabel}>Motorista:</Text>
              <Text style={styles.infoValue}>{viagemSelecionada?.motorista || 'Não informado'}</Text>
            </View>

            <Text style={styles.campoLabel}>Observações da Viagem (Geral)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline
              placeholder="Ex: Atraso devido à chuva, problema mecânico..."
              value={obsEditada}
              onChangeText={setObsEditada}
            />

            <Text style={[styles.pacientesHeader, { marginTop: 24 }]}>Passageiros e Presença</Text>
            {pacientesEditados.map(p => (
              <View key={p.id} style={styles.pacienteCard}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPacienteExpandidoId(pacienteExpandidoId === p.id ? null : p.id)}>
                  <View style={styles.pacienteHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.pacienteNome}>{p.nome}</Text>
                      <Text style={styles.pacienteCPF}>{p.cpf ? formatarCPF(p.cpf) : 'CPF não informado'} | {p.horarioConsulta || 'Sem hora'}</Text>
                    </View>
                    <View style={styles.acoesPresenca}>
                      <TouchableOpacity 
                        style={[styles.btnPresencaSimple, p.presente === true && styles.btnPresenteAtivo]}
                        onPress={() => handlePresenceUpdate(p.id, true)}
                      >
                        <Ionicons name="checkmark" size={18} color={p.presente === true ? "#fff" : "#16A34A"} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.btnPresencaSimple, p.presente === false && styles.btnAusenteAtivo]}
                        onPress={() => handlePresenceUpdate(p.id, false)}
                      >
                        <Ionicons name="close" size={18} color={p.presente === false ? "#fff" : "#DC2626"} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>

                {pacienteExpandidoId === p.id && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.campoLabel}>Observação do Passageiro</Text>
                    <TextInput
                      style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                      multiline
                      placeholder="Ex: Paciente passou mal, não compareceu..."
                      value={p.observacaoPaciente}
                      onChangeText={(txt) => handleObsPacienteUpdate(p.id, txt)}
                    />
                  </View>
                )}
              </View>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  safe:               { flex: 1, backgroundColor: theme.background },
  header:             { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: theme.cardBackground,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        borderBottomWidth: 1, borderBottomColor: theme.border },
  headerTitulo:       { fontSize: 20, fontWeight: '700', color: theme.text },
  headerSub:          { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  buscaContainerRow:  { marginHorizontal: 16, marginTop: 16 },
  buscaContainer:     { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.inputBackground,
                        borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12 },
  buscaIcone:         { marginRight: 8 },
  buscaInput:         { flex: 1, paddingVertical: 10, fontSize: 14, color: theme.text },
  scroll:             { flex: 1, paddingHorizontal: 16, marginTop: 16 },
  card:               { backgroundColor: theme.cardBackground, borderRadius: 14, marginBottom: 12, elevation: 2, overflow: 'hidden' },
  cardHeader:         { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardHeaderLeft:     { flex: 1, gap: 4 },
  statusPill:         { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusTxt:          { fontSize: 11, fontWeight: '700' },
  destino:            { fontSize: 16, fontWeight: '700', color: theme.text },
  cardMeta:           { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardMetaTxt:        { fontSize: 12, color: theme.textSecondary },
  
  // Detalhes Modal
  headerModal:        { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.cardBackground,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        borderBottomWidth: 1, borderBottomColor: theme.border },
  avisoOffline:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEDD5', padding: 10, borderRadius: 8, marginBottom: 16, gap: 8 },
  avisoOfflineTxt:    { color: '#9A3412', fontSize: 12, fontWeight: '600' },
  cardInfo:           { backgroundColor: theme.cardBackground, padding: 12, borderRadius: 10, marginBottom: 16 },
  infoLabel:          { fontSize: 11, color: theme.textSecondary, textTransform: 'uppercase' },
  infoValue:          { fontSize: 14, fontWeight: '600', color: theme.text, marginBottom: 8 },
  campoLabel:         { fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 6 },
  input:              { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, backgroundColor: theme.inputBackground },
  pacientesHeader:    { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 12 },
  pacienteCard:       { backgroundColor: theme.cardBackground, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  pacienteHeaderRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteNome:       { fontSize: 14, fontWeight: '600', color: theme.text },
  pacienteCPF:        { fontSize: 12, color: theme.textSecondary },
  acoesPresenca:      { flexDirection: 'row', gap: 8 },
  btnPresencaSimple:  { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: theme.border, 
                        alignItems: 'center', justifyContent: 'center', backgroundColor: theme.inputBackground },
  btnPresenteAtivo:   { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  btnAusenteAtivo:    { backgroundColor: '#DC2626', borderColor: '#DC2626' }
});