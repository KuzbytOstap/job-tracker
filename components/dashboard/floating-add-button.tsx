"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type FloatingAddButtonProps = {
  onClick: () => void;
};

export function FloatingAddButton({ onClick }: FloatingAddButtonProps) {
  return (
    <motion.div
      className="fixed right-5 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] z-30 sm:hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileTap={{ scale: 0.94 }}
    >
      <Button
        onClick={onClick}
        size="icon-lg"
        aria-label="Add application"
        className="size-13 rounded-full shadow-lg shadow-primary/20"
      >
        <Plus className="size-5" />
      </Button>
    </motion.div>
  );
}
