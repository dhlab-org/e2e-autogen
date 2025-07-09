import { GoogleSheetsService } from "./google-sheets-service";
import { SpreadsheetUrlParser } from "./spreadsheet-url-parser";
import { ColumnUtil } from "./column-util";
import { GOOGLE_SHEETS_CONFIG } from "./config";

type TContract = {
  detectDataRange(): Promise<TDataRangeInfo>;
};

class DataRangeDetector implements TContract {
  readonly #sheetsService: GoogleSheetsService;
  readonly #urlParser: SpreadsheetUrlParser;
  readonly #columnUtil: ColumnUtil;

  constructor(
    sheetsService: GoogleSheetsService,
    urlParser: SpreadsheetUrlParser,
    columnUtil: ColumnUtil
  ) {
    this.#sheetsService = sheetsService;
    this.#urlParser = urlParser;
    this.#columnUtil = columnUtil;
  }

  /**
   * 헤더 행을 읽어서 실제 데이터 범위 감지
   */
  async detectDataRange(): Promise<TDataRangeInfo> {
    const spreadsheetId = this.#urlParser.spreadsheetId();

    try {
      // URL에서 gid 추출하여 시트 이름 확인
      let targetRange = GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE;
      const gid = this.#urlParser.gid();

      if (gid) {
        const sheetName = await this.#sheetsService.getSheetNameByGid(
          spreadsheetId,
          gid
        );
        if (sheetName) {
          targetRange = `'${sheetName}'!${GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE}`;
        }
      }

      // 첫 번째 행만 읽어서 실제 컬럼 수 파악
      const headerRows = await this.#sheetsService.readValues(
        spreadsheetId,
        targetRange
      );

      if (!headerRows || headerRows.length === 0) {
        console.log("⚠️  헤더 행에 데이터가 없습니다. 기본 범위를 사용합니다.");
        return this.#createDefaultRangeInfo(targetRange);
      }

      const firstRow = headerRows[0] || [];
      const secondRow = headerRows[1] || [];

      // 두 헤더 행을 모두 고려하여 가장 오른쪽에 데이터가 존재하는 컬럼 탐지
      let lastColumnIndex = -1;
      const maxLen = Math.max(firstRow.length, secondRow.length);
      for (let i = 0; i < maxLen; i++) {
        const cell1 = firstRow[i];
        const cell2 = secondRow[i];
        const hasValue =
          (cell1 && cell1.toString().trim() !== "") ||
          (cell2 && cell2.toString().trim() !== "");
        if (hasValue) lastColumnIndex = i;
      }

      // 값이 전혀 없을 경우 기본값 사용
      if (lastColumnIndex < 0) lastColumnIndex = 0;

      const lastColumn = this.#columnUtil.numberToColumnLetter(
        lastColumnIndex + 1
      );
      const actualRange = `A:${lastColumn}`;
      const resultColumn = this.#columnUtil.resultColumn(lastColumn);

      // 시트 정보를 포함한 감지된 범위 설정
      const rangeWithoutSheet = `A1:${lastColumn}${GOOGLE_SHEETS_CONFIG.MAX_ROWS}`;
      const detectedRange = targetRange.includes("!")
        ? targetRange.replace(
            GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE,
            rangeWithoutSheet
          )
        : rangeWithoutSheet;

      return {
        lastColumn,
        actualRange,
        detectedRange,
        resultColumn,
      };
    } catch (error) {
      console.error("❌ 데이터 범위 감지 실패:", error);
      console.log("⚠️  기본 범위를 사용합니다.");

      // 실패 시 기본 범위 사용
      return this.#createDefaultRangeInfo();
    }
  }

  /**
   * 기본 범위 정보 생성
   */
  #createDefaultRangeInfo(targetRange?: string): TDataRangeInfo {
    const lastColumn = "F";
    const actualRange = GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE;
    const detectedRange = targetRange
      ? targetRange.includes("!")
        ? targetRange.replace(
            GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE,
            GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE
          )
        : GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE
      : GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE;
    const resultColumn = this.#columnUtil.resultColumn(lastColumn);

    return {
      lastColumn,
      actualRange,
      detectedRange,
      resultColumn,
    };
  }
}

export { DataRangeDetector };

export type TDataRangeInfo = {
  lastColumn: string;
  actualRange: string;
  detectedRange: string;
  resultColumn: string;
};
