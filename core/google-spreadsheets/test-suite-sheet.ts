import { sheets_v4 } from "googleapis";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

type TestSuiteSheetContract = SpreadsheetSheetContract & {
  columnNumberOf(columnName: TColumnName): number;
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
