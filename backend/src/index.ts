import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sourcesRouter from './routes/sources.js';
import sessionsRouter from './routes/sessions.js';
import chatRouter from './routes/chat.js';
import openclawClient from './openclaw.js';

// Ensure DB is initialized on startup
import './db.js';

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

