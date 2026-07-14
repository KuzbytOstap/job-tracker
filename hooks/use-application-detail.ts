"use client";

import { useCallback, useState } from "react";
import type { ApplicationDTO } from "@/lib/api-types";

export function useApplicationDetailState() {
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDTO | null>(null);
  const [open, setOpen] = useState(false);

  const openDetail = useCallback((application: ApplicationDTO) => {
    setSelectedApplication(application);
    setOpen(true);
  }, []);

  return { selectedApplication, open, setOpen, openDetail };
}
