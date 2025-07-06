import { E2EAutogen } from "./autogen";
import { TestCodeGenerator } from "./generator";
import { ScenarioParser } from "./parser";

function createStubGenerator(): E2EAutogen {
  const parser = new ScenarioParser();
  const generator = new TestCodeGenerator();

  return new E2EAutogen(parser, generator);
}

export { createStubGenerator };
