import { ColumnUtil } from "../sheets-to-json/column-util";
import { GoogleSheetsService } from "../sheets-to-json/google-sheets-service";
import { ResultsJsonParser, TResultStatus } from "./results-json-parser";

type TContract = {
  update(): Promise<void>;
};

class TestResultUpdater implements TContract {
  readonly #sheetsUrl: string;
  readonly #resultsPath: string;
  readonly #sheetsService: GoogleSheetsService;
  readonly #columnUtil: ColumnUtil;

  constructor(sheetsUrl: string, resultsPath: string) {
    if (!sheetsUrl) throw new Error("sheetsUrl is required");
    if (!resultsPath) throw new Error("resultsPath is required");

    this.#sheetsUrl = sheetsUrl;
    this.#resultsPath = resultsPath;
    this.#sheetsService = new GoogleSheetsService();
    this.#columnUtil = new ColumnUtil();
  }

  async update(): Promise<void> {
    // 1. 결과 파싱
    const parser = new ResultsJsonParser(this.#resultsPath);
    const resultMap = await parser.parse();

    if (resultMap.size === 0) {
      console.warn("⚠️  결과가 비어 있습니다. 업데이트를 건너뜁니다.");
      return;
    }

    // 2. prefix 별 그룹화 (TC-4.1.3 → TC-4)
    const grouped = new Map<string, Map<string, TResultStatus>>();
    for (const [testId, status] of resultMap.entries()) {
      const prefix = testId.split(".")[0];
      const bucket = grouped.get(prefix) ?? new Map<string, TResultStatus>();
      bucket.set(testId, status);
      grouped.set(prefix, bucket);
    }

    console.log(">>>", grouped);
  }
}

export { TestResultUpdater };
