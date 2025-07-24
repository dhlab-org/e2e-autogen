import { GoogleSpreadsheetsContract } from "../google-spreadsheets";
import { Judge } from "./judge";
import { TResultStatus } from "./types";
import * as fs from "fs-extra";

type TestRegistryContract = {
  logResults(googleSpreadsheets: GoogleSpreadsheetsContract): Promise<void>;
};

class TestRegistry implements TestRegistryContract {
  readonly #jsonReporterPath: string;
  readonly #judge: Judge;

  constructor(jsonReporterPath: string) {
    this.#jsonReporterPath = jsonReporterPath;
    this.#judge = new Judge();
  }

  async logResults(
    googleSpreadsheets: GoogleSpreadsheetsContract
  ): Promise<void> {
    // 1. JSON 리포터 읽기
    const json = await this.#json();

    // 2. 테스트 결과 파싱
    const resultPerTestCase = this.#judge.resultPerTestCase(json);

    // 3. TC prefix(시트 단위)로 그룹화: Map<prefix, Map<testId, status>>
    const resultsPerSuite = this.#resultsPerSuite(resultPerTestCase);

    // 4. 스프레드시트 메타 로드
    const { sheetsMetaMapByPrefix } = await googleSpreadsheets.sheets();

    // 5. 각 시트에 결과 기록
    for (const [suiteId, resultPerTestId] of resultsPerSuite) {
      const meta = sheetsMetaMapByPrefix.get(suiteId);
      if (!meta) {
        console.warn(`⚠️ '[${suiteId}]' 시트를 찾지 못해 스킵합니다.`);
        continue;
      }

      const sheet = googleSpreadsheets.testSuiteSheet(meta.gid);

      // 시트 데이터 읽기
      const rows = await sheet.rows();
      const dataRows = rows.slice(2); // 헤더 두 줄 제외

      const resultValues: string[][] = dataRows.map((row) => {
        const testId: string = row[sheet.columnNumberOf("testId")] ?? "";
        const result = resultPerTestId.get(testId) ?? "not_executed";
        return [this.#judge.labelOf(result)];
      });

      await sheet.writeAfterLastColumn(resultValues, 3); // 3행부터 대응
    }
  }

  #resultsPerSuite(
    resultPerTestCase: Map<TTestCaseId, TResultStatus>
  ): Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>> {
    return Array.from(resultPerTestCase).reduce(
      (suiteMap, [testId, status]) => {
        const suiteId = testId.split(".")[0];
        const bucket = suiteMap.get(suiteId) ?? new Map();
        bucket.set(testId, status);
        suiteMap.set(suiteId, bucket);
        return suiteMap;
      },
      new Map<TTestSuiteId, Map<TTestCaseId, TResultStatus>>()
    );
  }

  async #json() {
    try {
      const raw = await fs.readFile(this.#jsonReporterPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`❌ ${this.#jsonReporterPath} 파일 읽기 실패: ${error}`);
    }
  }
}

export { TestRegistry, type TestRegistryContract };

type TTestSuiteId = string; // TC-x
type TTestCaseId = string; // TC-x.x.x
