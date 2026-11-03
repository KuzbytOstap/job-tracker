"use client";

import { useEffect, type HTMLAttributes } from "react";
import { useForm, type FieldError as RhfFieldError, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProfileSection } from "@/components/profile/profile-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ProfileDTO } from "@/lib/api-types";
import {
  PROFILE_EMAIL_MAX_LENGTH,
  PROFILE_FIELD_MAX_LENGTH,
  PROFILE_PHONE_MAX_LENGTH,
} from "@/lib/profile/limits";
import {
  personalFormSchema,
  personalFormValuesFromProfile,
  personalFormValuesToPayload,
  type PersonalFormValues,
} from "@/lib/profile/profile-form";

type TextFieldProps = {
  name: keyof PersonalFormValues;
  labelKey: MessageKey;
  register: UseFormRegister<PersonalFormValues>;
  error: RhfFieldError | undefined;
  autoComplete: string;
  maxLength: number;
  type?: "text" | "email" | "tel";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
};

function TextField({ name, labelKey, register, error, autoComplete, maxLength, type = "text", inputMode }: TextFieldProps) {
  const t = useT();
  const id = `profile-${name}`;

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>{t(labelKey)}</FieldLabel>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error !== undefined}
        className="h-11 sm:h-9"
        {...register(name)}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}

export function PersonalSection({ profile }: { profile: ProfileDTO }) {
  const t = useT();
  const mutation = useUpdateProfile();
  const form = useForm<PersonalFormValues>({
    resolver: zodResolver(personalFormSchema),
    defaultValues: personalFormValuesFromProfile(profile),
  });
  const { register, handleSubmit, reset, setFocus } = form;
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (!isDirty) reset(personalFormValuesFromProfile(profile));
  }, [profile, isDirty, reset]);

  function onSubmit(values: PersonalFormValues) {
    mutation.mutate(personalFormValuesToPayload(values), {
      onSuccess: (updated) => {
        reset(personalFormValuesFromProfile(updated));
        toast.success(t("profile.saved"));
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.saveFailed")),
    });
  }

  function onInvalid(invalid: typeof errors) {
    const first = Object.keys(invalid)[0] as keyof PersonalFormValues | undefined;
    if (first) setFocus(first);
  }

  return (
    <ProfileSection title={t("profile.personal.title")} description={t("profile.personal.description")}>
      <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="firstName"
            labelKey="profile.personal.firstName"
            register={register}
            error={errors.firstName}
            autoComplete="given-name"
            maxLength={PROFILE_FIELD_MAX_LENGTH}
          />
          <TextField
            name="lastName"
            labelKey="profile.personal.lastName"
            register={register}
            error={errors.lastName}
            autoComplete="family-name"
            maxLength={PROFILE_FIELD_MAX_LENGTH}
          />
          <TextField
            name="contactEmail"
            labelKey="profile.personal.email"
            register={register}
            error={errors.contactEmail}
            autoComplete="email"
            type="email"
            inputMode="email"
            maxLength={PROFILE_EMAIL_MAX_LENGTH}
          />
          <TextField
            name="phone"
            labelKey="profile.personal.phone"
            register={register}
            error={errors.phone}
            autoComplete="tel"
            type="tel"
            inputMode="tel"
            maxLength={PROFILE_PHONE_MAX_LENGTH}
          />
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-medium text-[var(--gh-text-secondary)]">
            {t("profile.personal.addressTitle")}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                name="street"
                labelKey="profile.personal.street"
                register={register}
                error={errors.street}
                autoComplete="street-address"
                maxLength={PROFILE_FIELD_MAX_LENGTH}
              />
            </div>
            <TextField
              name="postalCode"
              labelKey="profile.personal.postalCode"
              register={register}
              error={errors.postalCode}
              autoComplete="postal-code"
              maxLength={PROFILE_FIELD_MAX_LENGTH}
            />
            <TextField
              name="city"
              labelKey="profile.personal.city"
              register={register}
              error={errors.city}
              autoComplete="address-level2"
              maxLength={PROFILE_FIELD_MAX_LENGTH}
            />
            <TextField
              name="region"
              labelKey="profile.personal.region"
              register={register}
              error={errors.region}
              autoComplete="address-level1"
              maxLength={PROFILE_FIELD_MAX_LENGTH}
            />
            <TextField
              name="country"
              labelKey="profile.personal.country"
              register={register}
              error={errors.country}
              autoComplete="country-name"
              maxLength={PROFILE_FIELD_MAX_LENGTH}
            />
          </div>
        </fieldset>

        <div className="flex justify-end border-t border-[var(--gh-border)] pt-4">
          <Button type="submit" disabled={!isDirty || mutation.isPending} aria-busy={mutation.isPending}>
            {mutation.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
