import * as fs from "fs-extra";
import { createScenarioCollector } from "../scenario-sheets";
import { PlaywrightStubGenerator } from "../stub-generator";
import { TestResultUpdater } from "../results-updater";
import { TGenerateOptions, TUpdateOptions } from "./types";

export async function generateTestCode(
  options: TGenerateOptions
): Promise<void> {
  console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
  console.log(`📁 출력 디렉토리: ${options.generatedStubDir}`);
  console.log(`🔑 Service Account 키: ${options.credentialsPath}`);

  try {
    await fs.ensureDir(options.generatedStubDir);

    const collector = createScenarioCollector(
      options.sheetsUrl,
      options.credentialsPath
    );
    const scenarios = await collector.collect();

    const stubGenerator = new PlaywrightStubGenerator();
    await stubGenerator.generate(scenarios, options.generatedStubDir);
  } catch (error) {
    throw new Error(`❌ 스텁 코드 생성 실패: ${error}`);
  }
}

export async function updateTestResults(
  options: TUpdateOptions
): Promise<void> {
  console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
  console.log(`📄 결과 JSON: ${options.jsonReporterPath}`);
  console.log(`🔑 Service Account 키: ${options.credentialsPath}`);

  try {
    if (!options.jsonReporterPath) {
      throw new Error("--reporter 옵션이 필요합니다");
    }

    new TestResultUpdater(
      options.sheetsUrl,
      options.jsonReporterPath,
      options.credentialsPath
    ).update();
  } catch (error) {
    throw new Error(`❌ 결과 업데이트 실패: ${error}`);
  }
}

export function showVersion(): void {
  const packageJson = require("../../package.json");
  console.log(`e2e-autogen v${packageJson.version}`);
}

export function showUsage(): void {
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
