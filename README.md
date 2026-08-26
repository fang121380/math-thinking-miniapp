# Math Thinking Mini Program

A WeChat Mini Program for primary-school mathematics practice and mathematical thinking. It includes adaptive practice, diagnostic activities, learning journeys, progress tracking, and interactive thinking games.

## Features

- Grade and curriculum-aware learning scope
- Diagnostic and adaptive practice flows
- Daily practice, mistake review, and learning milestones
- Interactive math-thinking games with local progress storage
- Automated content-audit and source-admission gates

## Run Locally

1. Open the repository in WeChat DevTools.
2. Import the project from the repository root. `project.config.json` points WeChat DevTools to `miniprogram/`.
3. Replace `touristappid` with an AppID that belongs to your own Mini Program.
4. Click Compile in WeChat DevTools.

No backend service or environment variable is required.

## Verification

Use Node.js 18 or newer:

```powershell
npm test
npm run audit:questions
```

`npm run prepare:upload` runs both checks. It is the required gate before packaging or distributing a new question bank.

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
