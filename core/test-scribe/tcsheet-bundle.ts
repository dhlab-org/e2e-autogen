import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { TPrefix, TRow } from "./types";

type TCSheetBundleContract = {
  collectedRowsMapByPrefix(): Promise<Map<TPrefix, TRow[]>>;
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
}

export { TCSheetBundle, type TCSheetBundleContract };
