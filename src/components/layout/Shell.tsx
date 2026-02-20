import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { AppUpdateBanner } from "./AppUpdateBanner";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div data-tauri-drag-region className="h-8 shrink-0" />
        <AppUpdateBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}
