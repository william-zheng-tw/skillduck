import { useState } from "react";
import { useStore } from "@/hooks/useStore";
import { cliAddSkill } from "@/lib/tauri";
import { cn } from "@/lib/utils";
import {
  Search,
  TrendingUp,
  Clock,
  Flame,
  Download,
  Loader2,
  ExternalLink,
  Package,
} from "lucide-react";

interface ExploreSkill {
  name: string;
  description: string;
  source: string;
  author?: string;
  installs?: number;
}

type SortMode = "trending" | "popular" | "recent";

const FEATURED_SKILLS: ExploreSkill[] = [
  {
    name: "react-best-practices",
    description: "40+ optimization rules for React applications including hooks, memoization, and performance patterns.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 12500,
  },
  {
    name: "web-design-guidelines",
    description: "100+ accessibility and UX rules for modern web applications.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 9800,
  },
  {
    name: "frontend-design",
    description: "Comprehensive frontend design patterns and best practices for scalable applications.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 8200,
  },
  {
    name: "composition-patterns",
    description: "Scalable component architecture patterns including compound components, render props, and hooks.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 6100,
  },
  {
    name: "react-native-guidelines",
    description: "Mobile performance patterns and best practices for React Native applications.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 4500,
  },
  {
    name: "vercel-deploy-claimable",
    description: "Direct deployment capabilities for Vercel platform with claimable URLs.",
    source: "vercel-labs/agent-skills",
    author: "vercel-labs",
    installs: 3200,
  },
];

export function ExplorePage() {
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const setIsLoading = useStore((s) => s.setIsLoading);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [installing, setInstalling] = useState<string | null>(null);

  const filteredSkills = FEATURED_SKILLS.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortMode === "popular") return (b.installs ?? 0) - (a.installs ?? 0);
    return 0;
  });

  const handleInstall = async (skill: ExploreSkill) => {
    setInstalling(skill.name);
    setIsLoading(true);
    try {
      const result = await cliAddSkill(skill.source, [], [skill.name], false);
      appendCliOutput(result.stdout);
      if (result.stderr) appendCliOutput(result.stderr);
      appendCliOutput(`Successfully installed ${skill.name}`);
    } catch (err) {
      appendCliOutput(`Error installing ${skill.name}: ${err}`);
    } finally {
      setInstalling(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Explore Skills</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Discover and install skills from the community
          </p>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1">
            {([
              { id: "popular", icon: TrendingUp, label: "Popular" },
              { id: "trending", icon: Flame, label: "Trending" },
              { id: "recent", icon: Clock, label: "Recent" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSortMode(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
                  sortMode === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.name}
              className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">{skill.name}</h3>
                </div>
                {skill.installs && (
                  <span className="text-[10px] text-muted-foreground">
                    {skill.installs.toLocaleString()} installs
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                {skill.description}
              </p>
              {skill.author && (
                <p className="mt-2 text-[10px] text-muted-foreground font-mono">
                  by {skill.author}
                </p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleInstall(skill)}
                  disabled={installing === skill.name}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {installing === skill.name ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Install
                </button>
                <a
                  href={`https://skills.sh`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
              </div>
            </div>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              No skills match your search
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <a
            href="https://skills.sh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Browse all 62,000+ skills on skills.sh
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
