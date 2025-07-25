import { sheets_v4 } from "googleapis";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

type TestSuiteSheetContract = SpreadsheetSheetContract & {
  columnNumberOf(columnName: TColumnName): number;
  appendResultColumn(
    values: string[][],
    statusLabels: string[],
    totalRows: number,
    colIdx: number
  ): Promise<void>;
};

class TestSuiteSheet
  extends SpreadsheetSheet
  implements TestSuiteSheetContract
{
  constructor(spreadsheetId: string, gid: string, sheets: sheets_v4.Sheets) {
    super(spreadsheetId, gid, sheets);
  }

  columnNumberOf(columnName: TColumnName): number {
    const columnMapping: Record<TColumnName, number> = {
      scenarioId: 0, // A: 시나리오 ID
      scenarioDescription: 1, // B: e2e 시나리오
      uiPath: 2, // C: UI path
      when: 3, // D: action/when
      then: 4, // E: expected/then
      testId: 5, // F: 테스트 ID
      tag: 6, // G: 태그
      comment: 7, // H: 코멘트
    };
    return columnMapping[columnName];
  }

  async appendResultColumn(
    values: string[][],
    statusLabels: string[],
    totalRows: number,
    colIdx: number
  ) {
    await this.writeAfterLastColumn(values, 1);
    await this.#applyHeaderAndDropdown(statusLabels, totalRows, colIdx);
  }

  async #applyHeaderAndDropdown(
    statusLabels: string[],
    totalRows: number,
    colIdx: number
  ) {
    const requests: any[] = [
      {
        repeatCell: {
          range: {
            sheetId: this.gid,
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
            sheetId: this.gid,
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

    await this.applyStyle(requests);
  }
}

export { TestSuiteSheet, type TestSuiteSheetContract };

type TColumnName =
  | "scenarioId"
  | "scenarioDescription"
  | "uiPath"
  | "when"
  | "then"
  | "testId"
  | "tag"
  | "comment";
