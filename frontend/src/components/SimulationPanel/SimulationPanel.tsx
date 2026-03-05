import { useState, useRef, useCallback, useEffect } from 'react';
import './SimulationPanel.css';

/* ---- Icons ---- */
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const SkipBackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11 19 2 12 11 5" fill="currentColor" />
    <polygon points="22 19 13 12 22 5" fill="currentColor" />
  </svg>
);

const SkipForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 19 22 12 13 5" fill="currentColor" />
    <polygon points="2 19 11 12 2 5" fill="currentColor" />
  </svg>
);

const SimPlaceholderIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="simulation-player__placeholder-icon"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

/* ---- Helpers ---- */
const SPEEDS = [1, 1.5, 2];
const TOTAL_SECONDS = 408; // 06:48
const SCRUB_STEP = 5; // seconds per arrow key press

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---- Component ---- */
export default function SimulationPanel() {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(29);
  const [speedIndex, setSpeedIndex] = useState(0);
  const scrubberRef = useRef<HTMLDivElement>(null);

  // Refs for drag listeners so they can be cleaned up on unmount
  const onMoveRef = useRef<((ev: MouseEvent) => void) | null>(null);
  const onUpRef = useRef<(() => void) | null>(null);

  const progress = (currentTime / TOTAL_SECONDS) * 100;

  // Playback timer — advance time when playing
  useEffect(() => {
    if (!playing) return;

    const intervalMs = 1000 / SPEEDS[speedIndex];
    const id = setInterval(() => {
      setCurrentTime((prev) => {
        const next = Math.min(prev + 1, TOTAL_SECONDS);
        if (next >= TOTAL_SECONDS) {
          setPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [playing, speedIndex]);

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (onMoveRef.current) {
        document.removeEventListener('mousemove', onMoveRef.current);
      }
      if (onUpRef.current) {
        document.removeEventListener('mouseup', onUpRef.current);
      }
    };
  }, []);

  const cycleSpeed = () => {
    setSpeedIndex((i) => (i + 1) % SPEEDS.length);
  };

  const skipBack = () => {
    setCurrentTime((t) => Math.max(0, t - 10));
  };

  const skipForward = () => {
    setCurrentTime((t) => Math.min(TOTAL_SECONDS, t + 10));
  };

  const handleScrub = useCallback((clientX: number) => {
    const el = scrubberRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setCurrentTime(Math.round(ratio * TOTAL_SECONDS));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    handleScrub(e.clientX);

    const onMove = (ev: MouseEvent) => handleScrub(ev.clientX);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      onMoveRef.current = null;
      onUpRef.current = null;
    };

    onMoveRef.current = onMove;
    onUpRef.current = onUp;

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleScrubberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCurrentTime((t) => Math.min(TOTAL_SECONDS, t + SCRUB_STEP));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentTime((t) => Math.max(0, t - SCRUB_STEP));
    }
  };

  return (
    <section className="simulation-panel" id="simulation-panel">
      {/* Header */}
      <div className="simulation-header">
        <span className="simulation-header__title">Simulation</span>
      </div>

      {/* Player placeholder */}
      <div className="simulation-player">
        <div className="simulation-player__placeholder">
          <SimPlaceholderIcon />
          <span className="simulation-player__placeholder-text">
            Community mini-game simulation
            <br />
            will appear here
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="simulation-timeline">
        <div
          className="simulation-scrubber"
          ref={scrubberRef}
          onMouseDown={handleMouseDown}
          onKeyDown={handleScrubberKeyDown}
          tabIndex={0}
          role="slider"
          aria-label="Simulation timeline"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={TOTAL_SECONDS}
          aria-valuetext={formatTime(currentTime)}
        >
          <div className="simulation-scrubber__track">
            <div
              className="simulation-scrubber__fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="simulation-scrubber__thumb"
            style={{ left: `${progress}%` }}
          />
        </div>
        <div className="simulation-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(TOTAL_SECONDS)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="simulation-controls">
        <button
          className="sim-control-btn sim-control-btn--speed"
          onClick={cycleSpeed}
          aria-label={`Speed ${SPEEDS[speedIndex]}x`}
          title={`Speed ${SPEEDS[speedIndex]}x`}
        >
          {SPEEDS[speedIndex]}X
        </button>

        <button
          className="sim-control-btn"
          onClick={skipBack}
          aria-label="Skip back 10 seconds"
          title="Skip back 10 seconds"
        >
          <SkipBackIcon />
        </button>

        <button
          className="sim-play-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          className="sim-control-btn"
          onClick={skipForward}
          aria-label="Skip forward 10 seconds"
          title="Skip forward 10 seconds"
        >
          <SkipForwardIcon />
        </button>
      </div>
    </section>
  );
}
