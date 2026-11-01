import { redirect } from "next/navigation";
import { checkSession } from "@/lib/auth";
import { AutoIgnoreDaysProvider } from "@/components/applications/auto-ignore-days-context";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const check = await checkSession();
  if (check.status !== "authorized") {
    redirect("/sign-in");
  }
  return <AutoIgnoreDaysProvider>{children}</AutoIgnoreDaysProvider>;
}
