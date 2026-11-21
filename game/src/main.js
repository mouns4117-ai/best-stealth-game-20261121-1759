// Nightshade — game loop, input, levels, scoring and screens.
import { LEVELS, TUNING, CANVAS_W, CANVAS_H, HUD_H } from './config.js';
import { World } from './world.js';
import { Guard, GuardState } from './guards.js';
import { Player } from './player.js';
import { Renderer } from './render.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';
import { clamp } from './rng.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.sounds = new SoundBank();
    this.input = { up: false, down: false, left: false, right: false, sneak: false, dash: false };
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.screen = 'title';
    this.lives = 3;
    this.score = 0;
    this.elapsed = 0;
    this.alarmTimer = 0;
    this.ghost = true; // never chased so far
    this.clearLine = '';
    this.lastTime = 0;
    this.footstepTimer = 0;
    this.loadLevel(0);
    this.bindInput();
  }

  loadLevel(i) {
    this.levelIndex = i;
    this.level = LEVELS[i];
    this.world = new World(this.level);
    this.player = new Player(this.world);
    this.guards = this.level.patrols.map((wps, k) => {
      const spawn = this.world.guardSpawns[String(k + 1)] || { tx: 28, ty: 2 };
      return new Guard(spawn, wps, this.world);
    });
    this.alarmTimer = 0;
    this.elapsed = 0;
  }

  maxDetection() {
    return Math.max(0, ...this.guards.map((g) => g.detection));
  }

  bindInput() {
    const keymap = {
      ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
      ShiftLeft: 'sneak', ShiftRight: 'sneak',
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { this.input.dash = true; e.preventDefault(); return; }
      if (e.code === 'Enter') { this.confirm(); return; }
      if (e.code === 'KeyP' || e.code === 'Escape') { this.togglePause(); return; }
      if (e.code === 'KeyM') { this.sounds.muted = !this.sounds.muted; return; }
      const k = keymap[e.code];
      if (k) { this.input[k] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') { this.input.dash = false; return; }
      const k = keymap[e.code];
      if (k) this.input[k] = false;
    });
    this.canvas.addEventListener('click', () => {
      this.sounds.unlock();
      if (this.screen !== 'play') this.confirm();
    });
  }

  confirm() {
    this.sounds.unlock();
    this.sounds.click();
    if (this.screen === 'title') { this.startRun(); return; }
    if (this.screen === 'levelclear') { this.nextLevel(); return; }
    if (this.screen === 'gameover' || this.screen === 'victory') { this.startRun(); return; }
  }

  togglePause() {
    if (this.screen === 'play') this.screen = 'paused';
    else if (this.screen === 'paused') this.screen = 'play';
  }

  startRun() {
    this.lives = 3;
    this.score = 0;
    this.ghost = true;
    this.loadLevel(0);
    this.screen = 'play';
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) { this.screen = 'victory'; return; }
    this.loadLevel(this.levelIndex + 1);
    this.screen = 'play';
  }

  onNoise(x, y, radius, now) {
    for (const g of this.guards) g.hearNoise(x, y, radius, now);
  }

  update(dt) {
    if (this.screen !== 'play') return;
    const now = this.elapsed;
    this.elapsed += dt;
    this.alarmTimer = Math.max(0, this.alarmTimer - dt);

    this.player.update(dt, this.input, now, (x, y, r, t) => this.onNoise(x, y, r, t));
    if (this.player.moving && !this.player.sneaking) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.42;
        this.sounds.footstep(false);
      }
    }

    let anyChase = false;
    for (const g of this.guards) {
      const wasChase = g.state === GuardState.CHASE;
      g.update(dt, this.player, now);
      if (g.state === GuardState.CHASE) {
        anyChase = true;
        if (!wasChase) {
          this.ghost = false;
          this.alarmTimer = TUNING.alarmSeconds;
          this.sounds.alarm();
        }
        if (Math.hypot(g.x - this.player.x, g.y - this.player.y) < TUNING.catchDistance) {
          this.caught();
          return;
        }
      }
    }
    if (anyChase && this.alarmTimer <= 0) this.alarmTimer = TUNING.alarmSeconds;

    const shard = this.player.tryPickup();
    if (shard) {
      this.score += 500;
      this.sounds.pickup();
    }
    if (this.world.shardsLeft() === 0 && this.player.atExit()) {
      this.levelClear();
    }
  }

  caught() {
    this.sounds.caught();
    this.lives -= 1;
    if (this.lives <= 0) {
      this.screen = 'gameover';
      return;
    }
    this.loadLevel(this.levelIndex);
    this.screen = 'play';
  }

  levelClear() {
    const timeBonus = Math.max(0, 600 - Math.floor(this.elapsed)) * 5;
    const ghostBonus = this.ghost ? 1500 : 0;
    this.score += 1000 + timeBonus + ghostBonus;
    this.clearLine = `Shards lifted · time bonus ${timeBonus} · ${this.ghost ? 'ghost bonus 1500 — never seen' : 'spotted along the way'} · score ${this.score}`;
    this.sounds.win();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = 'victory';
    } else {
      this.screen = 'levelclear';
    }
  }

  frame(t) {
    const dt = clamp((t - this.lastTime) / 1000, 0, 0.05);
    this.lastTime = t;
    this.update(dt);
    this.renderer.draw(this);
    requestAnimationFrame((nt) => this.frame(nt));
  }

  start() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      const footer = document.querySelector('p');
      if (footer) footer.style.display = 'none';
      stageShot(this, shot);
      return;
    }
    requestAnimationFrame((t) => {
      this.lastTime = t;
      this.frame(t);
    });
  }
}

const canvas = document.getElementById('game');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
const game = new Game(canvas);
window.__nightshade = game; // test hook: lets a play-test drive and inspect the game
game.start();
