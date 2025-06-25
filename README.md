# E2E Autogen

Google 스프레드시트 기반 시나리오를 Playwright 테스트 **스텁 코드**로 자동 생성하는 도구입니다.

## 주요 기능

- 📊 **JSON 시나리오 파싱**: 구조화된 JSON 시나리오 파일을 읽어들입니다
- 🔧 **JSON 최적화**: 원본 JSON을 프로젝트 형식에 맞게 자동 변환합니다
- 🧪 **Playwright 테스트 틀 생성**: 시나리오를 기반으로 실행 가능한 테스트 코드 틀(스텁)을 생성합니다
- 📁 **일괄 처리**: 여러 시나리오 파일을 한 번에 처리할 수 있습니다

> 💡 **스텁 코드(Stub Code)란?**  
> 실제 구현 로직은 없지만 기본 구조와 가이드 주석이 포함된 코드 틀입니다.  
> 개발자는 생성된 틀에 실제 테스트 로직만 추가하면 됩니다.

## 설치

```bash
yarn install
```

## Google Spreadsheet에서 JSON 변환하기

### 1. Google Sheets 확장 프로그램 설치

[Sheets to JSON](https://workspace.google.com/marketplace/app/sheets_to_json/984948857234) 확장 프로그램을 설치합니다.

### 2. 스프레드시트 데이터 구조

스프레드시트는 다음과 같은 컬럼 구조로 작성해야 합니다:

| A (screenId) | B (group)   | C (testId) | D (path)             | E (description)   | F (when)       | G (then)              |
| ------------ | ----------- | ---------- | -------------------- | ----------------- | -------------- | --------------------- |
| login-001    | 로그인 실패 | 1          | 로그인 > 로그인 버튼 | Modal 출력 테스트 | 모달 내용 확인 | 로그인 실패 문구 표시 |
|              |             | 2          | 로그인 > 취소 버튼   | Modal 닫기 테스트 | 닫기 버튼 클릭 | Modal이 닫힌다        |

### 3. JSON 변환 설정

1. **Extensions** → **Export Sheet Data** → **Open Sidebar** 클릭
2. **Format** 탭에서 **Custom** 선택
3. 다음 템플릿을 복사하여 붙여넣기:

```json
{
  "screenId": "<<Col[0]>>",
  "group": "<<Col[1]>>",
  "testId": "<<Col[2]>>",
  "path": "<<Col[3]>>",
  "description": "<<Col[4]>>",
  "given": "<<Col[3]>>",
  "when": "<<Col[5]>>",
  "then": "<<Col[6]>>"
}
```

4. **Export** 버튼 클릭하여 JSON 생성
5. 생성된 JSON을 복사하여 `scenarios/{sheet-id}.json` 파일에 저장

### 4. 시나리오 파일 생성

- 파일명은 시트 ID와 동일하게 설정 (예: `login.json`, `saved-record.json`)
- `scenarios/` 폴더에 저장

## 사용법

### 1. JSON 최적화

원본 JSON 파일을 프로젝트 형식에 맞게 변환합니다:

```bash
# 모든 JSON 파일 최적화
yarn optimize

# 특정 파일 최적화
yarn optimize scenarios/saved-record.json

# 출력 파일 지정
yarn optimize scenarios/saved-record.json scenarios/optimized-record.json
```

### 2. 테스트 코드 틀 생성

#### 기본 생성

```bash
# 모든 시나리오 파일을 테스트 틀로 변환
yarn generate

# 특정 파일을 테스트 틀로 변환
yarn generate scenarios/saved-record.json

# 출력 디렉토리 지정
yarn generate scenarios/saved-record.json ./custom-tests
```

#### 최적화와 함께 생성

```bash
# 원본 JSON을 최적화하면서 테스트 틀 생성
yarn generate --optimize

# 특정 파일을 최적화하면서 테스트 틀 생성
yarn generate scenarios/saved-record.json --optimize
```

## 생성된 파일 구조

```
__generated__/
├── optimized-json/           # 최적화된 JSON 파일들
│   ├── login.optimized.json
│   └── saved-record.optimized.json
└── playwright/              # 생성된 테스트 파일들
    ├── login/
    │   └── SIGN_IN_001.spec.ts
    └── saved-record/
        └── SAVE_REC_001.spec.ts
```

## JSON 파일 구조

### 원본 JSON 형식 (Google Sheets 변환 결과)

```json
[
  {
    "screenId": "login-001",
    "group": "기본 로그인",
    "testId": "1",
    "path": "/login",
    "description": "정상 로그인",
    "given": "/login",
    "when": "올바른 계정 정보를 입력하면",
    "then": "메인 페이지로 이동한다"
  },
  {
    "screenId": "",
    "group": "",
    "testId": "2",
    "path": "",
    "description": "잘못된 비밀번호",
    "given": "",
    "when": "잘못된 비밀번호를 입력하면",
    "then": "오류 메시지가 표시된다"
  }
]
```

### 최적화된 JSON 형식

```json
[
  {
    "sheetId": "login",
    "screenId": "login-001",
    "group": "기본 로그인",
    "tests": [
      {
        "testId": "001",
        "path": "/login",
        "description": "정상 로그인",
        "given": "/login",
        "when": "올바른 계정 정보를 입력하면",
        "then": "메인 페이지로 이동한다"
      },
      {
        "testId": "002",
        "path": "/login",
        "description": "잘못된 비밀번호",
        "given": "/login",
        "when": "잘못된 비밀번호를 입력하면",
        "then": "오류 메시지가 표시된다"
      }
    ]
  }
]
```

## JSON 최적화 기능

JsonOptimizer는 다음과 같은 변환을 수행합니다:

1. **빈 필드 채우기**: `screenId`, `group`, `path` 등의 빈 필드를 이전 값으로 자동 채웁니다
2. **testId 변환**: "1" → "001" 형식으로 3자리 숫자로 변환합니다
3. **sheetId 설정**: 파일명을 기반으로 자동 설정합니다
4. **데이터 그룹화**: `sheetId` → `screenId` → `group` → `tests` 구조로 재구성합니다
5. **유효성 검사**: 필수 필드 존재 여부를 확인합니다

## 프로젝트 구조

```
e2e-autogen/
├── core/
│   ├── index.ts          # 메인 진입점
│   ├── optimizer.ts      # JSON 최적화 클래스
│   ├── parser.ts         # 시나리오 파싱 클래스
│   ├── generator.ts      # 테스트 코드 생성 클래스
│   └── types/
│       └── index.ts      # 타입 정의
├── scenarios/            # 시나리오 JSON 파일들
├── __generated__/        # 자동 생성된 파일들
│   ├── optimized-json/   # 최적화된 JSON
│   └── playwright/       # 테스트 파일들
└── package.json
```

## 개발

```bash
# 개발 모드 실행
yarn dev

# 빌드
yarn build

# 빌드된 파일 실행
yarn start
```

## 라이선스

MIT
