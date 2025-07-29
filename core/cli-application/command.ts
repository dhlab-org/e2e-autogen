import { match } from "ts-pattern";
import { TE2EAutogenConfig } from "../config";
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
  readonly #config: TE2EAutogenConfig;

  constructor(args: string[], config: TE2EAutogenConfig) {
    this.#args = args;
    this.#config = config;
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
        sheetsUrl: this.#config.sheetsUrl,
        credentialsFile: this.#config.credentialsFile,
        stubOutputFolder: this.#config.stubOutputFolder,
        framework: this.#config.framework,
        googleSheetColumns: this.#config.googleSheetColumns,
      }))
      .with("UPDATE", () => ({
        sheetsUrl: this.#config.sheetsUrl,
        credentialsFile: this.#config.credentialsFile,
        jsonReporterFile: this.#config.jsonReporterFile,
        googleSheetColumns: this.#config.googleSheetColumns,
      }))
      .exhaustive();
  }

  #hasFlag(flag: string): boolean {
    return this.#args.includes(flag);
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
