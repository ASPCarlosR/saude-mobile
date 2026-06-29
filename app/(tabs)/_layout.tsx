import { useEffect, useState, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../fichas/colors';
import { TenantConfigPublica } from '../../src/types/tentant';
import { obterTenantConfig } from '../../src/utils/tenant-storage';
import {
  podeUsarModulo,
  podeUsarModuloComPermissao,
  TENANT_MODULES,
} from '../../src/utils/tenant-permissons';
import { useAuthStore } from '../../src/store/index';

export default function TabsLayout() {
  const theme = Colors[useColorScheme() ?? 'light'];

  const [tenantConfig, setTenantConfig] =
    useState<TenantConfigPublica | null>(null);

  const permissoesApp = useAuthStore((state) => state.permissoesApp);

  useEffect(() => {
    obterTenantConfig()
      .then(setTenantConfig)
      .catch(() => setTenantConfig(null));
  }, []);

  /**
   * 🔒 IMPORTANTE:
   * Evita comportamento instável durante sync
   */
  const permissoesSeguras = useMemo(() => {
    return permissoesApp ?? {};
  }, [permissoesApp]);

  /**
   * 🔒 evita flicker de permissões durante sync
   */
  const podeVerIndicadores = useMemo(() => {
    return podeUsarModulo(
      tenantConfig,
      TENANT_MODULES.INDICADORES,
    );
  }, [tenantConfig]);

  const podeVerTransporte = useMemo(() => {
    return podeUsarModuloComPermissao(
      tenantConfig,
      permissoesSeguras,
      TENANT_MODULES.TRANSPORTE,
      'acessa',
    );
  }, [tenantConfig, permissoesSeguras]);

  const podeVerAgendamento = useMemo(() => {
    return podeUsarModuloComPermissao(
      tenantConfig,
      permissoesSeguras,
      TENANT_MODULES.AGENDAMENTO,
      'acessa',
    );
  }, [tenantConfig, permissoesSeguras]);

  /**
   * 🔥 NÃO remover tabs dinamicamente
   * isso quebra navegação no expo-router
   */
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopWidth: 1,
          borderTopColor: theme.border || theme.background,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="indicadores"
        options={{
          /**
           * 🚨 SEMPRE manter rota registrada
           * apenas bloquear acesso dentro da tela
           */
          href: undefined,
          title: 'Indicadores',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="transporte"
        options={{
          href: undefined,
          title: 'Transporte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="agendamento"
        options={{
          href: undefined,
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}