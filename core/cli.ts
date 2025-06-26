#!/usr/bin/env node

import { E2EAutogen } from "./autogen";
import { DEFAULT_DIRECTORIES } from "./types";

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const autogen = new E2EAutogen();

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

    // 테스트 코드 생성
    await handleGenerateCommand(autogen, options);
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
    scenariosDir: DEFAULT_DIRECTORIES.scenarios,
    outputDir: DEFAULT_DIRECTORIES.playwright,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--scenarios":
        if (i + 1 < args.length) {
          options.scenariosDir = args[++i];
        } else {
          throw new Error("--scenarios 옵션에는 디렉토리 경로가 필요합니다");
        }
        break;

      case "--output":
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
        if (arg.startsWith("-")) {
          console.warn(`⚠️  알 수 없는 옵션: ${arg}`);
        }
        break;
    }
  }

  return options;
}

async function handleGenerateCommand(
  autogen: E2EAutogen,
  options: TCliOptions
): Promise<void> {
  console.log(`📁 시나리오 디렉토리: ${options.scenariosDir}`);
  console.log(`📁 출력 디렉토리: ${options.outputDir}`);

  await autogen.generateAll(options.scenariosDir, options.outputDir);
}

function showVersion(): void {
  const packageJson = require("../package.json");
  console.log(`e2e-autogen v${packageJson.version}`);
}

function showUsage(): void {
  console.log(`
사용법: e2e-autogen [옵션]

옵션:
  --scenarios <dir>    시나리오 디렉토리 (기본값: ./scenarios)
  --output <dir>       출력 디렉토리 (기본값: ./__generated__/playwright)
  --help, -h           도움말 표시
  --version, -v        버전 정보 표시

예시:
  e2e-autogen
  e2e-autogen --scenarios ./playwright/scenarios --output ./playwright/__generated__
`);
}

type TCliOptions = {
  scenariosDir: string;
  outputDir: string;
  help: boolean;
  version: boolean;
};
