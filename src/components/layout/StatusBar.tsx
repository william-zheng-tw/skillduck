import { useStore } from "@/hooks/useStore";
import { Terminal, Loader2 } from "lucide-react";
import { useState } from "react";

export function StatusBar() {
  const cliOutput = useStore((s) => s.cliOutput);
  const isLoading = useStore((s) => s.isLoading);
  const [expanded, setExpanded] = useState(false);

  const lastLine = cliOutput[cliOutput.length - 1] || "Ready";

  return (
    <div className="border-t border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Terminal className="h-3 w-3" />
        )}
        <span className="truncate flex-1 text-left font-mono">{lastLine}</span>
        <span className="text-[10px]">
          {expanded ? "Collapse" : "Expand"}
        </span>
      </button>
      {expanded && (
        <div className="max-h-40 overflow-y-auto border-t border-border bg-background px-4 py-2">
          <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
            {cliOutput.length > 0
              ? cliOutput.join("\n")
              : "No output yet."}
          </pre>
        </div>
      )}
    </div>
  );
}
