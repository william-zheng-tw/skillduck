import { useState, useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { cliAddSkill, detectAgents } from "@/lib/tauri";
import type { AddSkillOptions } from "@/lib/tauri";
import type { AgentInfo } from "@/types/skills";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Globe,
  FolderOpen,
  Bot,
  List,
  Layers,
  X,
  Terminal,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSource?: string;
  initialSkillNames?: string;
}

export function AddSkillDialog({
  open,
  onClose,
  onSuccess,
  initialSource = "",
  initialSkillNames = "",
}: AddSkillDialogProps) {
  const setIsLoading = useStore((s) => s.setIsLoading);
  const appendCliOutput = useStore((s) => s.appendCliOutput);

  const [addLoading, setAddLoading] = useState(false);
  const [addSource, setAddSource] = useState(initialSource);
  const [addGlobal, setAddGlobal] = useState(true);
  const [addAgents, setAddAgents] = useState<string[]>([]);
  const [addSkillNames, setAddSkillNames] = useState(initialSkillNames);
  const [addListOnly, setAddListOnly] = useState(false);
  const [addAll, setAddAll] = useState(false);
  const [addProjectPath, setAddProjectPath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [listResult, setListResult] = useState<string | null>(null);
  const [detectedAgents, setDetectedAgents] = useState<AgentInfo[]>([]);

  useEffect(() => {
    if (open) {
      setAddSource(initialSource);
      setAddSkillNames(initialSkillNames);
      setAddGlobal(true);
      setAddProjectPath("");
      setAddAgents([]);
      setAddListOnly(false);
      setAddAll(false);
      setShowAdvanced(false);
      setListResult(null);

      detectAgents()
        .then((agents) => setDetectedAgents(agents.filter((a) => a.detected)))
        .catch(() => setDetectedAgents([]));
    }
  }, [open, initialSource, initialSkillNames]);

  const resetAndClose = () => {
    onClose();
  };

  const buildCliPreview = (): string => {
    let prefix = "";
    if (!addGlobal && addProjectPath) {
      prefix = `cd ${addProjectPath} && `;
    }
    let cmd = `${prefix}npx skills add ${addSource || "<source>"}`;
    if (addGlobal) cmd += " -g";
    if (addAgents.length > 0) cmd += addAgents.map((a) => ` -a ${a}`).join("");
    const skillList = addSkillNames.split(",").map((s) => s.trim()).filter(Boolean);
    if (skillList.length > 0) cmd += skillList.map((s) => ` -s ${s}`).join("");
    if (addListOnly) cmd += " --list";
    if (addAll) cmd += " --all";
    cmd += " -y";
    return cmd;
  };

  const handleAdd = async () => {
    if (!addSource.trim()) return;
    setAddLoading(true);
    setIsLoading(true);
    setListResult(null);
    try {
      const skillList = addSkillNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const opts: AddSkillOptions = {
        source: addSource.trim(),
        agents: addAgents,
        skills: skillList,
        global: addGlobal,
        listOnly: addListOnly,
        all: addAll,
        projectPath: !addGlobal && addProjectPath ? addProjectPath : undefined,
      };

      const result = await cliAddSkill(opts);
      appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);

      if (addListOnly) {
        setListResult(result.stdout || result.stderr || "No output");
      } else {
        onClose();
        onSuccess?.();
      }
    } catch (err) {
      appendCliOutput(`Error: ${err}`);
    } finally {
      setAddLoading(false);
      setIsLoading(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setAddAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((a) => a !== agentId)
        : [...prev, agentId]
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[560px] max-h-[85vh] overflow-y-auto rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Add Skill</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Install from GitHub, GitLab, or local path
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Source Input */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">Source *</label>
            <input
              type="text"
              placeholder="e.g. vercel-labs/agent-skills, https://github.com/..., ./local-skills"
              value={addSource}
              onChange={(e) => setAddSource(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              GitHub shorthand, full URL, GitLab URL, git URL, or local path
            </p>
          </div>

          {/* Scope Toggle */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">Installation Scope</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAddGlobal(true)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-xs transition-colors",
                  addGlobal
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-transparent hover:border-primary/30 text-muted-foreground"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                Global
                <span className={cn("text-[10px] font-normal", addGlobal ? "text-primary/70" : "text-muted-foreground/60")}>(~/)</span>
              </button>
              <button
                onClick={() => setAddGlobal(false)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-xs transition-colors",
                  !addGlobal
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border bg-transparent hover:border-primary/30 text-muted-foreground"
                )}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Project
              </button>
            </div>

            {!addGlobal && (
              <div className="mt-2">
                <label className="text-[10px] text-muted-foreground mb-1 block">
                  Project directory
                  <span className="text-muted-foreground/60 ml-1">(CLI will run in this directory)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground min-h-[30px] flex items-center overflow-hidden">
                    {addProjectPath ? (
                      <span className="truncate" title={addProjectPath}>{addProjectPath}</span>
                    ) : (
                      <span className="text-muted-foreground">Current directory (default)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const selected = await openDialog({
                        directory: true,
                        multiple: false,
                        title: "Select Project Directory",
                      });
                      if (selected) {
                        setAddProjectPath(selected as string);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors shrink-0"
                  >
                    <FolderOpen className="h-3 w-3" />
                    Browse
                  </button>
                  {addProjectPath && (
                    <button
                      type="button"
                      onClick={() => setAddProjectPath("")}
                      className="rounded-md border px-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                      title="Clear"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Skills will be installed to <code className="bg-secondary px-1 rounded">{addProjectPath || "."}/{"{agent}"}/skills/</code>
                </p>
              </div>
            )}

            {addGlobal && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Skills will be installed to <code className="bg-secondary px-1 rounded">~/{"{agent}"}/skills/</code> — available across all projects
              </p>
            )}
          </div>

          {/* Target Agents */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              Target Agents
              <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                (leave empty = auto-detect)
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {detectedAgents.length > 0 ? (
                detectedAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    disabled={addAll}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors",
                      addAgents.includes(agent.id)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:border-primary/30 text-muted-foreground",
                      addAll && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Bot className="h-3 w-3" />
                    {agent.display_name}
                  </button>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  Loading detected agents...
                </p>
              )}
            </div>
          </div>

          {/* Specific Skills */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              Specific Skills
              <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                (comma-separated, leave empty = interactive, use * for all)
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. react-best-practices, web-design-guidelines"
              value={addSkillNames}
              onChange={(e) => setAddSkillNames(e.target.value)}
              disabled={addAll}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* Advanced Options */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-2 rounded-lg border bg-secondary/20 p-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={addListOnly}
                  onChange={(e) => {
                    setAddListOnly(e.target.checked);
                    if (e.target.checked) setAddAll(false);
                  }}
                  className="rounded border-input"
                />
                <List className="h-3 w-3 text-muted-foreground" />
                <span>List only</span>
                <span className="text-[10px] text-muted-foreground">
                  (--list) Preview available skills without installing
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={addAll}
                  onChange={(e) => {
                    setAddAll(e.target.checked);
                    if (e.target.checked) {
                      setAddListOnly(false);
                      setAddAgents([]);
                      setAddSkillNames("");
                    }
                  }}
                  className="rounded border-input"
                />
                <Layers className="h-3 w-3 text-muted-foreground" />
                <span>Install all</span>
                <span className="text-[10px] text-muted-foreground">
                  (--all) Install all skills to all agents
                </span>
              </label>
            </div>
          )}

          {/* CLI Preview */}
          <div className="rounded-lg border bg-secondary/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
              <Terminal className="h-3 w-3" />
              Command Preview
            </div>
            <code className="text-[11px] font-mono text-foreground break-all">
              {buildCliPreview()}
            </code>
          </div>

          {/* List Result */}
          {listResult && (
            <div className="rounded-lg border bg-secondary/30 p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                <List className="h-3 w-3" />
                Available Skills
              </div>
              <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                {listResult}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={resetAndClose}
            className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={addLoading || !addSource.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {addLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            {addListOnly ? "List Skills" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
