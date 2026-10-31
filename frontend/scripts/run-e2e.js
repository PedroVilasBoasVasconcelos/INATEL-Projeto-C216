import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const viteConfigPath = fileURLToPath(
  new URL("../vite.config.js", import.meta.url),
);
const playwrightCliPath = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const viteServer = await createServer({
  configFile: viteConfigPath,
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
});

let exitCode = 1;

try {
  await viteServer.listen();
  exitCode = await new Promise((resolve) => {
    const playwright = spawn(
      process.execPath,
      [playwrightCliPath, "test", ...process.argv.slice(2)],
      {
        cwd: process.cwd(),
        env: { ...process.env, E2E_SERVER_RUNNING: "1" },
        stdio: "inherit",
      },
    );

    playwright.on("error", (error) => {
      console.error("Não foi possível iniciar o Playwright:", error);
      resolve(1);
    });
    playwright.on("exit", (code) => resolve(code ?? 1));
  });
} finally {
  await viteServer.close();
}

process.exitCode = exitCode;
