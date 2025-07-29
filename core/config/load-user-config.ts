import path from "path";
import { pathToFileURL } from "url";
import type { TE2EAutogenConfig } from "./types";

const loadUserConfig = async (
  configPath?: string
): Promise<TE2EAutogenConfig> => {
  const resolvedPath = path.resolve(configPath ?? "e2e-autogen.config.ts");

  try {
    const module = await import(pathToFileURL(resolvedPath).href);
    if (!module?.default) throw new Error("No default export in config");
    return module.default as TE2EAutogenConfig;
  } catch (err) {
    throw new Error(
      `[E2EAutogen] Failed to load config from ${resolvedPath}: ${
        (err as Error).message
      }`
    );
  }
};

export { loadUserConfig };
