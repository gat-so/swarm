import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sourcesRouter from './routes/sources.js';
import sessionsRouter from './routes/sessions.js';
import chatRouter from './routes/chat.js';
import openclawClient from './openclaw.js';

// Ensure DB is initialized on startup
import './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    openclaw: openclawClient.isReady() ? 'connected' : 'disconnected',
  });
});

app.use('/api/sources', sourcesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/chat', chatRouter);

app.get('/api/files/download/:filename', (req, res) => {
  const { filename } = req.params;
  const safeName = path.basename(filename);
  const filePath = path.join(DOWNLOADS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.download(filePath, safeName.replace(/^[a-f0-9]+-/, ''));
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Connect to OpenClaw in the background (non-blocking)
  openclawClient.connect().then(() => {
    console.log('🐙 OpenClaw connected successfully');
  }).catch((err) => {
    console.error('🐙 OpenClaw initial connection failed (will retry):', err.message);
  });
});

function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  openclawClient.destroy();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app };

