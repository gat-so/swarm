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
  message_type: 'text' | 'plan' | 'agent_update' | 'execution_result' | 'plan_suggestion';
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

export type GoalType = 'default' | 'learning' | 'custom';
export type LengthType = 'default' | 'longer' | 'shorter';

export interface ChatConfig {
  goal: GoalType;
  length: LengthType;
}

interface ChatPanelProps {
  checkedSourceCount: number;
  metadata: SessionMetadata | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  onSendMessage: (message: string) => void;
  onExecutePlan: (planId: string) => void;
  onCreatePlan: (originalMessage: string) => void;
  executingPlan: boolean;
  metadataLoading: boolean;
  config: ChatConfig;
  onConfigChange: (config: ChatConfig) => void;
  simulationCollapsed: boolean;
  onToggleSimulation: () => void;
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

const PlayArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SimulationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const SwarmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="8" r="3" />
    <circle cx="5" cy="16" r="2.5" />
    <circle cx="19" cy="16" r="2.5" />
    <path d="M12 11v2M8.5 14l-2 1.5M15.5 14l2 1.5" strokeDasharray="2 2" />
  </svg>
);

/* ---- Constants ---- */
const goalHelpers: Record<GoalType, string> = {
  default: 'Best for general purpose research and brainstorming tasks.',
  learning: 'Optimized for step-by-step explanations and educational content.',
  custom: 'Set a custom persona, tone, or focus for your conversation.',
};

const DEFAULT_SUGGESTIONS = [
  'Analyze a document and summarize key findings',
  'Help me draft a professional email',
  'Compare and evaluate multiple options',
  'Create a detailed report on a topic',
];

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
        <span className="chat-plan-card__icon">
          <SwarmIcon />
        </span>
        <span className="chat-plan-card__title">Agent Execution Plan</span>
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
              <div className="chat-plan-agent__header">
                <span className="chat-plan-agent__name">{agent.name}</span>
                <span className="chat-plan-agent__role">{agent.role}</span>
              </div>
              <span className="chat-plan-agent__task">{agent.task}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="chat-plan-card__meta">
        <span>{plan.agents.length} agents</span>
        <span>{plan.execution_order.length} steps</span>
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

function PlanSuggestionCard({
  message,
  originalMessage,
  onCreatePlan,
  disabled,
}: {
  message: string;
  originalMessage: string;
  onCreatePlan: (msg: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="chat-plan-suggestion">
      <div className="chat-plan-suggestion__icon">
        <SwarmIcon />
      </div>
      <div className="chat-plan-suggestion__content">
        <p className="chat-plan-suggestion__text">{message}</p>
        <button
          className="chat-plan-suggestion__btn"
          onClick={() => onCreatePlan(originalMessage)}
          disabled={disabled}
        >
          <SwarmIcon />
          Create Agent Plan
        </button>
      </div>
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
        <span className="chat-execution-result__check">&#10003;</span>
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
  onCreatePlan,
  executingPlan,
  metadataLoading,
  config,
  onConfigChange,
  simulationCollapsed,
  onToggleSimulation,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<ChatConfig>(config);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configTriggerRef = useRef<HTMLButtonElement>(null);
  const configDialogRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasMetadata = metadata?.emoji || metadata?.title || metadata?.description;
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
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
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
    onConfigChange(pendingConfig);
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

  const handleCopy = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(console.error);
  }, []);

  const handleFeedback = useCallback((msgId: string, type: 'up' | 'down') => {
    setFeedbackId(`${msgId}-${type}`);
  }, []);

  const suggestions: string[] = (() => {
    if (metadata?.suggestions) {
      if (Array.isArray(metadata.suggestions)) return metadata.suggestions;
      try {
        const parsed: unknown = JSON.parse(metadata.suggestions as unknown as string);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch { /* ignore */ }
    }
    return [];
  })();

  const showDefaultSuggestions = !hasMessages && !hasMetadata && !metadataLoading;

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

    if (msgType === 'plan_suggestion') {
      try {
        const data = JSON.parse(msg.content) as { message: string; originalMessage: string };
        return (
          <div key={msg.id}>
            <PlanSuggestionCard
              message={data.message}
              originalMessage={data.originalMessage}
              onCreatePlan={onCreatePlan}
              disabled={isStreaming || executingPlan}
            />
          </div>
        );
      } catch {
        return null;
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
      <div key={msg.id} className="chat-message-wrapper">
        <div className="chat-message markdown-body">
          <MarkdownContent content={msg.content} />
        </div>
        <div className="chat-message-actions">
          <button
            className={`icon-btn icon-btn--sm${copiedId === msg.id ? ' icon-btn--active' : ''}`}
            onClick={() => handleCopy(msg.id, msg.content)}
            aria-label="Copy"
            title={copiedId === msg.id ? 'Copied!' : 'Copy'}
          >
            {copiedId === msg.id ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button
            className={`icon-btn icon-btn--sm${feedbackId === `${msg.id}-up` ? ' icon-btn--active' : ''}`}
            onClick={() => handleFeedback(msg.id, 'up')}
            aria-label="Good response"
            title="Good response"
          >
            <ThumbsUpIcon />
          </button>
          <button
            className={`icon-btn icon-btn--sm${feedbackId === `${msg.id}-down` ? ' icon-btn--active' : ''}`}
            onClick={() => handleFeedback(msg.id, 'down')}
            aria-label="Bad response"
            title="Bad response"
          >
            <ThumbsDownIcon />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="chat-panel" id="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <span className="chat-header__title">Chat</span>
          <div className="chat-header__actions">
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
              className={`icon-btn${!simulationCollapsed ? ' icon-btn--active' : ''}`}
              onClick={onToggleSimulation}
              aria-label="Toggle simulation panel"
              title="Toggle simulation panel"
            >
              <SimulationIcon />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="chat-messages">
          {!hasMetadata && !hasMessages && !metadataLoading && (
            <div className="chat-welcome">
              <div className="chat-welcome__logo">
                <SwarmIcon />
              </div>
              <h1 className="chat-welcome__title">SWARM</h1>
              <p className="chat-welcome__subtitle">
                Multi-agent AI assistant. Ask anything, upload documents, or give me a complex task.
              </p>
            </div>
          )}

          {metadataLoading && !hasMetadata && (
            <div className="chat-empty-state">
              <div className="chat-loading-pulse" />
              <span className="chat-empty-state__title">Analyzing sources...</span>
              <span className="chat-empty-state__text">
                Generating a summary and suggested questions from your sources.
              </span>
            </div>
          )}

          {hasMetadata && (
            <div className="chat-title-section">
              <span className="chat-title-section__emoji">{metadata?.emoji || ''}</span>
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

          {showDefaultSuggestions && (
            <div className="chat-suggestions">
              {DEFAULT_SUGGESTIONS.map((q, i) => (
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
              placeholder="Ask anything..."
              rows={1}
              id="chat-input"
              aria-label="Message input"
              disabled={isStreaming || executingPlan}
            />
            {checkedSourceCount > 0 && (
              <span className="chat-source-badge">
                {checkedSourceCount} sources
              </span>
            )}
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
              Customize how SWARM responds to your messages. These settings
              affect the style, depth, and focus of responses.
            </p>

            <p className="configure-chat__section-title">
              Conversational goal
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
              Response length
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
