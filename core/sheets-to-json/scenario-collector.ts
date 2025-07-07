import { TScenarioData } from "../types";
import { GoogleSheetsService } from "./google-sheets-service";
import { SpreadsheetUrlParser } from "./spreadsheet-url-parser";
import { ScenarioSheetFactory } from "./scenario-sheet-factory";

type TContract = {
  collect(): Promise<TScenarioData[]>;
};

/**
 * - gid 존재 시 단일 시트, 없으면 [TC-x] 시트를 모두 탐색
 */
class ScenarioCollector implements TContract {
  readonly #baseUrl: string;
  readonly #parser: SpreadsheetUrlParser;
  readonly #sheetsService: GoogleSheetsService;
  readonly #sheetFactory: ScenarioSheetFactory;

  constructor(
    baseUrl: string,
    parser: SpreadsheetUrlParser,
    sheetsService: GoogleSheetsService,
    sheetFactory: ScenarioSheetFactory
  ) {
    this.#baseUrl = baseUrl;
    this.#parser = parser;
    this.#sheetsService = sheetsService;
    this.#sheetFactory = sheetFactory;
  }

  async collect(): Promise<TScenarioData[]> {
    await this.#sheetsService.authorize();

    // 단일 시트 모드
    if (this.#parser.gid()) {
      const sheet = this.#sheetFactory.create(this.#baseUrl);
      return sheet.scenarios();
    }

    // 멀티 시트 모드
    const spreadsheetId = this.#parser.spreadsheetId();
    const spreadsheetInfo = await this.#sheetsService.getSpreadsheetInfo(
      spreadsheetId
    );

    const tcSheets = (spreadsheetInfo.sheets || []).filter((sheet: any) => {
      const title: string = sheet.properties?.title ?? "";
      return /^\s*\[TC-\d+\]/.test(title);
    });

    if (tcSheets.length === 0) {
      console.warn(
        "⚠️  '[TC-x]' 패턴의 시트를 찾지 못했습니다. 단일 시트 모드로 처리합니다."
      );
      const sheet = this.#sheetFactory.create(this.#baseUrl);
      return sheet.scenarios();
    }

    console.log(
      `🔍 감지된 TC 시트: ${tcSheets
        .map((s: any) => s.properties.title)
        .join(", ")}`
    );

    // 각 시트별 데이터 수집
    const all: TScenarioData[] = [];
    for (const sheet of tcSheets) {
      const gid = sheet.properties?.sheetId?.toString();
      if (!gid) continue;

      const sheetUrl = this.#withGid(gid);
      const scenarioSheet = this.#sheetFactory.create(sheetUrl);
      const scenarios = await scenarioSheet.scenarios();
      all.push(...scenarios);
    }

    return all;
  }

  /**
   * baseUrl에 gid 파라미터를 삽입하여 시트 전용 URL을 만든다.
   */
  #withGid(gid: string): string {
    if (/gid=/.test(this.#baseUrl)) {
      return this.#baseUrl.replace(/gid=\d+/, `gid=${gid}`);
    }
    const sep = this.#baseUrl.includes("#") ? "&" : "#";
    return `${this.#baseUrl}${sep}gid=${gid}`;
  }
}

export { ScenarioCollector };
