import type { SortOption, StatusFilter } from "@/lib/validation";

export type ApplicationsListParams = {
  status: StatusFilter;
  sort: SortOption;
  q: string;
};

export const queryKeys = {
  applications: {
    root: () => ["applications"] as const,
    lists: () => ["applications", "list"] as const,
    list: (params: ApplicationsListParams) =>
      ["applications", "list", params.status, params.sort, params.q] as const,
    details: () => ["applications", "detail"] as const,
    detail: (id: string) => ["applications", "detail", id] as const,
  },
  stats: () => ["stats"] as const,
  aiAccess: () => ["ai-access"] as const,
  aiUsage: () => ["ai-usage"] as const,
  admin: {
    aiRequests: () => ["admin", "ai-requests"] as const,
    users: () => ["admin", "users"] as const,
    settings: () => ["admin", "settings"] as const,
  },
};
