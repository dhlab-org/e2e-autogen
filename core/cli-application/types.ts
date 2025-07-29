import { TE2EAutogenConfig } from "../config";

export type TFlag = "HELP" | "VERSION";
export type TSubCommand = "GENERATE" | "UPDATE";

export type TGenerateOptions = Pick<
  TE2EAutogenConfig,
  "sheetsUrl" | "credentialsFile" | "stubOutputFolder" | "framework"
>;

export type TUpdateOptions = Pick<
  TE2EAutogenConfig,
  "sheetsUrl" | "credentialsFile" | "jsonReporterFile"
>;
