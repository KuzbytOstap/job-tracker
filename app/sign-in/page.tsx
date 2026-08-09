import { redirect } from "next/navigation";
import { LogIn, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const accessDenied = error === "AccessDenied";

  return (
    <div
      data-job-tracker-theme="game-hub"
      className="relative isolate flex min-h-dvh flex-col xl:flex-row"
    >
      <div className="gh-signin-bg absolute inset-0 z-0" aria-hidden="true" />

      <div
        className="gh-signin-visual relative z-10 hidden items-center justify-center overflow-hidden xl:flex xl:w-[58%]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 320 320" className="h-auto w-full max-w-[440px] px-12" focusable="false">
          <defs>
            <radialGradient id="ghSigninGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--gh-core-glow)" />
              <stop offset="100%" stopColor="var(--gh-core-glow)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="160" r="120" fill="url(#ghSigninGlow)" className="gh-signin-core-glow" />
          <g className="gh-signin-orbit">
            <ellipse
              cx="160"
              cy="160"
              rx="138"
              ry="56"
              transform="rotate(-18 160 160)"
              fill="none"
              stroke="var(--gh-ring-front-glow)"
              strokeWidth="1.5"
            />
            <ellipse
              cx="160"
              cy="160"
              rx="150"
              ry="38"
              transform="rotate(22 160 160)"
              fill="none"
              stroke="var(--gh-ring-mid)"
              strokeWidth="1"
            />
            <circle cx="248" cy="128" r="3.5" fill="var(--gh-particle)" />
            <circle cx="86" cy="196" r="2.5" fill="var(--gh-particle)" />
            <circle cx="214" cy="222" r="2" fill="var(--gh-particle)" />
          </g>
          <polygon points="160,92 208,160 160,228" fill="var(--gh-core-facet-rear)" />
          <polygon points="160,92 112,160 160,228" fill="var(--gh-core-facet-front)" />
          <polygon points="160,92 178,118 160,142 142,118" fill="var(--gh-core-facet-front-dim)" />
          <polygon points="160,92 172,104 160,116 148,104" fill="var(--gh-core-edge-highlight)" opacity="0.85" />
          <circle cx="160" cy="160" r="5" fill="var(--gh-core-energy-core)" />
        </svg>
      </div>

      <main
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 xl:w-[42%] xl:flex-none xl:px-10"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="gh-signin-surface w-full max-w-[420px]">
          <div className="gh-signin-fade flex items-center gap-3" style={{ animationDelay: "0ms" }}>
            <div className="gh-signin-mark" aria-hidden="true">
              <span>J</span>
            </div>
            <h1 className="gh-signin-title font-heading text-xl font-medium">Job Tracker</h1>
          </div>

          <p
            className="gh-signin-fade gh-signin-description mt-3 text-sm"
            style={{ animationDelay: "30ms" }}
          >
            This tracker is private. Sign in with the Google account it&apos;s configured for.
          </p>

          {accessDenied && (
            <p
              role="alert"
              className="gh-signin-fade gh-signin-error mt-4 text-sm"
              style={{ animationDelay: "60ms" }}
            >
              <ShieldAlert className="size-4" aria-hidden="true" />
              <span>Access denied — this app is restricted to one account.</span>
            </p>
          )}

          <form
            className="gh-signin-fade mt-5"
            style={{ animationDelay: "90ms" }}
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
        </div>
      </main>
    </div>
  );
}
