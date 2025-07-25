import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { TPrefix, TRow, TScenarioData } from "./types";

type ScenarioContract = {
  scenariosPerPrefix(
    rowsPerPrefix: Map<TPrefix, TRow[]>
  ): Promise<Map<TPrefix, TScenarioData[]>>;
};

class Scenario implements ScenarioContract {
  readonly #sheet: ReturnType<GoogleSpreadsheetsContract["testSuiteSheet"]>;

  constructor(googleSpreadsheets: GoogleSpreadsheetsContract) {
    this.#sheet = googleSpreadsheets.testSuiteSheet("");
  }

  async scenariosPerPrefix(rowsPerPrefix: Map<TPrefix, TRow[]>) {
    const scenariosPerPrefix = new Map<TPrefix, TScenarioData[]>();

    for (const [prefix, rows] of rowsPerPrefix) {
      const scenarios = await this.#scenarios(rows);
      if (scenarios.length === 0) continue;

      scenariosPerPrefix.set(prefix, scenarios);
    }

    console.log(`\n✅ 성공적으로 변환완료`);
    console.log(
      `📊 총 ${Array.from(scenariosPerPrefix.values()).reduce(
        (acc, curr) => acc + curr.length,
        0
      )}개의 시나리오가 변환되었습니다.`
    );

    return scenariosPerPrefix;
  }

  async #scenarios(rows: TRow[]): Promise<TScenarioData[]> {
    if (!rows?.length) return [];

    // 1. 각 행을 스텝으로 변환하고 scenarioId가 있는 것만 필터링
    const steps = rows
      .map((row) => ({
        scenarioId: this.#extractedScenarioId(row),
        scenarioDescription:
          row[this.#sheet.columnNumberOf("scenarioDescription")] || "",
        step: {
          testId: row[this.#sheet.columnNumberOf("testId")] || "",
          uiPath: row[this.#sheet.columnNumberOf("uiPath")] || "",
          when: row[this.#sheet.columnNumberOf("when")] || "",
          then: row[this.#sheet.columnNumberOf("then")] || "",
        },
      }))
      .filter((item) => item.scenarioId);

    // 2. scenarioId 기준으로 그룹화
    const groupedByScenarioId = new Map<string, typeof steps>();
    for (const item of steps) {
      const existing = groupedByScenarioId.get(item.scenarioId) || [];
      groupedByScenarioId.set(item.scenarioId, [...existing, item]);
    }

    // 3. 그룹화된 데이터를 TScenarioData[] 형태로 변환
    return Array.from(groupedByScenarioId.entries()).map(
      ([scenarioId, items]) => ({
        scenarioId,
        // 첫 번째 항목의 설명을 시나리오 설명으로 사용
        scenarioDescription: items[0].scenarioDescription,
        // 모든 항목의 스텝을 배열로
        steps: items.map((item) => item.step),
      })
    );
  }

  #extractedScenarioId(row: TRow): string {
    const testId = row[this.#sheet.columnNumberOf("testId")] || "";
    if (!testId) return "";

    // TC-x.x.x → TC-x.x
    return testId.split(".").slice(0, -1).join(".");
  }
}

export { Scenario };
