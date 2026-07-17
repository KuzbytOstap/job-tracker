import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { checkSession, signIn } from "@/lib/auth";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const check = await checkSession();
  if (check.status === "authorized") {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Job Tracker</CardTitle>
          <CardDescription>
            This tracker is private. Sign in with the Google account it&apos;s configured for.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error === "AccessDenied" && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Access denied — this app is restricted to one account.
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <Button type="submit" className="w-full">
              <LogIn data-icon="inline-start" />
              Sign in with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
