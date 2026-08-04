"use client";

import { useState, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/overlay/unsaved-changes-dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type ChangeEventDetails = { cancel: () => void };

type ResponsiveApplicationOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isDirty?: boolean;
  isPending?: boolean;
  children: ReactNode;
  contentClassName?: string;
  /**
   * Below the desktop breakpoint, present as a full-screen app screen (compact header,
   * single scroll area) instead of the default bottom sheet. Desktop is unaffected.
   */
  mobileFullScreen?: boolean;
  /**
   * On desktop, "side-panel" presents a right-aligned Game Hub workspace instead of the
   * centered dialog. Mobile presentation is unaffected either way.
   */
  desktopPresentation?: "dialog" | "side-panel";
};

/**
 * One shared overlay: a centered dialog on desktop, a bottom drawer on mobile.
 * Both presentations reuse the same children — only the chrome differs. Closing
 * is guarded: a pending mutation blocks dismissal outright, and unsaved changes
 * route through a confirmation dialog instead of closing immediately.
 */
export function ResponsiveApplicationOverlay({
  open,
  onOpenChange,
  title,
  description,
  isDirty = false,
  isPending = false,
  children,
  contentClassName,
  mobileFullScreen = false,
  desktopPresentation = "dialog",
}: ResponsiveApplicationOverlayProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  function handlePrimitiveOpenChange(nextOpen: boolean, eventDetails?: ChangeEventDetails) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    if (isPending) {
      eventDetails?.cancel();
      return;
    }
    if (isDirty) {
      eventDetails?.cancel();
      setConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      {isDesktop && desktopPresentation === "side-panel" ? (
        <Dialog open={open} onOpenChange={handlePrimitiveOpenChange}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "top-0 right-0 left-auto flex flex-col h-[100dvh] max-h-[100dvh] w-[clamp(560px,88vw,720px)] max-w-none sm:max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0 ring-0 duration-200 data-open:slide-in-from-right-[100%] data-open:zoom-in-100 data-closed:slide-out-to-right-[100%] data-closed:zoom-out-100 motion-reduce:animate-none",
              contentClassName,
            )}
          >
            <div
              data-job-tracker-theme="game-hub"
              className="flex h-full min-h-0 flex-col border-l border-[var(--gh-border-strong)] bg-[var(--gh-surface)] text-[var(--gh-text)] shadow-[0_16px_44px_-18px_oklch(0.24_0.06_45_/_0.45)]"
            >
              <div className="flex shrink-0 items-center justify-end border-b border-[var(--gh-border)] px-3 py-2">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                {description && <DialogDescription className="sr-only">{description}</DialogDescription>}
                <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
                  <XIcon />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            </div>
          </DialogContent>
        </Dialog>
      ) : isDesktop ? (
        <Dialog open={open} onOpenChange={handlePrimitiveOpenChange}>
          <DialogContent className={cn("max-h-[85vh] overflow-y-auto sm:max-w-lg", contentClassName)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      ) : mobileFullScreen ? (
        <Dialog open={open} onOpenChange={handlePrimitiveOpenChange}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              "inset-0 flex h-[100dvh] max-h-[100dvh] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0",
              contentClassName,
            )}
          >
            <div
              className="flex shrink-0 items-center gap-1 border-b bg-popover px-2 pb-3"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogClose>
              <DialogTitle className="text-base font-medium">{title}</DialogTitle>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {children}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={handlePrimitiveOpenChange}>
          <DrawerContent className={cn("max-h-[92dvh]", contentClassName)}>
            <DrawerHeader className="relative pt-[max(1rem,env(safe-area-inset-top))] pr-12">
              <DrawerTitle>{title}</DrawerTitle>
              {description && <DrawerDescription>{description}</DrawerDescription>}
              <DrawerClose
                render={<Button variant="ghost" size="icon-sm" className="absolute top-3 right-3" />}
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DrawerClose>
            </DrawerHeader>
            <div
              className="min-h-0 flex-1 overflow-y-auto px-4 pt-2"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <UnsavedChangesDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirmDiscard={handleConfirmDiscard}
      />
    </>
  );
}
