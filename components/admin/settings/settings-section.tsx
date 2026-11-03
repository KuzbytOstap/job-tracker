"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AdminErrorState, AdminSkeletonList } from "@/components/admin/admin-state";
import { useAdminSettings } from "@/hooks/use-admin-settings";
import { useUpdateAdminSettings } from "@/hooks/use-update-admin-settings";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { formatExactDateTime } from "@/lib/relative-date";
import { useI18n } from "@/components/i18n/i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AiGlobalLimitsDTO } from "@/lib/api-types";

type FieldKey =
  | "vacancyGenerationLimit"
  | "hrGenerationLimit"
  | "profileGenerationLimit"
  | "coverLetterGenerationLimit"
  | "tokenLimit";

const FIELD_CONFIG: Array<{ key: FieldKey; labelKey: MessageKey; descriptionKey: MessageKey }> = [
  { key: "vacancyGenerationLimit", labelKey: "admin.limits.vacancyField", descriptionKey: "admin.settings.vacancyDescription" },
  { key: "hrGenerationLimit", labelKey: "admin.limits.hrField", descriptionKey: "admin.settings.hrDescription" },
  { key: "profileGenerationLimit", labelKey: "admin.limits.profileField", descriptionKey: "admin.settings.profileDescription" },
  {
    key: "coverLetterGenerationLimit",
    labelKey: "admin.limits.coverLetterField",
    descriptionKey: "admin.settings.coverLetterDescription",
  },
  { key: "tokenLimit", labelKey: "admin.limits.tokensField", descriptionKey: "admin.settings.tokensDescription" },
];

function toValues(limits: AiGlobalLimitsDTO): Record<FieldKey, string> {
  return {
    vacancyGenerationLimit: String(limits.vacancyGenerationLimit),
    hrGenerationLimit: String(limits.hrGenerationLimit),
    profileGenerationLimit: String(limits.profileGenerationLimit),
    coverLetterGenerationLimit: String(limits.coverLetterGenerationLimit),
    tokenLimit: String(limits.tokenLimit),
  };
}

export function SettingsSection() {
  const { t, locale } = useI18n();
  const settingsQuery = useAdminSettings();
  const mutation = useUpdateAdminSettings();
  const [values, setValues] = useState<Record<FieldKey, string> | null>(null);

  useEffect(() => {
    if (settingsQuery.data && values === null) {
      setValues(toValues(settingsQuery.data));
    }
  }, [settingsQuery.data, values]);

  if (settingsQuery.isError) {
    return <AdminErrorState message={t("admin.settings.loadFailed")} onRetry={() => settingsQuery.refetch()} />;
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
        profileGenerationLimit: Number(values.profileGenerationLimit),
        coverLetterGenerationLimit: Number(values.coverLetterGenerationLimit),
        tokenLimit: Number(values.tokenLimit),
      },
      {
        onSuccess: (updated) => {
          toast.success(t("admin.settings.updated"));
          setValues(toValues(updated));
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.settings.updateFailed")),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="gh-form-surface flex max-w-lg flex-col gap-5">
      {FIELD_CONFIG.map(({ key, labelKey, descriptionKey }) => {
        const raw = values[key].trim();
        const isInvalid = raw === "" || !Number.isInteger(Number(raw)) || Number(raw) < 0;
        return (
          <Field key={key} data-invalid={isInvalid}>
            <FieldLabel htmlFor={`settings-${key}`}>{t(labelKey)}</FieldLabel>
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
            <p className="text-xs text-[var(--gh-text-muted)]">{t(descriptionKey)}</p>
          </Field>
        );
      })}

      <div className="flex flex-col gap-3 border-t border-[var(--gh-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--gh-text-muted)]">{t("admin.settings.lastUpdated", { when: formatExactDateTime(limits.updatedAt, { t, locale }) })}</p>
        <Button
          type="submit"
          disabled={!isDirty || invalidFields.length > 0 || mutation.isPending}
          aria-busy={mutation.isPending}
          className="self-start sm:self-auto"
        >
          {mutation.isPending ? t("common.saving") : t("form.actions.saveChanges")}
        </Button>
      </div>
    </form>
  );
}
