"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AddApplicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddApplicationDialog({ open, onOpenChange }: AddApplicationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add application</DialogTitle>
          <DialogDescription>
            The full form is coming soon. This placeholder keeps the add flow wired up.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
