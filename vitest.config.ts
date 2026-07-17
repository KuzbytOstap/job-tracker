import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: {
    jsx: { runtime: "automatic" },
  },
  resolve: {
    conditions: ["node"],
    alias: {
      "next/server": "next/server.js",
    },
  },
  test: {
    environment: "node",
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
    env: {
      // Dummy value so importing lib/auth.ts (which builds the NextAuth
      // config at module-load time) doesn't throw in tests. Not a real
      // credential — never used to sign anything outside this test run.
      AUTH_SECRET: "test-only-secret-not-a-real-credential",
    },
  },
});
