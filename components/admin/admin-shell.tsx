"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AdminHeader } from "@/components/admin/admin-header";
import { RequestsSection } from "@/components/admin/requests/requests-section";
import { UsersSection } from "@/components/admin/users/users-section";
import { SettingsSection } from "@/components/admin/settings/settings-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAdminAiRequests } from "@/hooks/use-admin-ai-requests";

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const;

export function AdminShell() {
  const [tab, setTab] = useState<string>("requests");
  const reducedMotion = useReducedMotion();
  const requestsQuery = useAdminAiRequests();
  const pendingCount = requestsQuery.data?.requests.filter((request) => request.status === "PENDING").length ?? 0;

  return (
    <div data-job-tracker-theme="game-hub" className="relative min-h-screen bg-[var(--gh-bg)]">
      <AdminHeader />
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: ENTRANCE_EASE, delay: reducedMotion ? 0 : 0.04 }}
        className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-16 sm:px-6"
      >
        <Tabs value={tab} onValueChange={(value) => setTab(value as string)}>
          <TabsList className="mb-6 bg-[var(--gh-surface-secondary)]">
            <TabsTrigger value="requests" className="gap-1.5">
              Requests
              {pendingCount > 0 && (
                <Badge className="h-4 min-w-4 justify-center bg-[var(--gh-accent)] px-1 text-[10px] text-[oklch(0.99_0.01_85)]">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="requests">
            <RequestsSection />
          </TabsContent>
          <TabsContent value="users">
            <UsersSection />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsSection />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
