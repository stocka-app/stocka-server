const conventionalChangelog = require('conventional-changelog');
const fs = require('fs');

const releaseItConfig = require('../.release-it.js');
const { writerOpts } = releaseItConfig.plugins['@release-it/conventional-changelog'];

const header = `# Stocka — Changelog\n\nAll notable changes to this project are documented here.\n\n`;

let content = '';

conventionalChangelog(
  { preset: 'conventionalcommits', releaseCount: 0 },
  {},
  {},
  {},
  writerOpts
)
.on('data', chunk => { content += chunk.toString(); })
.on('end', () => {
  fs.writeFileSync('CHANGELOG.md', header + content);
  console.log('Done — CHANGELOG.md regenerated');
})
.on('error', err => { console.error(err); process.exit(1); });
