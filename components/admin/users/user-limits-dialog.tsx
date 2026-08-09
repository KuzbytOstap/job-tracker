"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSetAdminUserLimits } from "@/hooks/use-set-admin-user-limits";
import { ApiError } from "@/lib/api";
import type { AdminUserDTO, AiGlobalLimitsDTO } from "@/lib/api-types";

type UserLimitsDialogProps = {
  user: AdminUserDTO;
  globalLimits: AiGlobalLimitsDTO | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FieldKey = "vacancy" | "hr" | "tokens";

const FIELD_CONFIG: Array<{ key: FieldKey; label: string; globalKey: keyof AiGlobalLimitsDTO }> = [
  { key: "vacancy", label: "Vacancy generations / day", globalKey: "vacancyGenerationLimit" },
  { key: "hr", label: "HR generations / day", globalKey: "hrGenerationLimit" },
  { key: "tokens", label: "Tokens / day", globalKey: "tokenLimit" },
];

function toInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

export function UserLimitsDialog({ user, globalLimits, open, onOpenChange }: UserLimitsDialogProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    vacancy: toInputValue(user.overrides.vacancy),
    hr: toInputValue(user.overrides.hr),
    tokens: toInputValue(user.overrides.tokens),
  });
  const mutation = useSetAdminUserLimits();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setValues({
        vacancy: toInputValue(user.overrides.vacancy),
        hr: toInputValue(user.overrides.hr),
        tokens: toInputValue(user.overrides.tokens),
      });
    }
    onOpenChange(next);
  }

  const invalidFields = FIELD_CONFIG.filter(({ key }) => {
    const raw = values[key].trim();
    if (raw === "") return false;
    const parsed = Number(raw);
    return !Number.isInteger(parsed) || parsed < 0;
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (invalidFields.length > 0 || mutation.isPending) return;

    mutation.mutate(
      {
        userId: user.id,
        vacancyGenerationLimit: values.vacancy.trim() === "" ? null : Number(values.vacancy),
        hrGenerationLimit: values.hr.trim() === "" ? null : Number(values.hr),
        tokenLimit: values.tokens.trim() === "" ? null : Number(values.tokens),
      },
      {
        onSuccess: () => {
          toast.success("Limits updated");
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't update limits. Try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanent limit overrides</DialogTitle>
          <DialogDescription>
            {user.name ?? user.email ?? "This user"} — leave a field empty to fall back to the global default.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {FIELD_CONFIG.map(({ key, label, globalKey }) => {
            const raw = values[key].trim();
            const isInvalid = raw !== "" && (!Number.isInteger(Number(raw)) || Number(raw) < 0);
            return (
              <Field key={key} data-invalid={isInvalid}>
                <FieldLabel htmlFor={`limit-${key}`}>{label}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id={`limit-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder={globalLimits ? `Default: ${globalLimits[globalKey]}` : "Default"}
                    value={values[key]}
                    aria-invalid={isInvalid}
                    onChange={(event) => setValues((prev) => ({ ...prev, [key]: event.target.value }))}
                  />
                  {values[key] !== "" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValues((prev) => ({ ...prev, [key]: "" }))}
                    >
                      Use default
                    </Button>
                  )}
                </div>
              </Field>
            );
          })}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={invalidFields.length > 0 || mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
