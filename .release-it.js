'use strict';

const JIRA_BASE_URL = 'https://austins-industries.atlassian.net/browse';

const TYPE_SECTIONS = {
  feat:     '✨ Features',
  fix:      '🐛 Bug Fixes',
  perf:     '⚡ Performance',
  refactor: '🔧 Refactoring',
  revert:   '⏪ Reverts',
  security: '🔒 Security',
  docs:     '📚 Documentation',
  chore:    '🧹 Chores',
  test:     '✅ Tests',
  style:    '🎨 Styles',
  ci:       '👷 CI',
  build:    '🏗️ Build System',
};

const HIDDEN_TYPES = new Set(['other']);

const SECTION_ORDER = Object.values(TYPE_SECTIONS);

module.exports = {
  git: {
    commit: true,
    tag: true,
    push: false,
    commitMessage: 'chore(release): [skip ci] ${version}',
    tagName: 'v${version}',
    requireBranch: 'main',
    requireCleanWorkingDir: false,
  },
  npm: {
    publish: false,
  },
  hooks: {
    // En modo manual (npm run release), pausa para que puedas agregar tus notas antes del commit.
    // En modo auto (post-merge hook), RELEASE_IT_AUTO=1 salta la pausa.
    'after:bump': 'if [ -z "$RELEASE_IT_AUTO" ]; then echo "\n📝  CHANGELOG.md updated — add your notes, then press Enter to commit..." && read; fi',
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'conventionalcommits',
      infile: 'CHANGELOG.md',
      header: '# Stocka — Changelog\n\nAll notable changes to this project are documented here.\n',
      writerOpts: {
        // groupBy:'type' is the default — renaming type in transform changes the section heading
        commitGroupsSort: (a, b) => {
          const ai = SECTION_ORDER.indexOf(a.title);
          const bi = SECTION_ORDER.indexOf(b.title);
          if (ai === -1 && bi === -1) return a.title.localeCompare(b.title);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        },
        transform: (commit) => {
          // Hide non-user-facing types
          if (HIDDEN_TYPES.has(commit.type)) return null;

          const enriched = Object.assign({}, commit);

          // Rename type → emoji section heading (used by groupBy:'type')
          enriched.type = TYPE_SECTIONS[enriched.type] ?? enriched.type;

          // Convert "[STOC-254] | Sprint 1 | description" → "[STOC-254](jira-url) — description"
          const jiraPattern = /^\[STOC-(\d+)\]\s*\|\s*Sprint \d+\s*\|\s*(.*)/;
          const match = enriched.subject && enriched.subject.match(jiraPattern);
          if (match) {
            const ticketNum = `STOC-${match[1]}`;
            const description = match[2].trim();
            enriched.subject = `[${ticketNum}](${JIRA_BASE_URL}/${ticketNum}) — ${description}`;
          }

          if (enriched.hash) {
            enriched.shortHash = enriched.hash.substring(0, 7);
          }

          return enriched;
        },
      },
    },
  },
};
