"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
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

  const displayedRef = useRef({ title, description, confirmLabel, cancelLabel, destructive, intent });
  if (open) {
    displayedRef.current = { title, description, confirmLabel, cancelLabel, destructive, intent };
  }
  const shown = displayedRef.current;
  const IntentIcon = INTENT_ICON[shown.intent];

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent
        overlayClassName={isGameHub ? "sm:z-[60]" : undefined}
        className={cn(
          isGameHub &&
            "sm:z-[60] sm:w-[400px] data-[size=default]:sm:max-w-[400px] sm:rounded-xl sm:border sm:border-[var(--gh-border-strong)] sm:bg-[var(--gh-surface)] sm:text-[var(--gh-text)] sm:shadow-[var(--gh-dock-panel-shadow)] sm:data-open:duration-[var(--gh-duration-standard)] sm:data-open:ease-[var(--gh-ease-entrance)] sm:data-open:zoom-in-98 sm:data-closed:duration-[var(--gh-duration-fast)] sm:data-closed:ease-[var(--gh-ease-exit)] sm:data-closed:zoom-out-98 sm:motion-reduce:zoom-in-100 sm:motion-reduce:zoom-out-100 sm:motion-reduce:duration-0",
        )}
      >
        <AlertDialogHeader>
          {isGameHub && (
            <AlertDialogMedia className={cn("hidden sm:inline-flex", INTENT_MEDIA_CLASSNAME[shown.intent])}>
              <IntentIcon aria-hidden="true" />
            </AlertDialogMedia>
          )}
          <AlertDialogTitle className={isGameHub ? "sm:text-[var(--gh-text)]" : undefined}>
            {shown.title}
          </AlertDialogTitle>
          <AlertDialogDescription className={isGameHub ? "sm:text-[var(--gh-text-secondary)]" : undefined}>
            {shown.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          className={
            isGameHub
              ? "sm:border-[var(--gh-border)] sm:bg-[var(--gh-surface-secondary)] sm:rounded-b-xl"
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
            {shown.cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={shown.destructive ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending}
            onClick={onConfirm}
            className={cn(
              shown.destructive &&
                "bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive focus-visible:ring-destructive/30",
              isGameHub &&
                (shown.destructive
                  ? "sm:hover:bg-destructive/90"
                  : "sm:bg-[var(--gh-accent)] sm:text-[oklch(0.99_0.01_85)] sm:hover:bg-[var(--gh-accent-secondary)]"),
            )}
          >
            {pending ? "Working…" : shown.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
