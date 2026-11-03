"use client";

import { useState } from "react";
import { SearchX, Users as UsersIcon } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSkeletonList } from "@/components/admin/admin-state";
import { UserRow } from "@/components/admin/users/user-row";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useAdminSettings } from "@/hooks/use-admin-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useT } from "@/components/i18n/i18n-provider";

export function UsersSection() {
  const t = useT();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const usersQuery = useAdminUsers();
  const settingsQuery = useAdminSettings();

  if (usersQuery.isPending) {
    return <AdminSkeletonList rows={5} />;
  }

  if (usersQuery.isError) {
    return <AdminErrorState message={t("admin.users.loadFailed")} onRetry={() => usersQuery.refetch()} />;
  }

  const query = debouncedSearch.trim().toLowerCase();
  const users = query
    ? usersQuery.data.users.filter(
        (user) =>
          user.name?.toLowerCase().includes(query) || user.email?.toLowerCase().includes(query),
      )
    : usersQuery.data.users;

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder={t("admin.users.searchPlaceholder")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="gh-list-control-input max-w-sm"
        aria-label={t("admin.users.searchLabel")}
      />

      {users.length === 0 ? (
        <AdminEmptyState
          icon={query ? SearchX : UsersIcon}
          title={query ? t("admin.users.noResults", { query: debouncedSearch }) : t("admin.users.empty")}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--gh-border)] bg-[var(--gh-surface)] shadow-[var(--gh-shadow)]">
          <table className="w-full min-w-[1080px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--gh-border)] bg-[var(--gh-surface-secondary)] text-xs font-semibold tracking-wide text-[var(--gh-text-muted)] uppercase">
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.user")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.aiAccess")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.vacancy")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.hr")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.profile")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.coverLetter")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.fitAnalysis")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.tokens")}</th>
                <th className="px-3 py-2.5 font-semibold">{t("admin.users.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} globalLimits={settingsQuery.data} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
