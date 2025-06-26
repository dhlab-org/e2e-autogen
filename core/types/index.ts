export type TTestCase = {
  testId: string;
  path: string;
  description: string;
  given: string;
  when: string;
  then: string;
};

export type TTestGroup = {
  group: string;
  sheetId: string;
  screenId: string;
  tests: TTestCase[];
};

export type TScenarioData = {
  group: string;
  sheetId: string;
  screenId: string;
  tests: TTestCase[];
};

export type TGeneratedTest = {
  group: string;
  screenId: string;
  testCases: TTestCase[];
};

// ===== 원본 JSON 데이터 타입 (Google Sheets 변환 결과) =====
export type TRawTestData = {
  screenId: string;
  group: string;
  testId: string;
  path: string;
  description: string;
  given: string;
  when: string;
  then: string;
};

export type TTestFileInfo = {
  fileName: string;
  filePath: string;
  screenId: string;
  sheetId: string;
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

export const VALIDATION_MESSAGES = {
  MISSING_GROUP: "그룹 필드가 필요합니다",
  MISSING_SHEET_ID: "sheetId 필드가 필요합니다",
  MISSING_SCREEN_ID: "screenId 필드가 필요합니다",
  INVALID_TESTS_ARRAY: "tests 필드는 배열이어야 합니다",
  MISSING_TEST_ID: "testId 필드가 필요합니다",
  MISSING_PATH: "path 필드가 필요합니다",
  MISSING_DESCRIPTION: "description 필드가 필요합니다",
  MISSING_GIVEN: "given 필드가 필요합니다",
  MISSING_WHEN: "when 필드가 필요합니다",
  MISSING_THEN: "then 필드가 필요합니다",
} as const;

// ===== 최적화 관련 타입 =====
export type TOptimizationOptions = {
  fillEmptyFields: boolean;
  formatTestIds: boolean;
  validateOutput: boolean;
  createBackup: boolean;
};

export type TOptimizationResult = {
  sheetId: string;
  totalScreens: number;
  totalGroups: number;
  totalTests: number;
  scenarios: TScenarioData[];
};

export type TOptimizationSummary = {
  screenId: string;
  groupCount: number;
  testCount: number;
  groups: Array<{
    name: string;
    testCount: number;
  }>;
};
