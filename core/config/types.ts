export type TE2EAutogenConfig = {
  sheetsUrl: string;
  framework: TSupportedFramework;
  stubOutputFolder: string;
  jsonReporterFile: string;
  credentialsFile: string;
  googleSheetColumns: TGoogleSheetColumns;
};

type TGoogleSheetColumns = {
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
