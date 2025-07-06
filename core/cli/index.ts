import { CliArgumentParser } from "./argument-parser";
import { CommandHandler } from "./command-handler";
import { CliApplication } from "./application";

/**
 * CLI 애플리케이션을 생성하는 팩토리 함수
 */
function createCliApplication(args: string[]): CliApplication {
  const argumentParser = new CliArgumentParser(args);
  const commandHandler = new CommandHandler();

  return new CliApplication(argumentParser, commandHandler);
}

export { createCliApplication };
