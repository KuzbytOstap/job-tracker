import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin · Job Tracker",
};

export default async function AdminPage() {
  const admin = await requireAdmin();

  if (admin.status === "unauthenticated") {
    redirect("/sign-in");
  }
  if (admin.status === "forbidden") {
    redirect("/");
  }

  return <AdminShell />;
}
