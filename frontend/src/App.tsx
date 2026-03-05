import { useState, useEffect, useCallback } from 'react';
import SourcesPanel from './components/SourcesPanel/SourcesPanel';
import ChatPanel from './components/ChatPanel/ChatPanel';
import SimulationPanel from './components/SimulationPanel/SimulationPanel';
import type {
  SourceFile,
  Session,
} from './components/SourcesPanel/SourcesPanel';

function App() {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const checkedCount = sources.filter((s) => s.checked).length;

  // Fetch sessions on mount
  useEffect(() => {
    fetch('/api/sessions')
      .then((res) => res.json())
      .then((data: Session[]) => {
        setSessions(data);
        if (data.length > 0 && data[0]) {
          setCurrentSessionId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

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
    [currentSessionId],
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
      })
      .catch(console.error);
  }, []);

  // Select existing session
  const handleSelectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
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
        .then(() => {
          setSessions((prev) => {
            const remaining = prev.filter((s) => s.id !== sessionId);
            // If we deleted the current session, switch to the first remaining
            if (sessionId === currentSessionId && remaining.length > 0 && remaining[0]) {
              setCurrentSessionId(remaining[0].id);
            } else if (remaining.length === 0) {
              setCurrentSessionId(null);
              setSources([]);
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
      <ChatPanel checkedSourceCount={checkedCount} />
      <SimulationPanel />
    </div>
  );
}

export default App;
