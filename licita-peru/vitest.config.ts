import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://licita:licita_dev@127.0.0.1:5432/licita_test",
      STORAGE_DRIVER: "local",
      STORAGE_DIR: path.join(os.tmpdir(), "licita-test-storage"),
      AUTO_MIGRATE: "0",
    },
  },
});
