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
  action: string;
  expected: string;
  testId: string;
  tag: string;
  comment: string;
};

type TSupportedFramework = "playwright" | "detox";
