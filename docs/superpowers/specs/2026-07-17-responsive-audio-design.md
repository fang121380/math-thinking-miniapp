# Responsive Audio Design

## Goal

Replace delayed one-shot sound feedback with preloaded, crisp original audio and add an optional low-volume pixel-inspired background track.

## Audio Feedback

The feedback helper preloads two local audio contexts per sound role at page entry. Playback reuses a prepared context and rewinds it before playing, avoiding context creation and source decoding on the tap path. Sound roles remain tap, move, correct, wrong, complete, and streak. Each clip uses a distinct original envelope and pitch pattern.

## Background Music

Background music is an original loop with a bright 8-bit-inspired rhythm; it does not copy another game's melody or recording. It is disabled by default and has an independent persisted setting named `bgmEnabled`. It plays at low volume on Home, Games, Game, Growth, Mine, and Practice. It pauses on Question, Test, Analysis, and Result.

## Mixing

Feedback is the foreground sound. While a feedback clip plays, background music ducks to a low volume for 250 milliseconds and then returns to its base volume. Repeated feedback restarts the duck interval without stacking volume changes. Disabling BGM pauses and releases the track; disabling feedback sound does not change the BGM setting.

## Controls And Failure Handling

Mine shows separate switches for answer sounds and background music. Answer sounds start enabled for a fresh learner; BGM starts disabled. Missing audio contexts and asynchronous audio errors never block learning and display the existing child-friendly audio recovery message once.

## Tests

Tests cover preloading, pool reuse, rapid feedback without cancellation, muted feedback, BGM default and persistence, BGM start/pause, duck/recover behavior, page-level BGM routing, and existence of every bundled asset.
