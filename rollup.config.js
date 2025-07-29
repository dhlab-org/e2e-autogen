const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");

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
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.cli.json",
      }),
    ],
  },
  // define-config.ts 빌드
  {
    input: "core/define-config.ts",
    output: [
      {
        file: "dist/core/define-config.cjs",
        format: "cjs",
      },
      {
        file: "dist/core/define-config.js",
        format: "esm",
      },
    ],
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist/core",
      }),
    ],
  },
  // Playwright 패키지 빌드
  {
    input: "packages/playwright/reporter.ts",
    output: {
      file: "dist/packages/playwright/reporter.cjs",
      format: "cjs",
    },
    plugins: [
      resolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outDir: "dist/packages/playwright",
      }),
    ],
  },
  // {
  //   input: "packages/playwright/index.ts",
  //   output: [
  //     {
  //       file: "dist/packages/playwright/index.js",
  //       format: "esm",
  //     },
  //     {
  //       file: "dist/packages/playwright/index.cjs",
  //       format: "cjs",
  //     },
  //   ],
  //   external: ["@playwright/test"],
  //   plugins: [
  //     json(),
  //     resolve({ extensions: [".js", ".ts"] }),
  //     commonjs(),
  //     typescript({
  //       tsconfig: "./tsconfig.json",
  //       declaration: true,
  //       declarationDir: "dist/packages/playwright",
  //       outDir: "dist/packages/playwright",
  //     }),
  //   ],
  // },
  // // Detox 패키지 빌드
  // {
  //   input: "packages/detox/index.ts",
  //   output: [
  //     {
  //       file: "dist/packages/detox/index.js",
  //       format: "esm",
  //     },
  //     {
  //       file: "dist/packages/detox/index.cjs",
  //       format: "cjs",
  //     },
  //   ],
  //   external: ["detox"],
  //   plugins: [
  //     json(),
  //     resolve({ extensions: [".js", ".ts"] }),
  //     commonjs(),
  //     typescript({
  //       tsconfig: "./tsconfig.json",
  //       declaration: true,
  //       declarationDir: "dist/packages/detox",
  //       outDir: "dist/packages/detox",
  //     }),
  //   ],
  // },
];
