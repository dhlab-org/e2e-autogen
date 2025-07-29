import type { TE2EAutogenConfig } from "./config";

const defineConfig = (config: TUserConfig): TE2EAutogenConfig => {
  return {
    framework: config.framework ?? "playwright",
    sheetsUrl: config.sheetsUrl,
    stubOutputFolder:
      config.stubOutputFolder ?? "./playwright/__generated-stub__",
    jsonReporterFile:
      config.jsonReporterFile ?? "./playwright/e2e-autogen-reporter.json",
    credentialsFile:
      config.credentialsFile ?? "./playwright/.auth/credentials.json",
    googleSheetColumns: config.googleSheetColumns ?? {
      scenarioId: "A",
      scenarioDescription: "B",
      uiPath: "C",
      when: "D",
      then: "E",
      testId: "F",
      tag: "G",
      comment: "H",
    },
  };
};

export default defineConfig;

type TUserConfig = {
  sheetsUrl: string;
  framework?: "playwright" | "detox";
  stubOutputFolder?: string;
  jsonReporterFile?: string;
  credentialsFile?: string;
  googleSheetColumns?: TE2EAutogenConfig["googleSheetColumns"];
};
