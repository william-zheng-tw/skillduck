export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowed_tools?: string;
}

export interface Skill {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  allowed_tools?: string;
  install_path: string;
  scope: "project" | "global";
  agents: string[];
  has_update: boolean;
  body: string;
}

export interface AgentInfo {
  id: string;
  display_name: string;
  project_path: string;
  global_path: string;
  detected: boolean;
  installed_skills: string[];
}

export interface CliOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: DiagnosticItem[];
  warnings: DiagnosticItem[];
}

export interface DiagnosticItem {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface SandboxInfo {
  path: string;
  temp_dir_handle: string;
}

export interface ScriptOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
}

export interface SkillLockEntry {
  name: string;
  source: string;
  commit_hash?: string;
  installed_at: string;
  agents: string[];
}
