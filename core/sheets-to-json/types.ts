export type TScenarioData = {
  scenarioId: string;
  scenario: string;
  steps: TStepData[];
};

export type TStepData = {
  testId: string;
  uiPath: string;
  when: string;
  then: string;
};
