import { sheets_v4 } from "googleapis";
import { COLUMN_INDEX, TGoogleSheetColumns } from "../config";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

type TestSuiteSheetContract = SpreadsheetSheetContract & {
  columnNumberOf(columnName: keyof TGoogleSheetColumns): number;
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
  readonly #googleSheetColumns: TGoogleSheetColumns;

  constructor(
    spreadsheetId: string,
    gid: string,
    sheets: sheets_v4.Sheets,
    googleSheetColumns: TGoogleSheetColumns,
    sheetsProvider?: () => Promise<sheets_v4.Schema$Sheet[]>
  ) {
    super(spreadsheetId, gid, sheets, sheetsProvider);
    this.#googleSheetColumns = googleSheetColumns;
  }

  columnNumberOf(columnName: keyof TGoogleSheetColumns): number {
    return COLUMN_INDEX[this.#googleSheetColumns[columnName]];
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
