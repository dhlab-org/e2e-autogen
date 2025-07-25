import * as fs from "fs-extra";

import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { TCSheetBundle } from "./tcsheet-bundle";
import { Scenario } from "./scenario";
import { PlaywrightTemplate } from "./playwright-template";
import { DetoxTemplate } from "./detox-template";
import { match } from "ts-pattern";

type TestScribeContract = {
  generateStubFor(testingLibrary: "playwright" | "detox"): Promise<void>;
};

class TestScribe implements TestScribeContract {
  readonly #googleSpreadsheets: GoogleSpreadsheetsContract;
  readonly #targetDir: string;

  constructor(
    googleSpreadsheets: GoogleSpreadsheetsContract,
    targetDir: string
  ) {
    this.#googleSpreadsheets = googleSpreadsheets;
    this.#targetDir = targetDir;
  }

  async generateStubFor(testingLibrary: "playwright" | "detox"): Promise<void> {
    console.log(`🔗 Google Sheets URL: ${this.#googleSpreadsheets.fullUrl}`);
    console.log(`📁 출력 디렉토리: ${this.#targetDir}`);

    try {
      await fs.ensureDir(this.#targetDir);

      // 1. 시트에서 데이터 수집 -> Map<TC-x, TRow[]>
      const tcSheetBundle = new TCSheetBundle(this.#googleSpreadsheets);
      const rowsPerPrefix = await tcSheetBundle.rowsPerPrefix();

      // 2. 데이터 구조화 -> Map<TC-x, TScenarioData[]>
      const scenario = new Scenario(this.#googleSpreadsheets);
      const scenariosPerPrefix = await scenario.scenariosPerPrefix(
        rowsPerPrefix
      );

      // 3. 스텁 코드 생성
      match(testingLibrary)
        .with("playwright", async () => {
          const template = new PlaywrightTemplate(scenariosPerPrefix);
          await template.write(this.#targetDir);
        })
        .with("detox", async () => {
          const template = new DetoxTemplate(scenariosPerPrefix);
          await template.write(this.#targetDir);
        })
        .exhaustive();
    } catch (error) {
      throw new Error(`❌ Playwright 스텁 코드 생성 실패: ${error}`);
    }
  }
}

export { TestScribe, type TestScribeContract };
