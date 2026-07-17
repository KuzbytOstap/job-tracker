import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && !!process.env.ALLOWED_EMAIL && email === process.env.ALLOWED_EMAIL;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async signIn({ profile }) {
      return isAllowedEmail(profile?.email);
    },
  },
});

export type SessionCheck =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "authorized"; session: Session };

export function evaluateSession(session: Session | null): SessionCheck {
  if (!session) return { status: "unauthenticated" };
  if (!isAllowedEmail(session.user?.email)) return { status: "forbidden" };
  return { status: "authorized", session };
}

export async function checkSession(): Promise<SessionCheck> {
  const session = await auth();
  return evaluateSession(session);
}
