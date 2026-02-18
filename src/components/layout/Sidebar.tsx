import { cn } from "@/lib/utils";
import { useStore } from "@/hooks/useStore";
import {
  Boxes,
  Compass,
  Bot,
  Settings,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "skills", label: "My Skills", icon: Boxes },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "agents", label: "Agent Skills", icon: Bot },
  // { id: "editor", label: "Editor", icon: FileEdit },
  // { id: "sandbox", label: "Sandbox", icon: FlaskConical },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const currentPage = useStore((s) => s.currentPage);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const skills = useStore((s) => s.skills);
  const agents = useStore((s) => s.agents);

  const detectedAgents = agents.filter((a) => a.detected).length;

  return (
    <aside className="flex h-full w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div data-tauri-drag-region className="flex items-center gap-2 border-b border-sidebar-border px-4 pt-8 pb-4">
        <Boxes className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-sm font-bold leading-tight">Skill</h1>
          <p className="text-[10px] text-muted-foreground">Duck</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {item.id === "skills" && skills.length > 0 && (
                <span className="ml-auto text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {skills.length}
                </span>
              )}
              {item.id === "agents" && detectedAgents > 0 && (
                <span className="ml-auto text-[10px] font-medium bg-success/10 text-success px-1.5 py-0.5 rounded-full">
                  {detectedAgents}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-muted-foreground">
          {skills.length} skills installed
        </p>
        <p className="text-[10px] text-muted-foreground">
          {detectedAgents} agents detected
        </p>
      </div>
    </aside>
  );
}
