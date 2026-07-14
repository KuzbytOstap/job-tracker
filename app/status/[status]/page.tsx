import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBoardColumnBySlug } from "@/lib/board-columns";
import { FocusedStatusView } from "@/components/board/focused-status-view";

type FocusedStatusPageProps = {
  params: Promise<{ status: string }>;
};

export async function generateMetadata({ params }: FocusedStatusPageProps): Promise<Metadata> {
  const { status } = await params;
  const column = getBoardColumnBySlug(status);

  return {
    title: column ? `${column.label} · Job Tracker` : "Job Tracker",
  };
}

export default async function FocusedStatusPage({ params }: FocusedStatusPageProps) {
  const { status } = await params;
  const column = getBoardColumnBySlug(status);

  if (!column) {
    notFound();
  }

  return <FocusedStatusView slug={column.slug} />;
}
