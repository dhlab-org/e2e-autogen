import { mergeTests } from "@playwright/test";

import { manualTest } from "./manual-fixture";
import { recordingTest } from "./recording-fixture";

// import { mswScenarioTest } from "./msw-scenario-fixture";

/**
 * 통합 Playwright 테스트 엔트리입니다. 아래 여러 픽스처가 병합된 `test`를 제공합니다.
 *
 * 1) manual 픽스처
 * - 목적: 특정 스텝을 수동 검증(manual_only)로 기록합니다.
 * - 시그니처: manual(title: string, reason?: string): Promise<void>
 * - 사용 예:
 *   ```ts
 *   import { test } from '@dhlab/e2e-autogen/playwright';
 *
 *   test('수동 검증 예시', async ({ manual }) => {
 *     await manual('[TC-1.1] 수동 검증 필요', 'UI 명확성 확인');
 *   });
 *   ```
 *
 * 2) recording 픽스처
 * - 목적: 실제 마이크 대신 로컬 오디오 파일 또는 사인파를 getUserMedia로 주입합니다.
 * - 옵션: test.use({ audioFilePath?: string })
 *   - 지정 시 해당 파일을 1회 재생하는 오디오 스트림을 반환합니다.
 *   - 미지정 시 440Hz 사인파 스트림을 반환합니다.
 * - 라우팅: 내부 URL(`/_e2e-audio_/파일명`)만 가로채 로컬 파일을 응답하므로 서버 트래픽에는 영향이 없습니다.
 * - 권한: 브라우저 컨텍스트에 마이크 권한을 자동 허용합니다.
 * - 사용 예:
 *   ```ts
 *   import path from 'node:path';
 *   import { test } from '@dhlab/e2e-autogen/playwright';
 *   import { expect } from '@playwright/test';
 *
 *   test.use({
 *     audioFilePath: path.join(process.cwd(), 'public', 'audio', 'demo-3sec.wav'),
 *   });
 *
 *   test('[TC-4.2] 녹음 중 메모 입력', async ({ page, setupRecording, startNewRecording }) => {
 *     // 권장 순서: 페이지 진입 → 모킹 주입 → 녹음 트리거
 *     await page.goto('/main', { waitUntil: 'networkidle' });
 *     await setupRecording();
 *     await startNewRecording();
 *     // ... 검증 로직
 *   });
 *   ```
 *
 * 사용 시 주의사항
 * - 반드시 이 파일이 export하는 `test`를 사용하세요. (예: `import { test } from '@dhlab/e2e-autogen/playwright'`)
 * - iframe 등 별도 문맥에서 getUserMedia를 호출한다면, 해당 프레임이 로드된 이후에 `setupRecording()`을 다시 호출해 패치를 보장하세요.
 */
const test = mergeTests(manualTest, recordingTest);

export { test };
