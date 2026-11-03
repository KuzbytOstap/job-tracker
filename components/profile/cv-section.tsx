"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Check, Download, FileText, Pencil, RefreshCw, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmActionDialog } from "@/components/overlay/confirm-action-dialog";
import { CvRenameDialog } from "@/components/profile/cv-rename-dialog";
import { CvTextDialog } from "@/components/profile/cv-text-dialog";
import { CvUploadDialog } from "@/components/profile/cv-upload-dialog";
import { IdentitySuggestions } from "@/components/profile/identity-suggestions";
import { ProfileSection } from "@/components/profile/profile-section";
import { useT } from "@/components/i18n/i18n-provider";
import { useCvs } from "@/hooks/use-cvs";
import { useDeleteCv } from "@/hooks/use-delete-cv";
import { useReplaceCvFile } from "@/hooks/use-replace-cv-file";
import { useUpdateCv } from "@/hooks/use-update-cv";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import type { CvDTO, CvIdentitySuggestionsDTO, CvUploadResultDTO, ProfileDTO } from "@/lib/api-types";
import { CV_MAX_COUNT } from "@/lib/profile/limits";
import { checkPdfFile } from "@/lib/profile/pdf-file";

type TextPrompt = { cv: CvDTO; reason: string | null };

const ROW_BUTTON_CLASS = "min-h-11 sm:min-h-8";

export function CvSection({ profile }: { profile: ProfileDTO }) {
  const t = useT();
  const cvsQuery = useCvs();
  const updateCvMutation = useUpdateCv();
  const deleteCvMutation = useDeleteCv();
  const replaceMutation = useReplaceCvFile();
  const updateProfileMutation = useUpdateProfile();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<CvDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CvDTO | null>(null);
  const [textPrompt, setTextPrompt] = useState<TextPrompt | null>(null);
  const [identity, setIdentity] = useState<CvIdentitySuggestionsDTO | null>(null);

  const cvs = cvsQuery.data ?? [];
  const limitReached = cvs.length >= CV_MAX_COUNT;
  const busy = updateCvMutation.isPending || deleteCvMutation.isPending || replaceMutation.isPending;

  function handleImported(result: CvUploadResultDTO) {
    if (result.textStatus === "missing") {
      setTextPrompt({ cv: result.cv, reason: result.skippedReason });
    } else {
      setIdentity(result.identitySuggestions);
    }
  }

  function startReplace(id: string) {
    setReplaceId(id);
    replaceInputRef.current?.click();
  }

  function handleReplaceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    const id = replaceId;
    setReplaceId(null);
    if (!file || !id) return;

    const problem = checkPdfFile(file);
    if (problem) {
      toast.error(t(problem === "tooLarge" ? "profile.cv.fileTooLarge" : "profile.cv.notPdf"));
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    replaceMutation.mutate(
      { id, formData },
      {
        onSuccess: (result) => {
          toast.success(t("profile.cv.updated"));
          handleImported(result);
        },
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.cv.updateFailed")),
      },
    );
  }

  function makePrimary(id: string) {
    updateCvMutation.mutate(
      { id, payload: { isPrimary: true } },
      {
        onSuccess: () => toast.success(t("profile.cv.updated")),
        onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.cv.updateFailed")),
      },
    );
  }

  function confirmDelete() {
    if (deleteTarget === null || deleteCvMutation.isPending) return;
    deleteCvMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("profile.cv.deleted"));
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getApiErrorMessage(t, error, "profile.cv.deleteFailed"));
        setDeleteTarget(null);
      },
    });
  }

  function applyIdentity(patch: Parameters<typeof updateProfileMutation.mutate>[0]) {
    updateProfileMutation.mutate(patch, {
      onSuccess: () => {
        toast.success(t("profile.cv.identityApplied"));
        setIdentity(null);
      },
      onError: (error) => toast.error(getApiErrorMessage(t, error, "profile.saveFailed")),
    });
  }

  return (
    <ProfileSection title={t("profile.cv.title")} description={t("profile.cv.description", { count: CV_MAX_COUNT })}>
      {identity !== null ? (
        <IdentitySuggestions
          suggestions={identity}
          profile={profile}
          pending={updateProfileMutation.isPending}
          onApply={applyIdentity}
          onDismiss={() => setIdentity(null)}
        />
      ) : null}

      {cvsQuery.isPending ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : cvsQuery.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--gh-text)]">{t("profile.loadFailed")}</p>
          <Button type="button" variant="outline" onClick={() => cvsQuery.refetch()}>
            {t("profile.retry")}
          </Button>
        </div>
      ) : cvs.length === 0 ? (
        <p className="text-sm text-[var(--gh-text-muted)]">{t("profile.cv.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cvs.map((cv) => (
            <li
              key={cv.id}
              className="flex flex-col gap-3 rounded-lg border border-[var(--gh-border)] bg-[var(--gh-surface)] p-3"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-5 shrink-0 text-[var(--gh-text-muted)]" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-[var(--gh-text)]">{cv.label}</p>
                    {cv.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gh-accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--gh-text)]">
                        <Star className="size-3" aria-hidden="true" />
                        {t("profile.cv.primary")}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-[var(--gh-text-muted)]">
                    {cv.fileName} · {t("profile.cv.sizeKb", { size: Math.max(1, Math.ceil(cv.fileSize / 1024)) })}
                    {cv.language ? ` · ${t("profile.cv.languageField", { language: cv.language })}` : ""}
                  </p>
                  <p className="inline-flex items-center gap-1 text-xs text-[var(--gh-text-muted)]">
                    {cv.hasText ? <Check className="size-3" aria-hidden="true" /> : null}
                    {cv.hasText ? t("profile.cv.textReady") : t("profile.cv.textMissing")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!cv.isPrimary ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ROW_BUTTON_CLASS}
                    disabled={busy}
                    onClick={() => makePrimary(cv.id)}
                  >
                    <Star data-icon="inline-start" />
                    {t("profile.cv.makePrimary")}
                  </Button>
                ) : null}
                {!cv.hasText ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={ROW_BUTTON_CLASS}
                    disabled={busy}
                    onClick={() => setTextPrompt({ cv, reason: null })}
                  >
                    <FileText data-icon="inline-start" />
                    {t("profile.cv.pasteText")}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={ROW_BUTTON_CLASS}
                  disabled={busy}
                  onClick={() => startReplace(cv.id)}
                >
                  <RefreshCw data-icon="inline-start" />
                  {t("profile.cv.replace")}
                </Button>
                <a
                  href={`/api/profile/cvs/${cv.id}/file`}
                  download
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} ${ROW_BUTTON_CLASS}`}
                >
                  <Download data-icon="inline-start" />
                  {t("profile.cv.download")}
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={ROW_BUTTON_CLASS}
                  disabled={busy}
                  onClick={() => setRenameTarget(cv)}
                >
                  <Pencil data-icon="inline-start" />
                  {t("profile.cv.rename")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={ROW_BUTTON_CLASS}
                  disabled={busy}
                  onClick={() => setDeleteTarget(cv)}
                >
                  <Trash2 data-icon="inline-start" />
                  {t("profile.cv.delete")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col items-start gap-2">
        <Button type="button" disabled={limitReached} onClick={() => setUploadOpen(true)}>
          <Upload data-icon="inline-start" />
          {t("profile.cv.upload")}
        </Button>
        {limitReached ? (
          <p className="text-xs text-[var(--gh-text-muted)]">{t("profile.cv.limitReached", { count: CV_MAX_COUNT })}</p>
        ) : null}
      </div>

      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleReplaceFile}
      />

      <CvUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onImported={handleImported} />

      {renameTarget !== null ? (
        <CvRenameDialog key={renameTarget.id} cv={renameTarget} onClose={() => setRenameTarget(null)} />
      ) : null}

      {textPrompt !== null ? (
        <CvTextDialog
          key={textPrompt.cv.id}
          cv={textPrompt.cv}
          reason={textPrompt.reason}
          onClose={() => setTextPrompt(null)}
        />
      ) : null}

      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("profile.cv.deleteTitle")}
        description={
          deleteTarget !== null
            ? deleteTarget.isPrimary && cvs.length > 1
              ? t("profile.cv.deletePrimaryDescription", { name: deleteTarget.label })
              : t("profile.cv.deleteDescription", { name: deleteTarget.label })
            : ""
        }
        confirmLabel={t("profile.cv.delete")}
        intent="destructive"
        destructive
        visualVariant="gameHub"
        pending={deleteCvMutation.isPending}
        onConfirm={confirmDelete}
      />
    </ProfileSection>
  );
}
