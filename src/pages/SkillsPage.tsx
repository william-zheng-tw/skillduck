import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/hooks/useStore";
import { listSkills, cliAddSkill, cliRemoveSkill, detectAgents } from "@/lib/tauri";
import type { AddSkillOptions } from "@/lib/tauri";
import { SkillCard } from "@/components/skills/SkillCard";
import { SkillDetail } from "@/components/skills/SkillDetail";
import type { AgentInfo } from "@/types/skills";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Search,
  RefreshCw,
  Plus,
  Globe,
  FolderOpen,
  Filter,
  Loader2,
  Bot,
  List,
  Layers,
  X,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ScopeFilter = "all" | "project" | "global";

export function SkillsPage() {
  const skills = useStore((s) => s.skills);
  const setSkills = useStore((s) => s.setSkills);
  const selectedSkill = useStore((s) => s.selectedSkill);
  const setSelectedSkill = useStore((s) => s.setSelectedSkill);
  const setIsLoading = useStore((s) => s.setIsLoading);
  const appendCliOutput = useStore((s) => s.appendCliOutput);

  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [loading, setLoading] = useState(false);

  // Add dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSource, setAddSource] = useState("");
  const [addGlobal, setAddGlobal] = useState(false);
  const [addAgents, setAddAgents] = useState<string[]>([]);
  const [addSkillNames, setAddSkillNames] = useState("");
  const [addListOnly, setAddListOnly] = useState(false);
  const [addAll, setAddAll] = useState(false);
  const [addProjectPath, setAddProjectPath] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [listResult, setListResult] = useState<string | null>(null);
  const [detectedAgents, setDetectedAgents] = useState<AgentInfo[]>([]);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setIsLoading(true);
    try {
      const result = await listSkills("all");
      setSkills(result);
      appendCliOutput(`Loaded ${result.length} skills`);
    } catch (err) {
      appendCliOutput(`Error loading skills: ${err}`);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [setSkills, setIsLoading, appendCliOutput]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesScope = scope === "all" || s.scope === scope;
    return matchesSearch && matchesScope;
  });

  const handleRemove = async (skill: typeof skills[0]) => {
    setIsLoading(true);
    try {
      const isGlobal = skill.scope === "global";
      const result = await cliRemoveSkill([skill.name], skill.agents, isGlobal);
      appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);
      setSelectedSkill(null);
      await loadSkills();
    } catch (err) {
      appendCliOutput(`Error removing skill: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetAddDialog = () => {
    setAddSource("");
    setAddGlobal(false);
    setAddProjectPath("");
    setAddAgents([]);
    setAddSkillNames("");
    setAddListOnly(false);
    setAddAll(false);
    setShowAdvanced(false);
    setListResult(null);
  };

  const openAddDialog = async () => {
    resetAddDialog();
    setShowAddDialog(true);
    try {
      const agents = await detectAgents();
      setDetectedAgents(agents.filter((a) => a.detected));
    } catch {
      setDetectedAgents([]);
    }
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
        setShowAddDialog(false);
        resetAddDialog();
        await loadSkills();
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

  return (
    <div className="flex h-full">
      {/* Left Panel - Skill List */}
      <div className="flex w-80 flex-col border-r border-border">
        {/* Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">My Skills</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={openAddDialog}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Add Skill"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={loadSkills}
                disabled={loading}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Scope Filter */}
          <div className="mt-2 flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground mr-1" />
            {(["all", "project", "global"] as ScopeFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors",
                  scope === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {s === "global" && <Globe className="h-2.5 w-2.5" />}
                {s === "project" && <FolderOpen className="h-2.5 w-2.5" />}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Skill List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSkills.length > 0 ? (
            filteredSkills.map((skill) => (
              <SkillCard
                key={`${skill.scope}-${skill.name}-${skill.install_path}`}
                skill={skill}
                isSelected={selectedSkill?.install_path === skill.install_path}
                onClick={() => setSelectedSkill(skill)}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">
                {search ? "No skills match your search" : "No skills installed"}
              </p>
              <button
                onClick={openAddDialog}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" />
                Add Skill
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Skill Detail */}
      <div className="flex-1">
        {selectedSkill ? (
          <SkillDetail skill={selectedSkill} onRemove={handleRemove} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Select a skill to view details
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Skill Dialog */}
      {showAddDialog && (
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
                onClick={() => { setShowAddDialog(false); resetAddDialog(); }}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Source Input */}
            <div className="space-y-4">
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
                    onClick={() => setAddGlobal(false)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
                      !addGlobal
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Project
                  </button>
                  <button
                    onClick={() => setAddGlobal(true)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors",
                      addGlobal
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Global
                    <span className="text-[10px] text-muted-foreground font-normal">(~/)</span>
                  </button>
                </div>

                {/* Project Path - shown when Project scope is selected */}
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
                onClick={() => { setShowAddDialog(false); resetAddDialog(); }}
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
      )}
    </div>
  );
}
