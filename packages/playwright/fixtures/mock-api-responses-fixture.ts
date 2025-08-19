import { test as base } from "@playwright/test";

type TFixtures = {
  mockApiResponses: (data: unknown) => Promise<void>;
};

/**
 * api-recorder로 기록한 JSON 데이터를 받아서 API 모킹을 수행하는 fixture입니다.
 */
const mockApiResponsesTest = base.extend<TFixtures>({
  mockApiResponses: async ({ page }, use) => {
    await use(async (data: unknown) => {
      if (!Array.isArray(data)) {
        throw new Error("data must be an array");
      }

      const httpRestData = data.filter(
        (
          item
        ): item is {
          request: { method: string; url: string };
          response: {
            status: number;
            headers?: Record<string, string>;
            body: unknown;
          };
        } => {
          return (
            typeof item === "object" &&
            item !== null &&
            "type" in item &&
            item.type === "http-rest" &&
            "request" in item &&
            "response" in item &&
            typeof item.request === "object" &&
            item.request !== null &&
            "method" in item.request &&
            "url" in item.request &&
            typeof item.response === "object" &&
            item.response !== null &&
            "status" in item.response &&
            "body" in item.response
          );
        }
      );

      for (const item of httpRestData) {
        const { method, url } = item.request;
        const { status, headers, body } = item.response;

        await page.route(url, async (route) => {
          if (route.request().method() === method) {
            await route.fulfill({
              status,
              headers,
              body: JSON.stringify(body),
            });
          } else {
            await route.continue();
          }
        });
      }
    });
  },
});

export { mockApiResponsesTest };
