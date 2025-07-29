import { google, sheets_v4 } from "googleapis";
import { TGoogleSheetColumns } from "../config";
import { CoverageSheet, CoverageSheetContract } from "./coverage-sheet";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";
import { TestSuiteSheet, TestSuiteSheetContract } from "./test-suite-sheet";

async function authorizedGoogleSpreadsheets(
  sheetsUrl: string,
  credentialsFile: string,
  googleSheetColumns: TGoogleSheetColumns
) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const authClient = await auth.getClient();
    const v4sheets = google.sheets({
      version: "v4",
      auth: authClient,
    } as any);

    return new GoogleSpreadsheets(sheetsUrl, v4sheets, googleSheetColumns);
  } catch (error) {
    throw new Error(`Google Sheets 인증 실패: ${error}`);
  }
}

type GoogleSpreadsheetsContract = {
  id: string;
  fullUrl: string;
  suitesMeta(): Promise<Map<string, { gid: string; title: string }>>;
  sheet(gid: string): SpreadsheetSheetContract;
  testSuiteSheet(gid: string): TestSuiteSheetContract;
  coverageSheet(): Promise<CoverageSheetContract>;
};

class GoogleSpreadsheets implements GoogleSpreadsheetsContract {
  readonly #sheetsUrl: string;
  readonly #v4sheets: sheets_v4.Sheets;
  #cachedSheets: sheets_v4.Schema$Sheet[] | null = null;
  readonly #googleSheetColumns: TGoogleSheetColumns;

  constructor(
    sheetsUrl: string,
    v4sheets: sheets_v4.Sheets,
    googleSheetColumns: TGoogleSheetColumns
  ) {
    this.#sheetsUrl = sheetsUrl;
    this.#v4sheets = v4sheets;
    this.#googleSheetColumns = googleSheetColumns;
  }

  get id() {
    const match = this.#sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("유효하지 않은 Google Sheets URL입니다.");
    }
    return match[1];
  }

  get fullUrl() {
    return this.#sheetsUrl;
  }

  async suitesMeta() {
    const rawSheets = await this.#rawSheets();

    const suitesMeta = new Map<string, { gid: string; title: string }>();

    for (const sheet of rawSheets) {
      const title: string = sheet.properties?.title ?? "";
      const match = title.match(/^\s*\[(TC-\d+)]/i);
      if (match) {
        const prefix = match[1]; // e.g., TC-4
        suitesMeta.set(prefix, {
          gid: String(sheet.properties?.sheetId),
          title,
        });
      }
    }

    return suitesMeta;
  }

  sheet(gid: string) {
    return new SpreadsheetSheet(this.id, gid, this.#v4sheets, () =>
      this.#rawSheets()
    );
  }

  testSuiteSheet(gid: string) {
    return new TestSuiteSheet(
      this.id,
      gid,
      this.#v4sheets,
      this.#googleSheetColumns,
      () => this.#rawSheets()
    );
  }

  async coverageSheet(): Promise<CoverageSheetContract> {
    const rawSheets = await this.#rawSheets();
    const sheetTitle = "[COVERAGE]";

    const existingSheet = rawSheets.find(
      (sheet) => sheet.properties?.title === sheetTitle
    );

    let gid: string | undefined = existingSheet?.properties?.sheetId
      ? String(existingSheet.properties.sheetId)
      : undefined;

    if (!gid) {
      const response = await this.#v4sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.id,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  index: 0, // 첫 번째 시트에 삽입
                },
              },
            },
          ],
        },
      });

      const newSheetProperties =
        response.data.replies?.[0]?.addSheet?.properties;
      if (newSheetProperties?.sheetId != null) {
        gid = String(newSheetProperties.sheetId);
        this.#invalidateCache();
      }
    }

    if (!gid) {
      throw new Error("`[COVERAGE]` 시트를 찾거나 생성하는 데 실패했습니다.");
    }

    return new CoverageSheet(this.id, gid, this.#v4sheets, () =>
      this.#rawSheets()
    );
  }

  /**
   * 시트 정보를 캐싱하여 반복적인 API 호출을 방지합니다.
   * 첫 번째 호출 시에만 API를 요청하고, 이후에는 캐시된 데이터를 반환합니다.
   */
  async #rawSheets(): Promise<sheets_v4.Schema$Sheet[]> {
    if (this.#cachedSheets) {
      return this.#cachedSheets;
    }

    const response = await this.#v4sheets.spreadsheets.get({
      spreadsheetId: this.id,
    });

    this.#cachedSheets = response.data.sheets ?? [];
    return this.#cachedSheets;
  }

  #invalidateCache(): void {
    this.#cachedSheets = null;
  }
}

export { authorizedGoogleSpreadsheets, type GoogleSpreadsheetsContract };
