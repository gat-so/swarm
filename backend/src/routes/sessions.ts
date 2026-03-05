import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db.js';

const router = Router();

// GET /api/sessions
router.get('/', (_req, res) => {
  console.log('[GET /api/sessions] Fetching all sessions');
  const sessions = db
    .prepare('SELECT id, name, emoji, title, description, suggestions, created_at FROM sessions ORDER BY created_at DESC')
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
    .prepare('SELECT id, name, emoji, title, description, suggestions, created_at FROM sessions WHERE id = ?')
    .get(id);

  res.status(201).json(session);
});

// PATCH /api/sessions/:id
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  console.log('[PATCH /api/sessions/:id] id:', id);

  const { emoji, title, description, suggestions, name } = req.body as {
    emoji?: string;
    title?: string;
    description?: string;
    suggestions?: string[];
    name?: string;
  };

  const fields: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (emoji !== undefined) { fields.push('emoji = ?'); values.push(emoji); }
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (suggestions !== undefined) { fields.push('suggestions = ?'); values.push(JSON.stringify(suggestions)); }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  values.push(id);
  const result = db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const session = db
    .prepare('SELECT id, name, emoji, title, description, suggestions, created_at FROM sessions WHERE id = ?')
    .get(id);

  res.json(session);
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

