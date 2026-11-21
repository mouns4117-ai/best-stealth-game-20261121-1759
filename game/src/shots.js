// Nightshade — deterministic staged states for the maker's screenshots.
// ?shot=start  title screen over level 1
// ?shot=play   mid-level: player sneaking behind a crate, guard cone sweeping, 2 shards in
// ?shot=alert  guard in full chase, SEEN meter red, player diving for a bush
// ?shot=end    victory screen after the last level
import { TUNING } from './config.js';
import { GuardState } from './guards.js';

function placePlayer(game, tx, ty, facing) {
  const c = game.world.tileCenter(tx, ty);
  game.player.x = c.x; game.player.y = c.y;
  game.player.facing = facing;
  game.player.sneaking = false;
  game.player.dashing = false;
}

function placeGuard(game, i, tx, ty, angle, state, detection) {
  const g = game.guards[i];
  if (!g) return;
  const c = game.world.tileCenter(tx, ty);
  g.x = c.x; g.y = c.y;
  g.angle = angle;
  g.state = state;
  g.detection = detection;
  g.target = null;
}

export function stageShot(game, name) {
  const lvl = game.levelIndex;
  if (name === 'start') {
    game.screen = 'title';
    placePlayer(game, 3, 2, 0);
    placeGuard(game, 0, 24, 2, Math.PI, GuardState.PATROL, 0);
    placeGuard(game, 1, 24, 9, Math.PI / 2, GuardState.PATROL, 0);
  } else if (name === 'play') {
    game.screen = 'play';
    game.loadLevel(1);
    placePlayer(game, 10, 5, 0.3);
    game.player.sneaking = true;
    game.world.shards[0].taken = true;
    game.world.shards[1].taken = true;
    game.score = 1000;
    placeGuard(game, 0, 20, 6, Math.PI * 0.75, GuardState.PATROL, 55);
    placeGuard(game, 1, 20, 12, -Math.PI / 2, GuardState.SUSPICIOUS, 20);
    game.guards[1].target = { x: 420, y: 260 };
  } else if (name === 'alert') {
    game.screen = 'play';
    game.loadLevel(0);
    game.alarmTimer = TUNING.alarmSeconds - 2;
    placePlayer(game, 8, 8, Math.PI);
    game.player.dashing = true;
    game.score = 500;
    placeGuard(game, 0, 10, 8, Math.PI, GuardState.CHASE, 100);
    game.guards[0].lastSeen = { x: game.player.x, y: game.player.y };
    placeGuard(game, 1, 18, 9, Math.PI, GuardState.SUSPICIOUS, 70);
  } else if (name === 'end') {
    game.loadLevel(2);
    game.score = 7420;
    game.lives = 2;
    game.elapsed = 187;
    game.screen = 'victory';
    placePlayer(game, 28, 17, -Math.PI / 2);
    game.world.shards.forEach((s) => { s.taken = true; });
  }
  game.renderer.time = 1.2; // fixed light so every render of a shot matches
  game.renderer.draw(game);
  game.renderer.draw(game);
}
