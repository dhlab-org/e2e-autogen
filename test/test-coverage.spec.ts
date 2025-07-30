import { describe, it, expect } from "vitest";
import { TestCoverage } from "@core/test-coverage";
import { TResultStatus } from "@core/test-registry";

type TTestSuiteId = string;
type TTestCaseId = string;
type TResultsPerSuite = Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>;

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
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "pass" as TResultStatus],
            ["TC-1.2.1", "pass" as TResultStatus],
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
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "fail" as TResultStatus],
            ["TC-1.1.3", "flaky" as TResultStatus],
            ["TC-1.2.1", "not_executed" as TResultStatus],
            ["TC-1.2.2", "manual_only" as TResultStatus],
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
            ["TC-1.1.1", "not_executed" as TResultStatus],
            ["TC-1.1.2", "manual_only" as TResultStatus],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 1,
        testCaseCount: 2,
        coverage: 0,
        passRate: 0,
        statusCounts: {
          pass: 0,
          fail: 0,
          flaky: 0,
          not_executed: 1,
          manual_only: 1,
        },
      });
    });
  });

  describe("다중 스위트 테스트", () => {
    it("여러 스위트의 다양한 상태 조합", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "pass" as TResultStatus],
            ["TC-1.2.1", "fail" as TResultStatus],
          ]),
        ],
        [
          "TC-2",
          new Map([
            ["TC-2.1.1", "flaky" as TResultStatus],
            ["TC-2.2.1", "not_executed" as TResultStatus],
            ["TC-2.2.2", "manual_only" as TResultStatus],
          ]),
        ],
        ["TC-3", new Map([["TC-3.1.1", "pass" as TResultStatus]])],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 3,
        scenarioCount: 5, // TC-1.1, TC-1.2, TC-2.1, TC-2.2, TC-3.1
        testCaseCount: 7,
        coverage: 71.43, // 5실행 / 7전체 = 5/7 = 71.43%
        passRate: 80, // 4성공 / 5실행 = 4/5 = 80%
        statusCounts: {
          pass: 3,
          fail: 1,
          flaky: 1,
          not_executed: 1,
          manual_only: 1,
        },
      });
    });
  });

  describe("summaryPerSuite - TC-x 별 요약", () => {
    it("각 스위트별 통계가 올바르게 계산되는지", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "fail" as TResultStatus],
            ["TC-1.2.1", "not_executed" as TResultStatus],
          ]),
        ],
        [
          "TC-2",
          new Map([
            ["TC-2.1.1", "pass" as TResultStatus],
            ["TC-2.1.2", "pass" as TResultStatus],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summaryPerSuite } = coverage.results();

      expect(summaryPerSuite).toHaveLength(2);

      const tc1Summary = summaryPerSuite.find((s) => s.suiteId === "TC-1");
      expect(tc1Summary).toEqual({
        suiteId: "TC-1",
        scenarioCount: 2, // TC-1.1, TC-1.2
        testCaseCount: 3,
        coverage: 66.67, // (pass+fail)/전체 = 2/3 = 66.67%
        passRate: 50, // (pass)/실행 = 1/2 = 50%
        statusCounts: {
          pass: 1,
          fail: 1,
          flaky: 0,
          not_executed: 1,
          manual_only: 0,
        },
      });

      const tc2Summary = summaryPerSuite.find((s) => s.suiteId === "TC-2");
      expect(tc2Summary).toEqual({
        suiteId: "TC-2",
        scenarioCount: 1, // TC-2.1
        testCaseCount: 2,
        coverage: 100, // 2실행 / 2전체 = 100%
        passRate: 100, // 2성공 / 2실행 = 100%
        statusCounts: {
          pass: 2,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });
  });

  describe("summaryPerExecution - 실행 이력 요약", () => {
    it("실행 시점 정보가 포함된 전체 요약", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "fail" as TResultStatus],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summaryPerExecution } = coverage.results();

      expect(summaryPerExecution.executedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      ); // ISO 형식

      expect(summaryPerExecution).toEqual({
        executedAt: expect.any(String),
        scenarioCount: 1,
        testCaseCount: 2,
        coverage: 100,
        passRate: 50,
        statusCounts: {
          pass: 1,
          fail: 1,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });
  });

  describe("시나리오 ID 추출 테스트", () => {
    it("복잡한 테스트 케이스 ID에서 시나리오 ID 추출", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", "pass" as TResultStatus],
            ["TC-1.1.2", "pass" as TResultStatus],
            ["TC-1.2.1", "pass" as TResultStatus],
            ["TC-1.10.1", "pass" as TResultStatus], // 두 자리 숫자
            ["TC-1.10.2", "pass" as TResultStatus],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary.scenarioCount).toBe(3); // TC-1.1, TC-1.2, TC-1.10
    });
  });

  describe("엣지 케이스", () => {
    it("단일 테스트 케이스만 있는 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        ["TC-1", new Map([["TC-1.1.1", "pass" as TResultStatus]])],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary).toEqual({
        totalSuites: 1,
        scenarioCount: 1,
        testCaseCount: 1,
        coverage: 100,
        passRate: 100,
        statusCounts: {
          pass: 1,
          fail: 0,
          flaky: 0,
          not_executed: 0,
          manual_only: 0,
        },
      });
    });

    it("모든 테스트가 실패한 경우", () => {
      const mockData: TResultsPerSuite = new Map([
        [
          "TC-1",
          new Map([
            ["TC-1.1.1", "fail" as TResultStatus],
            ["TC-1.1.2", "fail" as TResultStatus],
          ]),
        ],
      ]);

      const coverage = new TestCoverage(mockData);
      const { summary } = coverage.results();

      expect(summary.coverage).toBe(100); // 모두 실행됨
      expect(summary.passRate).toBe(0); // 모두 실패
    });
  });
});
