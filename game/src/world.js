// Nightshade — the level grid: parsing, tiles, movement and sight blocking.
import { TILE, COLS, ROWS } from './config.js';

export const T = { WALL: '#', HEDGE: 'H', CRATE: 'C', BUSH: 'B', FLOOR: '.', SHARD: 'o', EXIT: 'E' };

export class World {
  constructor(level) {
    const rows = level.map;
    if (rows.length !== ROWS) throw new Error(`map has ${rows.length} rows, expected ${ROWS}`);
    this.grid = [];
    this.shards = [];
    this.exit = null;
    this.playerStart = null;
    this.guardSpawns = {};
    for (let y = 0; y < ROWS; y++) {
      if (rows[y].length !== COLS) throw new Error(`map row ${y} has ${rows[y].length} chars, expected ${COLS}`);
      const row = [];
      for (let x = 0; x < COLS; x++) {
        const c = rows[y][x];
        if (c === 'o') { this.shards.push({ tx: x, ty: y, taken: false }); row.push(T.FLOOR); }
        else if (c === 'E') { this.exit = { tx: x, ty: y }; row.push(T.FLOOR); }
        else if (c === 'P') { this.playerStart = { tx: x, ty: y }; row.push(T.FLOOR); }
        else if (c >= '1' && c <= '9') { this.guardSpawns[c] = { tx: x, ty: y }; row.push(T.FLOOR); }
        else row.push(c);
      }
      this.grid.push(row);
    }
    if (!this.playerStart) throw new Error('map has no player start');
    if (!this.exit) throw new Error('map has no exit');
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return T.WALL;
    return this.grid[ty][tx];
  }

  blocksMove(tx, ty) {
    const t = this.tileAt(tx, ty);
    return t === T.WALL || t === T.HEDGE || t === T.CRATE;
  }

  blocksSight(tx, ty) {
    const t = this.tileAt(tx, ty);
    return t === T.WALL || t === T.HEDGE || t === T.CRATE;
  }

  isBush(tx, ty) {
    return this.tileAt(tx, ty) === T.BUSH;
  }

  // Circle (in px) against solid tiles: slide along each axis.
  moveCircle(x, y, r, dx, dy) {
    let nx = x + dx;
    const top = Math.floor((y - r) / TILE), bottom = Math.floor((y + r) / TILE);
    const left = Math.floor((nx - r) / TILE), right = Math.floor((nx + r) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (this.blocksMove(tx, ty)) {
          const bx = tx * TILE, by = ty * TILE;
          if (nx + r > bx && nx - r < bx + TILE && y + r > by && y - r < by + TILE) {
            nx = dx > 0 ? bx - r - 0.01 : bx + TILE + r + 0.01;
          }
        }
      }
    }
    let ny = y + dy;
    const l2 = Math.floor((nx - r) / TILE), r2 = Math.floor((nx + r) / TILE);
    const t2 = Math.floor((ny - r) / TILE), b2 = Math.floor((ny + r) / TILE);
    for (let ty = t2; ty <= b2; ty++) {
      for (let tx = l2; tx <= r2; tx++) {
        if (this.blocksMove(tx, ty)) {
          const bx = tx * TILE, by = ty * TILE;
          if (nx + r > bx && nx - r < bx + TILE && ny + r > by && ny - r < by + TILE) {
            ny = dy > 0 ? by - r - 0.01 : by + TILE + r + 0.01;
          }
        }
      }
    }
    return { x: nx, y: ny };
  }

  // True when no sight-blocking tile lies between two points (sampled).
  hasLineOfSight(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(d / 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      if (this.blocksSight(Math.floor(px / TILE), Math.floor(py / TILE))) return false;
    }
    return true;
  }

  // Distance from (x,y) along angle before a sight-blocking tile (for cones).
  rayDistance(x, y, angle, maxDist) {
    const step = 6;
    const cx = Math.cos(angle), sy = Math.sin(angle);
    for (let d = step; d <= maxDist; d += step) {
      const px = x + cx * d, py = y + sy * d;
      if (this.blocksSight(Math.floor(px / TILE), Math.floor(py / TILE))) return d;
    }
    return maxDist;
  }

  shardsLeft() {
    return this.shards.filter((s) => !s.taken).length;
  }

  tileCenter(tx, ty) {
    return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
  }
}
