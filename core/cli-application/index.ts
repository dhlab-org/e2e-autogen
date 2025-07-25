import { match } from "ts-pattern";
import { authorizedGoogleSpreadsheets } from "../google-spreadsheets";
import { TestRegistry } from "../test-registry";
import { TestScribe } from "../test-scribe";
import { Command, CommandContract } from "./command";
import { version } from "../../package.json";
import { TestCoverage } from "../test-coverage";

type CliApplicationContract = {
  run(): Promise<void>;
};

class CliApplication implements CliApplicationContract {
  readonly #command: CommandContract;

  constructor(args: string[]) {
    this.#command = new Command(args);
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
  사용법: e2e-autogen 서브커맨드 [옵션] <옵션 값>
  
  플래그:
    -h, --help          도움말 표시
    -v, --version       버전 정보 표시
  
  서브커맨드:
    generate            Google Sheets → Playwright 스텁 생성 (기본값)
    update              Playwright 결과 JSON → Google Sheets 업데이트
  
  서브커맨드 공통 옵션:
    --sheets            Google Sheets URL (필수)
    --credentials       Service Account 키 파일 경로 (기본값: ./playwright/.auth/credentials.json)
  
  generate 옵션:
    --output <dir>  출력 디렉토리 (기본값: ./playwright/__generated-stub__)
  
  update 옵션:
    --reporter <file> Playwright JSON 리포터 파일 경로 (필수)
  
  예시:
    # 스텁 코드 생성
    e2e-autogen generate --sheets "https://docs.google.com/..." \\
                        --output ./playwright/__generated-stub__
  
    # 결과 업데이트
    e2e-autogen update --sheets "https://docs.google.com/..." \\
                      --reporter ./playwright/reporters/results.json
  
    # 커스텀 Service Account 키 사용
    e2e-autogen generate --sheets "https://docs.google.com/..." \\
                        --credentials ./custom/path/credentials.json
  `);
  }

  #showVersion(): void {
    console.log(`e2e-autogen v${version}`);
  }

  async #generateStub() {
    const { sheetsUrl, credentialsPath, generatedStubDir } =
      this.#command.optionsOf("GENERATE");

    const googleSpreadsheets = await authorizedGoogleSpreadsheets(
      sheetsUrl,
      credentialsPath
    );

    const testScribe = new TestScribe(googleSpreadsheets, generatedStubDir);

    await testScribe.generateStubForPlaywright();
  }

  async #logResults() {
    const { sheetsUrl, jsonReporterPath, credentialsPath } =
      this.#command.optionsOf("UPDATE");

    const googleSpreadsheets = await authorizedGoogleSpreadsheets(
      sheetsUrl,
      credentialsPath
    );

    const testRegistry = new TestRegistry(jsonReporterPath, googleSpreadsheets);
    const resultsPerSuite = await testRegistry.resultsPerSuite();
    await testRegistry.logResults(resultsPerSuite);

    const testCoverage = new TestCoverage(resultsPerSuite);
    await testCoverage.update(googleSpreadsheets);
  }
}

export { CliApplication, type CliApplicationContract };
