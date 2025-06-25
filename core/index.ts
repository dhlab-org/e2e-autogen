import * as path from "path";
import * as fs from "fs-extra";
import { TestCodeGenerator } from "./generator";
import { ScenarioParser } from "./parser";
import { JsonOptimizer } from "./optimizer";
import {
  TGenerationOptions,
  TOptimizationOptions,
  TProcessingError,
  DEFAULT_DIRECTORIES,
} from "./types";

/**
 * E2E 테스트 자동 생성 메인 클래스
 * Google Sheets 기반 시나리오를 Playwright 테스트 스텁 코드로 변환
 */
class E2EAutogen {
  private readonly parser: ScenarioParser;
  private readonly generator: TestCodeGenerator;
  private readonly optimizer: JsonOptimizer;

  constructor() {
    this.parser = new ScenarioParser();
    this.generator = new TestCodeGenerator();
    this.optimizer = new JsonOptimizer();
  }

  /**
   * 시나리오 파일로부터 테스트 코드를 생성합니다.
   * @param scenarioPath 시나리오 JSON 파일 경로
   * @param outputDir 출력 디렉토리 (기본값: ./__generated__/playwright)
   * @param optimize 원본 JSON을 최적화할지 여부 (기본값: false)
   * @throws {TProcessingError} 처리 실패 시
   */
  async generate(
    scenarioPath: string,
    outputDir: string = DEFAULT_DIRECTORIES.playwright,
    optimize: boolean = false
  ): Promise<void> {
    try {
      console.log("🚀 E2E 테스트 코드 생성 시작...");
      console.log(`📁 시나리오 파일: ${scenarioPath}`);
      console.log(`📁 출력 디렉토리: ${outputDir}`);

      let scenarios;

      if (optimize) {
        // 원본 JSON 최적화 후 처리
        console.log("\n🔧 원본 JSON 최적화 중...");
        scenarios = await this.optimizer.optimizeJsonFile(scenarioPath);

        // 최적화된 JSON을 저장
        await this.saveOptimizedJson(scenarios, scenarioPath);
      } else {
        // 기존 방식으로 시나리오 파일 파싱
        console.log("\n📖 시나리오 파일 파싱 중...");
        scenarios = await this.parser.parseScenarioFile(scenarioPath);
      }

      console.log(`✅ ${scenarios.length}개의 시나리오 그룹 파싱 완료`);

      // 테스트 코드 생성
      console.log("\n🔨 테스트 코드 생성 중...");
      await this.generator.generateTestFiles(scenarios, outputDir);

      console.log("\n🎉 테스트 코드 생성 완료!");
      console.log(`📁 생성된 파일들: ${outputDir}`);
    } catch (error) {
      this.handleError("테스트 코드 생성", error);
    }
  }

  /**
   * 원본 JSON 파일을 최적화하여 프로젝트 형식에 맞게 변환합니다.
   * @param inputPath 원본 JSON 파일 경로
   * @param outputPath 최적화된 JSON 출력 경로 (선택사항)
   * @param options 최적화 옵션 (선택사항)
   * @throws {TProcessingError} 처리 실패 시
   */
  async optimizeJson(
    inputPath: string,
    outputPath?: string,
    options: Partial<TOptimizationOptions> = {}
  ): Promise<void> {
    try {
      console.log("🔧 JSON 최적화 작업 시작...");
      console.log(`📁 입력 파일: ${inputPath}`);

      // 원본 JSON 유효성 검사
      const isValid = await this.optimizer.validateRawJson(inputPath);
      if (!isValid) {
        throw this.createProcessingError(
          "VALIDATION",
          "원본 JSON 파일이 유효하지 않습니다",
          inputPath
        );
      }

      // JSON 최적화
      const optimizedScenarios = await this.optimizer.optimizeJsonFile(
        inputPath,
        options
      );

      // 최적화된 JSON 저장
      const finalOutputPath = this.resolveOptimizedOutputPath(
        inputPath,
        outputPath
      );
      await this.optimizer.saveOptimizedJson(
        optimizedScenarios,
        finalOutputPath
      );

      console.log("🎉 JSON 최적화 완료!");
      console.log(`📁 최적화된 파일: ${finalOutputPath}`);
    } catch (error) {
      this.handleError("JSON 최적화", error);
    }
  }

  /**
   * scenarios 디렉토리의 모든 JSON 파일을 처리합니다.
   * @param scenariosDir 시나리오 디렉토리 (기본값: ./scenarios)
   * @param outputDir 출력 디렉토리 (기본값: ./__generated__/playwright)
   * @param optimize 원본 JSON을 최적화할지 여부 (기본값: false)
   * @throws {TProcessingError} 처리 실패 시
   */
  async generateAll(
    scenariosDir: string = DEFAULT_DIRECTORIES.scenarios,
    outputDir: string = DEFAULT_DIRECTORIES.playwright,
    optimize: boolean = false
  ): Promise<void> {
    try {
      console.log("🚀 모든 시나리오 파일 처리 시작...");

      const jsonFiles = await this.findJsonFiles(scenariosDir);

      if (jsonFiles.length === 0) {
        console.log("⚠️  처리할 JSON 파일이 없습니다.");
        return;
      }

      console.log(`📁 발견된 JSON 파일: ${jsonFiles.length}개`);

      // 필요한 디렉토리 구조 생성
      await this.ensureDirectories();

      // 병렬로 파일 처리
      const processingPromises = jsonFiles.map((file) => {
        const filePath = path.join(scenariosDir, file);
        console.log(`\n📄 처리 중: ${file}`);
        return this.generate(filePath, outputDir, optimize);
      });

      await Promise.all(processingPromises);

      console.log("\n🎉 모든 시나리오 파일 처리 완료!");
      console.log(`📁 최적화된 JSON: ${DEFAULT_DIRECTORIES.optimizedJson}/`);
      console.log(`📁 생성된 테스트: ${DEFAULT_DIRECTORIES.playwright}/`);
    } catch (error) {
      this.handleError("일괄 처리", error);
    }
  }

  /**
   * 원본 JSON 파일들을 일괄 최적화합니다.
   * @param scenariosDir 시나리오 디렉토리 (기본값: ./scenarios)
   * @param options 최적화 옵션 (선택사항)
   * @throws {TProcessingError} 처리 실패 시
   */
  async optimizeAllJson(
    scenariosDir: string = DEFAULT_DIRECTORIES.scenarios,
    options: Partial<TOptimizationOptions> = {}
  ): Promise<void> {
    try {
      console.log("🔧 모든 JSON 파일 최적화 시작...");

      const jsonFiles = await this.findJsonFiles(scenariosDir);

      if (jsonFiles.length === 0) {
        console.log("⚠️  최적화할 JSON 파일이 없습니다.");
        return;
      }

      console.log(`📁 발견된 JSON 파일: ${jsonFiles.length}개`);

      // 최적화 디렉토리 생성
      await fs.ensureDir(DEFAULT_DIRECTORIES.optimizedJson);

      // 병렬로 파일 최적화
      const optimizationPromises = jsonFiles.map((file) => {
        const inputPath = path.join(scenariosDir, file);
        const fileName = path.basename(file, ".json");
        const outputPath = path.join(
          DEFAULT_DIRECTORIES.optimizedJson,
          `${fileName}.optimized.json`
        );

        console.log(`\n📄 최적화 중: ${file}`);
        return this.optimizeJson(inputPath, outputPath, options);
      });

      await Promise.all(optimizationPromises);

      console.log("\n🎉 모든 JSON 파일 최적화 완료!");
      console.log(`📁 최적화된 파일들: ${DEFAULT_DIRECTORIES.optimizedJson}/`);
    } catch (error) {
      this.handleError("일괄 최적화", error);
    }
  }

  /**
   * 최적화된 JSON을 저장합니다.
   * @param scenarios 최적화된 시나리오 데이터
   * @param originalPath 원본 파일 경로
   */
  private async saveOptimizedJson(
    scenarios: any[],
    originalPath: string
  ): Promise<void> {
    const fileName = path.basename(originalPath, ".json");
    const optimizedPath = path.join(
      DEFAULT_DIRECTORIES.optimizedJson,
      `${fileName}.optimized.json`
    );

    await fs.ensureDir(DEFAULT_DIRECTORIES.optimizedJson);
    await this.optimizer.saveOptimizedJson(scenarios, optimizedPath);
  }

  /**
   * JSON 파일들을 찾습니다.
   * @param directory 검색할 디렉토리
   * @returns JSON 파일 이름 배열
   */
  private async findJsonFiles(directory: string): Promise<string[]> {
    try {
      const files = await fs.readdir(directory);
      return files.filter(
        (file: string) =>
          file.endsWith(".json") &&
          !file.includes("optimized") &&
          !file.includes("generated") &&
          !file.includes("backup")
      );
    } catch (error) {
      throw this.createProcessingError(
        "DIRECTORY_CREATE",
        `디렉토리를 읽을 수 없습니다: ${directory}`,
        directory,
        error as Error
      );
    }
  }

  /**
   * 필요한 디렉토리들을 생성합니다.
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      DEFAULT_DIRECTORIES.generated,
      DEFAULT_DIRECTORIES.optimizedJson,
      DEFAULT_DIRECTORIES.playwright,
    ];

    await Promise.all(directories.map((dir) => fs.ensureDir(dir)));
  }

  /**
   * 최적화된 JSON 출력 경로를 결정합니다.
   * @param inputPath 입력 파일 경로
   * @param outputPath 지정된 출력 경로 (선택사항)
   * @returns 최종 출력 경로
   */
  private resolveOptimizedOutputPath(
    inputPath: string,
    outputPath?: string
  ): string {
    if (outputPath) {
      return outputPath;
    }

    const fileName = path.basename(inputPath, ".json");
    return path.join(
      DEFAULT_DIRECTORIES.optimizedJson,
      `${fileName}.optimized.json`
    );
  }

  /**
   * 에러를 처리하고 로깅합니다.
   * @param operation 수행 중인 작업
   * @param error 발생한 에러
   */
  private handleError(operation: string, error: any): never {
    const errorMessage = this.isProcessingError(error)
      ? error.message
      : error instanceof Error
      ? error.message
      : String(error);

    console.error(`❌ ${operation} 실패:`, errorMessage);

    if (this.isProcessingError(error) && error.filePath) {
      console.error(`📁 파일 경로: ${error.filePath}`);
    }

    process.exit(1);
  }

  /**
   * TProcessingError 객체를 생성합니다.
   * @param type 에러 타입
   * @param message 에러 메시지
   * @param filePath 파일 경로 (선택사항)
   * @param originalError 원본 에러 (선택사항)
   * @returns TProcessingError 객체
   */
  private createProcessingError(
    type: TProcessingError["type"],
    message: string,
    filePath?: string,
    originalError?: Error
  ): TProcessingError {
    return {
      type,
      message,
      filePath,
      originalError,
    };
  }

  /**
   * 객체가 TProcessingError 타입인지 확인합니다.
   * @param error 확인할 객체
   * @returns TProcessingError 타입 여부
   */
  private isProcessingError(error: any): error is TProcessingError {
    return (
      error &&
      typeof error === "object" &&
      "type" in error &&
      "message" in error
    );
  }
}

// ===== CLI 실행 로직 =====

/**
 * CLI 명령어를 파싱하고 실행합니다.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const autogen = new E2EAutogen();

  try {
    // 플래그 파싱
    const optimize = args.includes("--optimize");
    const filteredArgs = args.filter((arg) => arg !== "--optimize");
    const command = filteredArgs[0];

    switch (command) {
      case "optimize":
        await handleOptimizeCommand(autogen, filteredArgs);
        break;

      case "generate":
      case undefined:
        await handleGenerateCommand(autogen, filteredArgs, optimize);
        break;

      default:
        // 첫 번째 인자가 파일 경로인 경우
        if (command && (command.endsWith(".json") || command.includes("/"))) {
          await handleGenerateCommand(autogen, filteredArgs, optimize);
        } else {
          showUsage();
          process.exit(1);
        }
    }
  } catch (error) {
    console.error("❌ 예상치 못한 오류:", error);
    process.exit(1);
  }
}

/**
 * optimize 명령어를 처리합니다.
 * @param autogen E2EAutogen 인스턴스
 * @param args 명령어 인자
 */
async function handleOptimizeCommand(
  autogen: E2EAutogen,
  args: string[]
): Promise<void> {
  switch (args.length) {
    case 1:
      // 모든 JSON 파일 최적화
      await autogen.optimizeAllJson();
      break;
    case 2:
      // 단일 파일 최적화
      await autogen.optimizeJson(args[1]);
      break;
    case 3:
      // 입력/출력 파일 지정
      await autogen.optimizeJson(args[1], args[2]);
      break;
    default:
      console.log("사용법:");
      console.log(
        "  yarn optimize                           # 모든 JSON 파일 최적화"
      );
      console.log(
        "  yarn optimize <input.json>              # 단일 파일 최적화"
      );
      console.log(
        "  yarn optimize <input.json> <output.json> # 출력 파일 지정"
      );
      process.exit(1);
  }
}

/**
 * generate 명령어를 처리합니다.
 * @param autogen E2EAutogen 인스턴스
 * @param args 명령어 인자
 * @param optimize 최적화 플래그
 */
async function handleGenerateCommand(
  autogen: E2EAutogen,
  args: string[],
  optimize: boolean
): Promise<void> {
  const generateArgs = args.filter((arg) => arg !== "generate");

  switch (generateArgs.length) {
    case 0:
      // 모든 시나리오 파일 처리
      await autogen.generateAll(
        DEFAULT_DIRECTORIES.scenarios,
        DEFAULT_DIRECTORIES.playwright,
        optimize
      );
      break;
    case 1:
      // 단일 파일 처리
      await autogen.generate(
        generateArgs[0],
        DEFAULT_DIRECTORIES.playwright,
        optimize
      );
      break;
    case 2:
      // 파일과 출력 디렉토리 지정
      await autogen.generate(generateArgs[0], generateArgs[1], optimize);
      break;
    default:
      console.log("사용법:");
      console.log(
        "  yarn generate                           # 모든 시나리오 파일 처리"
      );
      console.log("  yarn generate <scenario.json>           # 단일 파일 처리");
      console.log(
        "  yarn generate <scenario.json> <output-dir> # 출력 디렉토리 지정"
      );
      console.log(
        "  yarn generate --optimize                # 최적화와 함께 생성"
      );
      process.exit(1);
  }
}

/**
 * 사용법을 표시합니다.
 */
function showUsage(): void {
  console.log("🧪 E2E Autogen - Playwright 테스트 스텁 코드 생성기");
  console.log("\n사용 가능한 명령어:");
  console.log("  generate  - 테스트 코드 생성 (기본)");
  console.log("  optimize  - JSON 파일 최적화");
  console.log("\n사용법 예시:");
  console.log(
    "  yarn generate                           # 모든 시나리오 파일 처리"
  );
  console.log("  yarn generate <scenario.json>           # 단일 파일 처리");
  console.log("  yarn generate --optimize                # 최적화와 함께 생성");
  console.log(
    "  yarn optimize                           # 모든 JSON 파일 최적화"
  );
  console.log("\n생성된 파일 위치:");
  console.log("  📁 최적화된 JSON: __generated__/optimized-json/");
  console.log("  📁 테스트 파일: __generated__/playwright/");
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ 예상치 못한 오류:", error);
    process.exit(1);
  });
}
