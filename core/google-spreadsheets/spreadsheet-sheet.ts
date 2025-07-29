import { sheets_v4 } from "googleapis";

type SpreadsheetSheetContract = {
  gid: string;
  rows(): Promise<any[][]>;
};

class SpreadsheetSheet implements SpreadsheetSheetContract {
  protected readonly spreadsheetId: string;
  readonly #gid: string;
  protected readonly sheets: sheets_v4.Sheets;
  #cachedSheetName: string | null = null;
  #cachedColumnCount: number | null = null;
  readonly #rawSheets: (() => Promise<sheets_v4.Schema$Sheet[]>) | null;

  constructor(
    spreadsheetId: string,
    gid: string,
    sheets: sheets_v4.Sheets,
    rawSheets?: () => Promise<sheets_v4.Schema$Sheet[]>
  ) {
    this.spreadsheetId = spreadsheetId;
    this.#gid = gid;
    this.sheets = sheets;
    this.#rawSheets = rawSheets || null;
  }

  get gid() {
    return this.#gid;
  }

  async rows() {
    const sheetName = await this.sheetName();
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${sheetName}'`,
    });

    return res.data.values ?? [];
  }

  /**
   * values를 마지막 컬럼 다음에 세로 방향으로 추가한다.
   * @param values 추가할 데이터
   * @param startRow 데이터가 시작되는 row (default: 1)
   */
  protected async writeAfterLastColumn(
    values: readonly (readonly any[])[],
    startRow: number = 1
  ): Promise<void> {
    if (values.length === 0) {
      console.warn("⚠️  작성할 데이터가 없습니다. writeAfterLastColumn 스킵");
      return;
    }

    const { nextColumnLetter: targetColumnLetter, lastRow } =
      await this.#dataRange();

    // 시트 컬럼 수가 부족하면 확장
    const targetColumnNum = this.#columnLetterToNumber(targetColumnLetter);
    await this.#ensureColumnExists(targetColumnNum);

    const sheetName = await this.sheetName();

    // 시트에 이미 존재하는 데이터 행 수
    const existingDataRows = Math.max(0, lastRow - (startRow - 1));
    const totalRows = Math.max(existingDataRows, values.length);

    // 부족한 행은 빈 셀로 패딩
    const padded: any[][] = values.map((v) => [...v]);
    while (padded.length < totalRows) padded.push([""]);

    const endRow = startRow + padded.length - 1;
    const range = `'${sheetName}'!${targetColumnLetter}${startRow}:${targetColumnLetter}${endRow}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: padded },
    });

    console.log(`✅ ${values.length} rows written → ${range}`);
  }

  /**
   * values 를 마지막 행 다음(A열 기준) 에 가로 방향으로 추가한다.
   * @param values 추가할 데이터
   */
  protected async writeAfterLastRow(
    values: readonly (readonly any[])[]
  ): Promise<void> {
    if (values.length === 0) {
      console.warn("⚠️  작성할 데이터가 없습니다. writeAfterLastRow 스킵");
      return;
    }

    const sheetName = await this.sheetName();
    const { lastRow } = await this.#dataRange();

    const startRow = lastRow + 1;
    const columnCount = Math.max(...values.map((v) => v.length));
    const endColumnLetter = this.#numberToColumnLetter(columnCount);

    const range = `'${sheetName}'!A${startRow}:${endColumnLetter}${
      startRow + values.length - 1
    }`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: values as any[][] },
    });
  }

  protected async applyStyle(
    requests: sheets_v4.Schema$Request[]
  ): Promise<void> {
    if (!requests || requests.length === 0) return;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests },
    });
  }

  /**
   * 시트의 데이터 범위를 감지한다.
   */
  async #dataRange(): Promise<TDataRange> {
    const rows = await this.rows();
    const lastColumnNum = Math.max(1, ...rows.map((row) => row.length));
    const lastRow = rows.length;
    const lastColumnLetter = this.#numberToColumnLetter(lastColumnNum);
    const nextColumnLetter = this.#numberToColumnLetter(lastColumnNum + 1);

    return {
      lastRow,
      lastColumnLetter,
      nextColumnLetter,
    };
  }

  /**
   * gid를 이용해 시트 이름을 조회한다.
   */
  protected async sheetName(): Promise<string> {
    if (this.#cachedSheetName) {
      return this.#cachedSheetName;
    }

    if (this.#rawSheets) {
      const sheetsData = await this.#rawSheets();
      const targetSheet = sheetsData.find(
        (sheet) => String(sheet.properties?.sheetId) === this.#gid
      );

      if (targetSheet?.properties?.title) {
        this.#cachedSheetName = targetSheet.properties.title;
        return this.#cachedSheetName;
      }
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const targetSheet = response.data.sheets?.find(
        (sheet) => String(sheet.properties?.sheetId) === this.#gid
      );

      const name = targetSheet?.properties?.title;
      if (!name)
        throw new Error(`gid(${this.#gid})에 해당하는 시트를 찾지 못했습니다.`);

      this.#cachedSheetName = name;
      return name;
    } catch (error) {
      throw new Error(`시트 이름 조회 실패: ${error}`);
    }
  }

  async #ensureColumnExists(columnNumber: number): Promise<void> {
    const columnCount = await this.#columnCount();
    if (columnCount >= columnNumber) return;

    const append = {
      appendDimension: {
        sheetId: Number(this.#gid),
        dimension: "COLUMNS" as const,
        length: columnNumber - columnCount,
      },
    };

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests: [append] },
    });

    this.invalidateCache();
    console.log(`📐 시트 컬럼 확장: ${columnCount} → ${columnNumber}`);
  }

  async #columnCount(): Promise<number> {
    if (this.#cachedColumnCount !== null) {
      return this.#cachedColumnCount;
    }

    if (this.#rawSheets) {
      const sheetsData = await this.#rawSheets();
      const targetSheet = sheetsData.find(
        (sheet) => String(sheet.properties?.sheetId) === this.#gid
      );

      const columnCount = targetSheet?.properties?.gridProperties?.columnCount;
      if (columnCount !== undefined && columnCount !== null) {
        this.#cachedColumnCount = columnCount;
        return columnCount;
      }
    }

    const response = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      includeGridData: false,
    });

    const targetSheet = response.data.sheets?.find(
      (sheet) => String(sheet.properties?.sheetId) === this.#gid
    );

    const columnCount =
      targetSheet?.properties?.gridProperties?.columnCount ?? 0;
    this.#cachedColumnCount = columnCount;
    return columnCount;
  }

  protected invalidateCache(): void {
    this.#cachedSheetName = null;
    this.#cachedColumnCount = null;
  }

  #numberToColumnLetter(num: number): string {
    if (num <= 0) return "";

    const adjusted = num - 1;
    const char = String.fromCharCode(65 + (adjusted % 26));
    const remaining = Math.floor(adjusted / 26);

    return remaining > 0 ? this.#numberToColumnLetter(remaining) + char : char;
  }

  #columnLetterToNumber(columnLetter: string): number {
    let result = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      result = result * 26 + (columnLetter.charCodeAt(i) - 64);
    }
    return result;
  }
}

export { SpreadsheetSheet, type SpreadsheetSheetContract };

type TDataRange = {
  lastRow: number;
  lastColumnLetter: string;
  nextColumnLetter: string;
};
