import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateContextCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.contextItems() });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.cvUpdateHint() });
}

export function invalidateCvCaches(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.cvs() });
  invalidateContextCaches(queryClient);
}
