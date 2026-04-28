import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ActivityIndicator, useWindowDimensions, useColorScheme } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/index';
import * as Location from 'expo-location';
import { database, domicilioCollection } from '../../src/db/index';
import { gerarGUID, dataAtualDDMMYYYY, dataHoraAtual, formatarDataSegura } from '../../src/utils/conversoes';
import { API_BASE_URL } from '../../src/config';
import { Colors } from './colors';

interface MoradorFamilia {
  id: string;
  guid?: string;
  nome: string;
  cns: string;
  cpf: string;
  dataNascimento: string;
  ehResponsavel: boolean;
}

interface FormCadDomiciliar {
  data: string; dataAtualizacao: string; situacao: 'S' | 'N';
  municipioId: number | null; municipioNome: string; endereco: string; logradouroDneId: number | null; logradouroCepDneId: number | null; numero: string; semNumero: boolean;
  pontoReferencia: string; quarteirao: string; complemento: string;
  microArea: string; foraArea: boolean; latitude: string; longitude: string;
  tipoImovel: number; dddResid: string; foneResid: string; dddContato: string; foneContato: string;
  sitMoradia: number; localizacao: number; tipoDomicilio: number;
  comodos: string; areaRural: number; tipoAcesso: number;
  materialParedes: number; abastecimentoAgua: number; aguaConsumo: number;
  escoamento: number; destinoLixo: number; energiaEletrica: 'S' | 'N' | '';
  possuiAnimais: 'S' | 'N' | ''; animalGato: boolean; animalCachorro: boolean; animalPassaro: boolean; animalMacaco: boolean; animalGalinha: boolean; animalPorco: boolean; animalRepteis: boolean; animalOutros: boolean; animaisQtde: string;
  instituicaoNome: string; institOutroProf: 'S' | 'N' | ''; instituicaoId: number | null;
  termoRecusa: boolean; riscoFamiliar: string; observacao: string;
  moradores: MoradorFamilia[];
  unidadeNome: string; cnes: string; profissionalNome: string; equipeNome: string; equipeIne: string;
  qtdeMoradores: string; rendaFamiliar: string; prontuarioFamiliar: string; resideDesdeMes: string; resideDesdeAno: string;
}

const FORM_INICIAL: FormCadDomiciliar = {
  data: dataAtualDDMMYYYY(), dataAtualizacao: dataHoraAtual(), situacao: 'S',
  municipioId: null, municipioNome: '', endereco: '', logradouroDneId: null, logradouroCepDneId: null, numero: '', semNumero: false,
  pontoReferencia: '', quarteirao: '', complemento: '', microArea: '', foraArea: false, latitude: '', longitude: '', tipoImovel: 0,
  dddResid: '', foneResid: '', dddContato: '', foneContato: '', sitMoradia: 0, localizacao: 0, tipoDomicilio: 0,
  comodos: '', areaRural: 0, tipoAcesso: 0, materialParedes: 0, abastecimentoAgua: 0, aguaConsumo: 0, escoamento: 0, destinoLixo: 0, energiaEletrica: '',
  possuiAnimais: '', animalGato: false, animalCachorro: false, animalPassaro: false, animalMacaco: false, animalGalinha: false, animalPorco: false, animalRepteis: false, animalOutros: false, animaisQtde: '',
  instituicaoNome: '', institOutroProf: '', instituicaoId: null, termoRecusa: false, riscoFamiliar: '', observacao: '',
  moradores: [], qtdeMoradores: '', rendaFamiliar: '', prontuarioFamiliar: '', resideDesdeMes: '', resideDesdeAno: '',
  unidadeNome: '', cnes: '', profissionalNome: '', equipeNome: '', equipeIne: ''
};

const OPTS = {
  tipoImovel: [{ v: 1, l: 'Domicílio' }, { v: 2, l: 'Comércio' }, { v: 3, l: 'Terreno baldio' }, { v: 4, l: 'Ponto Estratégico' }, { v: 5, l: 'Escola' }, { v: 6, l: 'Creche' }, { v: 7, l: 'Abrigo' }, { v: 8, l: 'Inst. longa permanência p/ idosos' }, { v: 9, l: 'Unidade prisional' }, { v: 10, l: 'Unidade medida sócio educativa' }, { v: 11, l: 'Delegacia' }, { v: 12, l: 'Estabelecimento Religioso' }, { v: 13, l: 'CASAI' }, { v: 99, l: 'Outros' }],
  sitMoradia: [{ v: 75, l: 'Próprio' }, { v: 76, l: 'Financiado' }, { v: 77, l: 'Alugado' }, { v: 78, l: 'Arrendado' }, { v: 79, l: 'Cedido' }, { v: 81, l: 'Situação de rua' }, { v: 80, l: 'Ocupação' }, { v: 204, l: 'Temporária' }, { v: 82, l: 'Outra' }],
  localizacao: [{ v: 83, l: 'Urbana' }, { v: 84, l: 'Rural' }, { v: 205, l: 'Periurbana' }],
  tipoDomicilio: [{ v: 85, l: 'Casa' }, { v: 86, l: 'Apartamento' }, { v: 87, l: 'Cômodo' }, { v: 206, l: 'Maloca' }, { v: 207, l: 'Improvisado' }, { v: 88, l: 'Outro' }],
  areaRural: [{ v: 101, l: 'Proprietário' }, { v: 104, l: 'Posseiro' }, { v: 108, l: 'Não se aplica' }, { v: 102, l: 'Parceiro(a)/Meeiro(a)' }, { v: 103, l: 'Assentado(a)' }, { v: 105, l: 'Arrendatário(a)' }, { v: 106, l: 'Comodatário(a)' }, { v: 107, l: 'Beneficiário(a) do banco da terra' }],
  tipoAcesso: [{ v: 90, l: 'Chão batido' }, { v: 91, l: 'Fluvial' }, { v: 89, l: 'Pavimento' }, { v: 92, l: 'Outro' }],
  materialParedes: [{ v: 109, l: 'Alvenaria/Tijolo c/ revestimento' }, { v: 110, l: 'Alvenaria/Tijolo s/ revestimento' }, { v: 111, l: 'Taipa c/ revestimento' }, { v: 112, l: 'Taipa s/ revestimento' }, { v: 113, l: 'Madeira aparelhada' }, { v: 114, l: 'Material aproveitado' }, { v: 115, l: 'Palha' }, { v: 210, l: 'Lona' }, { v: 211, l: 'Misto/Diferentes materiais' }, { v: 212, l: 'Caule de palmeira' }, { v: 213, l: 'Sem parede' }, { v: 116, l: 'Outro material' }],
  abastecimentoAgua: [{ v: 117, l: 'Rede encanada - Sistema público' }, { v: 214, l: 'Rede encanada - Sistema da aldeia (SESAI)' }, { v: 118, l: 'Poco/Nascente no domicílio' }, { v: 119, l: 'Cisterna' }, { v: 120, l: 'Carro pipa' }, { v: 215, l: 'Captação direta de rio' }, { v: 216, l: 'Captação direta de poço coletivo' }, { v: 217, l: 'Ponto coletivo - chafariz' }, { v: 121, l: 'Outro' }],
  aguaConsumo: [{ v: 98, l: 'Fervida' }, { v: 99, l: 'Clorada' }, { v: 152, l: 'Mineral' }, { v: 218, l: 'Filtrada (barro)' }, { v: 219, l: 'Filtrada (outro filtro)' }, { v: 220, l: 'Clorada c/ hipoclorito' }, { v: 100, l: 'Sem tratamento' }],
  escoamento: [{ v: 122, l: 'Rede coletora de esgoto/pluvial' }, { v: 123, l: 'Fossa séptica' }, { v: 124, l: 'Fossa rudimentar' }, { v: 125, l: 'Direto para rio/lago/mar' }, { v: 126, l: 'Céu aberto' }, { v: 127, l: 'Outra forma' }],
  destinoLixo: [{ v: 93, l: 'Coletado' }, { v: 221, l: 'Queimado' }, { v: 222, l: 'Enterrado' }, { v: 95, l: 'Céu aberto' }, { v: 96, l: 'Sem tratamento' }],
  riscoFamiliar: [{ v: 'B', l: 'Baixo' }, { v: 'A', l: 'Alto' }],
  rendaFamiliar: [{ v: '1', l: 'Menos de 1/4 SM' }, { v: '2', l: '1/4 até 1/2 SM' }, { v: '3', l: '1/2 até 1 SM' }, { v: '4', l: '1 até 2 SM' }, { v: '5', l: '2 até 3 SM' }, { v: '6', l: '3 até 4 SM' }, { v: '7', l: 'Mais de 4 SM' }],
  meses: [{ v: '01', l: '01 - Jan' }, { v: '02', l: '02 - Fev' }, { v: '03', l: '03 - Mar' }, { v: '04', l: '04 - Abr' }, { v: '05', l: '05 - Mai' }, { v: '06', l: '06 - Jun' }, { v: '07', l: '07 - Jul' }, { v: '08', l: '08 - Ago' }, { v: '09', l: '09 - Set' }, { v: '10', l: '10 - Out' }, { v: '11', l: '11 - Nov' }, { v: '12', l: '12 - Dez' }],
  anos: Array.from({ length: 100 }, (_, i) => ({ v: String(new Date().getFullYear() - i), l: String(new Date().getFullYear() - i) }))
};

function Secao({ titulo, children, cor = '#0A4F6E', abertaInicial = true }: any) {
  const [aberta, setAberta] = useState(abertaInicial);
  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  return (
    <View style={styles.secao}>
      <TouchableOpacity style={[styles.secaoHeader, { borderLeftColor: cor, backgroundColor: theme.cardSecondary }]} onPress={() => setAberta(!aberta)}>
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
      {readonly
        ? <Text style={styles.readonlyVal}>{value || '—'}</Text>
        : <TextInput
          style={[styles.input, linhas > 1 && { height: 80, textAlignVertical: 'top' }, { color: theme.text }]}
          value={value} onChangeText={onChange}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholder={placeholder} multiline={linhas > 1} numberOfLines={linhas}
          placeholderTextColor={theme.textMuted}
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

export default function CadastroDomiciliarScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768 && width > height;
  const { id } = useLocalSearchParams<{ id?: string }>();

  const theme = Colors[useColorScheme() ?? 'light'];
  const styles = getStyles(theme);
  const { profissional, unidade, equipe } = useAuthStore();

  const [form, setForm] = useState<FormCadDomiciliar>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [modalSelect, setModalSelect] = useState<{ visible: boolean; titulo: string; opcoes: any[]; campo: keyof FormCadDomiciliar | ''; }>({ visible: false, titulo: '', opcoes: [], campo: '' });
  const [buscaEndereco, setBuscaEndereco] = useState('');
  const [buscandoEnderecos, setBuscandoEnderecos] = useState(false);
  const [enderecosEncontrados, setEnderecosEncontrados] = useState<any[]>([]);
  const [buscaMunic, setBuscaMunic] = useState('');
  const [buscandoMunicipios, setBuscandoMunicipios] = useState(false);
  const [municipiosEncontrados, setMunicipiosEncontrados] = useState<any[]>([]);
  const [buscaPaciente, setBuscaPaciente] = useState('');
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [pacientesEncontrados, setPacientesEncontrados] = useState<any[]>([]);

  const upd = (campo: Partial<FormCadDomiciliar>) => {
    setForm(p => {
      const novo = { ...p, ...campo };
      if ('possuiAnimais' in campo && novo.possuiAnimais === 'N') {
        novo.animalGato = false; novo.animalCachorro = false; novo.animalPassaro = false;
        novo.animalMacaco = false; novo.animalGalinha = false; novo.animalPorco = false;
        novo.animalRepteis = false; novo.animalOutros = false; novo.animaisQtde = '';
      }
      return novo;
    });
  };

  const abrirSelect = (titulo: string, opcoes: any[], campo: keyof FormCadDomiciliar) => setModalSelect({ visible: true, titulo, opcoes, campo });
  const irParaVisita = () => {
    if (form.moradores.length === 0) { Alert.alert('Atenção', 'Não há moradores vinculados a este domicílio para realizar a visita.'); return; }
    router.push({ pathname: '/fichas/visita-domiciliar', params: { moradoresParam: JSON.stringify(form.moradores), microAreaParam: form.microArea } });
  };
  const toggleTodosAnimais = (valor: boolean) => { setForm(prev => ({ ...prev, animalGato: valor, animalCachorro: valor, animalPassaro: valor, animalMacaco: valor, animalGalinha: valor, animalPorco: valor, animalRepteis: valor, animalOutros: valor })); };

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (buscaEndereco.trim().length >= 3) {
        setBuscandoEnderecos(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/sync/enderecos?termo=${encodeURIComponent(buscaEndereco)}`);
          const result = await response.json();
          setEnderecosEncontrados(result.status === 'S' && result.dados ? result.dados : []);
        } catch (error) { console.error('Erro no auto-completar de endereços:', error); } finally { setBuscandoEnderecos(false); }
      } else { setEnderecosEncontrados([]); }
    }, 500); return () => clearTimeout(timeoutId);
  }, [buscaEndereco]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const termo = buscaMunic.trim();
      if (termo.length >= 3) {
        setBuscandoMunicipios(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/sync/municipios?termo=${encodeURIComponent(termo)}`);
          const result = await response.json();
          setMunicipiosEncontrados(result.status === 'S' && result.dados ? result.dados : []);
        } catch (error) { console.error('Erro no auto-completar de municípios:', error); } finally { setBuscandoMunicipios(false); }
      } else { setMunicipiosEncontrados([]); }
    }, 500); return () => clearTimeout(timeoutId);
  }, [buscaMunic]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      const termo = buscaPaciente.trim();
      if (termo.length >= 3) {
        setBuscandoPacientes(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/sync/pacientes?termo=${encodeURIComponent(termo)}`);
          const result = await response.json();
          setPacientesEncontrados(result.status === 'S' && result.dados ? result.dados : []);
        } catch (error) { } finally { setBuscandoPacientes(false); }
      } else { setPacientesEncontrados([]); }
    }, 500); return () => clearTimeout(timeoutId);
  }, [buscaPaciente]);

  const selecionarPaciente = (p: any) => {
    const jaExiste = form.moradores.some(m => m.id === String(p.id));
    if (jaExiste) {
      Alert.alert('Atenção', 'Este morador já foi adicionado.');
    } else {
      const novoMorador: MoradorFamilia = {
        id: String(p.id),
        guid: p.guid || '',
        nome: p.nome,
        cns: p.cns || '',
        cpf: p.cpf || '',
        dataNascimento: p.dtnasc || p.dtNasc || '',
        ehResponsavel: form.moradores.length === 0,
      };

      upd({ moradores: [...form.moradores, novoMorador] });
    }

    setBuscaPaciente('');
    setPacientesEncontrados([]);
  };

  const definirResponsavel = (id: string) => { upd({ moradores: form.moradores.map(m => ({ ...m, ehResponsavel: m.id === id })) }); };
  const removerMorador = (id: string) => {
    const novaLista = form.moradores.filter(m => m.id !== id);
    if (form.moradores.find(m => m.id === id)?.ehResponsavel && novaLista.length > 0) novaLista[0].ehResponsavel = true;
    upd({ moradores: novaLista });
  };

  const selecionarEndereco = (end: any) => { upd({ logradouroDneId: end.dneId, logradouroCepDneId: end.cepDneId, endereco: end.nomeConcatenado }); setBuscaEndereco(''); setEnderecosEncontrados([]); };
  const selecionarMunicipio = (mun: any) => { upd({ municipioId: mun.id, municipioNome: mun.nomeUf || mun.nome }); setBuscaMunic(''); setMunicipiosEncontrados([]); };

  async function realizarBuscaEndereco() {
    if (!buscaEndereco.trim()) return Alert.alert('Atenção', 'Digite o nome da rua para buscar.');
    setBuscandoEnderecos(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/enderecos?termo=${encodeURIComponent(buscaEndereco)}`);
      const result = await response.json();
      if (result.status === 'S' && result.dados && result.dados.length > 0) setEnderecosEncontrados(result.dados);
      else { setEnderecosEncontrados([]); Alert.alert('Não encontrado', 'Nenhum endereço encontrado com este termo.'); }
    } catch (error) { console.error(error); Alert.alert('Erro', 'Não foi possível buscar os endereços. Verifique sua conexão.'); } finally { setBuscandoEnderecos(false); }
  }

  async function realizarBuscaMunicipio() {
    const termo = buscaMunic.trim();
    if (!termo) return Alert.alert('Atenção', 'Digite o nome do município para buscar.');
    setBuscandoMunicipios(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sync/municipios?termo=${encodeURIComponent(termo)}`);
      if (!response.ok) throw new Error(`Servidor retornou erro ${response.status}`);
      const result = await response.json();
      if (result.status === 'S' && result.dados && result.dados.length > 0) setMunicipiosEncontrados(result.dados);
      else { setMunicipiosEncontrados([]); Alert.alert('Não encontrado', 'Nenhum município encontrado com este termo.'); }
    } catch (error) { console.error(error); Alert.alert('Erro na API', 'Não foi possível conectar.'); } finally { setBuscandoMunicipios(false); }
  }

  useEffect(() => { if (id) carregarDomicilioLocal(id); }, [id]);

  async function carregarDomicilioLocal(domicilioId: string) {
    try {
      const d = await domicilioCollection.find(domicilioId);
      let extras: any = {};
      try { if ((d as any).dados) { extras = typeof (d as any).dados === 'string' ? JSON.parse((d as any).dados) : (d as any).dados; } } catch (e) { }

      setForm(prev => ({
        ...prev,
        data: formatarDataSegura(d.dataCadastro) || dataAtualDDMMYYYY(),
        endereco: (d as any).logradouroNome || extras.endereco || '',
        municipioId: (d as any).municipio ? parseInt((d as any).municipio) : null,
        municipioNome: extras.municipioNome || 'Barretos',
        unidadeNome: (d as any).unidadeNome || extras.unidadeNome || unidade?.nome || '',
        cnes: (d as any).cnes || extras.cnes || profissional?.cnes || String(unidade?.cnes || ''),
        profissionalNome: extras.profissionalNome || profissional?.nome || '',
        equipeNome: extras.equipeNome || equipe?.nome || '',
        equipeIne: extras.equipeIne || equipe?.ine || '',
        numero: d.numero || extras.numero || '',
        microArea: d.microArea || extras.microArea || '',
        tipoImovel: d.tipoImovel || (d as any).tipo_imovel || 1,
        tipoAcesso: (d as any).tipoAcesso || extras.tipoAcesso || 0,
        aguaConsumo: (d as any).aguaConsumo || extras.aguaConsumo || 0,
        sitMoradia: (d as any).situacaoMoradia || (d as any).sitMoradia || extras.sitMoradia || 0,
        localizacao: (d as any).localizacao || extras.localizacao || 0,
        tipoDomicilio: (d as any).tipoDomicilio || extras.tipoDomicilio || 0,
        areaRural: (d as any).areaRural || extras.areaRural || 0,
        materialParedes: (d as any).materialParedes || extras.materialParedes || 0,
        abastecimentoAgua: (d as any).abastecimentoAgua || extras.abastecimentoAgua || 0,
        escoamento: (d as any).escoamento || extras.escoamento || 0,
        destinoLixo: (d as any).destinoLixo || extras.destinoLixo || 0,
        energiaEletrica: (d as any).energiaEletrica || extras.energiaEletrica || '',
        possuiAnimais: (d as any).possuiAnimais || extras.possuiAnimais || '',
        animalGato: (d as any).animalGato || extras.animalGato || false,
        animalCachorro: (d as any).animalCachorro || extras.animalCachorro || false,
        animalPassaro: (d as any).animalPassaro || extras.animalPassaro || false,
        animalMacaco: (d as any).animalMacaco || extras.animalMacaco || false,
        animalGalinha: (d as any).animalGalinha || extras.animalGalinha || false,
        animalPorco: (d as any).animalPorco || extras.animalPorco || false,
        animalRepteis: (d as any).animalRepteis || extras.animalRepteis || false,
        animalOutros: (d as any).animalOutros || extras.animalOutros || false,
        animaisQtde: (d as any).animaisQtde || extras.animaisQtde || '',
        comodos: (d as any).comodos ? String((d as any).comodos) : (extras.comodos || ''),
        complemento: d.complemento || extras.complemento || '',
        quarteirao: d.quarteirao || extras.quarteirao || '',
        pontoReferencia: d.pontoReferencia || extras.pontoReferencia || '',
        prontuarioFamiliar: extras.prontuarioFamiliar || '',
        resideDesdeMes: extras.resideDesdeMes || '',
        resideDesdeAno: extras.resideDesdeAno || '',
        rendaFamiliar: extras.rendaFamiliar || '',
        dddResid: (d as any).dddResid ? String((d as any).dddResid) : (extras.dddResid || ''),
        foneResid: d.foneResid || extras.foneResid || '',
        dddContato: (d as any).dddContato ? String((d as any).dddContato) : (extras.dddContato || ''),
        foneContato: d.foneContato || extras.foneContato || '',
        qtdeMoradores: (d.moradores !== null && d.moradores !== undefined) ? String(d.moradores) : (extras.qtdeMoradores || ''),
        moradores: extras.moradores || [],
      }));
    } catch (err) { Alert.alert('Erro', 'Não foi possível carregar os dados.'); }
  }

  const salvar = async () => {
    if (!form.microArea.trim()) { Alert.alert('Atenção', 'Informe a Microárea do domicílio.'); return; }
    if (form.tipoImovel === 1 && !form.termoRecusa) {
      if (!form.comodos || parseInt(form.comodos) <= 0) { Alert.alert('Inconsistência e-SUS', 'O campo Nº de Cômodos é obrigatório e deve ser maior que zero para domicílios.'); return; }
      if (!form.tipoDomicilio || form.tipoDomicilio === 0) { Alert.alert('Inconsistência e-SUS', 'O campo Tipo de Domicílio é obrigatório.'); return; }
      if (!form.sitMoradia || form.sitMoradia === 0) { Alert.alert('Inconsistência e-SUS', 'O campo Situação da Moradia é obrigatório.'); return; }
      if (!form.localizacao || form.localizacao === 0) { Alert.alert('Inconsistência e-SUS', 'O campo Localização é obrigatório.'); return; }
    }

    setSalvando(true);
    let latCapturada = form.latitude; let lngCapturada = form.longitude;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latCapturada = String(loc.coords.latitude); lngCapturada = String(loc.coords.longitude);
      }
    } catch (e) { console.warn('Falha ao obter GPS no background:', e); }

    const preencher = (reg: any) => {
      reg.dataCadastro = form.data; reg.dataAtualizacao = dataHoraAtual(); reg.situacao = form.situacao;
      reg.microArea = form.microArea || ''; reg.foraArea = form.foraArea; reg.latitude = latCapturada || ''; reg.longitude = lngCapturada || '';
      reg.municipio = form.municipioId ? String(form.municipioId) : (form.municipioNome || '');
      reg.endereco = form.endereco || ''; reg.numero = form.numero || ''; reg.semNumero = form.semNumero;
      reg.complemento = form.complemento || ''; reg.pontoReferencia = form.pontoReferencia || ''; reg.quarteirao = form.quarteirao || '';
      reg.tipoImovel = form.tipoImovel || 0;
      reg.dddResid = form.dddResid ? parseInt(form.dddResid) : null; reg.foneResid = form.foneResid || '';
      reg.dddContato = form.dddContato ? parseInt(form.dddContato) : null; reg.foneContato = form.foneContato || '';
      reg.sitMoradia = form.sitMoradia || null; reg.localizacao = form.localizacao || null; reg.tipoDomicilio = form.tipoDomicilio || null;
      reg.moradores = form.qtdeMoradores ? parseInt(form.qtdeMoradores) : (form.moradores.length > 0 ? form.moradores.length : null);
      reg.comodos = form.comodos ? parseInt(form.comodos) : null; reg.areaRural = form.areaRural || null; reg.tipoAcesso = form.tipoAcesso || null;
      reg.materialParedes = form.materialParedes || null; reg.energiaEletrica = form.energiaEletrica || ''; reg.abastecimentoAgua = form.abastecimentoAgua || null;
      reg.aguaConsumo = form.aguaConsumo || null; reg.escoamento = form.escoamento || null; reg.destinoLixo = form.destinoLixo || null;
      reg.possuiAnimais = form.possuiAnimais || ''; reg.animalGato = form.animalGato; reg.animalCachorro = form.animalCachorro;
      reg.animalPassaro = form.animalPassaro; reg.animalMacaco = form.animalMacaco; reg.animalGalinha = form.animalGalinha;
      reg.animalPorco = form.animalPorco; reg.animalRepteis = form.animalRepteis; reg.animalOutros = form.animalOutros;
      reg.animaisQtde = form.animaisQtde ? parseInt(form.animaisQtde) : null; reg.instituicaoId = form.instituicaoId;
      reg.institOutroProf = form.institOutroProf || ''; reg.riscoFamiliar = form.riscoFamiliar || ''; reg.termoRecusa = form.termoRecusa; reg.observacao = form.observacao || '';

      if (form.termoRecusa) {
        reg.municipio = ''; reg.endereco = ''; reg.numero = ''; reg.complemento = ''; reg.pontoReferencia = ''; reg.quarteirao = ''; reg.cep = '';
        reg.sitMoradia = null; reg.localizacao = null; reg.tipoDomicilio = null; reg.moradores = null; reg.comodos = null; reg.areaRural = null; reg.tipoAcesso = null;
        reg.materialParedes = null; reg.energiaEletrica = ''; reg.abastecimentoAgua = null; reg.aguaConsumo = null; reg.escoamento = null; reg.destinoLixo = null;
        reg.possuiAnimais = ''; reg.animalGato = false; reg.animalCachorro = false; reg.animalPassaro = false; reg.animalMacaco = false; reg.animalGalinha = false;
        reg.animalPorco = false; reg.animalRepteis = false; reg.animalOutros = false; reg.animaisQtde = null;
      }
      if (form.tipoImovel === 1) { reg.instituicaoNome = ''; reg.institOutroProf = ''; }
      try { reg.dados = JSON.stringify(form); } catch (e) { }
    };

    setSalvando(true);
    try {
      await database.write(async () => {
        if (id) {
          const d = await domicilioCollection.find(id);
          await d.update(reg => { preencher(reg); reg.syncStatus = 'pending'; });
        } else {
          await domicilioCollection.create(reg => { reg.guid = gerarGUID(); reg.syncStatus = 'pending'; preencher(reg); });
        }
      });
      Alert.alert('Sucesso', 'Cadastro domiciliar salvo!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) { console.error('[salvar domicílio]', err); Alert.alert('Erro', 'Ocorreu um erro ao salvar os dados.'); } finally { setSalvando(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={theme.primary} /></TouchableOpacity>
        <Text style={styles.headerTitulo}>Cadastro Domiciliar</Text>
        <View style={styles.badgeTablet}><Text style={styles.badgeText}>{isTablet ? 'TABLET' : 'MOBILE'}</Text></View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={isTablet ? styles.tabletWrapper : styles.mobileWrapper}>

          <View style={isTablet ? styles.column : undefined}>
            <Secao titulo="Identificação">
              <View style={styles.row}>
                <Input label="Data do Cadastro" value={form.data} onChange={(v: any) => upd({ data: v })} half placeholder="DD/MM/AAAA" />
                <Input label="Última Atualização" value={form.dataAtualizacao} readonly half />
              </View>
              <View style={styles.inputWrap}>
                <Text style={styles.campoLabel}>Situação</Text>
                <View style={[styles.row, { marginTop: 4 }]}>
                  <TouchableOpacity style={[styles.radioBtn, form.situacao === 'S' && styles.radioBtnOn]} onPress={() => upd({ situacao: 'S' })}><Text style={[styles.radioTxt, form.situacao === 'S' && styles.radioTxtOn]}>Ativo</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.radioBtn, form.situacao === 'N' && styles.radioBtnOn]} onPress={() => upd({ situacao: 'N' })}><Text style={[styles.radioTxt, form.situacao === 'N' && styles.radioTxtOn]}>Inativo</Text></TouchableOpacity>
                </View>
              </View>
              <View style={styles.row}>
                <Input label="CNES" value={form.cnes} readonly half />
                <Input label="Unidade" value={form.unidadeNome} readonly half />
              </View>
              <View style={styles.row}>
                <Input label="Profissional" value={form.profissionalNome} readonly half />
                <Input label="Equipe" value={`Equipe ${form.equipeNome} ${form.equipeIne}`} readonly half />
              </View>
            </Secao>

            <Secao titulo="Endereço / Localização" cor="#0891B2">
              <Text style={styles.campoLabel}>Município *</Text>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}><TextInput style={[styles.input, { color: theme.text }]} placeholder="Digite o município..." placeholderTextColor={theme.textMuted} value={buscaMunic} onChangeText={setBuscaMunic} onSubmitEditing={realizarBuscaMunicipio} /></View>
                <TouchableOpacity style={styles.btnSearch} onPress={realizarBuscaMunicipio} disabled={buscandoMunicipios}>{buscandoMunicipios ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}</TouchableOpacity>
              </View>
              {municipiosEncontrados.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  {municipiosEncontrados.map((mun, idx) => (
                    <TouchableOpacity key={mun.id} style={[styles.autocompleteItem, idx > 0 && styles.autocompleteItemBorder, { backgroundColor: theme.cardSecondary }]} onPress={() => selecionarMunicipio(mun)}><Text style={styles.autocompleteNome}>{mun.nomeUf || mun.nome}</Text></TouchableOpacity>
                  ))}
                </View>
              )}
              {form.municipioId ? (
                <View style={styles.cardMini}>
                  <View style={styles.cardMiniAvatar}><Ionicons name="location-outline" size={16} color={theme.info} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.cardMiniTit}>{form.municipioNome}</Text><Text style={styles.cardMiniDesc}>ID: {form.municipioId}</Text></View>
                  <TouchableOpacity onPress={() => upd({ municipioId: null, municipioNome: '' })}><Ionicons name="trash-outline" size={20} color={theme.danger} /></TouchableOpacity>
                </View>
              ) : null}
              <View style={{ marginTop: 8 }} />
              <Text style={styles.campoLabel}>Rua / Logradouro (Busca DNE) *</Text>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}><TextInput style={[styles.input, { color: theme.text }]} placeholder="Digite a rua..." placeholderTextColor={theme.textMuted} value={buscaEndereco} onChangeText={setBuscaEndereco} onSubmitEditing={realizarBuscaEndereco} /></View>
                <TouchableOpacity style={styles.btnSearch} onPress={realizarBuscaEndereco} disabled={buscandoEnderecos}>{buscandoEnderecos ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}</TouchableOpacity>
              </View>
              {enderecosEncontrados.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  {enderecosEncontrados.map((end, idx) => (
                    <TouchableOpacity key={`${end.dneId}-${end.cepDneId}`} style={[styles.autocompleteItem, idx > 0 && styles.autocompleteItemBorder, { backgroundColor: theme.cardSecondary }]} onPress={() => selecionarEndereco(end)}><Text style={styles.autocompleteNome}>{end.nomeConcatenado}</Text><Text style={styles.autocompleteDesc}>CEP: {end.cep || 'N/A'} {end.bairro ? `- ${end.bairro}` : ''}</Text></TouchableOpacity>
                  ))}
                </View>
              )}
              {form.logradouroDneId ? (
                <View style={styles.cardMini}>
                  <View style={styles.cardMiniAvatar}><Ionicons name="map-outline" size={16} color={theme.info} /></View>
                  <View style={{ flex: 1 }}><Text style={styles.cardMiniTit}>{form.endereco}</Text><Text style={styles.cardMiniDesc}>ID DNE: {form.logradouroDneId}</Text></View>
                  <TouchableOpacity onPress={() => upd({ logradouroDneId: null, logradouroCepDneId: null, endereco: '' })}><Ionicons name="trash-outline" size={20} color={theme.danger} /></TouchableOpacity>
                </View>
              ) : null}
              <View style={[styles.row, { marginTop: 8 }]}><Input label="Nº" value={form.numero} onChange={(v: any) => upd({ numero: v })} half numeric /></View>
              <CheckItem label="Endereço sem número" value={form.semNumero} onChange={(v: any) => upd({ semNumero: v })} />
              <View style={styles.row}>
                <Input label="Quarteirão" value={form.quarteirao} onChange={(v: any) => upd({ quarteirao: v })} half />
                <Input label="Complemento" value={form.complemento} onChange={(v: any) => upd({ complemento: v })} half />
              </View>
              <Input label="Ponto de Referência" value={form.pontoReferencia} onChange={(v: any) => upd({ pontoReferencia: v })} />
              <View style={styles.row}>
                <Input label="Microárea *" value={form.microArea} onChange={(v: any) => upd({ microArea: v })} numeric half />
                <View style={{ flex: 1, justifyContent: 'center', paddingTop: 18 }}><CheckItem label="Fora da área" value={form.foraArea} onChange={(v: any) => upd({ foraArea: v })} /></View>
              </View>
            </Secao>

            <Secao titulo="Telefones de Contato" cor="#D97706" abertaInicial={false}>
              <View style={styles.row}>
                <Input label="DDD" value={form.dddResid} onChange={(v: any) => upd({ dddResid: v })} numeric />
                <Input label="Telefone Residencial" value={form.foneResid} onChange={(v: any) => upd({ foneResid: v })} numeric half />
              </View>
              <View style={styles.row}>
                <Input label="DDD" value={form.dddContato} onChange={(v: any) => upd({ dddContato: v })} numeric />
                <Input label="Telefone de Contato" value={form.foneContato} onChange={(v: any) => upd({ foneContato: v })} numeric half />
              </View>
            </Secao>

            <Secao titulo="Animais no Domicílio" cor="#10B981" abertaInicial={false}>
              <Text style={styles.campoLabel}>Possui animais no domicílio?</Text>
              <View style={styles.radioGroup}>
                {[{ k: 'S', l: 'Sim' }, { k: 'N', l: 'Não' }].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, form.possuiAnimais === o.k && styles.radioBtnOn]} onPress={() => upd({ possuiAnimais: o.k as any })}><Text style={[styles.radioTxt, form.possuiAnimais === o.k && styles.radioTxtOn]}>{o.l}</Text></TouchableOpacity>
                ))}
              </View>
              {form.possuiAnimais === 'S' && (
                <View style={[styles.checkGrid, { marginTop: 16 }]}>
                  <Text style={[styles.campoLabel, { width: '100%' }]}>Quais animais?</Text>
                  <View style={styles.acaoRapidaContainer}>
                    <TouchableOpacity style={styles.btnAcaoRapida} onPress={() => toggleTodosAnimais(true)}><Ionicons name="checkbox-outline" size={18} color={theme.success} /><Text style={[styles.btnAcaoRapidaTxt, { color: theme.success }]}>Marcar Todos</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnAcaoRapida} onPress={() => toggleTodosAnimais(false)}><Ionicons name="square-outline" size={18} color={theme.danger} /><Text style={[styles.btnAcaoRapidaTxt, { color: theme.danger }]}>Desmarcar Todos</Text></TouchableOpacity>
                  </View>
                  <CheckItem label="Cachorro" width="48%" value={form.animalCachorro} onChange={(v: any) => upd({ animalCachorro: v })} />
                  <CheckItem label="Gato" width="48%" value={form.animalGato} onChange={(v: any) => upd({ animalGato: v })} />
                  <CheckItem label="Pássaro" width="48%" value={form.animalPassaro} onChange={(v: any) => upd({ animalPassaro: v })} />
                  <CheckItem label="Macaco" width="48%" value={form.animalMacaco} onChange={(v: any) => upd({ animalMacaco: v })} />
                  <CheckItem label="Galinha" width="48%" value={form.animalGalinha} onChange={(v: any) => upd({ animalGalinha: v })} />
                  <CheckItem label="Porco" width="48%" value={form.animalPorco} onChange={(v: any) => upd({ animalPorco: v })} />
                  <CheckItem label="Répteis" width="48%" value={form.animalRepteis} onChange={(v: any) => upd({ animalRepteis: v })} />
                  <CheckItem label="Outros" width="48%" value={form.animalOutros} onChange={(v: any) => upd({ animalOutros: v })} />
                  <View style={{ width: '100%', marginTop: 8 }}><Input label="Quantidade total de animais" value={form.animaisQtde} onChange={(v: any) => upd({ animaisQtde: v })} numeric half /></View>
                </View>
              )}
            </Secao>
          </View>

          {/* ── Coluna direita ── */}
          <View style={isTablet ? styles.column : undefined}>

            <Secao titulo="Tipo de Imóvel" cor="#7C3AED">
              <View style={styles.inputWrap}>
                <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Tipo de Imóvel', OPTS.tipoImovel, 'tipoImovel')}>
                  <Text style={styles.selectTxt}>{OPTS.tipoImovel.find(t => t.v === form.tipoImovel)?.l || 'Selecione...'}</Text>
                  <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
            </Secao>

            <Secao titulo="Condições de Moradia" cor="#7C3AED" abertaInicial={true}>
              {[
                { label: 'Situação de moradia / Posse da terra', opts: OPTS.sitMoradia, campo: 'sitMoradia' },
                { label: 'Condição de posse (área rural)', opts: OPTS.areaRural, campo: 'areaRural' },
                { label: 'Tipo de acesso ao domicílio', opts: OPTS.tipoAcesso, campo: 'tipoAcesso' },
                { label: 'Material predominante nas paredes', opts: OPTS.materialParedes, campo: 'materialParedes' },
                { label: 'Abastecimento de água', opts: OPTS.abastecimentoAgua, campo: 'abastecimentoAgua' },
                { label: 'Água para consumo no domicílio', opts: OPTS.aguaConsumo, campo: 'aguaConsumo' },
                { label: 'Escoamento do banheiro/sanitário', opts: OPTS.escoamento, campo: 'escoamento' },
                { label: 'Destino do lixo', opts: OPTS.destinoLixo, campo: 'destinoLixo' },
              ].map(({ label, opts, campo }) => (
                <View key={campo} style={styles.inputWrap}>
                  <Text style={styles.campoLabel}>{label}</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect(label, opts, campo as keyof FormCadDomiciliar)}>
                    <Text style={styles.selectTxt}>{(opts as any[]).find((t: any) => t.v === (form as any)[campo])?.l || 'Selecione...'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.row}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={styles.campoLabel}>Localização</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Localização', OPTS.localizacao, 'localizacao')}><Text style={styles.selectTxt}>{OPTS.localizacao.find(t => t.v === form.localizacao)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity>
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={styles.campoLabel}>Tipo Domicílio</Text>
                  <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Tipo de Domicílio', OPTS.tipoDomicilio, 'tipoDomicilio')}><Text style={styles.selectTxt}>{OPTS.tipoDomicilio.find(t => t.v === form.tipoDomicilio)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <Input label="Nº moradores" value={form.qtdeMoradores} onChange={(v: any) => upd({ qtdeMoradores: v })} numeric half />
                <Input label="Nº cômodos" value={form.comodos} onChange={(v: any) => upd({ comodos: v })} numeric half />
              </View>

              <Text style={[styles.campoLabel, { marginTop: 8 }]}>Energia Elétrica?</Text>
              <View style={styles.radioGroup}>
                {[{ k: 'S', l: 'Sim' }, { k: 'N', l: 'Não' }].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, form.energiaEletrica === o.k && styles.radioBtnOn]} onPress={() => upd({ energiaEletrica: o.k as any })}><Text style={[styles.radioTxt, form.energiaEletrica === o.k && styles.radioTxtOn]}>{o.l}</Text></TouchableOpacity>
                ))}
              </View>
            </Secao>

            <Secao titulo="Família / Moradores do Domicílio" cor="#D97706" abertaInicial={true}>
              <Text style={styles.mutedTxt}>Busque os moradores e defina quem é o responsável familiar.</Text>
              <View style={styles.searchBox}>
                <View style={{ flex: 1 }}><TextInput style={[styles.input, { color: theme.text }]} placeholder="Digite Nome, CPF ou CNS..." placeholderTextColor={theme.textMuted} value={buscaPaciente} onChangeText={setBuscaPaciente} /></View>
                <View style={styles.btnSearch}>{buscandoPacientes ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}</View>
              </View>

              {pacientesEncontrados.length > 0 && (
                <View style={styles.autocompleteContainer}>
                  {pacientesEncontrados.map((p, idx) => (
                    <TouchableOpacity key={p.id} style={[styles.autocompleteItem, idx > 0 && styles.autocompleteItemBorder, { backgroundColor: theme.cardSecondary }]} onPress={() => selecionarPaciente(p)}><Text style={styles.autocompleteNome}>{p.nome}</Text><Text style={styles.autocompleteDesc}>{p.cns ? `CNS/CPF: ${p.cns}` : ''}</Text></TouchableOpacity>
                  ))}
                </View>
              )}

              {form.moradores.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  {form.moradores.map(m => (
                    <View key={m.id} style={[styles.cardMini, { flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.cardMiniAvatar}><Ionicons name="person" size={16} color={theme.info} /></View>
                        <View style={{ flex: 1 }}><Text style={styles.cardMiniTit}>{m.nome}</Text><Text style={styles.cardMiniDesc}>CNS/CPF: {m.cns || m.cpf || 'Não informado'}</Text></View>
                        <TouchableOpacity onPress={() => removerMorador(m.id)}><Ionicons name="trash-outline" size={20} color={theme.danger} /></TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 }}>
                        <Text style={[styles.campoLabel, { flex: 1, marginBottom: 0, color: m.ehResponsavel ? theme.success : theme.textMuted }]}>Responsável Familiar?</Text>
                        <TouchableOpacity style={[styles.radioBtn, m.ehResponsavel && styles.radioBtnOn, { paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => definirResponsavel(m.id)}><Text style={[styles.radioTxt, m.ehResponsavel && styles.radioTxtOn]}>{m.ehResponsavel ? 'SIM (Resp.)' : 'NÃO'}</Text></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {form.moradores.length > 0 && (
                <View style={{ marginTop: 16, backgroundColor: theme.cardSecondary, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
                  <Text style={[styles.secaoTitulo, { marginBottom: 12, fontSize: 14 }]}>Dados da Família</Text>
                  <View style={styles.row}>
                    <Input label="Nº Membros" value={String(form.moradores.length)} readonly half />
                    <Input label="Prontuário Familiar" value={form.prontuarioFamiliar} onChange={(v: any) => upd({ prontuarioFamiliar: v })} half />
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.campoLabel}>Renda Familiar</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Renda Familiar', OPTS.rendaFamiliar, 'rendaFamiliar')}><Text style={styles.selectTxt}>{OPTS.rendaFamiliar.find((t: any) => t.v === form.rendaFamiliar)?.l || 'Selecione...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity>
                  </View>
                  <Text style={[styles.campoLabel, { marginTop: 8 }]}>Reside Desde</Text>
                  <View style={styles.row}>
                    <View style={[styles.inputWrap, { flex: 1 }]}><TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Mês', OPTS.meses, 'resideDesdeMes')}><Text style={styles.selectTxt}>{OPTS.meses.find((t: any) => t.v === form.resideDesdeMes)?.l || 'Mês...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
                    <View style={[styles.inputWrap, { flex: 1 }]}><TouchableOpacity style={styles.selectBtn} onPress={() => abrirSelect('Ano', OPTS.anos, 'resideDesdeAno')}><Text style={styles.selectTxt}>{OPTS.anos.find((t: any) => t.v === form.resideDesdeAno)?.l || 'Ano...'}</Text><Ionicons name="chevron-down" size={16} color={theme.textMuted} /></TouchableOpacity></View>
                  </View>
                </View>
              )}
            </Secao>

            <Secao titulo="Instituição de Permanência" cor="#EC4899" abertaInicial={false}>
              <Text style={styles.mutedTxt}>Preencha apenas se o imóvel for asilo, abrigo, orfanato, etc.</Text>
              <Input label="Nome da Instituição" value={form.instituicaoNome} onChange={(v: any) => upd({ instituicaoNome: v })} />
              <Text style={styles.campoLabel}>Existem outros profissionais de saúde vinculados?</Text>
              <View style={styles.radioGroup}>
                {[{ k: 'S', l: 'Sim' }, { k: 'N', l: 'Não' }].map(o => (
                  <TouchableOpacity key={o.k} style={[styles.radioBtn, form.institOutroProf === o.k && styles.radioBtnOn]} onPress={() => upd({ institOutroProf: o.k as any })}><Text style={[styles.radioTxt, form.institOutroProf === o.k && styles.radioTxtOn]}>{o.l}</Text></TouchableOpacity>
                ))}
              </View>
            </Secao>

            <Secao titulo="Finalização" cor="#3B82F6">
              <CheckItem label="Usuário recusou o cadastro (Termo de Recusa)" value={form.termoRecusa} onChange={(v: any) => upd({ termoRecusa: v })} />
              <View style={[styles.inputWrap, { marginTop: 12 }]}>
                <Text style={styles.campoLabel}>Classificação de Risco Familiar</Text>
                <View style={styles.radioGroup}>
                  {OPTS.riscoFamiliar.map(o => (
                    <TouchableOpacity key={o.v} style={[styles.radioBtn, form.riscoFamiliar === o.v && styles.radioBtnOn]} onPress={() => upd({ riscoFamiliar: o.v })}><Text style={[styles.radioTxt, form.riscoFamiliar === o.v && styles.radioTxtOn]}>{o.l}</Text></TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <Input label="Observações" value={form.observacao} onChange={(v: any) => upd({ observacao: v })} linhas={3} placeholder="Anotações gerais do cadastro..." />
              </View>
            </Secao>
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, isTablet && styles.footerTablet]}>
        <TouchableOpacity style={[styles.btnConfirmar, isTablet && { width: 400 }]} onPress={salvar} disabled={salvando}>{salvando ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnConfirmarTxt}>SALVAR CADASTRO DOMICILIAR</Text>}</TouchableOpacity>
        <TouchableOpacity style={[styles.btnVisita, isTablet && { width: 400 }]} onPress={irParaVisita}><Ionicons name="home-outline" size={20} color={theme.primary} /><Text style={styles.btnVisitaTxt}>REALIZAR VISITA NESTE DOMICÍLIO</Text></TouchableOpacity>
      </View>

      <Modal visible={modalSelect.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { height: '80%' }]}>
            <Text style={styles.modalTitulo}>{modalSelect.titulo}</Text>
            <ScrollView style={{ marginTop: 16 }}>
              {modalSelect.opcoes.map(t => (
                <TouchableOpacity key={t.v} style={[styles.modalListBtn, (form as any)[modalSelect.campo] === t.v && styles.modalListBtnOn]} onPress={() => { upd({ [modalSelect.campo]: t.v }); setModalSelect(s => ({ ...s, visible: false })); }}><Text style={[styles.modalListTxt, (form as any)[modalSelect.campo] === t.v && styles.modalListTxtOn]}>{t.l}</Text></TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalSelect(s => ({ ...s, visible: false }))}><Text style={[styles.modalCloseTxt, { color: theme.danger }]}>CANCELAR</Text></TouchableOpacity>
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
  secao: { backgroundColor: theme.card, marginTop: 14, marginHorizontal: 8, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 }, secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 15, borderLeftWidth: 6, backgroundColor: theme.cardSecondary }, secaoTitulo: { fontSize: 14, fontWeight: '800', color: theme.text }, secaoBody: { padding: 18, gap: 14 }, row: { flexDirection: 'row', gap: 12 }, readonlyVal: { backgroundColor: theme.cardSecondary, padding: 14, borderRadius: 14, color: theme.textMuted, borderWidth: 1, borderColor: theme.border, marginTop: 4 }, inputWrap: { marginBottom: 6 }, input: { borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, backgroundColor: theme.cardSecondary, color: theme.text }, campoLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6 }, mutedTxt: { fontSize: 12, color: theme.textMuted, fontStyle: 'italic', lineHeight: 18 }, radioBtn: { paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', backgroundColor: theme.cardSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.border }, radioBtnOn: { backgroundColor: theme.primary, borderColor: theme.primary }, radioTxt: { fontWeight: '700', color: theme.textSecondary, fontSize: 13 }, radioTxtOn: { color: '#fff' }, selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: theme.borderInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: theme.cardSecondary, marginTop: 4 }, selectTxt: { fontSize: 14, color: theme.text, flex: 1 }, radioGroup: { gap: 8, marginTop: 6 }, checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }, checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: theme.borderInput, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card }, checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary }, checkLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 }, searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }, btnSearch: { backgroundColor: theme.primary, width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 14, elevation: 4 }, autocompleteContainer: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.borderInput, borderRadius: 16, marginTop: 8, overflow: 'hidden' }, autocompleteItem: { paddingVertical: 13, paddingHorizontal: 14, backgroundColor: theme.card }, autocompleteItemBorder: { borderTopWidth: 1, borderTopColor: theme.border }, autocompleteNome: { fontSize: 14, fontWeight: '700', color: theme.text }, autocompleteDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 }, cardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardSecondary, padding: 12, borderRadius: 16, marginTop: 8, gap: 10, borderWidth: 1, borderColor: theme.border }, cardMiniAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.infoBg, alignItems: 'center', justifyContent: 'center' }, cardMiniTit: { fontSize: 13, fontWeight: '800', color: theme.text }, cardMiniDesc: { fontSize: 11, color: theme.textMuted, marginTop: 3 }, footer: { padding: 18, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.border }, footerTablet: { alignItems: 'center' }, btnConfirmar: { backgroundColor: theme.primary, minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 4 }, btnConfirmarTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 }, modalOverlay: { flex: 1, backgroundColor: 'rgba(5,20,36,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }, modalCard: { backgroundColor: theme.card, padding: 24, borderRadius: 26, width: '88%', maxWidth: 440, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadow || '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 18, elevation: 6 }, modalTitulo: { fontSize: 20, fontWeight: '800', color: theme.text, textAlign: 'center', marginBottom: 4 }, modalListBtn: { paddingVertical: 16, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.border }, modalListBtnOn: { backgroundColor: theme.infoBg }, modalListTxt: { fontSize: 14, color: theme.textSecondary }, modalListTxtOn: { color: theme.primary, fontWeight: '700' }, modalCloseBtn: { marginTop: 16, padding: 14, alignItems: 'center', backgroundColor: theme.background, borderRadius: 14 }, modalCloseTxt: { color: theme.danger, fontWeight: '700' }, acaoRapidaContainer: { width: '100%', flexDirection: 'row', gap: 12, marginBottom: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.background }, btnAcaoRapida: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 8, backgroundColor: theme.cardSecondary, borderRadius: 8, borderWidth: 1, borderColor: theme.border }, btnAcaoRapidaTxt: { fontSize: 12, fontWeight: '700' }, btnVisita: { backgroundColor: theme.cardSecondary, padding: 16, borderRadius: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.primary, marginTop: 14 }, btnVisitaTxt: { color: theme.primary, fontWeight: '800', fontSize: 16 },
});