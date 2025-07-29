import { match } from "ts-pattern";
import { authorizedGoogleSpreadsheets } from "../google-spreadsheets";
import { TestRegistry } from "../test-registry";
import { TestScribe } from "../test-scribe";
import { Command, CommandContract } from "./command";
import { TestCoverage } from "../test-coverage";
import { TE2EAutogenConfig } from "../config";

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
      # e2e-autogen.config.ts 파일을 생성하고 설정해주세요.
      # 예시: 
      # 
      # 
      # 
      # 
      # 
  사용법: e2e-autogen 서브커맨드
  
  플래그:
    -h, --help          도움말 표시
    -v, --version       버전 정보 표시
  
  서브커맨드:
    generate            Google Sheets → 스텁 생성
    update              JSON 결과 → Google Sheets 업데이트
  
  예시:
    # 스텁 코드 생성
    e2e-autogen generate
  
    # 결과 업데이트
    e2e-autogen update 
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
