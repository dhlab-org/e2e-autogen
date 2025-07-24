export type TResultStatus =
  | "pass"
  | "fail"
  | "flaky"
  | "not_executed"
  | "manual_only";

export type TTestSuiteId = string; // TC-x
export type TTestCaseId = string; // TC-x.x.x
