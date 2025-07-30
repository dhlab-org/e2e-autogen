import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import type { TE2EAutogenConfig } from "./types";

const execAsync = promisify(exec);
class UserConfig {
  readonly #configPath: string;

  constructor(configPath: string = "e2e-autogen.config.ts") {
    this.#configPath = path.resolve(configPath);
  }

  async load(): Promise<TE2EAutogenConfig> {
    if (!this.#fileExists()) {
      throw new Error(`Config file not found: ${this.#configPath}`);
    }

    return this.#loadConfig();
  }

  #fileExists(): boolean {
    try {
      const fs = require("fs");
      return fs.existsSync(this.#configPath);
    } catch {
      return false;
    }
  }

  async #loadConfig(): Promise<TE2EAutogenConfig> {
    // 방법 1: tsx 사용
    try {
      return await this.#loadWithTsx();
    } catch (error) {}

    // 방법 2: ts-node 사용
    try {
      return await this.#loadWithTsNode();
    } catch (error) {}

    // 방법 3: 직접 파일 읽기 후 동적 import
    try {
      return await this.#loadWithDynamicImport();
    } catch (error) {}

    throw new Error(
      `Failed to load config from ${this.#configPath}. All methods failed.`
    );
  }

  async #loadWithTsx(): Promise<TE2EAutogenConfig> {
    const command = `tsx -e "
      import('${this.#configPath}').then(module => {
        const config = module.default || module;
        console.log(JSON.stringify(config));
      }).catch(err => {
        console.error('Import error:', err.message);
        process.exit(1);
      })
    "`;

    const { stdout } = await execAsync(command);
    const output = stdout.trim();

    if (!output) {
      throw new Error("Empty output from tsx");
    }

    try {
      const parsed = JSON.parse(output);
      const config = parsed.default || parsed;
      this.#validateConfig(config);
      return config;
    } catch (parseError) {
      // JSON 파싱이 실패하면 수동으로 추출 시도
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const manualParsed = JSON.parse(jsonMatch[0]);
          const config = manualParsed.default || manualParsed;
          this.#validateConfig(config);
          return config;
        }
      } catch {
        // 무시
      }

      throw new Error(
        `Failed to parse tsx output: ${(parseError as Error).message}`
      );
    }
  }

  async #loadWithTsNode(): Promise<TE2EAutogenConfig> {
    const command = `npx ts-node --esm -e "
      import('${this.#configPath.replace(".ts", "")}').then(module => {
        const config = module.default || module;
        console.log(JSON.stringify(config));
      }).catch(err => {
        console.error('Import error:', err.message);
        process.exit(1);
      })
    "`;

    try {
      const { stdout } = await execAsync(command);
      const output = stdout.trim();

      if (!output) {
        throw new Error("Empty output from ts-node");
      }

      const parsed = JSON.parse(output);
      const config = parsed.default || parsed;
      this.#validateConfig(config);
      return config;
    } catch (execError) {
      // ts-node가 실패하면 다른 방법 시도
      try {
        const fallbackCommand = `npx ts-node -e "
          const fs = require('fs');
          const content = fs.readFileSync('${this.#configPath}', 'utf-8');
          const config = eval('(' + content.replace(/export\\s+default\\s+/, '') + ')');
          console.log(JSON.stringify(config));
        "`;

        const { stdout } = await execAsync(fallbackCommand);
        const output = stdout.trim();

        const config = JSON.parse(output);
        this.#validateConfig(config);
        return config;
      } catch {
        throw new Error(
          `Failed to parse ts-node output: ${(execError as Error).message}`
        );
      }
    }
  }

  async #loadWithDynamicImport(): Promise<TE2EAutogenConfig> {
    const fs = await import("fs");
    const content = fs.readFileSync(this.#configPath, "utf-8");

    // export default를 찾아서 추출
    const defaultExportPatterns = [
      /export\s+default\s+({[\s\S]*?});?$/m,
      /export\s+default\s+([^;]+);?$/m,
      /const\s+config\s*=\s*({[\s\S]*?});?\s*export\s+default\s+config;?$/m,
      /export\s+default\s+([^;]+);?$/m,
    ];

    let defaultExportMatch = null;
    for (const pattern of defaultExportPatterns) {
      defaultExportMatch = content.match(pattern);
      if (defaultExportMatch) {
        break;
      }
    }

    if (!defaultExportMatch) {
      // export default가 없으면 전체 파일에서 객체를 찾기
      const objectPattern = /({[\s\S]*?});?$/m;
      const objectMatch = content.match(objectPattern);

      if (objectMatch) {
        defaultExportMatch = objectMatch;
      } else {
        throw new Error("No default export or object found in config file");
      }
    }

    // 임시 JS 파일 생성
    const tempJsPath = this.#configPath.replace(".ts", ".temp.js");
    const jsContent = `
      const config = ${defaultExportMatch[1]};
      console.log(JSON.stringify(config));
    `;

    fs.writeFileSync(tempJsPath, jsContent);

    try {
      const { stdout } = await execAsync(`node ${tempJsPath}`);
      const output = stdout.trim();

      const config = JSON.parse(output);
      this.#validateConfig(config);
      return config;
    } finally {
      // 임시 파일 정리
      try {
        fs.unlinkSync(tempJsPath);
      } catch {
        // 무시
      }
    }
  }

  #validateConfig(config: any): void {
    if (!config || typeof config !== "object") {
      throw new Error("Config must be an object");
    }

    const requiredFields = ["sheetsUrl", "framework", "stubOutputFolder"];
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
  }
}

const loadUserConfig = async (): Promise<TE2EAutogenConfig> => {
  const loader = new UserConfig();
  return loader.load();
};

export { loadUserConfig };
