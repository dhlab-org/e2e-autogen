import { CliArgumentParser } from "./argument-parser";
import { CommandHandler } from "./command-handler";

type TContract = {
  run(): Promise<void>;
};

class CliApplication implements TContract {
  readonly #argumentParser: CliArgumentParser;
  readonly #commandHandler: CommandHandler;

  constructor(
    argumentParser: CliArgumentParser,
    commandHandler: CommandHandler
  ) {
    this.#argumentParser = argumentParser;
    this.#commandHandler = commandHandler;
  }

  async run(): Promise<void> {
    try {
      const options = this.#argumentParser.options();

      if (options.help) {
        this.#commandHandler.showUsage();
        process.exit(0);
      }

      if (options.version) {
        this.#commandHandler.showVersion();
        process.exit(0);
      }

      if (!options.sheetsUrl) {
        console.error("❌ Google Sheets URL이 필요합니다.");
        this.#commandHandler.showUsage();
        process.exit(1);
      }

      if (options.command === "update") {
        await this.#commandHandler.updateTestResults(options);
      } else {
        await this.#commandHandler.generateTestCode(options);
      }
    } catch (error) {
      console.error("❌ 예상치 못한 오류:", error);
      process.exit(1);
    }
  }
}

export { CliApplication };
