import { match } from "ts-pattern";
import { Command, CommandContract } from "./command";
import {
  generateTestCode,
  showUsage,
  showVersion,
  updateTestResults,
} from "./command-executors";

type CliApplicationContract = {
  run(): Promise<void>;
};

class CliApplication implements CliApplicationContract {
  readonly #command: CommandContract;

  constructor(args: string[]) {
    this.#command = new Command(args);
  }

  async run(): Promise<void> {
    try {
      match(this.#command)
        .with({ type: "FLAG", flag: "HELP" }, () => {
          showUsage();
          process.exit(0);
        })
        .with({ type: "FLAG", flag: "VERSION" }, () => {
          showVersion();
          process.exit(0);
        })
        .with({ type: "SUB_COMMAND", subCommand: "GENERATE" }, async () => {
          const options = this.#command.optionsOf("GENERATE");
          await generateTestCode(options);
        })
        .with({ type: "SUB_COMMAND", subCommand: "UPDATE" }, async () => {
          const options = this.#command.optionsOf("UPDATE");
          await updateTestResults(options);
        })
        .exhaustive();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

export { CliApplication, type CliApplicationContract };
