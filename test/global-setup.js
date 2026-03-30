// Jest global setup entry point.
// global-setup-impl.ts only uses `path`, `DataSource` (from typeorm), and process.env —
// no aliased imports — so we can compile it standalone without tsconfig-paths.
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.test') });

// Compile the TypeScript setup file on-the-fly with SWC (no hooks / no pirates).
const { transformSync } = require('@swc/core');
const tsCode = fs.readFileSync(path.resolve(__dirname, 'global-setup-impl.ts'), 'utf8');
const { code } = transformSync(tsCode, {
  jsc: { parser: { syntax: 'typescript' }, target: 'es2021' },
  module: { type: 'commonjs' },
  filename: 'global-setup-impl.ts',
});

// Evaluate the compiled JS in a temporary module
const Module = require('module');
const m = new Module(__filename);
m.paths = Module._nodeModulePaths(path.resolve(__dirname, '..'));
m._compile(code, path.resolve(__dirname, 'global-setup-impl.js'));
module.exports = m.exports.default || m.exports;
