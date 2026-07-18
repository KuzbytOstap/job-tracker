"use client";

import { useState, type ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      {isDesktop ? (
        <Dialog open={open} onOpenChange={handlePrimitiveOpenChange}>
          <DialogContent className={cn("max-h-[85vh] overflow-y-auto sm:max-w-lg", contentClassName)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            {children}
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
