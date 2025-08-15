# 📊 스프레드시트 작성 가이드

이 [샘플 시트](https://docs.google.com/spreadsheets/d/1W4oepZu7iDqJLNFW4s5GaRTykOlymv1go9LFZU-YbtQ/edit?gid=0#gid=0)를 복제하여 프로젝트용 시트를 생성하세요.   
E2E Autogen은 이 시트를 분석하여 테스트 스텁을 자동 생성합니다. 

## 1. 식별 규칙
`E2E Autogen`은 **ID 규칙**에 따라 시나리오와 테스트케이스를 인식합니다.

- `TC-x` → 대분류 (탭/시트 단위)
  - 1depth, 기능군 또는 사용자 목적 기반, 하나의 스프레드시트 시트(Tab)로 관리
- `TC-x.x` → 중분류(시나리오) (시트 내 상위 테스트 흐름)
  - 2 depth, 주로 '기능에 해당', 기능군 내에 존재하는 개별 UI 구성 요소 또는 사용자 행동 시나리오 단위
- `TC-x.x.x` → 소분류(테스트케이스) (시나리오 내 세부 스텝)
  - 3depth, 실제 QA 테스트가 이루어지는 최소 단위. ‘사용자 액션’과 그에 따른 ‘시스템 기대 반응’을 기술, 기능 동작의 명확한 조건과 결과를 명시


## 2. 시트/탭 네이밍 규칙

- 형식: `[TC-x]` 또는 `[TC-x] 기능명`
- 예: `[TC-1] 로그인`, `[TC-2] 회원가입`

- 의미: `[TC-x]`는 대분류 ID로 사용됩니다.
- 필수: 반드시 대괄호([]) 안에 `TC-숫자` 형식이 포함되어야 합니다.


## 3. 컬럼 구조

| 컬럼              | 설명                                     | 예시                                                   |
| ----------------- | ---------------------------------------- | ------------------------------------------------------ |
| A (시나리오 ID)   | 테스트 시나리오 식별자                   | TC-1.1                                                 |
| B (e2e 시나리오)  | 시나리오 설명                            | 질문 입력                                              |
| C (UI path)       | 테스트 대상 UI 경로                      | 홈 / 입력창                                            |
| D (action/when)   | 테스트 액션 또는 조건                    | 메인화면 로드                                          |
| E (expected/then) | 기대 결과                                | 질문 입력창이 정상적으로 표시                          |
| F (테스트 ID)     | 개별 테스트 스텝 식별자                  | TC-1.1.1                                               |
| G (Tag)           | 어떤 맥락에서 나온 테스트케이스인지 기록 | `bugfix`, `new`                                        |
| H (Comment)       | 자유롭게 작성                            |                                                        |
| I~ (결과 컬럼)    | 테스트 실행 결과 (자동 업데이트)         | `pass`, `fail`, `flaky`, `not_executed`, `manual_only` |

## 4. 공유 설정
1. Google Sheets에서 대상 스프레드시트를 엽니다
2. 우측 상단의 **공유** 버튼 클릭
3. 서비스 어카운트 이메일을 **Editor** 권한으로 추가
4. 스프레드시트 URL을 준비합니다 

## 5. TC 작성 팁
- 하나의 테스트 항목은 반드시 하나의 조건과 하나의 예상 결과만 포함, 중복된 문장을 최대한 배제합니다 
- 테스트 조건은 정확한 UI 상태나 데이터 상태로 서술합니다 (ex: “입력창에 텍스트 없음”, “모달이 열려 있음”) 
- TC id는 되도록이면 변경하지 않습니다 (자동테스트 결과와 불일치하는 문제 발생 가능, 변경이 필요한 경우 개발자에게 알립니다.) 
- 새로운 TC를 추가할 경우 중간에 삽입하지 말고 항상 마지막에 추가하거나, 어려운 경우 별도의 시나리오로 분리합니다.

## 6. 시나리오/테스트 ID 자동 생성

### 6.1. 테스트 작성
다음처럼 **B열(e2e 시나리오)**, **D열(action/when)**, **E열(expected/then)**만 채웁니다.
**A열(시나리오 ID)**, **F열(테스트 ID)**은 비워둡니다.

| A (시나리오 ID) | B (e2e 시나리오) | C (UI path) | D (action/when) | E (expected/then) | F (테스트 ID) |
| ----------- | ------------ | ----------- | --------------- | ----------------- | ---------- |
| *(비움)*      | 로그인 성공 시나리오  | 홈/로그인창      | 이메일 입력          | 이메일이 정상적으로 입력된다   | *(비움)*     |
| *(비움)*      |              | 홈/로그인창      | 비밀번호 입력         | 비밀번호가 정상적으로 입력된다  | *(비움)*     |
| *(비움)*      | 로그인 실패 시나리오  | 홈/로그인창      | 잘못된 입력          | 오류 메시지가 표시된다      | *(비움)*     |


### 6.2. 자동 생성 실행

- 메뉴 상단 → `Extensions > Macros > generateScenarioAndTestIds` 클릭
- 아래처럼 자동 채워집니다:

| A (시나리오 ID) | B (e2e 시나리오) | C (UI path) | D (action/when) | E (expected/then) | F (테스트 ID) |
| ----------- | ------------ | ----------- | --------------- | ----------------- | ---------- |
| TC-3.1      | 로그인 성공 시나리오  | 홈/로그인창      | 이메일 입력          | 이메일이 정상적으로 입력된다   | TC-3.1.1   |
|             |              | 홈/로그인창      | 비밀번호 입력         | 비밀번호가 정상적으로 입력된다  | TC-3.1.2   |
| TC-3.2      | 로그인 실패 시나리오  | 홈/로그인창      | 잘못된 입력          | 오류 메시지가 표시된다      | TC-3.2.1   |

- 시나리오 ID(A열): B열에 시나리오 설명이 있는 첫 행에만 채워집니다.
- 테스트 ID(F열): 시나리오 ID 뒤에 .1, .2, .3 순서로 자동 생성됩니다.

### 6.3 매크로 코드 예시
```ts
function generateScenarioAndTestIds() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const sheetName = sheet.getName();

  // 1. 시트 이름에서 [TC-3] 추출
  const match = sheetName.match(/\[(.*?)\]/);
  if (!match) {
    throw new Error("시트 이름에 [TC-x] 형식이 없습니다.");
  }
  const prefix = match[1]; // "TC-3"

  const data = sheet.getDataRange().getValues();
  let currentScenarioId = "";
  let scenarioCount = 1;
  let testIndex = 0;

  for (let i = 1; i < data.length; i++) {
    const e2e = data[i][1]; // B열 (e2e 시나리오)
    const scenarioCell = data[i][0]; // A열
    const isScenarioStart = e2e !== "";

    // 2. B열이 채워진 경우 새로운 시나리오 시작
    if (isScenarioStart) {
      currentScenarioId = `${prefix}.${scenarioCount}`;
      sheet.getRange(i + 1, 1).setValue(currentScenarioId); // A열에만 채움
      scenarioCount++;
      testIndex = 1; // 새로운 시나리오 시작 → 테스트 인덱스 1부터
    } else if (currentScenarioId !== "") {
      // 시나리오 ID는 시작 행 외에는 비워둠
      testIndex++;
    } else {
      continue; // B열이 비어 있고 currentScenarioId도 없다면 skip
    }

    // 3. 테스트 ID 항상 채움 (F열)
    const testId = `${currentScenarioId}.${testIndex}`;
    sheet.getRange(i + 1, 6).setValue(testId);
  }
}
```