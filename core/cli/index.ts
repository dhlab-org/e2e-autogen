import { CliArgumentParser } from "./argument-parser";
import { CommandHandler } from "./command-handler";
import { CliApplication } from "./application";

function createCliApplication(args: string[]): CliApplication {
  const argumentParser = new CliArgumentParser(args);
  const commandHandler = new CommandHandler();

  return new CliApplication(argumentParser, commandHandler);
}

export { createCliApplication };
