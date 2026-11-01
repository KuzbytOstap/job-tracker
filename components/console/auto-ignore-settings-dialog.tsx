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
import { useAutoIgnoreSettings } from "@/hooks/use-auto-ignore-settings";
import { useUpdateAutoIgnoreSettings } from "@/hooks/use-update-auto-ignore-settings";
import { ApiError } from "@/lib/api";
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
          toast.success("Auto-ignore settings saved");
          onDone();
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : "Couldn't save settings. Try again.",
          ),
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
        <Label htmlFor="auto-ignore-enabled">Move inactive applications to Ignored</Label>
      </div>
      <Field data-invalid={enabled && !isDaysValid}>
        <FieldLabel htmlFor="auto-ignore-days">Days without activity</FieldLabel>
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
          Cancel
        </DialogClose>
        <Button type="submit" disabled={!canSubmit} aria-busy={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AutoIgnoreSettingsButton() {
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
            title="Auto-ignore settings"
            aria-label="Auto-ignore settings"
          />
        }
      >
        <Settings />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-ignore</DialogTitle>
          <DialogDescription>
            Applications with no activity for this many days are shown under Ignored. Stored statuses
            are never changed.
          </DialogDescription>
        </DialogHeader>
        {settings.data ? (
          <AutoIgnoreForm
            initialDays={settings.data.autoIgnoreAfterDays}
            onDone={() => setOpen(false)}
          />
        ) : (
          <p className="text-sm text-muted-foreground" role="status">
            {settings.isError ? "Couldn't load settings." : "Loading…"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
