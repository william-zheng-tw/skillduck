import { useState, useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { cliAddSkill, searchSkills, type SkillSearchResult } from "@/lib/tauri";
import {
  Search,
  Download,
  Loader2,
  ExternalLink,
  Package,
  AlertCircle,
} from "lucide-react";

export function ExplorePage() {
  const appendCliOutput = useStore((s) => s.appendCliOutput);
  const setIsLoading = useStore((s) => s.setIsLoading);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SkillSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  // Debounced search effect
  useEffect(() => {
    const trimmedSearch = search.trim();
    
    if (trimmedSearch.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch(trimmedSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = async (query: string) => {
    setSearching(true);
    setError(null);
    try {
      const response = await searchSkills(query, 20);
      setResults(response.skills);
    } catch (err) {
      setError(`Failed to search: ${err}`);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleInstall = async (skill: SkillSearchResult) => {
    setInstalling(skill.skillId);
    setIsLoading(true);
    try {
      const result = await cliAddSkill({
        source: skill.source,
        agents: [],
        skills: [skill.skillId],
        global: false,
        listOnly: false,
        all: false,
      });
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

  const handleRetry = () => {
    if (search.trim().length >= 2) {
      handleSearch(search.trim());
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Explore Skills</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search and discover skills from skills.sh
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills (min. 2 characters)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive font-medium">Search failed</p>
                <p className="text-xs text-destructive/80 mt-1">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="rounded-md border border-destructive px-3 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Skills Grid */}
        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {results.map((skill) => (
              <div
                key={skill.id}
                className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">{skill.name}</h3>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {skill.installs.toLocaleString()} installs
                  </span>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground font-mono">
                  {skill.source}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleInstall(skill)}
                    disabled={installing === skill.skillId}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {installing === skill.skillId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Install
                  </button>
                  <a
                    href={`https://skills.sh/${skill.id}`}
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
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {search.trim().length < 2
                ? "Enter a search term to find skills (min. 2 characters)"
                : searching
                ? "Searching..."
                : `No skills found for "${search}"`}
            </p>
          </div>
        )}

        {/* Footer */}
        {results.length > 0 && (
          <div className="mt-8 text-center">
            <a
              href="https://skills.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              Browse more skills on skills.sh
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
