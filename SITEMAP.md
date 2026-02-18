# App Sitemap

> This document describes the current structure, pages, and features of the app.
> Use it as context for brand discussions — including naming, positioning, and identity.

## Overview

A desktop application (Tauri + React) that serves as a visual management tool for AI agent skills. It provides a unified interface to install, manage, explore, and test skills across multiple AI coding agents (Cursor, Claude Code, Copilot, Windsurf, etc.).

## Pages

### My Skills
- Browse and manage installed skills across global and project scopes
- Search, filter by scope (All / Project / Global)
- View skill detail: metadata, frontmatter, body content
- Add skills from sources (GitHub, GitLab, local path) with CLI preview
- Remove skills with agent-aware uninstall

### Explore
- Discover skills from the public [skills.sh](https://skills.sh) registry
- Search with real-time results (name, description, install count)
- One-click install to local agents

### Agent Skills
- Detect which AI agents are installed on the system
- Hierarchical tree view: Agent > Global / Projects
- View each agent's global and project-level skills
- Manual scan with configurable scan directories
- Global agent detection runs automatically on app launch

### Settings
- Configure project scan directories (used by Agent Skills and My Skills)
- Add / remove directories via native file picker
- Persist settings to disk

### Editor *(currently hidden)*
- Create and edit SKILL.md files with frontmatter form
- Three-tab view: Edit / Split / Preview
- Real-time validation and token estimation

### Sandbox *(currently hidden)*
- Test skills in isolated environments
- Progressive disclosure of skill content (Metadata > Instructions > Resources)
- Script execution with terminal output

## Layout

```
┌──────────────────────────────────────────────┐
│              Title Bar (drag region)         │
├────────────┬─────────────────────────────────┤
│            │                                 │
│  Sidebar   │         Page Content            │
│            │                                 │
│ ─ My Skills│   (varies by page)              │
│ ─ Explore  │                                 │
│ ─ Agent    │                                 │
│   Skills   │                                 │
│ ─ Settings │                                 │
│            │                                 │
│            ├─────────────────────────────────┤
│  Stats     │         Status Bar              │
└────────────┴─────────────────────────────────┘
```

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Zustand
- **Backend:** Tauri v2 (Rust)
- **Target Platform:** macOS (ARM), with potential for Windows/Linux
- **Data Persistence:** localStorage (Zustand persist) + JSON config files on disk

## Key Concepts

| Term | Meaning |
|------|---------|
| **Skill** | A markdown file (SKILL.md) that extends an AI agent's capabilities |
| **Agent** | An AI coding assistant (e.g. Cursor, Claude Code, Copilot) |
| **Global Skill** | Installed in the agent's home directory, available everywhere |
| **Project Skill** | Installed in a specific project directory, scoped to that project |
| **Scan Root** | A directory the app scans to find project-level skills |
