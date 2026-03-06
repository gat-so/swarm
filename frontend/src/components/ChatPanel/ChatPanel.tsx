import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import './ChatPanel.css';

/* ---- Types ---- */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: 'text' | 'plan' | 'agent_update' | 'execution_result';
  created_at: string;
}

export interface SessionMetadata {
  emoji: string | null;
  title: string | null;
  description: string | null;
  suggestions: string[] | null;
}

export interface PlanData {
  needs_plan: boolean;
  plan_summary: string;
  agents: Array<{
    id: string;
    name: string;
    role: string;
    task: string;
    color: string;
  }>;
  execution_order: string[][];
  estimated_duration: number;
  expected_output: string;
}

export interface AgentUpdateData {
  agentId: string;
  agentName: string;
  agentColor: string;
  message: string;
}

export type SimulationMode = 'idle' | 'recording' | 'replay';

export interface SimulationEvent {
  type: 'spawn' | 'move' | 'say' | 'move_and_say' | 'remove' | 'done';
  agentId: string;
  timestamp: number;
  name?: string;
  color?: string;
  skinColor?: string;
  x?: number;
  y?: number;
  message?: string;
}

interface ChatPanelProps {
  checkedSourceCount: number;
  metadata: SessionMetadata | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  onSendMessage: (message: string) => void;
  onExecutePlan: (planId: string) => void;
  executingPlan: boolean;
  metadataLoading: boolean;
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

const EmptyChatIcon = () => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className="empty-state__icon"
  >
    <path d="M52 38a4 4 0 01-4 4H18l-8 8V14a4 4 0 014-4h34a4 4 0 014 4z" />
    <line x1="20" y1="22" x2="44" y2="22" />
    <line x1="20" y1="28" x2="38" y2="28" />
    <line x1="20" y1="34" x2="32" y2="34" />
  </svg>
);

const PlayArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M8 5v14l11-7z" />
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

/* ---- Markdown renderer ---- */

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const isDownload = href?.includes('/api/files/download/');
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...(isDownload ? { download: '' } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
};

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}

/* ---- Sub-components ---- */

function PlanCard({
  plan,
  planId,
  onExecute,
  executing,
}: {
  plan: PlanData;
  planId: string;
  onExecute: (planId: string) => void;
  executing: boolean;
}) {
  return (
    <div className="chat-plan-card">
      <div className="chat-plan-card__header">
        <span className="chat-plan-card__icon">📋</span>
        <span className="chat-plan-card__title">Execution Plan</span>
      </div>
      <p className="chat-plan-card__summary">{plan.plan_summary}</p>

      <div className="chat-plan-card__agents">
        {plan.agents.map((agent) => (
          <div key={agent.id} className="chat-plan-agent">
            <span
              className="chat-plan-agent__dot"
              style={{ background: agent.color }}
            />
            <div className="chat-plan-agent__info">
              <span className="chat-plan-agent__name">{agent.name}</span>
              <span className="chat-plan-agent__task">{agent.task}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-plan-card__meta">
        <span>{plan.agents.length} agents</span>
        <span>~{Math.ceil(plan.estimated_duration / 60)} min</span>
      </div>

      <button
        className="chat-execute-btn"
        onClick={() => onExecute(planId)}
        disabled={executing}
      >
        {executing ? (
          <>
            <span className="chat-execute-btn__spinner" />
            Executing...
          </>
        ) : (
          <>
            <PlayArrowIcon />
            Execute Plan
          </>
        )}
      </button>
    </div>
  );
}

function AgentUpdateMessage({ data }: { data: AgentUpdateData }) {
  return (
    <div className="chat-agent-update">
      <span
        className="chat-agent-update__dot"
        style={{ background: data.agentColor }}
      />
      <div className="chat-agent-update__content">
        <span className="chat-agent-update__name">{data.agentName}</span>
        <span className="chat-agent-update__text">{data.message}</span>
      </div>
    </div>
  );
}

function ExecutionResultMessage({ content }: { content: string }) {
  return (
    <div className="chat-execution-result">
      <div className="chat-execution-result__header">
        <span>✅</span>
        <span>Task Complete</span>
      </div>
      <div className="chat-execution-result__body markdown-body">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}

/* ---- Component ---- */
export default function ChatPanel({
  checkedSourceCount,
  metadata,
  messages,
  isStreaming,
  streamingText,
  onSendMessage,
  onExecutePlan,
  executingPlan,
  metadataLoading,
}: ChatPanelProps) {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMetadata = metadata?.emoji || metadata?.title || metadata?.description;
  const hasSources = checkedSourceCount > 0;
  const hasMessages = messages.length > 0;

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

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

  useEffect(() => {
    if (!configOpen) return;

    const dialog = configDialogRef.current;
    if (!dialog) return;

    const triggerEl = configTriggerRef.current;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfigOpen(false);
        return;
      }

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
    if (!inputValue.trim() || isStreaming || executingPlan) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isStreaming || executingPlan) return;
    onSendMessage(suggestion);
  };

  const suggestions: string[] = (() => {
    if (!metadata?.suggestions) return [];
    if (Array.isArray(metadata.suggestions)) return metadata.suggestions;
    try {
      const parsed: unknown = JSON.parse(metadata.suggestions as unknown as string);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch { /* ignore */ }
    return [];
  })();

  const renderMessage = (msg: ChatMessage) => {
    if (msg.role === 'user') {
      return (
        <div key={msg.id} className="chat-user-message">
          {msg.content}
        </div>
      );
    }

    const msgType = msg.message_type || 'text';

    if (msgType === 'plan') {
      try {
        const planData = JSON.parse(msg.content) as PlanData;
        return (
          <div key={msg.id} className="chat-message">
            <PlanCard
              plan={planData}
              planId={msg.id}
              onExecute={onExecutePlan}
              executing={executingPlan}
            />
          </div>
        );
      } catch {
        return (
          <div key={msg.id} className="chat-message markdown-body">
            <MarkdownContent content={msg.content} />
          </div>
        );
      }
    }

    if (msgType === 'agent_update') {
      try {
        const updateData = JSON.parse(msg.content) as AgentUpdateData;
        return (
          <div key={msg.id}>
            <AgentUpdateMessage data={updateData} />
          </div>
        );
      } catch {
        return (
          <div key={msg.id} className="chat-message markdown-body">
            <MarkdownContent content={msg.content} />
          </div>
        );
      }
    }

    if (msgType === 'execution_result') {
      return (
        <div key={msg.id}>
          <ExecutionResultMessage content={msg.content} />
        </div>
      );
    }

    return (
      <div key={msg.id} className="chat-message markdown-body">
        <MarkdownContent content={msg.content} />
      </div>
    );
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

        {/* Messages area */}
        <div className="chat-messages">
          {!hasSources && !hasMetadata && !hasMessages && (
            <div className="chat-empty-state">
              <EmptyChatIcon />
              <span className="chat-empty-state__title">Start a conversation</span>
              <span className="chat-empty-state__text">
                Add sources to your session, then ask questions about them.
                The AI will use your sources as knowledge.
              </span>
            </div>
          )}

          {metadataLoading && !hasMetadata && (
            <div className="chat-empty-state">
              <div className="chat-loading-pulse" />
              <span className="chat-empty-state__title">Analyzing sources…</span>
              <span className="chat-empty-state__text">
                Generating a summary and suggested questions from your sources.
              </span>
            </div>
          )}

          {hasMetadata && (
            <div className="chat-title-section">
              <span className="chat-title-section__emoji">{metadata?.emoji || '📄'}</span>
              <h1 className="chat-title-section__heading">
                {metadata?.title || 'Untitled Session'}
              </h1>
              <span className="chat-title-section__badge">
                {checkedSourceCount} sources
              </span>
            </div>
          )}

          {hasMetadata && metadata?.description && !hasMessages && (
            <div className="chat-message markdown-body">
              <MarkdownContent content={metadata.description} />
            </div>
          )}

          {messages.map(renderMessage)}

          {isStreaming && streamingText && (
            <div className="chat-message chat-message--streaming markdown-body">
              <MarkdownContent content={streamingText} />
            </div>
          )}

          {isStreaming && !streamingText && (
            <div className="chat-message chat-message--streaming">
              <div className="chat-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {hasMessages && !isStreaming && !executingPlan && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.message_type === 'text' && (
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
          )}

          {suggestions.length > 0 && !hasMessages && (
            <div className="chat-suggestions">
              {suggestions.map((q, i) => (
                <button
                  key={i}
                  className="chat-suggestion-chip"
                  onClick={() => handleSuggestionClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <div className="chat-input-wrapper">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasSources ? 'Ask about your sources...' : 'Add sources to start chatting...'}
              rows={1}
              id="chat-input"
              aria-label="Message input"
              disabled={isStreaming || executingPlan}
            />
            <span className="chat-source-badge">
              {checkedSourceCount} sources
            </span>
          </div>
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming || executingPlan}
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
