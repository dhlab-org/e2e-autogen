import * as fs from "fs-extra";
import {
  TProcessingError,
  TScenarioData,
  TStepData,
  TValidationError,
} from "../types";

type TScenarioParserContract = {
  parseScenarioFile(filePath: string): Promise<TScenarioData[]>;
  validateScenarios(scenarios: TScenarioData[]): void;
};

class ScenarioParser implements TScenarioParserContract {
  constructor() {}

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

      // JSON 파일 읽기
      const jsonData = await fs.readFile(filePath, "utf-8");
      const scenarios: TScenarioData[] = JSON.parse(jsonData);

      // 유효성 검증
      this.validateScenarios(scenarios);

      return scenarios;
    } catch (error) {
      if (this.#isProcessingError(error)) {
        throw error;
      }

      throw this.#createProcessingError(
        "JSON_PARSE",
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
      "scenarioId",
      "scenario",
      "steps",
    ];

    // 필수 필드 검증
    requiredFields.forEach((field) => {
      if (!scenario[field]) {
        errors.push({
          type: "MISSING_FIELD",
          message: `시나리오 ${index}: ${field} 필드가 필요합니다`,
          index,
          field,
        });
      }
    });

    // steps 배열 검증
    if (scenario.steps && !Array.isArray(scenario.steps)) {
      errors.push({
        type: "INVALID_TYPE",
        message: `시나리오 ${index}: steps 필드는 배열이어야 합니다`,
        index,
        field: "steps",
      });
      return;
    }

    // 각 스텝 검증
    if (Array.isArray(scenario.steps)) {
      scenario.steps.forEach((step, stepIndex) => {
        this.#validateStep(step, index, stepIndex, errors);
      });
    }
  }

  #validateStep(
    step: TStepData,
    scenarioIndex: number,
    stepIndex: number,
    errors: TValidationError[]
  ): void {
    const requiredStepFields: Array<keyof TStepData> = [
      "testId",
      "uiPath",
      "when",
      "then",
    ];

    requiredStepFields.forEach((field) => {
      if (!step[field]) {
        errors.push({
          type: "MISSING_FIELD",
          message: `시나리오 ${scenarioIndex}, 스텝 ${stepIndex}: ${field} 필드가 필요합니다`,
          index: scenarioIndex,
          field,
        });
      }
    });
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
