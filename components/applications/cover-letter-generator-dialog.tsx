"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiAccessNotice } from "@/components/ai/ai-access-notice";
import { AiQuotaNotice } from "@/components/ai/ai-quota-notice";
import { useT } from "@/components/i18n/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAiAccessStatus } from "@/hooks/use-ai-access-status";
import { useAiUsageStatus } from "@/hooks/use-ai-usage-status";
import { useCvs } from "@/hooks/use-cvs";
import { useGenerateCoverLetter } from "@/hooks/use-generate-cover-letter";
import { ApiError } from "@/lib/api";
import { extractAiQuotaReasonFromError, quotaForReason, resolveAiQuotaReason } from "@/lib/ai-quota";
import { getApiErrorMessage } from "@/lib/i18n/api-errors";
import { skipReasonMessageKey } from "@/lib/profile/skip-reasons";
import { cn } from "@/lib/utils";
import { AiAccessStatus } from "@/app/generated/prisma/enums";
import type { CvDTO } from "@/lib/api-types";

type CoverLetterGeneratorDialogProps = {
  jobPostingText: string;
  company: string;
  position: string;
  currentLetter: string;
  onUse: (letter: string) => void;
};

export function CoverLetterGeneratorDialog({
  jobPostingText,
  company,
  position,
  currentLetter,
  onUse,
}: CoverLetterGeneratorDialogProps) {
  const t = useT();
  const hintId = useId();
  const [open, setOpen] = useState(false);
  const hasVacancy = jobPostingText.trim().length > 0;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 self-start sm:h-8"
        disabled={!hasVacancy}
        aria-describedby={hasVacancy ? undefined : hintId}
        onClick={() => setOpen(true)}
      >
        <Sparkles data-icon="inline-start" />
        {t("coverLetter.trigger")}
      </Button>
      {!hasVacancy && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t("coverLetter.needsVacancy")}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("coverLetter.title")}</DialogTitle>
            <DialogDescription>{t("coverLetter.description")}</DialogDescription>
          </DialogHeader>
          {open && (
            <GeneratorBody
              jobPostingText={jobPostingText}
              company={company}
              position={position}
              currentLetter={currentLetter}
              onUse={onUse}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type GeneratorBodyProps = CoverLetterGeneratorDialogProps & { onClose: () => void };

function cvOptionLabel(cv: CvDTO, primarySuffix: string): string {
  const language = cv.language ? ` (${cv.language})` : "";
  const primary = cv.isPrimary ? ` · ${primarySuffix}` : "";
  return `${cv.label}${language}${primary}`;
}

function GeneratorBody({ jobPostingText, company, position, currentLetter, onUse, onClose }: GeneratorBodyProps) {
  const t = useT();
  const cvSelectId = useId();
  const letterId = useId();
  const cvsQuery = useCvs();
  const mutation = useGenerateCoverLetter();
  const aiAccess = useAiAccessStatus();
  const aiAccessStatus = aiAccess.data?.status;
  const aiUsage = useAiUsageStatus(aiAccessStatus === AiAccessStatus.APPROVED);
  const [chosenCvId, setChosenCvId] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  const usableCvs = (cvsQuery.data ?? []).filter((cv) => cv.hasText);
  const cvId =
    usableCvs.find((cv) => cv.id === chosenCvId)?.id ??
    (usableCvs.find((cv) => cv.isPrimary) ?? usableCvs[0])?.id ??
    null;
  const cvItems = usableCvs.map((cv) => ({ value: cv.id, label: cvOptionLabel(cv, t("coverLetter.primarySuffix")) }));

  const skipQuotaReason = skipReason ? extractAiQuotaReasonFromError({ code: skipReason }) : null;
  const errorQuotaReason =
    mutation.error instanceof ApiError ? extractAiQuotaReasonFromError(mutation.error.details) : null;
  const quotaReason = resolveAiQuotaReason(aiUsage.data, "COVER_LETTER") ?? skipQuotaReason ?? errorQuotaReason;
  const showMissingCvReason = skipReason === "NO_CV_TEXT" || skipReason === "CV_NOT_FOUND";

  function handleGenerate() {
    if (mutation.isPending || cvId === null) return;

    setSkipReason(null);
    setConfirmingReplace(false);
    mutation.mutate(
      {
        vacancyText: jobPostingText,
        company: company.trim() === "" ? null : company.trim(),
        position: position.trim() === "" ? null : position.trim(),
        cvId,
      },
      {
        onSuccess: (result) => {
          if (result.status === "ok") {
            setLetter(result.letter);
          } else {
            setSkipReason(result.reason);
          }
        },
      },
    );
  }

  function commit() {
    if (letter === null) return;
    onUse(letter);
    toast.success(t("coverLetter.inserted"));
    onClose();
  }

  function handleUse() {
    if (letter === null) return;
    if (currentLetter.trim() !== "") {
      setConfirmingReplace(true);
      return;
    }
    commit();
  }

  function renderCvArea() {
    if (cvsQuery.isPending) {
      return <p className="text-sm text-muted-foreground">{t("coverLetter.loadingCvs")}</p>;
    }
    if (cvsQuery.isError) {
      return (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          <span>{t("coverLetter.cvsFailed")}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => cvsQuery.refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      );
    }
    if (usableCvs.length === 0) {
      return (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p>{(cvsQuery.data ?? []).length === 0 ? t("coverLetter.noCv") : t("coverLetter.noCvText")}</p>
          <Link href="/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("coverLetter.openProfile")}
          </Link>
        </div>
      );
    }
    return (
      <Field>
        <FieldLabel htmlFor={cvSelectId}>{t("coverLetter.cvLabel")}</FieldLabel>
        <Select
          value={cvId ?? ""}
          items={cvItems}
          disabled={mutation.isPending}
          onValueChange={(next) => {
            if (next) setChosenCvId(next);
          }}
        >
          <SelectTrigger id={cvSelectId} className="h-11 w-full sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cvItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    );
  }

  const canGenerate = aiAccessStatus === AiAccessStatus.APPROVED && !quotaReason && cvId !== null;

  return (
    <div className="flex flex-col gap-4">
      {aiAccessStatus !== AiAccessStatus.APPROVED ? (
        <AiAccessNotice status={aiAccessStatus} />
      ) : (
        <>
          {renderCvArea()}
          {quotaReason && aiUsage.data ? (
            <AiQuotaNotice
              reason={quotaReason}
              quota={quotaForReason(aiUsage.data, quotaReason)}
              resetAt={aiUsage.data.resetAt}
            />
          ) : (
            canGenerate && (
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant={letter === null ? "default" : "outline"}
                  className="h-11 self-start sm:h-9"
                  disabled={mutation.isPending}
                  aria-busy={mutation.isPending}
                  onClick={handleGenerate}
                >
                  {mutation.isPending ? (
                    <>
                      <LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
                      {t("coverLetter.generating")}
                    </>
                  ) : letter === null ? (
                    t("coverLetter.generate")
                  ) : (
                    t("coverLetter.regenerate")
                  )}
                </Button>
                {aiUsage.data && (
                  <p className="text-xs text-muted-foreground">
                    {t("coverLetter.usage", {
                      used: aiUsage.data.coverLetter.used,
                      limit: aiUsage.data.coverLetter.limit,
                    })}
                  </p>
                )}
              </div>
            )
          )}
        </>
      )}

      <div aria-live="polite" className="flex flex-col gap-2">
        {mutation.isError && !quotaReason && (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(t, mutation.error, "coverLetter.failed")}
          </p>
        )}
        {skipReason && !skipQuotaReason && (
          <p role="alert" className="text-sm text-destructive">
            {t(skipReasonMessageKey(skipReason))}
          </p>
        )}
        {showMissingCvReason && (
          <Link href="/profile" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start")}>
            {t("coverLetter.openProfile")}
          </Link>
        )}
        {letter !== null && (
          <Field>
            <FieldLabel htmlFor={letterId}>{t("coverLetter.result")}</FieldLabel>
            <Textarea
              id={letterId}
              readOnly
              value={letter}
              aria-busy={mutation.isPending}
              className="max-h-[40dvh] min-h-48 transition-opacity motion-reduce:transition-none data-[busy=true]:opacity-60"
              data-busy={mutation.isPending}
            />
          </Field>
        )}
      </div>

      {confirmingReplace ? (
        <div role="group" aria-labelledby={`${letterId}-replace`} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <p id={`${letterId}-replace`} className="text-sm font-medium">
              {t("coverLetter.replaceTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{t("coverLetter.replaceDescription")}</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" autoFocus onClick={() => setConfirmingReplace(false)}>
              {t("coverLetter.replaceCancel")}
            </Button>
            <Button type="button" onClick={commit}>
              {t("coverLetter.replaceConfirm")}
            </Button>
          </div>
        </div>
      ) : (
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t("common.close")}</DialogClose>
          {letter !== null && (
            <Button type="button" disabled={mutation.isPending} onClick={handleUse}>
              {t("coverLetter.use")}
            </Button>
          )}
        </DialogFooter>
      )}
    </div>
  );
}
