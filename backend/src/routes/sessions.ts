import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';

const router = Router();

// GET /api/sessions
router.get('/', (_req, res) => {
  console.log('[GET /api/sessions] Fetching all sessions');
  const sessions = db
    .prepare('SELECT id, name, created_at FROM sessions ORDER BY created_at DESC')
    .all();

  res.json(sessions);
});

// POST /api/sessions
router.post('/', (req, res) => {
  console.log('[POST /api/sessions] Creating new session, name:', req.body?.name);
  const { name } = req.body as { name?: string };
  const sessionName = name || `Session ${new Date().toLocaleDateString()}`;
  const id = crypto.randomUUID();

  db.prepare('INSERT INTO sessions (id, name) VALUES (?, ?)').run(
    id,
    sessionName,
  );

  const session = db
    .prepare('SELECT id, name, created_at FROM sessions WHERE id = ?')
    .get(id);

  res.status(201).json(session);
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  console.log('[DELETE /api/sessions/:id] id:', id);

  const session = db
    .prepare('SELECT id FROM sessions WHERE id = ?')
    .get(id);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Sources will be cascade-deleted by FK constraint
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

  res.status(204).send();
});

export default router;
