import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { detectAgents, getSettings } from "@/lib/tauri";
import type { AgentInfo, AgentProjectInfo } from "@/types/skills";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Globe,
  Package,
  Loader2,
  FolderTree,
  Settings,
  Search,
} from "lucide-react";

type DialogState =
  | null
  | { type: "alert"; message: string; dismissible?: boolean }
  | { type: "confirm-refresh" };

type SelectedNode =
  | { type: "agent"; agentId: string }
  | { type: "global"; agentId: string }
  | { type: "project"; agentId: string; projectPath: string };

type ScopeTab = "global" | "project";

export function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const setIsLoading = useStore((s) => s.setIsLoading);
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const agentsScanned = useStore((s) => s.agentsScanned);
  const agentsScanning = useStore((s) => s.agentsScanning);
  const setAgentsScanned = useStore((s) => s.setAgentsScanned);
  const setAgentsScanning = useStore((s) => s.setAgentsScanning);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const dismissNoScanRootsAlert = useStore((s) => s.dismissNoScanRootsAlert);
  const setDismissNoScanRootsAlert = useStore((s) => s.setDismissNoScanRootsAlert);

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeTab, setActiveTab] = useState<ScopeTab>("global");
  const [hasScanRoots, setHasScanRoots] = useState<boolean | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    getSettings().then((s) => setHasScanRoots(s.scan_roots.length > 0)).catch(() => setHasScanRoots(false));
  }, []);

  const loadAgents = useCallback(async () => {
    let noScanRoots = false;
    try {
      const settings = await getSettings();
      noScanRoots = settings.scan_roots.length === 0;
      setHasScanRoots(!noScanRoots);
    } catch {
      setDialog({ type: "alert", message: "Failed to load settings. Please try again later." });
      return;
    }

    setAgents([]);
    setAgentsScanning(true);
    setIsLoading(true);
    try {
      const result = await detectAgents();
      setAgents(result);
      const detected = result.filter((a) => a.detected).length;
      appendCliOutput(`Detected ${detected}/${result.length} agents`);
    } catch (err) {
      appendCliOutput(`Error detecting agents: ${err}`);
    } finally {
      setAgentsScanning(false);
      setAgentsScanned(true);
      setIsLoading(false);
      if (noScanRoots && !useStore.getState().dismissNoScanRootsAlert) {
        setDialog({
          type: "alert",
          message: "No scan directories configured. Only global agents were detected. To scan project-level skills, please configure directories in Settings.",
          dismissible: true,
        });
      }
    }
  }, [setAgents, setIsLoading, appendCliOutput, setAgentsScanned, setAgentsScanning]);

  const handleRefresh = useCallback(() => {
    setDialog({ type: "confirm-refresh" });
  }, []);

  const handleTabChange = (tab: ScopeTab) => {
    setActiveTab(tab);
    setSelectedNode(null);
  };

  const detected = agents.filter((a) => a.detected);

  const selectedAgent = selectedNode
    ? agents.find((a) => a.id === selectedNode.agentId)
    : null;

  const dialogOverlay = dialog && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-xl border bg-card p-6 shadow-lg">
        {dialog.type === "alert" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-base font-semibold">Notice</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{dialog.message}</p>
            {dialog.dismissible && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dismissNoScanRootsAlert}
                  onChange={(e) => setDismissNoScanRootsAlert(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">Don't show this again</span>
              </label>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setDialog(null)}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                OK
              </button>
            </div>
          </>
        )}
        {dialog.type === "confirm-refresh" && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Rescan</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Rescanning may take a while. Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDialog(null)}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setDialog(null);
                  loadAgents();
                }}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start Scan
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!agentsScanned && agents.length === 0 && !agentsScanning) {
    return (
      <>
        <div className="flex h-full items-center justify-center">
          <div className="text-center max-w-md space-y-4">
            <Bot className="h-12 w-12 text-muted-foreground/40 mx-auto" />
            <h2 className="text-lg font-semibold">Scan Agent Skills</h2>
            {hasScanRoots === false ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No scan directories configured. Global agent detection will still work, but project-level skills won't be scanned.
                </p>
                <p className="text-sm text-muted-foreground">
                  To scan project-level skills, please go to Settings and add directories first.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click "Start Scan" to detect agents on your system. Global agents are always detected. Project-level skills will be scanned from directories configured in Settings. Scanning may take a while.
              </p>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage("settings")}
                className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Settings className="h-4 w-4" />
                Go to Settings
              </button>
              <button
                onClick={loadAgents}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              >
                <Search className="h-4 w-4" />
                Start Scan
              </button>
            </div>
          </div>
        </div>
        {dialogOverlay}
      </>
    );
  }

  return (
    <>
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Agent Skills</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detected.length} agents detected on this system
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={agentsScanning}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", agentsScanning && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border mb-4">
          <button
            onClick={() => handleTabChange("global")}
            className={cn(
              "pb-2 text-sm transition-colors",
              activeTab === "global"
                ? "border-b-2 border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Global
          </button>
          <button
            onClick={() => handleTabChange("project")}
            className={cn(
              "pb-2 text-sm transition-colors",
              activeTab === "project"
                ? "border-b-2 border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Project
          </button>
        </div>

        {agentsScanning ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Scanning directories...</p>
          </div>
        ) : activeTab === "global" ? (
          <GlobalTab
            agents={agents}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        ) : (
          <ProjectTab
            agents={agents}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
            hasScanRoots={hasScanRoots}
            onGoToSettings={() => setCurrentPage("settings")}
          />
        )}
      </div>

      {/* Detail Panel */}
      {selectedNode && selectedAgent && (
        <DetailPanel agent={selectedAgent} selectedNode={selectedNode} />
      )}
    </div>
    {dialogOverlay}
    </>
  );
}

interface GlobalTabProps {
  agents: AgentInfo[];
  selectedNode: SelectedNode | null;
  onSelectNode: (node: SelectedNode) => void;
}

function GlobalTab({ agents, selectedNode, onSelectNode }: GlobalTabProps) {
  return (
    <div className="space-y-1">
      {agents.map((agent) => {
        const isSelected =
          selectedNode?.type === "global" && selectedNode.agentId === agent.id;
        return (
          <div
            key={agent.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
              isSelected && "bg-accent"
            )}
            onClick={() => onSelectNode({ type: "global", agentId: agent.id })}
          >
            <Bot className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium flex-1">{agent.display_name}</span>
            {agent.global.skills.length > 0 && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {agent.global.skills.length}
              </span>
            )}
            {agent.detected ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ProjectTabProps {
  agents: AgentInfo[];
  selectedNode: SelectedNode | null;
  onSelectNode: (node: SelectedNode) => void;
  hasScanRoots: boolean | null;
  onGoToSettings: () => void;
}

function ProjectTab({ agents, selectedNode, onSelectNode, hasScanRoots, onGoToSettings }: ProjectTabProps) {
  const agentsWithProjects = agents.filter((a) => a.projects.length > 0);

  if (agentsWithProjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <FolderTree className="h-8 w-8 text-muted-foreground/40" />
        {hasScanRoots === false ? (
          <>
            <p className="text-sm text-muted-foreground">No scan directories configured.</p>
            <button
              onClick={onGoToSettings}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <Settings className="h-3 w-3" />
              Go to Settings
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No project skills found.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {agentsWithProjects.map((agent) => (
        <div key={agent.id}>
          <div className="flex items-center gap-2 px-2 py-1 mb-1">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {agent.display_name}
            </span>
          </div>
          <div className="space-y-1">
            {agent.projects.map((project, idx) => {
              const projectName = project.project_root.split("/").pop() || project.project_root;
              const isSelected =
                selectedNode?.type === "project" &&
                selectedNode.agentId === agent.id &&
                selectedNode.projectPath === project.path;
              return (
                <div
                  key={`${agent.id}-${project.path}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ml-2",
                    isSelected && "bg-accent"
                  )}
                  onClick={() =>
                    onSelectNode({
                      type: "project",
                      agentId: agent.id,
                      projectPath: project.path,
                    })
                  }
                >
                  <FolderOpen className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm flex-1 truncate" title={project.project_root}>
                    {projectName}
                  </span>
                  {project.skills.length > 0 && (
                    <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full">
                      {project.skills.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

interface DetailPanelProps {
  agent: AgentInfo;
  selectedNode: SelectedNode;
}

function DetailPanel({ agent, selectedNode }: DetailPanelProps) {
  if (selectedNode.type === "global") {
    return <GlobalDetail agent={agent} />;
  } else if (selectedNode.type === "project") {
    const project = agent.projects.find(
      (p) => p.path === selectedNode.projectPath
    );
    if (!project) return null;
    return <ProjectDetail project={project} />;
  }
  return null;
}

function GlobalDetail({ agent }: { agent: AgentInfo }) {
  return (
    <div className="w-80 border-l border-border overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Global</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Path
          </div>
          <code className="block text-[11px] font-mono bg-secondary rounded px-2 py-1 break-all">
            {agent.global.path}
          </code>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Package className="h-3 w-3" />
            Skills ({agent.global.skills.length})
          </div>
          {agent.global.skills.length > 0 ? (
            <div className="space-y-1">
              {agent.global.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-xs"
                >
                  <Package className="h-3 w-3 text-primary" />
                  {skill}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No skills installed</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectDetail({
  project,
}: {
  project: AgentProjectInfo;
}) {
  const projectName = project.project_root.split("/").pop() || project.project_root;

  return (
    <div className="w-80 border-l border-border overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="h-5 w-5 text-success" />
        <h3 className="font-semibold">{projectName}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Project Folder
          </div>
          <div className="text-sm font-medium">{projectName}</div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Skills Path
          </div>
          <code className="block text-[11px] font-mono bg-secondary rounded px-2 py-1 break-all">
            {project.path}
          </code>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Package className="h-3 w-3" />
            Skills ({project.skills.length})
          </div>
          {project.skills.length > 0 ? (
            <div className="space-y-1">
              {project.skills.map((skill) => (
                <div
                  key={skill}
                  className="flex items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-xs"
                >
                  <Package className="h-3 w-3 text-success" />
                  {skill}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No skills installed</p>
          )}
        </div>
      </div>
    </div>
  );
}
