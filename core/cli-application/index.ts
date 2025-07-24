import { match } from "ts-pattern";
import { Command, CommandContract } from "./command";
import { showUsage, showVersion, updateTestResults } from "./command-executors";
import { StubGenerator } from "../stub";
import { authorizedGoogleSpreadsheets } from "../google-spreadsheets";

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

          const googleSpreadsheets = await authorizedGoogleSpreadsheets(
            options.sheetsUrl,
            options.credentialsPath
          );

          const stubGenerator = new StubGenerator(
            googleSpreadsheets,
            options.generatedStubDir
          );

          await stubGenerator.generateForPlaywright();
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
