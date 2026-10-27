import { create } from 'zustand';

/** Estado de sessão/UI apenas. Dados persistentes vêm dos repositórios. */
type SessionState = {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  hasProfile: boolean;
  setReady: (hasProfile: boolean) => void;
  setError: (message: string) => void;
  setHasProfile: (value: boolean) => void;
};

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  error: null,
  hasProfile: false,
  setReady: (hasProfile) => set({ status: 'ready', hasProfile, error: null }),
  setError: (message) => set({ status: 'error', error: message }),
  setHasProfile: (hasProfile) => set({ hasProfile }),
}));
