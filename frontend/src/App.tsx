import { useState, useEffect, useCallback, useRef } from 'react';
import SourcesPanel from './components/SourcesPanel/SourcesPanel';
import ChatPanel from './components/ChatPanel/ChatPanel';
import SimulationPanel from './components/SimulationPanel/SimulationPanel';
import type {
  SourceFile,
  Session,
} from './components/SourcesPanel/SourcesPanel';
import type {
  ChatMessage,
  SessionMetadata,
  SimulationMode,
  SimulationEvent,
  PlanData,
  AgentUpdateData,
  ChatConfig,
} from './components/ChatPanel/ChatPanel';

interface SessionRow {
  id: string;
  name: string;
  emoji: string | null;
  title: string | null;
  description: string | null;
  suggestions: string | null;
  created_at: string;
}

function App() {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [chatConfig, setChatConfig] = useState<ChatConfig>({ goal: 'default', length: 'default' });

  const [simulationMode, setSimulationMode] = useState<SimulationMode>('idle');
  const [simulationEvents, setSimulationEvents] = useState<SimulationEvent[]>([]);
  const [executingPlan, setExecutingPlan] = useState(false);
  const [simulationCollapsed, setSimulationCollapsed] = useState(true);

  const metadataPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkedCount = sources.filter((s) => s.checked).length;

  const parseSessionMetadata = useCallback((session: SessionRow): SessionMetadata => {
    let suggestions: string[] | null = null;
    if (session.suggestions) {
      try {
        const parsed: unknown = JSON.parse(session.suggestions);
        if (Array.isArray(parsed)) suggestions = parsed as string[];
      } catch { /* ignore */ }
    }
    return {
      emoji: session.emoji,
      title: session.title,
      description: session.description,
      suggestions,
    };
  }, []);

  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data: SessionRow[]) => {
        setSessions(data.map((s) => ({ id: s.id, name: s.name, created_at: s.created_at })));
        if (data.length > 0 && data[0]) {
          setCurrentSessionId(data[0].id);
          setSessionMetadata(parseSessionMetadata(data[0]));
        }
      })
      .catch(console.error);
  }, [parseSessionMetadata]);

  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/sources?sessionId=${currentSessionId}`)
      .then((res) => res.json())
      .then(
        (
          data: Array<{
            id: string;
            original_name: string;
            file_type: string;
            checked: number;
          }>,
        ) => {
          setSources(
            data.map((s) => ({
              id: s.id,
              name: s.original_name,
              type: s.file_type as SourceFile['type'],
              checked: s.checked === 1,
            })),
          );
        },
      )
      .catch(console.error);
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/chat/history/${currentSessionId}`)
      .then((res) => res.json())
      .then((data: ChatMessage[]) => {
        setMessages(data);
      })
      .catch(console.error);
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/sessions`)
      .then((res) => res.json())
      .then((data: SessionRow[]) => {
        const current = data.find((s) => s.id === currentSessionId);
        if (current) {
          setSessionMetadata(parseSessionMetadata(current));
          if (current.title) {
            setSessions((prev) =>
              prev.map((s) => (s.id === current.id ? { ...s, name: current.title! } : s)),
            );
          }
        }
      })
      .catch(console.error);
  }, [currentSessionId, parseSessionMetadata]);

  useEffect(() => {
    return () => {
      if (metadataPollRef.current) {
        clearInterval(metadataPollRef.current);
      }
    };
  }, []);

  const handleSourcesChange = useCallback(
    (updated: SourceFile[]) => {
      const prev = sources;
      setSources(updated);

      for (const source of updated) {
        const old = prev.find((s) => s.id === source.id);
        if (old && old.checked !== source.checked) {
          fetch(`/api/sources/${source.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checked: source.checked }),
          }).catch(console.error);
        }
      }
    },
    [sources],
  );

  const handleUploadFiles = useCallback(
    (files: FileList) => {
      if (!currentSessionId) return;

      const hadNoSources = sources.length === 0;

      Array.from(files).forEach((file) => {
        const tempId = crypto.randomUUID();
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        let type: SourceFile['type'] = 'other';
        if (ext === 'pdf') type = 'pdf';
        else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext))
          type = 'image';
        else if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
          type = 'doc';
        else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext))
          type = 'audio';

        const tempSource: SourceFile = {
          id: tempId,
          name: file.name,
          type,
          checked: true,
          uploading: true,
          progress: 0,
        };

        setSources((prev) => [...prev, tempSource]);

        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('sessionId', currentSessionId);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            setSources((prev) =>
              prev.map((s) =>
                s.id === tempId ? { ...s, progress: percent } : s,
              ),
            );
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            const created = JSON.parse(xhr.responseText) as {
              id: string;
              original_name: string;
              file_type: string;
              checked: number;
            };
            setSources((prev) =>
              prev.map((s) =>
                s.id === tempId
                  ? {
                      id: created.id,
                      name: created.original_name,
                      type: created.file_type as SourceFile['type'],
                      checked: created.checked === 1,
                      uploading: false,
                      progress: 100,
                    }
                  : s,
              ),
            );

            if (hadNoSources) {
              setMetadataLoading(true);
              startMetadataPolling();
            }
          } else {
            setSources((prev) => prev.filter((s) => s.id !== tempId));
          }
        });

        xhr.addEventListener('error', () => {
          setSources((prev) => prev.filter((s) => s.id !== tempId));
        });

        xhr.open('POST', '/api/sources/upload');
        xhr.send(formData);
      });
    },
    [currentSessionId, sources],
  );

  const startMetadataPolling = useCallback(() => {
    if (metadataPollRef.current) {
      clearInterval(metadataPollRef.current);
    }

    let attempts = 0;
    const maxAttempts = 30;

    metadataPollRef.current = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts || !currentSessionId) {
        if (metadataPollRef.current) clearInterval(metadataPollRef.current);
        setMetadataLoading(false);
        return;
      }

      fetch('/api/sessions')
        .then((res) => res.json())
        .then((data: SessionRow[]) => {
          const current = data.find((s) => s.id === currentSessionId);
          if (current?.emoji || current?.title) {
            setSessionMetadata(parseSessionMetadata(current));
            setMetadataLoading(false);
            if (metadataPollRef.current) clearInterval(metadataPollRef.current);
            if (current.title) {
              setSessions((prev) =>
                prev.map((s) => (s.id === current.id ? { ...s, name: current.title! } : s)),
              );
            }
          }
        })
        .catch(console.error);
    }, 2000);
  }, [currentSessionId, parseSessionMetadata]);

  const readSSEStream = useCallback(
    (
      response: Response,
      handlers: {
        onDelta?: (text: string) => void;
        onPlan?: (planId: string, plan: PlanData) => void;
        onDone?: (text: string, messageType: string) => void;
        onSuggestPlan?: (message: string, originalMessage: string) => void;
        onSimEvent?: (event: SimulationEvent) => void;
        onAgentUpdate?: (data: AgentUpdateData & { timestamp: number }) => void;
        onExecutionComplete?: (text: string) => void;
        onError?: (error: string) => void;
      },
    ) => {
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const readChunk = (): Promise<void> => {
        return reader.read().then(({ done, value }) => {
          if (done) return;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

              if (data.type === 'delta') {
                handlers.onDelta?.(data.text as string);
              } else if (data.type === 'plan') {
                handlers.onPlan?.(
                  data.planId as string,
                  data.plan as PlanData,
                );
              } else if (data.type === 'done') {
                handlers.onDone?.(
                  data.text as string,
                  (data.messageType as string) || 'text',
                );
              } else if (data.type === 'suggest_plan') {
                handlers.onSuggestPlan?.(
                  data.message as string,
                  data.originalMessage as string,
                );
              } else if (data.type === 'sim_event') {
                handlers.onSimEvent?.(data.event as SimulationEvent);
              } else if (data.type === 'agent_update') {
                handlers.onAgentUpdate?.(data as unknown as AgentUpdateData & { timestamp: number });
              } else if (data.type === 'execution_complete') {
                handlers.onExecutionComplete?.(data.text as string);
              } else if (data.type === 'error') {
                handlers.onError?.(data.error as string);
              }
            } catch {
              // partial line
            }
          }

          return readChunk();
        });
      };

      return readChunk();
    },
    [],
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!currentSessionId || isStreaming || executingPlan) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        message_type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingText('');

      fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message,
          goal: chatConfig.goal,
          length: chatConfig.length,
        }),
      })
        .then((res) => {
          return readSSEStream(res, {
            onDelta: (text) => {
              setStreamingText(text);
            },
            onPlan: (planId, plan) => {
              const planMsg: ChatMessage = {
                id: planId,
                role: 'assistant',
                content: JSON.stringify(plan),
                message_type: 'plan',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, planMsg]);
              setIsStreaming(false);
              setStreamingText('');
            },
            onDone: (text) => {
              const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: text,
                message_type: 'text',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsStreaming(false);
              setStreamingText('');
            },
            onSuggestPlan: (suggestionMsg, originalMessage) => {
              const suggestion: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: JSON.stringify({ message: suggestionMsg, originalMessage }),
                message_type: 'plan_suggestion',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, suggestion]);
            },
            onError: (error) => {
              console.error('Chat error:', error);
              setIsStreaming(false);
              setStreamingText('');
            },
          });
        })
        .catch((err) => {
          console.error('Chat send error:', err);
          setIsStreaming(false);
          setStreamingText('');
        });
    },
    [currentSessionId, isStreaming, executingPlan, readSSEStream, chatConfig],
  );

  const handleCreatePlan = useCallback(
    (originalMessage: string) => {
      if (!currentSessionId || isStreaming || executingPlan) return;

      setIsStreaming(true);
      setStreamingText('');

      fetch('/api/chat/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, message: originalMessage }),
      })
        .then((res) => {
          return readSSEStream(res, {
            onPlan: (planId, plan) => {
              const planMsg: ChatMessage = {
                id: planId,
                role: 'assistant',
                content: JSON.stringify(plan),
                message_type: 'plan',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, planMsg]);
              setIsStreaming(false);
              setStreamingText('');
            },
            onDone: (text) => {
              const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: text,
                message_type: 'text',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsStreaming(false);
              setStreamingText('');
            },
            onError: (error) => {
              console.error('Plan error:', error);
              setIsStreaming(false);
              setStreamingText('');
            },
          });
        })
        .catch((err) => {
          console.error('Plan create error:', err);
          setIsStreaming(false);
          setStreamingText('');
        });
    },
    [currentSessionId, isStreaming, executingPlan, readSSEStream],
  );

  const handleExecutePlan = useCallback(
    (planId: string) => {
      if (!currentSessionId || executingPlan) return;

      setExecutingPlan(true);
      setSimulationMode('recording');
      setSimulationEvents([]);
      setSimulationCollapsed(false);

      fetch('/api/chat/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, planId }),
      })
        .then((res) => {
          return readSSEStream(res, {
            onSimEvent: (event) => {
              setSimulationEvents((prev) => [...prev, event]);
            },
            onAgentUpdate: (data) => {
              const updateMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: JSON.stringify({
                  agentId: data.agentId,
                  agentName: data.agentName,
                  agentColor: data.agentColor,
                  message: data.message,
                }),
                message_type: 'agent_update',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, updateMsg]);
            },
            onExecutionComplete: (text) => {
              const resultMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: text,
                message_type: 'execution_result',
                created_at: new Date().toISOString(),
              };
              setMessages((prev) => [...prev, resultMsg]);
              setExecutingPlan(false);
              setSimulationMode('replay');
            },
            onError: (error) => {
              console.error('Execution error:', error);
              setExecutingPlan(false);
              setSimulationMode('replay');
            },
          });
        })
        .catch((err) => {
          console.error('Execute error:', err);
          setExecutingPlan(false);
          setSimulationMode('idle');
        });
    },
    [currentSessionId, executingPlan, readSSEStream],
  );

  const handleNewSession = useCallback(() => {
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((session: Session) => {
        setSessions((prev) => [session, ...prev]);
        setCurrentSessionId(session.id);
        setSessionMetadata(null);
        setMessages([]);
        setSimulationMode('idle');
        setSimulationEvents([]);
        setExecutingPlan(false);
        setSimulationCollapsed(true);
      })
      .catch(console.error);
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    setSessionMetadata(null);
    setStreamingText('');
    setIsStreaming(false);
    setSimulationMode('idle');
    setSimulationEvents([]);
    setExecutingPlan(false);
    setSimulationCollapsed(true);
  }, []);

  const handleDeleteSource = useCallback((id: string) => {
    fetch(`/api/sources/${id}`, { method: 'DELETE' })
      .then(() => {
        setSources((prev) => prev.filter((s) => s.id !== id));
      })
      .catch(console.error);
  }, []);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
          setSessions((prev) => {
            const remaining = prev.filter((s) => s.id !== sessionId);
            if (sessionId === currentSessionId && remaining.length > 0 && remaining[0]) {
              setCurrentSessionId(remaining[0].id);
            } else if (remaining.length === 0) {
              setCurrentSessionId(null);
              setSources([]);
              setMessages([]);
              setSessionMetadata(null);
            }
            return remaining;
          });
        })
        .catch(console.error);
    },
    [currentSessionId],
  );

  const handleToggleSimulation = useCallback(() => {
    setSimulationCollapsed((prev) => !prev);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <SourcesPanel
        sources={sources}
        onSourcesChange={handleSourcesChange}
        onUploadFiles={handleUploadFiles}
        onDeleteSource={handleDeleteSource}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />
      <ChatPanel
        checkedSourceCount={checkedCount}
        metadata={sessionMetadata}
        messages={messages}
        isStreaming={isStreaming}
        streamingText={streamingText}
        onSendMessage={handleSendMessage}
        onExecutePlan={handleExecutePlan}
        onCreatePlan={handleCreatePlan}
        executingPlan={executingPlan}
        metadataLoading={metadataLoading}
        config={chatConfig}
        onConfigChange={setChatConfig}
        simulationCollapsed={simulationCollapsed}
        onToggleSimulation={handleToggleSimulation}
      />
      {!simulationCollapsed && (
        <SimulationPanel
          mode={simulationMode}
          simulationEvents={simulationEvents}
        />
      )}
    </div>
  );
}

export default App;
