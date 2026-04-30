import { create } from 'zustand';

import { Me, type Master, type MasterUpdate } from '@/api';

interface MasterState {
  master: Master | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  update: (payload: MasterUpdate) => Promise<void>;
  setMaster: (m: Master) => void;
}

export const useMaster = create<MasterState>((set) => ({
  master: null,
  loading: false,
  error: null,
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const master = await Me.get();
      set({ master, loading: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },
  update: async (payload) => {
    const updated = await Me.update(payload);
    set({ master: updated });
  },
  setMaster: (master) => set({ master }),
}));
