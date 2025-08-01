import * as fs from "fs-extra";
import { TResultStatus, TResultWithDescription } from "./types";
import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { ResultsMatrix } from "./results-matrix";
import { TTestCaseId, TTestSuiteId } from "./types";
import chalk from "chalk";

type TestRegistryContract = {
  logResults(
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultWithDescription>>
  ): Promise<void>;
  resultsPerSuite(): Promise<
    Map<TTestSuiteId, Map<TTestCaseId, TResultWithDescription>>
  >;
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
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultWithDescription>>
  ): Promise<void> {
    const suitesMeta = await this.#googleSpreadsheets.suitesMeta();

    for (const [suiteId, resultPerTestId] of resultsPerSuite) {
      const meta = suitesMeta.get(suiteId);
      if (!meta) {
        console.warn(`⚠️  '[${suiteId}]' 시트를 찾지 못해 스킵합니다.`);
        continue;
      }

      const sheet = this.#googleSpreadsheets.testSuiteSheet(meta.gid);
      await this.#writeSuiteResults(sheet, resultPerTestId);
    }

    console.log(chalk.green("🎉 모든 테스트 결과 업데이트가 완료되었습니다!"));
    console.log(chalk.blue(`🔗 ${this.#googleSpreadsheets.fullUrl}`));
  }

  async resultsPerSuite(): Promise<
    Map<TTestSuiteId, Map<TTestCaseId, TResultWithDescription>>
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

      const bucket =
        base.get(suiteId) ?? new Map<TTestCaseId, TResultWithDescription>();

      tcIdsInSheet.forEach((tcId) => {
        if (!bucket.has(tcId)) {
          bucket.set(tcId, { status: "not_executed" });
        }
      });

      base.set(suiteId, bucket);
    }

    return base;
  }

  /** 시트 한 개에 대한 결과 기록 전체 프로세스 */
  async #writeSuiteResults(
    sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>,
    resultPerTestId: Map<string, TResultWithDescription>
  ) {
    if (resultPerTestId.size === 0) return;

    // 시트 데이터 로드
    const rows = await sheet.rows();
    const dataRows = rows.slice(2); // 헤더 제외

    // (1) 결과값 배열 생성
    const resultValues: string[][] = dataRows.map((row: any[]) => {
      const testId: string = row[sheet.columnNumberOf("testId")] ?? "";
      const result = resultPerTestId.get(testId);
      return [result ? this.#matrix.labelOf(result.status) : ""];
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

    // (3) manual_only에 대한 description을 comment로 추가
    await this.#addManualOnlyComments(sheet, resultPerTestId, colIdx);
  }

  /** manual_only에 대한 description을 comment로 추가 */
  async #addManualOnlyComments(
    sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>,
    resultPerTestId: Map<string, TResultWithDescription>,
    colIdx: number
  ) {
    const rows = await sheet.rows();
    const testIdCol = sheet.columnNumberOf("testId");

    for (let rowIdx = 2; rowIdx < rows.length; rowIdx++) {
      // 헤더 2줄 제외
      const testId = rows[rowIdx][testIdCol] as string;
      if (!testId) continue;

      const result = resultPerTestId.get(testId);
      if (result?.status === "manual_only" && result.description) {
        // comment 추가 (rowIdx는 0-based, 시트는 1-based이므로 +1)
        await sheet.addComment(rowIdx + 1, colIdx + 1, result.description);
      }
    }
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

export { TestRegistry };
export * from "./types";
