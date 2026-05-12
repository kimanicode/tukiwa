import { create } from "zustand";
import type { Chama, TxProposal } from "../lib/api";

type ChamaState = {
  activeChama: Chama | null;
  createdChamas: Chama[];
  members: NonNullable<Chama["members"]>;
  proposals: TxProposal[];
  pendingApprovals: TxProposal[];
  addChama: (chama: Chama) => void;
  setActiveChama: (chama: Chama | null) => void;
  setProposals: (proposals: TxProposal[]) => void;
  addProposal: (proposal: TxProposal) => void;
  updateProposal: (proposalId: string, updates: Partial<TxProposal>) => void;
};

export const useChamaStore = create<ChamaState>((set) => ({
  activeChama: null,
  createdChamas: [],
  members: [],
  proposals: [],
  pendingApprovals: [],
  addChama: (chama) =>
    set((state) => ({
      createdChamas: [chama, ...state.createdChamas.filter((item) => item.id !== chama.id)]
    })),
  setActiveChama: (chama) => set({ activeChama: chama, members: chama?.members ?? [] }),
  setProposals: (proposals) => set({ proposals }),
  addProposal: (proposal) =>
    set((state) => ({
      proposals: [proposal, ...state.proposals.filter((item) => item.id !== proposal.id)]
    })),
  updateProposal: (proposalId, updates) =>
    set((state) => ({
      proposals: state.proposals.map((proposal) =>
        proposal.id === proposalId ? { ...proposal, ...updates } : proposal
      )
    }))
}));
