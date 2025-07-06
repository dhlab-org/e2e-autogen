import * as fs from "fs-extra";
import { TestCodeGenerator } from "./generator";
import { ScenarioParser } from "./parser";
import { DEFAULT_DIRECTORIES, TProcessingError, TScenarioData } from "./types";

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
   * 시나리오 데이터로부터 테스트 코드를 생성합니다.
   * @param scenarios 시나리오 데이터 배열
   * @param outputDir 출력 디렉토리 (기본값: ./__generated__/playwright)
   * @throws {TProcessingError} 처리 실패 시
   */
  async generateFromData(
    scenarios: TScenarioData[],
    outputDir: string = DEFAULT_DIRECTORIES.playwright
  ): Promise<void> {
    try {
      console.log(`🚀 시나리오 데이터 → ${outputDir}`);

      if (scenarios.length === 0) {
        console.log("⚠️  처리할 시나리오 데이터가 없습니다.");
        return;
      }

      // 필요한 디렉토리 구조 생성
      await fs.ensureDir(outputDir);

      // 테스트 코드 생성
      await this.#generator.generateTestFiles(scenarios, outputDir);

      console.log(`✅ ${scenarios.length}개 시나리오 처리 완료`);
    } catch (error) {
      this.#handleError("테스트 코드 생성", error);
    }
  }

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
  generateFromData(
    scenarios: TScenarioData[],
    outputDir?: string
  ): Promise<void>;
};
