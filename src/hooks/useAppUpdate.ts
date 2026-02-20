import { useEffect } from "react";
import { useStore } from "./useStore";
import { checkForAppUpdate, installAppUpdate } from "@/lib/tauri";

export function useAppUpdate() {
  const appUpdate = useStore((s) => s.appUpdate);
  const appUpdateChecking = useStore((s) => s.appUpdateChecking);
  const appUpdateInstalling = useStore((s) => s.appUpdateInstalling);
  const setAppUpdate = useStore((s) => s.setAppUpdate);
  const setAppUpdateChecking = useStore((s) => s.setAppUpdateChecking);
  const setAppUpdateInstalling = useStore((s) => s.setAppUpdateInstalling);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAppUpdateChecking(true);
      try {
        const update = await checkForAppUpdate();
        if (!cancelled) setAppUpdate(update);
      } catch {
        // silently fail — expected in dev / offline
      } finally {
        if (!cancelled) setAppUpdateChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const installUpdate = async () => {
    setAppUpdateInstalling(true);
    try {
      await installAppUpdate();
    } catch {
      setAppUpdateInstalling(false);
    }
  };

  const dismissUpdate = () => setAppUpdate(null);

  return { appUpdate, appUpdateChecking, appUpdateInstalling, installUpdate, dismissUpdate };
}
