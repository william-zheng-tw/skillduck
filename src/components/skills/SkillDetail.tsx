import { useState } from "react";
import type { Skill } from "@/types/skills";
import {
  Package,
  Globe,
  FolderOpen,
  Shield,
  Wrench,
  FileText,
  Copy,
  Bot,
  ExternalLink,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SkillDetailProps {
  skill: Skill;
  onRemove?: (skill: Skill) => Promise<void>;
}

export function SkillDetail({ skill, onRemove }: SkillDetailProps) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove(skill);
    } finally {
      setRemoving(false);
      setShowRemoveConfirm(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{skill.name}</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                skill.scope === "global"
                  ? "bg-primary/10 text-primary"
                  : "bg-success/10 text-success"
              }`}
            >
              {skill.scope === "global" ? (
                <Globe className="h-3 w-3" />
              ) : (
                <FolderOpen className="h-3 w-3" />
              )}
              {skill.scope}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{skill.description}</p>
        </div>
        {onRemove && (
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/20 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        )}
      </div>

      {/* Remove Confirmation Dialog */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[420px] rounded-xl border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-base font-semibold">Remove Skill</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to remove <strong className="text-foreground">{skill.name}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              This will uninstall it from all agents ({skill.agents.join(", ") || "none detected"}).
              Scope: <strong>{skill.scope}</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                disabled={removing}
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {removing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4">
        {skill.license && (
          <InfoCard icon={Shield} label="License" value={skill.license} />
        )}
        {skill.compatibility && (
          <InfoCard icon={Wrench} label="Compatibility" value={skill.compatibility} />
        )}
        {skill.allowed_tools && (
          <InfoCard icon={Wrench} label="Allowed Tools" value={skill.allowed_tools} />
        )}
        <InfoCard icon={FileText} label="Path" value={skill.install_path} />
      </div>

      {skill.metadata && Object.keys(skill.metadata).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Metadata</h3>
          <div className="rounded-lg border bg-secondary/30 p-3">
            {Object.entries(skill.metadata).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-1 text-xs">
                <span className="text-muted-foreground font-mono">{key}</span>
                <span className="font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {skill.agents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Installed to Agents</h3>
          <div className="flex flex-wrap gap-2">
            {skill.agents.map((agent) => (
              <span
                key={agent}
                className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs"
              >
                <Bot className="h-3 w-3 text-primary" />
                {agent}
              </span>
            ))}
          </div>
        </div>
      )}

      {skill.body && (
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Instructions</h3>
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border bg-card p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{skill.body}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => navigator.clipboard.writeText(`npx skills add ${skill.name}`)}
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent transition-colors"
        >
          <Copy className="h-3 w-3" />
          Copy Install Command
        </button>
        <button
          onClick={() =>
            navigator.clipboard.writeText(skill.install_path)
          }
          className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Copy Path
        </button>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-xs font-mono truncate" title={value}>
        {value}
      </p>
    </div>
  );
}
