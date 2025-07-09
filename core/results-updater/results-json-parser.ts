type TContract = {
  parse(): Promise<Map<string, TResultStatus>>;
};

type TResultStatus = "pass" | "fail" | "flaky" | "not_executed" | "manual_only";

class ResultsJsonParser implements TContract {
  readonly #filePath: string;

  constructor(filePath: string) {
    if (!filePath) {
      throw new Error("filePath is required");
    }
    this.#filePath = filePath;
  }

  async parse(): Promise<Map<string, TResultStatus>> {
    const fs = await import("fs-extra");
    try {
      const raw = await fs.readFile(this.#filePath, "utf-8");
      const json = JSON.parse(raw);
      const result = new Map<string, { run: number; error: number }>();

      if (!json || !Array.isArray(json.suites)) {
        console.warn("⚠️  suites not found in reporter json");
        return new Map<string, TResultStatus>();
      }

      this.#traverseSuites(json.suites, result);

      // 최종 상태 계산
      const finalMap = new Map<string, TResultStatus>();
      for (const [testId, stats] of result.entries()) {
        if (stats.error === 0) {
          finalMap.set(testId, "pass");
        } else if (stats.error < stats.run) {
          finalMap.set(testId, "flaky");
        } else {
          finalMap.set(testId, "fail");
        }
      }

      return finalMap;
    } catch (error) {
      console.error("❌ 결과 JSON 파싱 실패:", error);
      throw error;
    }
  }

  #traverseSuites(
    suites: any[],
    map: Map<string, { run: number; error: number }>
  ): void {
    for (const suite of suites) {
      if (suite.specs) {
        for (const spec of suite.specs) {
          this.#parseSpec(spec, map);
        }
      }
      if (suite.suites) {
        this.#traverseSuites(suite.suites, map);
      }
    }
  }

  #parseSpec(
    spec: any,
    map: Map<string, { run: number; error: number }>
  ): void {
    if (!spec.tests) return;
    for (const test of spec.tests) {
      if (!test.results || test.results.length === 0) continue;
      for (const attempt of test.results) {
        const steps = attempt.steps || [];
        for (const step of steps) {
          const testId = this.#extractTestId(step.title || "");
          if (!testId) continue;

          const current = map.get(testId) || { run: 0, error: 0 };

          current.run += 1;
          if (step.error) {
            current.error += 1;
          }

          map.set(testId, current);
        }
      }
    }
  }

  #extractTestId(title: string): string | null {
    const match = title.match(/\[(TC-[^\]]+)\]/);
    return match ? match[1] : null;
  }
}

export { ResultsJsonParser, TResultStatus };
