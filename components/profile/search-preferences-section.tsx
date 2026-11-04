"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileSection } from "@/components/profile/profile-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ProfileDTO } from "@/lib/api-types";
import {
  EMPLOYMENT_TYPE_VALUES,
  WORK_FORMAT_VALUES,
  searchFormSchema,
  searchFormValuesFromProfile,
  searchFormValuesToPayload,
  type SearchFormValues,
} from "@/lib/profile/profile-form";

const NO_PERIOD = "NONE";

const PERIOD_LABEL_KEYS: Record<"HOUR" | "MONTH" | "YEAR", MessageKey> = {
  HOUR: "profile.search.periodHour",
  MONTH: "profile.search.periodMonth",
  YEAR: "profile.search.periodYear",
};

const EMPLOYMENT_LABEL_KEYS: Record<(typeof EMPLOYMENT_TYPE_VALUES)[number], MessageKey> = {
  FULL_TIME: "profile.search.fullTime",
  PART_TIME: "profile.search.partTime",
  CONTRACT: "profile.search.contract",
};

const WORK_FORMAT_LABEL_KEYS: Record<(typeof WORK_FORMAT_VALUES)[number], MessageKey> = {
  REMOTE: "profile.search.remote",
  ONSITE: "profile.search.onsite",
  HYBRID: "profile.search.hybrid",
};

type CheckboxGroupProps<T extends string> = {
  legend: string;
  name: string;
  options: Array<{ value: T; label: string }>;
  value: T[];
  onChange: (next: T[]) => void;
};

function CheckboxGroup<T extends string>({ legend, name, options, value, onChange }: CheckboxGroupProps<T>) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="flex flex-col">
        {options.map((option) => {
          const id = `profile-${name}-${option.value}`;
          const checked = value.includes(option.value);
          return (
            <div key={option.value} className="flex min-h-11 items-center gap-3 px-1">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(next) =>
                  onChange(next === true ? [...value, option.value] : value.filter((item) => item !== option.value))
                }
              />
              <Label htmlFor={id} className="min-h-11 flex-1 cursor-pointer text-sm">
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </FieldSet>
  );
}

export function SearchPreferencesSection({ profile }: { profile: ProfileDTO }) {
  const t = useT();
  const mutation = useUpdateProfile();
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: searchFormValuesFromProfile(profile),
  });
  const { register, control, handleSubmit, reset } = form;
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (!isDirty) reset(searchFormValuesFromProfile(profile));
  }, [profile, isDirty, reset]);

  const periodItems = [
    { value: NO_PERIOD, label: t("profile.search.noPeriod") },
    ...(["HOUR", "MONTH", "YEAR"] as const).map((value) => ({ value, label: t(PERIOD_LABEL_KEYS[value]) })),
  ];

  function onSubmit(values: SearchFormValues) {
    mutation.mutate(searchFormValuesToPayload(values), {
      onSuccess: (updated) => {
        reset(searchFormValuesFromProfile(updated));
        toast.success(t("profile.saved"));
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.saveFailed")),
    });
  }

  return (
    <ProfileSection title={t("profile.search.title")} description={t("profile.search.description")}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6rem_10rem]">
          <Field data-invalid={errors.salaryAmount !== undefined}>
            <FieldLabel htmlFor="profile-salaryAmount">{t("profile.search.salaryAmount")}</FieldLabel>
            <Input
              id="profile-salaryAmount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              aria-invalid={errors.salaryAmount !== undefined}
              className="h-11 sm:h-9"
              {...register("salaryAmount")}
            />
            <FieldError errors={[errors.salaryAmount]} />
          </Field>
          <Field data-invalid={errors.salaryCurrency !== undefined}>
            <FieldLabel htmlFor="profile-salaryCurrency">{t("profile.search.salaryCurrency")}</FieldLabel>
            <Input
              id="profile-salaryCurrency"
              type="text"
              autoComplete="off"
              maxLength={3}
              placeholder="USD"
              aria-invalid={errors.salaryCurrency !== undefined}
              className="h-11 uppercase sm:h-9"
              {...register("salaryCurrency")}
            />
            <FieldError errors={[errors.salaryCurrency]} />
          </Field>
          <Field data-invalid={errors.salaryPeriod !== undefined}>
            <FieldLabel htmlFor="profile-salaryPeriod">{t("profile.search.salaryPeriod")}</FieldLabel>
            <Controller
              control={control}
              name="salaryPeriod"
              render={({ field }) => (
                <Select
                  value={field.value === "" ? NO_PERIOD : field.value}
                  items={periodItems}
                  onValueChange={(next) => field.onChange(next === NO_PERIOD ? "" : next)}
                >
                  <SelectTrigger
                    id="profile-salaryPeriod"
                    className="h-11 w-full sm:h-9"
                    aria-invalid={errors.salaryPeriod !== undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.salaryPeriod]} />
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            control={control}
            name="employmentTypes"
            render={({ field }) => (
              <CheckboxGroup
                legend={t("profile.search.employmentTypes")}
                name="employment"
                options={EMPLOYMENT_TYPE_VALUES.map((value) => ({ value, label: t(EMPLOYMENT_LABEL_KEYS[value]) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="workFormats"
            render={({ field }) => (
              <CheckboxGroup
                legend={t("profile.search.workFormats")}
                name="work-format"
                options={WORK_FORMAT_VALUES.map((value) => ({ value, label: t(WORK_FORMAT_LABEL_KEYS[value]) }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="flex justify-end border-t border-[var(--gh-border)] pt-4">
          <Button type="submit" disabled={!isDirty || mutation.isPending} aria-busy={mutation.isPending}>
            {mutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
