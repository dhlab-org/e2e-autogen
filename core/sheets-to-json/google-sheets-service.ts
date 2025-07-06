import { google } from "googleapis";
import { GOOGLE_SHEETS_CONFIG } from "./config";

type TGoogleSheetsServiceContract = {
  authorize(): Promise<void>;
  getSpreadsheetInfo(spreadsheetId: string): Promise<any>;
  readValues(spreadsheetId: string, range: string): Promise<any[][]>;
  getSheetNameByGid(spreadsheetId: string, gid: string): Promise<string | null>;
  authorized(): boolean;
};

class GoogleSheetsService implements TGoogleSheetsServiceContract {
  readonly #credentialsPath: string;
  readonly #scopes: string[];
  #auth: any = null;
  #sheets: any = null;

  constructor() {
    this.#credentialsPath = GOOGLE_SHEETS_CONFIG.CREDENTIALS_PATH;
    this.#scopes = GOOGLE_SHEETS_CONFIG.SCOPES;
  }

  /**
   * Service Account를 사용한 인증
   */
  async authorize(): Promise<void> {
    try {
      // Service Account 키 파일 로드
      const auth = new google.auth.GoogleAuth({
        keyFile: this.#credentialsPath,
        scopes: this.#scopes,
      });

      this.#auth = await auth.getClient();
      this.#sheets = google.sheets({ version: "v4", auth: this.#auth });
    } catch (error) {
      console.error("❌ 인증 실패:", error);
      throw new Error(
        `인증 실패: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 스프레드시트 정보 가져오기
   */
  async getSpreadsheetInfo(spreadsheetId: string): Promise<any> {
    if (!this.#sheets) {
      throw new Error("인증이 필요합니다. authorize()를 먼저 호출하세요.");
    }

    try {
      const response = await this.#sheets.spreadsheets.get({
        spreadsheetId,
      });
      return response.data;
    } catch (error) {
      console.error("❌ 스프레드시트 정보 조회 실패:", error);
      throw error;
    }
  }

  /**
   * 시트 데이터 읽기
   */
  async readValues(spreadsheetId: string, range: string): Promise<any[][]> {
    if (!this.#sheets) {
      throw new Error("인증이 필요합니다. authorize()를 먼저 호출하세요.");
    }

    try {
      const response = await this.#sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
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

  /**
   * gid로 시트 이름 찾기
   */
  async getSheetNameByGid(
    spreadsheetId: string,
    gid: string
  ): Promise<string | null> {
    try {
      const spreadsheetInfo = await this.getSpreadsheetInfo(spreadsheetId);
      const targetSheet = spreadsheetInfo.sheets?.find(
        (sheet: any) => sheet.properties?.sheetId?.toString() === gid
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
   * 인증 상태 확인
   */
  authorized(): boolean {
    return this.#auth !== null && this.#sheets !== null;
  }
}

export { GoogleSheetsService };
