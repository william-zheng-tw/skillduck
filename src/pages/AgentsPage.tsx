import { useEffect, useCallback, useState } from "react";
import { useStore } from "@/hooks/useStore";
import { detectAgents } from "@/lib/tauri";
import type { AgentInfo } from "@/types/skills";
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
} from "lucide-react";

export function AgentsPage() {
  const agents = useStore((s) => s.agents);
  const setAgents = useStore((s) => s.setAgents);
  const setIsLoading = useStore((s) => s.setIsLoading);
  const appendCliOutput = useStore((s) => s.appendCliOutput);

  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setIsLoading(true);
    try {
      const result = await detectAgents();
      setAgents(result);
      const detected = result.filter((a) => a.detected).length;
      appendCliOutput(`Detected ${detected}/${result.length} agents`);
    } catch (err) {
      appendCliOutput(`Error detecting agents: ${err}`);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [setAgents, setIsLoading, appendCliOutput]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const detected = agents.filter((a) => a.detected);
  const notDetected = agents.filter((a) => !a.detected);

  return (
    <div className="flex h-full">
      {/* Agent Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Agents</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detected.length} agents detected on this system
            </p>
          </div>
          <button
            onClick={loadAgents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {detected.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Detected
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {detected.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgent?.id === agent.id}
                      onClick={() => setSelectedAgent(agent)}
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
                <div className="grid grid-cols-2 gap-3">
                  {notDetected.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgent?.id === agent.id}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <div className="w-80 border-l border-border overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{selectedAgent.display_name}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <FolderOpen className="h-3 w-3" />
                Project Path
              </div>
              <code className="block text-[11px] font-mono bg-secondary rounded px-2 py-1 break-all">
                {selectedAgent.project_path}
              </code>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Globe className="h-3 w-3" />
                Global Path
              </div>
              <code className="block text-[11px] font-mono bg-secondary rounded px-2 py-1 break-all">
                {selectedAgent.global_path}
              </code>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Package className="h-3 w-3" />
                Installed Skills ({selectedAgent.installed_skills.length})
              </div>
              {selectedAgent.installed_skills.length > 0 ? (
                <div className="space-y-1">
                  {selectedAgent.installed_skills.map((skill) => (
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
      )}
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: AgentInfo;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{agent.display_name}</span>
        </div>
        {agent.detected ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{agent.id}</span>
        {agent.installed_skills.length > 0 && (
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            {agent.installed_skills.length} skills
          </span>
        )}
      </div>
    </button>
  );
}
