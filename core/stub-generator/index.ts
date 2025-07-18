import * as fs from "fs-extra";
import * as path from "path";
import {
  TProcessingError,
  TScenarioData,
  TStepData,
  DEFAULT_DIRECTORIES,
} from "../types";

type TContract = {
  generate(scenarios: TScenarioData[], outputDir?: string): Promise<void>;
};

class PlaywrightStubGenerator implements TContract {
  async generate(
    scenarios: TScenarioData[],
    outputDir: string = DEFAULT_DIRECTORIES.playwright
  ): Promise<void> {
    console.log(`🚀 시나리오 데이터 → ${outputDir}`);

    if (scenarios.length === 0) {
      console.log("⚠️  처리할 시나리오 데이터가 없습니다.");
      return;
    }

    await this.#generateTestFiles(scenarios, outputDir);
    console.log(`✅ ${scenarios.length}개 시나리오 처리 완료`);
  }

  async #generateTestFiles(
    scenarios: TScenarioData[],
    outputDir: string
  ): Promise<void> {
    try {
      // 출력 디렉토리 생성
      await fs.ensureDir(outputDir);

      // 시나리오를 prefix별로 그룹화 (TC-1.1, TC-1.2 -> TC-1)
      const groupedScenarios = this.#groupScenariosByPrefix(scenarios);

      // 각 prefix별로 테스트 파일 생성
      await Promise.all(
        Array.from(groupedScenarios.entries()).map(([prefix, scenarioGroup]) =>
          this.#generateGroupTestFile(prefix, scenarioGroup, outputDir)
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      throw this.#createProcessingError(
        "FILE_WRITE",
        `테스트 파일 생성 실패: ${errorMessage}`,
        outputDir,
        error as Error
      );
    }
  }

  #groupScenariosByPrefix(
    scenarios: TScenarioData[]
  ): Map<string, TScenarioData[]> {
    return scenarios.reduce((grouped, scenario) => {
      const prefix = scenario.scenarioId.split(".")[0]; // TC-1.1 -> TC-1
      const existingGroup = grouped.get(prefix) ?? [];
      return grouped.set(prefix, [...existingGroup, scenario]);
    }, new Map<string, TScenarioData[]>());
  }

  async #generateGroupTestFile(
    prefix: string,
    scenarios: TScenarioData[],
    outputDir: string
  ): Promise<void> {
    try {
      const fileName = `${prefix}.stub.ts`;
      const filePath = path.join(outputDir, fileName);

      // 테스트 코드 생성
      const testCode = this.#groupTestCode(scenarios);

      // 파일 쓰기
      await fs.writeFile(filePath, testCode, "utf-8");
      console.log(`✅ 생성됨: ${filePath} (${scenarios.length}개 시나리오)`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      throw this.#createProcessingError(
        "FILE_WRITE",
        `테스트 파일 생성 실패 (${prefix}): ${errorMessage}`,
        outputDir,
        error as Error
      );
    }
  }

  #groupTestCode(scenarios: TScenarioData[]): string {
    const scenarioIds = scenarios.map((s) => s.scenarioId).join(", ");
    const testCodes = scenarios
      .map((scenario) => this.#generateTestForScenario(scenario))
      .join("\n\n");

    return [
      "// 📝 Auto-generated by E2E-Autogen",
      `// 🔧 Generated from: ${scenarioIds}`,
      "",
      `import { test } from "@playwright/test";`,
      "",
      testCodes,
    ].join("\n");
  }

  #generateTestForScenario(scenario: TScenarioData): string {
    const scenarioTitle = this.#sanitizeText(
      `[${scenario.scenarioId}] ${scenario.scenario}`,
      true
    );
    const steps = scenario.steps
      .map((step) => this.#generateStep(step))
      .join("\n\n");

    return `test.skip("${scenarioTitle}", async ({ page }) => {
${steps}
});`;
  }

  #generateStep(step: TStepData): string {
    const hasUiPath = step.uiPath.trim().length > 0;
    const hasWhen = step.when.trim().length > 0;
    const stepTitle = this.#sanitizeText(
      hasWhen
        ? `[${step.testId}] ${step.when} -> ${step.then}`
        : `[${step.testId}] ${step.then}`,
      true
    );

    const uiPathSection = hasUiPath ? `// 📍 UI Path: ${step.uiPath}\n` : "";
    const whenSection = hasWhen
      ? `// 🎬 When: ${this.#sanitizeText(step.when)}\n`
      : "";
    const thenSection = `// ✅ Then: ${this.#sanitizeText(step.then)}\n`;

    return `  await test.step.skip("${stepTitle}", async () => {
      ${uiPathSection}
      ${whenSection}    
      ${thenSection}
    });`;
  }

  #sanitizeText(text: string, escapeQuotes: boolean = false): string {
    let result = text
      .replace(/\n/g, " ") // 개행 문자 제거
      .replace(/\s+/g, " ") // 연속된 공백 정리
      .trim();

    if (escapeQuotes) {
      result = result.replace(/"/g, '\\"'); // 쌍따옴표 이스케이프
    }

    return result;
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
}

export { PlaywrightStubGenerator };
