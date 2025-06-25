import * as fs from "fs-extra";
import {
  TScenarioData,
  TScenarioParserContract,
  TValidationError,
  TProcessingError,
  VALIDATION_MESSAGES,
} from "./types";

/**
 * 시나리오 JSON 파일 파싱 및 유효성 검증을 담당하는 클래스
 */
class ScenarioParser implements TScenarioParserContract {
  /**
   * 시나리오 JSON 파일을 읽어서 파싱합니다.
   * @param filePath 시나리오 JSON 파일 경로
   * @returns 파싱된 시나리오 데이터 배열
   * @throws {TProcessingError} 파일 읽기, JSON 파싱, 유효성 검증 실패 시
   */
  async parseScenarioFile(filePath: string): Promise<TScenarioData[]> {
    try {
      // 파일 존재 여부 확인
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw this.createProcessingError(
          "FILE_READ",
          `파일을 찾을 수 없습니다: ${filePath}`,
          filePath
        );
      }

      // 파일 읽기
      const fileContent = await fs.readFile(filePath, "utf-8");

      // JSON 파싱
      let scenarios: TScenarioData[];
      try {
        scenarios = JSON.parse(fileContent);
      } catch (parseError) {
        throw this.createProcessingError(
          "JSON_PARSE",
          `JSON 파싱 실패: 올바른 JSON 형식이 아닙니다`,
          filePath,
          parseError as Error
        );
      }

      // 데이터 유효성 검증
      this.validateScenarios(scenarios);

      return scenarios;
    } catch (error) {
      if (this.isProcessingError(error)) {
        throw error;
      }

      throw this.createProcessingError(
        "FILE_READ",
        `시나리오 파일 파싱 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        error as Error
      );
    }
  }

  /**
   * 시나리오 데이터의 유효성을 검증합니다.
   * @param scenarios 검증할 시나리오 데이터
   * @throws {TProcessingError} 유효성 검증 실패 시
   */
  validateScenarios(scenarios: TScenarioData[]): void {
    const errors: TValidationError[] = [];

    // 배열 타입 검증
    if (!Array.isArray(scenarios)) {
      errors.push({
        type: "INVALID_TYPE",
        message: "시나리오 데이터는 배열이어야 합니다",
      });
      throw this.createValidationProcessingError(errors);
    }

    // 빈 배열 검증
    if (scenarios.length === 0) {
      errors.push({
        type: "EMPTY_ARRAY",
        message: "시나리오 데이터가 비어있습니다",
      });
      throw this.createValidationProcessingError(errors);
    }

    // 각 시나리오 검증
    scenarios.forEach((scenario, index) => {
      this.validateScenario(scenario, index, errors);
    });

    if (errors.length > 0) {
      throw this.createValidationProcessingError(errors);
    }
  }

  /**
   * 개별 시나리오의 유효성을 검증합니다.
   * @param scenario 검증할 시나리오
   * @param index 시나리오 인덱스
   * @param errors 에러 배열 (참조로 전달)
   */
  private validateScenario(
    scenario: TScenarioData,
    index: number,
    errors: TValidationError[]
  ): void {
    const requiredFields: Array<keyof TScenarioData> = [
      "group",
      "sheetId",
      "screenId",
      "tests",
    ];

    // 필수 필드 검증
    requiredFields.forEach((field) => {
      if (!scenario[field]) {
        errors.push({
          type: "MISSING_FIELD",
          message: `시나리오 ${index}: ${this.getValidationMessage(field)}`,
          index,
          field,
        });
      }
    });

    // tests 배열 검증
    if (scenario.tests && !Array.isArray(scenario.tests)) {
      errors.push({
        type: "INVALID_TYPE",
        message: `시나리오 ${index}: ${VALIDATION_MESSAGES.INVALID_TESTS_ARRAY}`,
        index,
        field: "tests",
      });
      return;
    }

    // 각 테스트 케이스 검증
    if (Array.isArray(scenario.tests)) {
      scenario.tests.forEach((test, testIndex) => {
        this.validateTestCase(test, index, testIndex, errors);
      });
    }
  }

  /**
   * 개별 테스트 케이스의 유효성을 검증합니다.
   * @param test 검증할 테스트 케이스
   * @param scenarioIndex 시나리오 인덱스
   * @param testIndex 테스트 인덱스
   * @param errors 에러 배열 (참조로 전달)
   */
  private validateTestCase(
    test: any,
    scenarioIndex: number,
    testIndex: number,
    errors: TValidationError[]
  ): void {
    const requiredTestFields = [
      "testId",
      "path",
      "description",
      "given",
      "when",
      "then",
    ];

    requiredTestFields.forEach((field) => {
      if (!test[field]) {
        errors.push({
          type: "MISSING_FIELD",
          message: `시나리오 ${scenarioIndex}, 테스트 ${testIndex}: ${this.getValidationMessage(
            field
          )}`,
          index: scenarioIndex,
          field,
        });
      }
    });
  }

  /**
   * 시나리오들을 screenId별로 그룹화합니다.
   * @param scenarios 시나리오 데이터 배열
   * @returns screenId별로 그룹화된 시나리오 데이터
   */
  groupByScreenId(scenarios: TScenarioData[]): Map<string, TScenarioData[]> {
    const grouped = new Map<string, TScenarioData[]>();

    scenarios.forEach((scenario) => {
      const screenId = scenario.screenId;
      if (!grouped.has(screenId)) {
        grouped.set(screenId, []);
      }
      grouped.get(screenId)!.push(scenario);
    });

    return grouped;
  }

  /**
   * 필드명에 대응하는 유효성 검증 메시지를 반환합니다.
   * @param field 필드명
   * @returns 유효성 검증 메시지
   */
  private getValidationMessage(field: string): string {
    const messageMap: Record<string, string> = {
      group: VALIDATION_MESSAGES.MISSING_GROUP,
      sheetId: VALIDATION_MESSAGES.MISSING_SHEET_ID,
      screenId: VALIDATION_MESSAGES.MISSING_SCREEN_ID,
      tests: VALIDATION_MESSAGES.INVALID_TESTS_ARRAY,
      testId: VALIDATION_MESSAGES.MISSING_TEST_ID,
      path: VALIDATION_MESSAGES.MISSING_PATH,
      description: VALIDATION_MESSAGES.MISSING_DESCRIPTION,
      given: VALIDATION_MESSAGES.MISSING_GIVEN,
      when: VALIDATION_MESSAGES.MISSING_WHEN,
      then: VALIDATION_MESSAGES.MISSING_THEN,
    };

    return messageMap[field] || `${field} 필드가 필요합니다`;
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
   * 유효성 검증 에러들을 TProcessingError로 변환합니다.
   * @param validationErrors 유효성 검증 에러 배열
   * @returns TProcessingError 객체
   */
  private createValidationProcessingError(
    validationErrors: TValidationError[]
  ): TProcessingError {
    const errorMessages = validationErrors
      .map((error) => error.message)
      .join(", ");

    return {
      type: "VALIDATION",
      message: `유효성 검증 실패: ${errorMessages}`,
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

export { ScenarioParser };
