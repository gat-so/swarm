import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
import openclawClient from '../openclaw.js';
import { uploadToVPS, deleteFromVPS } from '../sftp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// --- Helper: trigger metadata generation via OpenClaw ---
async function triggerMetadataGeneration(sessionId: string): Promise<void> {
  if (!openclawClient.isReady()) {
    console.log('[Sources] OpenClaw not ready, skipping metadata generation');
    return;
  }

  // Get sources with their remote paths
  const sources = db.prepare(
    'SELECT filename, original_name, file_type, remote_path FROM sources WHERE session_id = ? AND checked = 1 ORDER BY created_at ASC',
  ).all(sessionId) as Array<{ filename: string; original_name: string; file_type: string; remote_path: string | null }>;

  if (sources.length === 0) return;

  // Build context referencing VPS file paths so OpenClaw can use its built-in tools
  const fileList = sources.map((s, i) => {
    if (s.remote_path) {
      return `- Source ${i + 1}: ${s.original_name} (available at: ${s.remote_path})`;
    }
    // Fallback: try to read text content locally
    const filePath = path.join(UPLOADS_DIR, sessionId, s.filename);
    const ext = path.extname(s.original_name).toLowerCase();
    const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log', '.rtf'];
    if (textExtensions.includes(ext) && fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return `--- Source ${i + 1}: ${s.original_name} ---\n${content}`;
      } catch { /* fallback below */ }
    }
    return `- Source ${i + 1}: ${s.original_name}`;
  });

  const metadataPrompt = `The user has uploaded the following source documents. You can read them using the file paths provided.

${fileList.join('\n')}

Based on these source documents, generate the following metadata. Respond ONLY with valid JSON in exactly this format, nothing else:

{
  "emoji": "a single relevant emoji",
  "title": "a concise, descriptive title (under 80 characters)",
  "description": "a brief 1-2 sentence summary of what the sources contain",
  "suggestions": ["first suggested question", "second suggested question", "third suggested question"]
}`;

  let fullResponse = '';

  await new Promise<void>((resolve, reject) => {
    openclawClient.sendChatMessage(
      metadataPrompt,
      `swarm-metadata-${sessionId}`,
      (text: string) => { fullResponse += text; },
      (finalText: string) => { fullResponse = finalText || fullResponse; resolve(); },
      (error: unknown) => { reject(error); },
    );
  });

  // Parse
  let cleaned = fullResponse.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch?.[0]) {
    console.error('[Sources] Could not extract JSON from metadata response');
    return;
  }

  const metadata = JSON.parse(jsonMatch[0]) as {
    emoji?: string; title?: string; description?: string; suggestions?: string[];
  };

  const metadataTitle = metadata.title || 'Untitled';

  db.prepare(
    'UPDATE sessions SET name = ?, emoji = ?, title = ?, description = ?, suggestions = ? WHERE id = ?',
  ).run(
    metadataTitle,
    metadata.emoji || '📄',
    metadataTitle,
    metadata.description || '',
    JSON.stringify(metadata.suggestions || []),
    sessionId,
  );

  console.log('[Sources] Metadata generated for session', sessionId);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sessionId = (_req.body?.sessionId as string) || 'default';
    const sessionDir = path.join(UPLOADS_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const router = Router();

// Helper: determine file type from extension
function getFileType(
  filename: string,
): 'pdf' | 'image' | 'doc' | 'audio' | 'other' {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext))
    return 'image';
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'doc';
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return 'audio';
  return 'other';
}

// GET /api/sources?sessionId=<id>
router.get('/', (req, res) => {
  console.log('[GET /api/sources] sessionId:', req.query.sessionId);
  const sessionId = req.query.sessionId as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId query parameter is required' });
    return;
  }

  const sources = db
    .prepare(
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, remote_path, created_at FROM sources WHERE session_id = ? ORDER BY created_at ASC',
    )
    .all(sessionId);

  res.json(sources);
});

// POST /api/sources/upload
router.post('/upload', upload.single('file'), (req, res) => {
  console.log('[POST /api/sources/upload] file:', req.file?.originalname, 'sessionId:', req.body?.sessionId);
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const sessionId = (req.body?.sessionId as string) || null;
  if (!sessionId) {
    // Clean up the uploaded file if no session
    fs.unlinkSync(file.path);
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  // Check source count BEFORE inserting
  const countBefore = db.prepare(
    'SELECT COUNT(*) as count FROM sources WHERE session_id = ?',
  ).get(sessionId) as { count: number };

  const id = crypto.randomUUID();
  const fileType = getFileType(file.originalname);

  db.prepare(
    'INSERT INTO sources (id, session_id, filename, original_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, sessionId, file.filename, file.originalname, fileType, file.size);

  const source = db
    .prepare(
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, remote_path, created_at FROM sources WHERE id = ?',
    )
    .get(id);

  res.status(201).json(source);

  // Upload to VPS via SFTP (fire-and-forget, don't block the response)
  const localPath = file.path;
  const remoteFileName = file.originalname; // Use original name so OpenClaw sees readable filenames
  const remoteSubdir = `swarm-sources/${sessionId}`;

  uploadToVPS(localPath, remoteFileName, remoteSubdir)
    .then((remotePath) => {
      // Store the remote path in DB
      db.prepare('UPDATE sources SET remote_path = ? WHERE id = ?').run(remotePath, id);
      console.log(`[Sources] Uploaded to VPS: ${remotePath}`);

      // If this was the first source, trigger metadata generation
      if (countBefore.count === 0) {
        console.log('[Sources] First source added to session', sessionId, '— triggering metadata generation');
        return triggerMetadataGeneration(sessionId);
      }
    })
    .catch((err: unknown) => {
      console.error('[Sources] VPS upload failed:', err);
      // Still trigger metadata if first source — will use local text fallback
      if (countBefore.count === 0) {
        triggerMetadataGeneration(sessionId).catch((metaErr: unknown) => {
          console.error('[Sources] Background metadata generation failed:', metaErr);
        });
      }
    });
});

// PATCH /api/sources/:id
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  console.log('[PATCH /api/sources/:id] id:', id, 'checked:', req.body?.checked);
  const { checked } = req.body as { checked?: boolean };

  if (checked === undefined) {
    res.status(400).json({ error: 'checked field is required' });
    return;
  }

  const result = db
    .prepare('UPDATE sources SET checked = ? WHERE id = ?')
    .run(checked ? 1 : 0, id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  const source = db
    .prepare(
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, remote_path, created_at FROM sources WHERE id = ?',
    )
    .get(id);

  res.json(source);
});

// DELETE /api/sources/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  console.log('[DELETE /api/sources/:id] id:', id);

  const source = db
    .prepare('SELECT filename, session_id, remote_path FROM sources WHERE id = ?')
    .get(id) as { filename: string; session_id: string; remote_path: string | null } | undefined;

  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  // Delete file from local disk
  const filePath = path.join(UPLOADS_DIR, source.session_id, source.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete from VPS (fire-and-forget)
  if (source.remote_path) {
    deleteFromVPS(source.remote_path).catch((err: unknown) => {
      console.error('[Sources] VPS delete failed:', err);
    });
  }

  db.prepare('DELETE FROM sources WHERE id = ?').run(id);

  res.status(204).send();
});

export default router;
