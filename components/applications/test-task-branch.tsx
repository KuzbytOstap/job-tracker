"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMoveApplicationToStatus } from "@/hooks/use-move-application-to-status";
import { STATUS_LABELS } from "@/lib/labels";
import { TEST_TASK_RETURN_STATUS, canEnterTestTaskFrom } from "@/lib/status-transitions";
import { Status } from "@/app/generated/prisma/enums";
import type { ApplicationDTO } from "@/lib/api-types";

type TestTaskBranchProps = {
  application: ApplicationDTO;
};

/**
 * TEST_TASK sits outside the linear pipeline. It's reachable from HR_CALL or
 * TECH_INTERVIEW, and from there it's meant to be quick to leave — either back
 * to Tech interview or forward to Offer — so these actions skip confirmation.
 */
export function TestTaskBranch({ application }: TestTaskBranchProps) {
  const moveMutation = useMoveApplicationToStatus();

  const canEnter = canEnterTestTaskFrom(application.status);
  const isInTestTask = application.status === Status.TEST_TASK;

  if (!canEnter && !isInTestTask) {
    return null;
  }

  function move(target: Status) {
    moveMutation.mutate(
      { applicationId: application.id, targetStatus: target },
      { onSuccess: () => toast.success(`Moved to ${STATUS_LABELS[target]}`) },
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-amber-300/70 bg-amber-50/50 p-3 dark:border-amber-400/25 dark:bg-amber-400/5">
      <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-300">Test task branch</p>
      {isInTestTask ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={moveMutation.isPending}
            onClick={() => move(TEST_TASK_RETURN_STATUS)}
          >
            Return to Tech interview
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={moveMutation.isPending}
            onClick={() => move(Status.OFFER)}
          >
            Continue to Offer
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={moveMutation.isPending}
          onClick={() => move(Status.TEST_TASK)}
        >
          Move to test task
        </Button>
      )}
    </div>
  );
}
