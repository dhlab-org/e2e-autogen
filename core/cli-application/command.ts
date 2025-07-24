import { DEFAULT_DIRECTORIES } from "../config";
import { match } from "ts-pattern";
import { TFlag, TGenerateOptions, TSubCommand, TUpdateOptions } from "./types";

type CommandContract = {
  type: "FLAG" | "SUB_COMMAND";
  flag: TFlag;
  subCommand: TSubCommand;
  optionsOf(subCommand: "GENERATE"): TGenerateOptions;
  optionsOf(subCommand: "UPDATE"): TUpdateOptions;
};

class Command implements CommandContract {
  readonly #args: string[];

  constructor(args: string[]) {
    this.#args = args;
  }

  get type(): TCommand["type"] {
    return match(this.#args)
      .when(
        () =>
          this.#hasFlag("--help") ||
          this.#hasFlag("-h") ||
          this.#hasFlag("--version") ||
          this.#hasFlag("-v"),
        () => "FLAG" as const
      )
      .when(
        (args) => args[0] === "generate" || args[0] === "update",
        () => "SUB_COMMAND" as const
      )
      .otherwise(() => {
        throw new Error("flag 또는 sub command 필요");
      });
  }

  get flag(): TFlag {
    return match(this.#args)
      .when(
        () => this.#hasFlag("--help") || this.#hasFlag("-h"),
        () => "HELP" as const
      )
      .when(
        () => this.#hasFlag("--version") || this.#hasFlag("-v"),
        () => "VERSION" as const
      )
      .otherwise(() => {
        throw new Error("플래그 명령이 아닙니다.");
      });
  }

  get subCommand(): TSubCommand {
    return match(this.#args[0])
      .with("generate", () => "GENERATE" as const)
      .with("update", () => "UPDATE" as const)
      .otherwise(() => {
        throw new Error(
          "서브커맨드가 필요합니다. 'generate' 또는 'update'를 지정해주세요."
        );
      });
  }

  optionsOf(subCommand: "GENERATE"): TGenerateOptions;
  optionsOf(subCommand: "UPDATE"): TUpdateOptions;
  optionsOf(subCommand: TSubCommand): TGenerateOptions | TUpdateOptions {
    return match(subCommand)
      .with("GENERATE", () => ({
        sheetsUrl: this.#sheetsUrl(),
        credentialsPath: this.#credentialsPath(),
        generatedStubDir: this.#generatedStubDir(),
      }))
      .with("UPDATE", () => ({
        sheetsUrl: this.#sheetsUrl(),
        credentialsPath: this.#credentialsPath(),
        jsonReporterPath: this.#jsonReporterPath(),
      }))
      .exhaustive();
  }

  #hasFlag(flag: string): boolean {
    return this.#args.includes(flag);
  }

  #sheetsUrl(): string {
    const sheetsIndex = this.#indexOf("--sheets");

    if (sheetsIndex !== -1) {
      return this.#args[sheetsIndex + 1] || "";
    }

    throw new Error("sheets url 옵션이 필요합니다.");
  }

  #credentialsPath(): string {
    const credentialsIndex = this.#indexOf("--credentials");

    if (credentialsIndex !== -1) {
      return (
        this.#args[credentialsIndex + 1] || DEFAULT_DIRECTORIES.credentials
      );
    }

    return DEFAULT_DIRECTORIES.credentials;
  }

  #generatedStubDir(): string {
    const outputIndex = this.#indexOf("--output");

    if (outputIndex !== -1) {
      return this.#args[outputIndex + 1] || DEFAULT_DIRECTORIES.generatedStub;
    }

    return DEFAULT_DIRECTORIES.generatedStub;
  }

  #jsonReporterPath(): string {
    const reporterIndex = this.#indexOf("--reporter");

    if (reporterIndex !== -1) {
      return this.#args[reporterIndex + 1] || "";
    }

    throw new Error("json reporter 옵션이 필요합니다.");
  }

  #indexOf(option: string): number {
    return this.#args.findIndex((arg) => arg === option);
  }
}

export { Command, type CommandContract };

type TCommand =
  | {
      type: "FLAG";
      flag: TFlag;
    }
  | {
      type: "SUB_COMMAND";
      subCommand: "GENERATE";
      options: TGenerateOptions;
    }
  | {
      type: "SUB_COMMAND";
      subCommand: "UPDATE";
      options: TUpdateOptions;
    };
