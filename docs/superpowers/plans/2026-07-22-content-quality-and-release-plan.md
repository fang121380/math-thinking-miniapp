# Content Quality and Release Implementation Plan

**Goal:** Make the local question bank auditable, update-ready, and safer for release without adding remote-service dependencies.

**Architecture:** Every question receives local provenance and review metadata at the bank boundary. A lightweight content-update utility compares a configurable remote manifest with the bundled manifest and always falls back to the bundled bank. Release hardening stays in `app.js` and `sitemap.json`.

**Tech Stack:** Native WeChat Mini Program JavaScript, Node.js built-in test runner.

## Tasks

- [ ] Add failing tests for question-level review metadata and deterministic review sampling.
- [ ] Implement metadata normalization and a review-report generator with no external data upload.
- [ ] Add failing tests for content-manifest update decisions and WeChat update-manager handling.
- [ ] Implement local-first content update protocol, app update notice, share cards, and search exclusions.
- [ ] Run the full test suite, package-size measurement, and DevTools compile verification.
