import { BoardShell } from "@/components/board/board-shell";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function Home() {
  const admin = await requireAdmin();
  return <BoardShell isAdmin={admin.status === "authorized"} />;
}
