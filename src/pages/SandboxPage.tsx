import { useState } from "react";
import { useStore } from "@/hooks/useStore";
import { createSandbox, runSandboxScript, cleanupSandbox } from "@/lib/tauri";
import type { Skill, SandboxInfo, ScriptOutput } from "@/types/skills";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FlaskConical,
  Play,
  Trash2,
  Eye,
  FileText,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
} from "lucide-react";

type Stage = 1 | 2 | 3;

export function SandboxPage() {
  const skills = useStore((s) => s.skills);
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const setIsLoading = useStore((s) => s.setIsLoading);

  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [sandbox, setSandbox] = useState<SandboxInfo | null>(null);
  const [stage, setStage] = useState<Stage>(1);
  const [scriptOutput, setScriptOutput] = useState<ScriptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [scriptName, setScriptName] = useState("");

  const handleCreateSandbox = async () => {
    if (!selectedSkill) return;
    setLoading(true);
    setIsLoading(true);
    try {
      const info = await createSandbox(selectedSkill.install_path);
      setSandbox(info);
      appendCliOutput(`Sandbox created at ${info.path}`);
    } catch (err) {
      appendCliOutput(`Error creating sandbox: ${err}`);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleRunScript = async () => {
    if (!sandbox || !scriptName) return;
    setLoading(true);
    setIsLoading(true);
    try {
      const output = await runSandboxScript(sandbox.path, scriptName);
      setScriptOutput(output);
      appendCliOutput(`Script ${scriptName} exited with code ${output.exit_code} (${output.duration_ms}ms)`);
    } catch (err) {
      appendCliOutput(`Error running script: ${err}`);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!sandbox) return;
    try {
      await cleanupSandbox(sandbox.temp_dir_handle);
      setSandbox(null);
      setScriptOutput(null);
      appendCliOutput("Sandbox cleaned up");
    } catch (err) {
      appendCliOutput(`Error cleaning up: ${err}`);
    }
  };

  const metadataTokens = selectedSkill
    ? Math.ceil((selectedSkill.name.length + selectedSkill.description.length) / 4)
    : 0;
  const bodyTokens = selectedSkill ? Math.ceil(selectedSkill.body.length / 4) : 0;

  return (
    <div className="flex h-full">
      {/* Left - Skill Selection & Controls */}
      <div className="w-72 border-r border-border flex flex-col">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Sandbox</h2>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Test skills in an isolated environment
          </p>
        </div>

        {/* Skill Selector */}
        <div className="border-b border-border p-4">
          <label className="text-xs font-medium mb-2 block">Select Skill</label>
          <select
            value={selectedSkill?.install_path || ""}
            onChange={(e) => {
              const skill = skills.find((s) => s.install_path === e.target.value);
              setSelectedSkill(skill || null);
              setSandbox(null);
              setScriptOutput(null);
            }}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Choose a skill...</option>
            {skills.map((skill) => (
              <option key={skill.install_path} value={skill.install_path}>
                {skill.name} ({skill.scope})
              </option>
            ))}
          </select>
        </div>

        {/* Stage Selector */}
        <div className="border-b border-border p-4">
          <label className="text-xs font-medium mb-2 block">Progressive Disclosure Stage</label>
          <div className="space-y-1.5">
            {([
              { stage: 1 as Stage, label: "Metadata Only", desc: `~${metadataTokens} tokens` },
              { stage: 2 as Stage, label: "Full Instructions", desc: `~${bodyTokens} tokens` },
              { stage: 3 as Stage, label: "With Resources", desc: "All files" },
            ]).map((item) => (
              <button
                key={item.stage}
                onClick={() => setStage(item.stage)}
                className={cn(
                  "w-full text-left rounded-md border px-3 py-2 text-xs transition-colors",
                  stage === item.stage
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Stage {item.stage}: {item.label}</span>
                  <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sandbox Controls */}
        <div className="p-4 space-y-2">
          <button
            onClick={handleCreateSandbox}
            disabled={!selectedSkill || loading}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Create Sandbox
          </button>

          {sandbox && (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="scripts/test.sh"
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-[10px] font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleRunScript}
                  disabled={!scriptName || loading}
                  className="rounded-md bg-secondary px-2 py-1.5 text-[10px] hover:bg-secondary/80 disabled:opacity-50"
                >
                  <Terminal className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={handleCleanup}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/20 text-destructive px-3 py-1.5 text-xs hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Cleanup Sandbox
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right - Preview */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedSkill ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a skill to preview</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Agent View - Stage {stage}</h3>
            </div>

            {/* Stage 1: Metadata */}
            <div className="rounded-lg border bg-card p-4 mb-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Info className="h-3 w-3" />
                Stage 1: Metadata (loaded at startup, ~{metadataTokens} tokens)
              </div>
              <div className="space-y-1">
                <div className="text-xs">
                  <span className="text-muted-foreground font-mono">name: </span>
                  <span className="font-medium">{selectedSkill.name}</span>
                </div>
                <div className="text-xs">
                  <span className="text-muted-foreground font-mono">description: </span>
                  <span>{selectedSkill.description}</span>
                </div>
              </div>
            </div>

            {/* Stage 2: Full Instructions */}
            {stage >= 2 && (
              <div className="rounded-lg border bg-card p-4 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" />
                  Stage 2: Full Instructions (loaded when activated, ~{bodyTokens} tokens)
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedSkill.body}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Stage 3: Resources */}
            {stage >= 3 && (
              <div className="rounded-lg border bg-card p-4 mb-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <ChevronRight className="h-3 w-3" />
                  Stage 3: Referenced Resources (loaded on demand)
                </div>
                <p className="text-xs text-muted-foreground">
                  scripts/, references/, assets/ directories would be listed here.
                </p>
              </div>
            )}

            {/* Script Output */}
            {scriptOutput && (
              <div className="rounded-lg border bg-card p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Script Output</span>
                  {scriptOutput.exit_code === 0 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {scriptOutput.duration_ms}ms | exit: {scriptOutput.exit_code}
                  </span>
                </div>
                <pre className="text-[11px] font-mono bg-secondary/30 rounded p-3 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {scriptOutput.stdout}
                  {scriptOutput.stderr && (
                    <span className="text-destructive">{scriptOutput.stderr}</span>
                  )}
                </pre>
              </div>
            )}

            {/* Sandbox Info */}
            {sandbox && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-1">
                  <FlaskConical className="h-3 w-3" />
                  Sandbox Active
                </div>
                <code className="text-[10px] font-mono text-muted-foreground">{sandbox.path}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
