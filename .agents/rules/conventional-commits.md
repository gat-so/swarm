---
trigger: always_on
---

# Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **type** — lowercase, one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- **description** — lowercase, imperative mood, no trailing period

## Type Reference

| Type       | When to Use                                           |
| ---------- | ----------------------------------------------------- |
| `feat`     | A new feature                                         |
| `fix`      | A bug fix                                             |
| `docs`     | Documentation-only changes                            |
| `style`    | Formatting, whitespace, semicolons (no logic changes) |
| `refactor` | Code restructuring without changing behavior          |
| `perf`     | Performance improvements                              |
| `test`     | Adding or updating tests                              |
| `build`    | Build system or dependency changes                    |
| `ci`       | CI/CD configuration changes                           |
| `chore`    | Maintenance tasks that don't fit other types          |
| `revert`   | Reverting a previous commit                           |

## Examples

```
feat: add file upload drag-and-drop to sources panel
fix: resolve websocket reconnection failure on timeout
docs: update product architecture to use react/vite frontend, node.js/express backend, and specify hosting platforms
chore: initialize project with a react/vite frontend and a node/typescript backend
test: add unit tests for task orchestration module
refactor: extract agent communication into shared utility
```

## Rules

- Do **not** capitalize the description
- Do **not** end the description with a period
- Use **imperative mood** (e.g., "add" not "added" or "adds")
- Keep the description concise and descriptive
