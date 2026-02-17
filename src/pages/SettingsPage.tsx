import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "@/lib/tauri";
import type { Settings } from "@/types/skills";
import { FolderOpen, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { cn } from "@/lib/utils";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await getSettings();
      setSettings(result);
    } catch (err) {
      console.error("Failed to load settings:", err);
      setSettings({ scan_roots: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings(settings);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(`Failed to save settings: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  const addScanRoot = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: "Select directory to scan",
    });

    if (selected && typeof selected === "string") {
      setSettings((prev) => {
        if (!prev) return { scan_roots: [selected] };
        if (prev.scan_roots.includes(selected)) return prev;
        return { ...prev, scan_roots: [...prev.scan_roots, selected] };
      });
    }
  };

  const removeScanRoot = (index: number) => {
    setSettings((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        scan_roots: prev.scan_roots.filter((_, i) => i !== index),
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure project scanning and other preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Scan Roots Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Project Scan Directories</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Directories to scan for agent projects
              </p>
            </div>
            <button
              onClick={addScanRoot}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Directory
            </button>
          </div>

          {settings && settings.scan_roots.length > 0 ? (
            <div className="space-y-2">
              {settings.scan_roots.map((root, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded border bg-card px-3 py-2"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <code className="flex-1 text-xs font-mono">{root}</code>
                  <button
                    onClick={() => removeScanRoot(index)}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No scan directories configured. Add directories to scan for agent
              projects.
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex-1">
            {message && (
              <p
                className={cn(
                  "text-xs",
                  message.includes("success")
                    ? "text-success"
                    : "text-destructive"
                )}
              >
                {message}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !settings}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
