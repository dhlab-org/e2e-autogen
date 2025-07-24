import { GoogleSpreadsheetsContract } from "../google-spreadsheets";

type TCSheetBundleContract = {
  collectedRowsMapByPrefix(): Promise<Map<TPrefix, any[][]>>;
};

class TCSheetBundle implements TCSheetBundleContract {
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;

  constructor(googleSpreadsheets: GoogleSpreadsheetsContract) {
    this.#googleSpreadsheets = googleSpreadsheets;
  }

  async collectedRowsMapByPrefix() {
    const { sheetsMetaMapByPrefix } = await this.#googleSpreadsheets.sheets();

    const rowsMapByPrefix = new Map<TPrefix, any[][]>();
    for (const [prefix, { gid }] of sheetsMetaMapByPrefix) {
      const rows = await this.#googleSpreadsheets.sheet(gid).rows();
      rowsMapByPrefix.set(prefix, rows);
    }

    return rowsMapByPrefix;
  }
}

export { TCSheetBundle };

type TPrefix = string; // TC-x
