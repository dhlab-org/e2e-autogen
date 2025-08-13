import { describe, expect, it } from "vitest";
import { TestCoverage } from "../core/test-coverage";
import type {
  TResultStatus,
  TResultWithDescription,
} from "../core/test-registry";

type TTestSuiteId = string;
type TTestCaseId = string;
type TResultsPerSuite = Map<
  TTestSuiteId,
  Map<TTestCaseId, TResultWithDescription>
>;

describe("TestCoverage", () => {
  describe("빈 데이터", () => {
    it("빈 resultsPerSuite로 초기화했을 때", () => {
      const emptyData: TResultsPerSuite = new Map();
      const coverage = new TestCoverage(emptyData);

      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 0,
        scenarioCount: 0,
        testCaseCount: 0,
        coverage: 0,
        passRate: 0,
        statusCounts: {
          pass: 0,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });
  });

  describe("단일 스위트 테스트", () => {
    it("모든 테스트가 pass인 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "pass" as TResultStatus }],
            ["TC-1.2.1", { status: "pass" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 3,
        coverage: 100, // 3/3 실행
        passRate: 100, // 3/3 성공
        statusCounts: {
          pass: 3,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });

    it("mixed 상태 (pass, fail, flaky, not_executed)인 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "fail" as TResultStatus }],
            ["TC-1.1.3", { status: "flaky" as TResultStatus }],
            ["TC-1.2.1", { status: "not_executed" as TResultStatus }],
            ["TC-1.2.2", { status: "manual_only" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 5,
        coverage: 60, // (pass+fail+flaky)/전체 = 3/5 = 60%
        passRate: 66.67, // (pass+flaky)/실행 = 2/3 = 66.67%
        statusCounts: {
          pass: 1,
          fail: 1,
          flaky: 1,
          not_executed: 1,
          manual_only: 1,
        },
      });
    });

    it("모든 테스트가 not_executed, manual_only인 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "not_executed" as TResultStatus }],
            ["TC-1.1.2", { status: "manual_only" as TResultStatus }],
            ["TC-1.2.1", { status: "not_executed" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 3,
        coverage: 0, // 실행된 테스트 없음
        passRate: 0, // 실행된 테스트 없음
        statusCounts: {
          pass: 0,
          fail: 0,
          flaky: 0,
          not_executed: 2,
          manual_only: 1,
        },
      });
    });
  });

  describe("다중 스위트 테스트", () => {
    it("여러 스위트의 mixed 상태", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "fail" as TResultStatus }],
            ["TC-1.2.1", { status: "flaky" as TResultStatus }],
          ]),
        ],
        [
          "TC-2",
          new Map([
            ["TC-2.1.1", { status: "pass" as TResultStatus }],
            ["TC-2.1.2", { status: "not_executed" as TResultStatus }],
            ["TC-2.2.1", { status: "manual_only" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 2,
        scenarioCount: 4, // TC-1.1, TC-1.2, TC-2.1, TC-2.2
        testCaseCount: 6,
        coverage: 66.67, // (pass+fail+flaky)/전체 = 4/6 = 66.67%
        passRate: 75, // (pass+flaky)/실행 = 3/4 = 75%
        statusCounts: {
          pass: 2,
          fail: 1,
          flaky: 1,
          not_executed: 1,
          manual_only: 1,
        },
      });
    });
  });

  describe("summaryPerSuite", () => {
    it("단일 스위트의 상세 정보", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "fail" as TResultStatus }],
            ["TC-1.2.1", { status: "flaky" as TResultStatus }],
            ["TC-1.2.2", { status: "not_executed" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summaryPerSuite } = coverage.results();

      expect(summaryPerSuite).toHaveLength(1);
      expect(summaryPerSuite[0]).toEqual({
        suiteId: "TC-1",
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 4,
        coverage: 75, // (pass+fail+flaky)/전체 = 3/4 = 75%
        passRate: 66.67, // (pass+flaky)/실행 = 2/3 = 66.67%
        statusCounts: {
          pass: 1,
          fail: 1,
          flaky: 1,
          not_executed: 1,
          manual_only: 0,
        },
      });
    });

    it("여러 스위트의 상세 정보", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "pass" as TResultStatus }],
          ]),
        ],
        [
          "TC-2",
          new Map([
            ["TC-2.1.1", { status: "fail" as TResultStatus }],
            ["TC-2.1.2", { status: "not_executed" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summaryPerSuite } = coverage.results();

      expect(summaryPerSuite).toHaveLength(2);
      expect(summaryPerSuite[0]).toEqual({
        suiteId: "TC-1",
        scenarioCount: 1, // TC-1.1
        testCaseCount: 2,
        coverage: 100, // 2/2 실행
        passRate: 100, // 2/2 성공
        statusCounts: {
          pass: 2,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
      expect(summaryPerSuite[1]).toEqual({
        suiteId: "TC-2",
        scenarioCount: 1, // TC-2.1
        testCaseCount: 2,
        coverage: 50, // 1/2 실행
        passRate: 0, // 0/1 성공
        statusCounts: {
          pass: 0,
          fail: 1,
          flaky: 0,
          not_executed: 1,
          manual_only: 0,
        },
      });
    });
  });

  describe("summaryPerExecution", () => {
    it("실행 요약 정보", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "pass" as TResultStatus }],
            ["TC-1.1.2", { status: "fail" as TResultStatus }],
            ["TC-1.2.1", { status: "flaky" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summaryPerExecution } = coverage.results();

      expect(summaryPerExecution).toMatchObject({
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 3,
        coverage: 100, // 3/3 실행
        passRate: 66.67, // (pass+flaky)/실행 = 2/3 = 66.67%
        statusCounts: {
          pass: 1,
          fail: 1,
          flaky: 1,
          not_executed: 0,
          manual_only: 0,
        },
      });
      expect(summaryPerExecution.executedAt).toMatch(/^\d{8}:\d{2}:\d{2}$/);
    });
  });

  describe("edge cases", () => {
    it("빈 스위트가 포함된 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        ["TC-1", new Map()],
        ["TC-2", new Map([["TC-2.1.1", { status: "pass" as TResultStatus }]])],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 2,
        scenarioCount: 1, // TC-2.1
        testCaseCount: 1,
        coverage: 100, // 1/1 실행
        passRate: 100, // 1/1 성공
        statusCounts: {
          pass: 1,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });

    it("모든 테스트가 fail인 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", { status: "fail" as TResultStatus }],
            ["TC-1.1.2", { status: "fail" as TResultStatus }],
            ["TC-1.2.1", { status: "fail" as TResultStatus }],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 3,
        coverage: 100, // 3/3 실행
        passRate: 0, // 0/3 성공
        statusCounts: {
          pass: 0,
          fail: 3,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });
  });
});
