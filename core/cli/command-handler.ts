import * as fs from "fs-extra";
import { TCliOptions } from "./argument-parser";
import { createScenarioSheet } from "../sheets-to-json";
import { createStubGenerator } from "../stub-generator";

/**
 * CLI 명령어 실행을 담당한다
 */
class CommandHandler implements TCommandHandler {
  async generateTestCode(options: TCliOptions): Promise<void> {
    console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
    console.log(`📁 출력 디렉토리: ${options.outputDir}`);

    try {
      await fs.ensureDir(options.outputDir);

      const scenarioSheet = createScenarioSheet(options.sheetsUrl);
      const scenarios = await scenarioSheet.scenarios();

      const autogen = createStubGenerator();
      await autogen.generateFromData(scenarios, options.outputDir);
    } catch (error) {
      console.error("\n❌ 작업 실패:", error);
      throw error;
    }
  }

  showVersion(): void {
    const packageJson = require("../../package.json");
    console.log(`e2e-autogen v${packageJson.version}`);
  }

  showUsage(): void {
    console.log(`
사용법: e2e-autogen <Google Sheets URL> [옵션]

필수:
  <URL>                Google Sheets URL

옵션:
  --output, -o <dir>   출력 디렉토리 (기본값: ./__generated__/playwright)
  --help, -h           도움말 표시
  --version, -v        버전 정보 표시

예시:
  e2e-autogen "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0"
  e2e-autogen --sheets "https://docs.google.com/..." --output ./tests
  e2e-autogen "https://docs.google.com/..." -o ./playwright/__generated__
`);
  }
}

export { CommandHandler };

type TCommandHandler = {
  generateTestCode(options: TCliOptions): Promise<void>;
  showVersion(): void;
  showUsage(): void;
};
