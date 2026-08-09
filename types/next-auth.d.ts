import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The persistent Auth.js user id (`User.id` / JWT `sub`). */
      id: string;
    } & DefaultSession["user"];
  }
}
