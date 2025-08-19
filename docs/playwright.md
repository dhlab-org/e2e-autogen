# 🎭 Playwright fixtures

`@dhlab/e2e-autogen/playwright`는 여러 픽스처가 병합된 `test`를 제공합니다.

```ts
import { test } from '@dhlab/e2e-autogen/playwright';
```

- 제공 픽스처
  - [manual](#manual-픽스처) — 특정 스텝을 수동 검증으로 처리
  - [mockApiResponses](#mockapiresponses-픽스처) — api-recorder로 기록한 JSON 데이터를 API 모킹으로 주입
  - [recording](#recording-픽스처) — 로컬 오디오/사인파를 getUserMedia로 주입


> 반드시 위 `test`를 사용하세요. (`@playwright/test`의 기본 `test`가 아님)

## ✍️ manual 픽스처
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

## 🔌 mockApiResponses 픽스처
### 목적
api-recorder로 기록한 HTTP 요청/응답 JSON 데이터를 받아서 Playwright 테스트에서 API 모킹을 수행합니다.

### 시그니처
```ts
mockApiResponses(data: unknown): Promise<void>
```

### 동작 특징
- **타입 필터링**: `type: "http-rest"`인 항목만 자동으로 필터링하여 모킹
- **타입 안전성**: 런타임에 데이터 구조를 검증하여 안전한 모킹 보장
- **Playwright 내장 기능**: MSW 등 외부 라이브러리 없이 `page.route`만 사용

### 사용 예
```ts
import { test } from '@dhlab/e2e-autogen/playwright';

test('API 모킹 테스트', async ({ page, mockApiResponses }) => {
  const mockData = [
    {
      requestId: "nz932y5ixbj",
      type: "http-rest", // 이 항목만 모킹됨
      request: {
        method: "GET",
        url: "/api/v1/me",
        headers: { "Accept": "application/json" },
        timestamp: 1755583240993
      },
      response: {
        status: 200,
        headers: { "content-type": "application/json" },
        body: [{ id: "abcde", name: "김땡땡" }],
        timestamp: 1755583241073
      },
      totalDuration: 80
    },
    {
      requestId: "other",
      type: "socketio", // 이 항목은 무시됨
      // ...
    }
  ];

  await mockApiResponses(mockData);
  await page.goto('/');
  // 테스트 로직...
});
```

### 지원하는 데이터 구조
```ts
{
  requestId: string;
  type: string; // "http-rest"인 경우만 모킹
  request: {
    method: string; // HTTP 메서드 (GET, POST, PUT, DELETE 등)
    url: string;    // API 엔드포인트 경로
    headers?: Record<string, string>;
    timestamp?: number;
  };
  response: {
    status: number;  // HTTP 상태 코드
    headers?: Record<string, string>;
    body: unknown;   // 응답 본문
    timestamp?: number;
  };
  totalDuration?: number;
}
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

