type TContract = {
  spreadsheetId(): string;
  gid(): string | null;
  url(): string;
};

class SpreadsheetUrlParser implements TContract {
  readonly #url: string;
  readonly #spreadsheetId: string;
  readonly #gid: string | null;

  constructor(url: string) {
    this.#url = url;
    this.#validate(url);
    this.#spreadsheetId = this.#extractSpreadsheetId();
    this.#gid = this.#extractGid();
  }

  /**
   * URL 유효성 검사
   */
  #validate(url: string): void {
    if (!url) {
      throw new Error("URL이 필요합니다.");
    }
  }

  /**
   * 구글 시트 URL에서 스프레드시트 ID 추출
   */
  #extractSpreadsheetId(): string {
    const match = this.#url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("유효하지 않은 Google Sheets URL입니다.");
    }
    return match[1];
  }

  /**
   * URL에서 gid(시트 ID) 추출
   */
  #extractGid(): string | null {
    const gidMatch = this.#url.match(/[#&]gid=([0-9]+)/);
    return gidMatch ? gidMatch[1] : null;
  }

  /**
   * 스프레드시트 ID
   */
  spreadsheetId(): string {
    return this.#spreadsheetId;
  }

  /**
   * GID
   */
  gid(): string | null {
    return this.#gid;
  }

  /**
   * 원본 URL
   */
  url(): string {
    return this.#url;
  }
}

export { SpreadsheetUrlParser };
