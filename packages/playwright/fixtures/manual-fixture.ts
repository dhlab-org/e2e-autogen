import { test as base } from "@playwright/test";

type TFixtures = {
  manual: (title: string, reason?: string) => Promise<void>;
};

/**
 * 시트에 manual_only 결과를 지원하기 위한 fixture입니다.
 */
const manualTest = base.extend<TFixtures>({
  manual: async ({}, use) => {
    await use(async (title: string, reason?: string) => {
      // (1) TC ID 추출 – "[TC-x.x]" 형태를 파싱한다.
      const match = title.match(/\[(TC-[\d.]+)]/);
      const testId = match ? match[1] : "";

      // (2) Playwright step 등록 + 커스텀 annotation 기록
      await base.step(title, async () => {
        base.info().annotations.push({
          type: "manual_only",
          description: `${testId}|${reason ?? ""}`,
        });
      });
    });
  },
});

export { manualTest };
