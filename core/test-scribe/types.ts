export type TScenarioData = {
  scenarioId: string;
  scenarioDescription: string;
  steps: TStepData[];
};

export type TStepData = {
  testId: string;
  uiPath: string;
  when: string;
  then: string;
};

export type TPrefix = string; // TC-x
export type TRow = any[];
