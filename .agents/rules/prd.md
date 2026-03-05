# Product Requirements Document (PRD)

The project's PRD is located at `docs/prd.md`. This document is the **source of truth for all technical specifications** including:

- Product overview, vision, mission, and scope (in/out of scope)
- User personas and detailed user stories organized by epic
- Functional requirements for all modules (Source Ingestion, Task Orchestration, Simulation Visualization, Output & Action)
- Non-functional requirements (performance targets, reliability, usability, security, scalability)
- System architecture diagram and technology stack
- TypeScript data models (Source, Task, ExecutionPlan, AgentAssignment, AgentExecution, TaskOutput)
- REST API endpoints and WebSocket event specifications

**Always consult `docs/prd.md` before:**

- Implementing or modifying any feature or user story
- Making decisions about data models, API design, or system architecture
- Checking acceptance criteria or functional requirements
- Verifying what is in scope vs. out of scope
- Setting performance, reliability, or security targets
