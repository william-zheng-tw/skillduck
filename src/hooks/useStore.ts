import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Skill, AgentInfo, UpdateInfo } from "@/types/skills";
import type { AppUpdateInfo } from "@/lib/tauri";
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
  pendingUpdates: UpdateInfo[];
  lastCheckedAt: string | null;
  checkingUpdates: boolean;
  updatingSkills: boolean;
  setPendingUpdates: (updates: UpdateInfo[]) => void;
  setLastCheckedAt: (at: string | null) => void;
  setCheckingUpdates: (v: boolean) => void;
  setUpdatingSkills: (v: boolean) => void;
  dismissNoScanRootsAlert: boolean;
  setDismissNoScanRootsAlert: (v: boolean) => void;
  appUpdate: AppUpdateInfo | null;
  appUpdateChecking: boolean;
  appUpdateInstalling: boolean;
  setAppUpdate: (update: AppUpdateInfo | null) => void;
  setAppUpdateChecking: (v: boolean) => void;
  setAppUpdateInstalling: (v: boolean) => void;
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
      pendingUpdates: [],
      lastCheckedAt: null,
      checkingUpdates: false,
      updatingSkills: false,

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
      setPendingUpdates: (updates) => set({ pendingUpdates: updates }),
      setLastCheckedAt: (at) => set({ lastCheckedAt: at }),
      setCheckingUpdates: (v) => set({ checkingUpdates: v }),
      setUpdatingSkills: (v) => set({ updatingSkills: v }),
      dismissNoScanRootsAlert: false,
      setDismissNoScanRootsAlert: (v) => set({ dismissNoScanRootsAlert: v }),
      appUpdate: null,
      appUpdateChecking: false,
      appUpdateInstalling: false,
      setAppUpdate: (update) => set({ appUpdate: update }),
      setAppUpdateChecking: (v) => set({ appUpdateChecking: v }),
      setAppUpdateInstalling: (v) => set({ appUpdateInstalling: v }),
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
      name: "skillduck-store",
      partialize: (state) => ({
        agents: state.agents,
        agentsScanned: state.agentsScanned,
        dismissNoScanRootsAlert: state.dismissNoScanRootsAlert,
      }),
    }
  )
);
