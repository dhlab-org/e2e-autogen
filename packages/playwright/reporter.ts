import {
  FullConfig,
  TestResult as PlaywrightTestResult,
  Reporter,
  Suite,
  TestCase,
  TestStep,
} from "@playwright/test/reporter";
import fs from "fs";
import path from "path";

class E2EAutogenPlaywrightReporter implements Reporter {
  private outputFile: string;
  private suites: TSuiteGroup[] = [];

  constructor(options?: { outputFile?: string }) {
    this.outputFile = options?.outputFile
      ? path.resolve(process.cwd(), options.outputFile)
      : path.resolve(process.cwd(), "e2e-autogen-report.json");
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.suites = [];
  }

  async onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const file = test.location.file;
    const suiteTitle = test.parent?.title ?? "";
    const scenarioId = extractScenarioId(test.title);
    const specTitle =
      test.titlePath().find((t) => t.includes("TC-")) || test.title;
    const description = removeTestIdFromTitle(specTitle);

    const manualSteps = extractManualSteps(result).filter((s) =>
      s.testId.startsWith(scenarioId)
    );

    // Step 분석
    const flakySteps = getFlakyStepTitles(result);

    const steps = (result.steps ?? [])
      .map((step) => {
        const testId = extractTestId(step.title);
        const duration = step.duration;
        const error = step.error?.message;

        if (!testId) {
          return null;
        }

        const manualMatch = manualSteps.find((m) => m.testId === testId);
        if (manualMatch) {
          return {
            title: step.title,
            testId,
            duration,
            ...(error ? { error } : {}),
            status: "manual_only",
          } as TStepResult;
        }

        if (flakySteps.includes(step.title)) {
          return {
            title: step.title,
            testId,
            duration,
            ...(error ? { error } : {}),
            status: "flaky",
          } as TStepResult;
        }

        if (duration === 0) {
          return {
            title: step.title,
            testId,
            duration,
            ...(error ? { error } : {}),
            status: "not_executed",
          } as TStepResult;
        }

        return {
          title: step.title,
          testId,
          duration,
          ...(error ? { error } : {}),
          status: error ? "fail" : "pass",
        } as TStepResult;
      })
      .filter((s): s is TStepResult => s !== null);

    const entry: TTestEntry = {
      title: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      steps,
    };

    let suiteGroup = this.suites.find((s) => s.file === file);
    if (!suiteGroup) {
      suiteGroup = { title: suiteTitle, file, specs: [] };
      this.suites.push(suiteGroup);
    }

    let spec = suiteGroup.specs.find((s) => s.scenarioId === scenarioId);
    if (!spec) {
      spec = {
        title: specTitle,
        scenarioId,
        description,
        file,
        tests: [],
        pass: [],
        fail: [],
        flaky: [],
        manual_only: [],
        not_executed: [],
      };
      suiteGroup.specs.push(spec);
    }

    spec.tests.push(entry);

    // ----- manual_only 기록 -----
    for (const step of steps) {
      if (step.status !== "manual_only" || !step.testId) continue;
      const reason =
        manualSteps.find((m) => m.testId === step.testId)?.description ?? "";
      const already = spec.manual_only.find((m) => m[0] === step.testId);
      if (!already) spec.manual_only.push([step.testId, reason]);
    }
  }

  async onEnd() {
    // 최종 분류 계산
    for (const suite of this.suites) {
      for (const spec of suite.specs) {
        updateSpecClassification(spec);
      }
    }

    fs.writeFileSync(
      this.outputFile,
      JSON.stringify({ suites: this.suites }, null, 2)
    );
  }

  printsToStdio() {
    return true;
  }
}

export default E2EAutogenPlaywrightReporter;

type TStepStatus = "pass" | "fail" | "flaky" | "manual_only" | "not_executed";

type TStepResult = {
  title: string;
  testId: string;
  status: TStepStatus;
  duration: number;
  error?: string;
};

type TTestEntry = {
  title: string;
  status: string;
  duration: number;
  error?: string;
  steps: TStepResult[];
};

type TSpecGroup = {
  title: string;
  scenarioId: string;
  description: string;
  file: string;
  tests: TTestEntry[];
  pass: string[];
  fail: string[];
  flaky: string[];
  manual_only: [string, string][];
  not_executed: string[];
};

type TSuiteGroup = {
  title: string;
  file: string;
  specs: TSpecGroup[];
};

// ───── 유틸 함수들 ─────

function extractTestId(title: string): string {
  const match = title.match(/\[(TC-[\d.]+)]/);
  return match ? match[1] : "";
}

function extractScenarioId(title: string): string {
  const match = title.match(/\[(TC-\d+\.\d+)/);
  return match ? match[1] : "";
}

function removeTestIdFromTitle(title: string): string {
  return title.replace(/\[TC-[\d.]+]\s*/, "").trim();
}

function getFlakyStepTitles(result: PlaywrightTestResult): string[] {
  const map: Record<string, string[]> = {};

  const retryDetails =
    (
      result as unknown as {
        retryDetails?: { steps: TestStep[] }[];
      }
    ).retryDetails ?? [];

  for (const attempt of retryDetails) {
    for (const step of attempt.steps) {
      if (!map[step.title]) map[step.title] = [];
      map[step.title].push(step.error ? "fail" : "pass");
    }
  }

  for (const step of result.steps ?? []) {
    if (!map[step.title]) map[step.title] = [];
    map[step.title].push(step.error ? "fail" : "pass");
  }

  return Object.entries(map)
    .filter(
      ([, statuses]) => statuses.includes("fail") && statuses.includes("pass")
    )
    .map(([title]) => title);
}

type TManualStep = {
  testId: string;
  description: string;
};

/**
 * result.annotations 에 기록된 manual_only 정보를 추출한다.
 * description 형식: `${testId}|${reason}`
 */
function extractManualSteps(result: PlaywrightTestResult): TManualStep[] {
  const annotations = (result as any).annotations ?? [];
  return annotations
    .filter((a: any) => a.type === "manual_only")
    .map((a: any) => {
      const [testId, ...descParts] = (a.description ?? "").split("|");
      return { testId, description: descParts.join("|") } as TManualStep;
    })
    .filter((m: TManualStep) => m.testId);
}

function updateSpecClassification(spec: TSpecGroup) {
  // 초기화
  spec.pass = [];
  spec.fail = [];
  spec.flaky = [];
  spec.not_executed = [];

  const stepStatusMap: Record<string, TStepStatus[]> = {};

  // 시도별 Step 상태 수집
  for (const testEntry of spec.tests) {
    for (const step of testEntry.steps) {
      if (!step.testId) continue;
      if (!stepStatusMap[step.testId]) stepStatusMap[step.testId] = [];
      stepStatusMap[step.testId].push(step.status);
    }
  }

  const addUnique = (arr: string[], id: string) => {
    if (!arr.includes(id)) arr.push(id);
  };

  for (const [testId, statuses] of Object.entries(stepStatusMap)) {
    const uniqStatuses = Array.from(new Set(statuses));

    // 1) flaky 위치가 최우선 (시도 내 pass+fail 혼재 또는 step 자체가 flaky)
    if (uniqStatuses.includes("flaky")) {
      addUnique(spec.flaky, testId);
      continue;
    }

    const hasPass = uniqStatuses.includes("pass");
    const hasFail = uniqStatuses.includes("fail");
    const hasNotExecuted = uniqStatuses.includes("not_executed");

    if (hasPass && hasFail) {
      // 재시도 혼합 결과
      addUnique(spec.flaky, testId);
    } else if (hasFail) {
      addUnique(spec.fail, testId);
    } else if (hasPass) {
      addUnique(spec.pass, testId);
    } else if (hasNotExecuted) {
      addUnique(spec.not_executed, testId);
    }
  }

  // 중복 방지 보증 (예외 케이스 대비)
  spec.pass = Array.from(new Set(spec.pass));
  spec.fail = Array.from(new Set(spec.fail));
  spec.flaky = Array.from(new Set(spec.flaky));
  spec.not_executed = Array.from(new Set(spec.not_executed));
}
