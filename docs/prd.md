# SWARM — Product Overview, Goals, and Metrics

## Product Overview

### Product Vision

To fundamentally transform how professionals get work done — replacing manual, multi-step task execution with autonomous multi-agent AI teams that decompose, execute, and deliver complex work, with a unique simulation layer that makes the process transparent and trustworthy.

### Product Mission

SWARM enables professionals to delegate complex, multi-step tasks to teams of specialized AI agents that collaborate autonomously, deliver completed work products, and maintain human control through review and confirmation — all through a natural language chat interface with real-time visual simulation of agent interactions.

### Product Description

SWARM (Simulated Workforce of Autonomous Reasoning Minds) is a multi-agent AI assistant that performs real-world tasks by deploying teams of specialized agents. Unlike single-agent AI tools that provide one answer from one perspective, SWARM decomposes complex tasks into sub-tasks, spawns purpose-built agents (Document Analyst, Qualification Checker, Email Composer, Research Synthesizer), orchestrates their collaboration through the OpenClaw framework, and delivers completed work — emails sent, documents analyzed, research compiled — for human review and confirmation.

The platform features a three-column interface: a Sources Panel for uploading documents and context, a Chat Panel for natural language task input and output delivery, and a Simulation Panel showing a top-down animated visualization of agents collaborating in real time. The simulation layer is SWARM's visual signature — transforming opaque AI processing into a transparent, engaging experience.

The flagship demonstration shows SWARM analyzing 30 resumes against a job description and composing an email to HR with the top qualified candidates — a task that takes professionals 2-3 hours completed in under 3 minutes.

### Value Proposition

SWARM is the first platform that combines multi-agent task execution with an accessible chat interface and a visual simulation layer. It compresses hours of manual work into minutes, with specialized agents producing superior output to any single-agent AI. Users see exactly how agents collaborate through the simulation visualization, building trust and understanding. The human always makes the final call — reviewing outputs and confirming actions before execution.

### Target Users

| Segment                    | Profile                                               | Primary Use Cases                                           |
| -------------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| **Knowledge Workers**      | Professionals spending 60%+ of time on task execution | Email composition, document analysis, research, reporting   |
| **Students & Researchers** | Individuals conducting research and analysis          | Literature reviews, data analysis, source compilation       |
| **Teams & Managers**       | Leads needing to prepare materials and coordinate     | Meeting briefings, status reports, feedback processing      |
| **Hackathon Judges**       | Technical evaluators assessing the product            | Evaluating completeness, innovation, technical depth, value |

### Key Differentiators

| Capability                   | SWARM                              | ChatGPT / Claude | AutoGen / CrewAI       | Zapier / Make.com |
| ---------------------------- | ---------------------------------- | ---------------- | ---------------------- | ----------------- |
| **Multi-agent execution**    | ✅ Specialized agents per sub-task | ❌ Single agent  | ✅ Yes (code required) | ❌ Rules-based    |
| **Accessible interface**     | ✅ Natural language chat           | ✅ Chat          | ❌ Developer-only      | ✅ Visual builder |
| **Simulation visualization** | ✅ Real-time agent view            | ❌ None          | ❌ Logs only           | ❌ None           |
| **Multi-source context**     | ✅ Files, text, web search         | ⚠️ Limited       | ❌ Custom setup        | ❌ No             |
| **Action execution**         | ✅ With human confirmation         | ❌ Text only     | ⚠️ Custom              | ✅ Pre-defined    |
| **Auto task decomposition**  | ✅ AI-powered                      | ❌ Manual        | ❌ Manual              | ❌ Pre-built      |

### Product Principles

**1. Task Completion Over Task Assistance**
SWARM doesn't help you think about tasks — it completes them. Every interaction should end with a finished work product, not a suggestion or recommendation.

**2. Specialization Over Generalism**
Complex tasks deserve specialized agents. A Document Analyst parses. A Qualification Checker scores. An Email Composer writes. Each excels at their piece.

**3. Transparency Over Black Boxes**
The simulation layer makes agent collaboration visible. Users see how their output was produced, building trust and enabling verification.

**4. Human Control Over Full Automation**
SWARM does the work; humans make the calls. Every external action requires explicit confirmation. The plan is reviewed before execution begins.

**5. Depth Over Breadth**
One use case executed flawlessly beats five mediocre ones. For the hackathon: perfect the resume analysis → email flow before expanding.

---

## Goals, Objectives & Success Metrics

### Business Goals

| ID   | Business Goal                                         | Target                                                           |
| ---- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| BG-1 | Achieve a hackathon judging score of 90/100 or higher | 90/100 (18+18+27+27)                                             |
| BG-2 | Deliver a complete, end-to-end working product        | Zero placeholders, zero broken flows in demo path                |
| BG-3 | Establish SWARM as a credible product concept         | Judges perceive SWARM as viable, not just a hackathon project    |
| BG-4 | Demonstrate deep OpenClaw integration                 | Leverage 4+ core features (gateway, messaging, routing, context) |

### Product Goals

| ID   | Product Goal                                           | Description                                                      |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| PG-1 | Complete a multi-agent task in under 3 minutes         | Resume analysis → email composition completes within demo window |
| PG-2 | Deploy 3+ autonomous agents without human intervention | Once user clicks "Start," all agents execute autonomously        |
| PG-3 | Process multi-source context simultaneously            | 30+ documents loaded and accessible to all agents                |
| PG-4 | Deliver a professional-quality output                  | Email draft is well-written, accurate, and ready to send         |
| PG-5 | Show real-time simulation of agent collaboration       | Simulation panel dynamically reflects actual agent execution     |
| PG-6 | Provide a polished, intuitive 3-column interface       | Non-technical users can operate SWARM without explanation        |

### Success Metrics

| KPI                     | Target                    | Measurement            |
| ----------------------- | ------------------------- | ---------------------- |
| Demo Completion Rate    | 100% on rehearsed path    | 10+ rehearsal runs     |
| Task Completion Time    | < 3 minutes               | Timestamped logs       |
| Agent Output Quality    | > 90% pass quality review | Team review of outputs |
| Dashboard Load Time     | < 2 seconds               | Browser profiling      |
| Simulation Frame Rate   | 30+ FPS                   | Performance profiling  |
| WebSocket Event Latency | < 200ms                   | Event timestamps       |
| Source Processing Time  | < 3s per 10-page PDF      | Ingestion timing       |
| Error Rate During Demo  | 0                         | Error logging          |

### Alignment to Hackathon Judging Criteria

| Criterion                    | Weight | Target | SWARM Features                                                                                                |
| ---------------------------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| **Completeness**             | 20%    | 18/20  | E2E flow: source upload → task → plan → execution → simulation → output → confirmation. Polished 3-column UI. |
| **Creativity/Innovation**    | 20%    | 18/20  | Simulation visualization layer (first of its kind). Multi-agent execution accessible to non-developers.       |
| **Technical Accomplishment** | 30%    | 27/30  | Deep OpenClaw integration. Event-driven simulation. Execution engine with dependencies. Model routing.        |
| **Product Value**            | 30%    | 27/30  | Universal problem (task overload). Quantifiable value (3 min vs 3 hrs). Real output. Broad applicability.     |

### Out of Scope

| Item                                           | Rationale                             |
| ---------------------------------------------- | ------------------------------------- |
| User authentication / multi-tenant             | Hackathon demo is single-user         |
| Persistent task history across sessions        | Tasks run ephemerally for demo        |
| Mobile-responsive dashboard                    | Desktop-only for demo                 |
| Real email sending in demo                     | Show confirmation prompt only         |
| Integration with external tools (Slack, Drive) | Stretch goal                          |
| Custom agent type creation                     | Pre-built agent library is sufficient |
| PDF/document export of outputs                 | In-app display is sufficient          |


---


# SWARM — Personas, User Stories, and Functional Requirements

---

## User Personas

### Persona 1: Knowledge Worker

| Attribute      | Detail                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Name**       | Maria Santos                                                                                                                   |
| **Role**       | HR Operations Manager                                                                                                          |
| **Experience** | 8 years in HR operations, manages hiring workflows, employee communications, and policy documentation for a 500-person company |

**Goals:**

- Reduce time spent on resume screening, candidate communication, and report compilation
- Delegate multi-step workflows (analyze applications → shortlist candidates → draft emails) to AI
- Maintain quality and professionalism in all external communications
- Have transparency into how AI produces its outputs

**Pain Points:**

- Spends 3+ hours reviewing 30-50 resumes for each open position — manual, repetitive, and error-prone
- Writing candidate emails is time-consuming when each needs personalized qualifications summary
- AI chatbots help draft text but can't process batch documents or maintain consistency across analyses
- No visibility into how AI reaches its conclusions — black box outputs reduce trust

**How She Uses SWARM:**

- Uploads 30 resumes + job requirements to the Sources Panel
- Types: "Analyze these resumes against the job requirements and send HR an email with the top 10 qualified candidates"
- Reviews the agent plan (Document Analyst → Qualification Checker → Email Composer)
- Clicks "Start" and watches agents collaborate in the simulation
- Reviews the drafted email, verifies candidate assessments, and confirms sending

---

### Persona 2: Strategy Consultant

| Attribute      | Detail                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Name**       | James Reyes                                                                                                         |
| **Role**       | Senior Strategy Consultant                                                                                          |
| **Experience** | 10 years in management consulting, prepares competitive analyses, market research reports, and client presentations |

**Goals:**

- Conduct competitive research across multiple companies simultaneously
- Produce formatted, source-cited analysis reports in minutes instead of hours
- Run parallel research tasks — 5 competitors analyzed at the same time
- Deliver client-ready materials without extensive manual formatting

**Pain Points:**

- Competitive landscape analysis takes 4-6 hours of manual research, compilation, and formatting
- AI chatbots provide surface-level answers but can't conduct structured, parallel research
- Each research source must be manually found, read, and synthesized — no multi-source processing
- Client presentations need formatted, professional outputs — not chat-style text

**How He Uses SWARM:**

- Pastes competitor names and industry context in the Sources Panel
- Enables web search integration for real-time data
- Types: "Research these 5 competitors and produce a competitive landscape analysis report"
- SWARM deploys 5 parallel Research Synthesizers + Data Processor + Report Generator
- Reviews the formatted report with citations and exports for client presentation

---

### Persona 3: Academic Researcher

| Attribute      | Detail                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| **Name**       | Dr. Ana Villanueva                                                                 |
| **Role**       | PhD Researcher in Public Policy                                                    |
| **Experience** | 6 years in academic research, writes papers, literature reviews, and policy briefs |

**Goals:**

- Accelerate literature review compilation from weeks to hours
- Process multiple academic sources simultaneously
- Produce structured, citation-ready research summaries
- Test different research angles by running multiple queries with different parameters

**Pain Points:**

- Literature reviews require reading dozens of papers and synthesizing findings — weeks of work
- AI chatbots can summarize one paper at a time but can't cross-reference or synthesize across sources
- No tool produces properly structured academic output with citation formatting
- Manual research cannot easily scale to cover all relevant publications

**How She Uses SWARM:**

- Uploads existing papers and pastes research questions in the Sources Panel
- Enables web search for academic databases
- Types: "Compile a literature review on [topic] covering recent publications, key findings, and research gaps"
- SWARM deploys Research Synthesizers (parallel) → Quality Checker → Content Writer
- Reviews the structured literature review with citations and source references

---

### Persona 4: Hackathon Judge

| Attribute      | Detail                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Name**       | Prof. David Lim                                                                                                          |
| **Role**       | Technical Judge, CCSD Hackathon 2026                                                                                     |
| **Experience** | AI/ML researcher; evaluates on completeness (20%), creativity (20%), technical accomplishment (30%), product value (30%) |

**Goals:**

- Quickly assess if SWARM is a complete, working product — not a prototype
- Evaluate the depth of OpenClaw integration
- Understand if this is genuinely innovative or a re-skin of existing multi-agent chat
- Determine real-world value: would actual professionals use this?

**Pain Points:**

- Most hackathon entries are demos, not products — missing error handling, real data, edge cases
- Difficult to distinguish multi-agent coordination from sequential API calls
- Limited time (10-15 minutes) — needs to see depth quickly
- Wants to test with unexpected inputs, not just the happy path

**How He Evaluates SWARM:**

- Watches the live demo: 30 resumes → agent plan → simulation → email output
- Examines the 3-column interface: sources, chat, simulation
- Checks the simulation: are agents actually responding to real execution events?
- Asks "what-if" questions: "What if I upload different files?" "What if an agent fails?"
- Inspects technical depth: OpenClaw integration, model routing, agent communication

---

## User Stories & Requirements

### Epic 1: Source Management

> As a user, I can load context (files, text, web search) that agents will reason over.

#### US-1.1: Upload Document Files

**As a** knowledge worker, **I want to** upload multiple document files (PDF, DOCX, XLSX), **so that** agents can process them all as source context.

**Acceptance Criteria:**

- Drag-and-drop file upload area accepts multiple files simultaneously
- Supported formats: PDF, DOCX, XLSX, TXT, CSV
- Files appear in the Sources Panel with filename, type, and size
- Upload feedback shows progress and completion status

#### US-1.2: Paste Text Content

**As a** consultant, **I want to** paste text directly into the Sources Panel, **so that** agents can use it as context without needing a separate file.

**Acceptance Criteria:**

- Text input area accepts arbitrary text (notes, requirements, instructions)
- Pasted text appears as a named source in the Sources Panel
- Users can edit or delete pasted text sources

#### US-1.3: Run Web Searches

**As a** researcher, **I want to** run web searches from the Sources Panel, **so that** agents can access real-time information.

**Acceptance Criteria:**

- Web search bar accepts natural language queries
- Search results appear as sources with title, snippet, and URL
- Users can select which search results to include as active sources

#### US-1.4: Preview Source Content

**As a** knowledge worker, **I want to** preview any source's content by clicking on it, **so that** I can verify what context agents will have access to.

**Acceptance Criteria:**

- Clicking a source in the list shows a preview of its content
- Preview supports text, structured data (tables from XLSX), and extracted text from PDFs
- Preview is scrollable for long documents

#### US-1.5: Manage Active Sources

**As a** user, **I want to** toggle sources on/off, **so that** I can control exactly what context agents use for a specific task.

**Acceptance Criteria:**

- Each source has an active/inactive toggle
- Only active sources are provided to agents during task execution
- Sources can be removed from the library entirely

---

### Epic 2: Task Input and Planning

> As a user, I can describe a task in natural language and review the agent execution plan.

#### US-2.1: Describe Task in Natural Language

**As a** knowledge worker, **I want to** describe my task in plain English in the Chat Panel, **so that** SWARM can understand what I need done.

**Acceptance Criteria:**

- Chat input accepts free-form natural language text
- Task submissions are displayed as user messages in the chat history
- Clear visual distinction between user messages and system responses

#### US-2.2: Review Agent Execution Plan

**As a** user, **I want to** see the proposed agent plan before execution begins, **so that** I can verify SWARM understands my task correctly.

**Acceptance Criteria:**

- Plan displays: number of agents, agent types, sub-task descriptions, execution order, estimated duration
- Plan is presented in a structured card layout, not wall of text
- User can modify the plan (stretch goal) or approve and start execution

#### US-2.3: Start Task Execution

**As a** user, **I want to** click a prominent "Start" button to begin agent execution, **so that** I have explicit control over when agents begin working.

**Acceptance Criteria:**

- "Start" button is clearly visible and labeled
- Clicking "Start" transitions the system from planning to execution state
- Simulation Panel activates upon clicking Start

---

### Epic 3: Real-Time Execution Monitoring

> As a user, I can watch agents work through both the Chat Panel (progress updates) and Simulation Panel (visual animation).

#### US-3.1: Monitor Agent Progress in Chat

**As a** user, **I want to** see progress updates from agents in the Chat Panel, **so that** I know what's happening during execution.

**Acceptance Criteria:**

- Agent progress messages appear in the chat feed in real time via WebSocket
- Messages are attributed to the specific agent (e.g., "Document Analyst: Parsing 30 resumes...")
- Visual indicators distinguish agent updates from user messages and final output

#### US-3.2: Watch Simulation Visualization

**As a** user, **I want to** see an animated top-down visualization of agents working and collaborating, **so that** I can understand the AI process.

**Acceptance Criteria:**

- Simulation Panel shows agent characters with type-specific visual styles
- Agents animate when processing (working animation at their workstation)
- Data flow is visually animated between agents when intermediate results are passed
- Completed agents show a "done" indicator (e.g., checkmark)

#### US-3.3: Track Overall Task Progress

**As a** user, **I want to** see overall task completion progress, **so that** I know when the task will finish.

**Acceptance Criteria:**

- Progress indicator shows completed agents vs. total (e.g., "2 of 3 agents completed")
- Estimated time remaining is displayed (or elapsed time)
- Current active agent is highlighted

---

### Epic 4: Output Delivery and Action

> As a user, I can review completed work products and confirm external actions.

#### US-4.1: Review Completed Output

**As a** knowledge worker, **I want to** see the final work product (email draft, report, analysis) in the Chat Panel, **so that** I can review it before any action is taken.

**Acceptance Criteria:**

- Output is formatted professionally — not raw text dump
- For emails: shows subject, recipients, body with proper formatting
- For reports: shows structured sections with headers and content

#### US-4.2: View Agent Reasoning

**As a** user, **I want to** expand sections showing how each agent contributed to the output, **so that** I can verify the reasoning and sources used.

**Acceptance Criteria:**

- Expandable "How this was produced" section under the output
- Shows per-agent reasoning: what each agent did and why
- Source citations link to the specific source documents used

#### US-4.3: Confirm External Actions

**As a** knowledge worker, **I want to** explicitly confirm before SWARM sends an email or takes any external action, **so that** I maintain control.

**Acceptance Criteria:**

- Confirmation prompt clearly states the action ("Send this email to hr@company.com?")
- "Confirm" and "Cancel" buttons are clearly visible
- System does NOT execute any external action without explicit confirmation

#### US-4.4: Modify Output Before Action

**As a** user, **I want to** edit the output (e.g., modify the email draft) before confirming the action, **so that** I can make adjustments.

**Acceptance Criteria:**

- Output text is editable in-place
- Changes are reflected before confirmation
- "Regenerate" option re-runs the relevant agent with modified instructions (stretch)

---

## Functional Requirements

### FR-1: Source Ingestion Module

#### FR-1.1: File Upload Processing

|                 |                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                                                     |
| **Description** | System shall accept file uploads (PDF, DOCX, XLSX, TXT, CSV), parse them to structured text, and index them for agent access. |

**Acceptance Criteria:**

- Drag-and-drop and file picker upload supported
- Multiple simultaneous file uploads
- Parse to text within 3 seconds per 10-page document
- Parsed content stored in SQLite with metadata

#### FR-1.2: Text Input Processing

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                     |
| **Description** | System shall accept pasted text and store it as a source available to agents. |

#### FR-1.3: Web Search Integration

|                 |                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Priority**    | Should Have                                                                                 |
| **Description** | System shall execute web searches via API (Tavily or SerpAPI) and store results as sources. |

#### FR-1.4: Source Management

|                 |                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                               |
| **Description** | System shall maintain a source library with preview, active/inactive toggle, and deletion capabilities. |

---

### FR-2: Task Orchestration Module

#### FR-2.1: Task Analysis and Decomposition

|                 |                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                                         |
| **Description** | System shall analyze natural language task descriptions and decompose them into sub-tasks with agent assignments. |

**Acceptance Criteria:**

- Task decomposition completes within 5 seconds
- Plan includes: agent types, sub-task descriptions, dependency order, estimated duration
- Plan is presented to user for review before execution

#### FR-2.2: Execution Engine

|                 |                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                                                    |
| **Description** | System shall execute agent plans with dependency tracking, parallel execution of independent agents, and quality validation. |

**Acceptance Criteria:**

- Agents with no dependencies run in parallel
- Agents with dependencies wait for upstream completion
- Failed agents retry up to 2 times before graceful degradation
- All execution events emit WebSocket updates

#### FR-2.3: Agent Communication

|                 |                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Priority**    | Must Have                                                                                  |
| **Description** | System shall route inter-agent messages through OpenClaw's message passing infrastructure. |

---

### FR-3: Simulation Visualization Module

#### FR-3.1: Agent Visualization

|                 |                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                                                  |
| **Description** | System shall render a top-down animated view of agent characters in the Simulation Panel, driven by real execution events. |

**Acceptance Criteria:**

- Each agent type has a distinct visual representation
- Agents appear when spawned, animate when processing, show checkmarks when complete
- Data flow between agents is visually animated
- Simulation starts dormant and activates on task execution

#### FR-3.2: Event-Driven Rendering

|                 |                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Priority**    | Must Have                                                                                                    |
| **Description** | Simulation animations shall be triggered by actual agent execution events (via WebSocket), not pre-recorded. |

---

### FR-4: Output and Action Module

#### FR-4.1: Output Display

|                 |                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                               |
| **Description** | System shall present completed work products in a formatted, professional layout within the Chat Panel. |

#### FR-4.2: Action Confirmation

|                 |                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Priority**    | Must Have                                                                                                            |
| **Description** | System shall require explicit user confirmation before executing any external action (email sending, file creation). |

#### FR-4.3: Agent Reasoning Transparency

|                 |                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Priority**    | Should Have                                                                                |
| **Description** | System shall provide expandable views showing each agent's reasoning and source citations. |


---


# SWARM — Non-Functional Requirements, Architecture, and APIs

---

## 1. Non-Functional Requirements

### NFR-1: Performance

| ID      | Requirement                        | Target                            |
| ------- | ---------------------------------- | --------------------------------- |
| NFR-1.1 | Source file upload and parsing     | < 3 seconds per 10-page PDF       |
| NFR-1.2 | Task plan generation               | < 5 seconds from task submission  |
| NFR-1.3 | Per-agent execution                | < 30 seconds per agent            |
| NFR-1.4 | End-to-end task (3-agent pipeline) | < 3 minutes                       |
| NFR-1.5 | Dashboard initial load             | < 2 seconds                       |
| NFR-1.6 | Simulation frame rate              | 30+ FPS during peak activity      |
| NFR-1.7 | WebSocket event latency            | < 200ms (event → client render)   |
| NFR-1.8 | Chat panel update latency          | < 500ms (agent event → UI update) |

### NFR-2: Reliability

| ID      | Requirement            | Target                                                |
| ------- | ---------------------- | ----------------------------------------------------- |
| NFR-2.1 | Agent retry on failure | Up to 2 retries before graceful degradation           |
| NFR-2.2 | Graceful degradation   | Partial results shown if an agent fails               |
| NFR-2.3 | LLM fallback routing   | Automatic switch to fallback model on primary failure |
| NFR-2.4 | Connection recovery    | WebSocket auto-reconnect within 3 seconds             |
| NFR-2.5 | Demo reliability       | 100% success rate on rehearsed demo path              |

### NFR-3: Usability

| ID      | Requirement             | Target                                                           |
| ------- | ----------------------- | ---------------------------------------------------------------- |
| NFR-3.1 | Time to first task      | < 60 seconds from dashboard load to task submission              |
| NFR-3.2 | Zero-training operation | Non-technical users understand the interface without instruction |
| NFR-3.3 | Accessibility           | WCAG 2.1 AA compliance for text contrast and keyboard navigation |
| NFR-3.4 | Responsive feedback     | Every user action produces visible UI response within 200ms      |

### NFR-4: Security

| ID      | Requirement          | Target                                                                                 |
| ------- | -------------------- | -------------------------------------------------------------------------------------- |
| NFR-4.1 | Source data handling | Source files processed and stored locally; only relevant context sent to LLM providers |
| NFR-4.2 | Agent sandboxing     | Agents have no direct filesystem access beyond source ingestion service                |
| NFR-4.3 | Action confirmation  | All external actions (email, file creation) require explicit user confirmation         |
| NFR-4.4 | Network isolation    | Agent network access limited to approved LLM API endpoints and web search APIs         |

### NFR-5: Scalability (Post-Hackathon)

| ID      | Requirement         | Target                                      |
| ------- | ------------------- | ------------------------------------------- |
| NFR-5.1 | Source library size | Support 100+ documents per session          |
| NFR-5.2 | Concurrent agents   | Support 10+ agents executing simultaneously |
| NFR-5.3 | Task history        | Persist task history across sessions        |

---

## 2. Architecture Overview

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     SWARM Frontend (Next.js 14)                   │
│  ┌──────────────┬──────────────────┬──────────────────────────┐  │
│  │Sources Panel │   Chat Panel     │  Simulation Panel        │  │
│  │              │                  │                          │  │
│  │FileUploader  │  ChatInput       │  SimulationCanvas        │  │
│  │TextInput     │  PlanDisplay     │  AgentCharacter (×n)     │  │
│  │WebSearchBar  │  ProgressFeed    │  DataFlowAnimation       │  │
│  │SourceList    │  OutputDisplay   │  ProgressOverlay         │  │
│  │SourcePreview │  ActionButtons   │  Controls                │  │
│  └──────────────┴──────────────────┴──────────────────────────┘  │
│                                                                    │
│    WebSocket Client  ←→  REST Client  ←→  File Upload Handler     │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP + WebSocket
┌────────────────────────────┴─────────────────────────────────────┐
│                     SWARM Backend (FastAPI)                        │
│                                                                    │
│  ┌─────────────────┬──────────────────┬──────────────────────┐   │
│  │ Source Service   │ Task Orchestrator │ Simulation Engine    │   │
│  │                 │                  │                      │   │
│  │ File parsing    │ Task analysis    │ Event mapping        │   │
│  │ Text indexing   │ Agent planning   │ Layout calculation   │   │
│  │ Web search      │ Execution engine │ WebSocket broadcast  │   │
│  └─────────────────┴──────────────────┴──────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    OpenClaw Framework                         │ │
│  │  Gateway | Agent Spawning | Message Passing | Model Routing  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────┬───────────────┬────────────────────────────┐   │
│  │ LLM Providers │ Data Stores   │ External Services          │   │
│  │ Claude Sonnet │ SQLite        │ Web Search API (Tavily)    │   │
│  │ GPT-4o-mini   │ Redis         │ Email API (SMTP/SendGrid) │   │
│  │ Ollama        │               │ File Processing libraries │   │
│  └──────────────┴───────────────┴────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer              | Technology                    | Version | Purpose                        |
| ------------------ | ----------------------------- | ------- | ------------------------------ |
| Frontend Framework | Next.js                       | 14      | SSR, routing, React framework  |
| UI Library         | React                         | 18      | Component-based UI             |
| Styling            | Tailwind CSS                  | 3       | Utility-first CSS              |
| Visualization      | HTML5 Canvas or D3.js         | —       | Simulation panel animation     |
| Backend            | FastAPI                       | 0.109+  | REST + WebSocket API server    |
| Runtime            | Python                        | 3.12    | Backend runtime                |
| Agent Framework    | OpenClaw                      | Latest  | Multi-agent orchestration      |
| Primary LLM        | Anthropic Claude Sonnet       | Latest  | Complex reasoning              |
| Secondary LLM      | OpenAI GPT-4o-mini            | Latest  | Routine tasks                  |
| Fallback LLM       | Ollama                        | Latest  | Local inference                |
| Storage            | SQLite                        | 3       | Persistent source/task storage |
| Cache              | Redis                         | 7+      | Ephemeral state, sessions      |
| File Parsing       | PyPDF2, python-docx, openpyxl | —       | Document text extraction       |
| Web Search         | Tavily API                    | —       | Real-time web search           |

---

## 3. Data Models

### Source

```typescript
interface Source {
  id: string;
  filename: string;
  fileType: string; // MIME type
  content: string; // Extracted text content
  chunks: string[]; // Chunked content for retrieval
  metadata: {
    size: number;
    uploadedAt: string; // ISO timestamp
    url?: string; // For web search results
    searchQuery?: string; // For web search results
  };
  isActive: boolean; // Whether agents can access this source
}
```

### Task

```typescript
interface Task {
  id: string;
  description: string; // User's natural language task
  status: "pending" | "planning" | "executing" | "completed" | "failed";
  executionPlan: ExecutionPlan | null;
  finalOutput: TaskOutput | null;
  sourceIds: string[]; // Sources used for this task
  createdAt: string;
  completedAt: string | null;
}

interface ExecutionPlan {
  agents: AgentAssignment[];
  dependencies: Record<string, string[]>; // agentId → prerequisite agentIds
  estimatedDuration: number; // seconds
  expectedOutput: string;
  requiresConfirmation: boolean;
}

interface AgentAssignment {
  agentId: string;
  agentType: string; // Key from agent registry
  subTask: string; // What this agent will do
  inputSources: string[]; // Source IDs
  dependsOn: string[]; // Agent IDs
}
```

### Agent Execution

```typescript
interface AgentExecution {
  id: string;
  taskId: string;
  agentType: string;
  agentId: string;
  subTask: string;
  status: "pending" | "processing" | "completed" | "failed";
  inputData: object | null; // From upstream agents
  outputData: object | null; // Agent's output
  modelUsed: string; // Which LLM model
  tokensUsed: number;
  durationMs: number;
  createdAt: string;
  completedAt: string | null;
}
```

### Task Output

```typescript
interface TaskOutput {
  type: "email" | "report" | "analysis" | "summary";
  content: string; // Formatted output text
  agentContributions: AgentContribution[];
  sourceCitations: SourceCitation[];
  action?: {
    type: "send_email";
    target: string; // e.g., email address
    confirmed: boolean;
  };
}

interface AgentContribution {
  agentId: string;
  agentType: string;
  reasoning: string; // How this agent contributed
  outputSummary: string;
}

interface SourceCitation {
  sourceId: string;
  filename: string;
  excerpt: string; // Relevant excerpt from source
  usedBy: string; // Agent ID that used this source
}
```

---

## 4. API Specification

### REST Endpoints

#### Source Management

| Method   | Path                  | Description                              |
| -------- | --------------------- | ---------------------------------------- |
| `POST`   | `/api/sources/upload` | Upload file(s) — multipart form data     |
| `POST`   | `/api/sources/text`   | Add text source — `{ title, content }`   |
| `POST`   | `/api/sources/search` | Run web search — `{ query, maxResults }` |
| `GET`    | `/api/sources`        | List all sources                         |
| `GET`    | `/api/sources/{id}`   | Get source details + content preview     |
| `PATCH`  | `/api/sources/{id}`   | Update source (toggle active/inactive)   |
| `DELETE` | `/api/sources/{id}`   | Remove source                            |

#### Task Management

| Method | Path                      | Description                          |
| ------ | ------------------------- | ------------------------------------ |
| `POST` | `/api/tasks`              | Submit task → returns execution plan |
| `POST` | `/api/tasks/{id}/start`   | Start task execution                 |
| `GET`  | `/api/tasks/{id}`         | Get task status + results            |
| `GET`  | `/api/tasks/{id}/agents`  | Get agent execution details          |
| `POST` | `/api/tasks/{id}/confirm` | Confirm external action              |
| `POST` | `/api/tasks/{id}/cancel`  | Cancel running task                  |

#### Agent Information

| Method | Path                | Description                                  |
| ------ | ------------------- | -------------------------------------------- |
| `GET`  | `/api/agents/types` | List available agent types with descriptions |

### WebSocket Events

#### Server → Client

| Event              | Payload                                    | Purpose                   |
| ------------------ | ------------------------------------------ | ------------------------- |
| `plan_ready`       | `{ taskId, plan: ExecutionPlan }`          | Execution plan generated  |
| `agent_spawned`    | `{ taskId, agentId, agentType, position }` | Agent deployed            |
| `agent_processing` | `{ taskId, agentId, progress }`            | Agent working             |
| `agent_message`    | `{ taskId, fromAgent, toAgent, summary }`  | Inter-agent communication |
| `agent_completed`  | `{ taskId, agentId, outputSummary }`       | Agent finished            |
| `agent_failed`     | `{ taskId, agentId, error }`               | Agent error               |
| `task_completed`   | `{ taskId, output: TaskOutput }`           | All agents done           |
| `task_failed`      | `{ taskId, error, partialResults }`        | Task failed               |
| `simulation_event` | `{ type, agentId, position, animation }`   | Visualization update      |

#### Client → Server

| Event            | Payload                | Purpose                 |
| ---------------- | ---------------------- | ----------------------- |
| `task_start`     | `{ taskId }`           | User approved plan      |
| `task_cancel`    | `{ taskId }`           | User cancelled task     |
| `action_confirm` | `{ taskId, actionId }` | Confirm external action |
| `action_reject`  | `{ taskId, actionId }` | Reject external action  |

---

## 5. Integration Points

### OpenClaw Framework

| Feature            | Usage                                                          |
| ------------------ | -------------------------------------------------------------- |
| Gateway            | Central coordinator for agent deployment and message routing   |
| Agent Spawning     | Dynamic creation of typed agents with configuration            |
| Message Passing    | Inter-agent communication for intermediate result sharing      |
| Model Routing      | Route LLM calls to appropriate models based on task complexity |
| Persistent Context | Maintain source context and task state across agent operations |
| Heartbeat          | Monitor agent health during execution                          |

### LLM Providers

| Provider  | Models              | Use Cases                                                                       |
| --------- | ------------------- | ------------------------------------------------------------------------------- |
| Anthropic | Claude 3.7 Sonnet   | Complex reasoning: document analysis, qualification scoring, research synthesis |
| OpenAI    | GPT-4o, GPT-4o-mini | Email composition, formatting, simple extraction, status updates                |
| Ollama    | Llama 3 (local)     | Fallback when cloud APIs unavailable; zero-latency for simple tasks             |

### External Services

| Service          | Purpose                                    | Priority                              |
| ---------------- | ------------------------------------------ | ------------------------------------- |
| Tavily / SerpAPI | Web search for Research Synthesizer agents | Should Have                           |
| SMTP / SendGrid  | Email sending (with user confirmation)     | Stretch Goal (demo shows prompt only) |


---


# SWARM — UX Design, Release Plan, and Risks

---

## 1. User Experience Design

### Design Philosophy

SWARM's interface should feel like a **mission control center** — professional, clean, and data-dense without being overwhelming. The dark theme creates focus and pairs with the simulation visualization's animated elements for a dramatic, premium aesthetic. Every pixel serves a purpose: loading context, inputting tasks, monitoring agents, or reviewing outputs.

### Layout: Three-Column Interface

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────┐ ┌────────────────────┐ │
│ │              │ │                        │ │                    │ │
│ │   SOURCES    │ │        CHAT            │ │   SIMULATION       │ │
│ │   PANEL      │ │        PANEL           │ │   PANEL            │ │
│ │              │ │                        │ │                    │ │
│ │ ┌──────────┐ │ │ ┌────────────────────┐ │ │ ┌────────────────┐ │ │
│ │ │Upload    │ │ │ │ Chat History       │ │ │ │                │ │ │
│ │ │Area      │ │ │ │                    │ │ │ │ Agent          │ │ │
│ │ └──────────┘ │ │ │ User: "Analyze..." │ │ │ │ Visualization  │ │ │
│ │              │ │ │                    │ │ │ │                │ │ │
│ │ ┌──────────┐ │ │ │ Plan: 3 agents     │ │ │ │ [Dormant until │ │ │
│ │ │Text      │ │ │ │ ├─ Doc Analyst     │ │ │ │  task starts]  │ │ │
│ │ │Input     │ │ │ │ ├─ Qual Checker    │ │ │ │                │ │ │
│ │ └──────────┘ │ │ │ └─ Email Composer  │ │ │ │                │ │ │
│ │              │ │ │                    │ │ │ │                │ │ │
│ │ ┌──────────┐ │ │ │ [▶ Start]          │ │ │ └────────────────┘ │ │
│ │ │Web       │ │ │ │                    │ │ │                    │ │
│ │ │Search    │ │ │ │ Progress updates   │ │ │ ┌────────────────┐ │ │
│ │ └──────────┘ │ │ │ ...                │ │ │ │ Agent Legend   │ │ │
│ │              │ │ │                    │ │ │ └────────────────┘ │ │
│ │ ┌──────────┐ │ │ │ Final Output       │ │ │                    │ │
│ │ │Source    │ │ │ │ ┌────────────────┐ │ │ │ ┌────────────────┐ │ │
│ │ │List      │ │ │ │ │ Email Draft    │ │ │ │ │ Controls      │ │ │
│ │ │          │ │ │ │ │ [Confirm Send] │ │ │ │ └────────────────┘ │ │
│ │ │ resume1  │ │ │ │ └────────────────┘ │ │ │                    │ │
│ │ │ resume2  │ │ │ └────────────────────┘ │ │                    │ │
│ │ │ resume3  │ │ │                        │ │                    │ │
│ │ │ ...      │ │ │ ┌────────────────────┐ │ │                    │ │
│ │ └──────────┘ │ │ │ Chat Input          │ │ │                    │ │
│ │              │ │ └────────────────────┘ │ │                    │ │
│ └──────────────┘ └────────────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Column Specifications

#### Sources Panel (Left) — 25% width

| Component            | Description                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| **File Upload Area** | Drag-and-drop zone, supports multiple files. Accepts PDF, DOCX, XLSX, TXT, CSV. Shows upload progress per file. |
| **Text Input**       | Expandable textarea for pasting content. "Add as Source" button. Supports naming the text source.               |
| **Web Search Bar**   | Search input with "Search" button. Results appear as source cards below.                                        |
| **Source List**      | Scrollable list of all sources. Each card shows: filename/title, type icon, file size, active/inactive toggle.  |
| **Source Preview**   | On click, shows parsed content in a slide-over or modal. Scrollable, searchable.                                |

**Visual Design:**

- Background: `#12121a` (panel background)
- Source cards: `#1a1a2e` with subtle border
- File type icons: color-coded (PDF red, DOCX blue, XLSX green, text gray)
- Active sources: full opacity. Inactive: 40% opacity
- Upload zone: dashed border, subtle pulse animation on hover

#### Chat Panel (Center) — 45% width

| Component          | Description                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chat History**   | Scrollable message feed. User messages aligned right (with user avatar). System responses aligned left. Agent progress updates styled as timeline items. |
| **Plan Display**   | Structured card showing agent assignments. Each agent has: name, type icon, sub-task description, status indicator. Dependency arrows optional.          |
| **Start Button**   | Prominent action button. Full-width within the plan card. Indigo gradient (`#6366f1` → `#818cf8`). Disabled until plan is ready.                         |
| **Progress Feed**  | Real-time agent updates: "Document Analyst: Processing resume 12 of 30..." Each attributed to agent with agent color.                                    |
| **Output Display** | Final deliverable in a styled card. For emails: shows To, Subject, Body. Expandable "How this was produced" section with agent reasoning.                |
| **Action Buttons** | "Confirm" (green) and "Cancel" (gray) buttons for external actions. Prominent and clearly labeled.                                                       |
| **Chat Input**     | Fixed to bottom. Multi-line textarea with "Send" button. Placeholder: "Describe a task..."                                                               |

**Visual Design:**

- Background: `#0f0f17` (slightly different from side panels for depth)
- User messages: `#6366f1` background (indigo), right-aligned
- System messages: `#1a1a2e` background, left-aligned
- Agent progress: left-aligned with colored agent indicator (dot + name)
- Start button: prominent, glowing indigo gradient
- Output card: `#1a1a2e` with green accent border when ready

#### Simulation Panel (Right) — 30% width

| Component               | Description                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Simulation Canvas**   | HTML5 Canvas or D3.js rendered top-down view. Shows a stylized workspace/community. Agent characters are positioned based on execution plan layout.           |
| **Agent Characters**    | Distinct visual per agent type. Color-coded (blue=analyst, green=checker, orange=composer). Simple but recognizable: circles with icons or emoji-style faces. |
| **Data Flow Animation** | Animated particles/arrows moving between agents when intermediate results are passed. Color matches the source agent.                                         |
| **Workstation Areas**   | Subtle background zones where agents "sit" while processing. Labeled with agent name.                                                                         |
| **Agent Legend**        | Small legend below canvas showing agent names → colors.                                                                                                       |
| **Progress Overlay**    | Subtle overlay showing "2 of 3 agents completed" or similar.                                                                                                  |
| **Controls**            | Toggle: expand/collapse panel. Speed: 1x/2x/3x animation. Sound: on/off (stretch).                                                                            |

**Visual Design:**

- Background: `#0a0a12` (darkest — the simulation "screen")
- Canvas has a subtle grid or floor pattern
- Agent characters have a gentle glow matching their color
- Data flow particles leave a fading trail
- Dormant state: dark, quiet, subtle "ready" indicator
- Active state: agents glow, particles flow, status text appears
- Transition: smooth fade-in when task starts (0.5s animation)

### Interaction Flow

```
State 1: Initial Load
├── Sources Panel: Empty with upload prompts
├── Chat Panel: Welcome message + sample task suggestions
└── Simulation Panel: Dormant (dim, "No active task" label)

State 2: Sources Loaded
├── Sources Panel: Shows uploaded files/text/search results
├── Chat Panel: Ready for task input
└── Simulation Panel: Still dormant

State 3: Task Submitted
├── Sources Panel: Active sources highlighted
├── Chat Panel: Shows execution plan + Start button
└── Simulation Panel: Still dormant

State 4: Execution Active
├── Sources Panel: Active sources with "in use" indicator
├── Chat Panel: Real-time progress feed
└── Simulation Panel: ACTIVE — agents animate, data flows

State 5: Task Complete
├── Sources Panel: Source citations linked to output
├── Chat Panel: Final output + action confirmation
└── Simulation Panel: All agents "done" — calm, satisfied state
```

### Design System

| Category          | Token                 | Value              |
| ----------------- | --------------------- | ------------------ |
| **Backgrounds**   | `--bg-primary`        | `#0a0a0f`          |
|                   | `--bg-panel`          | `#12121a`          |
|                   | `--bg-card`           | `#1a1a2e`          |
|                   | `--bg-simulation`     | `#0a0a12`          |
| **Accents**       | `--accent-primary`    | `#6366f1` (Indigo) |
|                   | `--accent-success`    | `#22c55e` (Green)  |
|                   | `--accent-warning`    | `#f59e0b` (Amber)  |
|                   | `--accent-danger`     | `#ef4444` (Red)    |
| **Agent Colors**  | `--agent-analyst`     | `#3b82f6` (Blue)   |
|                   | `--agent-checker`     | `#22c55e` (Green)  |
|                   | `--agent-composer`    | `#f97316` (Orange) |
|                   | `--agent-researcher`  | `#a855f7` (Purple) |
|                   | `--agent-processor`   | `#14b8a6` (Teal)   |
|                   | `--agent-generator`   | `#ef4444` (Red)    |
|                   | `--agent-writer`      | `#eab308` (Yellow) |
|                   | `--agent-quality`     | `#f1f5f9` (White)  |
| **Text**          | `--text-primary`      | `#f1f5f9`          |
|                   | `--text-secondary`    | `#94a3b8`          |
|                   | `--text-muted`        | `#475569`          |
| **Typography**    | `--font-primary`      | Inter              |
|                   | `--font-mono`         | JetBrains Mono     |
| **Spacing**       | `--space-xs`          | 4px                |
|                   | `--space-sm`          | 8px                |
|                   | `--space-md`          | 16px               |
|                   | `--space-lg`          | 24px               |
|                   | `--space-xl`          | 32px               |
| **Border Radius** | `--radius-sm`         | 6px                |
|                   | `--radius-md`         | 10px               |
|                   | `--radius-lg`         | 16px               |
| **Transitions**   | `--transition-fast`   | 150ms ease         |
|                   | `--transition-normal` | 300ms ease         |
|                   | `--transition-slow`   | 500ms ease         |

---

## 2. Release Plan

### Phase 1: Core Pipeline (Days 1-2)

**Priority:** MUST ship — this is the foundation

| Deliverable                           | Description                                           | Status    |
| ------------------------------------- | ----------------------------------------------------- | --------- |
| Backend: Source ingestion service     | File upload, text parsing, source storage             | Must Have |
| Backend: Task orchestration engine    | Task decomposition, plan generation                   | Must Have |
| Backend: Execution engine             | Agent spawning, dependency management, result passing | Must Have |
| Backend: OpenClaw integration         | Gateway, message passing, model routing               | Must Have |
| Frontend: Basic 3-column layout       | Panel structure, responsive grid                      | Must Have |
| Frontend: Source upload UI            | Drag-and-drop, source list                            | Must Have |
| Frontend: Chat input + output display | Task input, plan display, output rendering            | Must Have |

### Phase 2: Simulation and Polish (Day 2-3)

**Priority:** SHOULD ship — this is the differentiator

| Deliverable                            | Description                                             | Status      |
| -------------------------------------- | ------------------------------------------------------- | ----------- |
| Frontend: Simulation Panel             | Canvas rendering, agent characters, data flow animation | Should Have |
| Backend: Simulation event engine       | Agent events → simulation events, WebSocket broadcast   | Should Have |
| Frontend: WebSocket integration        | Real-time updates in chat + simulation panels           | Should Have |
| Frontend: Design system implementation | Dark theme, agent colors, animations, typography        | Should Have |
| Frontend: Action confirmation UI       | Confirm/reject buttons for external actions             | Should Have |

### Phase 3: Stretch Features (Day 3+)

**Priority:** NICE to have — polish and bonus features

| Deliverable                  | Description                                         | Status       |
| ---------------------------- | --------------------------------------------------- | ------------ |
| Web search integration       | Tavily API for Research Synthesizer agents          | Nice to Have |
| Agent reasoning transparency | Expandable per-agent reasoning and source citations | Nice to Have |
| Source preview modal         | Click-to-preview source content                     | Nice to Have |
| Simulation controls          | Speed adjustment, expand/collapse, activity log     | Nice to Have |
| Pre-recorded demo video      | Backup demo for network/API failures                | Nice to Have |
| Response caching             | Cache demo scenario for reliability                 | Should Have  |

### Launch Checklist

- [ ] Demo scenario (resume analysis): 10+ successful runs
- [ ] All 3 columns functional and visually polished
- [ ] Dark theme implemented with design system tokens
- [ ] WebSocket events flowing for chat + simulation
- [ ] Error handling: graceful degradation on agent failure
- [ ] Pitch narrative rehearsed and timed
- [ ] Q&A responses prepared
- [ ] Backup demo strategy ready (video, cached mode)
- [ ] Network backup (mobile hotspot)

---

## 3. Risk Register

### High-Priority Risks

| ID  | Risk                                                                               | Probability | Impact   | Mitigation                                                                                    |
| --- | ---------------------------------------------------------------------------------- | ----------- | -------- | --------------------------------------------------------------------------------------------- |
| R1  | **Build scope exceeds time** — 3-column UI + agents + simulation is ambitious      | High        | Critical | Strict MVP: pipeline first, simulation second. Pre-hackathon prep for designs and prompts.    |
| R2  | **Demo fails during judging** — live demo crashes, freezes, or produces bad output | Medium      | Critical | Pre-recorded backup video. Response caching. 10+ rehearsals.                                  |
| R3  | **Agent output is mediocre** — email draft or candidate scoring is poor quality    | Medium      | Critical | Extensive prompt engineering. Use strongest models (Claude Sonnet). Pre-demo quality testing. |
| R4  | **LLM API latency** — slow responses stall the demo visibly                        | Medium      | High     | Local model fallback (Ollama). Parallel API calls. Response caching. Progress indicators.     |
| R5  | **Network failure at venue** — no internet = no LLM API access                     | Medium-High | Critical | Mobile hotspot. Ollama local. Response caching for demo path.                                 |

### Medium-Priority Risks

| ID  | Risk                                                                    | Probability | Impact | Mitigation                                                                               |
| --- | ----------------------------------------------------------------------- | ----------- | ------ | ---------------------------------------------------------------------------------------- |
| R6  | **"Just ChatGPT" perception** — judges don't see multi-agent value      | Medium      | High   | Visual simulation makes collaboration visible. Lead with result, then explain mechanism. |
| R7  | **OpenClaw integration issues** — undocumented behaviors or limitations | Medium      | High   | Early prototype. Abstraction layer. In-memory message passing as fallback.               |
| R8  | **Simulation performance** — laggy animations on demo hardware          | Medium      | Medium | Canvas optimization. FPS budgeting. Toggle to disable simulation.                        |
| R9  | **File parsing issues** — PDFs don't parse correctly                    | Medium      | Medium | Controlled demo data. OCR fallback. Error handling for unparseable files.                |

### Lower-Priority Risks

| ID  | Risk                                      | Probability | Impact | Mitigation                                                           |
| --- | ----------------------------------------- | ----------- | ------ | -------------------------------------------------------------------- |
| R10 | **Token cost overrun** during development | High        | Low    | Model tiering. Development response caching. Budget tracking.        |
| R11 | **AI bias in candidate scoring**          | Medium      | Medium | Criteria-based scoring. Transparent reasoning. Sample data controls. |
| R12 | **Privacy concerns raised**               | Low         | Medium | Sample/fictional data in demo. Clear data handling explanation.      |

---

## 4. Post-Hackathon Roadmap (Vision)

> These features are out of scope for the hackathon but represent the product's long-term direction.

| Phase    | Features                                                              |
| -------- | --------------------------------------------------------------------- |
| **V1.1** | User authentication, task history persistence, more file type support |
| **V1.2** | External integrations (Gmail, Slack, Google Drive, Notion)            |
| **V1.3** | Custom agent type creation, user-defined workflows                    |
| **V2.0** | Team collaboration — multiple users watching the same simulation      |
| **V2.1** | Mobile-responsive interface, API access for enterprise                |
| **V3.0** | Marketplace for community-created agent types and task templates      |
