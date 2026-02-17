import { useStore } from "@/hooks/useStore";
import { Settings, Terminal, Info, ExternalLink } from "lucide-react";

export function SettingsPage() {
  const cliOutput = useStore((s) => s.cliOutput);
  const clearCliOutput = useStore((s) => s.clearCliOutput);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Settings</h2>
        </div>

        <div className="space-y-6">
          {/* About */}
          <section className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              About Skills Dashboard
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                Visual GUI for managing Agent Skills following the{" "}
                <a
                  href="https://agentskills.io/specification"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  agentskills.io specification
                </a>
                .
              </p>
              <p>
                Built on{" "}
                <a
                  href="https://github.com/vercel-labs/skills"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  vercel-labs/skills
                </a>{" "}
                CLI.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="bg-secondary px-2 py-1 rounded text-[10px] font-mono">v0.1.0</span>
                <span className="bg-secondary px-2 py-1 rounded text-[10px] font-mono">Tauri 2.0</span>
                <span className="bg-secondary px-2 py-1 rounded text-[10px] font-mono">React 19</span>
              </div>
            </div>
          </section>

          {/* Links */}
          <section className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-primary" />
              Resources
            </h3>
            <div className="space-y-2">
              {[
                { label: "Agent Skills Specification", url: "https://agentskills.io" },
                { label: "Skills Directory", url: "https://skills.sh" },
                { label: "vercel-labs/skills CLI", url: "https://github.com/vercel-labs/skills" },
                { label: "vercel-labs/agent-skills", url: "https://github.com/vercel-labs/agent-skills" },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </a>
              ))}
            </div>
          </section>

          {/* CLI Output Log */}
          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                CLI Output Log
              </h3>
              <button
                onClick={clearCliOutput}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>
            <pre className="max-h-60 overflow-y-auto rounded-lg bg-secondary/30 p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
              {cliOutput.length > 0 ? cliOutput.join("\n") : "No output yet."}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
