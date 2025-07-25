import { TPrefix, TScenarioData, TStepData } from "./types";

type DetoxTemplateContract = {
  write(targetDir: string): Promise<void>;
};

class DetoxTemplate implements DetoxTemplateContract {
  constructor(scenariosPerPrefix: Map<TPrefix, TScenarioData[]>) {}

  async write(targetDir: string): Promise<void> {}
}

export { DetoxTemplate };
