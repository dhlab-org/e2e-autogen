import { mergeTests } from "@playwright/test";

import { manualTest } from "./manual-fixture";

// import { mswScenarioTest } from "./msw-scenario-fixture";

const test = mergeTests(manualTest);

export { test };
