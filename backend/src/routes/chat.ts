import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
import openclawClient from '../openclaw.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const router = Router();

// --- Helper: read source file contents for context injection ---
function readSourceContent(sessionId: string, filename: string, originalName: string): string {
  const filePath = path.join(UPLOADS_DIR, sessionId, filename);
  if (!fs.existsSync(filePath)) return '';

  const ext = path.extname(originalName).toLowerCase();
  const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log', '.rtf'];

  if (textExtensions.includes(ext)) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return `[Could not read file: ${originalName}]`;
    }
  }

  // For non-text files, return a placeholder describing the file
  return `[File: ${originalName} (${ext.slice(1).toUpperCase()} format — content not directly readable)]`;
}

// --- Helper: build context from checked sources ---
function buildSourceContext(sessionId: string): string {
  const sources = db.prepare(
    'SELECT filename, original_name, file_type, remote_path FROM sources WHERE session_id = ? AND checked = 1 ORDER BY created_at ASC',
  ).all(sessionId) as Array<{ filename: string; original_name: string; file_type: string; remote_path: string | null }>;

  if (sources.length === 0) return '';

  const parts = sources.map((s, i) => {
    // If we have a remote path on the VPS, reference it so OpenClaw can use its built-in tools
    if (s.remote_path) {
      return `- Source ${i + 1}: ${s.original_name} (available at: ${s.remote_path})`;
    }
    // Fallback: read text content locally
    const content = readSourceContent(sessionId, s.filename, s.original_name);
    return `--- Source ${i + 1}: ${s.original_name} ---\n${content}`;
  });

  return `The user has provided the following source documents. You can read them using the file paths provided.\n\n${parts.join('\n\n')}`;
}

// --- POST /api/chat/send — send message to OpenClaw, stream response back via SSE ---
router.post('/send', (req, res) => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string };

  if (!sessionId || !message) {
    res.status(400).json({ error: 'sessionId and message are required' });
    return;
  }

  if (!openclawClient.isReady()) {
    res.status(503).json({ error: 'OpenClaw is not connected' });
    return;
  }

  // Store user message
  const userMsgId = crypto.randomUUID();
  db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').run(
    userMsgId, sessionId, 'user', message,
  );

  // Build context from sources
  const sourceContext = buildSourceContext(sessionId);
  const fullMessage = sourceContext
    ? `${sourceContext}\n\n---\n\nUser message: ${message}`
    : message;

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let assistantResponse = '';

  // Use the session-specific key so OpenClaw keeps separate conversations
  const sessionKey = `swarm-${sessionId}`;

  openclawClient.sendChatMessage(
    fullMessage,
    sessionKey,
    // onChunk
    (text: string) => {
      assistantResponse += text;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
    },
    // onDone
    (fullText: string) => {
      const finalText = fullText || assistantResponse;

      // Store assistant message
      const assistantMsgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)').run(
        assistantMsgId, sessionId, 'assistant', finalText,
      );

      res.write(`data: ${JSON.stringify({ type: 'done', text: finalText })}\n\n`);
      res.end();
    },
    // onError
    (error: unknown) => {
      console.error('[Chat] OpenClaw error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`);
      res.end();
    },
  );

  // Handle client disconnect
  req.on('close', () => {
    // Client disconnected — the response will naturally end
  });
});

// --- GET /api/chat/history/:sessionId — fetch chat messages ---
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const messages = db.prepare(
    'SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
  ).all(sessionId);

  res.json(messages);
});

// --- POST /api/chat/generate-metadata — generate emoji, title, description, suggestions ---
router.post('/generate-metadata', async (req, res) => {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  if (!openclawClient.isReady()) {
    res.status(503).json({ error: 'OpenClaw is not connected' });
    return;
  }

  // Build context from checked sources
  const sourceContext = buildSourceContext(sessionId);
  if (!sourceContext) {
    res.status(400).json({ error: 'No checked sources found for this session' });
    return;
  }

  const metadataPrompt = `${sourceContext}

---

Based on the source documents above, generate the following metadata to help describe and explore this knowledge base. Respond ONLY with valid JSON in exactly this format, nothing else:

{
  "emoji": "a single relevant emoji",
  "title": "a concise, descriptive title (under 80 characters)",
  "description": "a brief 1-2 sentence summary of what the sources contain",
  "suggestions": ["first suggested question to explore the content", "second suggested question", "third suggested question"]
}

Rules:
- The emoji should be relevant to the topic
- The title should be descriptive and concise
- The description should summarize the key themes
- Generate exactly 3 suggested questions that would help the user explore the content
- Respond ONLY with the JSON object, no markdown formatting or extra text`;

  try {
    const sessionKey = `swarm-metadata-${sessionId}`;
    let fullResponse = '';

    await new Promise<void>((resolve, reject) => {
      openclawClient.sendChatMessage(
        metadataPrompt,
        sessionKey,
        (text: string) => { fullResponse += text; },
        (finalText: string) => {
          fullResponse = finalText || fullResponse;
          resolve();
        },
        (error: unknown) => { reject(error); },
      );
    });

    // Parse the JSON response — handle potential markdown wrapping
    let cleaned = fullResponse.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let metadata: { emoji?: string; title?: string; description?: string; suggestions?: string[] };
    try {
      metadata = JSON.parse(cleaned) as typeof metadata;
    } catch {
      console.error('[Chat] Failed to parse metadata JSON:', cleaned);
      // Fallback — try to extract JSON from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch?.[0]) {
        metadata = JSON.parse(jsonMatch[0]) as typeof metadata;
      } else {
        res.status(500).json({ error: 'Failed to parse metadata from OpenClaw response' });
        return;
      }
    }

    // Update session in DB
    const suggestionsJson = JSON.stringify(metadata.suggestions || []);
    const metadataTitle = metadata.title || 'Untitled';
    db.prepare(
      'UPDATE sessions SET name = ?, emoji = ?, title = ?, description = ?, suggestions = ? WHERE id = ?',
    ).run(
      metadataTitle,
      metadata.emoji || '📄',
      metadataTitle,
      metadata.description || '',
      suggestionsJson,
      sessionId,
    );

    const updated = db.prepare(
      'SELECT id, name, emoji, title, description, suggestions, created_at FROM sessions WHERE id = ?',
    ).get(sessionId);

    res.json(updated);
  } catch (err) {
    console.error('[Chat] Metadata generation failed:', err);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

export default router;
