import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/hooks/useStore";
import { listSkills, cliAddSkill, cliRemoveSkill } from "@/lib/tauri";
import { SkillCard } from "@/components/skills/SkillCard";
import { SkillDetail } from "@/components/skills/SkillDetail";
import {
  Search,
  RefreshCw,
  Plus,
  Globe,
  FolderOpen,
  Filter,
  Loader2,
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
  const [addSource, setAddSource] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

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

  const handleAdd = async () => {
    if (!addSource.trim()) return;
    setAddLoading(true);
    setIsLoading(true);
    try {
      const result = await cliAddSkill(addSource.trim(), [], [], false);
      appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);
      setShowAddDialog(false);
      setAddSource("");
      await loadSkills();
    } catch (err) {
      appendCliOutput(`Error adding skill: ${err}`);
    } finally {
      setAddLoading(false);
      setIsLoading(false);
    }
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
                onClick={() => setShowAddDialog(true)}
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
                onClick={() => setShowAddDialog(true)}
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
          <div className="w-[480px] rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold mb-1">Add Skill</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Install from GitHub, GitLab, or local path
            </p>
            <input
              type="text"
              placeholder="e.g. vercel-labs/agent-skills or ./local-skills"
              value={addSource}
              onChange={(e) => setAddSource(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setAddSource("");
                }}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={addLoading || !addSource.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {addLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Install
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
