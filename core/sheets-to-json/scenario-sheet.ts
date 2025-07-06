import { TScenarioData } from "../types";
import { GoogleSheetsService } from "./google-sheets-service";
import { SpreadsheetUrlParser } from "./spreadsheet-url-parser";
import { DataRangeDetector, TDataRangeInfo } from "./data-range-detector";
import { ScenarioDataConverter } from "./scenario-data-converter";
import { ColumnUtil } from "./column-util";

type TContract = {
  scenarios: () => Promise<TScenarioData[]>;
  lastColumn(): string | null;
  resultColumn(): string | null;
  actualRange(): string | null;
  detectedRange(): string | null;
  resultRange(startRow?: number, endRow?: number): string | null;
  spreadsheetId(): string | null;
};

class ScenarioSheet implements TContract {
  readonly #urlParser: SpreadsheetUrlParser;
  readonly #sheetsService: GoogleSheetsService;
  readonly #rangeDetector: DataRangeDetector;
  readonly #dataConverter: ScenarioDataConverter;
  readonly #columnUtil: ColumnUtil;
  #rangeInfo: TDataRangeInfo | null = null;

  constructor(
    urlParser: SpreadsheetUrlParser,
    sheetsService: GoogleSheetsService,
    rangeDetector: DataRangeDetector,
    dataConverter: ScenarioDataConverter,
    columnUtil: ColumnUtil
  ) {
    this.#urlParser = urlParser;
    this.#sheetsService = sheetsService;
    this.#rangeDetector = rangeDetector;
    this.#dataConverter = dataConverter;
    this.#columnUtil = columnUtil;
  }

  async scenarios(): Promise<TScenarioData[]> {
    try {
      const spreadsheetId = this.#urlParser.spreadsheetId();
      console.log("📋 스프레드시트 ID:", spreadsheetId);

      // 1단계: 인증
      await this.#sheetsService.authorize();

      // 2단계: 헤더 행을 읽어서 실제 데이터 범위 감지
      this.#rangeInfo = await this.#rangeDetector.detectDataRange();

      // 3단계: 감지된 범위로 전체 데이터 읽기
      const rows = await this.#sheetsService.readValues(
        spreadsheetId,
        this.#rangeInfo.detectedRange
      );

      // 4단계: 데이터 변환
      const scenarios = this.#dataConverter.convertToScenarioData(rows);

      if (scenarios.length === 0) {
        console.log("⚠️  변환할 데이터가 없습니다.");
        return [];
      }

      console.log(`\n✅ 성공적으로 변환완료`);
      console.log(`📊 총 ${scenarios.length}개의 시나리오가 변환되었습니다.`);
      console.log(`📍 감지된 데이터 범위: ${this.#rangeInfo.actualRange}`);
      console.log(`📍 마지막 컬럼: ${this.#rangeInfo.lastColumn}`);
      console.log(`📍 결과 주입 예정 컬럼: ${this.#rangeInfo.resultColumn}`);

      return scenarios;
    } catch (error) {
      console.error("❌ 변환 실패:", error);
      throw error;
    }
  }

  /**
   * 마지막 컬럼 정보
   */
  lastColumn(): string | null {
    return this.#rangeInfo?.lastColumn || null;
  }

  /**
   * 결과값을 주입할 컬럼 정보
   */
  resultColumn(): string | null {
    return this.#rangeInfo?.resultColumn || null;
  }

  /**
   * 감지된 실제 범위 정보
   */
  actualRange(): string | null {
    return this.#rangeInfo?.actualRange || null;
  }

  /**
   * 감지된 전체 범위 정보
   */
  detectedRange(): string | null {
    return this.#rangeInfo?.detectedRange || null;
  }

  /**
   * 결과값 주입을 위한 범위 (예: G2:G100)
   */
  resultRange(startRow: number = 2, endRow?: number): string | null {
    const resultColumn = this.resultColumn();
    if (!resultColumn) return null;

    return this.#columnUtil.resultRange(resultColumn, startRow, endRow);
  }

  /**
   * 스프레드시트 ID (결과 주입 시 필요)
   */
  spreadsheetId(): string | null {
    return this.#urlParser.spreadsheetId();
  }
}

export { ScenarioSheet };
