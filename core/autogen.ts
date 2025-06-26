import * as path from "path";
import * as fs from "fs-extra";
import { TestCodeGenerator } from "./generator";
import { ScenarioParser } from "./parser";
import { TProcessingError, DEFAULT_DIRECTORIES } from "./types";

/**
 * E2E 테스트 자동 생성 메인 클래스
 * Google Sheets 기반 시나리오를 Playwright 테스트 스텁 코드로 변환
 */
class E2EAutogen implements TContract {
  readonly #parser: ScenarioParser;
  readonly #generator: TestCodeGenerator;

  constructor() {
    this.#parser = new ScenarioParser();
    this.#generator = new TestCodeGenerator();
  }

  /**
   * 시나리오 파일로부터 테스트 코드를 생성합니다.
   * @param scenarioPath 시나리오 JSON 파일 경로
   * @param outputDir 출력 디렉토리 (기본값: ./__generated__/playwright)
   * @throws {TProcessingError} 처리 실패 시
   */
  async generate(
    scenarioPath: string,
    outputDir: string = DEFAULT_DIRECTORIES.playwright
  ): Promise<void> {
    try {
      // 시나리오 파일 파싱
      const scenarios = await this.#parser.parseScenarioFile(scenarioPath);

      // 테스트 코드 생성
      await this.#generator.generateTestFiles(scenarios, outputDir);
    } catch (error) {
      this.#handleError("테스트 코드 생성", error);
    }
  }

  /**
   * scenarios 디렉토리의 모든 JSON 파일을 처리합니다.
   * @param scenariosDir 시나리오 디렉토리 (기본값: ./scenarios)
   * @param outputDir 출력 디렉토리 (기본값: ./__generated__/playwright)
   * @throws {TProcessingError} 처리 실패 시
   */
  async generateAll(
    scenariosDir: string = DEFAULT_DIRECTORIES.scenarios,
    outputDir: string = DEFAULT_DIRECTORIES.playwright
  ): Promise<void> {
    try {
      console.log(`🚀 ${scenariosDir} → ${outputDir}`);

      const jsonFiles = await this.#findJsonFiles(scenariosDir);

      if (jsonFiles.length === 0) {
        console.log("⚠️  처리할 JSON 파일이 없습니다.");
        return;
      }

      // 필요한 디렉토리 구조 생성
      await fs.ensureDir(outputDir);

      // 병렬로 파일 처리
      const processingPromises = jsonFiles.map((file) => {
        const filePath = path.join(scenariosDir, file);
        return this.generate(filePath, outputDir);
      });

      await Promise.all(processingPromises);

      console.log(`✅ ${jsonFiles.length}개 파일 처리 완료`);
    } catch (error) {
      this.#handleError("일괄 처리", error);
    }
  }

  /**
   * 지정된 디렉토리에서 JSON 파일들을 찾습니다.
   * @param directory 검색할 디렉토리
   * @returns JSON 파일 이름 배열
   */
  #findJsonFiles = async (directory: string): Promise<string[]> => {
    try {
      const files = await fs.readdir(directory);
      return files.filter(
        (file) => path.extname(file).toLowerCase() === ".json"
      );
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        throw this.#createProcessingError(
          "FILE_READ",
          `시나리오 디렉토리를 찾을 수 없습니다: ${directory}`,
          directory,
          error as Error
        );
      }
      throw this.#createProcessingError(
        "FILE_READ",
        `디렉토리 읽기 실패: ${directory}`,
        directory,
        error as Error
      );
    }
  };

  /**
   * 에러를 처리하고 적절한 메시지를 출력합니다.
   * @param operation 수행 중이던 작업명
   * @param error 발생한 에러
   */
  #handleError = (operation: string, error: any): never => {
    console.error(`\n❌ ${operation} 실패:`);

    if (this.#isProcessingError(error)) {
      console.error(`   타입: ${error.type}`);
      console.error(`   메시지: ${error.message}`);
      if (error.filePath) {
        console.error(`   파일: ${error.filePath}`);
      }
      if (error.originalError) {
        console.error(`   원본 오류: ${error.originalError.message}`);
      }
    } else {
      console.error(`   ${error.message || error}`);
    }

    process.exit(1);
  };

  /**
   * TProcessingError 객체를 생성합니다.
   */
  #createProcessingError = (
    type: TProcessingError["type"],
    message: string,
    filePath?: string,
    originalError?: Error
  ): TProcessingError => {
    return {
      type,
      message,
      filePath,
      originalError,
    };
  };

  /**
   * 객체가 TProcessingError 타입인지 확인합니다.
   */
  #isProcessingError = (error: any): error is TProcessingError => {
    return (
      error &&
      typeof error === "object" &&
      "type" in error &&
      "message" in error
    );
  };
}

export { E2EAutogen };

type TContract = {
  generate(scenarioPath: string, outputDir?: string): Promise<void>;
  generateAll(scenariosDir?: string, outputDir?: string): Promise<void>;
};
