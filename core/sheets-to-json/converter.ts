import { google } from "googleapis";
import { TScenarioData } from "../types";
import { COLUMN_CONFIG, COLUMN_MAPPING, GOOGLE_SHEETS_CONFIG } from "./config";

type TContract = {
  convert: () => Promise<TScenarioData[]>;
};

class SheetsToJsonConverter implements TContract {
  #url: string;
  #spreadsheetId: string | null = null;
  #lastColumn: string | null = null;
  #actualRange: string | null = null;
  #detectedRange: string | null = null;

  constructor(url: string) {
    this.#url = url;
  }

  async convert(): Promise<TScenarioData[]> {
    try {
      this.#spreadsheetId = this.#extractSpreadsheetId(this.#url);
      console.log("📋 스프레드시트 ID:", this.#spreadsheetId);

      // 1단계: 헤더 행을 읽어서 실제 데이터 범위 감지
      await this.#detectDataRange(this.#spreadsheetId);

      // 2단계: 감지된 범위로 전체 데이터 읽기
      const scenarios = await this.#readSheetData(
        this.#spreadsheetId,
        this.#detectedRange!
      );

      if (scenarios.length === 0) {
        console.log("⚠️  변환할 데이터가 없습니다.");
        return [];
      }

      console.log(`\n✅ 성공적으로 변환완료`);
      console.log(`📊 총 ${scenarios.length}개의 시나리오가 변환되었습니다.`);
      console.log(`📍 감지된 데이터 범위: ${this.#actualRange}`);
      console.log(`📍 마지막 컬럼: ${this.#lastColumn}`);
      console.log(`📍 결과 주입 예정 컬럼: ${this.getResultColumn()}`);

      return scenarios;
    } catch (error) {
      console.error("❌ 변환 실패:", error);
      throw error;
    }
  }

  /**
   * 테스트 ID에서 시나리오 ID 추출 (TC-1.1.1 -> TC-1.1)
   */
  #extractScenarioId(testId: string): string {
    const parts = testId.split(".");
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return testId; // fallback
  }

  /**
   * URL에서 gid(시트 ID) 추출
   */
  #extractGidFromUrl(): string | null {
    const gidMatch = this.#url.match(/[#&]gid=([0-9]+)/);
    return gidMatch ? gidMatch[1] : null;
  }

  /**
   * gid로 시트 이름 찾기
   */
  async #getSheetNameByGid(gid: string): Promise<string | null> {
    try {
      const auth = await this.#authorize();
      const sheets = google.sheets({ version: "v4", auth: auth as any });

      const response = await sheets.spreadsheets.get({
        spreadsheetId: this.#spreadsheetId!,
      });

      const targetSheet = response.data.sheets?.find(
        (sheet) => sheet.properties?.sheetId?.toString() === gid
      );

      if (targetSheet?.properties?.title) {
        console.log(`🔍 gid ${gid} → 시트: "${targetSheet.properties.title}"`);
        return targetSheet.properties.title;
      }

      console.warn(`⚠️ gid ${gid}에 해당하는 시트를 찾을 수 없습니다.`);
      return null;
    } catch (error) {
      console.error("❌ 시트 정보 조회 실패:", error);
      return null;
    }
  }

  /**
   * 헤더 행을 읽어서 실제 데이터 범위 감지
   */
  async #detectDataRange(spreadsheetId: string): Promise<void> {
    const auth = await this.#authorize();
    const sheets = google.sheets({ version: "v4", auth: auth as any });

    try {
      // URL에서 gid 추출하여 시트 이름 확인
      let targetRange = GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE;
      const gid = this.#extractGidFromUrl();

      if (gid) {
        const sheetName = await this.#getSheetNameByGid(gid);
        if (sheetName) {
          targetRange = `'${sheetName}'!${GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE}`;
        }
      }

      // 첫 번째 행만 읽어서 실제 컬럼 수 파악
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: targetRange,
      });

      const headerRows = response.data.values;
      if (!headerRows || headerRows.length === 0) {
        console.log("⚠️  헤더 행에 데이터가 없습니다. 기본 범위를 사용합니다.");
        this.#detectedRange = targetRange.includes("!")
          ? targetRange.replace(
              GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE,
              GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE
            )
          : GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE;
        this.#lastColumn = "F";
        this.#actualRange = this.#detectedRange;
        return;
      }

      const secondRow = headerRows[1] || [];

      this.#lastColumn = this.#detectLastColumn(secondRow);
      this.#actualRange = `A:${this.#lastColumn}`;

      // 시트 정보를 포함한 감지된 범위 설정
      const rangeWithoutSheet = `A1:${this.#lastColumn}${
        GOOGLE_SHEETS_CONFIG.MAX_ROWS
      }`;
      this.#detectedRange = targetRange.includes("!")
        ? targetRange.replace(
            GOOGLE_SHEETS_CONFIG.HEADER_DETECTION_RANGE,
            rangeWithoutSheet
          )
        : rangeWithoutSheet;
    } catch (error) {
      console.error("❌ 데이터 범위 감지 실패:", error);
      console.log("⚠️  기본 범위를 사용합니다.");

      // 실패 시 기본 범위 사용
      this.#detectedRange = GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE;
      this.#lastColumn = "F";
      this.#actualRange = GOOGLE_SHEETS_CONFIG.DEFAULT_RANGE;
    }
  }

  /**
   * 컬럼 문자를 숫자로 변환 (A=1, B=2, ..., Z=26, AA=27, ...)
   */
  #columnLetterToNumber(columnLetter: string): number {
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
  #numberToColumnLetter(num: number): string {
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
  #detectLastColumn(headerRow: any[]): string {
    let lastColumnIndex = 0;
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] && headerRow[i].toString().trim() !== "") {
        lastColumnIndex = i;
      }
    }
    return this.#numberToColumnLetter(lastColumnIndex + 1);
  }

  /**
   * 마지막 컬럼 정보 반환
   */
  getLastColumn(): string | null {
    return this.#lastColumn;
  }

  /**
   * 결과값을 주입할 컬럼 정보 반환
   */
  getResultColumn(): string | null {
    if (!this.#lastColumn) return null;
    const lastColumnNum = this.#columnLetterToNumber(this.#lastColumn);
    return this.#numberToColumnLetter(lastColumnNum + 1);
  }

  /**
   * 감지된 실제 범위 정보 반환
   */
  getActualRange(): string | null {
    return this.#actualRange;
  }

  /**
   * 감지된 전체 범위 정보 반환
   */
  getDetectedRange(): string | null {
    return this.#detectedRange;
  }

  /**
   * 결과값 주입을 위한 범위 생성 (예: G2:G100)
   */
  getResultRange(startRow: number = 2, endRow?: number): string | null {
    const resultColumn = this.getResultColumn();
    if (!resultColumn) return null;

    const range = endRow
      ? `${resultColumn}${startRow}:${resultColumn}${endRow}`
      : `${resultColumn}${startRow}:${resultColumn}`;
    return range;
  }

  /**
   * 스프레드시트 ID 반환 (결과 주입 시 필요)
   */
  getSpreadsheetId(): string | null {
    return this.#spreadsheetId;
  }

  /**
   * Service Account를 사용한 인증
   */
  async #authorize() {
    try {
      // Service Account 키 파일 로드
      const auth = new google.auth.GoogleAuth({
        keyFile: GOOGLE_SHEETS_CONFIG.CREDENTIALS_PATH,
        scopes: GOOGLE_SHEETS_CONFIG.SCOPES,
      });

      const authClient = await auth.getClient();
      return authClient;
    } catch (error) {
      console.error("❌ 인증 실패:", error);
      throw new Error(
        `인증 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 구글 시트 URL에서 스프레드시트 ID 추출
   */
  #extractSpreadsheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("유효하지 않은 Google Sheets URL입니다.");
    }
    return match[1];
  }

  /**
   * 스프레드시트 데이터를 TScenarioData 형태로 변환 (Map 기반 그룹화)
   */
  #convertToScenarioData(rows: any[][]): TScenarioData[] {
    if (!rows || rows.length === 0) {
      return [];
    }

    const scenarioMap = new Map<string, TScenarioData>();

    // 첫 번째 행은 헤더이므로 건너뛰기
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const testId = row[COLUMN_MAPPING.testId] || "";
      if (!testId) continue; // 테스트 ID가 없으면 건너뛰기

      // 테스트 ID에서 시나리오 ID 추출 (TC-1.1.1 -> TC-1.1)
      const scenarioId = this.#extractScenarioId(testId);

      // 기존 시나리오가 있으면 가져오고, 없으면 새로 생성
      let scenario = scenarioMap.get(scenarioId);

      if (!scenario) {
        scenario = {
          scenarioId: row[COLUMN_MAPPING.scenarioId] || scenarioId,
          scenario: row[COLUMN_MAPPING.scenario] || "",
          steps: [],
        };
        scenarioMap.set(scenarioId, scenario);
      }

      // 스텝 데이터 추가
      scenario.steps.push({
        testId: testId,
        uiPath: row[COLUMN_MAPPING.uiPath] || "",
        when: row[COLUMN_MAPPING.when] || "",
        then: row[COLUMN_MAPPING.then] || "",
      });
    }

    // Map의 values를 배열로 변환하여 반환
    return Array.from(scenarioMap.values());
  }

  /**
   * 구글 시트에서 데이터 읽기
   */
  async #readSheetData(
    spreadsheetId: string,
    range: string
  ): Promise<TScenarioData[]> {
    const auth = await this.#authorize();
    const sheets = google.sheets({ version: "v4", auth: auth as any });

    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log("⚠️  시트에 데이터가 없습니다.");
        return [];
      }

      return this.#convertToScenarioData(rows);
    } catch (error) {
      console.error("❌ 시트 데이터 읽기 실패:", error);

      if (error instanceof Error) {
        if (/Unable to parse range/.test(error.message)) {
          throw new Error("잘못된 범위 지정입니다. 예: A:H 또는 Sheet1!A1:H10");
        }
        if (/Requested entity was not found/.test(error.message)) {
          throw new Error(
            "스프레드시트를 찾을 수 없습니다. URL과 권한을 확인해주세요."
          );
        }
      }

      throw error;
    }
  }
}

export { SheetsToJsonConverter };
