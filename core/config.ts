export const DEFAULT_DIRECTORIES = {
  generatedStub: "./playwright/__generated-stub__",
  credentials: "./playwright/.auth/credentials.json",
} as const;

export type TResultStatus =
  | "pass"
  | "fail"
  | "flaky"
  | "not_executed"
  | "manual_only";
