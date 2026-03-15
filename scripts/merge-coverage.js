#!/usr/bin/env node
/**
 * Merges unit (jest --coverage) and e2e (jest --config jest-e2e.js --coverage) reports
 * into a single combined report under coverage-report/.
 *
 * Usage:
 *   node scripts/merge-coverage.js
 *
 * Prerequisites (run first):
 *   npm run test:cov             → writes coverage/coverage-final.json
 *   npm run test:e2e:cov         → writes coverage-e2e/coverage-final.json
 *
 * Or just run:
 *   npm run test:cov:all         → runs both + merge in sequence
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NYC_TMP = path.join(ROOT, '.nyc_output');
const UNIT_JSON = path.join(ROOT, 'coverage', 'coverage-final.json');
const E2E_JSON = path.join(ROOT, 'coverage-e2e', 'coverage-final.json');
const REPORT_DIR = path.join(ROOT, 'coverage-report');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
}

fs.mkdirSync(NYC_TMP, { recursive: true });
fs.mkdirSync(REPORT_DIR, { recursive: true });

let copied = 0;

if (fs.existsSync(UNIT_JSON)) {
  fs.copyFileSync(UNIT_JSON, path.join(NYC_TMP, 'unit.json'));
  copied++;
  console.log('✅  unit coverage loaded');
} else {
  console.warn('⚠️   coverage/coverage-final.json not found — run npm run test:cov first');
}

if (fs.existsSync(E2E_JSON)) {
  fs.copyFileSync(E2E_JSON, path.join(NYC_TMP, 'e2e.json'));
  copied++;
  console.log('✅  e2e coverage loaded');
} else {
  console.warn('⚠️   coverage-e2e/coverage-final.json not found — run npm run test:e2e:cov first');
}

if (copied === 0) {
  console.error('❌  No coverage files found. Run tests with --coverage first.');
  process.exit(1);
}

const mergedJson = path.join(REPORT_DIR, 'coverage-final.json');
run(`npx nyc merge .nyc_output ${mergedJson}`);
console.log('✅  merged into coverage-report/coverage-final.json');

run(
  `npx nyc report --reporter=text --reporter=lcov --reporter=html --temp-dir coverage-report --report-dir coverage-report`,
);

console.log('\n📊  Combined report: coverage-report/index.html');
