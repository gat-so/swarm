import { useRef, useEffect, useCallback } from 'react';
import './CommunityCanvas.css';

/* ================================================================
   Types
   ================================================================ */

interface CommunityCanvasProps {
  currentTime: number;
  playing: boolean;
}

interface Avatar {
  id: string;
  name: string;
  color: string;
  skinColor: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  frame: number;
  frameTimer: number;
  idleTimer: number;
  direction: 'down' | 'up' | 'left' | 'right';
  bubble: string | null;
  bubbleOpacity: number;
  bubbleTimer: number;
}

interface ScriptedEvent {
  time: number;
  avatarId: string;
  action: 'move' | 'say' | 'move_and_say';
  targetX?: number;
  targetY?: number;
  message?: string;
  fired?: boolean;
}

/* ================================================================
   Constants
   ================================================================ */

const TILE = 16;
const AVATAR_SPEED = 30; // px per second
const IDLE_RANGE = 48; // pixels from current pos to pick idle target
const IDLE_MIN = 2; // min seconds between idle wanders
const IDLE_MAX = 5; // max seconds between idle wanders
const BUBBLE_DURATION = 4; // seconds a speech bubble stays
const FRAME_INTERVAL = 0.25; // seconds between walk frames

const AVATAR_DEFS: Omit<
  Avatar,
  | 'targetX'
  | 'targetY'
  | 'frame'
  | 'frameTimer'
  | 'idleTimer'
  | 'direction'
  | 'bubble'
  | 'bubbleOpacity'
  | 'bubbleTimer'
>[] = [
  { id: 'a1', name: 'Alice', color: '#8ab4f8', skinColor: '#f5c5a3', x: 80, y: 64 },
  { id: 'a2', name: 'Bob', color: '#81c995', skinColor: '#d4a574', x: 160, y: 96 },
  { id: 'a3', name: 'Carol', color: '#f28b82', skinColor: '#f5c5a3', x: 240, y: 128 },
  { id: 'a4', name: 'Dave', color: '#fdd663', skinColor: '#c68642', x: 112, y: 160 },
  { id: 'a5', name: 'Eve', color: '#c58af9', skinColor: '#f5c5a3', x: 200, y: 56 },
  { id: 'a6', name: 'Frank', color: '#ff8a65', skinColor: '#d4a574', x: 288, y: 144 },
];

/* Example scripted events tied to playback time */
const SCRIPTED_EVENTS: ScriptedEvent[] = [
  { time: 5, avatarId: 'a1', action: 'say', message: 'Hey everyone! 👋' },
  { time: 12, avatarId: 'a2', action: 'move_and_say', targetX: 120, targetY: 80, message: 'Hi Alice!' },
  { time: 20, avatarId: 'a3', action: 'say', message: 'What are we working on?' },
  { time: 30, avatarId: 'a1', action: 'move', targetX: 180, targetY: 100 },
  { time: 35, avatarId: 'a4', action: 'say', message: 'Let me check the docs 📄' },
  { time: 45, avatarId: 'a5', action: 'move_and_say', targetX: 160, targetY: 80, message: 'I found a bug!' },
  { time: 55, avatarId: 'a6', action: 'say', message: 'On it! 🔧' },
  { time: 65, avatarId: 'a2', action: 'say', message: 'Nice teamwork 🙌' },
  { time: 80, avatarId: 'a3', action: 'move', targetX: 100, targetY: 140 },
  { time: 90, avatarId: 'a1', action: 'say', message: 'Almost done!' },
  { time: 100, avatarId: 'a4', action: 'move_and_say', targetX: 200, targetY: 120, message: 'Deploying now...' },
  { time: 115, avatarId: 'a5', action: 'say', message: 'Tests pass ✅' },
  { time: 130, avatarId: 'a6', action: 'move_and_say', targetX: 180, targetY: 100, message: 'Ship it! 🚀' },
  { time: 145, avatarId: 'a1', action: 'say', message: 'Great work team!' },
  { time: 165, avatarId: 'a2', action: 'move', targetX: 250, targetY: 80 },
  { time: 175, avatarId: 'a3', action: 'say', message: 'Break time? ☕' },
  { time: 190, avatarId: 'a4', action: 'say', message: 'Let me grab coffee' },
  { time: 210, avatarId: 'a5', action: 'move_and_say', targetX: 90, targetY: 130, message: 'New feature idea 💡' },
  { time: 230, avatarId: 'a6', action: 'say', message: 'Tell me more!' },
  { time: 250, avatarId: 'a1', action: 'move_and_say', targetX: 120, targetY: 130, message: "Let's brainstorm" },
  { time: 270, avatarId: 'a2', action: 'say', message: 'Adding to the board 📋' },
  { time: 290, avatarId: 'a3', action: 'move', targetX: 200, targetY: 70 },
  { time: 310, avatarId: 'a4', action: 'say', message: 'Prototype ready!' },
  { time: 330, avatarId: 'a5', action: 'say', message: 'Looks amazing ✨' },
  { time: 350, avatarId: 'a6', action: 'move_and_say', targetX: 260, targetY: 60, message: 'Reviewing PR...' },
  { time: 370, avatarId: 'a1', action: 'say', message: 'LGTM! 👍' },
  { time: 390, avatarId: 'a2', action: 'move_and_say', targetX: 160, targetY: 110, message: "Let's wrap up" },
  { time: 400, avatarId: 'a3', action: 'say', message: 'See you tomorrow! 👋' },
];

/* ================================================================
   Tile map palette
   ================================================================ */

const COLORS = {
  // Floor — warm wood tone
  floor: '#3d3428',
  floorGrain1: '#3a3125',
  floorGrain2: '#42382c',
  floorEdge: '#352e22',
  // Walls
  wallUpper: '#4a4a52',
  wallLower: '#3e3e46',
  wallBrick: 'rgba(0,0,0,0.1)',
  baseboard: '#2e2e34',
  baseboardHighlight: '#3a3a42',
  // Rug
  rug: '#3a2850',
  rugInner: '#4a3468',
  rugBorder: '#2e1c3e',
  rugPattern: '#523c78',
  // Furniture
  desk: '#5c4428',
  deskTop: '#6e5434',
  deskLeg: '#4a3820',
  // Decor
  plant: '#2a8a2a',
  plantLight: '#38a838',
  plantPot: '#7a5535',
  plantPotRim: '#8a6545',
  // General
  shadow: 'rgba(0,0,0,0.2)',
};

/* ================================================================
   Helpers
   ================================================================ */

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function makeAvatars(): Avatar[] {
  return AVATAR_DEFS.map((d) => ({
    ...d,
    targetX: d.x,
    targetY: d.y,
    frame: 0,
    frameTimer: 0,
    idleTimer: rand(IDLE_MIN, IDLE_MAX),
    direction: 'down' as const,
    bubble: null,
    bubbleOpacity: 0,
    bubbleTimer: 0,
  }));
}

function resetEvents(): ScriptedEvent[] {
  return SCRIPTED_EVENTS.map((e) => ({ ...e, fired: false }));
}

/* ================================================================
   Drawing helpers
   ================================================================ */

function drawTileMap(ctx: CanvasRenderingContext2D, cols: number, rows: number) {
  const totalW = cols * TILE;
  const totalH = rows * TILE;

  /* ---- Solid wood floor ---- */
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, totalW, totalH);

  // Horizontal wood-plank grain lines
  for (let r = 0; r < rows; r++) {
    const y = r * TILE;
    // Plank seam every tile row
    ctx.fillStyle = COLORS.floorEdge;
    ctx.fillRect(0, y, totalW, 1);
    // Subtle grain streaks within each plank
    ctx.fillStyle = r % 2 === 0 ? COLORS.floorGrain1 : COLORS.floorGrain2;
    ctx.fillRect(0, y + 1, totalW, TILE - 1);
    // Faint mid-grain line
    ctx.fillStyle = COLORS.floorEdge;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, y + Math.floor(TILE / 2), totalW, 1);
    ctx.globalAlpha = 1;
    // Offset vertical seams for brick-like plank stagger
    const offset = (r % 2) * Math.floor(TILE * 1.5);
    for (let px = offset; px < totalW; px += TILE * 3) {
      ctx.fillStyle = COLORS.floorEdge;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px, y, 1, TILE);
      ctx.globalAlpha = 1;
    }
  }

  /* ---- Wall (3 tile rows at top) ---- */
  const wallH = TILE * 3;
  // Upper wall
  ctx.fillStyle = COLORS.wallUpper;
  ctx.fillRect(0, 0, totalW, wallH - TILE);
  // Lower wall row
  ctx.fillStyle = COLORS.wallLower;
  ctx.fillRect(0, wallH - TILE, totalW, TILE);

  // Brick lines on upper wall
  ctx.strokeStyle = COLORS.wallBrick;
  ctx.lineWidth = 1;
  for (let br = 0; br < 2; br++) {
    const by = br * TILE + TILE;
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(totalW, by);
    ctx.stroke();
    // Vertical brick joints (staggered)
    const brickW = TILE * 2;
    const stagger = br % 2 === 0 ? 0 : TILE;
    for (let bx = stagger; bx < totalW; bx += brickW) {
      ctx.beginPath();
      ctx.moveTo(bx, br * TILE);
      ctx.lineTo(bx, br * TILE + TILE);
      ctx.stroke();
    }
  }

  // Baseboard strip
  ctx.fillStyle = COLORS.baseboard;
  ctx.fillRect(0, wallH, totalW, 4);
  ctx.fillStyle = COLORS.baseboardHighlight;
  ctx.fillRect(0, wallH, totalW, 1);

  /* ---- Area rug (centered, modest size) ---- */
  const rugTilesW = Math.max(4, Math.floor(cols * 0.28));
  const rugTilesH = Math.max(3, Math.floor(rows * 0.22));
  const rugPxW = rugTilesW * TILE;
  const rugPxH = rugTilesH * TILE;
  const rugPxX = Math.floor((totalW - rugPxW) / 2);
  const rugPxY = Math.floor((totalH - rugPxH) / 2) + TILE;

  // Outer border
  ctx.fillStyle = COLORS.rugBorder;
  ctx.fillRect(rugPxX, rugPxY, rugPxW, rugPxH);
  // Main rug fill
  ctx.fillStyle = COLORS.rug;
  ctx.fillRect(rugPxX + 3, rugPxY + 3, rugPxW - 6, rugPxH - 6);
  // Inner decorative rectangle
  ctx.fillStyle = COLORS.rugInner;
  ctx.fillRect(rugPxX + 8, rugPxY + 8, rugPxW - 16, rugPxH - 16);
  // Center diamond/pattern accent
  ctx.fillStyle = COLORS.rugPattern;
  const cx = rugPxX + rugPxW / 2;
  const cy = rugPxY + rugPxH / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx + 14, cy);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 14, cy);
  ctx.closePath();
  ctx.fill();
  // Rug fringe at short edges
  ctx.fillStyle = COLORS.rugBorder;
  for (let fx = rugPxX + 4; fx < rugPxX + rugPxW - 2; fx += 4) {
    ctx.fillRect(fx, rugPxY - 2, 2, 2);
    ctx.fillRect(fx, rugPxY + rugPxH, 2, 2);
  }

  /* ---- Furniture ---- */
  const drawDesk = (dx: number, dy: number, w: number, h: number) => {
    // Shadow
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(dx + 2, dy + 2, w, h);
    // Legs
    ctx.fillStyle = COLORS.deskLeg;
    ctx.fillRect(dx + 2, dy + h - 4, 3, 4);
    ctx.fillRect(dx + w - 5, dy + h - 4, 3, 4);
    // Body
    ctx.fillStyle = COLORS.desk;
    ctx.fillRect(dx, dy, w, h - 3);
    // Top surface highlight
    ctx.fillStyle = COLORS.deskTop;
    ctx.fillRect(dx + 1, dy + 1, w - 2, Math.floor(h * 0.35));
    // Edge line
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, w, h - 3);
  };

  // Two desks against the wall
  drawDesk(TILE * 2, wallH + 6, TILE * 3, TILE * 1.5);
  drawDesk(totalW - TILE * 5, wallH + 6, TILE * 3, TILE * 1.5);

  /* ---- Plants ---- */
  const drawPlant = (px: number, py: number) => {
    // Pot
    ctx.fillStyle = COLORS.plantPot;
    ctx.fillRect(px + 2, py + 8, 12, 8);
    ctx.fillStyle = COLORS.plantPotRim;
    ctx.fillRect(px + 1, py + 7, 14, 3);
    // Leaves (3 circles for bushier look)
    ctx.fillStyle = COLORS.plant;
    ctx.beginPath();
    ctx.arc(px + 8, py + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plantLight;
    ctx.beginPath();
    ctx.arc(px + 5, py + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.plant;
    ctx.beginPath();
    ctx.arc(px + 11, py + 3, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  // Corner plants
  drawPlant(TILE * 0.5, wallH + 8);
  drawPlant(totalW - TILE * 1.5, wallH + 8);
  drawPlant(TILE * 0.5, totalH - TILE * 2);
  drawPlant(totalW - TILE * 1.5, totalH - TILE * 2);

  /* ---- Side walls (thin vertical strips) ---- */
  ctx.fillStyle = COLORS.baseboard;
  ctx.fillRect(0, wallH, 3, totalH - wallH);
  ctx.fillRect(totalW - 3, wallH, 3, totalH - wallH);
  // Bottom wall strip
  ctx.fillRect(0, totalH - 3, totalW, 3);
}

function drawAvatar(ctx: CanvasRenderingContext2D, av: Avatar) {
  const x = Math.round(av.x);
  const y = Math.round(av.y);
  const isWalking = Math.abs(av.x - av.targetX) > 1 || Math.abs(av.y - av.targetY) > 1;
  const legOffset = isWalking ? (av.frame === 0 ? 2 : -2) : 0;

  // Shadow
  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#3a3a5a';
  ctx.fillRect(x - 4 + legOffset, y + 5, 3, 6);
  ctx.fillRect(x + 1 - legOffset, y + 5, 3, 6);

  // Body
  ctx.fillStyle = av.color;
  ctx.fillRect(x - 5, y - 4, 10, 10);

  // Arms
  const armOffset = isWalking ? (av.frame === 0 ? -1 : 1) : 0;
  ctx.fillStyle = av.skinColor;
  ctx.fillRect(x - 7, y - 2 + armOffset, 3, 6);
  ctx.fillRect(x + 4, y - 2 - armOffset, 3, 6);

  // Head
  ctx.fillStyle = av.skinColor;
  ctx.fillRect(x - 4, y - 10, 8, 7);

  // Hair
  ctx.fillStyle = av.color;
  ctx.fillRect(x - 4, y - 12, 8, 4);

  // Eyes
  ctx.fillStyle = '#1a1a2e';
  if (av.direction === 'up') {
    // no eyes visible from behind
  } else if (av.direction === 'left') {
    ctx.fillRect(x - 3, y - 8, 2, 2);
  } else if (av.direction === 'right') {
    ctx.fillRect(x + 1, y - 8, 2, 2);
  } else {
    ctx.fillRect(x - 3, y - 8, 2, 2);
    ctx.fillRect(x + 1, y - 8, 2, 2);
  }

  // Name label
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const nameWidth = ctx.measureText(av.name).width;
  const labelX = x - nameWidth / 2 - 3;
  const labelY = y + 14;
  roundRect(ctx, labelX, labelY, nameWidth + 6, 11, 3);
  ctx.fill();
  ctx.fillStyle = '#e3e3e8';
  ctx.fillText(av.name, x - nameWidth / 2, labelY + 9);
}

function drawBubble(ctx: CanvasRenderingContext2D, av: Avatar) {
  if (!av.bubble || av.bubbleOpacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = av.bubbleOpacity;

  const x = Math.round(av.x);
  const y = Math.round(av.y);
  const padding = 6;
  const textWidth = ctx.measureText(av.bubble).width;
  const bw = textWidth + padding * 2;
  const bh = 18;
  const bx = x - bw / 2;
  const by = y - 32 - bh;

  // Bubble background
  ctx.fillStyle = '#f0f0f4';
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill();

  // Pointer triangle
  ctx.beginPath();
  ctx.moveTo(x - 4, by + bh);
  ctx.lineTo(x, by + bh + 5);
  ctx.lineTo(x + 4, by + bh);
  ctx.closePath();
  ctx.fill();

  // Border
  ctx.strokeStyle = '#c0c0c8';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText(av.bubble, bx + padding, by + 13);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/* ================================================================
   Component
   ================================================================ */

export default function CommunityCanvas({ currentTime, playing }: CommunityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    avatars: Avatar[];
    events: ScriptedEvent[];
    lastTime: number;
    prevSimTime: number;
    tileMapCache: HTMLCanvasElement | null;
  }>({
    avatars: makeAvatars(),
    events: resetEvents(),
    lastTime: 0,
    prevSimTime: -1,
    tileMapCache: null,
  });

  /* ---- Reset scene when time jumps (scrubbing) ---- */
  const resetToTime = useCallback((t: number) => {
    const s = stateRef.current;
    s.avatars = makeAvatars();
    s.events = resetEvents();

    // Replay all events up to time t instantly
    for (const ev of s.events) {
      if (ev.time > t) break;
      ev.fired = true;
      const av = s.avatars.find((a) => a.id === ev.avatarId);
      if (!av) continue;

      if (ev.action === 'move' || ev.action === 'move_and_say') {
        if (ev.targetX !== undefined && ev.targetY !== undefined) {
          av.x = ev.targetX;
          av.y = ev.targetY;
          av.targetX = ev.targetX;
          av.targetY = ev.targetY;
        }
      }
      if (ev.action === 'say' || ev.action === 'move_and_say') {
        // Only show bubble if event is recent (within BUBBLE_DURATION seconds)
        if (t - ev.time < BUBBLE_DURATION && ev.message) {
          av.bubble = ev.message;
          av.bubbleOpacity = Math.max(0, 1 - (t - ev.time) / BUBBLE_DURATION);
          av.bubbleTimer = BUBBLE_DURATION - (t - ev.time);
        }
      }
    }
  }, []);

  /* ---- Animation loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const loop = (timestamp: number) => {
      const s = stateRef.current;
      const rawDt = s.lastTime ? (timestamp - s.lastTime) / 1000 : 0;
      const dt = Math.min(rawDt, 0.1); // cap delta at 100ms
      s.lastTime = timestamp;

      // Detect time jumps (scrubbing)
      const timeDiff = Math.abs(currentTime - s.prevSimTime);
      if (s.prevSimTime >= 0 && timeDiff > 2) {
        resetToTime(currentTime);
      }
      s.prevSimTime = currentTime;

      // Resize canvas to container
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          s.tileMapCache = null; // invalidate cache on resize
        }
      }

      const cw = canvas.width / (window.devicePixelRatio || 1);
      const ch = canvas.height / (window.devicePixelRatio || 1);
      const cols = Math.ceil(cw / TILE);
      const rows = Math.ceil(ch / TILE);

      // Build tile map cache
      if (!s.tileMapCache || s.tileMapCache.width !== canvas.width || s.tileMapCache.height !== canvas.height) {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');
        if (offCtx) {
          const dpr = window.devicePixelRatio || 1;
          offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawTileMap(offCtx, cols, rows);
        }
        s.tileMapCache = offscreen;
      }

      // Clear & draw cached tile map
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(s.tileMapCache, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.restore();

      // Fire scripted events
      for (const ev of s.events) {
        if (ev.fired) continue;
        if (currentTime >= ev.time) {
          ev.fired = true;
          const av = s.avatars.find((a) => a.id === ev.avatarId);
          if (!av) continue;

          if (ev.action === 'move' || ev.action === 'move_and_say') {
            if (ev.targetX !== undefined && ev.targetY !== undefined) {
              av.targetX = clamp(ev.targetX, 10, cw - 10);
              av.targetY = clamp(ev.targetY, 20, ch - 20);
            }
          }
          if (ev.action === 'say' || ev.action === 'move_and_say') {
            av.bubble = ev.message ?? null;
            av.bubbleOpacity = 1;
            av.bubbleTimer = BUBBLE_DURATION;
          }
        }
      }

      // Update avatars
      ctx.font = '8px "Inter", monospace';

      // Clamp bounds based on current canvas size
      const minX = 10;
      const maxX = cw - 10;
      const minY = 20;
      const maxY = ch - 20;

      for (const av of s.avatars) {
        if (playing) {
          // Move toward target
          const dx = av.targetX - av.x;
          const dy = av.targetY - av.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1) {
            const step = AVATAR_SPEED * dt;
            const ratio = Math.min(step / dist, 1);
            av.x += dx * ratio;
            av.y += dy * ratio;

            // Update direction
            if (Math.abs(dx) > Math.abs(dy)) {
              av.direction = dx > 0 ? 'right' : 'left';
            } else {
              av.direction = dy > 0 ? 'down' : 'up';
            }

            // Walk animation
            av.frameTimer += dt;
            if (av.frameTimer >= FRAME_INTERVAL) {
              av.frame = av.frame === 0 ? 1 : 0;
              av.frameTimer = 0;
            }
          } else {
            av.frame = 0;
            av.frameTimer = 0;

            // Idle wander
            av.idleTimer -= dt;
            if (av.idleTimer <= 0) {
              av.targetX = clamp(av.x + rand(-IDLE_RANGE, IDLE_RANGE), minX, maxX);
              av.targetY = clamp(av.y + rand(-IDLE_RANGE, IDLE_RANGE), minY, maxY);
              av.idleTimer = rand(IDLE_MIN, IDLE_MAX);
            }
          }

          // Update bubble
          if (av.bubbleTimer > 0) {
            av.bubbleTimer -= dt;
            if (av.bubbleTimer <= 1) {
              av.bubbleOpacity = Math.max(0, av.bubbleTimer);
            }
            if (av.bubbleTimer <= 0) {
              av.bubble = null;
              av.bubbleOpacity = 0;
            }
          }
        }

        // Keep avatar in bounds
        av.x = clamp(av.x, minX, maxX);
        av.y = clamp(av.y, minY, maxY);
      }

      // Sort avatars by Y for correct overlap (painter's algorithm)
      const sorted = [...s.avatars].sort((a, b) => a.y - b.y);

      for (const av of sorted) {
        drawAvatar(ctx, av);
      }

      // Draw bubbles on top of all avatars
      for (const av of sorted) {
        drawBubble(ctx, av);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [currentTime, playing, resetToTime]);

  return (
    <div className="community-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
