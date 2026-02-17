import { Shell } from "@/components/layout/Shell";
import { useStore } from "@/hooks/useStore";
import { SkillsPage } from "@/pages/SkillsPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { EditorPage } from "@/pages/EditorPage";
import { SandboxPage } from "@/pages/SandboxPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageRouter() {
  const currentPage = useStore((s) => s.currentPage);

  switch (currentPage) {
    case "skills":
      return <SkillsPage />;
    case "explore":
      return <ExplorePage />;
    case "agents":
      return <AgentsPage />;
    case "editor":
      return <EditorPage />;
    case "sandbox":
      return <SandboxPage />;
    case "settings":
      return <SettingsPage />;
    default:
      return <SkillsPage />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Shell>
        <PageRouter />
      </Shell>
    </QueryClientProvider>
  );
}

export default App;
