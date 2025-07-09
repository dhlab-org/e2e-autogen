import { DEFAULT_DIRECTORIES } from "../types";

type TContract = {
  options(): TCliOptions;
};

class CliArgumentParser implements TContract {
  readonly #args: string[];

  constructor(args: string[]) {
    this.#args = args;
  }

  options(): TCliOptions {
    const options: TCliOptions = {
      command: "generate",
      sheetsUrl: "",
      outputDir: DEFAULT_DIRECTORIES.playwright,
      resultsPath: "",
      help: false,
      version: false,
    };

    let i = 0;

    // ===== 1단계: 서브커맨드 감지 (generate | update) =====
    if (this.#args[i] === "generate" || this.#args[i] === "update") {
      options.command = this.#args[i] as "generate" | "update";
      i++; // 서브커맨드 건너뛰기
    }

    // ===== 2단계: 나머지 옵션 파싱 =====
    for (; i < this.#args.length; i++) {
      const arg = this.#args[i];

      switch (arg) {
        case "--sheets":
        case "--url":
          options.sheetsUrl = this.#nextArgument(
            i,
            "--sheets 옵션에는 Google Sheets URL이 필요합니다"
          );
          i++; // 다음 인자를 건너뛰기
          break;

        case "--output":
        case "-o":
          options.outputDir = this.#nextArgument(
            i,
            "--output 옵션에는 디렉토리 경로가 필요합니다"
          );
          i++; // 다음 인자를 건너뛰기
          break;

        case "--help":
        case "-h":
          options.help = true;
          break;

        case "--results":
        case "-r":
          options.resultsPath = this.#nextArgument(
            i,
            "--results 옵션에는 Playwright JSON 리포터 파일 경로가 필요합니다"
          );
          i++;
          break;

        case "--version":
        case "-v":
          options.version = true;
          break;

        default:
          this.#handleDefaultArgument(arg, options);
          break;
      }
    }

    return options;
  }

  #nextArgument(index: number, errorMessage: string): string {
    if (index + 1 < this.#args.length) {
      return this.#args[index + 1];
    }
    throw new Error(errorMessage);
  }

  #handleDefaultArgument(arg: string, options: TCliOptions): void {
    if (!arg.startsWith("-") && !options.sheetsUrl) {
      options.sheetsUrl = arg;
    } else if (arg.startsWith("-")) {
      console.warn(`⚠️  알 수 없는 옵션: ${arg}`);
    }
  }
}

export { CliArgumentParser, type TCliOptions };

type TCliOptions = {
  command: "generate" | "update";
  sheetsUrl: string;
  outputDir: string;
  resultsPath: string;
  help: boolean;
  version: boolean;
};
