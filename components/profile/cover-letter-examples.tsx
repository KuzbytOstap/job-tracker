"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { useT } from "@/components/i18n/i18n-provider";
import { useCoverLetterExamples } from "@/hooks/use-cover-letter-examples";
import { useCreateCoverLetterExample } from "@/hooks/use-create-cover-letter-example";
import { useDeleteCoverLetterExample } from "@/hooks/use-delete-cover-letter-example";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { COVER_LETTER_EXAMPLE_MAX_COUNT, COVER_LETTER_EXAMPLE_MAX_LENGTH } from "@/lib/profile/limits";

export function CoverLetterExamples() {
  const t = useT();
  const examplesQuery = useCoverLetterExamples();
  const createMutation = useCreateCoverLetterExample();
  const deleteMutation = useDeleteCoverLetterExample();
  const [adding, setAdding] = useState(false);
  const [vacancyText, setVacancyText] = useState("");
  const [letterText, setLetterText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const examples = examplesQuery.data ?? [];
  const limitReached = examples.length >= COVER_LETTER_EXAMPLE_MAX_COUNT;
  const canSave = vacancyText.trim() !== "" && letterText.trim() !== "" && !createMutation.isPending;

  function closeForm() {
    setAdding(false);
    setVacancyText("");
    setLetterText("");
  }

  function handleCreate() {
    if (!canSave) return;
    createMutation.mutate(
      { vacancyText: vacancyText.trim(), letterText: letterText.trim() },
      {
        onSuccess: () => {
          toast.success(t("profile.letter.exampleSaved"));
          closeForm();
        },
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.letter.exampleSaveFailed")),
      },
    );
  }

  function handleDelete() {
    if (deleteId === null || deleteMutation.isPending) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success(t("profile.letter.exampleDeleted"));
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(t, error, "profile.letter.exampleDeleteFailed"));
        setDeleteId(null);
      },
    });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--gh-border)] pt-5">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-[var(--gh-text)]">{t("profile.letter.examplesTitle")}</h3>
        <p className="text-sm text-[var(--gh-text-muted)]">{t("profile.letter.examplesDescription")}</p>
      </div>

      {examples.length === 0 && !adding ? (
        <p className="text-sm text-[var(--gh-text-muted)]">{t("profile.letter.empty")}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {examples.map((example, index) => (
          <li
            key={example.id}
            className="rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] px-3 py-2"
          >
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[var(--gh-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0 truncate">{t("profile.letter.exampleTitle", { number: index + 1 })}</span>
                <span className="truncate text-xs font-normal text-[var(--gh-text-muted)]">
                  {example.letterText.slice(0, 60)}
                </span>
              </summary>
              <div className="flex flex-col gap-3 pb-2 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--gh-text-muted)]">
                    {t("profile.letter.vacancyText")}
                  </p>
                  <p className="whitespace-pre-wrap text-[var(--gh-text-secondary)]">{example.vacancyText}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--gh-text-muted)]">{t("profile.letter.letterText")}</p>
                  <p className="whitespace-pre-wrap text-[var(--gh-text-secondary)]">{example.letterText}</p>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDeleteId(example.id)}>
                    <Trash2 data-icon="inline-start" />
                    {t("profile.letter.delete")}
                  </Button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3">
          <Field>
            <FieldLabel htmlFor="profile-example-vacancy">{t("profile.letter.vacancyText")}</FieldLabel>
            <Textarea
              id="profile-example-vacancy"
              value={vacancyText}
              rows={5}
              maxLength={COVER_LETTER_EXAMPLE_MAX_LENGTH}
              onChange={(event) => setVacancyText(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="profile-example-letter">{t("profile.letter.letterText")}</FieldLabel>
            <Textarea
              id="profile-example-letter"
              value={letterText}
              rows={8}
              maxLength={COVER_LETTER_EXAMPLE_MAX_LENGTH}
              onChange={(event) => setLetterText(event.target.value)}
            />
            <p className="text-xs text-[var(--gh-text-muted)]">
              {t("profile.letter.maxLength", { count: COVER_LETTER_EXAMPLE_MAX_LENGTH })}
            </p>
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={createMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={!canSave} aria-busy={createMutation.isPending}>
              {createMutation.isPending ? t("common.saving") : t("profile.letter.saveExample")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" variant="outline" disabled={limitReached} onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" />
            {t("profile.letter.addExample")}
          </Button>
          {limitReached ? (
            <p className="text-xs text-[var(--gh-text-muted)]">
              {t("profile.letter.exampleLimit", { count: COVER_LETTER_EXAMPLE_MAX_COUNT })}
            </p>
          ) : null}
        </div>
      )}

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("profile.letter.exampleDeleteTitle")}
        description={t("profile.letter.exampleDeleteDescription")}
        confirmLabel={t("profile.letter.delete")}
        intent="destructive"
        destructive
        visualVariant="gameHub"
        pending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
