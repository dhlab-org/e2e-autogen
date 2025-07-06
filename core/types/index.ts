export type TScenarioData = {
  scenarioId: string;
  scenario: string;
  steps: TStepData[];
};

export type TStepData = {
  testId: string;
  uiPath: string;
  when: string;
  then: string;
};

// ===== 에러 관련 타입 =====
export type TValidationError = {
  type: "MISSING_FIELD" | "INVALID_FORMAT" | "EMPTY_ARRAY" | "INVALID_TYPE";
  message: string;
  index?: number;
  field?: string;
};

export type TProcessingError = {
  type:
    | "FILE_READ"
    | "JSON_PARSE"
    | "VALIDATION"
    | "FILE_WRITE"
    | "DIRECTORY_CREATE";
  message: string;
  filePath?: string;
  originalError?: Error;
};

// ===== 유틸리티 타입 =====
export type TFileExtension = ".json" | ".ts" | ".spec.ts";

export type TDirectoryStructure = {
  root: string;
  scenarios: string;
  generated: string;
  playwright: string;
};

// ===== 상수 =====
export const DEFAULT_DIRECTORIES: TDirectoryStructure = {
  root: ".",
  scenarios: "./scenarios",
  generated: "./__generated__",
  playwright: "./__generated__/playwright",
} as const;
