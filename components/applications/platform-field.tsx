"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/components/i18n/i18n-provider";
import { useCreatePlatform } from "@/hooks/use-create-platform";
import { usePlatforms } from "@/hooks/use-platforms";
import { ApiError } from "@/lib/api";
import { platformOptionLabel } from "@/lib/i18n/label-keys";
import { translateValidationMessage } from "@/lib/i18n/validation-keys";
import {
  PLATFORM_NAME_MAX_LENGTH,
  platformNameSchema,
  similarPlatformFromErrorDetails,
} from "@/lib/platforms";
import { SimilarPlatformPrompt } from "@/components/applications/similar-platform-prompt";
import { PLATFORM_VALUES } from "@/lib/validation";
import type { PlatformOptionDTO } from "@/lib/api-types";
import type { ApplicationFormValues } from "@/lib/application-form";

type SelectablePlatform = Pick<PlatformOptionDTO, "value" | "label" | "platform" | "customPlatformId">;

const BUILT_IN_OPTIONS: SelectablePlatform[] = PLATFORM_VALUES.map((platform) => ({
  value: platform,
  label: platform,
  platform,
  customPlatformId: null,
}));

const setValueOptions = { shouldDirty: true, shouldTouch: true, shouldValidate: true } as const;

export function PlatformField() {
  const t = useT();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ApplicationFormValues>();
  const customPlatformId = useWatch({ control, name: "customPlatformId" });
  const platformsQuery = usePlatforms();
  const createMutation = useCreatePlatform();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<PlatformOptionDTO | null>(null);

  const options: SelectablePlatform[] = platformsQuery.data?.platforms ?? BUILT_IN_OPTIONS;
  const labelledOptions = options.map((option) => ({
    value: option.value,
    label: platformOptionLabel(t, option),
  }));

  function applyOption(option: Pick<SelectablePlatform, "platform" | "customPlatformId">) {
    setValue("platform", option.platform, setValueOptions);
    setValue("customPlatformId", option.customPlatformId, setValueOptions);
  }

  function handleSelect(value: string | null) {
    const option = options.find((candidate) => candidate.value === value);
    if (option) applyOption(option);
  }

  function resetAddState() {
    setAdding(false);
    setName("");
    setNameError(null);
    setSimilar(null);
  }

  function handleAdd(confirmNew = false) {
    if (createMutation.isPending) return;

    const parsed = platformNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(translateValidationMessage(t, parsed.error.issues[0]?.message ?? "Enter a valid platform name"));
      return;
    }

    createMutation.mutate(
      { name: parsed.data, confirmNew },
      {
        onSuccess: ({ platform, created }) => {
          applyOption(platform);
          resetAddState();
          const label = platformOptionLabel(t, platform);
          toast.success(
            created ? t("form.platform.added", { name: label }) : t("form.platform.alreadyExists", { name: label }),
          );
        },
        onError: (error) => {
          const similarPlatform = error instanceof ApiError ? similarPlatformFromErrorDetails(error.details) : null;
          if (similarPlatform) {
            setSimilar(similarPlatform);
            return;
          }
          toast.error(error instanceof ApiError ? error.message : t("form.platform.addFailed"));
        },
      },
    );
  }

  function handleUseSimilar() {
    if (!similar) return;
    applyOption(similar);
    resetAddState();
  }

  return (
    <Field data-invalid={!!errors.platform || nameError !== null}>
      <FieldLabel htmlFor="application-platform">{t("form.fields.platform")}</FieldLabel>
      <Controller
        control={control}
        name="platform"
        render={({ field }) => (
          <Select value={customPlatformId ?? field.value} items={labelledOptions} onValueChange={handleSelect}>
            <SelectTrigger id="application-platform" aria-invalid={!!errors.platform} className="w-full">
              <SelectValue placeholder={t("form.platform.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {labelledOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {adding ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              aria-label={t("form.platform.newNameLabel")}
              aria-invalid={nameError !== null}
              maxLength={PLATFORM_NAME_MAX_LENGTH}
              placeholder={t("form.platform.newNamePlaceholder")}
              className="h-10 sm:h-8"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
                setSimilar(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={createMutation.isPending}
              aria-busy={createMutation.isPending}
              onClick={() => handleAdd()}
            >
              {createMutation.isPending ? t("form.platform.adding") : t("form.platform.add")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetAddState}>
              {t("common.cancel")}
            </Button>
          </div>
          {nameError && (
            <p role="alert" className="text-sm text-destructive">
              {nameError}
            </p>
          )}
          {similar && (
            <SimilarPlatformPrompt
              name={name.trim()}
              similar={similar}
              pending={createMutation.isPending}
              onUseExisting={handleUseSimilar}
              onCreateAnyway={() => handleAdd(true)}
            />
          )}
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" />
          {t("form.platform.addNew")}
        </Button>
      )}
      <FieldError errors={[errors.platform]} />
    </Field>
  );
}
