# Math Thinking Mini Program

A WeChat Mini Program for primary and junior-school mathematics practice and mathematical thinking. It includes adaptive practice, diagnostic activities, learning journeys, progress tracking, and interactive thinking games.

## Features

- Grade and curriculum-aware learning scope
- Diagnostic and adaptive practice flows
- Daily practice, mistake review, and learning milestones
- Interactive math-thinking games with local progress storage
- Automated content-audit and source-admission gates

## Run Locally

1. Use Node.js 24 (`nvm use` if you use nvm), then run `npm run setup`. No npm dependency installation is needed.
2. Import the project from the repository root in WeChat DevTools. The generated `project.config.json` points to `miniprogram/`.
3. For authenticated preview and upload, replace `touristappid` in the local configuration with your own Mini Program AppID. Local configuration is ignored by Git; commit shared configuration changes to `project.config.example.json`.
4. Click Compile in WeChat DevTools.

No backend service or environment variable is required.

Setup preserves any existing local configuration, including its AppID. Source files, tests, scripts, and the CI workflow are maintained directly in Git. See [the local environment guide](docs/development-environment.md) for the installed tools and [the improvement plan](docs/improvement-plan.md) for current work.

## Verification

The local development and CI baseline is Node.js 24, selected in `.nvmrc`. Run `npm run setup` once after a fresh checkout, then:

```powershell
npm test
npm run audit:questions
```

`npm run prepare:upload` runs both checks. It is the required gate before packaging or distributing a new question bank.

The Verify workflow runs the same command on pushes and pull requests once these sources are pushed to a GitHub repository.

## Project Structure

```text
miniprogram/  Mini Program pages, assets, and learning engines
scripts/      Question-bank audit and licensed-source import tools
tests/        Node.js unit, contract, and content-quality tests
docs/         Curriculum, source-admission, and QA documentation
```

## Content Policy

The included question bank is project-authored and generated from curriculum structures; it does not reproduce commercial exercise books or full exam papers. External questions may only enter the review workflow when they carry an explicit compatible license and a textbook mapping. See [docs/question-source-admission.md](docs/question-source-admission.md).

The repository intentionally excludes unreviewed external-source candidates, local private Mini Program configuration, source-audio working files, and diagnostic logs.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Changes to question content must pass the source-admission and audit rules before they can be merged.

## License

The source code is available under the [MIT License](LICENSE). Refer to `miniprogram/assets/SOURCES.md` for the licenses of bundled media.
