import { useStore } from "@/hooks/useStore";
import { Terminal, Loader2, Copy, Check } from "lucide-react";
import { useState } from "react";

// Strip ANSI escape sequences and terminal control codes
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").replace(/\x1B\][^\x07]*\x07/g, "").replace(/[\x00-\x09\x0B-\x1F\x7F]/g, "");
}

export function StatusBar() {
  const cliOutput = useStore((s) => s.cliOutput);
  const isLoading = useStore((s) => s.isLoading);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cliOutput.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lastLine =
    [...cliOutput]
      .reverse()
      .flatMap((l) => stripAnsi(l).split("\n").reverse())
      .find((l) => l.trim()) ?? "Ready";

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
        <div className="relative border-t border-border bg-background">
          <button
            onClick={handleCopy}
            title="Copy output"
            className="absolute right-2 top-2 z-10 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          </button>
          <div className="max-h-40 overflow-y-auto px-4 py-2 select-text" style={{ WebkitUserSelect: "text", userSelect: "text" }}>
            <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
              {cliOutput.length > 0
                ? cliOutput.map(stripAnsi).join("\n")
                : "No output yet."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
