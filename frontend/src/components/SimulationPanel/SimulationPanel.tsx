import { useState, useRef, useCallback, useEffect } from 'react';
import './SimulationPanel.css';
import CommunityCanvas from './CommunityCanvas';
import type { SimulationMode, SimulationEvent } from '../ChatPanel/ChatPanel';

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

/* ---- Helpers ---- */
const SPEEDS = [1, 1.5, 2];
const SCRUB_STEP = 5;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ---- Props ---- */
interface SimulationPanelProps {
  mode: SimulationMode;
  simulationEvents: SimulationEvent[];
}

/* ---- Component ---- */
export default function SimulationPanel({
  mode,
  simulationEvents,
}: SimulationPanelProps) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const onMoveRef = useRef<((ev: MouseEvent) => void) | null>(null);
  const onUpRef = useRef<(() => void) | null>(null);

  // Derive total duration from last event timestamp
  const totalSeconds = (() => {
    if (simulationEvents.length === 0) return 0;
    const lastEvent = simulationEvents[simulationEvents.length - 1];
    return Math.ceil(lastEvent.timestamp / 1000) + 2;
  })();

  const progress = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;

  // Reset playback state when mode changes
  useEffect(() => {
    if (mode === 'replay') {
      setCurrentTime(0);
      setPlaying(false);
    } else if (mode === 'recording') {
      setCurrentTime(0);
      setPlaying(false);
    }
  }, [mode]);

  // Playback timer in replay mode
  useEffect(() => {
    if (mode !== 'replay' || !playing || totalSeconds === 0) return;

    const intervalMs = 1000 / SPEEDS[speedIndex];
    const id = setInterval(() => {
      setCurrentTime((prev) => {
        const next = Math.min(prev + 1, totalSeconds);
        if (next >= totalSeconds) {
          setPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [mode, playing, speedIndex, totalSeconds]);

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
    setCurrentTime((t) => Math.min(totalSeconds, t + 10));
  };

  const handleScrub = useCallback(
    (clientX: number) => {
      const el = scrubberRef.current;
      if (!el || totalSeconds === 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setCurrentTime(Math.round(ratio * totalSeconds));
    },
    [totalSeconds],
  );

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
      setCurrentTime((t) => Math.min(totalSeconds, t + SCRUB_STEP));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setCurrentTime((t) => Math.max(0, t - SCRUB_STEP));
    }
  };

  const isReplay = mode === 'replay';
  const isRecording = mode === 'recording';

  return (
    <section className="simulation-panel" id="simulation-panel">
      {/* Header */}
      <div className="simulation-header">
        <span className="simulation-header__title">Simulation</span>
        {isRecording && (
          <span className="simulation-rec-badge">
            <span className="simulation-rec-badge__dot" />
            REC
          </span>
        )}
      </div>

      {/* Player area */}
      <div className="simulation-player">
        <CommunityCanvas
          currentTime={currentTime}
          playing={playing}
          mode={mode}
          simulationEvents={simulationEvents}
        />
      </div>

      {/* Timeline — only visible in replay mode */}
      {isReplay && totalSeconds > 0 && (
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
            aria-valuemax={totalSeconds}
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
            <span>{formatTime(totalSeconds)}</span>
          </div>
        </div>
      )}

      {/* Controls — only visible in replay mode */}
      {isReplay && totalSeconds > 0 && (
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
      )}
    </section>
  );
}
