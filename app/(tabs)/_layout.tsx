import { useEffect, useState } from 'react';
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
  const [tenantConfig, setTenantConfig] = useState<TenantConfigPublica | null>(null);
  const permissoesApp = useAuthStore((state) => state.permissoesApp);

  useEffect(() => {
    obterTenantConfig().then(setTenantConfig).catch(() => setTenantConfig(null));
  }, []);

  const podeVerIndicadores = podeUsarModulo(
    tenantConfig,
    TENANT_MODULES.INDICADORES,
  );

  const podeVerTransporte = podeUsarModuloComPermissao(
    tenantConfig,
    permissoesApp,
    TENANT_MODULES.TRANSPORTE,
    'acessa',
  );

  const podeVerAgendamento = podeUsarModuloComPermissao(
    tenantConfig,
    permissoesApp,
    TENANT_MODULES.AGENDAMENTO,
    'acessa',
  );

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
          href: podeVerIndicadores ? undefined : null,
          title: 'Indicadores',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="transporte"
        options={{
          href: podeVerTransporte ? undefined : null,
          title: 'Transporte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="agendamento"
        options={{
          href: podeVerAgendamento ? undefined : null,
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
