import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ProfileState {
  fotoPerfilUri: string | null;
  setFotoPerfilUri: (uri: string | null) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      fotoPerfilUri: null,
      setFotoPerfilUri: (uri) => set({ fotoPerfilUri: uri }),
    }),
    {
      name: '@saude-mobile/profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);