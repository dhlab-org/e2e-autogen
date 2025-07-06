import { TScenarioData } from "../types";
import { COLUMN_MAPPING } from "./config";

type TContract = {
  convertToScenarioData(rows: any[][]): TScenarioData[];
};

class ScenarioDataConverter implements TContract {
  readonly #columnMapping: typeof COLUMN_MAPPING;

  constructor() {
    this.#columnMapping = COLUMN_MAPPING;
  }

  /**
   * 스프레드시트 데이터를 TScenarioData 형태로 변환 (Map 기반 그룹화)
   */
  convertToScenarioData(rows: any[][]): TScenarioData[] {
    if (!rows || rows.length === 0) {
      return [];
    }

    const scenarioMap = new Map<string, TScenarioData>();

    // 첫 번째 행은 헤더이므로 건너뛰기
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const testId = row[this.#columnMapping.testId] || "";
      if (!testId) continue; // 테스트 ID가 없으면 건너뛰기

      // 테스트 ID에서 시나리오 ID 추출 (TC-1.1.1 -> TC-1.1)
      const scenarioId = this.#extractScenarioId(testId);

      // 기존 시나리오가 있으면 가져오고, 없으면 새로 생성
      let scenario = scenarioMap.get(scenarioId);

      if (!scenario) {
        scenario = {
          scenarioId: row[this.#columnMapping.scenarioId] || scenarioId,
          scenario: row[this.#columnMapping.scenario] || "",
          steps: [],
        };
        scenarioMap.set(scenarioId, scenario);
      }

      // 스텝 데이터 추가
      scenario.steps.push({
        testId: testId,
        uiPath: row[this.#columnMapping.uiPath] || "",
        when: row[this.#columnMapping.when] || "",
        then: row[this.#columnMapping.then] || "",
      });
    }

    // Map의 values를 배열로 변환하여 반환
    return Array.from(scenarioMap.values());
  }

  /**
   * 테스트 ID에서 시나리오 ID 추출 (TC-1.1.1 -> TC-1.1)
   */
  #extractScenarioId(testId: string): string {
    const parts = testId.split(".");
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`;
    }
    return testId; // fallback
  }
}

export { ScenarioDataConverter };
