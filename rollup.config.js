const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const json = require("@rollup/plugin-json");

module.exports = {
  input: "core/cli.ts",
  output: {
    file: "dist/cli.js",
    format: "cjs",
  },
  plugins: [
    json(),
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      module: "esnext",
    }),
  ],
  external: ["@playwright/test"],
};
