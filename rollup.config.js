const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");
const dts = require("rollup-plugin-dts").default;
const glob = require("fast-glob");

module.exports = [
  // config 폴더 빌드 (ESM + CJS)
  {
    input: glob.sync("config/**/*.ts"),
    output: [
      {
        dir: "dist/config",
        format: "esm",
        preserveModules: true,
        entryFileNames: "[name].js",
      },
      {
        dir: "dist/config",
        format: "cjs",
        preserveModules: true,
        entryFileNames: "[name].cjs",
      },
    ],
    external: ["fs", "path", "util", "url"],
    inlineDynamicImports: true,
    plugins: [
      json(),
      typescript({ tsconfig: "./tsconfig.json", declaration: false }),
      resolve({ preferBuiltins: true, extensions: [".js", ".ts", ".json"] }),
      commonjs(),
    ],
  },

  // core 폴더 빌드 (ESM + CJS)
  {
    input: glob.sync("core/**/*.ts"),
    output: [
      {
        dir: "dist/core",
        format: "esm",
        preserveModules: true,
        entryFileNames: "[name].js",
      },
      {
        dir: "dist/core",
        format: "cjs",
        preserveModules: true,
        entryFileNames: "[name].cjs",
      },
    ],
    external: ["fs", "path", "child_process", "util", "url"],
    inlineDynamicImports: true,
    plugins: [
      json(),
      typescript({ tsconfig: "./tsconfig.json", declaration: false }),
      resolve({ preferBuiltins: true, extensions: [".js", ".ts", ".json"] }),
      commonjs(),
    ],
  },

  // packages 폴더 빌드 (ESM + CJS)
  {
    input: glob.sync("packages/playwright/**/*.ts"),
    output: [
      {
        dir: "dist/packages/playwright",
        format: "esm",
        preserveModules: true,
        entryFileNames: "[name].js",
      },
      {
        dir: "dist/packages/playwright",
        format: "cjs",
        preserveModules: true,
        entryFileNames: "[name].cjs",
      },
    ],
    external: [
      "@playwright/test",
      "fs-extra",
      "fs",
      "path",
      "util",
      "url",
      "child_process",
    ],
    inlineDynamicImports: true,
    plugins: [
      json(),
      typescript({ tsconfig: "./tsconfig.json", declaration: false }),
      resolve({ preferBuiltins: true, extensions: [".js", ".ts", ".json"] }),
      commonjs(),
    ],
  },
  {
    input: glob.sync("packages/socketio/**/*.ts"),
    output: [
      {
        dir: "dist/packages/socketio",
        format: "esm",
        preserveModules: true,
        entryFileNames: "[name].js",
      },
      {
        dir: "dist/packages/socketio",
        format: "cjs",
        preserveModules: true,
        entryFileNames: "[name].cjs",
      },
    ],
    external: [
      "socket.io",
      "fs",
    ],
    inlineDynamicImports: true,
    plugins: [
      json(),
      typescript({ tsconfig: "./tsconfig.json", declaration: false }),
      resolve({ preferBuiltins: true, extensions: [".js", ".ts", ".json"] }),
      commonjs(),
    ],
  },

  // 타입 정의: config
  {
    input: "config/index.ts",
    output: { file: "dist/config/index.d.ts", format: "esm" },
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: ".",
        },
      }),
    ],
  },

  // 타입 정의: packages
  {
    input: "packages/playwright/index.ts",
    output: { file: "dist/packages/playwright/index.d.ts", format: "esm" },
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: ".",
        },
      }),
    ],
  },
  {
    input: "packages/socketio/index.ts",
    output: { file: "dist/packages/socketio/index.d.ts", format: "esm" },
    plugins: [
      dts({
        compilerOptions: {
          baseUrl: ".",
        },
      }),
    ],
  },
];
