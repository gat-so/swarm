import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, created_at FROM sources WHERE session_id = ? ORDER BY created_at ASC',
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

  const id = crypto.randomUUID();
  const fileType = getFileType(file.originalname);

  db.prepare(
    'INSERT INTO sources (id, session_id, filename, original_name, file_type, file_size) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, sessionId, file.filename, file.originalname, fileType, file.size);

  const source = db
    .prepare(
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, created_at FROM sources WHERE id = ?',
    )
    .get(id);

  res.status(201).json(source);
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
      'SELECT id, session_id, filename, original_name, file_type, file_size, checked, created_at FROM sources WHERE id = ?',
    )
    .get(id);

  res.json(source);
});

// DELETE /api/sources/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  console.log('[DELETE /api/sources/:id] id:', id);

  const source = db
    .prepare('SELECT filename, session_id FROM sources WHERE id = ?')
    .get(id) as { filename: string; session_id: string } | undefined;

  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  // Delete file from disk
  const filePath = path.join(UPLOADS_DIR, source.session_id, source.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM sources WHERE id = ?').run(id);

  res.status(204).send();
});

export default router;
