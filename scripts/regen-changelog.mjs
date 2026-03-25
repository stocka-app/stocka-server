import { createRequire } from 'module';
import { createWriteStream } from 'fs';
import { ConventionalChangelog } from 'conventional-changelog';

const require = createRequire(import.meta.url);
const releaseItConfig = require('../.release-it.js');
const pluginConfig = releaseItConfig.plugins['@release-it/conventional-changelog'];

// Extend writerOpts to also filter chore(release) commits
const originalTransform = pluginConfig.writerOpts.transform;
const writerOpts = {
  ...pluginConfig.writerOpts,
  transform: (commit, context) => {
    // Skip internal release commits
    if (commit.type === 'chore' && commit.scope === 'release') return null;
    return originalTransform ? originalTransform(commit, context) : commit;
  },
};

const header = `# Stocka — Changelog\n\nAll notable changes to this project are documented here.\n\n`;

const generator = new ConventionalChangelog(process.cwd());
generator.loadPreset('conventionalcommits');
generator.options({ releaseCount: 0, outputUnreleased: false });
generator.writer(writerOpts);

try {
  await generator.gitClient.getConfig('remote.origin.url');
  generator.readRepository();
} catch {}

// Collect output and strip any empty release sections (e.g. unreleased placeholder)
const chunks = [];
const stream = generator.writeStream();
for await (const chunk of stream) {
  chunks.push(chunk.toString());
}

let content = chunks.join('');
// Remove empty release headers: "## [](url) (date)\n\n## "
content = content.replace(/^## \[\]\([^)]*\) \([^)]+\)\n\n/m, '');

const out = createWriteStream('CHANGELOG.md');
out.write(header);
out.write(content);
out.end();

await new Promise((resolve, reject) => {
  out.on('finish', resolve);
  out.on('error', reject);
});

console.log('Done — CHANGELOG.md regenerated');
