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
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { useT } from "@/components/i18n/i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AdminUserDTO, AiGlobalLimitsDTO } from "@/lib/api-types";

type UserLimitsDialogProps = {
  user: AdminUserDTO;
  globalLimits: AiGlobalLimitsDTO | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type FieldKey = "vacancy" | "hr" | "profile" | "coverLetter" | "fitAnalysis" | "tokens";

const FIELD_CONFIG: Array<{ key: FieldKey; labelKey: MessageKey; globalKey: keyof AiGlobalLimitsDTO }> = [
  { key: "vacancy", labelKey: "admin.limits.vacancyField", globalKey: "vacancyGenerationLimit" },
  { key: "hr", labelKey: "admin.limits.hrField", globalKey: "hrGenerationLimit" },
  { key: "profile", labelKey: "admin.limits.profileField", globalKey: "profileGenerationLimit" },
  { key: "coverLetter", labelKey: "admin.limits.coverLetterField", globalKey: "coverLetterGenerationLimit" },
  { key: "fitAnalysis", labelKey: "admin.limits.fitAnalysisField", globalKey: "fitAnalysisGenerationLimit" },
  { key: "tokens", labelKey: "admin.limits.tokensField", globalKey: "tokenLimit" },
];

function toInputValue(value: number | null): string {
  return value === null ? "" : String(value);
}

export function UserLimitsDialog({ user, globalLimits, open, onOpenChange }: UserLimitsDialogProps) {
  const t = useT();
  const [values, setValues] = useState<Record<FieldKey, string>>({
    vacancy: toInputValue(user.overrides.vacancy),
    hr: toInputValue(user.overrides.hr),
    profile: toInputValue(user.overrides.profile),
    coverLetter: toInputValue(user.overrides.coverLetter),
    fitAnalysis: toInputValue(user.overrides.fitAnalysis),
    tokens: toInputValue(user.overrides.tokens),
  });
  const mutation = useSetAdminUserLimits();

  function handleOpenChange(next: boolean) {
    if (!next) {
      setValues({
        vacancy: toInputValue(user.overrides.vacancy),
        hr: toInputValue(user.overrides.hr),
        profile: toInputValue(user.overrides.profile),
        coverLetter: toInputValue(user.overrides.coverLetter),
        fitAnalysis: toInputValue(user.overrides.fitAnalysis),
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
        profileGenerationLimit: values.profile.trim() === "" ? null : Number(values.profile),
        coverLetterGenerationLimit: values.coverLetter.trim() === "" ? null : Number(values.coverLetter),
        fitAnalysisGenerationLimit: values.fitAnalysis.trim() === "" ? null : Number(values.fitAnalysis),
        tokenLimit: values.tokens.trim() === "" ? null : Number(values.tokens),
      },
      {
        onSuccess: () => {
          toast.success(t("admin.limits.updated"));
          onOpenChange(false);
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "admin.limits.updateFailed")),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.limits.title")}</DialogTitle>
          <DialogDescription>
            {t("admin.limits.description", { user: user.name ?? user.email ?? t("admin.users.thisUser") })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {FIELD_CONFIG.map(({ key, labelKey, globalKey }) => {
            const raw = values[key].trim();
            const isInvalid = raw !== "" && (!Number.isInteger(Number(raw)) || Number(raw) < 0);
            return (
              <Field key={key} data-invalid={isInvalid}>
                <FieldLabel htmlFor={`limit-${key}`}>{t(labelKey)}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id={`limit-${key}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder={
                      globalLimits
                        ? t("admin.limits.placeholder", { value: globalLimits[globalKey] as number })
                        : t("admin.limits.placeholderEmpty")
                    }
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
                      {t("admin.limits.useDefault")}
                    </Button>
                  )}
                </div>
              </Field>
            );
          })}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
              {t("common.cancel")}
            </DialogClose>
            <Button
              type="submit"
              disabled={invalidFields.length > 0 || mutation.isPending}
              aria-busy={mutation.isPending}
            >
              {mutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
