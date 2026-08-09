import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type Session } from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

export type SessionCheck =
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "authorized"; session: Session };

export function evaluateSession(session: Session | null): SessionCheck {
  if (!session) return { status: "unauthenticated" };
  return { status: "authorized", session };
}

export async function checkSession(): Promise<SessionCheck> {
  const session = await auth();
  return evaluateSession(session);
}
