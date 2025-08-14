# 로컬 개발 가이드 (Yarn v1)

로컬에서 `@dhlab/e2e-autogen`을 소비 앱에 붙여 테스트할 때, Yarn v1의 `file:` 의존성보다 `.tgz`(pack 결과물) 설치를 권장합니다.
`file:`은 로컬 폴더를 직접 복사하는 방식이라 singleton 패키지(예: `@playwright/test`)가 중복 로드될 가능성이 있으며, 이는 런타임 충돌을 일으킬 수 있습니다.

## 권장 방식: tgz 패키지로 설치

### 1) 라이브러리에서 빌드 및 패키징
```bash
# 라이브러리 루트에서
yarn build
# tgz 파일 생성 (경로는 임의 지정 가능)
yarn pack --filename ./e2e-autogen.tgz
```

### 2) 소비 앱에서 설치/업데이트
```bash
# 소비 앱 루트에서
yarn remove @dhlab/e2e-autogen  # 기존 설치가 있다면 제거
yarn add file:/absolute/path/to/e2e-autogen.tgz
```

`package.json`에 직접 명시할 수도 있습니다.
```json
{
  "devDependencies": {
    "@dhlab/e2e-autogen": "file:/absolute/path/to/e2e-autogen.tgz"
  }
}
```
```bash
yarn install
```

### 3) 변경사항 반영(개발 루프)
1. 라이브러리에서 코드 수정
2. `yarn build && yarn pack --filename ./e2e-autogen.tgz`
3. 소비 앱에서 `yarn add file:/absolute/path/to/e2e-autogen.tgz`로 재설치
4. 변경이 반영되지 않으면 `yarn cache clean` 후 재설치

## 왜 file: 대신 tgz인가요?

| 방식        | 특징                        | 중복 로드 위험                                |
| --------- | ------------------------- | --------------------------------------- |
| **file:** | 로컬 폴더를 그대로 복사하여 설치        | 높음 – 라이브러리/소비 앱 각각에 동일 모듈이 별도로 설치될 수 있음 |
| **.tgz**  | npm 레지스트리 배포물과 동일한 형태로 설치 | 낮음 – 의존성을 소비 앱 기준으로만 해석                 |

## Yarn 버전별 참고
- Yarn v4 이상:
  - 로컬 개발에는 `portal:` 사용을 권장합니다.
  - `portal:`은 `symlink` 기반이어서 빌드 없이도 코드 변경이 즉시 반영됩니다.
  - 루트 `resolutions`로 `@playwright/test`를 단일 버전으로 고정하면 중복 로드를 예방할 수 있습니다.
  - 예시
    ```json
    {
      "dependencies": {
        "@dhlab/e2e-autogen": "portal:/absolute/path/to/mega-factory/dhlab-e2e-autogen"
      },
      "resolutions": {
        "@playwright/test": "1.52.0"
      }
    }
    ```
- Yarn v1:
  - `portal:`을 지원하지 않습니다. `file:`은 폴더 전체 복사로 인해 중복 로드 문제가 발생하기 쉬우므로 `.tgz` 설치를 권장합니다.
  - 이 문서 상단 절차(빌드→pack→tgz 설치)를 따라 주세요.

## npm 사용 시
```bash
npm i /absolute/path/to/e2e-autogen.tgz
```

## 트러블슈팅 체크리스트
- 소비 앱에서 `node_modules`를 삭제 후 재설치: `rm -rf node_modules && yarn install`
- 워크스페이스/모노레포 환경이라면 루트에서 `yarn workspaces focus`(해당 시)로 의존성 정리
- IDE/TS 서버 재시작으로 타입 선언 및 툴팁 갱신
