import { exec } from "child_process";
import path from "path";
import { pathToFileURL } from "url";
import { promisify } from "util";
import type { TE2EAutogenConfig } from "./types";

const execAsync = promisify(exec);

const loadUserConfig = async (
  configPath?: string
): Promise<TE2EAutogenConfig> => {
  const resolvedPath = path.resolve(configPath ?? "e2e-autogen.config.ts");

  try {
    // TypeScript 파일인 경우 tsx로 실행
    if (resolvedPath.endsWith(".ts")) {
      // tsx로 TypeScript 파일 실행
      const { stdout } = await execAsync(
        `tsx -e "import('${resolvedPath}').then(m => console.log(JSON.stringify(m.default)))"`
      );
      const config = JSON.parse(stdout.trim());
      return config.default as TE2EAutogenConfig;
    } else {
      // JavaScript 파일인 경우 직접 import
      const module = await import(pathToFileURL(resolvedPath).href);
      if (!module?.default) throw new Error("No default export in config");
      return module.default as TE2EAutogenConfig;
    }
  } catch (err) {
    throw new Error(
      `[E2EAutogen] Failed to load config from ${resolvedPath}: ${
        (err as Error).message
      }`
    );
  }
};

export { loadUserConfig };
