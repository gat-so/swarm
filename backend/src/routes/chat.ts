import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
import openclawClient from '../openclaw.js';
import { downloadFromVPS } from '../sftp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const DOWNLOADS_DIR = path.join(__dirname, '..', '..', 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const router = Router();

const AGENT_DELAY_MS = 2500;

const SKIN_COLORS = ['#f5c5a3', '#d4a574', '#c68642', '#8d5524', '#f5c5a3', '#d4a574'];

interface PlanAgent {
  id: string;
  name: string;
  role: string;
  task: string;
  color: string;
}

interface PlanData {
  needs_plan: boolean;
  direct_response?: string;
  plan_summary: string;
  agents: PlanAgent[];
  execution_order: string[][];
  estimated_duration: number;
  expected_output: string;
}

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

  return `[File: ${originalName} (${ext.slice(1).toUpperCase()} format — content not directly readable)]`;
}

function buildSourceContext(sessionId: string): string {
  const sources = db.prepare(
    'SELECT filename, original_name, file_type, remote_path FROM sources WHERE session_id = ? AND checked = 1 ORDER BY created_at ASC',
  ).all(sessionId) as Array<{ filename: string; original_name: string; file_type: string; remote_path: string | null }>;

  if (sources.length === 0) return '';

  const parts = sources.map((s, i) => {
    if (s.remote_path) {
      return `- Source ${i + 1}: ${s.original_name} (available at: ${s.remote_path})`;
    }
    const content = readSourceContent(sessionId, s.filename, s.original_name);
    return `--- Source ${i + 1}: ${s.original_name} ---\n${content}`;
  });

  return `The user has provided the following source documents. You can read them using the file paths provided.\n\n${parts.join('\n\n')}`;
}

function parseJsonResponse(raw: string): unknown {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match?.[0]) return JSON.parse(match[0]);
    throw new Error('Could not parse JSON from response');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sseWrite(res: import('express').Response, data: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Scan text for OpenClaw container file paths, download each via SFTP,
 * and replace with a local download URL in markdown link format.
 */
async function processFileReferences(text: string): Promise<string> {
  // Match paths like /data/.openclaw/workspace/... with common file extensions
  const filePathRegex = /(?:['"`]?)(\/?data\/\.openclaw\/workspace\/[^\s'"`,)>\]]+\.(?:pdf|docx?|xlsx?|csv|txt|md|pptx?|png|jpe?g|gif|svg|zip|tar\.gz|json|xml|html|rtf))(?:['"`]?)/gi;

  const matches = [...text.matchAll(filePathRegex)];
  if (matches.length === 0) return text;

  let result = text;

  for (const match of matches) {
    const containerPath = match[1]!;
    const normalizedPath = containerPath.startsWith('/') ? containerPath : `/${containerPath}`;
    const originalFilename = path.basename(normalizedPath);
    const uniqueFilename = `${crypto.randomUUID().slice(0, 8)}-${originalFilename}`;
    const localPath = path.join(DOWNLOADS_DIR, uniqueFilename);

    try {
      await downloadFromVPS(normalizedPath, localPath);
      const downloadUrl = `/api/files/download/${uniqueFilename}`;
      const markdownLink = `[${originalFilename}](${downloadUrl})`;
      result = result.replace(match[0], markdownLink);
      console.log(`[Chat] File reference resolved: ${normalizedPath} → ${downloadUrl}`);
    } catch (err) {
      console.error(`[Chat] Failed to download file reference ${normalizedPath}:`, err);
    }
  }

  return result;
}

// --- POST /api/chat/send — planning-first flow ---
router.post('/send', async (req, res) => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string };

  if (!sessionId || !message) {
    res.status(400).json({ error: 'sessionId and message are required' });
    return;
  }

  if (!openclawClient.isReady()) {
    res.status(503).json({ error: 'OpenClaw is not connected' });
    return;
  }

  const userMsgId = crypto.randomUUID();
  db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
    userMsgId, sessionId, 'user', message, 'text',
  );

  const sourceContext = buildSourceContext(sessionId);

  const planningPrompt = `${sourceContext ? sourceContext + '\n\n---\n\n' : ''}User message: ${message}

You are SWARM, a multi-agent AI assistant. Analyze the user's message and decide whether it requires a multi-step execution plan with sub-agents, or if you can respond directly.

If the message is a simple question, greeting, or conversational reply that does NOT require multiple agents working on sub-tasks, respond with:
{"needs_plan": false, "direct_response": "your response here"}

If the message requires a complex task that benefits from multiple specialized agents, create an execution plan. Respond with ONLY valid JSON:
{
  "needs_plan": true,
  "plan_summary": "A concise summary of what will be done",
  "agents": [
    {"id": "agent-1", "name": "Agent Name", "role": "role_type", "task": "What this agent will do", "color": "#3b82f6"},
    {"id": "agent-2", "name": "Agent Name", "role": "role_type", "task": "What this agent will do", "color": "#22c55e"}
  ],
  "execution_order": [["agent-1"], ["agent-2", "agent-3"], ["agent-4"]],
  "estimated_duration": 60,
  "expected_output": "Description of what the final output will be"
}

Rules for the plan:
- Each agent should have a unique id (agent-1, agent-2, etc.), a descriptive name, a role, a clear task description, and a distinct hex color
- execution_order is an array of arrays — agents in the same inner array run in parallel, outer arrays run sequentially
- Pick appropriate agent types: Document Analyst, Research Synthesizer, Data Processor, Quality Checker, Email Composer, Content Writer, Report Generator, Code Analyst, etc.
- Use colors: #3b82f6 (blue), #22c55e (green), #f97316 (orange), #a855f7 (purple), #14b8a6 (teal), #ef4444 (red), #eab308 (yellow), #ec4899 (pink)
- Respond with ONLY the JSON object, no extra text or markdown`;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sessionKey = `swarm-plan-${sessionId}-${Date.now()}`;

  try {
    const rawResponse = await openclawClient.sendChatMessageAsync(planningPrompt, sessionKey);

    let planData: PlanData;
    try {
      planData = parseJsonResponse(rawResponse) as PlanData;
    } catch {
      const processed = await processFileReferences(rawResponse);
      const assistantMsgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
        assistantMsgId, sessionId, 'assistant', processed, 'text',
      );
      sseWrite(res, { type: 'done', text: processed, messageType: 'text' });
      res.end();
      return;
    }

    if (!planData.needs_plan) {
      const rawDirect = planData.direct_response || rawResponse;
      const directText = await processFileReferences(rawDirect);
      const assistantMsgId = crypto.randomUUID();
      db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
        assistantMsgId, sessionId, 'assistant', directText, 'text',
      );
      sseWrite(res, { type: 'done', text: directText, messageType: 'text' });
      res.end();
      return;
    }

    const planMsgId = crypto.randomUUID();
    const planContent = JSON.stringify(planData);
    db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
      planMsgId, sessionId, 'assistant', planContent, 'plan',
    );

    sseWrite(res, {
      type: 'plan',
      planId: planMsgId,
      plan: planData,
      messageType: 'plan',
    });
    res.end();
  } catch (err) {
    console.error('[Chat] Planning error:', err);
    sseWrite(res, { type: 'error', error: String(err) });
    res.end();
  }
});

// --- POST /api/chat/execute — execute a plan with simulation events ---
router.post('/execute', async (req, res) => {
  const { sessionId, planId } = req.body as { sessionId?: string; planId?: string };

  if (!sessionId || !planId) {
    res.status(400).json({ error: 'sessionId and planId are required' });
    return;
  }

  if (!openclawClient.isReady()) {
    res.status(503).json({ error: 'OpenClaw is not connected' });
    return;
  }

  const planMsg = db.prepare('SELECT content FROM messages WHERE id = ? AND message_type = ?').get(planId, 'plan') as { content: string } | undefined;
  if (!planMsg) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }

  let plan: PlanData;
  try {
    plan = JSON.parse(planMsg.content) as PlanData;
  } catch {
    res.status(500).json({ error: 'Invalid plan data' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const recordingStart = Date.now();
  const ts = () => Date.now() - recordingStart;

  const canvasW = 580;
  const canvasH = 340;
  const spawnPositions = [
    { x: canvasW / 2, y: canvasH / 2 - 20 },
    { x: 100, y: 80 },
    { x: canvasW - 100, y: 80 },
    { x: 80, y: canvasH - 60 },
    { x: canvasW - 80, y: canvasH - 60 },
    { x: canvasW / 2, y: 80 },
    { x: 160, y: canvasH / 2 },
    { x: canvasW - 160, y: canvasH / 2 },
  ];

  try {
    const coordSpawn = spawnPositions[0]!;

    // Spawn coordinator agent
    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'spawn',
        agentId: 'coordinator',
        name: 'SWARM Coordinator',
        color: '#6366f1',
        skinColor: '#f5c5a3',
        x: coordSpawn.x,
        y: coordSpawn.y,
        timestamp: ts(),
      },
    });

    await sleep(800);

    // Spawn all plan agents
    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i]!;
      const pos = spawnPositions[(i + 1) % spawnPositions.length]!;
      sseWrite(res, {
        type: 'sim_event',
        event: {
          type: 'spawn',
          agentId: agent.id,
          name: agent.name,
          color: agent.color,
          skinColor: SKIN_COLORS[i % SKIN_COLORS.length],
          x: pos.x,
          y: pos.y,
          timestamp: ts(),
        },
      });
      await sleep(400);
    }

    await sleep(600);

    // Coordinator introduces the plan
    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'say',
        agentId: 'coordinator',
        message: `Coordinating ${plan.agents.length} agents...`,
        timestamp: ts(),
      },
    });

    sseWrite(res, {
      type: 'agent_update',
      agentId: 'coordinator',
      agentName: 'SWARM Coordinator',
      agentColor: '#6366f1',
      message: plan.plan_summary,
      timestamp: ts(),
    });

    await sleep(AGENT_DELAY_MS);

    // Execute each group in execution_order
    const sourceContext = buildSourceContext(sessionId);
    const allResults: Array<{ agentId: string; agentName: string; result: string }> = [];

    for (let groupIdx = 0; groupIdx < plan.execution_order.length; groupIdx++) {
      const group = plan.execution_order[groupIdx]!;

      for (const agentId of group) {
        const agent = plan.agents.find((a) => a.id === agentId);
        if (!agent) continue;

        // Coordinator directs this agent
        sseWrite(res, {
          type: 'sim_event',
          event: {
            type: 'say',
            agentId: 'coordinator',
            message: `${agent.name}, start your task!`,
            timestamp: ts(),
          },
        });

        await sleep(1000);

        // Agent acknowledges
        sseWrite(res, {
          type: 'sim_event',
          event: {
            type: 'say',
            agentId: agent.id,
            message: `Working on it... 🔧`,
            timestamp: ts(),
          },
        });

        sseWrite(res, {
          type: 'agent_update',
          agentId: agent.id,
          agentName: agent.name,
          agentColor: agent.color,
          message: `Starting: ${agent.task}`,
          timestamp: ts(),
        });

        // Move agent toward coordinator to show interaction
        const agentIdx = plan.agents.indexOf(agent);
        const agentPos = spawnPositions[(agentIdx + 1) % spawnPositions.length]!;
        const midX = (coordSpawn.x + agentPos.x) / 2;
        const midY = (coordSpawn.y + agentPos.y) / 2;

        sseWrite(res, {
          type: 'sim_event',
          event: {
            type: 'move',
            agentId: agent.id,
            x: midX,
            y: midY,
            timestamp: ts(),
          },
        });

        await sleep(AGENT_DELAY_MS);

        // Send the sub-task to OpenClaw
        const subTaskPrompt = `${sourceContext ? sourceContext + '\n\n---\n\n' : ''}You are "${agent.name}", a specialized ${agent.role} agent. Your task: ${agent.task}

Complete this task thoroughly and provide your results. Be concise but comprehensive. Do NOT return JSON — write your findings/output in natural language.`;

        const subSessionKey = `swarm-exec-${sessionId}-${agent.id}-${Date.now()}`;

        try {
          const rawResult = await openclawClient.sendChatMessageAsync(subTaskPrompt, subSessionKey);
          const result = await processFileReferences(rawResult);

          allResults.push({ agentId: agent.id, agentName: agent.name, result });

          // Agent reports completion
          const summary = result.length > 80 ? result.slice(0, 80) + '...' : result;
          sseWrite(res, {
            type: 'sim_event',
            event: {
              type: 'say',
              agentId: agent.id,
              message: `Done! ✅`,
              timestamp: ts(),
            },
          });

          // Move agent back to original position
          sseWrite(res, {
            type: 'sim_event',
            event: {
              type: 'move',
              agentId: agent.id,
              x: agentPos.x,
              y: agentPos.y,
              timestamp: ts(),
            },
          });

          sseWrite(res, {
            type: 'agent_update',
            agentId: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            message: `Completed: ${summary}`,
            timestamp: ts(),
          });

          // Store agent update message
          const updateMsgId = crypto.randomUUID();
          db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
            updateMsgId, sessionId, 'assistant',
            JSON.stringify({ agentId: agent.id, agentName: agent.name, agentColor: agent.color, message: result }),
            'agent_update',
          );
        } catch (err) {
          console.error(`[Execute] Agent ${agent.id} failed:`, err);
          sseWrite(res, {
            type: 'sim_event',
            event: {
              type: 'say',
              agentId: agent.id,
              message: `Error! ❌`,
              timestamp: ts(),
            },
          });
          sseWrite(res, {
            type: 'agent_update',
            agentId: agent.id,
            agentName: agent.name,
            agentColor: agent.color,
            message: `Failed: ${String(err)}`,
            timestamp: ts(),
          });
        }

        await sleep(AGENT_DELAY_MS);
      }
    }

    // Ask OpenClaw to synthesize final output from all agent results
    const synthesisPrompt = `You are SWARM, a multi-agent AI coordinator. Your sub-agents have completed their tasks. Here are their results:

${allResults.map((r) => `## ${r.agentName}\n${r.result}`).join('\n\n')}

---

Now synthesize all agent results into a final, cohesive output that addresses the user's original request. Format it professionally. Do NOT mention agents or the process — just deliver the final work product.`;

    const synthesisKey = `swarm-synth-${sessionId}-${Date.now()}`;

    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'say',
        agentId: 'coordinator',
        message: 'Compiling final results... 📋',
        timestamp: ts(),
      },
    });

    await sleep(AGENT_DELAY_MS);

    const rawFinalOutput = await openclawClient.sendChatMessageAsync(synthesisPrompt, synthesisKey);
    const finalOutput = await processFileReferences(rawFinalOutput);

    // Coordinator announces completion
    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'say',
        agentId: 'coordinator',
        message: 'All tasks complete! 🎉',
        timestamp: ts(),
      },
    });

    // Store the final output
    const resultMsgId = crypto.randomUUID();
    db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
      resultMsgId, sessionId, 'assistant', finalOutput, 'execution_result',
    );

    await sleep(800);

    sseWrite(res, {
      type: 'execution_complete',
      text: finalOutput,
      messageType: 'execution_result',
      timestamp: ts(),
    });

    // Signal simulation recording to stop
    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'done',
        agentId: 'coordinator',
        timestamp: ts(),
      },
    });

    res.end();
  } catch (err) {
    console.error('[Execute] Execution error:', err);
    sseWrite(res, { type: 'error', error: String(err) });
    res.end();
  }
});

// --- GET /api/chat/history/:sessionId — fetch chat messages ---
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const messages = db.prepare(
    'SELECT id, session_id, role, content, message_type, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
  ).all(sessionId);

  res.json(messages);
});

// --- POST /api/chat/generate-metadata ---
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

    let cleaned = fullResponse.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let metadata: { emoji?: string; title?: string; description?: string; suggestions?: string[] };
    try {
      metadata = JSON.parse(cleaned) as typeof metadata;
    } catch {
      console.error('[Chat] Failed to parse metadata JSON:', cleaned);
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch?.[0]) {
        metadata = JSON.parse(jsonMatch[0]) as typeof metadata;
      } else {
        res.status(500).json({ error: 'Failed to parse metadata from OpenClaw response' });
        return;
      }
    }

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
