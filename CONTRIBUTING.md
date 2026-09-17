# Contributing

## Development Requirements

- Node.js 24 (see `.nvmrc`)
- WeChat DevTools for Mini Program compilation and interaction checks

## Required Checks

Run `npm run setup` after cloning. It creates the ignored local `project.config.json` from `project.config.example.json` without overwriting an existing AppID or settings. No third-party npm dependencies are required.

```powershell
npm run prepare:upload
```

Run the checks before each implementation commit. Keep commits focused on one completed change.

## Completion and GitHub Sync

The user requires completed work to be synchronized to GitHub after testing, in addition to timely local commits.

1. Complete the agreed changes and run `npm run prepare:upload` on the final code. Complete any applicable DevTools or real-device checks and report any checks that remain unverified.
2. Commit each tested batch promptly. Once all agreed work is complete and validated, push the commits to the corresponding branch of <https://github.com/fang121380/math-thinking-miniapp>.
3. Fetch and inspect the remote history before synchronizing, preserving existing remote work. Use a normal push; do not overwrite remote history to resolve differences.
4. Verify that the remote branch contains the local commit and check the GitHub Actions result. Fix failures and repeat the necessary checks before reporting success.
5. In the completion report, include the test results, commit IDs, remote branch link, and CI status. If commit identity, authentication, permissions, or another dependency prevents synchronization, explicitly report the blocker and do not claim GitHub is up to date.

The user has authorized this final GitHub synchronization; it does not require a separate routine permission request.

Do not commit `project.config.json`, `project.private.config.json`, a personal AppID, environment files, logs, or unreviewed external question data. Change `project.config.example.json` for shared configuration defaults.

## Question Content Rules

- Project-authored questions must be distinct in wording, arithmetic structure, options, hints, and solution text.
- External questions require an explicit compatible license, source evidence, attribution, manual curriculum mapping, and audit approval.
- Do not copy questions from commercial exercise books, paid question banks, or full examination papers.

See [docs/question-source-admission.md](docs/question-source-admission.md) for the acceptance criteria.
