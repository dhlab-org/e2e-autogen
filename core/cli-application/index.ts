import { match } from "ts-pattern";
import { TE2EAutogenConfig } from "../config";
import { authorizedGoogleSpreadsheets } from "../google-spreadsheets";
import { TestCoverage } from "../test-coverage";
import { TestRegistry } from "../test-registry";
import { TestScribe } from "../test-scribe";
import { Command, CommandContract } from "./command";

import { version } from "../../package.json";

type CliApplicationContract = {
  run(): Promise<void>;
};

class CliApplication implements CliApplicationContract {
  readonly #command: CommandContract;

  constructor(args: string[], config: TE2EAutogenConfig) {
    this.#command = new Command(args, config);
  }

  async run(): Promise<void> {
    try {
      match(this.#command)
        .with({ type: "FLAG", flag: "HELP" }, () => {
          this.#showUsage();
          process.exit(0);
        })
        .with({ type: "FLAG", flag: "VERSION" }, () => {
          this.#showVersion();
          process.exit(0);
        })
        .with({ type: "SUB_COMMAND", subCommand: "GENERATE" }, async () => {
          await this.#generateStub();
        })
        .with({ type: "SUB_COMMAND", subCommand: "UPDATE" }, async () => {
          await this.#logResults();
        })
        .exhaustive();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }

  #showUsage(): void {
    console.log(`
┌─────────────────────────────────────────────────────────────────┐
│                         E2E AutoGen                            │
│                Google Sheets 기반 E2E 테스트 자동화            │
└─────────────────────────────────────────────────────────────────┘

📋 사용법:
  e2e-autogen [명령어] [옵션]

🚀 명령어:
  generate    Google Sheets에서 스텁 코드 생성
  update      테스트 결과를 Google Sheets에 업데이트

🔧 옵션:
  -h, --help     도움말 표시
  -v, --version  버전 정보 표시

📋 설정 파일:
  프로젝트 루트에 'e2e-autogen.config.ts' 파일이 필요합니다.

  예시 설정:
  export default {
    sheetsUrl: "https://docs.google.com/spreadsheets/d/...",
    framework: "playwright", // 또는 "detox"
    stubOutputFolder: "./tests/e2e",
    jsonReporterFile: "./test-results.json",
    credentialsFile: "./credentials.json",
    googleSheetColumns: {
      scenarioId: "A",
      scenarioDescription: "B", 
      uiPath: "C",
      when: "D",
      then: "E",
      testId: "F",
      tag: "G",
      comment: "H"
    }
  };

💡 사용 예시:
  # 스텁 코드 생성
  e2e-autogen generate

  # 테스트 결과 업데이트  
  e2e-autogen update

📚 자세한 문서: https://github.com/dhlab-org/e2e-autogen
    `);
  }

  #showVersion(): void {
    console.log(`e2e-autogen v${version}`);
  }

  async #generateStub() {
    const {
      sheetsUrl,
      credentialsFile,
      stubOutputFolder,
      framework,
      googleSheetColumns,
    } = this.#command.optionsOf("GENERATE");

    const googleSpreadsheets = await authorizedGoogleSpreadsheets(
      sheetsUrl,
      credentialsFile,
      googleSheetColumns
    );

    const testScribe = new TestScribe(googleSpreadsheets, stubOutputFolder);
    await testScribe.generateStubFor(framework);
  }

  async #logResults() {
    const { sheetsUrl, jsonReporterFile, credentialsFile, googleSheetColumns } =
      this.#command.optionsOf("UPDATE");

    const googleSpreadsheets = await authorizedGoogleSpreadsheets(
      sheetsUrl,
      credentialsFile,
      googleSheetColumns
    );

    const testRegistry = new TestRegistry(jsonReporterFile, googleSpreadsheets);
    const resultsPerSuite = await testRegistry.resultsPerSuite();
    await testRegistry.logResults(resultsPerSuite);

    const testCoverage = new TestCoverage(resultsPerSuite);
    await testCoverage.update(googleSpreadsheets);
  }
}

export { CliApplication, type CliApplicationContract };
