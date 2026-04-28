// Arquivo: app/index.tsx
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // Tela de carregamento invisível. O _layout.tsx vai tirar o usuário daqui rapidinho.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
      <ActivityIndicator size="large" color="#0052CC" />
    </View>
  );
}