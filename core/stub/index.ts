import * as fs from "fs-extra";

import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { TCSheetBundle } from "./tcsheet-bundle";
import { Scenario } from "./scenario";

type StubGeneratorContract = {
  generateForPlaywright(): Promise<void>;
};

class StubGenerator implements StubGeneratorContract {
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;
  readonly #targetDir: string;

  constructor(
    googleSpreadsheets: GoogleSpreadsheetsContract,
    targetDir: string
  ) {
    this.#googleSpreadsheets = googleSpreadsheets;
    this.#targetDir = targetDir;
  }

  async generateForPlaywright(): Promise<void> {
    console.log(`🔗 Google Sheets URL: ${this.#googleSpreadsheets.fullUrl}`);
    console.log(`📁 출력 디렉토리: ${this.#targetDir}`);

    try {
      await fs.ensureDir(this.#targetDir);

      const tcSheetBundle = new TCSheetBundle(this.#googleSpreadsheets);
      const scenario = new Scenario(tcSheetBundle);

      // 1. 시트에서 데이터 수집 -> Map<TC-x, TRow[]>
      const rowsMapByPrefix = await tcSheetBundle.collectedRowsMapByPrefix();

      // 2. 데이터 구조화 -> Map<TC-x, TScenarioData[]>
      const scenariosMapByPrefix = await scenario.scenariosMapByPrefix(
        rowsMapByPrefix
      );

      console.log(">>", scenariosMapByPrefix);

      // 3. 스텁 코드 생성: PlaywrightStubGenerator
      /// 3.1. TC-x.spec.ts 생성
    } catch (error) {
      throw new Error(`❌ Playwright 스텁 코드 생성 실패: ${error}`);
    }
  }
}

export { StubGenerator, type StubGeneratorContract };
