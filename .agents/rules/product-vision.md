# Product Vision Document

The project's product vision document is located at `docs/product-vision.md`. This document is the **source of truth for product direction and UX design** including:

- Executive summary, tagline, and core thesis: _"AI helps you do, not just think"_
- Problem statement and the task execution gap SWARM addresses
- Competitive analysis and how SWARM differentiates from ChatGPT, AutoGen, Zapier, etc.
- Refined concept with the detailed 7-step user flow (Load Sources → Describe Task → Agent Planning → Trigger Execution → Agent Execution → Simulation Visualization → Output Delivery & Confirmation)
- Agent model definitions, agent type library, and inter-agent communication patterns
- Model routing strategy (complex reasoning → powerful models, routine tasks → efficient models)
- The 5-phase task execution protocol (Source Ingestion → Task Analysis → Execution → Assembly & Delivery → Confirmation & Action)
- Simulation layer concept, visual design, and interaction states (Dormant → Planning → Active → Communicating → Completing → Delivered)
- Three-column interface design (Sources Panel, Chat Panel, Simulation Panel)

**Always consult `docs/product-vision.md` before:**

- Making product-level decisions about direction or priorities
- Designing or refining the user experience and interface layout
- Implementing agent types, inter-agent communication, or model routing
- Building or modifying the simulation visualization layer
- Implementing the task execution protocol

When the PRD and product vision have overlapping content, treat `docs/prd.md` as the source of truth for technical specifications and `docs/product-vision.md` as the source of truth for product direction and UX concepts.
