export type TFlag = "HELP" | "VERSION";
export type TSubCommand = "GENERATE" | "UPDATE";

type TDefaultOptions = {
  sheetsUrl: string;
  credentialsPath: string;
};

export type TGenerateOptions = TDefaultOptions & {
  generatedStubDir: string;
};

export type TUpdateOptions = TDefaultOptions & {
  jsonReporterPath: string;
};
