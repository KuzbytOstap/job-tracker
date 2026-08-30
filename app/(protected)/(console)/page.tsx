import { BoardShell } from "@/components/board/board-shell";
import { getAdminCheckForRequest } from "@/lib/admin/require-admin";

export default async function Home() {
  const admin = await getAdminCheckForRequest();
  return <BoardShell isAdmin={admin.status === "authorized"} />;
}
