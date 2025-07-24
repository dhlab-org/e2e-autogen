import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { TPrefix, TRow } from "./types";

type TCSheetBundleContract = {
  collectedRowsMapByPrefix(): Promise<Map<TPrefix, TRow[]>>;
  columnNumberOf(columnName: TColumnName): number;
};

class TCSheetBundle implements TCSheetBundleContract {
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;

  constructor(googleSpreadsheets: GoogleSpreadsheetsContract) {
    this.#googleSpreadsheets = googleSpreadsheets;
  }

  async collectedRowsMapByPrefix() {
    const { sheetsMetaMapByPrefix } = await this.#googleSpreadsheets.sheets();

    const rowsMapByPrefix = new Map<TPrefix, TRow[]>();
    for (const [prefix, { gid }] of sheetsMetaMapByPrefix) {
      const rows = await this.#googleSpreadsheets.sheet(gid).rows();
      rowsMapByPrefix.set(prefix, rows);
    }

    return rowsMapByPrefix;
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

export { TCSheetBundle, type TCSheetBundleContract };

type TColumnName =
  | "scenarioId"
  | "scenarioDescription"
  | "uiPath"
  | "when"
  | "then"
  | "testId"
  | "tag"
  | "comment";
