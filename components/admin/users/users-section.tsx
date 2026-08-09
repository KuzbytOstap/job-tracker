"use client";

import { useState } from "react";
import { SearchX, Users as UsersIcon } from "lucide-react";
import { AdminEmptyState, AdminErrorState, AdminSkeletonList } from "@/components/admin/admin-state";
import { UserRow } from "@/components/admin/users/user-row";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useAdminSettings } from "@/hooks/use-admin-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function UsersSection() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const usersQuery = useAdminUsers();
  const settingsQuery = useAdminSettings();

  if (usersQuery.isPending) {
    return <AdminSkeletonList rows={5} />;
  }

  if (usersQuery.isError) {
    return <AdminErrorState message="We couldn't load users." onRetry={() => usersQuery.refetch()} />;
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
        placeholder="Search by name or email…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="gh-list-control-input max-w-sm"
        aria-label="Search users"
      />

      {users.length === 0 ? (
        <AdminEmptyState
          icon={query ? SearchX : UsersIcon}
          title={query ? `No results for "${debouncedSearch}"` : "No users yet"}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--gh-border)] bg-[var(--gh-surface)] shadow-[var(--gh-shadow)]">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--gh-border)] bg-[var(--gh-surface-secondary)] text-xs font-semibold tracking-wide text-[var(--gh-text-muted)] uppercase">
                <th className="px-3 py-2.5 font-semibold">User</th>
                <th className="px-3 py-2.5 font-semibold">AI access</th>
                <th className="px-3 py-2.5 font-semibold">Vacancy</th>
                <th className="px-3 py-2.5 font-semibold">HR</th>
                <th className="px-3 py-2.5 font-semibold">Tokens</th>
                <th className="px-3 py-2.5 font-semibold">Actions</th>
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
