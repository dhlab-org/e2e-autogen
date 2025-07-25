import { sheets_v4 } from "googleapis";
import {
  TExecutionSummary,
  TOverallSummary,
  TSuiteSummary,
  TTestCoverageResults,
} from "../test-coverage";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

type CoverageSheetContract = SpreadsheetSheetContract & {
  updateCoverage(results: TTestCoverageResults): Promise<void>;
};

class CoverageSheet extends SpreadsheetSheet implements CoverageSheetContract {
  constructor(spreadsheetId: string, gid: string, sheets: sheets_v4.Sheets) {
    super(spreadsheetId, gid, sheets);
  }

  async updateCoverage({
    summary,
    summaryPerSuite,
    summaryPerExecution,
  }: TTestCoverageResults): Promise<void> {
    const prevRows = await this.rows();
    const execHeaderIdx = prevRows.findIndex((r) => r[0] === "실행일시");
    const pastExecRows =
      execHeaderIdx === -1 ? [] : prevRows.slice(execHeaderIdx + 1);

    await this.#clear();

    await this.#writeHeader(summaryPerExecution.executedAt);
    await this.#writeSummary(summary);
    await this.#writeSuites(summaryPerSuite);
    await this.#writeExecHistory(summaryPerExecution, pastExecRows);
  }

  async #writeHeader(lastUpdatedAt: string) {
    await this.writeAfterLastRow([
      ["자동화테스트 커버리지 현황"],
      [`마지막 업데이트: ${lastUpdatedAt}`],
      [""],
      ["커버리지(%) = 실행된 TC / 전체 TC"],
      ["통과율(%) = 실행된 TC 중 통과한 TC / 실행된 TC"],
    ]);
  }

  async #writeSummary({
    totalSuites,
    scenarioCount,
    testCaseCount,
    coverage,
    passRate,
  }: TOverallSummary) {
    const startRow = (await this.rows()).length + 1;
    const rows: string[][] = [
      [""],
      ["📝 요약"],
      ["전체 대분류 수", String(totalSuites)],
      ["전체 시나리오 수", String(scenarioCount)],
      ["전체 TC 수", String(testCaseCount)],
      ["커버리지(%)", String(coverage)],
      ["통과율(%)", String(passRate)],
    ];

    await this.writeAfterLastRow(rows);
    await this.#applyOutlineBorder(startRow + 2, rows.length - 2, 2);
  }

  async #writeSuites(suites: readonly TSuiteSummary[]) {
    if (suites.length === 0) return;
    const startRow = (await this.rows()).length + 3;
    const header = [
      "대분류 수",
      "시나리오 수",
      "TC 수",
      "커버리지(%) (실행된 TC / 전체 TC)",
      "통과율(%) (실행된 TC 중 통과한 TC / 실행된 TC)",
      "Pass",
      "Fail",
      "Flaky",
      "NotExec",
      "Manual",
    ];

    const rows = suites.map((s) => [
      s.suiteId,
      String(s.scenarioCount),
      String(s.testCaseCount),
      String(s.coverage),
      String(s.passRate),
      String(s.statusCounts.pass),
      String(s.statusCounts.fail),
      String(s.statusCounts.flaky),
      String(s.statusCounts.not_executed),
      String(s.statusCounts.manual_only),
    ]);

    await this.writeAfterLastRow([[""], ["✅ 대분류별 요약"], header, ...rows]);
    await this.#applyHeaderStyle(startRow, header.length, 1);
  }

  async #writeExecHistory(
    {
      executedAt,
      scenarioCount,
      testCaseCount,
      coverage,
      passRate,
      statusCounts,
    }: TExecutionSummary,
    pastExecRows: string[][]
  ) {
    const execHeader = [
      "실행일시",
      "시나리오 수",
      "TC 수",
      "커버리지(%)",
      "통과율(%)",
      "Pass",
      "Fail",
      "Flaky",
      "NotExec",
      "Manual",
    ];

    const newRow: string[] = [
      executedAt,
      String(scenarioCount),
      String(testCaseCount),
      String(coverage),
      String(passRate),
      String(statusCounts.pass),
      String(statusCounts.fail),
      String(statusCounts.flaky),
      String(statusCounts.not_executed),
      String(statusCounts.manual_only),
    ];

    const execBlock = [
      [""],
      ["✅ 실행 이력"],
      execHeader,
      newRow,
      ...pastExecRows,
    ];
    const startRow = (await this.rows()).length + 3;
    await this.writeAfterLastRow(execBlock);
    await this.#applyHeaderStyle(startRow, execHeader.length, 1);
  }

  async #clear() {
    const sheetName = await this.sheetName();

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range: `'${sheetName}'`,
    });

    // 스타일 초기화
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: Number(this.gid),
              },
              cell: {
                userEnteredFormat: {},
              },
              fields: "userEnteredFormat",
            },
          },
        ],
      },
    });
  }

  async #applyHeaderStyle(
    startRow: number,
    colCount: number,
    rowSpan: number = 1
  ) {
    const requests: sheets_v4.Schema$Request[] = [
      {
        repeatCell: {
          range: {
            sheetId: Number(this.gid),
            startRowIndex: startRow - 1,
            endRowIndex: startRow - 1 + rowSpan,
            startColumnIndex: 0,
            endColumnIndex: colCount,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            },
          },
          fields: "userEnteredFormat(textFormat.bold,backgroundColor)",
        },
      },
    ];
    await this.applyStyle(requests);
  }

  async #applyOutlineBorder(
    startRow: number,
    rowCount: number,
    colCount: number
  ) {
    const req: sheets_v4.Schema$Request = {
      updateBorders: {
        range: {
          sheetId: Number(this.gid),
          startRowIndex: startRow - 1,
          endRowIndex: startRow - 1 + rowCount,
          startColumnIndex: 0,
          endColumnIndex: colCount,
        },
        top: { style: "SOLID_THICK" },
        bottom: { style: "SOLID_THICK" },
        left: { style: "SOLID_THICK" },
        right: { style: "SOLID_THICK" },
      },
    };

    await this.applyStyle([req]);
  }
}

export { CoverageSheet, type CoverageSheetContract };
