// Nightshade — all canvas drawing: floor, walls, cones, entities, HUD and screens.
import { TILE, COLS, ROWS, VIEW_W, VIEW_H, HUD_H, TUNING } from './config.js';
import { T } from './world.js';
import { GuardState } from './guards.js';
import { clamp } from './rng.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.time = 0;
  }

  draw(game) {
    const ctx = this.ctx;
    this.time += 1 / 60;
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawHud(game);
    ctx.translate(0, HUD_H);
    this.drawFloor(game);
    this.drawCones(game);
    this.drawTiles(game);
    this.drawExit(game);
    this.drawShards(game);
    this.drawPlayer(game);
    this.drawGuards(game);
    this.drawBushTops(game);
    this.drawVignette(game);
    ctx.restore();
    if (game.screen !== 'play') this.drawScreen(game);
  }

  drawHud(game) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, VIEW_W, HUD_H);
    ctx.fillStyle = '#1d2742';
    ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8dcc0';
    ctx.textAlign = 'left';
    ctx.fillText(`NIGHTSHADE  ·  ${game.level.name}`, 14, HUD_H / 2 + 1);
    // shards
    const total = game.world.shards.length;
    const got = total - game.world.shardsLeft();
    const alarm = game.alarmTimer > 0;
    if (!alarm) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8fe8ff';
      ctx.fillText(`◆ ${got}/${total} moonshards`, 560, HUD_H / 2 + 1);
      // lives
      ctx.fillStyle = '#ff6b7a';
      let hearts = '';
      for (let i = 0; i < 3; i++) hearts += i < game.lives ? '♥ ' : '♡ ';
      ctx.fillText(hearts, 760, HUD_H / 2 + 1);
    }
    // detection meter
    const det = game.maxDetection();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9d2e8';
    ctx.fillText('SEEN', 860, HUD_H / 2 + 1);
    ctx.fillStyle = '#232c47';
    roundRect(ctx, 910, 12, 150, 16, 8); ctx.fill();
    const dw = 150 * clamp(det / 100, 0, 1);
    ctx.fillStyle = det >= 100 ? '#ff3b30' : det > 35 ? '#ff9f2e' : '#ffd94d';
    if (dw > 0) { roundRect(ctx, 910, 12, dw, 16, 8); ctx.fill(); }
    ctx.fillStyle = '#e8dcc0';
    ctx.textAlign = 'right';
    ctx.fillText(`⏱ ${Math.floor(game.elapsed)}s   ★ ${game.score}`, VIEW_W - 14, HUD_H / 2 + 1);
    if (game.alarmTimer > 0) {
      ctx.fillStyle = '#ff3b30';
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.fillText('⚠ ALARM — THE GARDEN IS HUNTING YOU ⚠', VIEW_W / 2, HUD_H / 2 + 1);
    }
  }

  drawFloor(game) {
    const ctx = this.ctx;
    const { world } = game;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const t = world.tileAt(tx, ty);
        const x = tx * TILE, y = ty * TILE;
        const even = (tx + ty) % 2 === 0;
        ctx.fillStyle = t === T.WALL ? '#20283f' : even ? '#141b2e' : '#121828';
        ctx.fillRect(x, y, TILE, TILE);
        if (t === T.FLOOR || t === T.BUSH) {
          ctx.fillStyle = 'rgba(140,170,255,0.045)';
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        }
      }
    }
    // faint moonlight pools
    ctx.fillStyle = 'rgba(180,200,255,0.05)';
    for (const [cx, cy, r] of [[300, 200, 130], [900, 480, 150], [620, 120, 110]]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawCones(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      const range = TUNING.coneRange;
      const half = TUNING.coneHalfAngle;
      const rays = 26;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      for (let i = 0; i <= rays; i++) {
        const a = g.angle - half + (2 * half * i) / rays;
        const d = game.world.rayDistance(g.x, g.y, a, range);
        ctx.lineTo(g.x + Math.cos(a) * d, g.y + Math.sin(a) * d);
      }
      ctx.closePath();
      const hot = g.state === GuardState.CHASE;
      const warm = g.state === GuardState.SUSPICIOUS || g.state === GuardState.SEARCH;
      ctx.fillStyle = hot ? 'rgba(255,59,48,0.30)' : warm ? 'rgba(255,159,46,0.24)' : 'rgba(255,217,77,0.16)';
      ctx.fill();
    }
  }

  drawTiles(game) {
    const ctx = this.ctx;
    const { world } = game;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const t = world.tileAt(tx, ty);
        const x = tx * TILE, y = ty * TILE;
        if (t === T.WALL) {
          ctx.fillStyle = '#2a3452';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#3a476b';
          ctx.fillRect(x, y, TILE, 5);
          ctx.fillStyle = '#171e31';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else if (t === T.HEDGE) {
          ctx.fillStyle = '#1e4d2a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#2c6b3a';
          for (let i = 0; i < 5; i++) {
            const lx = x + 6 + ((i * 7 + ty * 3) % 28), ly = y + 6 + ((i * 11 + tx * 5) % 28);
            ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#173d21';
          ctx.fillRect(x, y + TILE - 5, TILE, 5);
        } else if (t === T.CRATE) {
          ctx.fillStyle = '#6b4a26';
          ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = '#4a3016';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + TILE - 3, y + TILE - 3);
          ctx.moveTo(x + TILE - 3, y + 3); ctx.lineTo(x + 3, y + TILE - 3);
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      }
    }
  }

  drawBushTops(game) {
    const ctx = this.ctx;
    const { world } = game;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        if (world.tileAt(tx, ty) !== T.BUSH) continue;
        const x = tx * TILE, y = ty * TILE;
        ctx.fillStyle = 'rgba(28,84,44,0.85)';
        for (const [ox, oy, r] of [[10, 12, 9], [22, 8, 10], [30, 16, 9], [14, 26, 10], [28, 30, 8]]) {
          ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  drawExit(game) {
    const ctx = this.ctx;
    const c = game.world.tileCenter(game.world.exit.tx, game.world.exit.ty);
    const pulse = 0.55 + 0.25 * Math.sin(this.time * 3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#39d98a';
    ctx.beginPath(); ctx.arc(c.x, c.y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0b3d24';
    roundRect(ctx, c.x - 13, c.y - 16, 26, 32, 6); ctx.fill();
    ctx.fillStyle = '#7dffb0';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', c.x, c.y - 26);
    if (game.world.shardsLeft() > 0) {
      ctx.fillStyle = 'rgba(232,220,192,0.8)';
      ctx.font = '11px Georgia, serif';
      ctx.fillText(`${game.world.shardsLeft()} shard${game.world.shardsLeft() > 1 ? 's' : ''} left`, c.x, c.y + 30);
    }
  }

  drawShards(game) {
    const ctx = this.ctx;
    for (const s of game.world.shards) {
      if (s.taken) continue;
      const c = game.world.tileCenter(s.tx, s.ty);
      const bob = Math.sin(this.time * 2.4 + s.tx) * 3;
      const glow = 0.35 + 0.2 * Math.sin(this.time * 3 + s.ty);
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#8fe8ff';
      ctx.beginPath(); ctx.arc(c.x, c.y + bob, 20, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#c9f6ff';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#4fc3e8';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }

  drawPlayer(game) {
    const ctx = this.ctx;
    const p = game.player;
    // noise ring while walking/dashing
    if (p.noisePulse > 0) {
      ctx.save();
      ctx.globalAlpha = p.noisePulse * 0.5;
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 + (1 - p.noisePulse) * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const bob = p.moving ? Math.sin(this.time * 12) * 1.5 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    // cloak
    ctx.fillStyle = p.hidden ? '#3a2f5e' : '#4b3a75';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.quadraticCurveTo(13, -2, 11, 12);
    ctx.quadraticCurveTo(0, 16, -11, 12);
    ctx.quadraticCurveTo(-13, -2, 0, -15);
    ctx.fill();
    // hood + face
    ctx.fillStyle = '#2c2145';
    ctx.beginPath(); ctx.arc(0, -6, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e6c8';
    ctx.beginPath(); ctx.arc(Math.cos(p.facing) * 2, -6 + Math.sin(p.facing) * 2, 5, 0, Math.PI * 2); ctx.fill();
    // dagger glint
    ctx.strokeStyle = '#cfd8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(p.facing) * 10, Math.sin(p.facing) * 10 + 2);
    ctx.lineTo(Math.cos(p.facing) * 17, Math.sin(p.facing) * 17 + 2);
    ctx.stroke();
    ctx.restore();
    if (p.hidden) {
      ctx.fillStyle = '#8fe8a8';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', p.x, p.y - 24);
    } else if (p.sneaking) {
      ctx.fillStyle = 'rgba(232,220,192,0.75)';
      ctx.font = '11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('sneaking…', p.x, p.y - 24);
    }
  }

  drawGuards(game) {
    const ctx = this.ctx;
    for (const g of game.guards) {
      const bob = Math.sin(g.stepPhase) * 1.2;
      // lantern glow
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#ffcf5e';
      ctx.beginPath(); ctx.arc(g.x, g.y, 34, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(g.x, g.y + bob);
      // body: red tabard
      ctx.fillStyle = g.state === GuardState.CHASE ? '#a31212' : '#8c2f2f';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(12, -2, 10, 11);
      ctx.quadraticCurveTo(0, 15, -10, 11);
      ctx.quadraticCurveTo(-12, -2, 0, -14);
      ctx.fill();
      // brass helmet
      ctx.fillStyle = '#c9a227';
      ctx.beginPath(); ctx.arc(0, -7, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6d1a';
      ctx.fillRect(-8, -9, 16, 3);
      // spear
      ctx.strokeStyle = '#b9c4d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -14); ctx.lineTo(12, 14);
      ctx.stroke();
      ctx.restore();
      // state mark + detection arc
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px Georgia, serif';
      if (g.state === GuardState.CHASE) {
        ctx.fillStyle = '#ff3b30';
        ctx.fillText('!', g.x, g.y - 26);
      } else if (g.state === GuardState.SUSPICIOUS || g.state === GuardState.SEARCH) {
        ctx.fillStyle = '#ff9f2e';
        ctx.fillText('?', g.x, g.y - 26);
      }
      if (g.detection > 2) {
        ctx.strokeStyle = '#232c47';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(g.x, g.y - 20, 12, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
        ctx.strokeStyle = g.detection >= 100 ? '#ff3b30' : '#ffd94d';
        ctx.beginPath();
        ctx.arc(g.x, g.y - 20, 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * g.detection) / 100);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
    }
  }

  drawVignette(game) {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(2,4,12,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawScreen(game) {
    const ctx = this.ctx;
    const W = VIEW_W, H = VIEW_H + HUD_H;
    ctx.save();
    if (game.screen === 'title') {
      ctx.fillStyle = 'rgba(4,6,16,0.82)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 64px Georgia, serif';
      ctx.fillText('NIGHTSHADE', W / 2, 220);
      ctx.fillStyle = '#8fe8ff';
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('a stealth game — lift the moonshards, reach the exit, stay unseen', W / 2, 262);
      ctx.fillStyle = '#c9d2e8';
      ctx.font = '17px Georgia, serif';
      const lines = [
        'Move — WASD or arrow keys      Sneak — hold Shift (slow, silent)',
        'Dash — Space (fast, but loud: guards hear it)',
        'Hide in the bushes. Watch the yellow cones. Fill the SEEN meter and they chase.',
        'Lift every moonshard, then slip out through the green EXIT.',
        '',
        'Press ENTER or click to begin — 3 levels, 3 lives.',
      ];
      lines.forEach((l, i) => ctx.fillText(l, W / 2, 330 + i * 30));
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 20px Georgia, serif';
      if (Math.floor(this.time * 2) % 2 === 0) ctx.fillText('— press ENTER —', W / 2, 560);
    } else if (game.screen === 'paused') {
      ctx.fillStyle = 'rgba(4,6,16,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2 - 10);
      ctx.font = '18px Georgia, serif';
      ctx.fillText('Press P or Esc to keep sneaking', W / 2, H / 2 + 32);
    } else if (game.screen === 'levelclear') {
      ctx.fillStyle = 'rgba(4,6,16,0.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8fe8ff';
      ctx.font = 'bold 46px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('LEVEL CLEAR', W / 2, H / 2 - 40);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '19px Georgia, serif';
      ctx.fillText(game.clearLine || '', W / 2, H / 2 + 4);
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 18px Georgia, serif';
      if (Math.floor(this.time * 2) % 2 === 0) ctx.fillText('— press ENTER for the next level —', W / 2, H / 2 + 48);
    } else if (game.screen === 'gameover') {
      ctx.fillStyle = 'rgba(20,4,8,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff6b7a';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CAUGHT IN THE DARK', W / 2, H / 2 - 30);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '19px Georgia, serif';
      ctx.fillText(`The garden keeps its secrets.  Score ${game.score} — press ENTER to try again.`, W / 2, H / 2 + 14);
    } else if (game.screen === 'victory') {
      ctx.fillStyle = 'rgba(4,12,8,0.85)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#7dffb0';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE VAULT IS YOURS', W / 2, H / 2 - 40);
      ctx.fillStyle = '#e8dcc0';
      ctx.font = '20px Georgia, serif';
      ctx.fillText(`Every moonshard lifted, never once dragged into the light.`, W / 2, H / 2 + 2);
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText(`Final score ${game.score}  ·  press ENTER to play again`, W / 2, H / 2 + 44);
    }
    ctx.restore();
  }
}
