import { GoogleSheetsService } from "../sheets-to-json/google-sheets-service";
import { SpreadsheetUrlParser } from "../sheets-to-json/spreadsheet-url-parser";
import { ColumnUtil } from "../sheets-to-json/column-util";
import { DataRangeDetector } from "../sheets-to-json/data-range-detector";
import { ResultsJsonParser, TResultStatus } from "./results-json-parser";
import { COLUMN_MAPPING } from "../sheets-to-json/config";

type TContract = {
  update(): Promise<void>;
};

class TestResultUpdater implements TContract {
  readonly #sheetsUrl: string;
  readonly #resultsPath: string;
  readonly #sheetsService: GoogleSheetsService;
  readonly #columnUtil: ColumnUtil;

  constructor(sheetsUrl: string, resultsPath: string) {
    if (!sheetsUrl) throw new Error("sheetsUrl is required");
    if (!resultsPath) throw new Error("resultsPath is required");

    this.#sheetsUrl = sheetsUrl;
    this.#resultsPath = resultsPath;
    this.#sheetsService = new GoogleSheetsService();
    this.#columnUtil = new ColumnUtil();
  }

  async update(): Promise<void> {
    // 1. 결과 파싱
    const parser = new ResultsJsonParser(this.#resultsPath);
    const resultMap = await parser.parse();

    if (resultMap.size === 0) {
      console.warn("⚠️  결과가 비어 있습니다. 업데이트를 건너뜁니다.");
      return;
    }

    // 2. prefix 별 그룹화 (TC-4.1.3 → TC-4)
    const grouped = new Map<string, Map<string, TResultStatus>>();
    for (const [testId, status] of resultMap.entries()) {
      const prefix = testId.split(".")[0];
      const bucket = grouped.get(prefix) ?? new Map<string, TResultStatus>();
      bucket.set(testId, status);
      grouped.set(prefix, bucket);
    }

    console.log(">>>", grouped);

    // 3. Sheets 인증 및 시트 목록 조회
    await this.#sheetsService.authorize();

    const spreadsheetId = new SpreadsheetUrlParser(
      this.#sheetsUrl
    ).spreadsheetId();
    const spreadsheetInfo = await this.#sheetsService.getSpreadsheetInfo(
      spreadsheetId
    );

    const sheetMetaMap = new Map<string, { gid: string; title: string }>();
    for (const sheet of spreadsheetInfo.sheets || []) {
      const title: string = sheet.properties?.title ?? "";
      const match = title.match(/^\s*\[(TC-\d+)]/i);
      if (match) {
        const prefix = match[1]; // e.g., TC-4
        sheetMetaMap.set(prefix, {
          gid: String(sheet.properties?.sheetId),
          title,
        });
      }
    }

    // 4. prefix 그룹별로 업데이트
    for (const [prefix, bucket] of grouped.entries()) {
      const sheetMeta = sheetMetaMap.get(prefix);
      if (!sheetMeta) {
        console.warn(`⚠️  '[${prefix}]' 시트를 찾지 못했습니다. 스킵`);
        continue;
      }

      await this.#updateSheet(bucket, sheetMeta, spreadsheetId);
    }
  }

  async #updateSheet(
    bucket: Map<string, TResultStatus>,
    sheetMeta: { gid: string; title: string },
    spreadsheetId: string
  ): Promise<void> {
    // 해당 시트 전용 URL
    const baseUrlWithoutHash = this.#sheetsUrl.split("#")[0];
    const sheetUrl = `${baseUrlWithoutHash}#gid=${sheetMeta.gid}`;

    // 데이터 범위 감지
    const urlParser = new SpreadsheetUrlParser(sheetUrl);
    const detector = new DataRangeDetector(
      this.#sheetsService,
      urlParser,
      this.#columnUtil
    );
    const rangeInfo = await detector.detectDataRange();

    // 시트 데이터 읽기
    const rows = await this.#sheetsService.readValues(
      spreadsheetId,
      rangeInfo.detectedRange
    );

    if (!rows || rows.length <= 2) {
      console.warn(
        `⚠️  '${sheetMeta.title}' 시트에 업데이트할 데이터가 없습니다.`
      );
      return;
    }

    const dataRows = rows.slice(2); // 헤더 2줄 제외
    const statusRows: (string | null)[][] = [];

    for (const row of dataRows) {
      const testId: string = row[COLUMN_MAPPING.testId] || "";
      if (!testId) {
        statusRows.push(["not_executed"]);
        continue;
      }

      const status = bucket.get(testId) ?? "not_executed";
      statusRows.push([status]);
    }

    const resultColumn = rangeInfo.resultColumn;

    // 헤더 업데이트 (2줄: 날짜, 라벨)
    const headerRange = `${sheetMeta.title}!${resultColumn}1:${resultColumn}2`;
    const now = this.#formatDate(new Date());
    await this.#sheetsService.updateValues(spreadsheetId, headerRange, [
      [`자동테스트 결과`],
      [now],
    ]);

    // 데이터 업데이트
    const dataStartRow = 3; // 데이터는 3행부터
    const dataRange = `${sheetMeta.title}!${resultColumn}${dataStartRow}:${resultColumn}${rows.length}`;
    await this.#sheetsService.updateValues(
      spreadsheetId,
      dataRange,
      statusRows
    );

    console.log(
      `✅ 업데이트 완료: ${sheetMeta.title} (${statusRows.length} rows)`
    );
  }

  #formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${yyyy}${mm}${dd}_${hh}:${mi}`;
  }
}

export { TestResultUpdater };
