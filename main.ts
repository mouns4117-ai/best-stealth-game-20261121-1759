// Nightshade — hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ into /output and writes
// /output/dossier.json with the kit's vendored buildDossier library.
// The grader runs this program twice; both runs must write identical bytes,
// so every step below is deterministic: fixed copy order, no timestamps,
// no randomness. The output directory is a mounted directory in the
// grader, so it is never removed itself — only its contents are emptied.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty the output directory's contents without removing the directory itself.
function emptyContents(dir) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function countEntries(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

function totalBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    total += entry.isDirectory() ? totalBytes(p) : statSync(p).size;
  }
  return total;
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

emptyContents(outDir);
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's RULES.txt): refuse locally anything
// the scorer would refuse — more than 4 screenshots or one over 256 KiB,
// more than 993 files in game/ or 48 MiB of game files in all, or a path
// under game/ over 1000 bytes. game/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json.
const shotFiles = readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}
for (const name of shotFiles) {
  const size = statSync(join(outDir, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
if (countEntries(join(outDir, 'game')) > 993) throw new Error('game/ holds more than 993 entries');
if (totalBytes(join(outDir, 'game')) > 50331648) throw new Error('game/ is over the 48 MiB cap');

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Nightshade handed in: ${shotFiles.length} screenshots, dossier written to ${join(outDir, 'dossier.json')}`);
