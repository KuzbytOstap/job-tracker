import { getAdminCheckForRequest } from "@/lib/admin/require-admin";
import { PipelineConsoleShell } from "@/components/console/pipeline-console-shell";
import { PipelineNavigationRail } from "@/components/console/pipeline-navigation-rail";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminCheckForRequest();

  return (
    <div
      data-job-tracker-theme="game-hub"
      className="relative min-h-screen overflow-x-clip bg-background sm:bg-[var(--gh-bg)]"
    >
      <PipelineConsoleShell rail={<PipelineNavigationRail isAdmin={admin.status === "authorized"} />}>
        {children}
      </PipelineConsoleShell>
    </div>
  );
}
