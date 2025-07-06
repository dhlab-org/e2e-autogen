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
      sheetsUrl: "",
      outputDir: DEFAULT_DIRECTORIES.playwright,
      help: false,
      version: false,
    };

    for (let i = 0; i < this.#args.length; i++) {
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
  sheetsUrl: string;
  outputDir: string;
  help: boolean;
  version: boolean;
};
