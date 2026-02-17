import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { detectAgents, getSettings } from "@/lib/tauri";
import type { AgentInfo, AgentProjectInfo } from "@/types/skills";
import { cn } from "@/lib/utils";
import {
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Globe,
  Package,
  Loader2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Settings,
  Search,
} from "lucide-react";

type SelectedNode =
  | { type: "agent"; agentId: string }
  | { type: "global"; agentId: string }
  | { type: "project"; agentId: string; projectPath: string };

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

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [hasScanRoots, setHasScanRoots] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings().then((s) => setHasScanRoots(s.scan_roots.length > 0)).catch(() => setHasScanRoots(false));
  }, []);

  const loadAgents = useCallback(async () => {
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
    }
  }, [setAgents, setIsLoading, appendCliOutput, setAgentsScanned, setAgentsScanning]);

  const handleRefresh = useCallback(() => {
    if (window.confirm("重新掃描將花費一些時間，確定要繼續嗎？")) {
      loadAgents();
    }
  }, [loadAgents]);

  const toggleAgent = (agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const toggleProjects = (agentId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const detected = agents.filter((a) => a.detected);
  const notDetected = agents.filter((a) => !a.detected);

  const selectedAgent = selectedNode
    ? agents.find((a) => a.id === selectedNode.agentId)
    : null;

  if (!agentsScanned && agents.length === 0 && !agentsScanning) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md space-y-4">
          <Bot className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <h2 className="text-lg font-semibold">掃描 Agents</h2>
          {hasScanRoots === false ? (
            <p className="text-sm text-muted-foreground">
              尚未配置掃描目錄，請先前往設定頁新增要掃描的目錄。
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              請先在設定頁配置要掃描的目錄，然後點擊「開始掃描」來偵測系統中的 Agents。掃描可能需要一些時間。
            </p>
          )}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setCurrentPage("settings")}
              className="inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              前往設定
            </button>
            <button
              onClick={() => {
                if (hasScanRoots === false) {
                  window.alert("請先在設定頁配置掃描目錄後再執行掃描。");
                  return;
                }
                loadAgents();
              }}
              disabled={hasScanRoots === false}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm transition-colors",
                hasScanRoots === false
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <Search className="h-4 w-4" />
              開始掃描
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Agent Tree */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Agents</h2>
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

        {agentsScanning ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">正在掃描目錄中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {detected.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Detected
                </h3>
                <div className="space-y-1">
                  {detected.map((agent) => (
                    <AgentTreeNode
                      key={agent.id}
                      agent={agent}
                      expanded={expandedAgents.has(agent.id)}
                      projectsExpanded={expandedProjects.has(agent.id)}
                      selectedNode={selectedNode}
                      onToggle={() => toggleAgent(agent.id)}
                      onToggleProjects={() => toggleProjects(agent.id)}
                      onSelectNode={setSelectedNode}
                    />
                  ))}
                </div>
              </div>
            )}

            {notDetected.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Not Detected
                </h3>
                <div className="space-y-1">
                  {notDetected.map((agent) => (
                    <AgentTreeNode
                      key={agent.id}
                      agent={agent}
                      expanded={expandedAgents.has(agent.id)}
                      projectsExpanded={expandedProjects.has(agent.id)}
                      selectedNode={selectedNode}
                      onToggle={() => toggleAgent(agent.id)}
                      onToggleProjects={() => toggleProjects(agent.id)}
                      onSelectNode={setSelectedNode}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedNode && selectedAgent && (
        <DetailPanel agent={selectedAgent} selectedNode={selectedNode} />
      )}
    </div>
  );
}

interface AgentTreeNodeProps {
  agent: AgentInfo;
  expanded: boolean;
  projectsExpanded: boolean;
  selectedNode: SelectedNode | null;
  onToggle: () => void;
  onToggleProjects: () => void;
  onSelectNode: (node: SelectedNode) => void;
}

function AgentTreeNode({
  agent,
  expanded,
  projectsExpanded,
  selectedNode,
  onToggle,
  onToggleProjects,
  onSelectNode,
}: AgentTreeNodeProps) {
  const totalSkills =
    agent.global.skills.length +
    agent.projects.reduce((sum, p) => sum + p.skills.length, 0);

  const isAgentSelected =
    selectedNode?.type === "agent" && selectedNode.agentId === agent.id;

  return (
    <div className="select-none">
      {/* Agent Root Node */}
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 transition-colors",
          isAgentSelected && "bg-accent"
        )}
        onClick={() => {
          onSelectNode({ type: "agent", agentId: agent.id });
          onToggle();
        }}
      >
        <button className="p-0.5 hover:bg-accent rounded">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium flex-1">{agent.display_name}</span>
        {agent.detected ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground/40" />
        )}
        {totalSkills > 0 && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {totalSkills}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && (
        <div className="ml-4 mt-1 space-y-1">
          {/* Global Node */}
          <GlobalNode
            agent={agent}
            selected={
              selectedNode?.type === "global" &&
              selectedNode.agentId === agent.id
            }
            onSelect={() =>
              onSelectNode({ type: "global", agentId: agent.id })
            }
          />

          {/* Projects Node */}
          {agent.projects.length > 0 && (
            <>
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 transition-colors"
                )}
                onClick={onToggleProjects}
              >
                <button className="p-0.5 hover:bg-accent rounded">
                  {projectsExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                <FolderTree className="h-3 w-3 text-success" />
                <span className="text-xs">Projects</span>
                <span className="text-[10px] text-muted-foreground">
                  ({agent.projects.length})
                </span>
              </div>

              {projectsExpanded && (
                <div className="ml-4 space-y-1">
                  {agent.projects.map((project, idx) => (
                    <ProjectNode
                      key={`${agent.id}-${project.path}-${idx}`}
                      agent={agent}
                      project={project}
                      selected={
                        selectedNode?.type === "project" &&
                        selectedNode.agentId === agent.id &&
                        selectedNode.projectPath === project.path
                      }
                      onSelect={() =>
                        onSelectNode({
                          type: "project",
                          agentId: agent.id,
                          projectPath: project.path,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface GlobalNodeProps {
  agent: AgentInfo;
  selected: boolean;
  onSelect: () => void;
}

function GlobalNode({ agent, selected, onSelect }: GlobalNodeProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 transition-colors",
        selected && "bg-accent"
      )}
      onClick={onSelect}
    >
      <div className="w-4" />
      <Globe className="h-3 w-3 text-primary" />
      <span className="text-xs flex-1">Global</span>
      {agent.global.skills.length > 0 && (
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
          {agent.global.skills.length}
        </span>
      )}
    </div>
  );
}

interface ProjectNodeProps {
  agent: AgentInfo;
  project: AgentProjectInfo;
  selected: boolean;
  onSelect: () => void;
}

function ProjectNode({ project, selected, onSelect }: ProjectNodeProps) {
  const projectName = project.path.split("/").pop() || project.path;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent/50 transition-colors",
        selected && "bg-accent"
      )}
      onClick={onSelect}
    >
      <div className="w-4" />
      <FolderOpen className="h-3 w-3 text-success" />
      <span className="text-xs flex-1 truncate" title={project.path}>
        {projectName}
      </span>
      {project.skills.length > 0 && (
        <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full">
          {project.skills.length}
        </span>
      )}
    </div>
  );
}

interface DetailPanelProps {
  agent: AgentInfo;
  selectedNode: SelectedNode;
}

function DetailPanel({ agent, selectedNode }: DetailPanelProps) {
  if (selectedNode.type === "agent") {
    return <AgentDetail agent={agent} />;
  } else if (selectedNode.type === "global") {
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

function AgentDetail({ agent }: { agent: AgentInfo }) {
  const totalSkills =
    agent.global.skills.length +
    agent.projects.reduce((sum, p) => sum + p.skills.length, 0);

  return (
    <div className="w-80 border-l border-border overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{agent.display_name}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Status</div>
          <div className="flex items-center gap-2">
            {agent.detected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm">Detected</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Not Detected</span>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Total Skills</div>
          <div className="text-2xl font-bold">{totalSkills}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">Breakdown</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-primary" />
                <span className="text-xs">Global</span>
              </div>
              <span className="text-xs font-medium">{agent.global.skills.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="h-3 w-3 text-success" />
                <span className="text-xs">Projects</span>
              </div>
              <span className="text-xs font-medium">
                {agent.projects.reduce((sum, p) => sum + p.skills.length, 0)} ({agent.projects.length} projects)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  return (
    <div className="w-80 border-l border-border overflow-y-auto p-6">
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="h-5 w-5 text-success" />
        <h3 className="font-semibold">Project</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            Path
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
