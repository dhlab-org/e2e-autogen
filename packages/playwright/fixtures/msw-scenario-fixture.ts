// import path from "node:path";
// import { pathToFileURL } from "node:url";
// import { createNetworkFixture, type NetworkFixture } from "@msw/playwright";
// import { test as base } from "@playwright/test";
// import { loadUserConfig } from "../../../config";

// type TFixtures = {
//   network: NetworkFixture;
// };

// const mswScenarioTest = base.extend<TFixtures>({
//   network: async ({}, use) => {
//     const { handlers } = await loadHandlersFromUserConfig();
//     const fixture = createNetworkFixture({ initialHandlers: handlers });
//     await use(fixture as unknown as NetworkFixture);
//   },
// });

// export { mswScenarioTest };

// async function loadHandlersFromUserConfig(): Promise<{
//   handlers: any[];
// }> {
//   const config = await loadUserConfig();

//   const handlerModule = await import(
//     pathToFileURL(path.resolve(config.mswHandlersFile)).href
//   );
//   const handlers = handlerModule.handlers;

//   if (!Array.isArray(handlers)) {
//     throw new Error(
//       `[e2e-autogen] ${config.mswHandlersFile}에서 handlers 배열을 찾을 수 없습니다.`
//     );
//   }

//   return { handlers };
// }
