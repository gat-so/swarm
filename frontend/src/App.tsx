import { useState, useEffect, useCallback, useRef } from 'react';
import SourcesPanel from './components/SourcesPanel/SourcesPanel';
import ChatPanel from './components/ChatPanel/ChatPanel';
import SimulationPanel from './components/SimulationPanel/SimulationPanel';
import type {
  SourceFile,
  Session,
} from './components/SourcesPanel/SourcesPanel';
import type { ChatMessage, SessionMetadata } from './components/ChatPanel/ChatPanel';

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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Polling ref for metadata
  const metadataPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkedCount = sources.filter((s) => s.checked).length;

  // Helper: parse session row into metadata
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

  // Fetch sessions on mount
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

  // Fetch sources when session changes
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

  // Fetch chat history when session changes
  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/chat/history/${currentSessionId}`)
      .then((res) => res.json())
      .then((data: ChatMessage[]) => {
        setMessages(data);
      })
      .catch(console.error);
  }, [currentSessionId]);

  // Fetch session metadata when session changes
  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/sessions`)
      .then((res) => res.json())
      .then((data: SessionRow[]) => {
        const current = data.find((s) => s.id === currentSessionId);
        if (current) {
          setSessionMetadata(parseSessionMetadata(current));
          // Update session name in sessions list if title is available
          if (current.title) {
            setSessions((prev) =>
              prev.map((s) => (s.id === current.id ? { ...s, name: current.title! } : s)),
            );
          }
        }
      })
      .catch(console.error);
  }, [currentSessionId, parseSessionMetadata]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (metadataPollRef.current) {
        clearInterval(metadataPollRef.current);
      }
    };
  }, []);

  // Handle toggling checked state — persist to backend
  const handleSourcesChange = useCallback(
    (updated: SourceFile[]) => {
      const prev = sources;
      setSources(updated);

      // Find which sources changed and patch them
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

  // Handle file uploads
  const handleUploadFiles = useCallback(
    (files: FileList) => {
      if (!currentSessionId) return;

      // Check if there are currently no sources (first upload)
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

        // Add temp source with uploading state
        const tempSource: SourceFile = {
          id: tempId,
          name: file.name,
          type,
          checked: true,
          uploading: true,
          progress: 0,
        };

        setSources((prev) => [...prev, tempSource]);

        // Upload via XHR for progress tracking
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

            // If this was the first source, start polling for metadata
            if (hadNoSources) {
              setMetadataLoading(true);
              startMetadataPolling();
            }
          } else {
            // Remove failed upload
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

  // Poll for metadata updates (after first source upload)
  const startMetadataPolling = useCallback(() => {
    if (metadataPollRef.current) {
      clearInterval(metadataPollRef.current);
    }

    let attempts = 0;
    const maxAttempts = 30; // 30 * 2s = 60s max

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
            // Metadata is ready!
            setSessionMetadata(parseSessionMetadata(current));
            setMetadataLoading(false);
            if (metadataPollRef.current) clearInterval(metadataPollRef.current);
            // Update session name in sessions list with the generated title
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

  // Send a chat message
  const handleSendMessage = useCallback(
    (message: string) => {
      if (!currentSessionId || isStreaming) return;

      // Optimistically add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStreamingText('');

      // Stream response via SSE
      fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId, message }),
      })
        .then((res) => {
          if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulated = '';

          const readChunk = (): Promise<void> => {
            return reader.read().then(({ done, value }) => {
              if (done) {
                // Stream ended — finalize
                if (accumulated) {
                  const assistantMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: accumulated,
                    created_at: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                }
                setIsStreaming(false);
                setStreamingText('');
                return;
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6)) as {
                      type: string;
                      text?: string;
                      error?: string;
                    };

                    if (data.type === 'chunk' && data.text) {
                      accumulated += data.text;
                      setStreamingText(accumulated);
                    } else if (data.type === 'done') {
                      const finalText = data.text || accumulated;
                      const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: finalText,
                        created_at: new Date().toISOString(),
                      };
                      setMessages((prev) => [...prev, assistantMsg]);
                      setIsStreaming(false);
                      setStreamingText('');
                      return;
                    } else if (data.type === 'error') {
                      console.error('Chat error:', data.error);
                      setIsStreaming(false);
                      setStreamingText('');
                      return;
                    }
                  } catch {
                    // Ignore parse errors for partial lines
                  }
                }
              }

              return readChunk();
            });
          };

          return readChunk();
        })
        .catch((err) => {
          console.error('Chat send error:', err);
          setIsStreaming(false);
          setStreamingText('');
        });
    },
    [currentSessionId, isStreaming],
  );

  // Create new session
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
      })
      .catch(console.error);
  }, []);

  // Select existing session
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    setSessionMetadata(null);
    setStreamingText('');
    setIsStreaming(false);
  }, []);

  // Delete a source
  const handleDeleteSource = useCallback((id: string) => {
    fetch(`/api/sources/${id}`, { method: 'DELETE' })
      .then(() => {
        setSources((prev) => prev.filter((s) => s.id !== id));
      })
      .catch(console.error);
  }, []);

  // Delete a session
  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
        .then((res) => {
          if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
          setSessions((prev) => {
            const remaining = prev.filter((s) => s.id !== sessionId);
            // If we deleted the current session, switch to the first remaining
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
        metadataLoading={metadataLoading}
      />
      <SimulationPanel />
    </div>
  );
}

export default App;
