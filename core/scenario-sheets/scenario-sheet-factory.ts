import { GoogleSheetsService } from "../sheets/google-sheets-service";
import { SpreadsheetUrlParser } from "../sheets/spreadsheet-url-parser";
import { ColumnUtil } from "../sheets/column-util";
import { DataRangeDetector } from "../sheets/data-range-detector";
import { ScenarioDataConverter } from "./scenario-data-converter";
import { ScenarioSheet } from "./scenario-sheet";

type TContract = {
  create(url: string): ScenarioSheet;
};

/**
 * ScenarioSheetFactory는 ScenarioSheet 객체 생성을 전담한다.
 * 동일 URL에 대해 캐싱하여 중복 생성을 방지한다.
 */
class ScenarioSheetFactory implements TContract {
  readonly #sheetsService: GoogleSheetsService;
  readonly #cache: Map<string, ScenarioSheet> = new Map();

  constructor(sheetsService: GoogleSheetsService) {
    this.#sheetsService = sheetsService;
  }

  create(url: string): ScenarioSheet {
    const cached = this.#cache.get(url);
    if (cached) return cached;

    const urlParser = new SpreadsheetUrlParser(url);
    const columnUtil = new ColumnUtil();
    const rangeDetector = new DataRangeDetector(
      this.#sheetsService,
      urlParser,
      columnUtil
    );
    const dataConverter = new ScenarioDataConverter();

    const sheet = new ScenarioSheet(
      urlParser,
      this.#sheetsService,
      rangeDetector,
      dataConverter,
      columnUtil
    );

    this.#cache.set(url, sheet);
    return sheet;
  }
}

export { ScenarioSheetFactory };
