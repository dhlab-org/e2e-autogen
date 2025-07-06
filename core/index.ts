#!/usr/bin/env node

import { createCliApplication } from "./cli";

// 메인 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  const app = createCliApplication(args);

  app.run().catch((error: Error) => {
    console.error("❌ CLI 실행 중 오류:", error);
    process.exit(1);
  });
}
