import { Status } from "@/app/generated/prisma/enums";
import { isForwardPipelineMove } from "@/lib/status-transitions";

export type DropDecision = "noop" | "immediate" | "confirm";

type DropDecisionSource = {
  status: Status;
  effectiveStatus: Status;
};

/**
 * Decides what a drag-and-drop move should do without touching the network or
 * cache. Direction (forward/backward) is judged from the stored status, not the
 * effective one, so an auto-ignored card dragged out of IGNORED is treated as a
 * normal transition from whatever status it actually holds.
 */
export function decideDropTransition(
  application: DropDecisionSource,
  targetStatus: Status,
): DropDecision {
  if (targetStatus === application.effectiveStatus) return "noop";
  if (targetStatus === Status.REJECTED || targetStatus === Status.IGNORED) return "confirm";
  if (!isForwardPipelineMove(application.status, targetStatus)) return "confirm";
  return "immediate";
}
