#!/usr/bin/env node

import { loadUserConfig } from "../config";
import { CliApplication } from "./cli-application";

const main = async () => {
  const args = process.argv.slice(2);
  const config = await loadUserConfig();

  const app = new CliApplication(args, config);
  app.run();
};

if (require.main === module) {
  main();
}
