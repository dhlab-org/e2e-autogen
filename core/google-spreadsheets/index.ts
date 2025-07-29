import { google, sheets_v4 } from "googleapis";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";
import { TestSuiteSheet, TestSuiteSheetContract } from "./test-suite-sheet";
import { CoverageSheet, CoverageSheetContract } from "./coverage-sheet";

async function authorizedGoogleSpreadsheets(
  sheetsUrl: string,
  credentialsFile: string
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

    return new GoogleSpreadsheets(sheetsUrl, v4sheets);
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

  constructor(sheetsUrl: string, v4sheets: sheets_v4.Sheets) {
    this.#sheetsUrl = sheetsUrl;
    this.#v4sheets = v4sheets;
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
    return new SpreadsheetSheet(this.id, gid, this.#v4sheets);
  }

  testSuiteSheet(gid: string) {
    return new TestSuiteSheet(this.id, gid, this.#v4sheets);
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
      }
    }

    if (!gid) {
      throw new Error("`[COVERAGE]` 시트를 찾거나 생성하는 데 실패했습니다.");
    }

    return new CoverageSheet(this.id, gid, this.#v4sheets);
  }

  async #rawSheets(): Promise<sheets_v4.Schema$Sheet[]> {
    const response = await this.#v4sheets.spreadsheets.get({
      spreadsheetId: this.id,
    });

    return response.data.sheets ?? [];
  }
}

export { authorizedGoogleSpreadsheets, type GoogleSpreadsheetsContract };
