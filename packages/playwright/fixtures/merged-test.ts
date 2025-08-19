import { mergeTests } from "@playwright/test";

import { manualTest } from "./manual-fixture";
import { mockApiResponsesTest } from "./mock-api-responses-fixture";
import { recordingTest } from "./recording-fixture";

/**
 * 통합 Playwright 테스트 엔트리입니다. 아래 여러 픽스처가 병합된 `test`를 제공합니다.
 */
const test = mergeTests(manualTest, recordingTest, mockApiResponsesTest);

export { test };
