"use client";

import { useCallback, useState } from "react";

export function useApplicationDetailState() {
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const openDetail = useCallback((applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setOpen(true);
  }, []);

  return { selectedApplicationId, open, setOpen, openDetail };
}
