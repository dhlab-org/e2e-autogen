#!/usr/bin/env node

import { CliApplication } from "./cli-application";

if (require.main === module) {
  const args = process.argv.slice(2);
  const app = new CliApplication(args);

  app.run();
}
