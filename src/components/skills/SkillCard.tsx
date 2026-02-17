import type { Skill } from "@/types/skills";
import { cn } from "@/lib/utils";
import { Package, Globe, FolderOpen, ArrowUpCircle, Bot } from "lucide-react";

interface SkillCardProps {
  skill: Skill;
  isSelected: boolean;
  onClick: () => void;
}

export function SkillCard({ skill, isSelected, onClick }: SkillCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-4 transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <h3 className="font-medium text-sm">{skill.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          {skill.scope === "global" ? (
            <span title="Global"><Globe className="h-3 w-3 text-muted-foreground" /></span>
          ) : (
            <span title="Project"><FolderOpen className="h-3 w-3 text-muted-foreground" /></span>
          )}
          {skill.has_update && (
            <span title="Update available"><ArrowUpCircle className="h-3 w-3 text-warning" /></span>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
        {skill.description}
      </p>
      {skill.agents.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {skill.agents.slice(0, 4).map((agent) => (
            <span
              key={agent}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
            >
              <Bot className="h-2.5 w-2.5" />
              {agent}
            </span>
          ))}
          {skill.agents.length > 4 && (
            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
              +{skill.agents.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
