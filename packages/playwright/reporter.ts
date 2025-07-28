import fs from "fs";
import path from "path";

import {
  Reporter,
  TestCase,
  TestResult as PlaywrightTestResult,
  FullConfig,
  TestStep,
} from "@playwright/test/reporter";

class E2EAutogenPlaywrightReporter implements Reporter {
  private outputFile: string;

  constructor(options?: { outputFile?: string }) {
    this.outputFile = options?.outputFile
      ? path.resolve(process.cwd(), options.outputFile)
      : path.resolve(process.cwd(), "e2e-autogen-report.json");
  }

  onBegin(config: FullConfig) {
    fs.writeFileSync(this.outputFile, "[]");
  }

  async onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const steps =
      result.steps?.map((step) => ({
        title: step.title,
        status: determineStepStatus(step),
        error: step.error?.message,
        duration: step.duration,
      })) ?? [];

    const entry = {
      testId: extractTestId(test.title),
      title: test.title,
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      steps,
    };

    const prev = JSON.parse(fs.readFileSync(this.outputFile, "utf-8"));
    prev.push(entry);
    fs.writeFileSync(this.outputFile, JSON.stringify(prev, null, 2));
  }
}

export default E2EAutogenPlaywrightReporter;

function extractTestId(title: string): string {
  const match = title.match(/\[(TC-[\d.]+)]/);
  return match ? match[1] : "";
}

function determineStepStatus(step: TestStep): "pass" | "fail" | "skipped" {
  if (step.error) return "fail";
  if (step.duration === 0) return "skipped";
  return "pass";
}
