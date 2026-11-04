"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle, Minus, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { ProfileSection } from "@/components/profile/profile-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useContextItems } from "@/hooks/use-context-items";
import { useCreateContextItem } from "@/hooks/use-create-context-item";
import { useDeleteContextItem } from "@/hooks/use-delete-context-item";
import { useScoreContextItems } from "@/hooks/use-score-context-items";
import { useUpdateContextItem } from "@/hooks/use-update-context-item";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { MessageKey } from "@/lib/i18n/messages";
import type { ContextItemDTO, ContextItemWeightValue } from "@/lib/api-types";
import { CONTEXT_ITEM_MAX_LENGTH } from "@/lib/profile/limits";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";

const WEIGHT_META: Record<ContextItemWeightValue, { labelKey: MessageKey; icon: typeof Check }> = {
  COVERED: { labelKey: "profile.context.weightCovered", icon: Check },
  SUBSTANTIAL: { labelKey: "profile.context.weightSubstantial", icon: Sparkles },
  MINOR: { labelKey: "profile.context.weightMinor", icon: Minus },
};

const ROW_BUTTON_CLASS = "min-h-11 sm:min-h-8";

function WeightBadge({ weight }: { weight: ContextItemWeightValue | null }) {
  const t = useT();
  const meta = weight === null ? null : WEIGHT_META[weight];
  const Icon = meta?.icon ?? Circle;

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--gh-border)] px-2 py-0.5 text-xs text-[var(--gh-text-muted)]">
      <Icon className="size-3" aria-hidden="true" />
      {t(meta ? meta.labelKey : "profile.context.notScored")}
    </span>
  );
}

export function ContextItemsSection() {
  const t = useT();
  const itemsQuery = useContextItems();
  const createMutation = useCreateContextItem();
  const updateMutation = useUpdateContextItem();
  const deleteMutation = useDeleteContextItem();
  const scoreMutation = useScoreContextItems();
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContextItemDTO | null>(null);
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [scoringStalled, setScoringStalled] = useState(false);

  const items = itemsQuery.data ?? [];
  const unscoredCount = items.filter((item) => item.weight === null).length;
  const canSaveDraft = draft.trim() !== "" && !createMutation.isPending;
  const canSaveEdit = editDraft.trim() !== "" && !updateMutation.isPending;
  const { mutate: scoreItems, isPending: scoringPending } = scoreMutation;

  useEffect(() => {
    if (unscoredCount === 0 || pauseReason !== null || scoringStalled || scoringPending) return;
    scoreItems(undefined, {
      onSuccess: (result) => {
        if (result.skipped !== null) setPauseReason(result.skipped);
        else if (result.scored === 0) setScoringStalled(true);
      },
      onError: () => setScoringStalled(true),
    });
  }, [unscoredCount, pauseReason, scoringStalled, scoringPending, scoreItems]);

  function afterSave(skipped: string | null) {
    setPauseReason(skipped);
    setScoringStalled(false);
  }

  function saveDraft(addAnother: boolean) {
    const text = draft.trim();
    if (text === "" || createMutation.isPending) return;

    createMutation.mutate(text, {
      onSuccess: (result) => {
        setDraft("");
        afterSave(result.scoring.skipped);
        if (addAnother) draftRef.current?.focus();
        else setAdding(false);
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.context.saveFailed")),
    });
  }

  function startEdit(item: ContextItemDTO) {
    setEditingId(item.id);
    setEditDraft(item.text);
  }

  function saveEdit() {
    const text = editDraft.trim();
    if (editingId === null || text === "" || updateMutation.isPending) return;

    updateMutation.mutate(
      { id: editingId, text },
      {
        onSuccess: (result) => {
          setEditingId(null);
          afterSave(result.scoring.skipped);
        },
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.context.saveFailed")),
      },
    );
  }

  function confirmDelete() {
    if (deleteTarget === null || deleteMutation.isPending) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("profile.context.deleted"));
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(t, error, "profile.context.deleteFailed"));
        setDeleteTarget(null);
      },
    });
  }

  return (
    <ProfileSection title={t("profile.context.title")} description={t("profile.context.description")}>
      {itemsQuery.isPending ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : itemsQuery.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--gh-text)]">{t("profile.loadFailed")}</p>
          <Button type="button" variant="outline" onClick={() => itemsQuery.refetch()}>
            {t("profile.retry")}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--gh-text-muted)]">{t("profile.context.count", { count: items.length })}</p>

          {pauseReason !== null ? (
            <p role="status" className="text-xs text-[var(--gh-text-muted)]">
              {t("profile.context.scoringPaused", { reason: t(skipReasonMessageKey(pauseReason)) })}
            </p>
          ) : null}

          {items.length === 0 && !adding ? (
            <p className="text-sm text-[var(--gh-text-muted)]">{t("profile.context.empty")}</p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3"
              >
                {editingId === item.id ? (
                  <div className="flex flex-col gap-3">
                    <Field>
                      <FieldLabel htmlFor={`profile-context-edit-${item.id}`}>{t("profile.context.editLabel")}</FieldLabel>
                      <Textarea
                        id={`profile-context-edit-${item.id}`}
                        value={editDraft}
                        rows={2}
                        maxLength={CONTEXT_ITEM_MAX_LENGTH}
                        autoFocus
                        onChange={(event) => setEditDraft(event.target.value)}
                      />
                    </Field>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className={ROW_BUTTON_CLASS}
                        disabled={updateMutation.isPending}
                        onClick={() => setEditingId(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        type="button"
                        className={ROW_BUTTON_CLASS}
                        disabled={!canSaveEdit}
                        aria-busy={updateMutation.isPending}
                        onClick={saveEdit}
                      >
                        {updateMutation.isPending ? t("common.saving") : t("profile.context.save")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-[var(--gh-text)]">{item.text}</p>
                      <WeightBadge weight={item.weight} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={ROW_BUTTON_CLASS}
                        onClick={() => startEdit(item)}
                      >
                        <Pencil data-icon="inline-start" />
                        {t("profile.context.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={ROW_BUTTON_CLASS}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 data-icon="inline-start" />
                        {t("profile.context.delete")}
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          {adding ? (
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3">
              <Field>
                <FieldLabel htmlFor="profile-context-draft">{t("profile.context.inputLabel")}</FieldLabel>
                <Textarea
                  id="profile-context-draft"
                  ref={draftRef}
                  value={draft}
                  rows={2}
                  maxLength={CONTEXT_ITEM_MAX_LENGTH}
                  placeholder={t("profile.context.placeholder")}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                />
                <p className="text-xs text-[var(--gh-text-muted)]">
                  {t("profile.context.maxLength", { count: CONTEXT_ITEM_MAX_LENGTH })}
                </p>
              </Field>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createMutation.isPending}
                  onClick={() => {
                    setAdding(false);
                    setDraft("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="button" variant="outline" disabled={!canSaveDraft} onClick={() => saveDraft(true)}>
                  {t("profile.context.saveAndAddAnother")}
                </Button>
                <Button
                  type="button"
                  disabled={!canSaveDraft}
                  aria-busy={createMutation.isPending}
                  onClick={() => saveDraft(false)}
                >
                  {createMutation.isPending ? t("common.saving") : t("profile.context.save")}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Button type="button" variant="outline" onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" />
                {t("profile.context.add")}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("profile.context.deleteTitle")}
        description={t("profile.context.deleteDescription")}
        confirmLabel={t("profile.context.delete")}
        intent="destructive"
        destructive
        visualVariant="gameHub"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </ProfileSection>
  );
}
