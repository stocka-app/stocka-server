#!/usr/bin/env node
/**
 * check-env.js — Validates the development environment before running tests.
 *
 * Checks:
 *  1. Critical test dependencies are installed (@swc/jest, @swc/core)
 *  2. Node version meets minimum requirement
 *
 * Run: node scripts/check-env.js
 * Auto-run: configured as "pretest:e2e" and "pretest:e2e:cov" in package.json
 */

'use strict';

const REQUIRED_MODULES = ['@swc/jest', '@swc/core'];
const MIN_NODE_MAJOR = 20;

let ok = true;

// Check Node version
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < MIN_NODE_MAJOR) {
  console.error(`✗ Node v${process.versions.node} — requires >= v${MIN_NODE_MAJOR}`);
  ok = false;
} else {
  console.log(`✓ Node v${process.versions.node}`);
}

// Check required modules
for (const mod of REQUIRED_MODULES) {
  try {
    require.resolve(mod);
    console.log(`✓ ${mod} installed`);
  } catch {
    console.error(`✗ ${mod} NOT installed — run: npm install`);
    ok = false;
  }
}

if (!ok) {
  console.error('\nEnvironment check failed. Fix the issues above before running tests.');
  process.exit(1);
}
console.log('\nEnvironment OK.\n');
