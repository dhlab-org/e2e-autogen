import { TResultStatus, TTestSuiteId } from "./types";

type TTestCaseId = string;

type JudgeContract = {
  resultsPerSuite(
    playwrightJson: any
  ): Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>;

  labelOf(result: TResultStatus): string;
};

class Judge implements JudgeContract {
  resultsPerSuite(playwrightJson: any) {
    const resultPerTestCase = this.#resultPerTestCase(playwrightJson);

    return Array.from(resultPerTestCase).reduce(
      (suiteMap, [testId, status]) => {
        const suiteId = testId.split(".")[0];
        const bucket = suiteMap.get(suiteId) ?? new Map();
        bucket.set(testId, status);
        suiteMap.set(suiteId, bucket);
        return suiteMap;
      },
      new Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>()
    );
  }

  #resultPerTestCase(json: any): Map<TTestCaseId, TResultStatus> {
    const statsPerTestId = new Map<
      TTestCaseId,
      { run: number; error: number; skip: number }
    >();

    const traverseSuites = (suites: any[]) => {
      for (const suite of suites ?? []) {
        if (suite.specs) suite.specs.forEach(parseSpec);
        if (suite.suites) traverseSuites(suite.suites);
      }
    };

    const parseSpec = (spec: any) => {
      for (const test of spec.tests ?? []) {
        for (const attempt of test.results ?? []) {
          for (const step of attempt.steps ?? []) {
            const match = (step.title ?? "").match(/\[(TC-[^\]]+)\]/);
            if (!match) continue;
            const testId = match[1] as TTestCaseId;

            const counter = statsPerTestId.get(testId) || {
              run: 0,
              error: 0,
              skip: 0,
            };

            if (step.skip) {
              counter.skip += 1;
            } else {
              counter.run += 1;
              if (step.error) counter.error += 1;
            }

            statsPerTestId.set(testId, counter);
          }
        }
      }
    };

    traverseSuites(json.suites ?? []);

    // 결과 결정
    const statusPerTestId = new Map<TTestCaseId, TResultStatus>();
    for (const [testId, stats] of statsPerTestId) {
      let status: TResultStatus;
      if (stats.skip > 0 && stats.run === 0 && stats.error === 0) {
        status = "not_executed";
      } else if (stats.error === 0) {
        status = "pass";
      } else if (stats.error < stats.run) {
        status = "flaky";
      } else {
        status = "fail";
      }
      statusPerTestId.set(testId, status);
    }

    return statusPerTestId;
  }

  labelOf(result: TResultStatus): string {
    const labelMap: Record<TResultStatus, string> = {
      pass: "✅ pass",
      fail: "❌ fail",
      flaky: "⚠️ flaky",
      not_executed: "⏭️ not_executed",
      manual_only: "📝 manual_only",
    };

    return labelMap[result];
  }
}

export { Judge, type JudgeContract };
