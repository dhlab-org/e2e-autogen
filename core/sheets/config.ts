/**
 * 구글 시트 관련 설정
 */
export const GOOGLE_SHEETS_CONFIG = {
  // 인증 범위
  SCOPES: ["https://www.googleapis.com/auth/spreadsheets"],

  // 헤더 행 감지를 위한 초기 범위 (두 번째 행까지 헤더 행으로 감지)
  HEADER_DETECTION_RANGE: "1:2",

  // 최대 감지 범위 (fallback)
  MAX_DETECTION_RANGE: "A:ZZ",

  // 기본 시트 범위 (필요시)
  DEFAULT_RANGE: "A:F",

  // 최대 행 수 (성능 고려)
  MAX_ROWS: 10000,
};

/**
 * 컬럼 관련 설정
 */
export const COLUMN_CONFIG = {
  // 최대 감지 컬럼 (A~Z)
  MAX_DETECTION_COLUMN: 26,

  // 컬럼 문자 시작값 (A = 65)
  COLUMN_CHAR_START: 65,

  // 컬럼 알파벳 개수
  ALPHABET_COUNT: 26,
} as const;
