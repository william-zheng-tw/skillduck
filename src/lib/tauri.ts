import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Skill, AgentInfo, CliOutput, ValidationResult, SandboxInfo, ScriptOutput } from "@/types/skills";

// === Direct Rust operations (fast) ===

export async function listSkills(scope: "project" | "global" | "all"): Promise<Skill[]> {
  return invoke<Skill[]>("list_skills", { scope });
}

export async function parseSkillMd(path: string): Promise<Skill> {
  return invoke<Skill>("parse_skill_md", { path });
}

export async function detectAgents(): Promise<AgentInfo[]> {
  return invoke<AgentInfo[]>("detect_agents");
}

export async function validateSkill(path: string): Promise<ValidationResult> {
  return invoke<ValidationResult>("validate_skill", { path });
}

export async function validateSkillContent(
  frontmatter: Record<string, string>,
  body: string,
  dirName: string
): Promise<ValidationResult> {
  return invoke<ValidationResult>("validate_skill_content", { frontmatter, body, dirName });
}

export async function saveSkillMd(
  path: string,
  frontmatter: Record<string, string>,
  body: string
): Promise<void> {
  return invoke<void>("save_skill_md", { path, frontmatter, body });
}

export async function readSkillMd(path: string): Promise<{ frontmatter: Record<string, string>; body: string }> {
  return invoke("read_skill_md", { path });
}

export async function getSkillsDirectories(): Promise<{ project: string[]; global: string[] }> {
  return invoke("get_skills_directories");
}

// === CLI Bridge operations ===

export interface AddSkillOptions {
  source: string;
  agents: string[];
  skills: string[];
  global: boolean;
  listOnly: boolean;
  all: boolean;
  projectPath?: string;
}

export async function cliAddSkill(opts: AddSkillOptions): Promise<CliOutput> {
  return invoke<CliOutput>("cli_add_skill", {
    source: opts.source,
    agents: opts.agents,
    skills: opts.skills,
    global: opts.global,
    listOnly: opts.listOnly,
    all: opts.all,
    projectPath: opts.projectPath || null,
  });
}

export async function cliRemoveSkill(
  skillNames: string[],
  agents: string[],
  global: boolean,
  projectPath?: string
): Promise<CliOutput> {
  return invoke<CliOutput>("cli_remove_skill", {
    skillNames,
    agents,
    global: global,
    projectPath: projectPath || null,
  });
}

export async function cliCheckUpdates(): Promise<CliOutput> {
  return invoke<CliOutput>("cli_check_updates");
}

export async function cliUpdateSkills(): Promise<CliOutput> {
  return invoke<CliOutput>("cli_update_skills");
}

export async function cliInitSkill(name: string, path: string): Promise<CliOutput> {
  return invoke<CliOutput>("cli_init_skill", { name, path });
}

// === Sandbox operations ===

export async function createSandbox(skillPath: string): Promise<SandboxInfo> {
  return invoke<SandboxInfo>("create_sandbox", { skillPath });
}

export async function runSandboxScript(sandboxPath: string, scriptName: string): Promise<ScriptOutput> {
  return invoke<ScriptOutput>("run_sandbox_script", { sandboxPath, scriptName });
}

export async function cleanupSandbox(tempDirHandle: string): Promise<void> {
  return invoke<void>("cleanup_sandbox", { tempDirHandle });
}

// === File watcher ===

export async function watchSkillsDir(path: string): Promise<void> {
  return invoke<void>("watch_skills_dir", { path });
}

export async function unwatchSkillsDir(path: string): Promise<void> {
  return invoke<void>("unwatch_skills_dir", { path });
}

export function onSkillChanged(callback: (path: string) => void): Promise<UnlistenFn> {
  return listen<string>("skill-changed", (event) => {
    callback(event.payload);
  });
}

export function onCliOutput(callback: (line: string) => void): Promise<UnlistenFn> {
  return listen<string>("cli-output", (event) => {
    callback(event.payload);
  });
}
