import { match } from "ts-pattern";
import { Command, CommandContract } from "./command";
import { CommandHandler, type CommandHandlerContract } from "./command-handler";

type CliApplicationContract = {
  run(): Promise<void>;
};

class CliApplication implements CliApplicationContract {
  readonly #command: CommandContract;
  readonly #commandHandler: CommandHandlerContract;

  constructor(args: string[]) {
    this.#command = new Command(args);
    this.#commandHandler = new CommandHandler();
  }

  async run(): Promise<void> {
    try {
      match(this.#command)
        .with({ type: "FLAG", flag: "HELP" }, () => {
          this.#commandHandler.showUsage();
          process.exit(0);
        })
        .with({ type: "FLAG", flag: "VERSION" }, () => {
          this.#commandHandler.showVersion();
          process.exit(0);
        })
        .with({ type: "SUB_COMMAND", subCommand: "GENERATE" }, async () => {
          const options = this.#command.optionsOf("GENERATE");
          await this.#commandHandler.generateTestCode(options);
        })
        .with({ type: "SUB_COMMAND", subCommand: "UPDATE" }, async () => {
          const options = this.#command.optionsOf("UPDATE");
          await this.#commandHandler.updateTestResults(options);
        })
        .exhaustive();
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  }
}

export { CliApplication, type CliApplicationContract };
