import { TResultStatus, TResultWithDescription } from "./types";
import { TTestCaseId, TTestSuiteId } from "./types";

type ResultsMatrixContract = {
  resultsPerSuite(
    playwrightJson: any
  ): Map<TTestSuiteId, Map<TTestCaseId, TResultWithDescription>>;
  labelOf(result: TResultStatus): string;
};

class ResultsMatrix implements ResultsMatrixContract {
  resultsPerSuite(playwrightJson: any) {
    const suiteMap = new Map<
      TTestSuiteId,
      Map<TTestCaseId, TResultWithDescription>
    >();

    for (const suite of playwrightJson.suites ?? []) {
      for (const spec of suite.specs ?? []) {
        // 각 결과 배열 순회
        const push = (
          ids: string[] | [string, string][],
          status: TResultStatus
        ) => {
          for (const id of ids as any[]) {
            const testId = Array.isArray(id) ? id[0] : id;
            if (!testId) continue;
            const suiteId = testId.split(".")[0];

            const bucket = suiteMap.get(suiteId) ?? new Map();

            // manual_only의 경우 description 정보도 함께 저장
            const resultWithDescription: TResultWithDescription = {
              status,
              description:
                Array.isArray(id) && id.length > 1 ? id[1] : undefined,
            };

            bucket.set(testId, resultWithDescription);
            suiteMap.set(suiteId, bucket);
          }
        };

        push(spec.fail ?? [], "fail");
        push(spec.flaky ?? [], "flaky");
        push(spec.pass ?? [], "pass");
        push(spec.not_executed ?? [], "not_executed");
        push((spec.manual_only ?? []) as [string, string][], "manual_only");
      }
    }

    return suiteMap;
  }

  labelOf(result: TResultStatus): string {
    const map: Record<TResultStatus, string> = {
      pass: "✅ pass",
      fail: "❌ fail",
      flaky: "⚠️ flaky",
      not_executed: "⏭️ not_executed",
      manual_only: "📝 manual_only",
    };
    return map[result];
  }
}

export { ResultsMatrix, type ResultsMatrixContract };
