import { ColumnUtil } from "../sheets-to-json/column-util";
import { GoogleSheetsService } from "../sheets-to-json/google-sheets-service";
import { ResultsJsonParser } from "./results-json-parser";

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
    // 1. Parse test results
    const parser = new ResultsJsonParser(this.#resultsPath);
    const resultMap = await parser.parse();

    console.log(">>>", resultMap);
  }
}

export { TestResultUpdater };
