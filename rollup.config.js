const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");
const alias = require("@rollup/plugin-alias");
const dts = require("rollup-plugin-dts").default;

const path = require("path");

const aliasConfig = {
  entries: [
    { find: "@config", replacement: path.resolve(__dirname, "./config") },
    { find: "@core", replacement: path.resolve(__dirname, "./core") },
    { find: "@packages", replacement: path.resolve(__dirname, "./packages") },
  ],
};

module.exports = [
  // CLI 도구 빌드
  {
    input: "core/cli.ts",
    output: {
      file: "dist/core/cli.cjs",
      format: "cjs",
    },
    external: [],
    plugins: [
      json(),
      alias(aliasConfig),
      resolve({
        preferBuiltins: true,
        extensions: [".js", ".ts", ".json"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.cli.json",
      }),
    ],
  },
  // define-config.ts 빌드
  {
    input: "config/define-config.ts",
    output: [
      {
        file: "dist/config/define-config.cjs",
        format: "cjs",
      },
      {
        file: "dist/config/define-config.js",
        format: "esm",
      },
    ],
    plugins: [
      alias(aliasConfig),
      resolve({
        preferBuiltins: true,
        extensions: [".js", ".ts", ".json"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist/config",
      }),
    ],
  },
  // Playwright 패키지 빌드
  {
    input: ["packages/playwright/reporter.ts", "packages/playwright/index.ts"],
    output: [
      {
        dir: "dist/packages",
        format: "cjs",
        entryFileNames: "[name].cjs",
        preserveModules: true,
        preserveModulesRoot: "packages",
      },
      {
        dir: "dist/packages",
        format: "esm",
        entryFileNames: "[name].js",
        preserveModules: true,
        preserveModulesRoot: "packages",
      },
    ],
    plugins: [
      alias(aliasConfig),
      resolve({
        preferBuiltins: true,
        extensions: [".js", ".ts", ".json"],
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist/packages",
      }),
    ],
  },
  // 타입 정의 파일 생성
  {
    input: "config/define-config.ts",
    output: {
      file: "dist/config/define-config.d.ts",
      format: "esm",
    },
    plugins: [
      alias(aliasConfig),
      dts({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@config/*": ["./config/*"],
            "@core/*": ["./core/*"],
            "@packages/*": ["./packages/*"],
          },
        },
      }),
    ],
  },
  {
    input: "packages/playwright/index.ts",
    output: {
      file: "dist/packages/playwright/index.d.ts",
      format: "esm",
    },
    external: ["@playwright/test", "@msw/playwright"],
    plugins: [
      alias(aliasConfig),
      dts({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@config/*": ["./config/*"],
            "@core/*": ["./core/*"],
            "@packages/*": ["./packages/*"],
          },
        },
      }),
    ],
  },
  {
    input: "packages/playwright/reporter.ts",
    output: {
      file: "dist/packages/playwright/reporter.d.ts",
      format: "esm",
    },
    external: ["@playwright/test", "@msw/playwright"],
    plugins: [
      alias(aliasConfig),
      dts({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@config/*": ["./config/*"],
            "@core/*": ["./core/*"],
            "@packages/*": ["./packages/*"],
          },
        },
      }),
    ],
  },
];
