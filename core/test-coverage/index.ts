import { TResultStatus } from "../config";
import { GoogleSpreadsheetsContract } from "../google-spreadsheets";

type TestCoverageContract = {
  update(googleSpreadsheets: GoogleSpreadsheetsContract): Promise<void>;
};

class TestCoverage implements TestCoverageContract {
  readonly #resultsPerSuite: TResultsPerSuite;

  constructor(resultsPerSuite: TResultsPerSuite) {
    this.#resultsPerSuite = resultsPerSuite;
  }

  async update(googleSpreadsheets: GoogleSpreadsheetsContract) {
    const coverageSheet = await googleSpreadsheets.coverageSheet();

    const overall = this.#summaray();
    const summaries = this.#summaryPerSuite();
    const execution = this.#summaryPerExecution();

    console.log("overall", overall);
    console.log("summaries", summaries);
    console.log("execution", execution);

    // await coverageSheet.update(overall, summaries, execution);
  }

  #lastUpdatedAt(): string {
    return new Date().toISOString();
  }

  #summaray(): TOverallSummary {
    const initial = {
      scenarioCount: 0,
      testCaseCount: 0,
      executedCount: 0,
      passCount: 0,
      statusCounts: this.#emptyStatusCount(),
    };

    const aggregated = Array.from(this.#resultsPerSuite.values()).reduce(
      (acc, caseMap) => {
        const scenarios = new Set<string>();

        caseMap.forEach((status, testId) => {
          scenarios.add(this.#scenarioIdOf(testId));
          acc.testCaseCount += 1;
          acc.statusCounts[status] += 1;

          if (status !== "not_executed" && status !== "manual_only") {
            acc.executedCount += 1;
            if (status === "pass") acc.passCount += 1;
          }
        });

        acc.scenarioCount += scenarios.size;
        return acc;
      },
      initial
    );

    const nonExecutable =
      aggregated.statusCounts.not_executed +
      aggregated.statusCounts.manual_only;

    const testableCount = Math.max(0, aggregated.testCaseCount - nonExecutable);

    const coverage =
      testableCount === 0
        ? 0
        : (aggregated.executedCount / testableCount) * 100;
    const passRate =
      aggregated.executedCount === 0
        ? 0
        : (aggregated.passCount / aggregated.executedCount) * 100;

    return {
      totalSuites: this.#resultsPerSuite.size,
      scenarioCount: aggregated.scenarioCount,
      testCaseCount: aggregated.testCaseCount,
      coverage,
      passRate,
      statusCounts: aggregated.statusCounts,
    };
  }

  #suiteSummary(
    suiteId: TTestSuiteId,
    caseMap: Map<TTestCaseId, TResultStatus>
  ): TSuiteSummary {
    const aggregated = Array.from(caseMap.entries()).reduce(
      (acc, [testId, status]) => {
        acc.scenarios.add(this.#scenarioIdOf(testId));
        acc.statusCounts[status] += 1;

        if (status !== "not_executed" && status !== "manual_only") {
          acc.executed += 1;
          if (status === "pass") acc.pass += 1;
        }

        return acc;
      },
      {
        scenarios: new Set<string>(),
        executed: 0,
        pass: 0,
        statusCounts: this.#emptyStatusCount(),
      }
    );

    const testCaseCount = caseMap.size;
    const nonExecutable =
      aggregated.statusCounts.not_executed +
      aggregated.statusCounts.manual_only;

    const testableCount = Math.max(0, testCaseCount - nonExecutable);

    const coverage =
      testableCount === 0 ? 0 : (aggregated.executed / testableCount) * 100;
    const passRate =
      aggregated.executed === 0
        ? 0
        : (aggregated.pass / aggregated.executed) * 100;

    return {
      suiteId,
      scenarioCount: aggregated.scenarios.size,
      testCaseCount,
      coverage,
      passRate,
      statusCounts: aggregated.statusCounts,
    };
  }

  #summaryPerSuite(): readonly TSuiteSummary[] {
    /**
     * 스위트별 상세 요약을 계산한다.
     */
    return Array.from(this.#resultsPerSuite).map(([suiteId, caseMap]) =>
      this.#suiteSummary(suiteId, caseMap)
    );
  }

  #summaryPerExecution(): TExecutionSummary {
    /**
     * 전체 합산 정보를 실행 시점 기준으로 기록한다.
     */
    const overall = this.#summaray();
    return {
      executedAt: this.#lastUpdatedAt(),
      scenarioCount: overall.scenarioCount,
      testCaseCount: overall.testCaseCount,
      coverage: overall.coverage,
      passRate: overall.passRate,
      statusCounts: overall.statusCounts,
    };
  }

  #scenarioIdOf(testCaseId: TTestCaseId): string {
    const parts = testCaseId.split(".");
    return parts.length > 2 ? parts.slice(0, -1).join(".") : testCaseId;
  }

  #emptyStatusCount(): TStatusCount {
    return {
      pass: 0,
      fail: 0,
      flaky: 0,
      not_executed: 0,
      manual_only: 0,
    };
  }
}

export { TestCoverage };

// ====================
// 🔖 Types
// ====================

type TTestSuiteId = string;
type TTestCaseId = string;

type TResultsPerSuite = Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>;

type TStatusCount = Record<TResultStatus, number>;

type TOverallSummary = {
  totalSuites: number;
  scenarioCount: number;
  testCaseCount: number;
  coverage: number; // 0~100
  passRate: number; // 0~100
  statusCounts: TStatusCount;
};

type TSuiteSummary = {
  suiteId: TTestSuiteId;
  scenarioCount: number;
  testCaseCount: number;
  coverage: number;
  passRate: number;
  statusCounts: TStatusCount;
};

type TExecutionSummary = {
  executedAt: string;
  scenarioCount: number;
  testCaseCount: number;
  coverage: number;
  passRate: number;
  statusCounts: TStatusCount;
};
