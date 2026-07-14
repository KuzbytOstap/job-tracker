import { updateApplication } from "@/lib/api";
import type { ApplicationDTO } from "@/lib/api-types";
import type { Status } from "@/app/generated/prisma/enums";

export function moveApplicationToStatus(
  applicationId: string,
  targetStatus: Status,
): Promise<ApplicationDTO> {
  return updateApplication(applicationId, { status: targetStatus });
}
