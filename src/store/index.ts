import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Interfaces ---
export interface Profissional {
  id: number;
  nome: string;
  cns: string;
  cnes: string;
  unidadeId: number;
  unidadeNome: string;
  cboCodigo: string;
  cboDescricao: string;
  equipeId: number;
  ine: string;
  microArea: string;
}

export interface Unidade {
  id: number;
  nome: string;
  cnes: number | string;
}

export interface Equipe {
  id: number;
  nome: string;
  unidadeId: number;
  unidadeNome: string;
  cboCodigo: string;
  cboDescricao: string;
  microArea: string;
  ine: string;
}

export type AcaoPermissaoApp = 'acessa' | 'altera' | 'inclui' | 'exclui';

export type PermissaoAppModulo = {
  acessa: boolean;
  altera: boolean;
  inclui: boolean;
  exclui: boolean;
};

export type PermissoesApp = Record<string, PermissaoAppModulo>;

interface AuthState {
  profissional: Profissional | null;
  token: string | null;
  bloqueado: boolean;
  carregando: boolean;
  tenantUrl: string | null;
  municipioSlug: string | null;
  unidade: Unidade | null;
  equipe: Equipe | null;
  reidratado: boolean;
  ignorarBloqueioTemporario: boolean;
  permissoesApp: PermissoesApp | null;

  setPermissoesApp: (permissoesApp: PermissoesApp | null) => void;
  setIgnorarBloqueioTemporario: (valor: boolean) => void;
  setReidratado: (r: boolean) => void;

  setLogin: (prof: Profissional, token: string, unidade?: Unidade, equipe?: Equipe) => void;
  setSessaoCompleta: (
    prof: Profissional,
    token: string,
    tenantUrl: string,
    municipioSlug: string,
    unidade?: Unidade,
    equipe?: Equipe
  ) => void;

  setLogout: () => void;
  setProfissional: (prof: Profissional | null) => void;
  setBloqueado: (b: boolean) => void;
  setCarregando: (c: boolean) => void;
  setTenant: (url: string | null) => void;
  setMunicipio: (url: string, slug: string) => void;
  setUnidade: (unidade: Unidade | null) => void;
  setEquipe: (equipe: Equipe | null) => void;

  possuiSessaoCompleta: () => boolean;
}

interface SyncState {
  sincronizando: boolean;
  ultimoSync: Date | null;
  pendentes: number;
  setSincronizando: (s: boolean) => void;
  setUltimoSync: (d: Date) => void;
  setPendentes: (n: number) => void;
}

// --- 1. AUTH STORE ---
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profissional: null,
      token: null,
      bloqueado: true,
      carregando: true,
      tenantUrl: null,
      municipioSlug: null,
      unidade: null,
      equipe: null,
      reidratado: false,
      ignorarBloqueioTemporario: false,
      permissoesApp: null,

      setPermissoesApp: (permissoesApp) => set({ permissoesApp }),

      setReidratado: (r) => set({ reidratado: r }),

      setUnidade: (unidade) => set({ unidade }),

      setEquipe: (equipe) => set({ equipe }),

      setTenant: (url) => set({ tenantUrl: url }),

      setMunicipio: (url, slug) =>
        set({
          tenantUrl: url,
          municipioSlug: slug,
        }),

      setLogin: (prof, token, unidade, equipe) =>
        set({
          profissional: prof,
          token,
          unidade: unidade || null,
          equipe: equipe || null,
          bloqueado: false,
          carregando: false,
        }),

      setSessaoCompleta: (prof, token, tenantUrl, municipioSlug, unidade, equipe) =>
        set({
          profissional: prof,
          token,
          tenantUrl,
          municipioSlug,
          unidade: unidade || null,
          equipe: equipe || null,
          bloqueado: false,
          carregando: false,
        }),

      setLogout: () =>
        set({
          profissional: null,
          token: null,
          bloqueado: true,
          carregando: false,
          tenantUrl: null,
          municipioSlug: null,
          unidade: null,
          equipe: null,
          permissoesApp: null,
        }),

      setProfissional: (prof) => set({ profissional: prof }),

      setBloqueado: (b) => set({ bloqueado: b }),

      setCarregando: (c) => set({ carregando: c }),

      possuiSessaoCompleta: () => {
        const state = get();

        return !!(
          state.profissional &&
          state.profissional.id &&
          state.token &&
          String(state.token).trim() &&
          state.tenantUrl &&
          String(state.tenantUrl).trim() &&
          state.municipioSlug &&
          String(state.municipioSlug).trim()
        );
      },

      setIgnorarBloqueioTemporario: (valor: boolean) =>
        set({
          ignorarBloqueioTemporario: valor,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),

      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.log('[AUTH STORE] Erro ao reidratar:', error);
        } else {
          console.log('[AUTH STORE] Reidratação concluída');
        }

        state?.setReidratado(true);
        state?.setCarregando(false);

        const sessaoCompleta = state?.possuiSessaoCompleta?.() ?? false;

        console.log('[AUTH STORE] Estado após reidratação:', {
          profissionalId: state?.profissional?.id,
          tokenExiste: !!state?.token,
          tenantUrl: state?.tenantUrl,
          municipioSlug: state?.municipioSlug,
          permissoesAppExiste: !!state?.permissoesApp,
          sessaoCompleta,
        });

        if (sessaoCompleta) {
          state?.setBloqueado(true);
        }
      },

      partialize: (state) => ({
        profissional: state.profissional,
        token: state.token,
        tenantUrl: state.tenantUrl,
        municipioSlug: state.municipioSlug,
        unidade: state.unidade,
        equipe: state.equipe,
        permissoesApp: state.permissoesApp,
      }),
    }
  )
);

// --- 2. SYNC STORE ---
export const useSyncStore = create<SyncState>((set) => ({
  sincronizando: false,
  ultimoSync: null,
  pendentes: 0,
  setSincronizando: (s) => set({ sincronizando: s }),
  setUltimoSync: (d) => set({ ultimoSync: d }),
  setPendentes: (n) => set({ pendentes: n }),
}));
