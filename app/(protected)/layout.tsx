import { redirect } from "next/navigation";
import { checkSession } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const check = await checkSession();
  if (check.status !== "authorized") {
    redirect("/sign-in");
  }
  return <>{children}</>;
}
