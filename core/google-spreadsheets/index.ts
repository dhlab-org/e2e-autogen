import { google, sheets_v4 } from "googleapis";
import {
  SpreadsheetSheet,
  SpreadsheetSheetContract,
} from "./spreadsheet-sheet";

async function authorizedGoogleSpreadsheets(
  sheetsUrl: string,
  credentialsPath: string
) {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
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

type TGoogleSpreadsheetsContract = {
  id: string;
  sheets(): Promise<TSheetsMeta>;
  sheet(gid: string): SpreadsheetSheetContract;
};

class GoogleSpreadsheets implements TGoogleSpreadsheetsContract {
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

  async sheets() {
    const response = await this.#v4sheets.spreadsheets.get({
      spreadsheetId: this.id,
    });

    const rawSheets = response.data.sheets ?? [];

    const sheetsMetaMapByPrefix = new Map<
      string,
      { gid: string; title: string }
    >();
    for (const sheet of rawSheets) {
      const title: string = sheet.properties?.title ?? "";
      const match = title.match(/^\s*\[(TC-\d+)]/i);
      if (match) {
        const prefix = match[1]; // e.g., TC-4
        sheetsMetaMapByPrefix.set(prefix, {
          gid: String(sheet.properties?.sheetId),
          title,
        });
      }
    }

    return {
      rawSheets,
      sheetsMetaMapByPrefix,
    };
  }

  sheet(gid: string) {
    return new SpreadsheetSheet(this.id, gid, this.#v4sheets);
  }
}

export { authorizedGoogleSpreadsheets, type TGoogleSpreadsheetsContract };

type TSheetsMeta = {
  rawSheets: sheets_v4.Schema$Sheet[];
  sheetsMetaMapByPrefix: Map<string, { gid: string; title: string }>;
};
