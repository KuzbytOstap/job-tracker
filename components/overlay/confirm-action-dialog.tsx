"use client";

import type { ComponentType, ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmActionDialogVisualVariant = "default" | "gameHub";
type ConfirmActionDialogIntent = "neutral" | "warning" | "destructive";

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  visualVariant?: ConfirmActionDialogVisualVariant;
  intent?: ConfirmActionDialogIntent;
};

const INTENT_ICON: Record<ConfirmActionDialogIntent, ComponentType<{ className?: string }>> = {
  neutral: Info,
  warning: CircleAlert,
  destructive: TriangleAlert,
};

const INTENT_MEDIA_CLASSNAME: Record<ConfirmActionDialogIntent, string> = {
  neutral: "bg-[var(--gh-accent-soft)] text-[var(--gh-accent-secondary)]",
  warning: "bg-[var(--gh-warning)]/15 text-[var(--gh-warning)]",
  destructive: "bg-destructive/10 text-destructive",
};

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  onConfirm,
  visualVariant = "default",
  intent = "neutral",
}: ConfirmActionDialogProps) {
  const isGameHub = visualVariant === "gameHub";
  const IntentIcon = INTENT_ICON[intent];

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent
        overlayClassName={
          isGameHub
            ? "sm:z-[60] sm:duration-[var(--gh-duration-fast)] sm:ease-[var(--gh-ease-standard)] sm:motion-reduce:duration-0"
            : undefined
        }
        className={cn(
          isGameHub &&
            "sm:z-[60] sm:w-[460px] data-[size=default]:sm:max-w-[460px] sm:rounded-2xl sm:border sm:border-[var(--gh-border-strong)] sm:bg-[var(--gh-surface)] sm:text-[var(--gh-text)] sm:ring-0 sm:shadow-[var(--gh-shadow)] sm:data-open:duration-[var(--gh-duration-standard)] sm:data-open:ease-[var(--gh-ease-entrance)] sm:data-open:zoom-in-98 sm:data-closed:duration-[var(--gh-duration-fast)] sm:data-closed:ease-[var(--gh-ease-exit)] sm:data-closed:zoom-out-98 sm:motion-reduce:zoom-in-100 sm:motion-reduce:zoom-out-100 sm:motion-reduce:duration-0",
        )}
      >
        <AlertDialogHeader>
          {isGameHub && (
            <AlertDialogMedia className={cn("hidden sm:inline-flex", INTENT_MEDIA_CLASSNAME[intent])}>
              <IntentIcon aria-hidden="true" />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle className={isGameHub ? "sm:text-[var(--gh-text)]" : undefined}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className={isGameHub ? "sm:text-[var(--gh-text-secondary)]" : undefined}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={
            isGameHub
              ? "sm:border-[var(--gh-border)] sm:bg-[var(--gh-surface-secondary)] sm:rounded-b-2xl"
              : undefined
          }
        >
          <AlertDialogCancel
            disabled={pending}
            className={
              isGameHub
                ? "sm:border-[var(--gh-border-strong)] sm:bg-[var(--gh-surface)] sm:text-[var(--gh-text-secondary)] sm:hover:bg-[var(--gh-surface-secondary)] sm:hover:text-[var(--gh-text)]"
                : undefined
            }
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending}
            onClick={onConfirm}
            className={
              isGameHub && !destructive
                ? "sm:bg-[var(--gh-accent)] sm:text-[oklch(0.99_0.01_85)] sm:hover:bg-[var(--gh-accent-secondary)]"
                : undefined
            }
          >
            {pending ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
