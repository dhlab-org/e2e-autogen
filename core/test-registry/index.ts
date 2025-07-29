import * as fs from "fs-extra";
import { TResultStatus } from "../config";
import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { ResultsMatrix } from "./results-matrix";
import { TTestCaseId, TTestSuiteId } from "./types";

type TestRegistryContract = {
  logResults(
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>,
    googleSpreadsheets: GoogleSpreadsheetsContract
  ): Promise<void>;
  resultsPerSuite(
    googleSpreadsheets?: GoogleSpreadsheetsContract
  ): Promise<Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>>;
};

class TestRegistry implements TestRegistryContract {
  readonly #jsonReporterFile: string;
  readonly #matrix: ResultsMatrix;
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;

  constructor(
    jsonReporterFile: string,
    googleSpreadsheets: GoogleSpreadsheetsContract
  ) {
    this.#jsonReporterFile = jsonReporterFile;
    this.#matrix = new ResultsMatrix();
    this.#googleSpreadsheets = googleSpreadsheets;
  }

  async logResults(
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>
  ): Promise<void> {
    const suitesMeta = await this.#googleSpreadsheets.suitesMeta();

    for (const [suiteId, resultPerTestId] of resultsPerSuite) {
      const meta = suitesMeta.get(suiteId);
      if (!meta) {
        console.warn(`⚠️ '[${suiteId}]' 시트를 찾지 못해 스킵합니다.`);
        continue;
      }

      const sheet = this.#googleSpreadsheets.testSuiteSheet(meta.gid);
      await this.#writeSuiteResults(sheet, resultPerTestId);
    }
  }

  async resultsPerSuite(): Promise<
    Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>
  > {
    const json = await this.#json();
    const base = this.#matrix.resultsPerSuite(json);

    // 보강: 시트에 존재하지만 실행되지 않은 TC를 not_executed 로 채운다.
    const suitesMeta = await this.#googleSpreadsheets.suitesMeta();

    for (const [suiteId, meta] of suitesMeta) {
      const sheet = this.#googleSpreadsheets.testSuiteSheet(meta.gid);
      const rows = await sheet.rows();
      const testIdCol = sheet.columnNumberOf("testId");

      const tcIdsInSheet: string[] = rows
        .slice(2) // 헤더 2줄 제외
        .map((row) => row[testIdCol] as string)
        .filter(Boolean);

      const bucket = base.get(suiteId) ?? new Map();

      tcIdsInSheet.forEach((tcId) => {
        if (!bucket.has(tcId)) {
          bucket.set(tcId, "not_executed");
        }
      });

      base.set(suiteId, bucket);
    }

    return base;
  }

  /** 시트 한 개에 대한 결과 기록 전체 프로세스 */
  async #writeSuiteResults(
    sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>,
    resultPerTestId: Map<string, TResultStatus>
  ) {
    if (resultPerTestId.size === 0) return;

    // 시트 데이터 로드
    const rows = await sheet.rows();
    const dataRows = rows.slice(2); // 헤더 제외

    // (1) 결과값 배열 생성
    const resultValues: string[][] = dataRows.map((row: any[]) => {
      const testId: string = row[sheet.columnNumberOf("testId")] ?? "";
      const status = resultPerTestId.get(testId);
      return [status ? this.#matrix.labelOf(status) : ""];
    });

    // (2) 헤더 + 결과 합치기 후 작성
    const now = this.#formatDate(new Date());
    const columnValues: string[][] = [
      ["자동테스트 결과"],
      [now],
      ...resultValues,
    ];

    const statuses: TResultStatus[] = [
      "pass",
      "fail",
      "flaky",
      "not_executed",
      "manual_only",
    ];
    const statusLabels = statuses.map((s) => this.#matrix.labelOf(s));

    const colIdx = this.#resultColumnIndex(rows[0] ?? []);
    await sheet.appendResultColumn(
      columnValues,
      statusLabels,
      rows.length,
      colIdx
    );
  }

  /** 결과 컬럼 인덱스(0-base) 계산 */
  #resultColumnIndex(headerRow: any[]): number {
    let lastIdx = 0;
    for (let i = 0; i < headerRow.length; i++) {
      const cell = headerRow[i];
      if (cell && cell.toString().trim() !== "") lastIdx = i;
    }
    return lastIdx + 1;
  }

  async #json() {
    try {
      const raw = await fs.readFile(this.#jsonReporterFile, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`❌ ${this.#jsonReporterFile} 파일 읽기 실패: ${error}`);
    }
  }

  #formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}${mm}${dd}:${hh}:${mi}`;
  }
}

export { TestRegistry, type TestRegistryContract };
