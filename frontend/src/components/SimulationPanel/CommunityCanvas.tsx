import { useRef, useEffect, useCallback } from 'react';
import './CommunityCanvas.css';
import type { SimulationEvent, SimulationMode } from '../ChatPanel/ChatPanel';

/* ================================================================
   Types
   ================================================================ */

interface CommunityCanvasProps {
  currentTime: number;
  playing: boolean;
  mode: SimulationMode;
  simulationEvents: SimulationEvent[];
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

/* ================================================================
   Constants
   ================================================================ */

const TILE = 16;
const AVATAR_SPEED = 30;
const IDLE_RANGE = 48;
const IDLE_MIN = 2;
const IDLE_MAX = 5;
const BUBBLE_DURATION = 4;
const FRAME_INTERVAL = 0.25;

/* ================================================================
   Tile map palette
   ================================================================ */

const COLORS = {
  floor: '#3d3428',
  floorGrain1: '#3a3125',
  floorGrain2: '#42382c',
  floorEdge: '#352e22',
  wallUpper: '#4a4a52',
  wallLower: '#3e3e46',
  wallBrick: 'rgba(0,0,0,0.1)',
  baseboard: '#2e2e34',
  baseboardHighlight: '#3a3a42',
  rug: '#3a2850',
  rugInner: '#4a3468',
  rugBorder: '#2e1c3e',
  rugPattern: '#523c78',
  desk: '#5c4428',
  deskTop: '#6e5434',
  deskLeg: '#4a3820',
  plant: '#2a8a2a',
  plantLight: '#38a838',
  plantPot: '#7a5535',
  plantPotRim: '#8a6545',
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

function makeAvatar(
  id: string,
  name: string,
  color: string,
  skinColor: string,
  x: number,
  y: number,
): Avatar {
  return {
    id,
    name,
    color,
    skinColor,
    x,
    y,
    targetX: x,
    targetY: y,
    frame: 0,
    frameTimer: 0,
    idleTimer: rand(IDLE_MIN, IDLE_MAX),
    direction: 'down',
    bubble: null,
    bubbleOpacity: 0,
    bubbleTimer: 0,
  };
}

/* ================================================================
   Drawing helpers
   ================================================================ */

function drawTileMap(ctx: CanvasRenderingContext2D, cols: number, rows: number) {
  const totalW = cols * TILE;
  const totalH = rows * TILE;

  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, totalW, totalH);

  for (let r = 0; r < rows; r++) {
    const y = r * TILE;
    ctx.fillStyle = COLORS.floorEdge;
    ctx.fillRect(0, y, totalW, 1);
    ctx.fillStyle = r % 2 === 0 ? COLORS.floorGrain1 : COLORS.floorGrain2;
    ctx.fillRect(0, y + 1, totalW, TILE - 1);
    ctx.fillStyle = COLORS.floorEdge;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(0, y + Math.floor(TILE / 2), totalW, 1);
    ctx.globalAlpha = 1;
    const offset = (r % 2) * Math.floor(TILE * 1.5);
    for (let px = offset; px < totalW; px += TILE * 3) {
      ctx.fillStyle = COLORS.floorEdge;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(px, y, 1, TILE);
      ctx.globalAlpha = 1;
    }
  }

  const wallH = TILE * 3;
  ctx.fillStyle = COLORS.wallUpper;
  ctx.fillRect(0, 0, totalW, wallH - TILE);
  ctx.fillStyle = COLORS.wallLower;
  ctx.fillRect(0, wallH - TILE, totalW, TILE);

  ctx.strokeStyle = COLORS.wallBrick;
  ctx.lineWidth = 1;
  for (let br = 0; br < 2; br++) {
    const by = br * TILE + TILE;
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(totalW, by);
    ctx.stroke();
    const brickW = TILE * 2;
    const stagger = br % 2 === 0 ? 0 : TILE;
    for (let bx = stagger; bx < totalW; bx += brickW) {
      ctx.beginPath();
      ctx.moveTo(bx, br * TILE);
      ctx.lineTo(bx, br * TILE + TILE);
      ctx.stroke();
    }
  }

  ctx.fillStyle = COLORS.baseboard;
  ctx.fillRect(0, wallH, totalW, 4);
  ctx.fillStyle = COLORS.baseboardHighlight;
  ctx.fillRect(0, wallH, totalW, 1);

  const rugTilesW = Math.max(4, Math.floor(cols * 0.28));
  const rugTilesH = Math.max(3, Math.floor(rows * 0.22));
  const rugPxW = rugTilesW * TILE;
  const rugPxH = rugTilesH * TILE;
  const rugPxX = Math.floor((totalW - rugPxW) / 2);
  const rugPxY = Math.floor((totalH - rugPxH) / 2) + TILE;

  ctx.fillStyle = COLORS.rugBorder;
  ctx.fillRect(rugPxX, rugPxY, rugPxW, rugPxH);
  ctx.fillStyle = COLORS.rug;
  ctx.fillRect(rugPxX + 3, rugPxY + 3, rugPxW - 6, rugPxH - 6);
  ctx.fillStyle = COLORS.rugInner;
  ctx.fillRect(rugPxX + 8, rugPxY + 8, rugPxW - 16, rugPxH - 16);
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
  ctx.fillStyle = COLORS.rugBorder;
  for (let fx = rugPxX + 4; fx < rugPxX + rugPxW - 2; fx += 4) {
    ctx.fillRect(fx, rugPxY - 2, 2, 2);
    ctx.fillRect(fx, rugPxY + rugPxH, 2, 2);
  }

  const drawDesk = (dx: number, dy: number, w: number, h: number) => {
    ctx.fillStyle = COLORS.shadow;
    ctx.fillRect(dx + 2, dy + 2, w, h);
    ctx.fillStyle = COLORS.deskLeg;
    ctx.fillRect(dx + 2, dy + h - 4, 3, 4);
    ctx.fillRect(dx + w - 5, dy + h - 4, 3, 4);
    ctx.fillStyle = COLORS.desk;
    ctx.fillRect(dx, dy, w, h - 3);
    ctx.fillStyle = COLORS.deskTop;
    ctx.fillRect(dx + 1, dy + 1, w - 2, Math.floor(h * 0.35));
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, w, h - 3);
  };

  drawDesk(TILE * 2, wallH + 6, TILE * 3, TILE * 1.5);
  drawDesk(totalW - TILE * 5, wallH + 6, TILE * 3, TILE * 1.5);

  const drawPlant = (px: number, py: number) => {
    ctx.fillStyle = COLORS.plantPot;
    ctx.fillRect(px + 2, py + 8, 12, 8);
    ctx.fillStyle = COLORS.plantPotRim;
    ctx.fillRect(px + 1, py + 7, 14, 3);
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

  drawPlant(TILE * 0.5, wallH + 8);
  drawPlant(totalW - TILE * 1.5, wallH + 8);
  drawPlant(TILE * 0.5, totalH - TILE * 2);
  drawPlant(totalW - TILE * 1.5, totalH - TILE * 2);

  ctx.fillStyle = COLORS.baseboard;
  ctx.fillRect(0, wallH, 3, totalH - wallH);
  ctx.fillRect(totalW - 3, wallH, 3, totalH - wallH);
  ctx.fillRect(0, totalH - 3, totalW, 3);
}

function drawAvatar(ctx: CanvasRenderingContext2D, av: Avatar) {
  const x = Math.round(av.x);
  const y = Math.round(av.y);
  const isWalking = Math.abs(av.x - av.targetX) > 1 || Math.abs(av.y - av.targetY) > 1;
  const legOffset = isWalking ? (av.frame === 0 ? 2 : -2) : 0;

  ctx.fillStyle = COLORS.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 6, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#3a3a5a';
  ctx.fillRect(x - 4 + legOffset, y + 5, 3, 6);
  ctx.fillRect(x + 1 - legOffset, y + 5, 3, 6);

  ctx.fillStyle = av.color;
  ctx.fillRect(x - 5, y - 4, 10, 10);

  const armOffset = isWalking ? (av.frame === 0 ? -1 : 1) : 0;
  ctx.fillStyle = av.skinColor;
  ctx.fillRect(x - 7, y - 2 + armOffset, 3, 6);
  ctx.fillRect(x + 4, y - 2 - armOffset, 3, 6);

  ctx.fillStyle = av.skinColor;
  ctx.fillRect(x - 4, y - 10, 8, 7);

  ctx.fillStyle = av.color;
  ctx.fillRect(x - 4, y - 12, 8, 4);

  ctx.fillStyle = '#1a1a2e';
  if (av.direction === 'up') {
    // no eyes from behind
  } else if (av.direction === 'left') {
    ctx.fillRect(x - 3, y - 8, 2, 2);
  } else if (av.direction === 'right') {
    ctx.fillRect(x + 1, y - 8, 2, 2);
  } else {
    ctx.fillRect(x - 3, y - 8, 2, 2);
    ctx.fillRect(x + 1, y - 8, 2, 2);
  }

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
  const maxBubbleW = 140;
  const padding = 6;
  const rawWidth = ctx.measureText(av.bubble).width;
  const textWidth = Math.min(rawWidth, maxBubbleW);
  const bw = textWidth + padding * 2;
  const bh = 18;
  const bx = x - bw / 2;
  const by = y - 32 - bh;

  ctx.fillStyle = '#f0f0f4';
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 4, by + bh);
  ctx.lineTo(x, by + bh + 5);
  ctx.lineTo(x + 4, by + bh);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#c0c0c8';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, bh, 6);
  ctx.stroke();

  ctx.fillStyle = '#1a1a2e';
  const displayText = rawWidth > maxBubbleW
    ? av.bubble.slice(0, Math.floor(av.bubble.length * (maxBubbleW / rawWidth))) + '...'
    : av.bubble;
  ctx.fillText(displayText, bx + padding, by + 13);

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

export default function CommunityCanvas({
  currentTime,
  playing,
  mode,
  simulationEvents,
}: CommunityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    avatars: Avatar[];
    processedEventCount: number;
    lastTime: number;
    prevSimTime: number;
    tileMapCache: HTMLCanvasElement | null;
  }>({
    avatars: [],
    processedEventCount: 0,
    lastTime: 0,
    prevSimTime: -1,
    tileMapCache: null,
  });

  const applyEvent = useCallback((ev: SimulationEvent, avatars: Avatar[], cw: number, ch: number) => {
    if (ev.type === 'spawn') {
      const existing = avatars.find((a) => a.id === ev.agentId);
      if (!existing) {
        avatars.push(
          makeAvatar(
            ev.agentId,
            ev.name || ev.agentId,
            ev.color || '#8ab4f8',
            ev.skinColor || '#f5c5a3',
            clamp(ev.x ?? cw / 2, 10, cw - 10),
            clamp(ev.y ?? ch / 2, 20, ch - 20),
          ),
        );
      }
    } else if (ev.type === 'move' || ev.type === 'move_and_say') {
      const av = avatars.find((a) => a.id === ev.agentId);
      if (av && ev.x !== undefined && ev.y !== undefined) {
        av.targetX = clamp(ev.x, 10, cw - 10);
        av.targetY = clamp(ev.y, 20, ch - 20);
      }
      if (ev.type === 'move_and_say' && av && ev.message) {
        av.bubble = ev.message;
        av.bubbleOpacity = 1;
        av.bubbleTimer = BUBBLE_DURATION;
      }
    } else if (ev.type === 'say') {
      const av = avatars.find((a) => a.id === ev.agentId);
      if (av && ev.message) {
        av.bubble = ev.message;
        av.bubbleOpacity = 1;
        av.bubbleTimer = BUBBLE_DURATION;
      }
    } else if (ev.type === 'remove') {
      const idx = avatars.findIndex((a) => a.id === ev.agentId);
      if (idx >= 0) avatars.splice(idx, 1);
    }
  }, []);

  const resetToTime = useCallback(
    (t: number, cw: number, ch: number) => {
      const s = stateRef.current;
      s.avatars = [];
      s.processedEventCount = 0;

      const timeMs = t * 1000;
      for (const ev of simulationEvents) {
        if (ev.timestamp > timeMs) break;
        if (ev.type === 'done') continue;
        applyEvent(ev, s.avatars, cw, ch);
      }

      // Set positions instantly for events up to this time
      for (const av of s.avatars) {
        av.x = av.targetX;
        av.y = av.targetY;
        // Only show bubble if recent
        if (av.bubbleTimer <= 0) {
          av.bubble = null;
          av.bubbleOpacity = 0;
        }
      }
    },
    [simulationEvents, applyEvent],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const loop = (timestamp: number) => {
      const s = stateRef.current;
      const rawDt = s.lastTime ? (timestamp - s.lastTime) / 1000 : 0;
      const dt = Math.min(rawDt, 0.1);
      s.lastTime = timestamp;

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
          s.tileMapCache = null;
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

      // Handle mode-specific event processing
      if (mode === 'recording') {
        // Process new events as they arrive
        while (s.processedEventCount < simulationEvents.length) {
          const ev = simulationEvents[s.processedEventCount];
          if (ev.type === 'done') {
            s.processedEventCount++;
            continue;
          }
          applyEvent(ev, s.avatars, cw, ch);
          s.processedEventCount++;
        }
      } else if (mode === 'replay') {
        // Detect time jumps (scrubbing)
        const timeDiff = Math.abs(currentTime - s.prevSimTime);
        if (s.prevSimTime >= 0 && timeDiff > 2) {
          resetToTime(currentTime, cw, ch);
        } else {
          // Process events up to currentTime
          const timeMs = currentTime * 1000;
          while (s.processedEventCount < simulationEvents.length) {
            const ev = simulationEvents[s.processedEventCount];
            if (ev.timestamp > timeMs) break;
            if (ev.type === 'done') {
              s.processedEventCount++;
              continue;
            }
            applyEvent(ev, s.avatars, cw, ch);
            s.processedEventCount++;
          }
        }
        s.prevSimTime = currentTime;
      } else if (mode === 'idle') {
        // No events to process in idle mode
        s.avatars = [];
        s.processedEventCount = 0;
      }

      // Clear & draw cached tile map
      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(s.tileMapCache, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.restore();

      // Update avatars
      ctx.font = '8px "Inter", monospace';

      const minX = 10;
      const maxX = cw - 10;
      const minY = 20;
      const maxY = ch - 20;

      const shouldAnimate = mode === 'recording' || (mode === 'replay' && playing);

      for (const av of s.avatars) {
        if (shouldAnimate) {
          const dx = av.targetX - av.x;
          const dy = av.targetY - av.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1) {
            const step = AVATAR_SPEED * dt;
            const ratio = Math.min(step / dist, 1);
            av.x += dx * ratio;
            av.y += dy * ratio;

            if (Math.abs(dx) > Math.abs(dy)) {
              av.direction = dx > 0 ? 'right' : 'left';
            } else {
              av.direction = dy > 0 ? 'down' : 'up';
            }

            av.frameTimer += dt;
            if (av.frameTimer >= FRAME_INTERVAL) {
              av.frame = av.frame === 0 ? 1 : 0;
              av.frameTimer = 0;
            }
          } else {
            av.frame = 0;
            av.frameTimer = 0;

            // Idle wander only in recording mode
            if (mode === 'recording') {
              av.idleTimer -= dt;
              if (av.idleTimer <= 0) {
                av.targetX = clamp(av.x + rand(-IDLE_RANGE, IDLE_RANGE), minX, maxX);
                av.targetY = clamp(av.y + rand(-IDLE_RANGE, IDLE_RANGE), minY, maxY);
                av.idleTimer = rand(IDLE_MIN, IDLE_MAX);
              }
            }
          }

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

        av.x = clamp(av.x, minX, maxX);
        av.y = clamp(av.y, minY, maxY);
      }

      // Sort by Y for correct overlap
      const sorted = [...s.avatars].sort((a, b) => a.y - b.y);

      for (const av of sorted) {
        drawAvatar(ctx, av);
      }

      for (const av of sorted) {
        drawBubble(ctx, av);
      }

      // Draw idle state overlay
      if (mode === 'idle' && s.avatars.length === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px "Inter", sans-serif';
        const idleText = 'Waiting for execution...';
        const tw = ctx.measureText(idleText).width;
        ctx.fillText(idleText, cw / 2 - tw / 2, ch / 2);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [currentTime, playing, mode, simulationEvents, applyEvent, resetToTime]);

  // Reset state when mode changes to idle or recording starts fresh
  useEffect(() => {
    const s = stateRef.current;
    if (mode === 'idle') {
      s.avatars = [];
      s.processedEventCount = 0;
      s.prevSimTime = -1;
    } else if (mode === 'recording') {
      s.avatars = [];
      s.processedEventCount = 0;
      s.prevSimTime = -1;
    } else if (mode === 'replay') {
      s.avatars = [];
      s.processedEventCount = 0;
      s.prevSimTime = -1;
    }
  }, [mode]);

  return (
    <div className="community-canvas-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}
