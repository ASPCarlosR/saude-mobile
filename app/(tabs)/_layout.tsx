import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../fichas/colors';
import { TenantConfigPublica } from '../../src/types/tentant';
import { obterTenantConfig } from '../../src/utils/tenant-storage';
import { podeUsarModulo, TENANT_MODULES } from '../../src/utils/tenant-permissons';

export default function TabsLayout() {
  const theme = Colors[useColorScheme() ?? 'light'];
  const [tenantConfig, setTenantConfig] = useState<TenantConfigPublica | null>(null);

  useEffect(() => {
    obterTenantConfig().then(setTenantConfig).catch(() => setTenantConfig(null));
  }, []);

  const podeVerIndicadores = podeUsarModulo(tenantConfig, TENANT_MODULES.INDICADORES);
  const podeVerTransporte = podeUsarModulo(tenantConfig, TENANT_MODULES.TRANSPORTE);
  const podeVerAgendamento = podeUsarModulo(tenantConfig, TENANT_MODULES.AGENDAMENTO);

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
