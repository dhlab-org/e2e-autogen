# 🎭 Playwright fixtures

`@dhlab/e2e-autogen/playwright`는 여러 픽스처가 병합된 `test`를 제공합니다.

```ts
import { test } from '@dhlab/e2e-autogen/playwright';
```

- 제공 픽스처
  - [manual](#manual-픽스처) — 특정 스텝을 수동 검증으로 처리
  - [recording](#recording-픽스처) — 로컬 오디오/사인파를 getUserMedia로 주입


> 반드시 위 `test`를 사용하세요. (`@playwright/test`의 기본 `test`가 아님)

## manual 픽스처
### 목적
- 특정 테스트 스텝을 수동 검증(manual_only) 으로 기록합니다.
- 사유(reason)는 시트의 해당 결과 칸 코멘트로 기록됩니다.
- PM은 해당 기록을 확인하여 수동 테스트를 진행합니다.

### 시그니처
```ts
manual(title: string, reason?: string): Promise<void>
```

### 사용 예 
```ts
import { test } from '@dhlab/e2e-autogen/playwright';

test('수동 검증 예시', async ({ manual }) => {
  await manual('[TC-1.1] 수동 검증 필요', 'UI 명확성 확인');
});
```

## 🎙 recording 픽스처 
### 목적 
실제 마이크 대신 로컬 오디오 파일 또는 사인파를 getUserMedia로 주입합니다.

### 옵션 설정
```ts
test.use({ audioFilePath?: string });
```
- audioFilePath 지정 시: 해당 파일을 1회 재생하는 오디오 스트림을 반환
- 미지정 시: 440Hz 사인파 스트림을 반환

### 동작 특징

- 라우팅: 내부 URL(/_e2e-audio_/파일명)만 가로채 로컬 파일을 응답 → 서버 트래픽 영향 없음
- 권한: 브라우저 컨텍스트에서 마이크 권한 자동 허용

### 사용 예
```ts
import path from 'node:path';
import { test } from '@dhlab/e2e-autogen/playwright';
import { expect } from '@playwright/test';

test.use({
  audioFilePath: path.join(process.cwd(), 'public', 'audio', 'demo-3sec.wav'),
});

test('[TC-4.2] 녹음 중 메모 입력', async ({ page, setupRecording, startNewRecording }) => {
  // 권장 순서: 페이지 진입 → 모킹 주입 → 녹음 트리거
  await page.goto('/main', { waitUntil: 'networkidle' });
  await setupRecording();
  await startNewRecording();
  // ... 검증 로직
});
```

### 주의사항
`iframe` 등 별도 문맥에서 `getUserMedia`를 호출한다면, 해당 프레임 로드 이후 `setupRecording()`을 다시 호출하여 패치를 보장하세요.
