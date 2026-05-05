import React, { useMemo } from 'react';
import {
  Alert,
  Appearance,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuthStore } from '@store/index';
import { Colors } from '../fichas/colors';

type AppTheme = typeof Colors.light;

function getIniciais(nome?: string) {
  const partes = String(nome || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return '?';

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  return `${partes[0].charAt(0)}${partes[partes.length - 1].charAt(0)}`.toUpperCase();
}

function formatarTexto(valor?: string | number | null, fallback = 'Não informado') {
  const texto = String(valor ?? '').trim();
  return texto || fallback;
}

export default function PerfilScreen() {
  const { profissional, setLogout, setBloqueado } = useAuthStore();

  const modo = useColorScheme() ?? 'light';
  const theme = Colors[modo];
  const styles = useMemo(() => getStyles(theme), [theme]);

  const municipio =
    formatarTexto(
      (profissional as any)?.municipioNome ??
        (profissional as any)?.nomeMunicipio ??
        (profissional as any)?.municipio ??
        (profissional as any)?.municipioSlug,
    );

  const nome = formatarTexto(profissional?.nome, 'Usuário');

  const equipe = formatarTexto(
    (profissional as any)?.equipeNome ??
      (profissional as any)?.nomeEquipe ??
      (profissional as any)?.equipe ??
      profissional?.ine,
  );

  const unidade = formatarTexto(
    (profissional as any)?.unidadeNome ??
      (profissional as any)?.nomeUnidade ??
      (profissional as any)?.unidade ??
      profissional?.cnes,
  );

  const cbo = formatarTexto(
    (profissional as any)?.cboDescricao ??
      (profissional as any)?.descricaoCbo ??
      (profissional as any)?.cbo ??
      (profissional as any)?.cboCodigo,
  );

  function handleToggleTheme() {
    Appearance.setColorScheme(modo === 'light' ? 'dark' : 'light');
  }

  function handleAbrirTutorial() {
  router.push('/(tabs)/home?reiniciarTutorial=1' as any);
}
  function handleLogout() {
    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair e voltar para a tela de login?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            setBloqueado(false);
            setLogout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getIniciais(nome)}</Text>
          </View>

          <Text style={styles.nome}>{nome}</Text>
          <Text style={styles.subtitulo}>Perfil do profissional</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={20} color={theme.primary} />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Informações do usuário</Text>
              <Text style={styles.cardDescription}>
                Dados vinculados ao login atual
              </Text>
            </View>
          </View>

          <View style={styles.infoList}>
            <InfoRow
              styles={styles}
              theme={theme}
              icon="person-circle-outline"
              label="Nome"
              value={nome}
            />

            <InfoRow
              styles={styles}
              theme={theme}
              icon="people-outline"
              label="Equipe"
              value={equipe}
            />

            <InfoRow
              styles={styles}
              theme={theme}
              icon="business-outline"
              label="Unidade"
              value={unidade}
            />

            <InfoRow
              styles={styles}
              theme={theme}
              icon="briefcase-outline"
              label="CBO"
              value={cbo}
            />

            <InfoRow
              styles={styles}
              theme={theme}
              icon="location-outline"
              label="Município"
              value={municipio}
              isLast
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="color-palette-outline" size={20} color={theme.primary} />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Aparência</Text>
              <Text style={styles.cardDescription}>
                Alternar entre modo claro e escuro
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggleTheme}
            activeOpacity={0.85}
          >
            <View style={styles.actionIcon}>
              <Ionicons
                name={modo === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.primary}
              />
            </View>

            <View style={styles.actionTextBox}>
              <Text style={styles.actionTitle}>
                {modo === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              </Text>
              <Text style={styles.actionSubtitle}>
                Tema atual: {modo === 'dark' ? 'Escuro' : 'Claro'}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Ionicons name="help-buoy-outline" size={20} color={theme.primary} />
            </View>

            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Ajuda</Text>
              <Text style={styles.cardDescription}>
                Acesse novamente o tutorial do aplicativo
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAbrirTutorial}
            activeOpacity={0.85}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="school-outline" size={22} color={theme.primary} />
            </View>

            <View style={styles.actionTextBox}>
              <Text style={styles.actionTitle}>Abrir tutorial</Text>
              <Text style={styles.actionSubtitle}>
                Ver explicação de uso das telas e funcionalidades
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={21} color={theme.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  styles,
  theme,
  icon,
  label,
  value,
  isLast = false,
}: {
  styles: ReturnType<typeof getStyles>;
  theme: AppTheme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const getStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },

    scroll: {
      flex: 1,
      backgroundColor: theme.background,
    },

    content: {
      padding: 16,
      paddingBottom: 32,
    },

    header: {
      alignItems: 'center',
      paddingTop: 14,
      paddingBottom: 20,
    },

    avatar: {
      width: 88,
      height: 88,
      borderRadius: 30,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      shadowColor: theme.text,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },

    avatarText: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '900',
    },

    nome: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.text,
      textAlign: 'center',
    },

    subtitulo: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
      textAlign: 'center',
    },

    card: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 14,
      shadowColor: theme.text,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },

    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      backgroundColor: theme.cardSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },

    cardHeaderText: {
      flex: 1,
    },

    cardTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.text,
    },

    cardDescription: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      lineHeight: 17,
    },

    infoList: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSecondary,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },

    infoRowLast: {
      borderBottomWidth: 0,
    },

    infoIcon: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },

    infoContent: {
      flex: 1,
    },

    infoLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.textMuted,
      marginBottom: 3,
    },

    infoValue: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 19,
    },

    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.cardSecondary,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 12,
    },

    actionIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    actionTextBox: {
      flex: 1,
    },

    actionTitle: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.text,
    },

    actionSubtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: '600',
      color: theme.textMuted,
      lineHeight: 17,
    },

    logoutButton: {
      minHeight: 52,
      borderRadius: 18,
      backgroundColor: theme.dangerBg,
      borderWidth: 1,
      borderColor: theme.danger,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },

    logoutText: {
      color: theme.danger,
      fontSize: 14,
      fontWeight: '900',
    },
  });