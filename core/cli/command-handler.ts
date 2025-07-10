import * as fs from "fs-extra";
import { TCliOptions } from "./argument-parser";
import { createScenarioCollector } from "../scenario-sheets";
import { PlaywrightStubGenerator } from "../stub-generator";
import { TestResultUpdater } from "../results-updater";

type TContract = {
  generateTestCode(options: TCliOptions): Promise<void>;
  updateTestResults(options: TCliOptions): Promise<void>;
  showVersion(): void;
  showUsage(): void;
};

class CommandHandler implements TContract {
  async generateTestCode(options: TCliOptions): Promise<void> {
    console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
    console.log(`📁 출력 디렉토리: ${options.outputDir}`);
    console.log(`🔑 Service Account 키: ${options.credentialsPath}`);

    try {
      await fs.ensureDir(options.outputDir);

      const collector = createScenarioCollector(
        options.sheetsUrl,
        options.credentialsPath
      );
      const scenarios = await collector.collect();

      const stubGenerator = new PlaywrightStubGenerator();
      await stubGenerator.generate(scenarios, options.outputDir);
    } catch (error) {
      console.error("\n❌ 작업 실패:", error);
      throw error;
    }
  }

  async updateTestResults(options: TCliOptions): Promise<void> {
    console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
    console.log(`📄 결과 JSON: ${options.resultsPath}`);
    console.log(`🔑 Service Account 키: ${options.credentialsPath}`);

    try {
      if (!options.resultsPath) {
        throw new Error("--results 옵션이 필요합니다");
      }

      new TestResultUpdater(
        options.sheetsUrl,
        options.resultsPath,
        options.credentialsPath
      ).update();
    } catch (error) {
      console.error("\n❌ 결과 업데이트 실패:", error);
      throw error;
    }
  }

  showVersion(): void {
    const packageJson = require("../../package.json");
    console.log(`e2e-autogen v${packageJson.version}`);
  }

  showUsage(): void {
    console.log(`
사용법: e2e-autogen [옵션] <서브커맨드> [서브커맨드 옵션]

전역 옵션:
  -h, --help          도움말 표시
  -v, --version       버전 정보 표시

서브커맨드:
  generate            Google Sheets → Playwright 스텁 생성 (기본값)
  update              Playwright 결과 JSON → Google Sheets 업데이트

서브커맨드 공통 옵션:
  --sheets, --url     Google Sheets URL (필수)
  --credentials       Service Account 키 파일 경로 (기본값: playwright/.auth/credentials.json)

generate 옵션:
  --output, -o <dir>  출력 디렉토리 (기본값: ./__generated__/playwright)

update 옵션:
  --results, -r <file> Playwright JSON 리포터 파일 경로 (필수)

예시:
  # 스텁 코드 생성
  e2e-autogen generate --sheets "https://docs.google.com/..." -o ./playwright/__generated__

  # 결과 업데이트
  e2e-autogen update --sheets "https://docs.google.com/..." \\
                    --results ./playwright/reporters/results.json

  # 커스텀 Service Account 키 사용
  e2e-autogen generate --sheets "https://docs.google.com/..." \\
                      --credentials ./custom/path/credentials.json
`);
  }
}

export { CommandHandler };
