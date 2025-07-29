#!/usr/bin/env node

import { CliApplication } from "./cli-application";
import { loadUserConfig } from "./config";

const main = async () => {
  const args = process.argv.slice(2);
  const config = await loadUserConfig();

  const app = new CliApplication(args, config);
  app.run();
};

if (require.main === module) {
  main();
}
