import type { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import type { TPrefix, TRow } from "./types";

type TCSheetBundleContract = {
  rowsPerPrefix(): Promise<Map<TPrefix, TRow[]>>;
};

class TCSheetBundle implements TCSheetBundleContract {
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;

  constructor(googleSpreadsheets: GoogleSpreadsheetsContract) {
    this.#googleSpreadsheets = googleSpreadsheets;
  }

  async rowsPerPrefix() {
    const suitesMeta = await this.#googleSpreadsheets.suitesMeta();

    const rowsPerPrefix = new Map<TPrefix, TRow[]>();
    for (const [prefix, { gid }] of suitesMeta) {
      const rows = await this.#googleSpreadsheets.sheet(gid).rows();
      rowsPerPrefix.set(prefix, rows);
    }

    return rowsPerPrefix;
  }
}

export { TCSheetBundle, type TCSheetBundleContract };
