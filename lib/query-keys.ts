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
  autoIgnoreSettings: () => ["settings", "auto-ignore"] as const,
  platforms: () => ["platforms"] as const,
  aiAccess: () => ["ai-access"] as const,
  aiUsage: () => ["ai-usage"] as const,
  profile: {
    root: () => ["profile"] as const,
    detail: () => ["profile", "detail"] as const,
    cvs: () => ["profile", "cvs"] as const,
    contextItems: () => ["profile", "context-items"] as const,
    cvUpdateHint: () => ["profile", "cv-update-hint"] as const,
    examples: () => ["profile", "examples"] as const,
  },
  admin: {
    aiRequests: () => ["admin", "ai-requests"] as const,
    users: () => ["admin", "users"] as const,
    settings: () => ["admin", "settings"] as const,
    platformProposals: () => ["admin", "platform-proposals"] as const,
  },
};
