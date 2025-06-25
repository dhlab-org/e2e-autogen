import * as fs from "fs-extra";
import * as path from "path";
import {
  TScenarioData,
  TTestCase,
  TRawTestData,
  TJsonOptimizerContract,
  TOptimizationResult,
  TOptimizationSummary,
  TProcessingError,
  TOptimizationOptions,
} from "./types";

/**
 * JSON 최적화 클래스
 * Google Sheets에서 변환된 JSON을 프로젝트 형식에 맞게 최적화
 */
class JsonOptimizer implements TJsonOptimizerContract {
  private readonly defaultOptions: TOptimizationOptions = {
    fillEmptyFields: true,
    formatTestIds: true,
    validateOutput: true,
    createBackup: false,
  };

  /**
   * JSON 파일을 파싱하여 템플릿 생성에 최적화된 형태로 변환
   * @param filePath JSON 파일 경로
   * @param options 최적화 옵션 (선택사항)
   * @returns 최적화된 시나리오 데이터 배열
   * @throws {TProcessingError} 파일 처리 실패 시
   */
  async optimizeJsonFile(
    filePath: string,
    options: Partial<TOptimizationOptions> = {}
  ): Promise<TScenarioData[]> {
    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      console.log(`📊 JSON 최적화 시작: ${filePath}`);

      // 파일 존재 여부 확인
      const fileExists = await fs.pathExists(filePath);
      if (!fileExists) {
        throw this.createProcessingError(
          "FILE_READ",
          `파일을 찾을 수 없습니다: ${filePath}`,
          filePath
        );
      }

      // 백업 생성 (옵션)
      if (finalOptions.createBackup) {
        await this.createBackup(filePath);
      }

      // 파일 읽기 및 파싱
      const rawData = await this.parseJsonFile(filePath);

      // 파일명에서 sheetId 추출
      const sheetId = this.extractSheetId(filePath);

      // 데이터 최적화
      const optimizedData = this.optimizeRawData(
        rawData,
        sheetId,
        finalOptions
      );

      // 출력 유효성 검증 (옵션)
      if (finalOptions.validateOutput) {
        this.validateOptimizedData(optimizedData);
      }

      // 최적화 결과 생성
      const result = this.createOptimizationResult(sheetId, optimizedData);

      // 최적화 결과 요약 출력
      this.printOptimizationSummary(result);

      return result.scenarios;
    } catch (error) {
      if (this.isProcessingError(error)) {
        throw error;
      }

      throw this.createProcessingError(
        "JSON_PARSE",
        `JSON 최적화 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        error as Error
      );
    }
  }

  /**
   * 최적화된 JSON을 파일로 저장
   * @param scenarios 최적화된 시나리오 데이터
   * @param outputPath 출력 파일 경로
   * @throws {TProcessingError} 파일 저장 실패 시
   */
  async saveOptimizedJson(
    scenarios: TScenarioData[],
    outputPath: string
  ): Promise<void> {
    try {
      // 출력 디렉토리 생성
      const outputDir = path.dirname(outputPath);
      await fs.ensureDir(outputDir);

      // JSON 문자열 생성 (들여쓰기 포함)
      const jsonString = JSON.stringify(scenarios, null, 2);

      // 파일 쓰기
      await fs.writeFile(outputPath, jsonString, "utf-8");
      console.log(`💾 최적화된 JSON 저장: ${outputPath}`);
    } catch (error) {
      throw this.createProcessingError(
        "FILE_WRITE",
        `파일 저장 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        outputPath,
        error as Error
      );
    }
  }

  /**
   * 원본 JSON 파일의 유효성을 검증합니다.
   * @param filePath JSON 파일 경로
   * @returns 유효성 검증 결과
   */
  async validateRawJson(filePath: string): Promise<boolean> {
    try {
      const rawData = await this.parseJsonFile(filePath);

      // 기본 구조 검증
      if (!Array.isArray(rawData)) {
        console.warn(`⚠️  경고: ${filePath}는 배열 형태가 아닙니다.`);
        return false;
      }

      if (rawData.length === 0) {
        console.warn(`⚠️  경고: ${filePath}는 빈 배열입니다.`);
        return false;
      }

      // 필수 필드 존재 여부 검증
      const hasRequiredFields = rawData.some((item) =>
        this.hasAnyRequiredField(item)
      );

      if (!hasRequiredFields) {
        console.warn(`⚠️  경고: ${filePath}에 필수 필드가 없습니다.`);
        return false;
      }

      console.log(`✅ ${filePath} 유효성 검증 통과`);
      return true;
    } catch (error) {
      console.error(`❌ ${filePath} 유효성 검증 실패:`, error);
      return false;
    }
  }

  /**
   * JSON 파일을 읽고 파싱합니다.
   * @param filePath 파일 경로
   * @returns 파싱된 원본 데이터
   */
  private async parseJsonFile(filePath: string): Promise<TRawTestData[]> {
    try {
      const jsonData = await fs.readFile(filePath, "utf-8");
      return JSON.parse(jsonData);
    } catch (error) {
      throw this.createProcessingError(
        "JSON_PARSE",
        `JSON 파싱 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
        filePath,
        error as Error
      );
    }
  }

  /**
   * 파일 경로에서 sheetId를 추출합니다.
   * @param filePath 파일 경로
   * @returns sheetId
   */
  private extractSheetId(filePath: string): string {
    return path.basename(filePath, ".json");
  }

  /**
   * 원본 데이터를 최적화합니다.
   * @param rawData 원본 데이터
   * @param sheetId 시트 ID
   * @param options 최적화 옵션
   * @returns 최적화된 시나리오 데이터
   */
  private optimizeRawData(
    rawData: TRawTestData[],
    sheetId: string,
    options: TOptimizationOptions
  ): TScenarioData[] {
    // 빈 필드 채우기를 위한 변수들
    let currentScreenId = "";
    let currentGroup = "";
    let currentPath = "";

    // 데이터 정리 및 변환
    const processedData: TRawTestData[] = rawData.map((item, index) => {
      if (options.fillEmptyFields) {
        // 빈 필드를 이전 값으로 채우기 (병합된 셀 처리)
        if (item.screenId?.trim()) {
          currentScreenId = item.screenId.trim();
        }
        if (item.group?.trim()) {
          currentGroup = item.group.trim();
        }
        if (item.path?.trim()) {
          currentPath = item.path.trim();
        }
      }

      return {
        screenId:
          currentScreenId || `${sheetId}-${String(index + 1).padStart(3, "0")}`,
        group: currentGroup || "기본 그룹",
        testId: options.formatTestIds
          ? String(item.testId || index + 1).padStart(3, "0")
          : String(item.testId || index + 1),
        path: item.path?.trim() || currentPath || "",
        description: item.description?.trim() || "",
        given:
          item.given?.trim() ||
          item.path?.trim() ||
          currentPath ||
          "테스트 조건 설정",
        when: item.when?.trim() || "사용자 액션 수행",
        then: item.then?.trim() || "예상 결과 확인",
      };
    });

    // 중첩 구조 생성: screenId -> group -> tests
    return this.createNestedStructure(processedData, sheetId);
  }

  /**
   * 중첩 구조를 생성합니다.
   * @param processedData 처리된 원본 데이터
   * @param sheetId 시트 ID
   * @returns 중첩 구조의 시나리오 데이터
   */
  private createNestedStructure(
    processedData: TRawTestData[],
    sheetId: string
  ): TScenarioData[] {
    const screenGroupMap = new Map<string, Map<string, TTestCase[]>>();

    processedData.forEach((item) => {
      // screenId별 맵이 없으면 생성
      if (!screenGroupMap.has(item.screenId)) {
        screenGroupMap.set(item.screenId, new Map<string, TTestCase[]>());
      }

      const groupMap = screenGroupMap.get(item.screenId)!;

      // group별 배열이 없으면 생성
      if (!groupMap.has(item.group)) {
        groupMap.set(item.group, []);
      }

      const testCase: TTestCase = {
        testId: item.testId,
        path: item.path,
        description: item.description,
        given: item.given,
        when: item.when,
        then: item.then,
      };

      groupMap.get(item.group)!.push(testCase);
    });

    // Map을 TScenarioData 배열로 변환
    const scenarios: TScenarioData[] = [];

    screenGroupMap.forEach((groupMap, screenId) => {
      groupMap.forEach((tests, groupName) => {
        scenarios.push({
          sheetId,
          screenId,
          group: groupName,
          tests,
        });
      });
    });

    return scenarios;
  }

  /**
   * 최적화 결과 객체를 생성합니다.
   * @param sheetId 시트 ID
   * @param scenarios 최적화된 시나리오 데이터
   * @returns 최적화 결과 객체
   */
  private createOptimizationResult(
    sheetId: string,
    scenarios: TScenarioData[]
  ): TOptimizationResult {
    const screenMap = new Map<string, TScenarioData[]>();
    let totalTests = 0;

    scenarios.forEach((scenario) => {
      if (!screenMap.has(scenario.screenId)) {
        screenMap.set(scenario.screenId, []);
      }
      screenMap.get(scenario.screenId)!.push(scenario);
      totalTests += scenario.tests.length;
    });

    return {
      sheetId,
      totalScreens: screenMap.size,
      totalGroups: scenarios.length,
      totalTests,
      scenarios,
    };
  }

  /**
   * 최적화 결과 요약을 콘솔에 출력합니다.
   * @param result 최적화 결과
   */
  private printOptimizationSummary(result: TOptimizationResult): void {
    console.log("\n📊 === JSON 최적화 결과 ===");
    console.log(`📋 Sheet ID: ${result.sheetId}`);
    console.log(`📱 총 Screen 수: ${result.totalScreens}`);
    console.log(`📁 총 그룹 수: ${result.totalGroups}`);
    console.log(`🧪 총 테스트 수: ${result.totalTests}`);

    // screenId별 상세 정보
    const screenSummaries = this.createScreenSummaries(result.scenarios);

    screenSummaries.forEach((summary, index) => {
      console.log(`\n🖥️  Screen ${index + 1}: ${summary.screenId}`);
      console.log(`   📁 그룹 수: ${summary.groupCount}`);
      console.log(`   🧪 테스트 수: ${summary.testCount}`);

      summary.groups.forEach((group, groupIndex) => {
        console.log(
          `   ${groupIndex + 1}) ${group.name}: ${group.testCount}개 테스트`
        );
      });
    });

    console.log(
      `\n📈 최적화 완료! 총 ${result.totalTests}개의 테스트가 준비되었습니다.`
    );
  }

  /**
   * 화면별 요약 정보를 생성합니다.
   * @param scenarios 시나리오 데이터
   * @returns 화면별 요약 배열
   */
  private createScreenSummaries(
    scenarios: TScenarioData[]
  ): TOptimizationSummary[] {
    const screenMap = new Map<string, TScenarioData[]>();

    scenarios.forEach((scenario) => {
      if (!screenMap.has(scenario.screenId)) {
        screenMap.set(scenario.screenId, []);
      }
      screenMap.get(scenario.screenId)!.push(scenario);
    });

    return Array.from(screenMap.entries()).map(
      ([screenId, screenScenarios]) => ({
        screenId,
        groupCount: screenScenarios.length,
        testCount: screenScenarios.reduce(
          (sum, scenario) => sum + scenario.tests.length,
          0
        ),
        groups: screenScenarios.map((scenario) => ({
          name: scenario.group,
          testCount: scenario.tests.length,
        })),
      })
    );
  }

  /**
   * 백업 파일을 생성합니다.
   * @param filePath 원본 파일 경로
   */
  private async createBackup(filePath: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = `${filePath}.backup.${timestamp}`;
      await fs.copy(filePath, backupPath);
      console.log(`💾 백업 생성: ${backupPath}`);
    } catch (error) {
      console.warn(`⚠️  백업 생성 실패: ${error}`);
    }
  }

  /**
   * 최적화된 데이터의 유효성을 검증합니다.
   * @param scenarios 최적화된 시나리오 데이터
   */
  private validateOptimizedData(scenarios: TScenarioData[]): void {
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      throw this.createProcessingError(
        "VALIDATION",
        "최적화된 데이터가 유효하지 않습니다"
      );
    }

    scenarios.forEach((scenario, index) => {
      if (
        !scenario.sheetId ||
        !scenario.screenId ||
        !scenario.group ||
        !Array.isArray(scenario.tests)
      ) {
        throw this.createProcessingError(
          "VALIDATION",
          `최적화된 시나리오 ${index}가 유효하지 않습니다`
        );
      }
    });
  }

  /**
   * 원본 데이터에 필수 필드가 있는지 확인합니다.
   * @param item 원본 데이터 항목
   * @returns 필수 필드 존재 여부
   */
  private hasAnyRequiredField(item: any): boolean {
    const requiredFields = ["screenId", "group", "testId", "description"];
    return requiredFields.some((field) => item[field]);
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

export { JsonOptimizer };
