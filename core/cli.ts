#!/usr/bin/env node

import * as fs from "fs-extra";
import { E2EAutogen } from "./autogen";
import { createScenarioSheet } from "./sheets-to-json";
import { DEFAULT_DIRECTORIES } from "./types";

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  try {
    const options = parseArgs(args);

    // 도움말 또는 버전 표시
    if (options.help) {
      showUsage();
      process.exit(0);
    }

    if (options.version) {
      showVersion();
      process.exit(0);
    }

    // sheetsUrl이 없으면 에러
    if (!options.sheetsUrl) {
      console.error("❌ Google Sheets URL이 필요합니다.");
      showUsage();
      process.exit(1);
    }

    // 테스트 코드 생성
    await handleGenerateCommand(options);
  } catch (error) {
    console.error("❌ 예상치 못한 오류:", error);
    process.exit(1);
  }
};

// 메인 함수 실행
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ CLI 실행 중 오류:", error);
    process.exit(1);
  });
}

function parseArgs(args: string[]): TCliOptions {
  const options: TCliOptions = {
    sheetsUrl: "",
    outputDir: DEFAULT_DIRECTORIES.playwright,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--sheets":
      case "--url":
        if (i + 1 < args.length) {
          options.sheetsUrl = args[++i];
        } else {
          throw new Error("--sheets 옵션에는 Google Sheets URL이 필요합니다");
        }
        break;

      case "--output":
      case "-o":
        if (i + 1 < args.length) {
          options.outputDir = args[++i];
        } else {
          throw new Error("--output 옵션에는 디렉토리 경로가 필요합니다");
        }
        break;

      case "--help":
      case "-h":
        options.help = true;
        break;

      case "--version":
      case "-v":
        options.version = true;
        break;

      default:
        // 첫 번째 인자가 URL이면 sheetsUrl로 사용
        if (!arg.startsWith("-") && !options.sheetsUrl) {
          options.sheetsUrl = arg;
        } else if (arg.startsWith("-")) {
          console.warn(`⚠️  알 수 없는 옵션: ${arg}`);
        }
        break;
    }
  }

  return options;
}

async function handleGenerateCommand(options: TCliOptions): Promise<void> {
  console.log(`🔗 Google Sheets URL: ${options.sheetsUrl}`);
  console.log(`📁 출력 디렉토리: ${options.outputDir}`);

  try {
    // 📊 1단계: Google Sheets → JSON 변환
    await fs.ensureDir(options.outputDir);

    const scenarioSheet = createScenarioSheet(options.sheetsUrl);
    const scenarios = await scenarioSheet.scenarios();

    // 📊 2단계: JSON → 스텁 코드 생성
    const autogen = new E2EAutogen();
    await autogen.generateFromData(scenarios, options.outputDir);
  } catch (error) {
    console.error("\n❌ 작업 실패:", error);
    throw error;
  }
}

function showVersion(): void {
  const packageJson = require("../package.json");
  console.log(`e2e-autogen v${packageJson.version}`);
}

function showUsage(): void {
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

type TCliOptions = {
  sheetsUrl: string;
  outputDir: string;
  help: boolean;
  version: boolean;
};
