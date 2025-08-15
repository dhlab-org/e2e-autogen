# 🤖 E2E Autogen

Google Spreadsheet를 **단일 소스**로 삼아, **E2E 테스트의 작성–실행–리포팅**까지 자동화하여 QA·개발 리소스를 줄이는 도구입니다.

- 한 번의 TC 정의 → 테스트 스텁 자동 생성 → 실행 결과 자동 업데이트  
- PM은 더 이상 **수동 QA를 반복하지 않고**, 개발자는 **작성 비용을 크게 낮춥니다**.


## 🚩 왜 만들었나요?
현장의 E2E 테스트는 다음 이유로 우선순위에서 밀리는 경우가 많습니다.

- **분산된 기준**: 요구사항/테스트 기준이 이슈·위키·시트·코드에 흩어져 합의가 어렵다.
- **높은 작성 비용**: 테스트 코드 골격부터 매번 만들어야 하니 초기 진입 장벽이 높다.
- **수동 결과 관리**: 실행/결과 정리가 수동이라 히스토리·커버리지 관리 비용이 크다.

**E2E Autogen**은 **스프레드시트를 단일 소스**로 삼아 아래를 자동화합니다:
- 시트 → Playwright 테스트 스텁 자동 생성
- 공통 유틸/픽스처/목 인프라 제공으로 작성 시간 최소화
- 실행 결과를 다시 시트에 업데이트(+ 커버리지 집계)

## 🎯 목표
- PM은 **수동 기능 테스트를 반복하지 않아도 되는 환경**
- 개발자는 **부담 없이 E2E를 도입**하고, 팀 공통 유틸로 빠르게 작성
- 테스트 히스토리/커버리지는 **시트 하나로 집계**


## ✅ 핵심 기능 
1. **TC → 테스트 스텁 자동 생성**
  - Google 스프레드시트의 TC를 파싱해 Playwright 테스트 스켈레톤 생성      
  - 반복 보일러플레이트 최소화     

2. **개발 DX 강화**
  - `Playwright`용 유틸/픽스처 제공   
  - `Mock Socket Server` 제공   
  - `api-recorder` 연동: 실제 API/소켓 트래픽을 JSON으로 캡처해 즉시 목 주입   

3. **리포팅 자동화**
  - 실행 결과를 스프레드시트에 자동 업데이트   
  - 커버리지·히스토리를 같은 시트에서 관리   


## ⚙️ 빠른 시작 (Quick Start)
### 1) 설치

```bash
npm install -D @dhlab/e2e-autogen
# 또는
yarn add -D @dhlab/e2e-autogen 
```

설치가 정상적으로 완료되었는지 확인해보세요:

```bash
# 버전 정보 확인
e2e-autogen --version

# 사용법 확인
e2e-autogen --help
```

### 2) 설정 파일 생성: `e2e-autogen.config.ts`


```typescript
import { defineConfig } from '@dhlab/e2e-autogen';

export default {
  // Google Sheets URL (required)
  sheetsUrl: "https://docs.google.com/spreadsheets/d/...",

  // 테스트 프레임워크 (optional, default: "playwright")
  framework: "playwright",

  // 스텁 코드 생성 디렉토리 (optional)
  stubOutputFolder: "./playwright/__generated-stub__",

  // 테스트 결과 JSON 파일 경로 (optional)
  jsonReporterFile: "./playwright/e2e-autogen-reporter.json",

  // Google API 인증 파일 경로 (optional)
  credentialsFile: "./playwright/.auth/credentials.json",

  // Google Sheets 컬럼 매핑 (optional)
  googleSheetColumns: {
    scenarioId: "A",
    scenarioDescription: "B",
    uiPath: "C",
    action: "D",
    expected: "E",
    testId: "F",
    tag: "G",
    comment: "H",
  },
};
```

### 3) 스텁 생성
```bash
yarn e2e-autogen generate
```

`./playwright/__generated-stub__` 아래에 스텁 파일들이 생성됩니다.

```typescript
import { test } from "@playwright/test";

test("[TC-1.1] 질문 입력", async ({ page }) => {
  await test.step("[TC-1.1.1] 메인화면 로드 -> 질문 입력창이 정상적으로 표시", async () => {
    // ...
  });

  await test.step("[TC-1.1.2] 질문 입력창에 문자 입력 -> 정상적으로 입력됨", async () => {
    // ...
  });
});
```

### 4) 테스트 작성 (생성된 스텁 채우기)

**🛠 작성 팁**  
- [Playwright Test Generator](https://playwright.dev/docs/codegen) 활용 시 빠른 작성이 가능합니다.
- 스텁 코드 + 구현 코드를 AI에 함께 제공하면 작성 속도가 증가합니다.


**⚠️ 주의사항**
- generate CLI 실행 시 기존 스텁이 덮어쓰기 되므로, 작성한 코드는 다른 위치로 복사해 두는 것을 권장합니다.
- Playwright로 자동화가 어려운 TC의 경우, `manual_only` 결과를 주입할 수 있습니다.
→ PM이 해당 케이스를 보고 수동 테스트를 진행합니다.

**🚀 고급 활용**
1. 공통 Fixture 사용
- `@dhlab/e2e-autogen/playwright`에서 제공하는 다양한 fixture를 활용해 반복 코드를 줄이세요.
- 제공하는 기능은 [여기](./docs/playwright.md)에서 확인할 수 있습니다.

2. 소켓 모킹
- Swagger에 정의되지 않은 Socket 통신은 직접 모킹하기 어렵습니다.
- `api-recorder`로 실제 통신을 녹화한 후, `e2e-autogen`의 `Mock Socket Server`에 주입하여 빠르게 모킹할 수 있습니다. 
- 자세한 가이드는 [여기](./docs/socket-io.md)에서 확인하세요.

### 5) 실행 & 결과 업데이트
E2E Autogen은 테스트 결과를 최적화하기 위해 커스텀 리포트를 제공합니다. 

`playwright.config.ts`에 전용 리포터를 추가하세요.

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html"],
    [
      require.resolve("@dhlab/e2e-autogen/playwright/reporter"),
      { outputFile: "./playwright/e2e-autogen-report.json" },
    ],
  ],
});
```

**실행 & 시트 업데이트:**   
```bash
# 테스트 실행 + JSON 리포트 생성
yarn playwright test
```

```bash
# 시트 업데이트
yarn e2e-autogen update
# → 결과/코멘트/커버리지가 스프레드시트에 반영
```

## 📚 자세한 사용법과 가이드

- **스프레드시트 작성 가이드**: [docs/how-to-write-sheet.md](docs/how-to-write-sheet.md)
- **테스트 결과 및 커버리지 활용 가이드**: [docs/how-to-use-results.md](docs/how-to-use-results.md)
- **Playwright fixture**: [docs/playwright.md](docs/playwright.md)
- **목 소켓 서버(socket.io)**: [docs/socket-io.md](docs/socket-io.md)
- **로컬 개발/배포(패키징) 가이드**: [docs/local-dev.md](docs/local-dev.md)

## 📄 라이선스

MIT © dhlab-fe
