"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/i18n/i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import type { CvIdentitySuggestionsDTO, ProfileDTO, UpdateProfilePayload } from "@/lib/api-types";
import { buildIdentityRows, identityPatch, type IdentityFieldKey, type IdentityRow } from "@/lib/profile/identity";

const LABEL_KEYS: Record<IdentityFieldKey, MessageKey> = {
  firstName: "profile.personal.firstName",
  lastName: "profile.personal.lastName",
  contactEmail: "profile.personal.email",
  phone: "profile.personal.phone",
  city: "profile.personal.city",
};

function initialChecked(rows: IdentityRow[]): Record<IdentityFieldKey, boolean> {
  const checked: Record<IdentityFieldKey, boolean> = {
    firstName: false,
    lastName: false,
    contactEmail: false,
    phone: false,
    city: false,
  };
  for (const row of rows) checked[row.key] = row.defaultChecked;
  return checked;
}

type IdentitySuggestionsProps = {
  suggestions: CvIdentitySuggestionsDTO;
  profile: ProfileDTO;
  pending?: boolean;
  onApply: (patch: UpdateProfilePayload) => void;
  onDismiss: () => void;
};

export function IdentitySuggestions({ suggestions, profile, pending = false, onApply, onDismiss }: IdentitySuggestionsProps) {
  const t = useT();
  const headingId = useId();
  const rows = useMemo(() => buildIdentityRows(suggestions, profile), [suggestions, profile]);
  const [checked, setChecked] = useState(() => initialChecked(rows));
  const hasRows = rows.length > 0;
  const anyChecked = rows.some((row) => checked[row.key]);

  return (
    <div
      role="region"
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-sm font-medium text-[var(--gh-text)]">
          {t("profile.cv.identityTitle")}
        </h3>
        <p className="text-sm text-[var(--gh-text-muted)]">
          {hasRows ? t("profile.cv.identityDescription") : t("profile.cv.identityNothing")}
        </p>
      </div>

      {hasRows ? (
        <ul className="flex flex-col">
          {rows.map((row) => {
            const id = `${headingId}-${row.key}`;
            const label = t(LABEL_KEYS[row.key]);
            return (
              <li key={row.key} className="flex min-h-11 items-center gap-3 px-1">
                <Checkbox
                  id={id}
                  aria-label={label}
                  checked={checked[row.key]}
                  onCheckedChange={(next) => setChecked((previous) => ({ ...previous, [row.key]: next === true }))}
                />
                <Label htmlFor={id} className="min-h-11 flex-1 cursor-pointer flex-wrap gap-x-2 text-sm">
                  <span className="font-medium">{label}:</span>
                  <span>{row.suggested}</span>
                  {row.current !== null ? (
                    <span className="text-xs font-normal text-[var(--gh-text-muted)]">
                      {t("profile.cv.identityCurrent", { value: row.current })}
                    </span>
                  ) : null}
                </Label>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onDismiss} disabled={pending}>
          {hasRows ? t("profile.cv.identityDismiss") : t("common.close")}
        </Button>
        {hasRows ? (
          <Button
            type="button"
            disabled={!anyChecked || pending}
            aria-busy={pending}
            onClick={() => onApply(identityPatch(rows, checked))}
          >
            {t("profile.cv.identityApply")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
