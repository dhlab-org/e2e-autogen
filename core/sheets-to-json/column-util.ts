import { COLUMN_CONFIG } from "./config";

type TColumnUtilContract = {
  columnLetterToNumber(columnLetter: string): number;
  numberToColumnLetter(num: number): string;
  detectLastColumn(headerRow: any[]): string;
  resultColumn(lastColumn: string): string;
  resultRange(resultColumn: string, startRow?: number, endRow?: number): string;
};

class ColumnUtil implements TColumnUtilContract {
  constructor() {}

  /**
   * 컬럼 문자를 숫자로 변환 (A=1, B=2, ..., Z=26, AA=27, ...)
   */
  columnLetterToNumber(columnLetter: string): number {
    let result = 0;
    for (let i = 0; i < columnLetter.length; i++) {
      result =
        result * COLUMN_CONFIG.ALPHABET_COUNT +
        (columnLetter.charCodeAt(i) - COLUMN_CONFIG.COLUMN_CHAR_START + 1);
    }
    return result;
  }

  /**
   * 숫자를 컬럼 문자로 변환 (1=A, 2=B, ..., 26=Z, 27=AA, ...)
   */
  numberToColumnLetter(num: number): string {
    let result = "";
    while (num > 0) {
      num--;
      result =
        String.fromCharCode(
          COLUMN_CONFIG.COLUMN_CHAR_START + (num % COLUMN_CONFIG.ALPHABET_COUNT)
        ) + result;
      num = Math.floor(num / COLUMN_CONFIG.ALPHABET_COUNT);
    }
    return result;
  }

  /**
   * 헤더 행에서 실제 데이터가 있는 마지막 컬럼 감지
   */
  detectLastColumn(headerRow: any[]): string {
    let lastColumnIndex = 0;
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i].toString().trim() !== "") {
        lastColumnIndex = i;
      }
    }
    return this.numberToColumnLetter(lastColumnIndex + 1);
  }

  /**
   * 결과값을 주입할 컬럼 정보
   */
  resultColumn(lastColumn: string): string {
    const lastColumnNum = this.columnLetterToNumber(lastColumn);
    return this.numberToColumnLetter(lastColumnNum + 1);
  }

  /**
   * 결과값 주입을 위한 범위 (예: G2:G100)
   */
  resultRange(
    resultColumn: string,
    startRow: number = 2,
    endRow?: number
  ): string {
    const range = endRow
      ? `${resultColumn}${startRow}:${resultColumn}${endRow}`
      : `${resultColumn}${startRow}:${resultColumn}`;
    return range;
  }
}

export { ColumnUtil };
