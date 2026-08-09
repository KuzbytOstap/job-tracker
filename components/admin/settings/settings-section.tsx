"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AdminErrorState, AdminSkeletonList } from "@/components/admin/admin-state";
import { useAdminSettings } from "@/hooks/use-admin-settings";
import { useUpdateAdminSettings } from "@/hooks/use-update-admin-settings";
import { ApiError } from "@/lib/api";
import { formatExactDateTime } from "@/lib/relative-date";
import type { AiGlobalLimitsDTO } from "@/lib/api-types";

type FieldKey = "vacancyGenerationLimit" | "hrGenerationLimit" | "tokenLimit";

const FIELD_CONFIG: Array<{ key: FieldKey; label: string; description: string }> = [
  { key: "vacancyGenerationLimit", label: "Vacancy generations / day", description: "Default daily limit for vacancy-analysis AI calls." },
  { key: "hrGenerationLimit", label: "HR generations / day", description: "Default daily limit for HR question AI calls." },
  { key: "tokenLimit", label: "Tokens / day", description: "Default daily limit for total AI tokens across both features." },
];

function toValues(limits: AiGlobalLimitsDTO): Record<FieldKey, string> {
  return {
    vacancyGenerationLimit: String(limits.vacancyGenerationLimit),
    hrGenerationLimit: String(limits.hrGenerationLimit),
    tokenLimit: String(limits.tokenLimit),
  };
}

export function SettingsSection() {
  const settingsQuery = useAdminSettings();
  const mutation = useUpdateAdminSettings();
  const [values, setValues] = useState<Record<FieldKey, string> | null>(null);

  useEffect(() => {
    if (settingsQuery.data && values === null) {
      setValues(toValues(settingsQuery.data));
    }
  }, [settingsQuery.data, values]);

  if (settingsQuery.isError) {
    return <AdminErrorState message="We couldn't load global settings." onRetry={() => settingsQuery.refetch()} />;
  }

  if (settingsQuery.isPending || !values) {
    return <AdminSkeletonList rows={3} />;
  }

  const limits = settingsQuery.data;
  const invalidFields = FIELD_CONFIG.filter(({ key }) => {
    const parsed = Number(values[key]);
    return values[key].trim() === "" || !Number.isInteger(parsed) || parsed < 0;
  });
  const isDirty = FIELD_CONFIG.some(({ key }) => Number(values[key]) !== limits[key]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (invalidFields.length > 0 || mutation.isPending || !values) return;

    mutation.mutate(
      {
        vacancyGenerationLimit: Number(values.vacancyGenerationLimit),
        hrGenerationLimit: Number(values.hrGenerationLimit),
        tokenLimit: Number(values.tokenLimit),
      },
      {
        onSuccess: (updated) => {
          toast.success("Global defaults updated");
          setValues(toValues(updated));
        },
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : "Couldn't update settings. Try again."),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="gh-form-surface flex max-w-lg flex-col gap-5">
      {FIELD_CONFIG.map(({ key, label, description }) => {
        const raw = values[key].trim();
        const isInvalid = raw === "" || !Number.isInteger(Number(raw)) || Number(raw) < 0;
        return (
          <Field key={key} data-invalid={isInvalid}>
            <FieldLabel htmlFor={`settings-${key}`}>{label}</FieldLabel>
            <Input
              id={`settings-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={values[key]}
              aria-invalid={isInvalid}
              onChange={(event) => setValues((prev) => (prev ? { ...prev, [key]: event.target.value } : prev))}
            />
            <p className="text-xs text-[var(--gh-text-muted)]">{description}</p>
          </Field>
        );
      })}

      <div className="flex flex-col gap-3 border-t border-[var(--gh-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--gh-text-muted)]">Last updated {formatExactDateTime(limits.updatedAt)}</p>
        <Button
          type="submit"
          disabled={!isDirty || invalidFields.length > 0 || mutation.isPending}
          aria-busy={mutation.isPending}
          className="self-start sm:self-auto"
        >
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
