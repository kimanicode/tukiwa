import { create } from "zustand";
import type { Chama } from "../lib/api";

type ChamaState = {
  activeChama: Chama | null;
  createdChamas: Chama[];
  members: NonNullable<Chama["members"]>;
  addChama: (chama: Chama) => void;
  setActiveChama: (chama: Chama | null) => void;
};

export const useChamaStore = create<ChamaState>((set) => ({
  activeChama: null,
  createdChamas: [],
  members: [],
  addChama: (chama) =>
    set((state) => ({
      createdChamas: [chama, ...state.createdChamas.filter((item) => item.id !== chama.id)]
    })),
  setActiveChama: (chama) => set({ activeChama: chama, members: chama?.members ?? [] })
}));
