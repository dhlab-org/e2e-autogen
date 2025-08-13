import { match } from "ts-pattern";
import type { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { DetoxTemplate } from "./detox-template";
import { PlaywrightTemplate } from "./playwright-template";
import { Scenario } from "./scenario";
import { TCSheetBundle } from "./tcsheet-bundle";

type TestScribeContract = {
  generateStubFor(framework: "playwright" | "detox"): Promise<void>;
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

  async generateStubFor(framework: "playwright" | "detox"): Promise<void> {
    try {
      console.log("🚀 스텁 생성을 시작합니다...");

      // 1. 시트별 로우 데이터 수집 -> Map<TC-x, TRow[]>
      const tcSheetBundle = new TCSheetBundle(this.#googleSpreadsheets);
      const rowsPerPrefix = await tcSheetBundle.rowsPerPrefix();

      // 2. 데이터 구조화 -> Map<TC-x, TScenarioData[]>
      const scenario = new Scenario(this.#googleSpreadsheets);
      const scenariosPerPrefix = await scenario.scenariosPerPrefix(
        rowsPerPrefix
      );

      // 3. 스텁 코드 생성
      match(framework)
        .with("playwright", async () => {
          const playwrightTemplate = new PlaywrightTemplate(scenariosPerPrefix);
          await playwrightTemplate.write(this.#targetDir);
        })
        .with("detox", async () => {
          const detoxTemplate = new DetoxTemplate(scenariosPerPrefix);
          await detoxTemplate.write(this.#targetDir);
        })
        .exhaustive();

      console.log("✅ 스텁 생성이 완료되었습니다!");
    } catch (error) {
      console.error("❌ 스텁 생성 실패:", error);
      throw error;
    }
  }
}

export { TestScribe, type TestScribeContract };
