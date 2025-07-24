type TDirectoryStructure = {
  generatedStub: string;
  credentials: string;
};

export const DEFAULT_DIRECTORIES: TDirectoryStructure = {
  generatedStub: "./playwright/__generated-stub__",
  credentials: "./playwright/.auth/credentials.json",
} as const;
