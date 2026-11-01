"use client";

import { useState, type FormEvent } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/components/i18n/i18n-provider";
import { useAutoIgnoreSettings } from "@/hooks/use-auto-ignore-settings";
import { useUpdateAutoIgnoreSettings } from "@/hooks/use-update-auto-ignore-settings";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import {
  AUTO_IGNORE_AFTER_DAYS,
  AUTO_IGNORE_MAX_DAYS,
  AUTO_IGNORE_MIN_DAYS,
} from "@/lib/status";

type AutoIgnoreFormProps = {
  initialDays: number | null;
  onDone: () => void;
};

function AutoIgnoreForm({ initialDays, onDone }: AutoIgnoreFormProps) {
  const t = useT();
  const [enabled, setEnabled] = useState(initialDays !== null);
  const [days, setDays] = useState(String(initialDays ?? AUTO_IGNORE_AFTER_DAYS));
  const mutation = useUpdateAutoIgnoreSettings();

  const parsedDays = Number(days);
  const isDaysValid =
    Number.isInteger(parsedDays) &&
    parsedDays >= AUTO_IGNORE_MIN_DAYS &&
    parsedDays <= AUTO_IGNORE_MAX_DAYS;
  const canSubmit = (!enabled || isDaysValid) && !mutation.isPending;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    mutation.mutate(
      { autoIgnoreAfterDays: enabled ? parsedDays : null },
      {
        onSuccess: () => {
          toast.success(t("settings.autoIgnore.saved"));
          onDone();
        },
        onError: (error) =>
          toast.error(getApiErrorMessage(t, error, "settings.autoIgnore.saveFailed")),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          id="auto-ignore-enabled"
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
        />
        <Label htmlFor="auto-ignore-enabled">{t("settings.autoIgnore.enabled")}</Label>
      </div>
      <Field data-invalid={enabled && !isDaysValid}>
        <FieldLabel htmlFor="auto-ignore-days">{t("settings.autoIgnore.days")}</FieldLabel>
        <Input
          id="auto-ignore-days"
          type="number"
          inputMode="numeric"
          min={AUTO_IGNORE_MIN_DAYS}
          max={AUTO_IGNORE_MAX_DAYS}
          step={1}
          value={days}
          disabled={!enabled}
          aria-invalid={enabled && !isDaysValid}
          onChange={(event) => setDays(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={mutation.isPending} />}>
          {t("common.cancel")}
        </DialogClose>
        <Button type="submit" disabled={!canSubmit} aria-busy={mutation.isPending}>
          {mutation.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function SettingsButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const settings = useAutoIgnoreSettings();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-touch"
            title={t("nav.settings")}
            aria-label={t("nav.settings")}
          />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("settings.language.title")}</h3>
          <LanguageSwitcher />
          <p className="text-xs text-muted-foreground">{t("settings.language.hint")}</p>
        </section>

        <Separator />

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("settings.autoIgnore.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("settings.autoIgnore.description")}</p>
          {settings.data ? (
            <AutoIgnoreForm
              initialDays={settings.data.autoIgnoreAfterDays}
              onDone={() => setOpen(false)}
            />
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              {settings.isError ? t("settings.loadFailed") : t("common.loading")}
            </p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
