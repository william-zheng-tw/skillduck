# Contributing to SkillDuck

Thanks for your interest in contributing! This guide will help you get up and running.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) stable toolchain
- macOS (primary platform; Linux/Windows support is best-effort)

## Local Development

```bash
# Clone the repo
git clone https://github.com/william-zheng-tw/skillduck.git
cd skillduck

# Install frontend dependencies
npm install

# Start dev server (hot-reload frontend + Rust backend)
npm run tauri dev
```

## Project Structure

```
src/               # React frontend (TypeScript)
  components/      # UI components
  hooks/           # Zustand store, custom hooks
  lib/             # Tauri invoke wrappers
  pages/           # Page-level components
  types/           # TypeScript type definitions
src-tauri/         # Rust backend (Tauri)
  src/commands/    # Tauri commands (one file per domain)
  src/lib.rs       # Plugin registration + command handler
docs/              # Developer documentation
```

## Making Changes

### Frontend (TypeScript/React)
Changes in `src/` hot-reload automatically via Vite.

### Backend (Rust)
Changes in `src-tauri/src/` trigger a Rust recompile. This takes longer on first build but is incremental afterward.

After adding a new Tauri command:
1. Add the function in `src-tauri/src/commands/<module>.rs`
2. Register it in `src-tauri/src/lib.rs` inside `generate_handler![]`
3. Add the corresponding TypeScript wrapper in `src/lib/tauri.ts`

## Submitting a Pull Request

1. Fork the repo and create a branch from `dev`:
   ```bash
   git checkout dev
   git checkout -b feat/your-feature-name
   ```
2. Make your changes and verify both build steps pass:
   ```bash
   cd src-tauri && cargo build
   cd .. && npm run build
   ```
3. Open a PR targeting the `dev` branch (not `main`)
4. Fill in the PR template

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add skill tag filtering
fix: crash when skills directory is missing
chore: bump tauri to 2.1
docs: update CONTRIBUTING with Rust tips
```

## Reporting Bugs

Open an issue using the **Bug Report** template. Include:
- macOS version and chip (Apple Silicon / Intel)
- Steps to reproduce
- What you expected vs what happened

## Questions

Open a [Discussion](https://github.com/william-zheng-tw/skillduck/discussions) rather than an issue for general questions.
