// Nightshade — guards: patrols, vision cones, suspicion, chase and search.
import { TUNING, TILE } from './config.js';
import { clamp, angleLerp, dist } from './rng.js';

export const GuardState = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', CHASE: 'chase', SEARCH: 'search' };

export class Guard {
  constructor(spawn, waypoints, world) {
    this.world = world;
    const s = world.tileCenter(spawn.tx, spawn.ty);
    this.x = s.x; this.y = s.y;
    this.waypoints = waypoints.map(([tx, ty]) => world.tileCenter(tx, ty));
    this.wpIndex = 0;
    this.angle = Math.PI / 2;
    this.state = GuardState.PATROL;
    this.detection = 0; // 0..100, how sure this guard is about the player
    this.pauseTimer = 0;
    this.pauseBase = Math.PI / 2; // facing when a waypoint pause begins
    this.lookTimer = 0;
    this.target = null; // {x, y} being investigated or chased
    this.lastSeen = null;
    this.searchTimer = 0;
    this.stepPhase = Math.random() * 6;
    this.heardAt = 0;
  }

  // Can this guard currently see the player? Returns a 0..1 visibility factor.
  visibilityOf(player) {
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > TUNING.coneRange) return 0;
    if (player.hidden) return 0;
    let ang = Math.atan2(player.y - this.y, player.x - this.x) - this.angle;
    while (ang > Math.PI) ang -= Math.PI * 2;
    while (ang < -Math.PI) ang += Math.PI * 2;
    if (Math.abs(ang) > TUNING.coneHalfAngle) return 0;
    if (!this.world.hasLineOfSight(this.x, this.y, player.x, player.y)) return 0;
    const near = 1 - d / TUNING.coneRange;
    let factor = 0.35 + 0.65 * near;
    if (player.sneaking) factor *= 0.45;
    if (player.dashing) factor *= 1.6;
    return clamp(factor, 0, 1.6);
  }

  hearNoise(x, y, radius, now) {
    if (this.state === GuardState.CHASE) return;
    if (dist(this.x, this.y, x, y) > radius) return;
    if (now - this.heardAt < 1.2) return;
    this.heardAt = now;
    this.target = { x, y };
    if (this.state !== GuardState.SUSPICIOUS) {
      this.state = GuardState.SUSPICIOUS;
      this.lookTimer = 0;
    }
  }

  update(dt, player, now) {
    const vis = this.visibilityOf(player);
    if (vis > 0) {
      this.detection = clamp(this.detection + TUNING.detectBase * vis * dt, 0, 100);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.detection = clamp(this.detection - TUNING.detectDecay * dt, 0, 100);
    }

    if (this.detection >= 100 && this.state !== GuardState.CHASE) {
      this.state = GuardState.CHASE;
      this.target = { x: player.x, y: player.y };
    }
    if (this.state === GuardState.CHASE && this.detection <= 0) {
      this.state = GuardState.SEARCH;
      this.searchTimer = 3;
      this.target = this.lastSeen;
    }

    switch (this.state) {
      case GuardState.PATROL: this.stepPatrol(dt); break;
      case GuardState.SUSPICIOUS: this.stepInvestigate(dt); break;
      case GuardState.CHASE: this.stepChase(dt, player); break;
      case GuardState.SEARCH: this.stepSearch(dt); break;
    }
    this.stepPhase += dt * (this.state === GuardState.CHASE ? 11 : 7);
  }

  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x, dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step, ny = this.y + (dy / d) * step;
    const moved = this.world.moveCircle(this.x, this.y, 13, nx - this.x, ny - this.y);
    const arrived = Math.hypot(tx - moved.x, ty - moved.y) < 6;
    this.angle = angleLerp(this.angle, Math.atan2(moved.y - this.y, moved.x - this.x), 0.25);
    this.x = moved.x; this.y = moved.y;
    return arrived;
  }

  stepPatrol(dt) {
    if (this.pauseTimer > 0) {
      // Look around during the pause: one full sine sweep around the facing
      // the guard had when it stopped, so the cone returns where it started.
      this.pauseTimer -= dt;
      const elapsed = 0.9 - Math.max(0, this.pauseTimer);
      this.angle = this.pauseBase + Math.sin((elapsed / 0.9) * Math.PI * 2) * 0.15;
      return;
    }
    const wp = this.waypoints[this.wpIndex];
    if (this.moveToward(wp.x, wp.y, TUNING.guardPatrolSpeed, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = 0.9;
      this.pauseBase = this.angle;
    }
  }

  stepInvestigate(dt) {
    if (!this.target) { this.state = GuardState.PATROL; return; }
    if (this.moveToward(this.target.x, this.target.y, TUNING.guardInvestigateSpeed, dt)) {
      this.lookTimer += dt;
      this.angle += 0.9 * dt;
      if (this.lookTimer > TUNING.guardLookTime) {
        this.state = GuardState.PATROL;
        this.target = null;
        this.lookTimer = 0;
      }
    }
  }

  stepChase(dt, player) {
    // Chase the player's live position while seen, else the last seen spot.
    const goal = this.detection > 40 ? { x: player.x, y: player.y } : this.lastSeen;
    if (goal) this.moveToward(goal.x, goal.y, TUNING.guardChaseSpeed, dt);
  }

  stepSearch(dt) {
    if (this.target) {
      if (this.moveToward(this.target.x, this.target.y, TUNING.guardInvestigateSpeed, dt)) {
        this.searchTimer -= dt;
        this.angle += 1.4 * dt;
        if (this.searchTimer <= 0) {
          this.state = GuardState.PATROL;
          this.target = null;
        }
      }
    } else {
      this.state = GuardState.PATROL;
    }
  }

  get alertLevel() {
    if (this.state === GuardState.CHASE) return 2;
    if (this.state === GuardState.SUSPICIOUS || this.state === GuardState.SEARCH) return 1;
    return this.detection > 35 ? 1 : 0;
  }
}
