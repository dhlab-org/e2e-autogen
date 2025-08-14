import type { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import type {
  TResultStatus,
  TResultWithDescription,
  TTestCaseId,
  TTestSuiteId,
} from "../test-registry";

type TestCoverageContract = {
  update(googleSpreadsheets: GoogleSpreadsheetsContract): Promise<void>;
  results(): TTestCoverageResults;
};

class TestCoverage implements TestCoverageContract {
  readonly #resultsPerSuite: TResultsPerSuite;

  constructor(resultsPerSuite: TResultsPerSuite) {
    this.#resultsPerSuite = resultsPerSuite;
  }

  async update(googleSpreadsheets: GoogleSpreadsheetsContract) {
    const coverageSheet = await googleSpreadsheets.coverageSheet();

    await coverageSheet.updateCoverage(this.results());
  }

  results(): TTestCoverageResults {
    const summary = this.#summary();
    const summaryPerSuite = this.#summaryPerSuite();
    const summaryPerExecution = this.#summaryPerExecution();

    return { summary, summaryPerSuite, summaryPerExecution };
  }

  #summary(): TOverallSummary {
    const aggregated = Array.from(this.#resultsPerSuite.values()).reduce(
      (acc, caseMap) => {
        const suiteStats = this.#calculateSuiteStats(caseMap);
        acc.scenarioCount += suiteStats.scenarioCount;
        acc.testCaseCount += suiteStats.testCaseCount;
        acc.executedCount += suiteStats.executedCount;
        acc.passCount += suiteStats.passCount;
        this.#mergeStatusCounts(acc.statusCounts, suiteStats.statusCounts);
        return acc;
      },
      {
        scenarioCount: 0,
        testCaseCount: 0,
        executedCount: 0,
        passCount: 0,
        statusCounts: this.#emptyStatusCount(),
      }
    );

    return {
      totalSuites: this.#resultsPerSuite.size,
      scenarioCount: aggregated.scenarioCount,
      testCaseCount: aggregated.testCaseCount,
      coverage: this.#calculateCoverage(
        aggregated.executedCount,
        aggregated.testCaseCount
      ),
      passRate: this.#calculatePassRate(
        aggregated.passCount,
        aggregated.executedCount
      ),
      statusCounts: aggregated.statusCounts,
    };
  }

  #summaryPerSuite(): readonly TSuiteSummary[] {
    return Array.from(this.#resultsPerSuite).map(([suiteId, caseMap]) => {
      const stats = this.#calculateSuiteStats(caseMap);
      return {
        suiteId,
        scenarioCount: stats.scenarioCount,
        testCaseCount: stats.testCaseCount,
        coverage: this.#calculateCoverage(
          stats.executedCount,
          stats.testCaseCount
        ),
        passRate: this.#calculatePassRate(stats.passCount, stats.executedCount),
        statusCounts: stats.statusCounts,
      };
    });
  }

  #summaryPerExecution(): TExecutionSummary {
    const summary = this.#summary();
    return {
      executedAt: this.#lastUpdatedAt(),
      scenarioCount: summary.scenarioCount,
      testCaseCount: summary.testCaseCount,
      coverage: summary.coverage,
      passRate: summary.passRate,
      statusCounts: summary.statusCounts,
    };
  }

  #calculateSuiteStats(caseMap: Map<TTestCaseId, TResultWithDescription>) {
    const scenarios = new Set<string>();
    let executedCount = 0;
    let passCount = 0;
    const statusCounts = this.#emptyStatusCount();

    for (const [testCaseId, result] of caseMap) {
      const status = result.status;
      const scenarioId = this.#scenarioIdOf(testCaseId);
      scenarios.add(scenarioId);

      statusCounts[status]++;

      if (this.#isExecuted(status)) {
        executedCount++;
        if (this.#isSuccess(status)) {
          passCount++;
        }
      }
    }

    return {
      scenarioCount: scenarios.size,
      testCaseCount: caseMap.size,
      executedCount,
      passCount,
      statusCounts,
    };
  }

  #calculateCoverage(executedCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return this.#round((executedCount / totalCount) * 100);
  }

  #calculatePassRate(passCount: number, executedCount: number): number {
    if (executedCount === 0) return 0;
    return this.#round((passCount / executedCount) * 100);
  }

  #isExecuted(status: TResultStatus): boolean {
    return status !== "not_executed" && status !== "manual_only";
  }

  #isSuccess(status: TResultStatus): boolean {
    return status === "pass" || status === "flaky";
  }

  #round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  #scenarioIdOf(testCaseId: TTestCaseId): string {
    const parts = testCaseId.split(".");
    return parts.length > 2 ? parts.slice(0, -1).join(".") : testCaseId;
  }

  #lastUpdatedAt(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}${mm}${dd}:${hh}:${mi}`;
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

  #mergeStatusCounts(target: TStatusCount, source: TStatusCount): void {
    (Object.keys(source) as TResultStatus[]).forEach((status) => {
      target[status] += source[status];
    });
  }
}

export { TestCoverage };

export type {
  TExecutionSummary,
  TOverallSummary,
  TSuiteSummary,
  TTestCoverageResults,
  TResultsPerSuite,
};

type TResultsPerSuite = Map<
  TTestSuiteId,
  Map<TTestCaseId, TResultWithDescription>
>;
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

type TTestCoverageResults = {
  summary: TOverallSummary;
  summaryPerSuite: readonly TSuiteSummary[];
  summaryPerExecution: TExecutionSummary;
};
