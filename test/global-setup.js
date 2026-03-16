// Jest global setup entry point — handles TypeScript transformation + path alias resolution
// before loading the actual TypeScript implementation.
//
// Why a .js wrapper?
// Jest's globalSetup runs outside the worker transform pipeline (moduleNameMapper does NOT apply).
// We register ts-node + tsconfig-paths here so that all aliased imports in global-setup-impl.ts
// (@authentication/*, @user/*, @shared/*, etc.) resolve correctly at runtime.
const path = require('path');

require('ts-node').register({
  project: path.resolve(__dirname, '..', 'tsconfig.json'),
  transpileOnly: true,
});

const { register } = require('tsconfig-paths');
register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: require('../tsconfig.json').compilerOptions.paths,
});

module.exports = require('./global-setup-impl.ts');
