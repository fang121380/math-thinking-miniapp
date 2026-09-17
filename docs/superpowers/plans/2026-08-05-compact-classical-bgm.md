# Compact Classical BGM Implementation Plan

> **For agentic workers:** Execute this plan inline with test-first checkpoints. This workspace does not have Git available, so no commit step is included.

**Goal:** Expand optional background music from three to ten locally bundled, legal classical tracks without exceeding the 2 MiB true-device package limit.

**Architecture:** Keep all playable clips in `miniprogram/assets/audio/bgm/`, because the prior remote/subpackage approach was unreliable on real devices. Store the selected index in existing learning settings; use the existing one-button track rotation rather than adding UI controls.

**Tech Stack:** Native WeChat Mini Program CommonJS modules, Node.js test runner, MP3 assets.

## Global Constraints

- BGM is off by default and continues to use the existing toggle and single track-switch action.
- Every track is local to the main package and under 180 KiB.
- The full main package stays below the existing 1.75 MiB automated guard.
- New recordings must have a verifiable CC0 or Public Domain Mark source; source information remains in the repository.

### Task 1: Lock the contract with tests

**Files:**
- Modify: `tests/background-music.test.js`
- Modify: `tests/project-structure.test.js`
- Modify: `tests/storage.test.js`

- [x] Require the ten exact playlist identifiers, local source paths, and licenses for all new tracks.
- [x] Require the ten exact MP3 filenames, a per-file size cap, and persistence of index `9`.
- [x] Run focused tests to verify the pre-change code fails.

### Task 2: Build compact local media

**Files:**
- Create: `miniprogram/assets/audio/bgm/ode-to-joy.mp3`
- Create: `miniprogram/assets/audio/bgm/bach-cello-prelude.mp3`
- Create: `miniprogram/assets/audio/bgm/bach-prelude-c-major.mp3`
- Modify: existing three MP3 clips in `miniprogram/assets/audio/bgm/`

- [x] Download source recordings outside the Mini Program package and transcode all six clips to short mono MP3 loops with edge fades.
- [x] Inspect duration, audio stream parameters, per-file size, and total package size.

### Task 3: Wire playlist and attribution

**Files:**
- Modify: `miniprogram/utils/background-music.js`
- Modify: `miniprogram/utils/learning-settings.js`
- Modify: `miniprogram/assets/SOURCES.md`

- [x] Append three tracks to `BGM_TRACKS` with labels, local paths, and license markers.
- [x] Validate saved indices against the playlist length rather than a fixed three-track list.
- [x] Record each source work, recording, license, URL, and local clip format.

### Task 4: Verify delivery

**Files:**
- Test: `tests/*.test.js`

- [x] Run the focused BGM, storage, and package-structure tests.
- [x] Run `npm test` from the project root.
- [x] Open the project in WeChat DevTools through its local CLI. Native window automation could not read this DevTools window, so actual device listening remains a manual final check.
