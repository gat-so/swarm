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
const MAX_AGENT_RETRIES = 2;

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

interface MessageRow {
  role: string;
  content: string;
  message_type: string;
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

  return '';
}

function buildSourceContext(sessionId: string): string {
  const sources = db.prepare(
    'SELECT filename, original_name, file_type, remote_path FROM sources WHERE session_id = ? AND checked = 1 ORDER BY created_at ASC',
  ).all(sessionId) as Array<{ filename: string; original_name: string; file_type: string; remote_path: string | null }>;

  if (sources.length === 0) return '';

  const parts = sources.map((s, i) => {
    const ext = path.extname(s.original_name).toLowerCase();

    if (s.remote_path) {
      const textExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts', '.py', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.log', '.rtf'];
      if (textExtensions.includes(ext)) {
        const content = readSourceContent(sessionId, s.filename, s.original_name);
        if (content) {
          return `--- Source ${i + 1}: ${s.original_name} ---\nFile path: ${s.remote_path}\n\n${content}`;
        }
      }
      return `Source ${i + 1}: ${s.original_name}\nFile path: ${s.remote_path}\nThis is a ${ext.slice(1).toUpperCase()} file. Use the file path above to read and analyze its contents.`;
    }

    const content = readSourceContent(sessionId, s.filename, s.original_name);
    if (content) {
      return `--- Source ${i + 1}: ${s.original_name} ---\n${content}`;
    }
    return `Source ${i + 1}: ${s.original_name} (${ext.slice(1).toUpperCase()} file — use tools to read)`;
  });

  return `The user has provided the following source documents. For files with paths, use your file reading tools to access them.\n\n${parts.join('\n\n')}`;
}

function buildConversationHistory(sessionId: string, limit = 20): string {
  const msgs = db.prepare(
    `SELECT role, content, message_type FROM messages
     WHERE session_id = ? AND message_type IN ('text', 'execution_result')
     ORDER BY created_at DESC LIMIT ?`,
  ).all(sessionId, limit) as MessageRow[];

  if (msgs.length === 0) return '';

  const reversed = msgs.reverse();
  const lines = reversed.map((m) => {
    const prefix = m.role === 'user' ? 'User' : 'Assistant';
    const content = m.content.length > 2000 ? m.content.slice(0, 2000) + '...' : m.content;
    return `${prefix}: ${content}`;
  });

  return `Previous conversation:\n${lines.join('\n\n')}\n\n---\n\n`;
}

function buildSystemPrompt(goal?: string, length?: string): string {
  let prompt = `You are SWARM, an advanced AI assistant powered by multiple specialized agents. You can read files, analyze documents, send emails, search the web, write code, and perform any task the user requests. Be thorough, detailed, and professional. Use markdown formatting for readability.`;

  if (goal === 'learning') {
    prompt += `\n\nThe user wants to learn. Provide step-by-step explanations, define technical terms, use analogies, and structure your responses for educational clarity.`;
  } else if (goal === 'custom') {
    prompt += `\n\nAdapt your style and tone to what the user requests.`;
  }

  if (length === 'longer') {
    prompt += `\n\nProvide comprehensive, detailed responses with thorough explanations and examples.`;
  } else if (length === 'shorter') {
    prompt += `\n\nKeep responses concise and to the point. Prioritize brevity.`;
  }

  return prompt;
}

function shouldSuggestSwarmAgents(message: string, sourceCount: number): boolean {
  const taskVerbs = /\b(analyze all|compare all|review all|evaluate all|send.*email|compose.*email|create.*report|generate.*report|compile|assess all|process all|summarize all|rank all|score all|analyze these|review these|compare these)\b/i;
  const multiStep = /\b(and then|after that|first.*then|step \d|for each|every one|all of them|each of them)\b/i;
  const isQuestion = /^(what|how|why|when|where|who|is|are|can|do|does|did|will|would|should|could|tell me|explain)\b/i;

  if (isQuestion.test(message.trim()) && message.length < 200) return false;
  if (message.length < 30) return false;
  if (sourceCount >= 3 && taskVerbs.test(message)) return true;
  if (taskVerbs.test(message) && multiStep.test(message)) return true;
  return false;
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

async function processFileReferences(text: string): Promise<string> {
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

function getCheckedSourceCount(sessionId: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM sources WHERE session_id = ? AND checked = 1',
  ).get(sessionId) as { count: number };
  return row.count;
}

// --- POST /api/chat/send — direct passthrough with auto-detection ---
router.post('/send', async (req, res) => {
  const { sessionId, message, goal, length } = req.body as {
    sessionId?: string;
    message?: string;
    goal?: string;
    length?: string;
  };

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
  const conversationHistory = buildConversationHistory(sessionId);
  const systemPrompt = buildSystemPrompt(goal, length);
  const sourceCount = getCheckedSourceCount(sessionId);

  const fullPrompt = [
    systemPrompt,
    sourceContext ? `\n\n${sourceContext}` : '',
    conversationHistory ? `\n\n${conversationHistory}` : '',
    `\nUser: ${message}`,
  ].filter(Boolean).join('');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sessionKey = `swarm-chat-${sessionId}-${Date.now()}`;

  try {
    openclawClient.sendChatMessage(
      fullPrompt,
      sessionKey,
      (chunkText: string) => {
        sseWrite(res, { type: 'delta', text: chunkText });
      },
      async (fullText: string) => {
        try {
          const processed = await processFileReferences(fullText);

          const assistantMsgId = crypto.randomUUID();
          db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
            assistantMsgId, sessionId, 'assistant', processed, 'text',
          );

          sseWrite(res, { type: 'done', text: processed, messageType: 'text' });

          if (shouldSuggestSwarmAgents(message, sourceCount)) {
            sseWrite(res, {
              type: 'suggest_plan',
              message: 'This task could benefit from coordinated Swarm agents working together for a more thorough result.',
              originalMessage: message,
            });
          }

          res.end();
        } catch (err) {
          console.error('[Chat] Post-processing error:', err);
          sseWrite(res, { type: 'done', text: fullText, messageType: 'text' });
          res.end();
        }
      },
      (error: unknown) => {
        console.error('[Chat] OpenClaw error:', error);
        sseWrite(res, { type: 'error', error: String(error) });
        res.end();
      },
    );
  } catch (err) {
    console.error('[Chat] Send error:', err);
    sseWrite(res, { type: 'error', error: String(err) });
    res.end();
  }
});

// --- POST /api/chat/plan — create a multi-agent plan for a message ---
router.post('/plan', async (req, res) => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string };

  if (!sessionId || !message) {
    res.status(400).json({ error: 'sessionId and message are required' });
    return;
  }

  if (!openclawClient.isReady()) {
    res.status(503).json({ error: 'OpenClaw is not connected' });
    return;
  }

  const sourceContext = buildSourceContext(sessionId);
  const conversationHistory = buildConversationHistory(sessionId);

  const planningPrompt = `${conversationHistory}${sourceContext ? sourceContext + '\n\n---\n\n' : ''}User request: ${message}

You are SWARM, a multi-agent AI coordinator. The user wants this task handled by a team of specialized agents. Create an execution plan.

Respond with ONLY valid JSON in this exact format:
{
  "needs_plan": true,
  "plan_summary": "A clear summary of the overall task and approach",
  "agents": [
    {"id": "agent-1", "name": "Descriptive Agent Name", "role": "Document Analyst", "task": "Detailed description of what this agent will do, including specific files to analyze or actions to take", "color": "#3b82f6"},
    {"id": "agent-2", "name": "Descriptive Agent Name", "role": "Research Synthesizer", "task": "Detailed description...", "color": "#22c55e"}
  ],
  "execution_order": [["agent-1"], ["agent-2", "agent-3"], ["agent-4"]],
  "estimated_duration": 120,
  "expected_output": "What the final deliverable will look like"
}

Agent role types to choose from:
- Document Analyst: Reads, parses, and extracts information from files (PDFs, spreadsheets, documents)
- Research Synthesizer: Combines information from multiple sources into coherent analysis
- Data Processor: Handles data transformation, scoring, ranking, and quantitative analysis
- Quality Checker: Reviews and validates output from other agents for accuracy
- Email Composer: Drafts professional emails with proper formatting and tone
- Content Writer: Produces polished written content (reports, summaries, articles)
- Report Generator: Creates structured, formatted reports with sections and data
- Code Analyst: Reviews, writes, or debugs code and technical documentation

Rules:
- Each agent MUST have a unique id (agent-1, agent-2, etc.)
- Task descriptions should be specific and actionable — reference actual source files by name when relevant
- execution_order is an array of arrays: agents in the same inner array run in parallel, outer arrays run sequentially
- Use colors: #3b82f6 (blue), #22c55e (green), #f97316 (orange), #a855f7 (purple), #14b8a6 (teal), #ef4444 (red), #eab308 (yellow), #ec4899 (pink)
- Keep agent count between 2-6 for efficiency
- Respond with ONLY the JSON, no markdown fences or extra text`;

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

    planData.needs_plan = true;
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

  const lastUserMsg = db.prepare(
    `SELECT content FROM messages WHERE session_id = ? AND role = 'user' AND message_type = 'text' ORDER BY created_at DESC LIMIT 1`,
  ).get(sessionId) as { content: string } | undefined;
  const originalUserRequest = lastUserMsg?.content || '';

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

  async function executeAgent(
    agent: PlanAgent,
    agentIdx: number,
    sourceContext: string,
    previousResults: Array<{ agentName: string; result: string }>,
  ): Promise<{ agentId: string; agentName: string; result: string }> {
    const coordSpawn = spawnPositions[0]!;
    const agentPos = spawnPositions[(agentIdx + 1) % spawnPositions.length]!;

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: 'coordinator', message: `${agent.name}, start your task!`, timestamp: ts() },
    });

    await sleep(1000);

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: agent.id, message: 'Working on it...', timestamp: ts() },
    });

    sseWrite(res, {
      type: 'agent_update',
      agentId: agent.id, agentName: agent.name, agentColor: agent.color,
      message: `Starting: ${agent.task}`,
      timestamp: ts(),
    });

    const midX = (coordSpawn.x + agentPos.x) / 2;
    const midY = (coordSpawn.y + agentPos.y) / 2;
    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'move', agentId: agent.id, x: midX, y: midY, timestamp: ts() },
    });

    await sleep(AGENT_DELAY_MS);

    const prevResultsContext = previousResults.length > 0
      ? `\n\nResults from previous agents:\n${previousResults.map((r) => `## ${r.agentName}\n${r.result}`).join('\n\n')}\n\n---\n\n`
      : '';

    const subTaskPrompt = `${sourceContext ? sourceContext + '\n\n---\n\n' : ''}${prevResultsContext}Original user request: "${originalUserRequest}"

You are "${agent.name}", a specialized ${agent.role} agent working as part of a coordinated team.

Your specific task: ${agent.task}

Instructions:
- Focus exclusively on your assigned task
- Be thorough and detailed in your output
- Reference specific data, quotes, or findings from the source documents
- If you need to read a file, use the file path provided to access it
- Write your findings in clear, well-structured natural language with markdown formatting
- Do NOT return JSON`;

    const subSessionKey = `swarm-exec-${sessionId}-${agent.id}-${Date.now()}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_AGENT_RETRIES; attempt++) {
      try {
        const rawResult = await openclawClient.sendChatMessageAsync(subTaskPrompt, subSessionKey + `-${attempt}`);
        const result = await processFileReferences(rawResult);

        const summary = result.length > 80 ? result.slice(0, 80) + '...' : result;
        sseWrite(res, {
          type: 'sim_event',
          event: { type: 'say', agentId: agent.id, message: 'Done!', timestamp: ts() },
        });
        sseWrite(res, {
          type: 'sim_event',
          event: { type: 'move', agentId: agent.id, x: agentPos.x, y: agentPos.y, timestamp: ts() },
        });
        sseWrite(res, {
          type: 'agent_update',
          agentId: agent.id, agentName: agent.name, agentColor: agent.color,
          message: `Completed: ${summary}`,
          timestamp: ts(),
        });

        const updateMsgId = crypto.randomUUID();
        db.prepare('INSERT INTO messages (id, session_id, role, content, message_type) VALUES (?, ?, ?, ?, ?)').run(
          updateMsgId, sessionId, 'assistant',
          JSON.stringify({ agentId: agent.id, agentName: agent.name, agentColor: agent.color, message: result }),
          'agent_update',
        );

        return { agentId: agent.id, agentName: agent.name, result };
      } catch (err) {
        lastError = err;
        console.error(`[Execute] Agent ${agent.id} attempt ${attempt + 1} failed:`, err);
        if (attempt < MAX_AGENT_RETRIES) {
          sseWrite(res, {
            type: 'sim_event',
            event: { type: 'say', agentId: agent.id, message: `Retrying... (${attempt + 2}/${MAX_AGENT_RETRIES + 1})`, timestamp: ts() },
          });
          await sleep(2000);
        }
      }
    }

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: agent.id, message: 'Failed after retries', timestamp: ts() },
    });
    sseWrite(res, {
      type: 'agent_update',
      agentId: agent.id, agentName: agent.name, agentColor: agent.color,
      message: `Failed: ${String(lastError)}`,
      timestamp: ts(),
    });

    return { agentId: agent.id, agentName: agent.name, result: `[Agent failed: ${String(lastError)}]` };
  }

  try {
    const coordSpawn = spawnPositions[0]!;

    sseWrite(res, {
      type: 'sim_event',
      event: {
        type: 'spawn', agentId: 'coordinator', name: 'SWARM Coordinator',
        color: '#6366f1', skinColor: '#f5c5a3',
        x: coordSpawn.x, y: coordSpawn.y, timestamp: ts(),
      },
    });

    await sleep(800);

    for (let i = 0; i < plan.agents.length; i++) {
      const agent = plan.agents[i]!;
      const pos = spawnPositions[(i + 1) % spawnPositions.length]!;
      sseWrite(res, {
        type: 'sim_event',
        event: {
          type: 'spawn', agentId: agent.id, name: agent.name,
          color: agent.color, skinColor: SKIN_COLORS[i % SKIN_COLORS.length]!,
          x: pos.x, y: pos.y, timestamp: ts(),
        },
      });
      await sleep(400);
    }

    await sleep(600);

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: 'coordinator', message: `Coordinating ${plan.agents.length} agents...`, timestamp: ts() },
    });
    sseWrite(res, {
      type: 'agent_update',
      agentId: 'coordinator', agentName: 'SWARM Coordinator', agentColor: '#6366f1',
      message: plan.plan_summary, timestamp: ts(),
    });

    await sleep(AGENT_DELAY_MS);

    const sourceContext = buildSourceContext(sessionId);
    const allResults: Array<{ agentId: string; agentName: string; result: string }> = [];

    for (let groupIdx = 0; groupIdx < plan.execution_order.length; groupIdx++) {
      const group = plan.execution_order[groupIdx]!;
      const agents = group
        .map((agentId) => {
          const agent = plan.agents.find((a) => a.id === agentId);
          const idx = plan.agents.findIndex((a) => a.id === agentId);
          return agent ? { agent, idx } : null;
        })
        .filter((x): x is { agent: PlanAgent; idx: number } => x !== null);

      if (agents.length === 1) {
        const { agent, idx } = agents[0]!;
        const result = await executeAgent(agent, idx, sourceContext, allResults);
        allResults.push(result);
        await sleep(AGENT_DELAY_MS);
      } else {
        const groupResults = await Promise.all(
          agents.map(({ agent, idx }) => executeAgent(agent, idx, sourceContext, allResults)),
        );
        allResults.push(...groupResults);
        await sleep(AGENT_DELAY_MS);
      }
    }

    const synthesisPrompt = `Original user request: "${originalUserRequest}"

Your sub-agents have completed their tasks. Here are their results:

${allResults.map((r) => `## ${r.agentName}\n${r.result}`).join('\n\n')}

---

Synthesize all agent results into a final, cohesive output that directly addresses the user's original request: "${originalUserRequest}"

Requirements:
- Deliver the final work product — not a summary of what agents did
- Use professional formatting with markdown (headings, lists, tables where appropriate)
- If the task involved creating a document, email, or report, present it in its final form
- Do NOT mention agents, the process, or how the work was divided
- Ensure the output is complete, accurate, and ready to use`;

    const synthesisKey = `swarm-synth-${sessionId}-${Date.now()}`;

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: 'coordinator', message: 'Compiling final results...', timestamp: ts() },
    });

    await sleep(AGENT_DELAY_MS);

    const rawFinalOutput = await openclawClient.sendChatMessageAsync(synthesisPrompt, synthesisKey);
    const finalOutput = await processFileReferences(rawFinalOutput);

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'say', agentId: 'coordinator', message: 'All tasks complete!', timestamp: ts() },
    });

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

    sseWrite(res, {
      type: 'sim_event',
      event: { type: 'done', agentId: 'coordinator', timestamp: ts() },
    });

    res.end();
  } catch (err) {
    console.error('[Execute] Execution error:', err);
    sseWrite(res, { type: 'error', error: String(err) });
    res.end();
  }
});

// --- GET /api/chat/history/:sessionId ---
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
