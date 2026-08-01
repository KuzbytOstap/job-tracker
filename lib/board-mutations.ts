import { updateApplication } from "@/lib/api";
import { resolveMoveStatusPayload } from "@/lib/status-transitions";
import type { ApplicationDTO } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

export function moveApplicationToStatus(
  applicationId: string,
  targetStatus: Status,
  expectedUpdatedAt?: string,
): Promise<ApplicationDTO> {
  return updateApplication(applicationId, {
    ...resolveMoveStatusPayload(targetStatus),
    expectedUpdatedAt,
  });
}
