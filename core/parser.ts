import * as fs from "fs-extra";
import {
  TScenarioData,
  TValidationError,
  TProcessingError,
  VALIDATION_MESSAGES,
} from "./types";
import { JsonOptimizer } from "./optimizer";

class ScenarioParser implements TContract {
  readonly #optimizer: JsonOptimizer;

  constructor() {
    this.#optimizer = new JsonOptimizer();
  }

  async parseScenarioFile(filePath: string): Promise<TScenarioData[]> {
    try {
      // 파일 존재 여부 확인
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw this.#createProcessingError(
          "FILE_READ",
          `파일을 찾을 수 없습니다: ${filePath}`,
          filePath
        );
      }

      // 모든 JSON은 flat 구조이므로 optimizer를 사용하여 처리
      return await this.#optimizer.optimizeJsonFile(filePath);
    } catch (error) {
      if (this.#isProcessingError(error)) {
        throw error;
      }

      throw this.#createProcessingError(
        "FILE_READ",
        `시나리오 파일 파싱 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        error as Error
      );
    }
  }

  validateScenarios(scenarios: TScenarioData[]): void {
    const errors: TValidationError[] = [];

    // 배열 타입 검증
    if (!Array.isArray(scenarios)) {
      errors.push({
        type: "INVALID_TYPE",
        message: "시나리오 데이터는 배열이어야 합니다",
      });
      throw this.#createValidationProcessingError(errors);
    }

    // 빈 배열 검증
    if (scenarios.length === 0) {
      errors.push({
        type: "EMPTY_ARRAY",
        message: "시나리오 데이터가 비어있습니다",
      });
      throw this.#createValidationProcessingError(errors);
    }

    // 각 시나리오 검증
    scenarios.forEach((scenario, index) => {
      this.#validateScenario(scenario, index, errors);
    });

    if (errors.length > 0) {
      throw this.#createValidationProcessingError(errors);
    }
  }

  #validateScenario(
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
          message: `시나리오 ${index}: ${this.#getValidationMessage(field)}`,
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
        this.#validateTestCase(test, index, testIndex, errors);
      });
    }
  }

  #validateTestCase(
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
          message: `시나리오 ${scenarioIndex}, 테스트 ${testIndex}: ${this.#getValidationMessage(
            field
          )}`,
          index: scenarioIndex,
          field,
        });
      }
    });
  }

  #getValidationMessage(field: string): string {
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

  #createProcessingError(
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

  #createValidationProcessingError(
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

  #isProcessingError(error: any): error is TProcessingError {
    return (
      error &&
      typeof error === "object" &&
      "type" in error &&
      "message" in error
    );
  }
}

export { ScenarioParser };

type TContract = {
  parseScenarioFile(filePath: string): Promise<TScenarioData[]>;
  validateScenarios(scenarios: TScenarioData[]): void;
};
