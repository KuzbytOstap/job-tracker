"use client";

import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useUpdateApplication } from "@/hooks/use-update-application";
import type { ApplicationDTO } from "@/lib/api-types";

type TestTaskControlsProps = {
  application: ApplicationDTO;
};

export function TestTaskControls({ application }: TestTaskControlsProps) {
  const mutation = useUpdateApplication(application.id);

  function handleHasTestTaskChange(checked: boolean) {
    mutation.mutate(
      { hasTestTask: checked },
      { onSuccess: () => toast.success(checked ? "Test task added" : "Test task removed") },
    );
  }

  function handleTestTaskDoneChange(checked: boolean) {
    mutation.mutate(
      { testTaskDone: checked },
      { onSuccess: () => toast.success(checked ? "Test task marked done" : "Test task marked pending") },
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Field orientation="horizontal">
        <Checkbox
          id="has-test-task"
          checked={application.hasTestTask}
          disabled={mutation.isPending}
          onCheckedChange={(checked) => handleHasTestTaskChange(checked === true)}
        />
        <FieldLabel htmlFor="has-test-task" className="font-normal">
          A test task exists for this application
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id="test-task-done"
          checked={application.testTaskDone}
          disabled={mutation.isPending || !application.hasTestTask}
          onCheckedChange={(checked) => handleTestTaskDoneChange(checked === true)}
        />
        <FieldLabel htmlFor="test-task-done" className="font-normal">
          The test task is complete
        </FieldLabel>
      </Field>
    </div>
  );
}
