import { loadUserConfig } from "../../../config";
import { createNetworkFixture, type NetworkFixture } from "@msw/playwright";
import { test as base, Page } from "@playwright/test";
import path from "path";
import { pathToFileURL } from "url";

type TFixtures = {
  network: NetworkFixture;
  page: Page;
};

const mswScenarioTest = base.extend<TFixtures>({
  network: async ({}, use) => {
    const { handlers } = await loadHandlersFromUserConfig();
    const fixture = createNetworkFixture({ initialHandlers: handlers });
    await use(fixture as unknown as NetworkFixture);
  },

  page: async ({ page }, use, testInfo) => {
    const scenarioId = extractScenarioId(testInfo.title);

    if (scenarioId) {
      await page.addInitScript((sid: string) => {
        const globalWindow = globalThis as any;
        const originalFetch = globalWindow.fetch.bind(globalWindow);
        globalWindow.fetch = (
          input: string | URL,
          init?: RequestInit
        ): Promise<Response> => {
          const newInit: RequestInit = {
            ...(init ?? {}),
            headers: {
              ...(init?.headers ?? {}),
              "x-scenario": sid,
            },
          };
          return originalFetch(input, newInit);
        };
      }, scenarioId);
    }

    await use(page);
  },
});

export { mswScenarioTest };

async function loadHandlersFromUserConfig(): Promise<{
  handlers: any[];
}> {
  const config = await loadUserConfig();

  const handlerModule = await import(
    pathToFileURL(path.resolve(config.mswHandlersFile)).href
  );
  const handlers = handlerModule.handlers;

  if (!Array.isArray(handlers)) {
    throw new Error(
      `[e2e-autogen] ${config.mswHandlersFile}에서 handlers 배열을 찾을 수 없습니다.`
    );
  }

  return { handlers };
}

function extractScenarioId(title: string): string | undefined {
  // 제목 포맷: "[TC-1.1] ..." 와 같이 대괄호 안에 TC-... 가 포함됨
  const match = title.match(/\[(TC-[\d.]+)]/);
  return match?.[1];
}
