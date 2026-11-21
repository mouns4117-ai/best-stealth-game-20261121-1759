# Nightshade — Make the best stealth game

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mouns4117-ai/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mouns4117-ai/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An original top-down stealth game that plays offline in a desktop browser from its own files — an entry for the [make.fun bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

You are Nightshade, a thief in a walled night garden. Lift every moonshard, then slip out through the green exit — without ever being dragged into the light.

## How it plays

- **Move** — WASD or arrow keys. **Sneak** — hold Shift (slow, silent, harder to spot). **Dash** — Space (fast, but loud: every guard in earshot comes to look). **Pause** — P or Esc. **Mute** — M.
- **Guards patrol** fixed routes with sweeping yellow vision cones. Their cones are real: walls, hedges and crates block sight, and a guard only sees you inside the cone with a clear line of sight.
- **Detection** — the SEEN meter in the HUD fills while a guard has eyes on you (faster up close, slower while you sneak, frozen while you hide in a bush). Fill it and the guard gives chase, the alarm sounds, and every guard converges on you. Break line of sight and the meter drains; lose them and they search, then go back to patrol.
- **Noise** — walking footsteps carry a short way; a dash rings out across the garden. Guards investigate sounds, then look around and return to their route.
- **Cover** — bushes hide you completely while you stand in them. Hedges and crates block sight and movement. Learn the patrols, wait for the cone to pass, and move between cover.
- **Objectives** — lift every moonshard in the level, then reach the EXIT. Three levels (The Garden Gate, The Marble Hall, The Moonshard Vault), three lives, a score for shards, speed, and a ghost bonus if no guard ever chases you.

## Files

- `game/index.html` — the page; loads `game/src/main.js` as a module.
- `game/src/config.js` — level maps, tuning constants, patrol routes.
- `game/src/world.js` — the tile grid, movement collision, line of sight, cone raycasts.
- `game/src/guards.js` — guard patrols, vision, suspicion, chase and search.
- `game/src/player.js` — movement, sneak, dash, noise, hiding, pickups.
- `game/src/render.js` — all canvas drawing: floor, cones, tiles, entities, HUD, screens.
- `game/src/audio.js` — procedural WebAudio sounds (footsteps, pickup, alarm, win).
- `game/src/shots.js` — deterministic staged states for the maker's screenshots.
- `game/src/rng.js` — small deterministic random helpers.
- `main.ts` — the hand-in program (Node 22, stdlib only): copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's vendored `vendor/makefun-game.ts`.
- `screenshots/` — four real renders of the game's own code in a browser.

## Play it locally

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Or open `game/index.html` through any static file server. No build step, no network requests: every script, image and sound is a file under `game/` or a `data:` URI.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json`. It is deterministic — two runs write identical bytes — and it never removes the output directory itself, only its contents.

## License

MIT — see `LICENSE`. All art, sound, names and levels are original, drawn and written for this entry.
