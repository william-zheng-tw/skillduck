import { useState, useCallback, useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { saveSkillMd, readSkillMd, cliInitSkill } from "@/lib/tauri";
import type { ValidationResult, DiagnosticItem } from "@/types/skills";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileEdit,
  Eye,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Save,
  FolderOpen,
  FilePlus,
  Loader2,
  Info,
  Hash,
} from "lucide-react";

interface FrontmatterFields {
  name: string;
  description: string;
  license: string;
  compatibility: string;
  allowed_tools: string;
  metadata_author: string;
  metadata_version: string;
}

const EMPTY_FRONTMATTER: FrontmatterFields = {
  name: "",
  description: "",
  license: "",
  compatibility: "",
  allowed_tools: "",
  metadata_author: "",
  metadata_version: "",
};

type Tab = "edit" | "preview" | "split";

export function EditorPage() {
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const setIsLoading = useStore((s) => s.setIsLoading);

  const [fields, setFields] = useState<FrontmatterFields>(EMPTY_FRONTMATTER);
  const [body, setBody] = useState("# My Skill\n\nInstructions for the agent.\n\n## When to Use\n\nDescribe scenarios.\n\n## Steps\n\n1. First step\n2. Second step\n");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [tab, setTab] = useState<Tab>("split");
  const [filePath, setFilePath] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillPath, setNewSkillPath] = useState("");

  const updateField = (field: keyof FrontmatterFields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const runValidation = useCallback(() => {
    const errors: DiagnosticItem[] = [];
    const warnings: DiagnosticItem[] = [];

    // name validation
    if (!fields.name) {
      errors.push({ field: "name", message: "Name is required", severity: "error" });
    } else {
      if (fields.name.length > 64) {
        errors.push({ field: "name", message: "Name must be <= 64 characters", severity: "error" });
      }
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(fields.name)) {
        errors.push({
          field: "name",
          message: "Name must be lowercase alphanumeric with single hyphens, not starting/ending with hyphen",
          severity: "error",
        });
      }
      if (fields.name.includes("--")) {
        errors.push({ field: "name", message: "Name must not contain consecutive hyphens", severity: "error" });
      }
    }

    // description validation
    if (!fields.description) {
      errors.push({ field: "description", message: "Description is required", severity: "error" });
    } else {
      if (fields.description.length > 1024) {
        errors.push({ field: "description", message: "Description must be <= 1024 characters", severity: "error" });
      }
      if (fields.description.length < 20) {
        warnings.push({ field: "description", message: "Description should be more descriptive (>= 20 chars)", severity: "warning" });
      }
    }

    // compatibility
    if (fields.compatibility && fields.compatibility.length > 500) {
      errors.push({ field: "compatibility", message: "Compatibility must be <= 500 characters", severity: "error" });
    }

    // body warnings
    const bodyLines = body.split("\n").length;
    if (bodyLines > 500) {
      warnings.push({ field: "body", message: `Body is ${bodyLines} lines (recommended < 500)`, severity: "warning" });
    }

    const tokenEstimate = Math.ceil(body.length / 4);
    if (tokenEstimate > 5000) {
      warnings.push({ field: "body", message: `Estimated ${tokenEstimate} tokens (recommended < 5000)`, severity: "warning" });
    }

    setValidation({ valid: errors.length === 0, errors, warnings });
  }, [fields, body]);

  useEffect(() => {
    const timeout = setTimeout(runValidation, 300);
    return () => clearTimeout(timeout);
  }, [runValidation]);

  const handleSave = async () => {
    if (!filePath) return;
    setSaving(true);
    setIsLoading(true);
    try {
      const frontmatter: Record<string, string> = {
        name: fields.name,
        description: fields.description,
      };
      if (fields.license) frontmatter.license = fields.license;
      if (fields.compatibility) frontmatter.compatibility = fields.compatibility;
      if (fields.allowed_tools) frontmatter.allowed_tools = fields.allowed_tools;

      await saveSkillMd(filePath, frontmatter, body);
      setDirty(false);
      appendCliOutput(`Saved ${filePath}`);
    } catch (err) {
      appendCliOutput(`Error saving: ${err}`);
    } finally {
      setSaving(false);
      setIsLoading(false);
    }
  };

  const handleOpen = async () => {
    const path = prompt("Enter path to SKILL.md:");
    if (!path) return;
    try {
      const result = await readSkillMd(path);
      setFields({
        name: result.frontmatter.name || "",
        description: result.frontmatter.description || "",
        license: result.frontmatter.license || "",
        compatibility: result.frontmatter.compatibility || "",
        allowed_tools: result.frontmatter.allowed_tools || "",
        metadata_author: result.frontmatter["metadata.author"] || "",
        metadata_version: result.frontmatter["metadata.version"] || "",
      });
      setBody(result.body);
      setFilePath(path);
      setDirty(false);
      appendCliOutput(`Opened ${path}`);
    } catch (err) {
      appendCliOutput(`Error opening: ${err}`);
    }
  };

  const handleNew = async () => {
    if (!newSkillName.trim()) return;
    try {
      const result = await cliInitSkill(newSkillName.trim(), newSkillPath || ".");
      appendCliOutput(result.stdout);
      setShowNewDialog(false);
      setNewSkillName("");
      setNewSkillPath("");
    } catch (err) {
      appendCliOutput(`Error creating skill: ${err}`);
    }
  };

  const generatePreviewYaml = () => {
    let yaml = `---\nname: ${fields.name || "my-skill"}\ndescription: ${fields.description || "A description"}\n`;
    if (fields.license) yaml += `license: ${fields.license}\n`;
    if (fields.compatibility) yaml += `compatibility: ${fields.compatibility}\n`;
    if (fields.allowed_tools) yaml += `allowed-tools: ${fields.allowed_tools}\n`;
    if (fields.metadata_author || fields.metadata_version) {
      yaml += "metadata:\n";
      if (fields.metadata_author) yaml += `  author: ${fields.metadata_author}\n`;
      if (fields.metadata_version) yaml += `  version: "${fields.metadata_version}"\n`;
    }
    yaml += "---\n\n";
    return yaml;
  };

  const tokenEstimate = Math.ceil(body.length / 4);
  const metadataTokens = Math.ceil(
    (fields.name.length + fields.description.length) / 4
  );

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <FileEdit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Skill Editor</h2>
          {filePath && (
            <span className="text-[10px] font-mono text-muted-foreground ml-2">
              {filePath}
            </span>
          )}
          {dirty && (
            <span className="text-[10px] text-warning font-medium">Modified</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {([
              { id: "edit", icon: FileEdit, label: "Edit" },
              { id: "split", icon: Hash, label: "Split" },
              { id: "preview", icon: Eye, label: "Preview" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors",
                  tab === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewDialog(true)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
          >
            <FilePlus className="h-3 w-3" />
            New
          </button>
          <button
            onClick={handleOpen}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-accent transition-colors"
          >
            <FolderOpen className="h-3 w-3" />
            Open
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !filePath || !dirty}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Edit Panel */}
        {(tab === "edit" || tab === "split") && (
          <div className={cn("flex flex-col overflow-y-auto border-r border-border", tab === "split" ? "w-1/2" : "flex-1")}>
            {/* Frontmatter Form */}
            <div className="border-b border-border p-4 space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Frontmatter</h3>

              <FormField label="name *" error={validation?.errors.find((e) => e.field === "name")}>
                <input
                  type="text"
                  value={fields.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="my-skill"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </FormField>

              <FormField label="description *" error={validation?.errors.find((e) => e.field === "description")} warning={validation?.warnings.find((e) => e.field === "description")}>
                <textarea
                  value={fields.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe what this skill does and when to use it..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <span className="text-[10px] text-muted-foreground">{fields.description.length}/1024</span>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="license">
                  <input
                    type="text"
                    value={fields.license}
                    onChange={(e) => updateField("license", e.target.value)}
                    placeholder="MIT"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </FormField>
                <FormField label="compatibility">
                  <input
                    type="text"
                    value={fields.compatibility}
                    onChange={(e) => updateField("compatibility", e.target.value)}
                    placeholder="Requires git, docker"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </FormField>
              </div>

              <FormField label="allowed-tools">
                <input
                  type="text"
                  value={fields.allowed_tools}
                  onChange={(e) => updateField("allowed_tools", e.target.value)}
                  placeholder='Bash(git:*) Read'
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="metadata.author">
                  <input
                    type="text"
                    value={fields.metadata_author}
                    onChange={(e) => updateField("metadata_author", e.target.value)}
                    placeholder="your-org"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </FormField>
                <FormField label="metadata.version">
                  <input
                    type="text"
                    value={fields.metadata_version}
                    onChange={(e) => updateField("metadata_version", e.target.value)}
                    placeholder="1.0"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </FormField>
              </div>
            </div>

            {/* Markdown Body */}
            <div className="flex-1 flex flex-col p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Body (Markdown)
              </h3>
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setDirty(true);
                }}
                className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[200px]"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Preview Panel */}
        {(tab === "preview" || tab === "split") && (
          <div className={cn("flex flex-col overflow-y-auto", tab === "split" ? "w-1/2" : "flex-1")}>
            {/* Token Counter */}
            <div className="border-b border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Metadata: ~{metadataTokens} tokens
              </span>
              <span>Instructions: ~{tokenEstimate} tokens</span>
              <span>Lines: {body.split("\n").length}</span>
            </div>

            {/* Validation Results */}
            {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="border-b border-border px-4 py-2 space-y-1">
                {validation.errors.map((e, i) => (
                  <div key={`e-${i}`} className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="font-mono text-[10px]">{e.field}:</span> {e.message}
                  </div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div key={`w-${i}`} className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="font-mono text-[10px]">{w.field}:</span> {w.message}
                  </div>
                ))}
                {validation.valid && validation.warnings.length === 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    All validations passed
                  </div>
                )}
              </div>
            )}

            {/* YAML + Markdown Preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-[11px] font-mono bg-secondary/30 rounded-lg p-3 mb-4 whitespace-pre-wrap text-muted-foreground">
                {generatePreviewYaml()}
              </pre>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Skill Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[420px] rounded-xl border bg-card p-6 shadow-lg">
            <h3 className="text-base font-semibold mb-1">Create New Skill</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Generate a SKILL.md template
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Skill Name</label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="my-skill"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Directory (optional)</label>
                <input
                  type="text"
                  value={newSkillPath}
                  onChange={(e) => setNewSkillPath(e.target.value)}
                  placeholder="Current directory"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowNewDialog(false)}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNew}
                disabled={!newSkillName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  children,
  error,
  warning,
}: {
  label: string;
  children: React.ReactNode;
  error?: DiagnosticItem;
  warning?: DiagnosticItem;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">{label}</label>
      {children}
      {error && (
        <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-1">
          <AlertCircle className="h-2.5 w-2.5" /> {error.message}
        </p>
      )}
      {warning && !error && (
        <p className="text-[10px] text-warning mt-0.5 flex items-center gap-1">
          <AlertTriangle className="h-2.5 w-2.5" /> {warning.message}
        </p>
      )}
    </div>
  );
}
