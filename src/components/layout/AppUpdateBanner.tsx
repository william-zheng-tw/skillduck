import { useAppUpdate } from "@/hooks/useAppUpdate";

export function AppUpdateBanner() {
  const { appUpdate, appUpdateInstalling, installUpdate, dismissUpdate } = useAppUpdate();

  if (!appUpdate) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-blue-600 px-4 py-1.5 text-sm text-white">
      <span className="truncate">
        Update available: <strong>v{appUpdate.version}</strong>
        {appUpdate.body ? ` — ${appUpdate.body}` : ""}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={installUpdate}
          disabled={appUpdateInstalling}
          className="rounded bg-white px-2.5 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          {appUpdateInstalling ? "Installing…" : "Install & Restart"}
        </button>
        <button
          onClick={dismissUpdate}
          disabled={appUpdateInstalling}
          aria-label="Dismiss update"
          className="text-white/70 hover:text-white disabled:opacity-40"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
