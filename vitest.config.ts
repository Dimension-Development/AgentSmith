import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      // Next.js-only marker package; irrelevant under vitest (Node).
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname),
    },
  },
});
