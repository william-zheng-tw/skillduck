import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Skill, AgentInfo } from "@/types/skills";
import { detectAgents } from "@/lib/tauri";

interface AppState {
  skills: Skill[];
  agents: AgentInfo[];
  selectedSkill: Skill | null;
  selectedAgent: AgentInfo | null;
  cliOutput: string[];
  isLoading: boolean;
  currentPage: string;
  agentsScanned: boolean;
  agentsScanning: boolean;

  setSkills: (skills: Skill[]) => void;
  setAgents: (agents: AgentInfo[]) => void;
  setSelectedSkill: (skill: Skill | null) => void;
  setSelectedAgent: (agent: AgentInfo | null) => void;
  appendCliOutput: (line: string) => void;
  clearCliOutput: () => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentPage: (page: string) => void;
  setAgentsScanned: (scanned: boolean) => void;
  setAgentsScanning: (scanning: boolean) => void;
  initGlobalAgents: () => Promise<void>;
  dismissNoScanRootsAlert: boolean;
  setDismissNoScanRootsAlert: (v: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      skills: [],
      agents: [],
      selectedSkill: null,
      selectedAgent: null,
      cliOutput: [],
      isLoading: false,
      currentPage: "skills",
      agentsScanned: false,
      agentsScanning: false,

      setSkills: (skills) => set({ skills }),
      setAgents: (agents) => set({ agents }),
      setSelectedSkill: (skill) => set({ selectedSkill: skill }),
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      appendCliOutput: (line) =>
        set((state) => ({ cliOutput: [...state.cliOutput.slice(-500), line] })),
      clearCliOutput: () => set({ cliOutput: [] }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setAgentsScanned: (scanned) => set({ agentsScanned: scanned }),
      setAgentsScanning: (scanning) => set({ agentsScanning: scanning }),
      dismissNoScanRootsAlert: false,
      setDismissNoScanRootsAlert: (v) => set({ dismissNoScanRootsAlert: v }),
      initGlobalAgents: async () => {
        try {
          const result = await detectAgents([]);
          set({ agents: result });
        } catch {
          // silently fail — global scan is best-effort
        }
      },
    }),
    {
      name: "skills-dashboard-store",
      partialize: (state) => ({
        agents: state.agents,
        agentsScanned: state.agentsScanned,
        dismissNoScanRootsAlert: state.dismissNoScanRootsAlert,
      }),
    }
  )
);
