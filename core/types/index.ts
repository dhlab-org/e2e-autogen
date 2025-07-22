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

// ===== 디렉토리 구조 =====
type TDirectoryStructure = {
  generatedStub: string;
  credentials: string;
};

export const DEFAULT_DIRECTORIES: TDirectoryStructure = {
  generatedStub: "./playwright/__generated-stub__",
  credentials: "./playwright/.auth/credentials.json",
} as const;
