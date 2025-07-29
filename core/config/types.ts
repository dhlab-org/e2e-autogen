export type TE2EAutogenConfig = {
  sheetsUrl: string;
  framework: TSupportedFramework;
  stubOutputFolder: string;
  jsonReporterFile: string;
  credentialsFile: string;
  googleSheetColumns: TGoogleSheetColumns;
};

export type TGoogleSheetColumns = {
  scenarioId: string;
  scenarioDescription: string;
  uiPath: string;
  when: string;
  then: string;
  testId: string;
  tag: string;
  comment: string;
};

type TSupportedFramework = "playwright" | "detox";

// -----

export type TResultStatus =
  | "pass"
  | "fail"
  | "flaky"
  | "not_executed"
  | "manual_only";

export const COLUMN_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  I: 8,
  J: 9,
  K: 10,
  L: 11,
  M: 12,
  N: 13,
  O: 14,
  P: 15,
  Q: 16,
  R: 17,
  S: 18,
  T: 19,
  U: 20,
  V: 21,
  W: 22,
  X: 23,
  Y: 24,
  Z: 25,
} as const;
