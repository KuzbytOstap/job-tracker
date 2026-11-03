"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { CoverLetterExamples } from "@/components/profile/cover-letter-examples";
import { ProfileSection } from "@/components/profile/profile-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { ProfileDTO } from "@/lib/api-types";
import { COVER_LETTER_PROMPT_MAX_LENGTH } from "@/lib/profile/limits";
import { promptToPayload } from "@/lib/profile/profile-form";

export function CoverLetterSection({ profile }: { profile: ProfileDTO }) {
  const t = useT();
  const mutation = useUpdateProfile();
  const savedValue = profile.coverLetterPrompt ?? profile.defaultCoverLetterPrompt;
  const [value, setValue] = useState(savedValue);
  const isDefault = profile.coverLetterPrompt === null;
  const isDirty = value !== savedValue;

  useEffect(() => {
    setValue(savedValue);
  }, [savedValue]);

  function save(next: string | null) {
    mutation.mutate(
      { coverLetterPrompt: next },
      {
        onSuccess: () => toast.success(t("profile.letter.promptSaved")),
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.saveFailed")),
      },
    );
  }

  return (
    <ProfileSection title={t("profile.letter.title")}>
      <div className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="profile-cover-letter-prompt">{t("profile.letter.promptLabel")}</FieldLabel>
          <FieldDescription>{t("profile.letter.promptDescription")}</FieldDescription>
          <Textarea
            id="profile-cover-letter-prompt"
            value={value}
            rows={10}
            maxLength={COVER_LETTER_PROMPT_MAX_LENGTH}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-48"
          />
          <p className="text-xs text-[var(--gh-text-muted)]">
            {isDefault && !isDirty ? t("profile.letter.usingDefault") : t("profile.letter.customized")}
          </p>
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--gh-border)] pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={(isDefault && !isDirty) || mutation.isPending}
            onClick={() => save(null)}
          >
            {t("profile.letter.resetToDefault")}
          </Button>
          <Button
            type="button"
            disabled={!isDirty || mutation.isPending}
            aria-busy={mutation.isPending}
            onClick={() => save(promptToPayload(value, profile.defaultCoverLetterPrompt))}
          >
            {mutation.isPending ? t("common.saving") : t("profile.letter.savePrompt")}
          </Button>
        </div>

        <CoverLetterExamples />
      </div>
    </ProfileSection>
  );
}
