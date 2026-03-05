import { useState, useRef, useEffect, useCallback } from 'react';
import './ChatPanel.css';

interface ChatPanelProps {
  checkedSourceCount: number;
}

/* ---- Icons ---- */
const ConfigureIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="8" cy="6" r="2" fill="currentColor" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="16" cy="12" r="2" fill="currentColor" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="11" cy="18" r="2" fill="currentColor" />
  </svg>
);

const KebabIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const ThumbsUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
  </svg>
);

const ThumbsDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
    <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

/* ---- Types ---- */
type GoalType = 'default' | 'learning' | 'custom';
type LengthType = 'default' | 'longer' | 'shorter';

interface ChatConfig {
  goal: GoalType;
  length: LengthType;
}

const goalHelpers: Record<GoalType, string> = {
  default: 'Best for general purpose research and brainstorming tasks.',
  learning: 'Optimized for step-by-step explanations and educational content.',
  custom: 'Set a custom persona, tone, or focus for your conversation.',
};

/* ---- Component ---- */
export default function ChatPanel({ checkedSourceCount }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [kebabOpen, setKebabOpen] = useState(false);
  const [config, setConfig] = useState<ChatConfig>({
    goal: 'default',
    length: 'default',
  });
  const [pendingConfig, setPendingConfig] = useState<ChatConfig>(config);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kebabRef = useRef<HTMLDivElement>(null);
  const configTriggerRef = useRef<HTMLButtonElement>(null);
  const configDialogRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [inputValue]);

  // Close kebab popover on outside click
  useEffect(() => {
    if (!kebabOpen) return;
    const handler = (e: MouseEvent) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
        setKebabOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [kebabOpen]);

  // Configure dialog: Escape key + focus trap + focus restore
  useEffect(() => {
    if (!configOpen) return;

    const dialog = configDialogRef.current;
    if (!dialog) return;

    // Capture ref for cleanup
    const triggerEl = configTriggerRef.current;

    // Focus the first focusable element inside the dialog
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfigOpen(false);
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const focusableItems =
          dialog.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusableItems.length === 0) return;

        const first = focusableItems[0];
        const last = focusableItems[focusableItems.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to trigger
      triggerEl?.focus();
    };
  }, [configOpen]);

  const openConfig = useCallback(() => {
    setPendingConfig(config);
    setConfigOpen(true);
  }, [config]);

  const saveConfig = () => {
    setConfig(pendingConfig);
    setConfigOpen(false);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    // For now, just clear — no backend integration
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <section className="chat-panel" id="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <span className="chat-header__title">Chat</span>
          <div className="chat-header__actions" ref={kebabRef}>
            <button
              ref={configTriggerRef}
              className="icon-btn"
              onClick={openConfig}
              aria-label="Configure chat"
              title="Configure chat"
            >
              <ConfigureIcon />
            </button>
            <button
              className="icon-btn"
              onClick={() => setKebabOpen((o) => !o)}
              aria-label="More options"
              title="More options"
            >
              <KebabIcon />
            </button>

            {/* Kebab popover */}
            {kebabOpen && (
              <div className="popover" style={{ top: '100%', right: 0 }}>
                <button
                  type="button"
                  className="popover-item"
                  onClick={() => setKebabOpen(false)}
                >
                  Delete chat history
                </button>
                <div className="popover-note">
                  Chat history is private to you.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          <div className="chat-title-section">
            <span className="chat-title-section__emoji">🐝</span>
            <h1 className="chat-title-section__heading">
              SWARM: Decision Intelligence and Multi-Agent Simulation Framework
            </h1>
            <span className="chat-title-section__badge">
              {checkedSourceCount} sources
            </span>
          </div>

          <div className="chat-message">
            <p>
              The provided documents describe <strong>SWARM</strong> (Simulated
              Workforce of Autonomous Reasoning Minds), an advanced{' '}
              <strong>multi-agent decision intelligence platform</strong>{' '}
              designed for the CCSD Hackathon 2026. Built on the{' '}
              <strong>OpenClaw framework</strong>, the system replaces
              traditional, slow human deliberation with{' '}
              <strong>autonomous AI agents</strong> that simulate complex
              organizational roles like Mayors, CFOs, and Hospital Directors.
              These agents follow a{' '}
              <strong>structured seven-phase negotiation protocol</strong>
              —including debate, coalition building, and weighted voting—to
              resolve high-stakes crises using <strong>
                real-world data
              </strong>{' '}
              and <strong>game theory</strong>.
            </p>
          </div>

          <div className="chat-actions">
            <button
              className="icon-btn"
              aria-label="Save to note"
              title="Save to note"
            >
              <SaveIcon />
            </button>
            <button className="icon-btn" aria-label="Copy" title="Copy">
              <CopyIcon />
            </button>
            <button
              className="icon-btn"
              aria-label="Thumbs up"
              title="Thumbs up"
            >
              <ThumbsUpIcon />
            </button>
            <button
              className="icon-btn"
              aria-label="Thumbs down"
              title="Thumbs down"
            >
              <ThumbsDownIcon />
            </button>
          </div>

          <div className="chat-suggestions">
            <button className="chat-suggestion-chip">
              How do the six specialized AI agents simulate a city council
              negotiation?
            </button>
            <button className="chat-suggestion-chip">
              Explain the 7-phase protocol for reaching an autonomous decision.
            </button>
            <button className="chat-suggestion-chip">
              How does SWARM compare AI-negotiated outcomes to real-world
              historical data?
            </button>
          </div>
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start typing..."
              rows={1}
              id="chat-input"
              aria-label="Message input"
            />
            <span className="chat-source-badge">
              {checkedSourceCount} sources
            </span>
          </div>
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            aria-label="Send message"
            title="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </section>

      {/* Configure Chat Dialog */}
      {configOpen && (
        <div
          className="modal-overlay"
          onClick={() => setConfigOpen(false)}
        >
          <div
            ref={configDialogRef}
            className="modal-content configure-chat"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Configure Chat"
          >
            <div className="configure-chat__header">
              <h2 className="configure-chat__title">Configure Chat</h2>
              <button
                className="icon-btn"
                onClick={() => setConfigOpen(false)}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="configure-chat__desc">
              Notebooks can be customized to help you achieve different goals:
              do research, help learn, show various perspectives, or converse in
              a particular style and tone.
            </p>

            <p className="configure-chat__section-title">
              Define your conversational goal, style, or role
            </p>
            <div className="pill-group">
              {(
                [
                  ['default', 'Default'],
                  ['learning', 'Learning Guide'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`pill-toggle${pendingConfig.goal === key ? ' active' : ''}`}
                  onClick={() => setPendingConfig((c) => ({ ...c, goal: key }))}
                >
                  {pendingConfig.goal === key && <CheckIcon />}
                  {label}
                </button>
              ))}
            </div>
            <p className="configure-chat__helper">
              {goalHelpers[pendingConfig.goal]}
            </p>

            <p className="configure-chat__section-title">
              Choose your response length
            </p>
            <div className="pill-group">
              {(
                [
                  ['default', 'Default'],
                  ['longer', 'Longer'],
                  ['shorter', 'Shorter'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`pill-toggle${pendingConfig.length === key ? ' active' : ''}`}
                  onClick={() =>
                    setPendingConfig((c) => ({ ...c, length: key }))
                  }
                >
                  {pendingConfig.length === key && <CheckIcon />}
                  {label}
                </button>
              ))}
            </div>

            <div className="configure-chat__save-row">
              <button className="configure-chat__save-btn" onClick={saveConfig}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
