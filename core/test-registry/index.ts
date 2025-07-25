import * as fs from "fs-extra";
import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { Judge } from "./judge";
import { TTestCaseId, TTestSuiteId } from "./types";
import { TResultStatus } from "../config";

type TestRegistryContract = {
  logResults(
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>,
    googleSpreadsheets: GoogleSpreadsheetsContract
  ): Promise<void>;
  resultsPerSuite(): Promise<
    Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>
  >;
};

class TestRegistry implements TestRegistryContract {
  readonly #jsonReporterPath: string;
  readonly #judge: Judge;

  constructor(jsonReporterPath: string) {
    this.#jsonReporterPath = jsonReporterPath;
    this.#judge = new Judge();
  }

  async logResults(
    resultsPerSuite: Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>,
    googleSpreadsheets: GoogleSpreadsheetsContract
  ): Promise<void> {
    const suitesMeta = await googleSpreadsheets.suitesMeta();

    for (const [suiteId, resultPerTestId] of resultsPerSuite) {
      const meta = suitesMeta.get(suiteId);
      if (!meta) {
        console.warn(`⚠️ '[${suiteId}]' 시트를 찾지 못해 스킵합니다.`);
        continue;
      }

      const sheet = googleSpreadsheets.testSuiteSheet(meta.gid);
      await this.#writeSuiteResults(sheet, resultPerTestId);
    }
  }

  async resultsPerSuite() {
    const json = await this.#json();
    return this.#judge.resultsPerSuite(json);
  }

  /** 시트 한 개에 대한 결과 기록 전체 프로세스 */
  async #writeSuiteResults(
    sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>,
    resultPerTestId: Map<string, TResultStatus>
  ) {
    // 시트 데이터 로드
    const rows = await sheet.rows();
    const dataRows = rows.slice(2); // 헤더 제외

    // (1) 결과값 배열 생성
    const resultValues: string[][] = dataRows.map((row: any[]) => {
      const testId: string = row[sheet.columnNumberOf("testId")] ?? "";
      const status = resultPerTestId.get(testId) ?? "not_executed";
      return [this.#judge.labelOf(status)];
    });

    // (2) 헤더 + 결과 합치기 후 작성
    const now = this.#formatDate(new Date());
    const columnValues: string[][] = [
      ["자동테스트 결과"],
      [now],
      ...resultValues,
    ];
    await sheet.writeAfterLastColumn(columnValues, 1);

    // (3) 서식 & 드롭다운 설정
    const colIdx = this.#resultColumnIndex(rows[0] ?? []);
    await this.#applyHeaderAndValidation(sheet, rows.length, colIdx);
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

  /** 헤더 서식 적용 & 드롭다운 설정 */
  async #applyHeaderAndValidation(
    sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>,
    totalRows: number,
    colIdx: number
  ) {
    const statuses: TResultStatus[] = [
      "pass",
      "fail",
      "flaky",
      "not_executed",
      "manual_only",
    ];
    const statusLabels = statuses.map((s) => this.#judge.labelOf(s));

    const requests: any[] = [
      {
        repeatCell: {
          range: {
            sheetId: sheet.gid,
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.85, green: 0.92, blue: 0.98 },
              horizontalAlignment: "CENTER",
              textFormat: { bold: true },
            },
          },
          fields:
            "userEnteredFormat(backgroundColor,horizontalAlignment,textFormat.bold)",
        },
      },
      {
        setDataValidation: {
          range: {
            sheetId: sheet.gid,
            startRowIndex: 2,
            endRowIndex: totalRows,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1,
          },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: statusLabels.map((v) => ({ userEnteredValue: v })),
            },
            strict: true,
            showCustomUi: true,
          },
        },
      },
    ];

    await sheet.applyStyle(requests);
  }

  async #json() {
    try {
      const raw = await fs.readFile(this.#jsonReporterPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`❌ ${this.#jsonReporterPath} 파일 읽기 실패: ${error}`);
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
