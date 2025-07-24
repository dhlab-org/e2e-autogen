import { sheets_v4 } from "googleapis";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

type CoverageSheetContract = SpreadsheetSheetContract & {};

class CoverageSheet extends SpreadsheetSheet implements CoverageSheetContract {
  constructor(spreadsheetId: string, gid: string, sheets: sheets_v4.Sheets) {
    super(spreadsheetId, gid, sheets);
  }
}

export { CoverageSheet, type CoverageSheetContract };
