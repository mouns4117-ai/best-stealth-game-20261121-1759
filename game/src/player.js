// Nightshade — the player: movement, sneak, dash, noise and hiding.
import { TUNING, TILE } from './config.js';
import { clamp, dist } from './rng.js';

export class Player {
  constructor(world) {
    const s = world.tileCenter(world.playerStart.tx, world.playerStart.ty);
    this.world = world;
    this.x = s.x; this.y = s.y;
    this.r = 13;
    this.vx = 0; this.vy = 0;
    this.facing = 0;
    this.sneaking = false;
    this.dashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.hidden = false;
    this.moving = false;
    this.stepTimer = 0;
    this.noisePulse = 0; // grows when walking, read by the game to alert guards
  }

  reset() {
    const s = this.world.tileCenter(this.world.playerStart.tx, this.world.playerStart.ty);
    this.x = s.x; this.y = s.y;
    this.sneaking = false; this.dashing = false;
    this.dashTimer = 0; this.dashCooldown = 0; this.hidden = false;
  }

  update(dt, input, now, onNoise) {
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    this.moving = len > 0;
    if (len > 0) { mx /= len; my /= len; this.facing = Math.atan2(my, mx); }

    this.sneaking = !!input.sneak && !this.dashing;
    if (input.dash && this.dashCooldown <= 0 && len > 0) {
      this.dashing = true;
      this.dashTimer = TUNING.dashTime;
      this.dashCooldown = TUNING.dashCooldown;
      onNoise(this.x, this.y, TUNING.noiseDash, now);
    }
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    let speed = this.sneaking ? TUNING.sneakSpeed : TUNING.walkSpeed;
    if (this.dashing) {
      speed = TUNING.dashSpeed;
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.dashing = false;
    }
    const moved = this.world.moveCircle(this.x, this.y, this.r, mx * speed * dt, my * speed * dt);
    this.x = moved.x; this.y = moved.y;

    // Bushes hide you; walking makes noise guards can hear.
    const tx = Math.floor(this.x / TILE), ty = Math.floor(this.y / TILE);
    this.hidden = this.world.isBush(tx, ty);
    if (this.moving && !this.sneaking && !this.dashing) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.42;
        this.noisePulse = 1;
        onNoise(this.x, this.y, TUNING.noiseWalk, now);
      }
    }
    this.noisePulse = Math.max(0, this.noisePulse - dt * 2.4);
  }

  tryPickup() {
    for (const shard of this.world.shards) {
      if (shard.taken) continue;
      const c = this.world.tileCenter(shard.tx, shard.ty);
      if (dist(this.x, this.y, c.x, c.y) < 30) {
        shard.taken = true;
        return shard;
      }
    }
    return null;
  }

  atExit() {
    const c = this.world.tileCenter(this.world.exit.tx, this.world.exit.ty);
    return dist(this.x, this.y, c.x, c.y) < 34;
  }
}
